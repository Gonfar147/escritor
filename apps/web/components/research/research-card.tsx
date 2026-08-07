import { FileText, Link2, StickyNote, Scissors, FileSpreadsheet, Music, Video, Image as ImageIcon, File } from 'lucide-react';
import { ResearchItem, ResearchItemType } from '@/types/api';
import { Card } from '@/components/ui/card';

const ICONS: Record<ResearchItemType, React.ElementType> = {
  PDF: FileText, WORD: FileText, EXCEL: FileSpreadsheet, AUDIO: Music, VIDEO: Video,
  IMAGE: ImageIcon, LINK: Link2, NOTE: StickyNote, CLIPPING: Scissors, OTHER: File,
};

export function ResearchCard({ item, onClick }: { item: ResearchItem; onClick: () => void }) {
  const Icon = ICONS[item.type];
  return (
    <Card
      onClick={onClick}
      className="cursor-pointer p-4 transition-colors hover:border-brass/40"
      role="button"
    >
      <Icon className="mb-2 h-5 w-5 text-brass" strokeWidth={1.5} />
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
