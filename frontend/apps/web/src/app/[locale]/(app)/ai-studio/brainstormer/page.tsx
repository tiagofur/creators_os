'use client';

import * as React from 'react';
import { useMutation } from '@tanstack/react-query';
import { useToast } from '@ordo/ui';
import { apiClient } from '@/lib/api-client';
import { BrainstormerForm } from '@/components/ai-studio/brainstormer/brainstormer-form';
import { BrainstormerResults } from '@/components/ai-studio/brainstormer/brainstormer-results';
import { trackEvent } from '@/lib/analytics';
import type { BrainstormRequest, BrainstormIdea, BrainstormResponse } from '@ordo/types';

export default function BrainstormerPage() {
  const { toast } = useToast();
  const [ideas, setIdeas] = React.useState<BrainstormIdea[]>([]);
  const [lastRequest, setLastRequest] = React.useState<BrainstormRequest | null>(null);

  const { mutate, isPending } = useMutation({
    mutationFn: (payload: BrainstormRequest) =>
      apiClient.post<BrainstormResponse>('/api/v1/ai/brainstorm', payload),
    onSuccess: (data) => {
      trackEvent('ai_credit_used', { tool: 'brainstormer', creditsUsed: 1 });
      setIdeas(data.ideas);
      toast({ title: `${data.ideas.length} ideas generated` });
    },
    onError: () => {
      toast({ title: 'Failed to generate ideas', variant: 'destructive' });
    },
  });

  const handleSubmit = (values: BrainstormRequest) => {
    setLastRequest(values);
    mutate(values);
  };

  const handleRegenerate = (idea?: BrainstormIdea) => {
    if (!lastRequest) return;
    if (idea) {
      // Regenerate just one idea — re-run with count=1 but merge result
      mutate({ ...lastRequest, count: 5 });
    } else {
      mutate(lastRequest);
    }
  };

  return (
    <div className="mx-auto max-w-4xl p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Brainstormer</h1>
        <p className="mt-1 text-muted-foreground text-sm">
          Generate content ideas tailored to your niche and platform.
        </p>
      </div>

      <BrainstormerForm onSubmit={handleSubmit} isLoading={isPending} />

      <BrainstormerResults
        ideas={ideas}
        isLoading={isPending}
        onRegenerate={handleRegenerate}
      />
    </div>
  );
}
