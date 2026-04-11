'use client';
import { useState } from 'react';
import { Email } from '@/types';
import { X, ArrowLeft, ExternalLink, Trash2, Paperclip } from 'lucide-react';
import { format } from 'date-fns';
import Badge from '@/components/ui/Badge';
import { emailApi } from '@/lib/api';
import toast from 'react-hot-toast';

interface EmailDetailModalProps {
  email: Email;
  onClose: () => void;
  onCancelled?: () => void;
}

export default function EmailDetailModal({ email, onClose, onCancelled }: EmailDetailModalProps) {
  const [cancelling, setCancelling] = useState(false);

  const timeStr = email.sentAt
    ? format(new Date(email.sentAt), 'MMM d, yyyy h:mm a')
    : format(new Date(email.scheduledAt), 'MMM d, yyyy h:mm a');

  const badgeVariant = email.status === 'SCHEDULED' ? 'scheduled' : email.status === 'SENT' ? 'sent' : 'failed';

  async function handleCancel() {
    setCancelling(true);
    try {
      await emailApi.cancel(email.id);
      toast.success('Email cancelled');
      onClose();
      onCancelled?.();
    } catch {
      toast.error('Failed to cancel email');
    } finally {
      setCancelling(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b">
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="flex-1 text-base font-semibold text-gray-900 truncate">{email.subject}</h2>
          <Badge variant={badgeVariant}>{email.status}</Badge>
          {email.status === 'SCHEDULED' && (
            <button
              onClick={handleCancel}
              disabled={cancelling}
              className="ml-2 flex items-center gap-1.5 text-xs text-red-500 hover:text-red-600 border border-red-200 hover:border-red-300 rounded-lg px-3 py-1.5 transition-colors disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              {cancelling ? 'Cancelling…' : 'Cancel'}
            </button>
          )}
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 ml-2">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Meta */}
        <div className="px-6 py-4 border-b bg-gray-50 space-y-1 text-sm text-gray-600">
          <div><span className="font-medium text-gray-700">From:</span> {email.fromEmail}</div>
          <div><span className="font-medium text-gray-700">To:</span> {email.toEmail}</div>
          <div>
            <span className="font-medium text-gray-700">
              {email.status === 'SCHEDULED' ? 'Scheduled:' : 'Sent:'}
            </span>{' '}
            {timeStr}
          </div>
          {email.previewUrl && (
            <div>
              <span className="font-medium text-gray-700">Preview:</span>{' '}
              <a
                href={email.previewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-blue-500 hover:text-blue-600 underline"
              >
                Open in Ethereal <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
          {email.failureReason && (
            <div className="text-red-500"><span className="font-medium">Error:</span> {email.failureReason}</div>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div
            className="text-sm text-gray-800 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: email.body }}
          />
        </div>

        {/* Attachments */}
        {email.attachments && email.attachments.length > 0 && (
          <div className="px-6 py-4 border-t bg-gray-50">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Attachments ({email.attachments.length})
            </p>
            <div className="flex flex-wrap gap-2">
              {email.attachments.map((a, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm"
                >
                  <Paperclip className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                  <span className="text-gray-700 font-medium truncate max-w-[160px]">{a.filename}</span>
                  <span className="text-gray-400 text-xs flex-shrink-0">
                    {(a.size / 1024).toFixed(0)} KB
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
