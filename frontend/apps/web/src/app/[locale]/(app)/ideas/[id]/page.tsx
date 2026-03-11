'use client';

import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button, Skeleton } from '@ordo/ui';
import { useIdea } from '@/hooks/use-ideas';
import { IdeaDetailSheet } from '@/components/ideas/idea-detail-sheet';

export default function IdeaDetailPage() {
  const params = useParams<{ id: string; locale: string }>();
  const router = useRouter();
  const { data: idea, isLoading } = useIdea(params.id);

  if (isLoading) {
    return (
      <main className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32" />
      </main>
    );
  }

  if (!idea) {
    return (
      <main className="p-6">
        <p className="text-muted-foreground">Idea not found.</p>
      </main>
    );
  }

  return (
    <main className="p-6">
      <Button
        variant="ghost"
        size="sm"
        leftIcon={<ArrowLeft className="h-4 w-4" />}
        onClick={() => router.back()}
        className="mb-4"
      >
        Back
      </Button>

      <IdeaDetailSheet
        idea={idea}
        open={true}
        onClose={() => router.back()}
      />
    </main>
  );
}
