'use client';

import * as React from 'react';
import { useMutation } from '@tanstack/react-query';
import { useToast } from '@ordo/ui';
import { apiClient } from '@/lib/api-client';
import { HashtagForm } from '@/components/ai-studio/hashtags/hashtag-form';
import { HashtagResults } from '@/components/ai-studio/hashtags/hashtag-results';
import type { HashtagRequest, HashtagResponse } from '@ordo/types';

export default function HashtagsPage() {
  const { toast } = useToast();
  const [result, setResult] = React.useState<HashtagResponse | null>(null);

  const { mutate, isPending } = useMutation({
    mutationFn: (payload: HashtagRequest) =>
      apiClient.post<HashtagResponse>('/v1/ai/hashtags', payload),
    onSuccess: (data) => {
      setResult(data);
      const total = data.groups.reduce((sum, g) => sum + g.hashtags.length, 0);
      toast({ title: `${total} hashtags generated` });
    },
    onError: () => {
      toast({ title: 'Failed to generate hashtags', variant: 'destructive' });
    },
  });

  return (
    <div className="mx-auto max-w-4xl p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Hashtag Generator</h1>
        <p className="mt-1 text-muted-foreground text-sm">
          Generate optimized hashtags and captions for maximum reach.
        </p>
      </div>

      <HashtagForm onSubmit={mutate} isLoading={isPending} />
      <HashtagResults result={result} isLoading={isPending} />
    </div>
  );
}
