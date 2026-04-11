'use client';
import { useSession, signIn, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export function useAuth() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const login = () => signIn('google', { callbackUrl: '/dashboard' });

  const logout = async () => {
    await signOut({ callbackUrl: '/' });
  };

  const requireAuth = () => {
    if (status === 'unauthenticated') {
      router.push('/');
    }
  };

  return {
    user: session?.user,
    session,
    status,
    isAuthenticated: status === 'authenticated',
    isLoading: status === 'loading',
    login,
    logout,
    requireAuth,
  };
}
