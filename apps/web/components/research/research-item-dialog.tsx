'use client';

import { useEffect, useState, FormEvent, useRef } from 'react';
import { Upload, RefreshCw } from 'lucide-react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { TagInput } from '@/components/ui/tag-input';
import { api } from '@/lib/api';
import { ResearchItem, ResearchItemType } from '@/types/api';

const TYPE_LABELS: Record<ResearchItemType, string> = {
  PDF: 'PDF', WORD: 'Word', EXCEL: 'Excel', AUDIO: 'Audio', VIDEO: 'Video',
  IMAGE: 'Imagen', LINK: 'Link', NOTE: 'Nota', CLIPPING: 'Recorte', OTHER: 'Otro',
};

const FILE_TYPES: ResearchItemType[] = ['PDF', 'WORD', 'EXCEL', 'AUDIO', 'VIDEO', 'IMAGE', 'OTHER'];
const OCR_TYPES: ResearchItemType[] = ['PDF', 'IMAGE'];
const TRANSCRIPTION_TYPES: ResearchItemType[] = ['AUDIO', 'VIDEO'];
const EXTRACTABLE_TYPES: ResearchItemType[] = [...OCR_TYPES, ...TRANSCRIPTION_TYPES];

const OCR_STATUS_LABELS: Record<string, string> = {
  NONE: '', PENDING: 'Extrayendo texto (OCR)…', DONE: 'Texto extraído', FAILED: 'No se pudo extraer texto',
};

const TRANSCRIPTION_STATUS_LABELS: Record<string, string> = {
  NONE: '', PENDING: 'Transcribiendo audio…', DONE: 'Transcripción lista', FAILED: 'No se pudo transcribir',
};

