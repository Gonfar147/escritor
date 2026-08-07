import { TextareaHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        'w-full rounded-md border border-ink-700 bg-ink-900 px-3 py-2 text-sm text-ink_text',
        'placeholder:text-muted',
        'focus-visible:border-brass focus-visible:outline-none',
        className,
      )}
      {...props}
    />
  ),
);
Textarea.displayName = 'Textarea';
