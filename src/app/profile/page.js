"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function ProfileRedirect() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (user) {
      router.replace('/profile/' + user.uid);
    } else {
      router.replace('/login');
    }
  }, [user, loading, router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-[var(--bg-base)]">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-[var(--text-muted)]">
          Loading your profile...
        </p>
      </div>
    </div>
  );
}
