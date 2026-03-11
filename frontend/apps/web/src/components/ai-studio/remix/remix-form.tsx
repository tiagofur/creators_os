'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { Button, Label, Textarea } from '@ordo/ui';
import { cn } from '@ordo/core';
import type { RemixRequest, AiPlatform } from '@ordo/types';

interface RemixFormProps {
  onSubmit: (values: RemixRequest) => void;
  isLoading: boolean;
}

const PLATFORMS: AiPlatform[] = [
  'youtube',
  'tiktok',
  'instagram',
  'twitter',
  'linkedin',
  'blog',
  'podcast',
  'email',
];

const PLATFORM_LABELS: Record<AiPlatform, string> = {
  youtube: 'YouTube',
  tiktok: 'TikTok Reel',
  instagram: 'Instagram Reel',
  twitter: 'Twitter Thread',
  linkedin: 'LinkedIn Post',
  blog: 'Blog Post',
  podcast: 'Podcast Script',
  email: 'Email Newsletter',
};

interface FormValues {
  source_content: string;
  source_platform: AiPlatform;
  target_platforms: AiPlatform[];
}

export function RemixForm({ onSubmit, isLoading }: RemixFormProps) {
  const { register, handleSubmit, watch, setValue, formState: { errors } } =
    useForm<FormValues>({
      defaultValues: {
        source_content: '',
        source_platform: 'youtube',
        target_platforms: ['twitter', 'linkedin'],
      },
    });

  const sourcePlatform = watch('source_platform');
  const targetPlatforms = watch('target_platforms');

  const toggleTarget = (platform: AiPlatform) => {
    const current = targetPlatforms;
    setValue(
      'target_platforms',
      current.includes(platform)
        ? current.filter((p) => p !== platform)
        : [...current, platform],
    );
  };

  const handleFormSubmit = handleSubmit((values) => {
    if (values.target_platforms.length === 0) return;
    onSubmit(values);
  });

  return (
    <form onSubmit={handleFormSubmit} className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="source_content">Source Content</Label>
        <Textarea
          id="source_content"
          placeholder="Paste your script, transcript, or blog post here..."
          rows={6}
          {...register('source_content', { required: 'Content is required' })}
        />
        {errors.source_content && (
          <p className="text-xs text-destructive">{errors.source_content.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label>Source Platform</Label>
        <div className="flex flex-wrap gap-2">
          {PLATFORMS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setValue('source_platform', p)}
              className={cn(
                'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                sourcePlatform === p
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-input bg-background hover:bg-accent',
              )}
            >
              {PLATFORM_LABELS[p]}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Remix For (select all that apply)</Label>
        <div className="flex flex-wrap gap-2">
          {PLATFORMS.filter((p) => p !== sourcePlatform).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => toggleTarget(p)}
              className={cn(
                'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                targetPlatforms.includes(p)
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-input bg-background hover:bg-accent',
              )}
            >
              {PLATFORM_LABELS[p]}
            </button>
          ))}
        </div>
        {targetPlatforms.length === 0 && (
          <p className="text-xs text-destructive">Select at least one target platform</p>
        )}
      </div>

      <Button
        type="submit"
        loading={isLoading}
        disabled={targetPlatforms.length === 0}
        className="w-full"
      >
        Remix Content
      </Button>
    </form>
  );
}
