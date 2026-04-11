'use client';
import { useState } from 'react';
import { Star, Clock } from 'lucide-react';
import { Email } from '@/types';
import EmailDetailModal from './EmailDetailModal';
import { format } from 'date-fns';

interface EmailRowProps {
  email: Email;
  type: 'scheduled' | 'sent';
  onCancelled?: () => void;
}

export default function EmailRow({ email, type, onCancelled }: EmailRowProps) {
  const [open, setOpen] = useState(false);
  const [starred, setStarred] = useState(false);

  const timeStr = type === 'scheduled'
    ? format(new Date(email.scheduledAt), 'EEE h:mm:ss a')
    : email.sentAt
    ? format(new Date(email.sentAt), 'MMM d, h:mm a')
    : '-';

  const bodyPreview = email.body.replace(/<[^>]+>/g, '').slice(0, 80);

  return (
    <>
      <div
        onClick={() => setOpen(true)}
        className="flex items-center px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors border-b border-gray-50 group"
      >
        {/* To */}
        <div className="w-36 text-sm text-gray-700 font-medium truncate flex-shrink-0">
          To: {email.toEmail.split('@')[0]}
        </div>

        {/* Time badge */}
        <div className="mx-4 flex-shrink-0">
          {type === 'scheduled' ? (
            <span className="inline-flex items-center gap-1 bg-orange-100 text-orange-500 text-xs font-medium px-2 py-0.5 rounded-full">
              <Clock className="w-3 h-3" />
              {timeStr}
            </span>
          ) : (
            <span className={`inline-flex items-center text-xs font-medium px-2.5 py-0.5 rounded-full ${
              email.status === 'SENT'
                ? 'bg-gray-100 text-gray-500'
                : 'bg-red-100 text-red-500'
            }`}>
              {email.status === 'SENT' ? 'Sent' : 'Failed'}
            </span>
          )}
        </div>

        {/* Subject + preview */}
        <div className="flex-1 min-w-0 flex items-baseline gap-1">
          <span className="text-sm font-semibold text-gray-900 truncate">{email.subject}</span>
          <span className="text-sm text-gray-400 truncate">
            — {bodyPreview}{bodyPreview.length >= 80 ? '...' : ''}
          </span>
        </div>

        {/* Star */}
        <button
          onClick={(e) => { e.stopPropagation(); setStarred(!starred); }}
          className="ml-4 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Star className={`w-4 h-4 ${starred ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
        </button>
      </div>

      {open && (
        <EmailDetailModal
          email={email}
          onClose={() => setOpen(false)}
          onCancelled={() => { setOpen(false); onCancelled?.(); }}
        />
      )}
    </>
  );
}
