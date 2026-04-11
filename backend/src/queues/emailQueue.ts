import { Queue } from 'bullmq';
import { redisForBullMQ } from '../config/redis';

export interface AttachmentData {
  filename: string;
  contentType: string;
  size: number;
  base64: string; // full data lives here in Redis, not in DB
}

export interface EmailJobData {
  emailId: string;
  fromEmail: string;
  toEmail: string;
  subject: string;
  body: string;
  userId: string;
  attachments?: AttachmentData[];
}

export const emailQueue = new Queue<EmailJobData>('email-queue', {
  connection: redisForBullMQ,
  defaultJobOptions: {
    removeOnComplete: false,
    removeOnFail: false,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
  },
});