export function ResearchItemDialog({
  open,
  onClose,
  onSave,
  onDelete,
  projectId,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (data: Partial<ResearchItem>) => Promise<void>;
  onDelete?: () => Promise<void>;
  projectId: string;
  initial?: ResearchItem | null;
}) {
  const [form, setForm] = useState<Partial<ResearchItem>>({ type: 'NOTE', tags: [] });
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [fileName, setFileName] = useState('');
  const [rerunning, setRerunning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setForm(initial ?? { type: 'NOTE', tags: [] });
    setFileName('');
  }, [initial, open]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave(form);
      onClose();
    } finally {
      setLoading(false);
    }
  }

  async function handleFileSelected(file: File) {
    setUploading(true);
    try {
      const { uploadUrl, fileUrl } = await api.post<{ uploadUrl: string; fileUrl: string }>('/uploads/presigned-url', {
        projectId,
        filename: file.name,
        contentType: file.type,
      });
      await fetch(uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });
      setFileName(file.name);
      setForm((f) => ({ ...f, fileUrl, mimeType: file.type, fileSizeBytes: file.size }));
    } finally {
      setUploading(false);
    }
  }

  async function rerunOcr() {
    if (!initial) return;
    setRerunning(true);
    try {
      await api.post(`/research/${initial.id}/ocr`);
      setForm((f) => ({ ...f, ocrStatus: 'PENDING' }));
    } finally {
      setRerunning(false);
    }
  }

  async function rerunTranscription() {
    if (!initial) return;
    setRerunning(true);
    try {
      await api.post(`/research/${initial.id}/transcribe`);
      setForm((f) => ({ ...f, transcriptionStatus: 'PENDING' }));
    } finally {
      setRerunning(false);
    }
  }

  const type = form.type ?? 'NOTE';
  const isOcrType = OCR_TYPES.includes(type);
  const isTranscriptionType = TRANSCRIPTION_TYPES.includes(type);
  const extractionStatus = isOcrType ? form.ocrStatus : form.transcriptionStatus;
  const extractionLabels = isOcrType ? OCR_STATUS_LABELS : TRANSCRIPTION_STATUS_LABELS;
  const showExtractionStatus = initial && extractionStatus && extractionStatus !== 'NONE';

  return (
    <Dialog open={open} onClose={onClose} title={initial ? 'Editar elemento' : 'Nuevo elemento de investigación'}>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <Label htmlFor="ri-title">Título</Label>
          <Input id="ri-title" required autoFocus value={form.title ?? ''} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </div>

        <div>
          <Label>Tipo</Label>
          <Select value={type} onChange={(e) => setForm({ ...form, type: e.target.value as ResearchItemType })}>
            {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </Select>
        </div>

        {type === 'LINK' && (
          <div>
            <Label htmlFor="ri-link">URL</Label>
            <Input id="ri-link" type="url" required value={form.linkUrl ?? ''} onChange={(e) => setForm({ ...form, linkUrl: e.target.value })} placeholder="https://…" />
          </div>
        )}

        {(type === 'NOTE' || type === 'CLIPPING') && (
          <div>
            <Label htmlFor="ri-content">{type === 'NOTE' ? 'Nota' : 'Texto recortado'}</Label>
            <Textarea id="ri-content" rows={5} required value={form.content ?? ''} onChange={(e) => setForm({ ...form, content: e.target.value })} />
          </div>
        )}

        {FILE_TYPES.includes(type) && (
          <div>
            <Label>Archivo</Label>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFileSelected(e.target.files[0])}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex w-full items-center gap-2 rounded-md border border-dashed border-ink-700 bg-ink-950 px-3 py-3 text-sm text-muted hover:border-brass/50 hover:text-ink_text"
            >
              <Upload className="h-4 w-4" />
              {uploading ? 'Subiendo…' : fileName || (form.fileUrl ? 'Archivo cargado — click para reemplazar' : 'Elegir archivo…')}
            </button>

            {isOcrType && form.fileUrl && (
              <div className="mt-2 flex items-center justify-between text-xs">
                <span className="text-muted">
                  {showExtractionStatus ? extractionLabels[extractionStatus as string] : 'El texto se extrae automáticamente (OCR) al guardar.'}
                </span>
                {initial && (
                  <button
                    type="button"
                    onClick={rerunOcr}
                    disabled={rerunning}
                    className="flex items-center gap-1 text-brass-light hover:underline disabled:opacity-50"
                  >
                    <RefreshCw className={rerunning ? 'h-3 w-3 animate-spin' : 'h-3 w-3'} />
                    Reintentar OCR
                  </button>
                )}
              </div>
            )}

            {isTranscriptionType && form.fileUrl && (
              <div className="mt-2 flex items-center justify-between text-xs">
                <span className="text-muted">
                  {showExtractionStatus ? extractionLabels[extractionStatus as string] : 'El audio se transcribe automáticamente al guardar.'}
                </span>
                {initial && (
                  <button
                    type="button"
                    onClick={rerunTranscription}
                    disabled={rerunning}
                    className="flex items-center gap-1 text-brass-light hover:underline disabled:opacity-50"
                  >
                    <RefreshCw className={rerunning ? 'h-3 w-3 animate-spin' : 'h-3 w-3'} />
                    Reintentar transcripción
                  </button>
                )}
              </div>
            )}

            {form.content && EXTRACTABLE_TYPES.includes(type) && (
              <div className="mt-2">
                <Label htmlFor="ri-extracted-content">{isTranscriptionType ? 'Transcripción (editable)' : 'Texto extraído (editable)'}</Label>
                <Textarea
                  id="ri-extracted-content"
                  rows={5}
                  value={form.content ?? ''}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                />
              </div>
            )}
          </div>
        )}

        <div>
          <Label>Etiquetas</Label>
          <TagInput value={form.tags ?? []} onChange={(v) => setForm({ ...form, tags: v })} placeholder="Agregar etiqueta…" />
        </div>

        <div className="flex justify-between gap-2 pt-2">
          {initial && onDelete ? (
            <Button type="button" variant="danger" size="sm" onClick={onDelete}>Eliminar</Button>
          ) : <span />}
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={loading || uploading}>{loading ? 'Guardando…' : 'Guardar'}</Button>
          </div>
        </div>
      </form>
    </Dialog>
  );
}

