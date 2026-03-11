'use client';

import * as React from 'react';
import { useMutation } from '@tanstack/react-query';
import { useToast } from '@ordo/ui';
import { apiClient } from '@/lib/api-client';
import { TitleLabForm } from '@/components/ai-studio/title-lab/title-lab-form';
import { TitleResults } from '@/components/ai-studio/title-lab/title-results';
import { DescriptionGenerator } from '@/components/ai-studio/title-lab/description-generator';
import { trackEvent } from '@/lib/analytics';
import type { TitleLabRequest, GeneratedTitle, TitleLabResponse } from '@ordo/types';

export default function TitleLabPage() {
  const { toast } = useToast();
  const [titles, setTitles] = React.useState<GeneratedTitle[]>([]);
  const [activeTab, setActiveTab] = React.useState<'titles' | 'description'>('titles');
  const [currentPlatform, setCurrentPlatform] = React.useState('youtube');

  const { mutate, isPending } = useMutation({
    mutationFn: (payload: TitleLabRequest) =>
      apiClient.post<TitleLabResponse>('/v1/ai/title-lab', payload),
    onSuccess: (data) => {
      trackEvent('ai_credit_used', { tool: 'title_lab', creditsUsed: 1 });
      setTitles(data.titles);
      toast({ title: `${data.titles.length} titles generated` });
    },
    onError: () => {
      toast({ title: 'Failed to generate titles', variant: 'destructive' });
    },
  });

  const handleSubmit = (values: TitleLabRequest) => {
    setCurrentPlatform(values.platform);
    mutate(values);
  };

  return (
    <div className="mx-auto max-w-4xl p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Title Lab</h1>
        <p className="mt-1 text-muted-foreground text-sm">
          Generate high-converting titles and SEO descriptions.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {(['titles', 'description'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={
              activeTab === tab
                ? 'border-b-2 border-primary px-4 py-2 text-sm font-medium text-foreground'
                : 'px-4 py-2 text-sm text-muted-foreground hover:text-foreground'
            }
          >
            {tab === 'titles' ? 'Title Generator' : 'SEO Description'}
          </button>
        ))}
      </div>

      {activeTab === 'titles' ? (
        <div className="space-y-8">
          <TitleLabForm onSubmit={handleSubmit} isLoading={isPending} />
          <TitleResults titles={titles} platform={currentPlatform} isLoading={isPending} />
        </div>
      ) : (
        <DescriptionGenerator />
      )}
    </div>
  );
}
