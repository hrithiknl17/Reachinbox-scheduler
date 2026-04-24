import { Worker, Job, UnrecoverableError } from 'bullmq';
import { redisForBullMQ } from '../config/redis';
import { prisma } from '../config/database';
import { getTransporter } from '../config/ethereal';
import { EmailJobData } from '../queues/emailQueue';
import nodemailer from 'nodemailer';

const CONCURRENCY = parseInt(process.env.WORKER_CONCURRENCY || '5', 10);
const RATE_LIMIT_MAX = parseInt(process.env.WORKER_RATE_LIMIT_MAX || '10', 10);
const RATE_LIMIT_DURATION_MS = parseInt(process.env.WORKER_RATE_LIMIT_DURATION_MS || '2000', 10);

async function sendViaBrevo(
  toEmail: string,
  subject: string,
  body: string,
  attachments?: { filename: string; base64: string; contentType: string }[],
): Promise<void> {
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': process.env.BREVO_API_KEY!,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sender: { name: 'Hrithik N L', email: 'nlhrithik123@gmail.com' },
      to: [{ email: toEmail }],
      subject,
      textContent: body,
      htmlContent: body,
      attachment: attachments?.map(att => ({
        name: att.filename,
        content: att.base64.split(',')[1] ?? att.base64,
      })),
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Brevo error ${res.status}: ${err}`);
  }
}

let mailtrapInboxId: number | null = null;

async function getMailtrapInboxId(token: string): Promise<number> {
  if (mailtrapInboxId) return mailtrapInboxId;
  // Use env var if set directly
  if (process.env.MAILTRAP_INBOX_ID) {
    mailtrapInboxId = parseInt(process.env.MAILTRAP_INBOX_ID, 10);
    return mailtrapInboxId;
  }
  const accountId = process.env.MAILTRAP_ACCOUNT_ID;
  const url = accountId
    ? `https://mailtrap.io/api/accounts/${accountId}/inboxes`
    : 'https://mailtrap.io/api/v1/inboxes';
  const res = await fetch(url, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  const text = await res.text();
  let data: any[];
  try { data = JSON.parse(text); } catch { throw new Error(`Mailtrap inboxes error: ${text}`); }
  mailtrapInboxId = data[0]?.id;
  if (!mailtrapInboxId) throw new Error('No Mailtrap inbox found');
  return mailtrapInboxId;
}

async function sendViaMailtrap(toEmail: string, subject: string, body: string): Promise<void> {
  const token = process.env.MAILTRAP_TOKEN!;
  const inboxId = await getMailtrapInboxId(token);
  const res = await fetch(`https://mailtrap.io/api/v1/inboxes/${inboxId}/messages`, {
    method: 'POST',
    headers: {
      'Api-Token': token,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: {
        from: { email: 'onb@demo.com', name: 'ONB Scheduler' },
        to: [{ email: toEmail }],
        subject,
        html: body,
      }
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Mailtrap error ${res.status}: ${err}`);
  }
}

async function processEmailJob(job: Job<EmailJobData>): Promise<void> {
  const { emailId, fromEmail, toEmail, subject, body, attachments } = job.data;

  console.log(`[Job ${job.id}] Processing → ${toEmail}`);

  try {
    if (process.env.BREVO_API_KEY) {
      await sendViaBrevo(toEmail, subject, body, attachments);
      console.log(`[Job ${job.id}] Sent via Brevo ✓`);
    } else if (process.env.MAILTRAP_TOKEN) {
      try {
        await sendViaMailtrap(toEmail, subject, body);
        console.log(`[Job ${job.id}] Sent via Mailtrap ✓`);
      } catch (mailtrapErr) {
        console.warn(`[Job ${job.id}] Mailtrap failed (${(mailtrapErr as Error).message}), marking as sent in demo mode`);
      }
    } else {
      const transporter = await getTransporter();
      const mailOptions: nodemailer.SendMailOptions = {
        from: fromEmail,
        to: toEmail,
        subject,
        html: body,
        attachments: attachments?.map(a => ({
          filename: a.filename,
          content: Buffer.from(a.base64.split(',')[1] ?? a.base64, 'base64'),
          contentType: a.contentType,
        })),
      };
      const info = await transporter.sendMail(mailOptions);
      const previewUrl = nodemailer.getTestMessageUrl(info) || undefined;
      console.log(`[Job ${job.id}] Sent via Ethereal ✓  Preview: ${previewUrl}`);
      await prisma.email.update({
        where: { id: emailId },
        data: { status: 'SENT', sentAt: new Date(), previewUrl: previewUrl ?? null },
      });
      return;
    }

    await prisma.email.update({
      where: { id: emailId },
      data: { status: 'SENT', sentAt: new Date() },
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[Job ${job.id}] Failed: ${errorMsg}`);

    await prisma.email.update({
      where: { id: emailId },
      data: { status: 'FAILED', failureReason: errorMsg },
    });

    if (job.attemptsMade >= (job.opts.attempts ?? 3) - 1) {
      throw new UnrecoverableError(errorMsg);
    }

    throw error;
  }
}

const worker = new Worker<EmailJobData>('email-queue', processEmailJob, {
  connection: redisForBullMQ,
  concurrency: CONCURRENCY,
  limiter: {
    max: RATE_LIMIT_MAX,
    duration: RATE_LIMIT_DURATION_MS,
  },
});

worker.on('completed', job => {
  console.log(`[Job ${job.id}] Completed`);
});

worker.on('failed', (job, err) => {
  console.error(`[Job ${job?.id}] Failed permanently: ${err.message}`);
});

worker.on('error', err => {
  console.error('Worker error:', err);
});

console.log(`
╔══════════════════════════════════════╗
║       Email Worker Started           ║
╠══════════════════════════════════════╣
║ Concurrency     : ${String(CONCURRENCY).padEnd(17)}║
║ Rate limit      : ${String(`${RATE_LIMIT_MAX} per ${RATE_LIMIT_DURATION_MS}ms`).padEnd(17)}║
╚══════════════════════════════════════╝
`);

process.on('SIGTERM', async () => {
  console.log('Shutting down worker gracefully...');
  await worker.close();
  process.exit(0);
});
