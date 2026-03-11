import dynamic from 'next/dynamic';
import { Skeleton } from '@ordo/ui';

function EditorSkeleton() {
  return (
    <div className="flex h-full flex-col">
      {/* Toolbar skeleton */}
      <div className="flex items-center gap-1 border-b px-2 py-1.5">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-8 rounded-md" />
        ))}
      </div>
      {/* Editor area skeleton */}
      <div className="flex-1 p-4 space-y-3">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
      </div>
    </div>
  );
}

const ScriptEditor = dynamic(
  () => import('@/components/ai-studio/script-doctor/script-editor').then((mod) => mod.ScriptEditor),
  { loading: () => <EditorSkeleton />, ssr: false },
);

export default function ScriptDoctorPage() {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b px-6 py-4">
        <h1 className="text-2xl font-bold">Script Doctor</h1>
        <p className="mt-1 text-muted-foreground text-sm">
          Write and improve your scripts with AI-powered suggestions.
        </p>
      </div>
      <div className="flex-1 overflow-hidden">
        <ScriptEditor />
      </div>
    </div>
  );
}
