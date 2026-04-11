'use client';
import { Email } from '@/types';
import EmailRow from './EmailRow';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

interface EmailListProps {
  emails: Email[];
  loading: boolean;
  type: 'scheduled' | 'sent';
  onRefresh: () => void;
  onCancelled?: () => void;
  total?: number;
  onLoadMore?: () => void;
  loadingMore?: boolean;
}

export default function EmailList({ emails, loading, type, onRefresh, onCancelled, total, onLoadMore, loadingMore }: EmailListProps) {
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (emails.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-2">
        <p className="text-lg font-medium">No {type} emails</p>
        <p className="text-sm">
          {type === 'scheduled'
            ? 'Schedule an email using the Compose button'
            : 'Sent emails will appear here'}
        </p>
        <button
          onClick={onRefresh}
          className="mt-2 text-sm text-green-500 hover:text-green-600 underline"
        >
          Refresh
        </button>
      </div>
    );
  }

  const hasMore = total !== undefined && emails.length < total;

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="divide-y divide-gray-50">
        {emails.map((email) => (
          <EmailRow key={email.id} email={email} type={type} onCancelled={onCancelled} />
        ))}
      </div>

      {hasMore && (
        <div className="flex items-center justify-center py-4 border-t border-gray-100">
          <button
            onClick={onLoadMore}
            disabled={loadingMore}
            className="text-sm text-gray-500 hover:text-gray-700 border border-gray-200 hover:border-gray-300 rounded-lg px-4 py-2 transition-colors disabled:opacity-50"
          >
            {loadingMore
              ? 'Loading…'
              : `Load more (${emails.length} of ${total})`}
          </button>
        </div>
      )}

      {!hasMore && emails.length > 0 && (
        <p className="text-center text-xs text-gray-300 py-4">
          All {emails.length} email{emails.length !== 1 ? 's' : ''} loaded
        </p>
      )}
    </div>
  );
}
