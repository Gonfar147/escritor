'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/lib/auth-store';
import { ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password, rememberMe);
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo iniciar sesión');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen grid-cols-1 md:grid-cols-2">
      {/* Panel izquierdo — identidad, oculto en mobile */}
      <div className="relative hidden overflow-hidden bg-ink-950 md:flex md:flex-col md:justify-between md:p-12">
        <div className="absolute inset-0 opacity-[0.07]" style={{
          backgroundImage: 'repeating-linear-gradient(180deg, #B8944F 0px, #B8944F 1px, transparent 1px, transparent 28px)',
        }} />
        <span className="relative font-display text-lg tracking-tight text-ink_text">Manuscrito</span>
        <div className="relative max-w-sm">
          <p className="font-display text-3xl italic leading-snug text-ink_text">
            "Cada novela empieza como un montón de fragmentos sueltos."
          </p>
          <p className="mt-4 text-sm text-muted">
            Personajes, lugares, líneas temporales y escenas — todo conectado en un solo lugar.
          </p>
        </div>
      </div>

      {/* Panel derecho — formulario */}
      <div className="flex items-center justify-center bg-ink-950 px-6 py-12">
        <div className="w-full max-w-sm animate-slide-up">
          <h1 className="font-display text-2xl text-ink_text">Bienvenido de nuevo</h1>
          <p className="mt-1 text-sm text-muted">Iniciá sesión para volver a tu manuscrito.</p>

          <form onSubmit={onSubmit} className="mt-8 space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vos@ejemplo.com"
              />
            </div>
            <div>
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            <label className="flex cursor-pointer items-center gap-2 select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 rounded border-ink-600 bg-transparent text-brass accent-brass focus-visible:outline focus-visible:outline-2 focus-visible:outline-brass"
              />
              <span className="text-sm text-muted">Mantener sesión iniciada</span>
            </label>

            {error && <p className="text-sm text-brick-light">{error}</p>}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Entrando…' : 'Iniciar sesión'}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted">
            ¿No tenés cuenta?{' '}
            <Link href="/register" className="text-brass-light hover:underline">
              Creá una
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
