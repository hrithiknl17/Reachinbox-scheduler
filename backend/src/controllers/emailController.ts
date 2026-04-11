import { Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { prisma } from '../config/database';
import { emailQueue, AttachmentData } from '../queues/emailQueue';
import { Job } from 'bullmq';

interface ScheduleEmailBody {
  recipients: string[];
  subject: string;
  body: string;
  scheduledAt: string;
  delayBetweenMs?: number;
  hourlyLimit?: number;
  fromEmail?: string;
  attachments?: AttachmentData[];
}

const CHUNK_SIZE = 100; // batch size for DB + BullMQ inserts

// Runs in background after HTTP response is sent
async function processEmailBatch(
  userId: string,
  senderEmail: string,
  recipients: string[],
  subject: string,
  body: string,
  scheduledTimestamp: number,
  delayBetweenMs: number,
  attachments?: AttachmentData[]
) {
  const now = Date.now();

  for (let chunkStart = 0; chunkStart < recipients.length; chunkStart += CHUNK_SIZE) {
    const chunk = recipients.slice(chunkStart, chunkStart + CHUNK_SIZE);

    // Pre-generate IDs so we can use them for both DB + BullMQ without a round-trip
    const emailData = chunk.map((recipient, i) => {
      const globalIndex = chunkStart + i;
      const scheduledAt = new Date(scheduledTimestamp + globalIndex * delayBetweenMs);
      const delay = Math.max(0, scheduledAt.getTime() - now);
      return {
        id: randomUUID(),
        userId,
        fromEmail: senderEmail,
        toEmail: recipient.trim(),
        subject,
        body,
        status: 'SCHEDULED' as const,
        scheduledAt,
        bullJobId: '', // filled below
        delay,
      };
    });

    // Assign bullJobIds now that we have email IDs
    emailData.forEach(e => { e.bullJobId = `email-${e.id}`; });

    // Attachment metadata for DB (no base64 — keeps DB lean)
    const attachmentMeta = attachments?.map(({ base64: _, ...meta }) => meta) ?? [];

    // Batch DB insert (single query for the whole chunk)
    await prisma.email.createMany({
      data: emailData.map(({ delay, ...rest }) => ({
        ...rest,
        attachments: attachmentMeta.length ? attachmentMeta : undefined,
      })),
      skipDuplicates: true,
    });

    // Batch BullMQ add (single Redis pipeline for the whole chunk)
    await emailQueue.addBulk(
      emailData.map(e => ({
        name: 'send-email',
        data: {
          emailId: e.id,
          fromEmail: e.fromEmail,
          toEmail: e.toEmail,
          subject: e.subject,
          body: e.body,
          userId,
          attachments, // full base64 lives in Redis job
        },
        opts: {
          delay: e.delay,
          jobId: e.bullJobId, // idempotency key — prevents duplicates on restart
        },
      }))
    );

    console.log(
      `Scheduled chunk ${chunkStart}–${chunkStart + chunk.length} of ${recipients.length}`
    );
  }
}

export async function scheduleEmails(req: Request, res: Response): Promise<void> {
  const userId = req.session?.userId!;
  const {
    recipients,
    subject,
    body,
    scheduledAt,
    delayBetweenMs = 2000,
    fromEmail,
    attachments,
  } = req.body as ScheduleEmailBody;

  if (!recipients?.length || !subject || !body || !scheduledAt) {
    res.status(400).json({ error: 'Missing required fields' });
    return;
  }

  const scheduledDate = new Date(scheduledAt);
  if (isNaN(scheduledDate.getTime())) {
    res.status(400).json({ error: 'Invalid scheduledAt date' });
    return;
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  const validRecipients = recipients.map(r => r.trim()).filter(Boolean);
  const senderEmail = fromEmail || user.email;

  // ✅ Return immediately — don't make the client wait for 1000 DB inserts
  res.status(202).json({
    message: `Queuing ${validRecipients.length} email(s) in the background`,
    count: validRecipients.length,
  });

  // Process in background after response is sent
  setImmediate(() => {
    processEmailBatch(
      userId,
      senderEmail,
      validRecipients,
      subject,
      body,
      scheduledDate.getTime(),
      delayBetweenMs,
      attachments
    ).catch(err => console.error('Batch scheduling error:', err));
  });
}

export async function getScheduledEmails(req: Request, res: Response): Promise<void> {
  const userId = req.session?.userId!;
  const limit = Math.min(parseInt(req.query.limit as string || '50', 10), 200);
  const offset = parseInt(req.query.offset as string || '0', 10);

  const [emails, total] = await Promise.all([
    prisma.email.findMany({
      where: { userId, status: 'SCHEDULED' },
      orderBy: { scheduledAt: 'asc' },
      take: limit,
      skip: offset,
    }),
    prisma.email.count({ where: { userId, status: 'SCHEDULED' } }),
  ]);

  res.json({ emails, total, limit, offset });
}

export async function rescheduleAll(req: Request, res: Response): Promise<void> {
  const userId = req.session?.userId!;
  const { newStartAt } = req.body as { newStartAt: string };

  const newStart = new Date(newStartAt);
  if (isNaN(newStart.getTime())) {
    res.status(400).json({ error: 'Invalid newStartAt date' });
    return;
  }

  const scheduled = await prisma.email.findMany({
    where: { userId, status: 'SCHEDULED' },
    orderBy: { scheduledAt: 'asc' },
  });

  if (scheduled.length === 0) {
    res.json({ rescheduled: 0 });
    return;
  }

  // Compute the gap between original emails (preserve spacing)
  const originalFirst = scheduled[0].scheduledAt.getTime();
  const now = Date.now();

  // Remove existing BullMQ jobs
  await Promise.allSettled(
    scheduled
      .filter(e => e.bullJobId)
      .map(async e => {
        const job = await Job.fromId(emailQueue, e.bullJobId!);
        if (job) await job.remove();
      })
  );

  // Re-queue each email offset from the new start time
  await emailQueue.addBulk(
    scheduled.map(e => {
      const offset = e.scheduledAt.getTime() - originalFirst;
      const newScheduledAt = new Date(newStart.getTime() + offset);
      return {
        name: 'send-email',
        data: {
          emailId: e.id,
          fromEmail: e.fromEmail,
          toEmail: e.toEmail,
          subject: e.subject,
          body: e.body,
          userId,
        },
        opts: {
          delay: Math.max(0, newScheduledAt.getTime() - now),
          jobId: e.bullJobId ?? `email-${e.id}`,
        },
      };
    })
  );

  // Update scheduledAt in DB
  await Promise.all(
    scheduled.map((e, i) => {
      const offset = e.scheduledAt.getTime() - originalFirst;
      const newScheduledAt = new Date(newStart.getTime() + offset);
      return prisma.email.update({
        where: { id: e.id },
        data: { scheduledAt: newScheduledAt },
      });
    })
  );

  res.json({ rescheduled: scheduled.length });
}

export async function cancelAllScheduled(req: Request, res: Response): Promise<void> {
  const userId = req.session?.userId!;

  const scheduled = await prisma.email.findMany({
    where: { userId, status: 'SCHEDULED' },
    select: { id: true, bullJobId: true },
  });

  if (scheduled.length === 0) {
    res.json({ cancelled: 0 });
    return;
  }

  // Remove BullMQ jobs in parallel (best-effort — job may already be processing)
  await Promise.allSettled(
    scheduled
      .filter(e => e.bullJobId)
      .map(async e => {
        const job = await Job.fromId(emailQueue, e.bullJobId!);
        if (job) await job.remove();
      })
  );

  const { count } = await prisma.email.updateMany({
    where: { userId, status: 'SCHEDULED' },
    data: { status: 'CANCELLED' },
  });

  res.json({ cancelled: count });
}

export async function cancelEmail(req: Request, res: Response): Promise<void> {
  const userId = req.session?.userId!;
  const { id } = req.params;

  const email = await prisma.email.findUnique({ where: { id } });

  if (!email || email.userId !== userId) {
    res.status(404).json({ error: 'Email not found' });
    return;
  }

  if (email.status !== 'SCHEDULED') {
    res.status(400).json({ error: 'Only scheduled emails can be cancelled' });
    return;
  }

  // Remove the BullMQ job
  if (email.bullJobId) {
    const job = await Job.fromId(emailQueue, email.bullJobId);
    if (job) await job.remove();
  }

  await prisma.email.update({
    where: { id },
    data: { status: 'CANCELLED' },
  });

  res.json({ message: 'Email cancelled' });
}

export async function getSentEmails(req: Request, res: Response): Promise<void> {
  const userId = req.session?.userId!;
  const limit = Math.min(parseInt(req.query.limit as string || '50', 10), 200);
  const offset = parseInt(req.query.offset as string || '0', 10);

  const [emails, total] = await Promise.all([
    prisma.email.findMany({
      where: { userId, status: { in: ['SENT', 'FAILED'] } },
      orderBy: { sentAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.email.count({ where: { userId, status: { in: ['SENT', 'FAILED'] } } }),
  ]);

  res.json({ emails, total, limit, offset });
}
