'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { LogOut, PenLine } from 'lucide-react';
import { getAccessToken, setAccessToken, API_URL } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const logout = useAuthStore((s) => s.logout);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      if (getAccessToken()) {
        setReady(true);
        return;
      }
      try {
        const res = await fetch(`${API_URL}/auth/refresh`, { method: 'POST', credentials: 'include' });
        if (!res.ok) throw new Error();
        const data = await res.json();
        setAccessToken(data.accessToken);
        setReady(true);
      } catch {
        router.replace('/login');
      }
    })();
  }, [router]);

  if (!ready) {
    return (
      <div className="flex h-screen items-center justify-center bg-ink-950">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-ink-700 border-t-brass" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ink-950">
      <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-ink-800 bg-ink-950/90 px-6 backdrop-blur">
        <Link href="/dashboard" className="flex items-center gap-2 font-display text-base text-ink_text">
          <PenLine className="h-4 w-4 text-brass" strokeWidth={1.5} />
          Manuscrito
        </Link>
        <button
          onClick={async () => {
            await logout();
            router.replace('/login');
          }}
          className="flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-ink_text"
        >
          <LogOut className="h-3.5 w-3.5" /> Cerrar sesión
        </button>
      </header>
      <main>{children}</main>
    </div>
  );
}
