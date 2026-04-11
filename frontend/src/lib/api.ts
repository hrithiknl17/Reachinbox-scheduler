import axios from 'axios';

// Use Next.js API route proxy (/api/proxy → Railway) so cookies stay same-origin
const BASE = typeof window !== 'undefined' ? '/api/proxy' : (process.env.BACKEND_URL || 'http://localhost:3001');

export const api = axios.create({
  baseURL: BASE,
  withCredentials: true,
});

// Attach stored auth token to every request
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('auth_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
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
