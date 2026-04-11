'use client';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';
import LoginCard from '@/components/auth/LoginCard';
import { ArrowLeft } from 'lucide-react';

export default function LoginPage() {
  const { data: session } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (session) router.push('/dashboard');
  }, [session, router]);

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Back link */}
      <div className="p-6">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-gray-600 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to home
        </Link>
      </div>

      {/* Center the card */}
      <div className="flex-1 flex items-center justify-center px-4 pb-12">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <span className="text-2xl font-black text-gray-900">ONB</span>
          </div>
          <LoginCard />
        </div>
      </div>
    </div>
  );
}
