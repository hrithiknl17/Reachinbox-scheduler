'use client';
import { useState } from 'react';
import { X, Clock, Trash2, CalendarClock } from 'lucide-react';
import { emailApi } from '@/lib/api';
import toast from 'react-hot-toast';

interface StopSendingModalProps {
  scheduledCount: number;
  onClose: () => void;
  onDone: () => void;
}

export default function StopSendingModal({ scheduledCount, onClose, onDone }: StopSendingModalProps) {
  const [view, setView] = useState<'options' | 'reschedule'>('options');
  const [newStartAt, setNewStartAt] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleCancelAll() {
    setLoading(true);
    try {
      const res = await emailApi.cancelAll();
      toast.success(`${res.data.cancelled} email(s) cancelled`);
      onDone();
    } catch {
      toast.error('Failed to cancel emails');
    } finally {
      setLoading(false);
    }
  }

  async function handleReschedule() {
    if (!newStartAt) return;
    setLoading(true);
    try {
      const res = await emailApi.rescheduleAll(new Date(newStartAt).toISOString());
      toast.success(`${res.data.rescheduled} email(s) rescheduled`);
      onDone();
    } catch {
      toast.error('Failed to reschedule emails');
    } finally {
      setLoading(false);
    }
  }

  // Min datetime = now (can't reschedule to the past)
  const minDatetime = new Date(Date.now() + 60000).toISOString().slice(0, 16);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-orange-500" />
            <h2 className="text-base font-semibold text-gray-900">Stop Sending</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-5">
          {view === 'options' ? (
            <>
              <p className="text-sm text-gray-500 mb-5">
                You have <span className="font-semibold text-gray-800">{scheduledCount} email{scheduledCount !== 1 ? 's' : ''}</span> waiting to be sent. What would you like to do?
              </p>

              <div className="flex flex-col gap-3">
                {/* Reschedule */}
                <button
                  onClick={() => setView('reschedule')}
                  className="flex items-start gap-4 p-4 rounded-xl border-2 border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-all text-left group"
                >
                  <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-200 transition-colors">
                    <CalendarClock className="w-4.5 h-4.5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Send Later</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Keep all emails but start sending from a new time you pick
                    </p>
                  </div>
                </button>

                {/* Cancel all */}
                <button
                  onClick={handleCancelAll}
                  disabled={loading}
                  className="flex items-start gap-4 p-4 rounded-xl border-2 border-gray-200 hover:border-red-400 hover:bg-red-50 transition-all text-left group disabled:opacity-50"
                >
                  <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 group-hover:bg-red-200 transition-colors">
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Cancel All</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Permanently remove all {scheduledCount} scheduled email{scheduledCount !== 1 ? 's' : ''}
                    </p>
                  </div>
                </button>
              </div>
            </>
          ) : (
            <>
              <button
                onClick={() => setView('options')}
                className="text-xs text-gray-400 hover:text-gray-600 mb-4 flex items-center gap-1"
              >
                ← Back
              </button>
              <p className="text-sm text-gray-600 mb-4">
                Pick a new start time. The spacing between emails will be preserved.
              </p>
              <input
                type="datetime-local"
                value={newStartAt}
                min={minDatetime}
                onChange={e => setNewStartAt(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400 mb-4"
              />
              <button
                onClick={handleReschedule}
                disabled={!newStartAt || loading}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors disabled:opacity-50"
              >
                {loading ? 'Rescheduling…' : `Reschedule ${scheduledCount} Email${scheduledCount !== 1 ? 's' : ''}`}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
