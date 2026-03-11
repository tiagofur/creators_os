import { Skeleton } from '@ordo/ui';

const STAGES = ['Idea', 'Scripting', 'Recording', 'Editing', 'Review', 'Publishing'];

export function KanbanBoardSkeleton() {
  return (
    <div className="flex gap-3 overflow-x-auto pb-4">
      {STAGES.map((stage) => (
        <div
          key={stage}
          className="flex min-w-[280px] flex-col rounded-lg border bg-muted/30"
        >
          {/* Column header */}
          <div className="flex items-center justify-between border-b px-3 py-2.5">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-5 w-6 rounded-full" />
            </div>
            <Skeleton className="h-7 w-7 rounded-md" />
          </div>

          {/* Cards */}
          <div className="flex-1 space-y-2 p-2">
            {Array.from({ length: stage === 'Idea' ? 3 : stage === 'Scripting' ? 2 : 1 }).map(
              (_, i) => (
                <Skeleton key={i} className="h-20 w-full rounded-lg" />
              ),
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
