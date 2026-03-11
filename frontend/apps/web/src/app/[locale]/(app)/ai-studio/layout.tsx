import { AiStudioNav } from '@/components/ai-studio/ai-studio-nav';

interface AiStudioLayoutProps {
  children: React.ReactNode;
}

export default function AiStudioLayout({ children }: AiStudioLayoutProps) {
  return (
    <div className="flex h-full">
      <AiStudioNav />
      <div className="flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}
