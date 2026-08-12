import { FileText, Link2, StickyNote, Scissors, FileSpreadsheet, Music, Video, Image as ImageIcon, File, ScanText, Loader2, AlertTriangle } from 'lucide-react';
import { ResearchItem, ResearchItemType } from '@/types/api';
import { Card } from '@/components/ui/card';

const ICONS: Record<ResearchItemType, React.ElementType> = {
  PDF: FileText, WORD: FileText, EXCEL: FileSpreadsheet, AUDIO: Music, VIDEO: Video,
  IMAGE: ImageIcon, LINK: Link2, NOTE: StickyNote, CLIPPING: Scissors, OTHER: File,
};

export function ResearchCard({ item, onClick }: { item: ResearchItem; onClick: () => void }) {
  const Icon = ICONS[item.type];
  const status = item.type === 'AUDIO' || item.type === 'VIDEO' ? item.transcriptionStatus : item.ocrStatus;
  const statusLabel = item.type === 'AUDIO' || item.type === 'VIDEO' ? 'Transcribiendo…' : 'Extrayendo texto…';
  const doneLabel = item.type === 'AUDIO' || item.type === 'VIDEO' ? 'Transcripción lista' : 'Texto extraído (OCR)';
  return (
    <Card
      onClick={onClick}
      className="cursor-pointer p-4 transition-colors hover:border-brass/40"
      role="button"
    >
      <div className="mb-2 flex items-center justify-between">
        <Icon className="h-5 w-5 text-brass" strokeWidth={1.5} />
        {status === 'PENDING' && (
          <span title={statusLabel}><Loader2 className="h-3.5 w-3.5 animate-spin text-muted" /></span>
        )}
        {status === 'DONE' && (
          <span title={doneLabel}><ScanText className="h-3.5 w-3.5 text-brass-light" /></span>
        )}
        {status === 'FAILED' && (
          <span title="Falló la extracción de texto"><AlertTriangle className="h-3.5 w-3.5 text-brick-light" /></span>
        )}
      </div>
      <h3 className="line-clamp-1 text-sm font-medium text-ink_text">{item.title}</h3>
      {item.content && <p className="mt-1 line-clamp-2 text-xs text-muted">{item.content}</p>}
      {item.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {item.tags.slice(0, 3).map((t) => (
            <span key={t} className="rounded-sm bg-ink-800 px-1.5 py-0.5 text-[10px] text-muted">{t}</span>
          ))}
        </div>
      )}
    </Card>
  );
}
