'use client';

import { useEffect } from 'react';
import { Moon, Sun } from 'lucide-react';
import { useThemeStore } from '@/lib/theme-store';

/**
 * Ícono discreto para alternar entre tema claro y oscuro. Persiste la
 * preferencia en localStorage (ver theme-store.ts) y no dispara flash de
 * tema incorrecto porque el <head> ya aplica la clase correcta antes del
 * primer paint (ver script inline en app/layout.tsx).
 */
export function ThemeToggle({ className = '' }: { className?: string }) {
  const theme = useThemeStore((s) => s.theme);
  const toggle = useThemeStore((s) => s.toggle);
  const hydrate = useThemeStore((s) => s.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
      title={theme === 'dark' ? 'Tema claro' : 'Tema oscuro'}
      className={`flex h-7 w-7 items-center justify-center rounded-full text-muted transition-colors hover:text-ink_text ${className}`}
    >
      {theme === 'dark' ? <Sun className="h-3.5 w-3.5" strokeWidth={1.5} /> : <Moon className="h-3.5 w-3.5" strokeWidth={1.5} />}
    </button>
  );
}
