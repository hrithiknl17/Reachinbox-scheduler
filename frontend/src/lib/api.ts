import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

export interface PaginatedEmailResponse {
  emails: import('@/types').Email[];
  total: number;
  limit: number;
  offset: number;
}

export const emailApi = {
  schedule: (payload: import('@/types').ScheduleEmailPayload) =>
    api.post('/api/emails/schedule', payload),
  getScheduled: (limit = 50, offset = 0) =>
    api.get<PaginatedEmailResponse>(`/api/emails/scheduled?limit=${limit}&offset=${offset}`),
  getSent: (limit = 50, offset = 0) =>
    api.get<PaginatedEmailResponse>(`/api/emails/sent?limit=${limit}&offset=${offset}`),
  cancel: (id: string) =>
    api.delete(`/api/emails/${id}`),
  cancelAll: () =>
    api.delete<{ cancelled: number }>('/api/emails/cancel-all'),
  rescheduleAll: (newStartAt: string) =>
    api.post<{ rescheduled: number }>('/api/emails/reschedule-all', { newStartAt }),
};

export const authApi = {
  getMe: () => api.get<import('@/types').User>('/api/auth/me'),
  logout: () => api.post('/api/auth/logout'),
};
