'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { setAccessToken } from '@/lib/api';

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1'}/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
        });
        if (res.ok) {
          const data = await res.json();
          setAccessToken(data.accessToken);
          router.replace('/dashboard');
          return;
        }
      } catch {
        // sin sesión activa
      }
      router.replace('/login');
    })();
  }, [router]);

  return (
    <div className="flex h-screen items-center justify-center bg-ink-950">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-ink-700 border-t-brass" />
    </div>
  );
}
