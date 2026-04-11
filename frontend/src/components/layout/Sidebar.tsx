'use client';
import Image from 'next/image';
import { useState } from 'react';
import { signOut } from 'next-auth/react';
import { ChevronDown, Clock, Send, LogOut } from 'lucide-react';

interface SidebarProps {
  user: { name: string; email: string; avatar: string };
  activeTab: 'scheduled' | 'sent';
  onTabChange: (tab: 'scheduled' | 'sent') => void;
  onCompose: () => void;
  scheduledCount?: number;
  sentCount?: number;
}

export default function Sidebar({ user, activeTab, onTabChange, onCompose, scheduledCount, sentCount }: SidebarProps) {
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  return (
    <aside className="w-52 flex-shrink-0 flex flex-col py-5 px-3 gap-3 bg-[#1a1a1a]">
      {/* Logo */}
      <div className="text-white font-black text-2xl tracking-tight px-2 mb-1 select-none">ONB</div>

      {/* User info */}
      <div className="relative">
        <button
          onClick={() => setUserMenuOpen(o => !o)}
          className="w-full flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-white/5 cursor-pointer transition-colors"
        >
          {user.avatar ? (
            <Image src={user.avatar} alt={user.name} width={30} height={30} className="rounded-full flex-shrink-0" />
          ) : (
            <div className="w-[30px] h-[30px] rounded-full bg-gray-600 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
              {user.name?.[0]?.toUpperCase() || '?'}
            </div>
          )}
          <div className="flex-1 min-w-0 text-left">
            <p className="text-white text-xs font-semibold truncate leading-tight">{user.name}</p>
            <p className="text-gray-500 text-[10px] truncate leading-tight">{user.email}</p>
          </div>
          <ChevronDown className={`w-3.5 h-3.5 text-gray-500 flex-shrink-0 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
        </button>

        {userMenuOpen && (
          <div className="absolute left-0 top-full mt-1 w-full bg-[#2a2a2a] border border-white/10 rounded-xl shadow-xl z-20 overflow-hidden">
            <div className="px-3 py-2.5 border-b border-white/10">
              <p className="text-white text-xs font-semibold truncate">{user.name}</p>
              <p className="text-gray-500 text-[10px] truncate">{user.email}</p>
            </div>
            <button
              onClick={() => { setUserMenuOpen(false); signOut({ callbackUrl: '/' }); }}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign out
            </button>
          </div>
        )}
      </div>

      {/* Compose */}
      <button
        onClick={onCompose}
        className="mx-1 border border-green-500 text-green-500 rounded-full py-1.5 text-xs font-semibold hover:bg-green-500 hover:text-white transition-colors"
      >
        Compose
      </button>

      {/* Core section */}
      <div className="mt-1">
        <p className="text-gray-600 text-[10px] font-semibold uppercase tracking-widest px-2 mb-1.5">Core</p>
        <nav className="flex flex-col gap-0.5">
          {/* Scheduled */}
          <button
            onClick={() => onTabChange('scheduled')}
            className={`flex items-center justify-between px-2 py-2 rounded-lg text-xs transition-colors ${
              activeTab === 'scheduled'
                ? 'bg-[#2a2a2a] text-white'
                : 'text-gray-400 hover:text-white hover:bg-[#242424]'
            }`}
          >
            <span className="flex items-center gap-2">
              <span className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                activeTab === 'scheduled' ? 'bg-green-500/20' : 'bg-gray-700'
              }`}>
                <Clock className={`w-3 h-3 ${activeTab === 'scheduled' ? 'text-green-400' : 'text-gray-400'}`} />
              </span>
              Scheduled
            </span>
            {scheduledCount !== undefined && scheduledCount > 0 && (
              <span className="text-gray-400 text-[10px] font-medium">{scheduledCount}</span>
            )}
          </button>

          {/* Sent */}
          <button
            onClick={() => onTabChange('sent')}
            className={`flex items-center justify-between px-2 py-2 rounded-lg text-xs transition-colors ${
              activeTab === 'sent'
                ? 'bg-[#2a2a2a] text-white'
                : 'text-gray-400 hover:text-white hover:bg-[#242424]'
            }`}
          >
            <span className="flex items-center gap-2">
              <span className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                activeTab === 'sent' ? 'bg-green-500/20' : 'bg-gray-700'
              }`}>
                <Send className={`w-3 h-3 ${activeTab === 'sent' ? 'text-green-400' : 'text-gray-400'}`} />
              </span>
              Sent
            </span>
            {sentCount !== undefined && sentCount > 0 && (
              <span className="text-gray-400 text-[10px] font-medium">{sentCount}</span>
            )}
          </button>
        </nav>
      </div>

      <div className="mt-auto" />
    </aside>
  );
}
