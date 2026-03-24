'use client';

import * as React from 'react';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Copy } from 'lucide-react';
import { Button, Input, Label, Textarea, useToast } from '@ordo/ui';
import { cn } from '@ordo/core';
import { apiClient } from '@/lib/api-client';
import { trackEvent } from '@/lib/analytics';
import type { DescriptionRequest, DescriptionResponse } from '@ordo/types';

interface FormValues {
  title: string;
  keywords: string;
  platform: 'youtube' | 'blog';
}

export function DescriptionGenerator() {
  const { toast } = useToast();
  const [result, setResult] = React.useState<DescriptionResponse | null>(null);

  const { register, handleSubmit, watch, setValue, formState: { errors } } =
    useForm<FormValues>({
      defaultValues: { title: '', keywords: '', platform: 'youtube' },
    });

  const selectedPlatform = watch('platform');

  const { mutate, isPending } = useMutation({
    mutationFn: (payload: DescriptionRequest) =>
      apiClient.post<DescriptionResponse>('/api/v1/ai/description', payload),
    onSuccess: (data) => {
      trackEvent('ai_credit_used', { tool: 'description_generator', creditsUsed: 1 });
      setResult(data);
      toast({ title: 'Description generated' });
    },
    onError: () => {
      toast({ title: 'Failed to generate description', variant: 'destructive' });
    },
  });

  const onSubmit = handleSubmit((values) => {
    mutate({
      title: values.title,
      keywords: values.keywords.split(',').map((k) => k.trim()).filter(Boolean),
      platform: values.platform,
    });
  });

  const handleCopy = async () => {
    if (!result) return;
    await navigator.clipboard.writeText(result.description);
    toast({ title: 'Description copied!' });
  };

  const highlightKeywords = (text: string, keywords: string[]) => {
    if (!keywords.length) return text;
    const pattern = keywords.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
    const parts = text.split(new RegExp(`(${pattern})`, 'gi'));
    return parts.map((part, i) =>
      keywords.some((k) => k.toLowerCase() === part.toLowerCase()) ? (
        <mark key={i} className="bg-yellow-200 dark:bg-yellow-800/50 rounded px-0.5">
          {part}
        </mark>
      ) : (
        part
      ),
    );
  };

  return (
    <div className="space-y-6">
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="desc-title">Video / Post Title</Label>
          <Input
            id="desc-title"
            placeholder="Enter your title..."
            {...register('title', { required: 'Title is required' })}
          />
          {errors.title && (
            <p className="text-xs text-destructive">{errors.title.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="keywords">Keywords (comma-separated)</Label>
          <Input
            id="keywords"
            placeholder="e.g. productivity, morning routine, focus"
            {...register('keywords')}
          />
        </div>

        <div className="space-y-1.5">
          <Label>Platform</Label>
          <div className="flex gap-2">
            {(['youtube', 'blog'] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setValue('platform', p)}
                className={cn(
                  'rounded-full border px-4 py-1.5 text-sm font-medium capitalize transition-colors',
                  selectedPlatform === p
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-input bg-background hover:bg-accent',
                )}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        <Button type="submit" loading={isPending}>
          Generate Description
        </Button>
      </form>

      {result && (
        <div className="space-y-3 rounded-xl border p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Generated Description</h3>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {result.character_count} chars
              </span>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleCopy}
                leftIcon={<Copy className="h-3 w-3" />}
              >
                Copy
              </Button>
            </div>
          </div>
          <p className="text-sm leading-relaxed whitespace-pre-wrap">
            {highlightKeywords(
              result.description,
              result.keywords_used,
            )}
          </p>
        </div>
      )}
    </div>
  );
}
