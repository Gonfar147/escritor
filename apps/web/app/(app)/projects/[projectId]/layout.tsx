'use client';

import Link from 'next/link';
import { usePathname, useParams } from 'next/navigation';
import { cn } from '@/lib/utils';

const TABS = [
  { href: '', label: 'Resumen' },
  { href: '/editor', label: 'Escribir' },
  { href: '/characters', label: 'Personajes' },
  { href: '/locations', label: 'Lugares' },
  { href: '/objects', label: 'Objetos' },
  { href: '/world', label: 'Mundo' },
  { href: '/timeline', label: 'Línea temporal' },
  { href: '/maps', label: 'Mapas' },
  { href: '/research', label: 'Investigación' },
];

export default function ProjectLayout({ children }: { children: React.ReactNode }) {
  const { projectId } = useParams<{ projectId: string }>();
  const pathname = usePathname();
  const base = `/projects/${projectId}`;

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
      <nav className="flex shrink-0 gap-1 overflow-x-auto border-b border-ink-800 px-6">
        {TABS.map((tab) => {
          const href = `${base}${tab.href}`;
          const active = tab.href === '' ? pathname === base : pathname.startsWith(href);
          return (
            <Link
              key={tab.href}
              href={href}
              className={cn(
                'relative whitespace-nowrap px-3 py-3 text-sm transition-colors',
                active ? 'text-brass-light' : 'text-muted hover:text-ink_text',
              )}
            >
              {tab.label}
              {active && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-brass" />}
            </Link>
          );
        })}
      </nav>
      <div className="flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}
