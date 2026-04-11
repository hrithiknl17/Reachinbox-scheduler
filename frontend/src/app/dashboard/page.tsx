'use client';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import EmailList from '@/components/emails/EmailList';
import ComposeModal from '@/components/emails/ComposeModal';
import StopSendingModal from '@/components/emails/StopSendingModal';
import { Email } from '@/types';
import { emailApi } from '@/lib/api';
import toast from 'react-hot-toast';
import { Search, SlidersHorizontal, RefreshCw, StopCircle, ChevronDown } from 'lucide-react';

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'scheduled' | 'sent'>('scheduled');
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);
  const [composeOpen, setComposeOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [synced, setSynced] = useState(false);
  const [stopModalOpen, setStopModalOpen] = useState(false);
  const [total, setTotal] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'all'>('all');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/');
    }
  }, [status, router]);

  // Sync NextAuth session with backend session
  useEffect(() => {
    if (session?.user && !synced) {
      const user = session.user as any;
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          googleId: user.googleId || user.email,
          email: user.email,
          name: user.name,
          avatar: user.image,
        }),
      }).then(() => setSynced(true));
    }
  }, [session, synced]);

  useEffect(() => {
    if (synced) {
      fetchEmails();
    }
  }, [synced, activeTab]);

  async function fetchEmails() {
    setLoading(true);
    try {
      const res = activeTab === 'scheduled'
        ? await emailApi.getScheduled(50, 0)
        : await emailApi.getSent(50, 0);
      setEmails(res.data.emails);
      setTotal(res.data.total);
    } catch {
      toast.error('Failed to load emails');
    } finally {
      setLoading(false);
    }
  }

  async function loadMore() {
    setLoadingMore(true);
    try {
      const res = activeTab === 'scheduled'
        ? await emailApi.getScheduled(50, emails.length)
        : await emailApi.getSent(50, emails.length);
      setEmails(prev => [...prev, ...res.data.emails]);
      setTotal(res.data.total);
    } catch {
      toast.error('Failed to load more');
    } finally {
      setLoadingMore(false);
    }
  }

  const filteredEmails = emails.filter(email => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matches =
        email.toEmail.toLowerCase().includes(q) ||
        email.subject.toLowerCase().includes(q) ||
        email.body.toLowerCase().includes(q);
      if (!matches) return false;
    }
    if (statusFilter !== 'ALL' && email.status !== statusFilter) return false;
    if (dateFilter !== 'all') {
      const date = new Date(email.sentAt || email.scheduledAt);
      const now = new Date();
      if (dateFilter === 'today') {
        if (date.toDateString() !== now.toDateString()) return false;
      } else if (dateFilter === 'week') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        if (date < weekAgo) return false;
      }
    }
    return true;
  });

  const activeFiltersCount = (statusFilter !== 'ALL' ? 1 : 0) + (dateFilter !== 'all' ? 1 : 0);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-[#1a1a1a] flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="min-h-screen bg-[#1a1a1a] flex">
      <Sidebar
        user={{
          name: session.user?.name || '',
          email: session.user?.email || '',
          avatar: session.user?.image || '',
        }}
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          setSearchQuery('');
          setEmails([]);
          setTotal(0);
        }}
        onCompose={() => setComposeOpen(true)}
        scheduledCount={emails.filter(e => e.status === 'SCHEDULED').length}
        sentCount={emails.filter(e => e.status === 'SENT' || e.status === 'FAILED').length}
      />
      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="bg-white rounded-tl-2xl flex-1 flex flex-col m-2 ml-0 overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
            <div className="flex-1 flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
              <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search"
                className="flex-1 bg-transparent text-sm text-gray-700 placeholder-gray-400 outline-none"
              />
            </div>
            <div className="relative">
              <button
                onClick={() => setFilterOpen(o => !o)}
                className={`relative text-gray-400 hover:text-gray-600 transition-colors ${activeFiltersCount > 0 ? 'text-blue-500' : ''}`}
              >
                <SlidersHorizontal className="w-4 h-4" />
                {activeFiltersCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-blue-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                    {activeFiltersCount}
                  </span>
                )}
              </button>
              {filterOpen && (
                <div className="absolute right-0 top-7 w-52 bg-white border border-gray-200 rounded-xl shadow-lg z-20 p-3 flex flex-col gap-3">
                  <div>
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Status</p>
                    <div className="flex flex-wrap gap-1">
                      {(activeTab === 'scheduled'
                        ? ['ALL', 'SCHEDULED', 'CANCELLED']
                        : ['ALL', 'SENT', 'FAILED']
                      ).map(s => (
                        <button
                          key={s}
                          onClick={() => setStatusFilter(s)}
                          className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                            statusFilter === s
                              ? 'bg-blue-500 text-white border-blue-500'
                              : 'text-gray-500 border-gray-200 hover:border-gray-400'
                          }`}
                        >
                          {s === 'ALL' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Date</p>
                    <div className="flex flex-wrap gap-1">
                      {([['all', 'All time'], ['today', 'Today'], ['week', 'This week']] as const).map(([val, label]) => (
                        <button
                          key={val}
                          onClick={() => setDateFilter(val)}
                          className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                            dateFilter === val
                              ? 'bg-blue-500 text-white border-blue-500'
                              : 'text-gray-500 border-gray-200 hover:border-gray-400'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                  {activeFiltersCount > 0 && (
                    <button
                      onClick={() => { setStatusFilter('ALL'); setDateFilter('all'); }}
                      className="text-xs text-red-400 hover:text-red-500 text-left"
                    >
                      Clear filters
                    </button>
                  )}
                </div>
              )}
            </div>
            <button onClick={fetchEmails} className="text-gray-400 hover:text-gray-600 transition-colors">
              <RefreshCw className="w-4 h-4" />
            </button>
            {activeTab === 'scheduled' && emails.length > 0 && (
              <button
                onClick={() => setStopModalOpen(true)}
                className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-600 border border-red-200 hover:border-red-300 rounded-lg px-3 py-1.5 transition-colors"
              >
                <StopCircle className="w-3.5 h-3.5" />
                Stop Sending
              </button>
            )}
          </div>
          <EmailList
            emails={filteredEmails}
            loading={loading}
            type={activeTab}
            onRefresh={fetchEmails}
            onCancelled={fetchEmails}
            total={total}
            onLoadMore={loadMore}
            loadingMore={loadingMore}
          />
        </div>
      </main>

      {composeOpen && (
        <ComposeModal
          onClose={() => setComposeOpen(false)}
          onSuccess={() => {
            setComposeOpen(false);
            setActiveTab('scheduled');
            setEmails([]);
            setTotal(0);
            // Small delay — backend processes the batch asynchronously after 202
            setTimeout(() => fetchEmails(), 800);
          }}
          userEmail={session.user?.email || ''}
        />
      )}

      {stopModalOpen && (
        <StopSendingModal
          scheduledCount={emails.length}
          onClose={() => setStopModalOpen(false)}
          onDone={() => { setStopModalOpen(false); fetchEmails(); }}
        />
      )}
    </div>
  );
}
