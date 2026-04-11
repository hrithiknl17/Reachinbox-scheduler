'use client';
import { useState, useEffect, useCallback } from 'react';
import { emailApi } from '@/lib/api';
import { Email } from '@/types';
import toast from 'react-hot-toast';

export function useEmails(type: 'scheduled' | 'sent') {
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEmails = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = type === 'scheduled'
        ? await emailApi.getScheduled()
        : await emailApi.getSent();
      setEmails(res.data);
    } catch (err) {
      const msg = 'Failed to load emails';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [type]);

  useEffect(() => {
    fetchEmails();
  }, [fetchEmails]);

  return { emails, loading, error, refetch: fetchEmails };
}
