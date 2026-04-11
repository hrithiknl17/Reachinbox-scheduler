import { prisma } from '../config/database';
import { emailQueue } from '../queues/emailQueue';

export async function scheduleEmailsForUser(params: {
  userId: string;
  senderEmail: string;
  recipients: string[];
  subject: string;
  body: string;
  scheduledAt: Date;
  delayBetweenMs: number;
}) {
  const { userId, senderEmail, recipients, subject, body, scheduledAt, delayBetweenMs } = params;
  const now = Date.now();
  const scheduledTimestamp = scheduledAt.getTime();
  const createdEmails = [];

  for (let i = 0; i < recipients.length; i++) {
    const recipient = recipients[i].trim();
    if (!recipient) continue;

    const emailDelay = scheduledTimestamp + i * delayBetweenMs - now;
    const delay = Math.max(0, emailDelay);

    const email = await prisma.email.create({
      data: {
        userId,
        fromEmail: senderEmail,
        toEmail: recipient,
        subject,
        body,
        status: 'SCHEDULED',
        scheduledAt: new Date(scheduledTimestamp + i * delayBetweenMs),
      },
    });

    const job = await emailQueue.add(
      'send-email',
      {
        emailId: email.id,
        fromEmail: senderEmail,
        toEmail: recipient,
        subject,
        body,
        userId,
      },
      {
        delay,
        jobId: `email-${email.id}`,
      }
    );

    await prisma.email.update({
      where: { id: email.id },
      data: { bullJobId: job.id },
    });

    createdEmails.push(email);
  }

  return createdEmails;
}
