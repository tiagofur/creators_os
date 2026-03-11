'use client';

import * as React from 'react';
import { useMutation } from '@tanstack/react-query';
import { useToast } from '@ordo/ui';
import { apiClient } from '@/lib/api-client';
import { RemixForm } from '@/components/ai-studio/remix/remix-form';
import { RemixResults } from '@/components/ai-studio/remix/remix-results';
import { HookGeneratorForm } from '@/components/ai-studio/hook-generator/hook-generator-form';
import { HookResults } from '@/components/ai-studio/hook-generator/hook-results';
import { trackEvent } from '@/lib/analytics';
import type { RemixRequest, RemixVariant, RemixResponse, HookRequest, GeneratedHook, HookResponse } from '@ordo/types';

export default function RemixPage() {
  const { toast } = useToast();
  const [variants, setVariants] = React.useState<RemixVariant[]>([]);
  const [hooks, setHooks] = React.useState<GeneratedHook[]>([]);
  const [activeTab, setActiveTab] = React.useState<'remix' | 'hooks'>('remix');

  const { mutate: runRemix, isPending: isRemixing } = useMutation({
    mutationFn: (payload: RemixRequest) =>
      apiClient.post<RemixResponse>('/v1/ai/remix', payload),
    onSuccess: (data) => {
      trackEvent('ai_credit_used', { tool: 'remix', creditsUsed: 1 });
      setVariants(data.variants);
      toast({ title: `${data.variants.length} variants created` });
    },
    onError: () => {
      toast({ title: 'Failed to remix content', variant: 'destructive' });
    },
  });

  const { mutate: runHooks, isPending: isGeneratingHooks } = useMutation({
    mutationFn: (payload: HookRequest) =>
      apiClient.post<HookResponse>('/v1/ai/hooks', payload),
    onSuccess: (data) => {
      trackEvent('ai_credit_used', { tool: 'hook_generator', creditsUsed: 1 });
      setHooks(data.hooks);
      toast({ title: `${data.hooks.length} hooks generated` });
    },
    onError: () => {
      toast({ title: 'Failed to generate hooks', variant: 'destructive' });
    },
  });

  return (
    <div className="mx-auto max-w-5xl p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Remix Engine</h1>
        <p className="mt-1 text-muted-foreground text-sm">
          Repurpose your content across platforms or generate compelling hooks.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {(['remix', 'hooks'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={
              activeTab === tab
                ? 'border-b-2 border-primary px-4 py-2 text-sm font-medium text-foreground'
                : 'px-4 py-2 text-sm text-muted-foreground hover:text-foreground'
            }
          >
            {tab === 'remix' ? 'Remix Engine' : 'Hook Generator'}
          </button>
        ))}
      </div>

      {activeTab === 'remix' ? (
        <div className="space-y-8">
          <RemixForm onSubmit={runRemix} isLoading={isRemixing} />
          <RemixResults variants={variants} isLoading={isRemixing} />
        </div>
      ) : (
        <div className="space-y-8">
          <HookGeneratorForm onSubmit={runHooks} isLoading={isGeneratingHooks} />
          <HookResults hooks={hooks} isLoading={isGeneratingHooks} />
        </div>
      )}
    </div>
  );
}
