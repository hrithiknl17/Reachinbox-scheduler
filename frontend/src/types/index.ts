export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
}

export interface AttachmentMeta {
  filename: string;
  contentType: string;
  size: number;
}

export interface Email {
  id: string;
  fromEmail: string;
  toEmail: string;
  subject: string;
  body: string;
  status: 'SCHEDULED' | 'SENT' | 'FAILED' | 'CANCELLED';
  scheduledAt: string;
  sentAt?: string;
  failureReason?: string;
  previewUrl?: string;
  attachments?: AttachmentMeta[];
  createdAt: string;
}

export interface AttachmentPayload {
  filename: string;
  contentType: string;
  size: number;
  base64: string;
}

export interface ScheduleEmailPayload {
  recipients: string[];
  subject: string;
  body: string;
  scheduledAt: string;
  delayBetweenMs?: number;
  hourlyLimit?: number;
  fromEmail?: string;
  attachments?: AttachmentPayload[];
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
}
