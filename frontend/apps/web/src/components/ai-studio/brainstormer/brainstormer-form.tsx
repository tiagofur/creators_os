'use client';

import * as React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Button, Input, Label } from '@ordo/ui';
import { cn } from '@ordo/core';
import type { BrainstormRequest, AiPlatform, ContentStyle } from '@ordo/types';

interface BrainstormerFormProps {
  onSubmit: (values: BrainstormRequest) => void;
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
];

const STYLES: { value: ContentStyle; label: string }[] = [
  { value: 'educational', label: 'Educational' },
  { value: 'entertaining', label: 'Entertaining' },
  { value: 'inspiring', label: 'Inspiring' },
  { value: 'behind-the-scenes', label: 'Behind the Scenes' },
];

const COUNT_OPTIONS: Array<5 | 10 | 20> = [5, 10, 20];

interface FormValues {
  topic: string;
  platforms: AiPlatform[];
  style: ContentStyle;
  count: 5 | 10 | 20;
}

export function BrainstormerForm({ onSubmit, isLoading }: BrainstormerFormProps) {
  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      topic: '',
      platforms: ['youtube'],
      style: 'educational',
      count: 10,
    },
  });

  const selectedPlatforms = watch('platforms');
  const selectedCount = watch('count');
  const selectedStyle = watch('style');

  const togglePlatform = (platform: AiPlatform) => {
    const current = selectedPlatforms;
    if (current.includes(platform)) {
      if (current.length > 1) {
        setValue('platforms', current.filter((p) => p !== platform));
      }
    } else {
      setValue('platforms', [...current, platform]);
    }
  };

  const handleFormSubmit = handleSubmit((values) => {
    onSubmit(values);
  });

  return (
    <form onSubmit={handleFormSubmit} className="space-y-5">
      {/* Topic */}
      <div className="space-y-1.5">
        <Label htmlFor="topic">Topic / Niche</Label>
        <Input
          id="topic"
          placeholder="e.g. productivity for creators, budget travel, home cooking"
          {...register('topic', { required: 'Topic is required' })}
        />
        {errors.topic && (
          <p className="text-xs text-destructive">{errors.topic.message}</p>
        )}
      </div>

      {/* Target platforms */}
      <div className="space-y-1.5">
        <Label>Target Platforms</Label>
        <div className="flex flex-wrap gap-2">
          {PLATFORMS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => togglePlatform(p)}
              className={cn(
                'rounded-full border px-3 py-1 text-xs font-medium capitalize transition-colors',
                selectedPlatforms.includes(p)
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-input bg-background hover:bg-accent',
              )}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Content style */}
      <div className="space-y-1.5">
        <Label>Content Style</Label>
        <div className="flex flex-wrap gap-2">
          {STYLES.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => setValue('style', s.value)}
              className={cn(
                'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                selectedStyle === s.value
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-input bg-background hover:bg-accent',
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Count */}
      <div className="space-y-1.5">
        <Label>Number of Ideas</Label>
        <div className="flex gap-2">
          {COUNT_OPTIONS.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setValue('count', n)}
              className={cn(
                'rounded-md border px-4 py-1.5 text-sm font-medium transition-colors',
                selectedCount === n
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-input bg-background hover:bg-accent',
              )}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      <Button type="submit" loading={isLoading} className="w-full">
        Generate Ideas
      </Button>
    </form>
  );
}
