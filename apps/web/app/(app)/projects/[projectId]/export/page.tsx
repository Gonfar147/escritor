'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { FileText, FileType, BookOpen, Download } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

type Format = 'docx' | 'pdf' | 'epub';

const FORMATS: { id: Format; label: string; description: string; icon: React.ElementType }[] = [
  { id: 'docx', label: 'Word (.docx)', description: 'Para seguir editando, mandar a corrección, o imprimir con estilos de Word.', icon: FileText },
  { id: 'pdf', label: 'PDF', description: 'Formato final, tamaño A5, listo para leer o compartir tal cual.', icon: FileType },
  { id: 'epub', label: 'EPUB', description: 'Para lectores de e-books (Kindle vía conversión, Apple Books, etc.).', icon: BookOpen },
];

export default function ExportPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [includeSceneTitles, setIncludeSceneTitles] = useState(false);
  const [includePartTitles, setIncludePartTitles] = useState(true);
  const [downloading, setDownloading] = useState<Format | null>(null);
  const [error, setError] = useState('');

  async function download(format: Format) {
    setDownloading(format);
    setError('');
    try {
      const params = new URLSearchParams({
        includeSceneTitles: String(includeSceneTitles),
        includePartTitles: String(includePartTitles),
      });
      await api.download(`/projects/${projectId}/export/${format}?${params}`, `manuscrito.${format}`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo generar el archivo. Probá de nuevo.');
    } finally {
      setDownloading(null);
    }
  }

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="font-display text-xl text-ink_text">Exportar manuscrito</h1>
      <p className="mt-1 text-sm text-muted">
        Genera tu novela completa (todas las Partes, Capítulos y Escenas, en orden) en el formato que necesites.
      </p>

      <div className="mt-6 space-y-3 rounded-lg border border-ink-800 bg-ink-900 p-4">
        <label className="flex items-center gap-2 text-sm text-ink_text">
          <input
            type="checkbox"
            checked={includePartTitles}
            onChange={(e) => setIncludePartTitles(e.target.checked)}
            className="h-4 w-4 rounded-sm border-ink-700 bg-ink-950 accent-brass"
          />
          Incluir el título de cada Parte como sección propia
        </label>
        <label className="flex items-center gap-2 text-sm text-ink_text">
          <input
            type="checkbox"
            checked={includeSceneTitles}
            onChange={(e) => setIncludeSceneTitles(e.target.checked)}
            className="h-4 w-4 rounded-sm border-ink-700 bg-ink-950 accent-brass"
          />
          Mostrar el título de cada Escena (si no, solo se separan con · · ·)
        </label>
      </div>

      {error && <p className="mt-4 text-sm text-brick-light">{error}</p>}

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {FORMATS.map((f) => (
          <Card key={f.id} className="flex flex-col p-4">
            <f.icon className="mb-2 h-6 w-6 text-brass" strokeWidth={1.5} />
            <h3 className="font-display text-sm text-ink_text">{f.label}</h3>
            <p className="mt-1 flex-1 text-xs text-muted">{f.description}</p>
            <Button
              variant="secondary"
              size="sm"
              className="mt-3 w-full"
              onClick={() => download(f.id)}
              disabled={downloading !== null}
            >
              <Download className="h-3.5 w-3.5" />
              {downloading === f.id ? 'Generando…' : 'Descargar'}
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
}
