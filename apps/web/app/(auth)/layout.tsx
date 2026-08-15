import { ThemeToggle } from '@/components/theme-toggle';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative">
      <ThemeToggle className="fixed right-4 top-4 z-30" />
      {children}
    </div>
  );
}
