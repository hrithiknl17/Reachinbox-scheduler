import { Worker, Job, UnrecoverableError } from 'bullmq';
import { redisForBullMQ } from '../config/redis';
import { prisma } from '../config/database';
import { getTransporter } from '../config/ethereal';
import { EmailJobData } from '../queues/emailQueue';
import nodemailer from 'nodemailer';

const CONCURRENCY = parseInt(process.env.WORKER_CONCURRENCY || '5', 10);
// Min delay between emails enforced at the BullMQ limiter level (not setTimeout)
const RATE_LIMIT_MAX = parseInt(process.env.WORKER_RATE_LIMIT_MAX || '10', 10);
const RATE_LIMIT_DURATION_MS = parseInt(process.env.WORKER_RATE_LIMIT_DURATION_MS || '2000', 10);

async function processEmailJob(job: Job<EmailJobData>): Promise<void> {
  const { emailId, fromEmail, toEmail, subject, body, attachments } = job.data;

  console.log(`[Job ${job.id}] Processing → ${toEmail}`);

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

  try {
    const info = await transporter.sendMail(mailOptions);
    const previewUrl = nodemailer.getTestMessageUrl(info) || undefined;
    console.log(`[Job ${job.id}] Sent ✓  Preview: ${previewUrl}`);

    await prisma.email.update({
      where: { id: emailId },
      data: { status: 'SENT', sentAt: new Date(), previewUrl: previewUrl ?? null },
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[Job ${job.id}] Failed: ${errorMsg}`);

    await prisma.email.update({
      where: { id: emailId },
      data: { status: 'FAILED', failureReason: errorMsg },
    });

    // After max retries, mark as unrecoverable so BullMQ stops retrying
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
║ Global limit    : ${String(process.env.MAX_EMAILS_PER_HOUR || '200').padEnd(14)}/hr ║
║ Per-sender limit: ${String(process.env.MAX_EMAILS_PER_HOUR_PER_SENDER || '50').padEnd(14)}/hr ║
╚══════════════════════════════════════╝
`);

process.on('SIGTERM', async () => {
  console.log('Shutting down worker gracefully...');
  await worker.close();
  process.exit(0);
});
