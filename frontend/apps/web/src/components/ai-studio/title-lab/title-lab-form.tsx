'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { Button, Input, Label, Textarea } from '@ordo/ui';
import { cn } from '@ordo/core';
import type { TitleLabRequest, AiPlatform, TitleTone } from '@ordo/types';

interface TitleLabFormProps {
  onSubmit: (values: TitleLabRequest) => void;
  isLoading: boolean;
}

const PLATFORMS: AiPlatform[] = ['youtube', 'tiktok', 'instagram', 'twitter', 'linkedin', 'blog'];

const TONES: { value: TitleTone; label: string }[] = [
  { value: 'curiosity', label: 'Curiosity' },
  { value: 'authority', label: 'Authority' },
  { value: 'fomo', label: 'FOMO' },
  { value: 'storytelling', label: 'Storytelling' },
  { value: 'controversy', label: 'Controversy' },
];

const COUNT_OPTIONS: Array<5 | 10 | 20> = [5, 10, 20];

interface FormValues {
  topic: string;
  platform: AiPlatform;
  tone: TitleTone;
  count: 5 | 10 | 20;
}

export function TitleLabForm({ onSubmit, isLoading }: TitleLabFormProps) {
  const { register, handleSubmit, watch, setValue, formState: { errors } } =
    useForm<FormValues>({
      defaultValues: {
        topic: '',
        platform: 'youtube',
        tone: 'curiosity',
        count: 10,
      },
    });

  const selectedPlatform = watch('platform');
  const selectedTone = watch('tone');
  const selectedCount = watch('count');

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="topic">Topic / Description</Label>
        <Textarea
          id="topic"
          placeholder="Describe the video or post topic..."
          rows={3}
          {...register('topic', { required: 'Topic is required' })}
        />
        {errors.topic && (
          <p className="text-xs text-destructive">{errors.topic.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label>Platform</Label>
        <div className="flex flex-wrap gap-2">
          {PLATFORMS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setValue('platform', p)}
              className={cn(
                'rounded-full border px-3 py-1 text-xs font-medium capitalize transition-colors',
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

      <div className="space-y-1.5">
        <Label>Tone</Label>
        <div className="flex flex-wrap gap-2">
          {TONES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setValue('tone', t.value)}
              className={cn(
                'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                selectedTone === t.value
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-input bg-background hover:bg-accent',
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Number of Titles</Label>
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
        Generate Titles
      </Button>
    </form>
  );
}
