'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { Button, Input, Label } from '@ordo/ui';
import { cn } from '@ordo/core';
import type { HookRequest, AiPlatform, HookStyle } from '@ordo/types';

interface HookGeneratorFormProps {
  onSubmit: (values: HookRequest) => void;
  isLoading: boolean;
}

const PLATFORMS: AiPlatform[] = ['youtube', 'tiktok', 'instagram', 'podcast'];

const HOOK_STYLES: { value: HookStyle; label: string }[] = [
  { value: 'question', label: 'Question' },
  { value: 'shocking-stat', label: 'Shocking Stat' },
  { value: 'story', label: 'Story' },
  { value: 'contrarian', label: 'Contrarian' },
];

interface FormValues {
  topic: string;
  platform: AiPlatform;
  style: HookStyle;
}

export function HookGeneratorForm({ onSubmit, isLoading }: HookGeneratorFormProps) {
  const { register, handleSubmit, watch, setValue, formState: { errors } } =
    useForm<FormValues>({
      defaultValues: {
        topic: '',
        platform: 'youtube',
        style: 'question',
      },
    });

  const selectedPlatform = watch('platform');
  const selectedStyle = watch('style');

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="hook-topic">Video Topic / Title</Label>
        <Input
          id="hook-topic"
          placeholder="e.g. How I built a 6-figure business in 6 months"
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
        <Label>Hook Style</Label>
        <div className="flex flex-wrap gap-2">
          {HOOK_STYLES.map((s) => (
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

      <Button type="submit" loading={isLoading} className="w-full">
        Generate Hooks
      </Button>
    </form>
  );
}
