'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useWorkspaceStore } from '@ordo/stores';
import { useIdeas } from '@/hooks/use-ideas';
import { ValidationBoard } from '@/components/ideas/validation-board';
import { Button } from '@ordo/ui';

export default function ValidatePage() {
  const params = useParams<{ locale: string }>();
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspace?.id) ?? '';
  const { data, isLoading } = useIdeas(activeWorkspaceId);

  const ideas = data?.data ?? [];

  return (
    <main className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Validation Board</h1>
          <p className="mt-1 text-muted-foreground">
            Review and validate your ideas before moving them to the pipeline.
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href={`/${params.locale}/ideas?status=archived`}>
            View graveyard
          </Link>
        </Button>
      </div>

      <ValidationBoard ideas={ideas} isLoading={isLoading} />
    </main>
  );
}
