'use client';

import { Lightbulb, FileText, Kanban, Wand2 } from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@ordo/ui';
import { useUiStore } from '@ordo/stores';

export function QuickActions() {
  const router = useRouter();
  const params = useParams<{ locale: string }>();
  const locale = params.locale ?? 'en';
  const openCommandPalette = useUiStore((s) => s.openCommandPalette);

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        variant="outline"
        size="sm"
        leftIcon={<Lightbulb className="h-4 w-4" />}
        onClick={() => openCommandPalette()}
      >
        Capture idea
      </Button>
      <Button
        variant="outline"
        size="sm"
        leftIcon={<FileText className="h-4 w-4" />}
        onClick={() => router.push(`/${locale}/pipeline`)}
      >
        Create content
      </Button>
      <Button
        variant="outline"
        size="sm"
        leftIcon={<Kanban className="h-4 w-4" />}
        onClick={() => router.push(`/${locale}/pipeline`)}
      >
        Open pipeline
      </Button>
      <Button
        variant="outline"
        size="sm"
        leftIcon={<Wand2 className="h-4 w-4" />}
        onClick={() => router.push(`/${locale}/studio`)}
      >
        Go to AI Studio
      </Button>
    </div>
  );
}
