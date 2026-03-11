'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { Button, Input, Label, Textarea } from '@ordo/ui';
import { cn } from '@ordo/core';
import type { HashtagRequest, AiPlatform } from '@ordo/types';

interface HashtagFormProps {
  onSubmit: (values: HashtagRequest) => void;
  isLoading: boolean;
}

const PLATFORMS: AiPlatform[] = ['instagram', 'tiktok', 'youtube', 'linkedin', 'twitter'];

interface FormValues {
  content_description: string;
  platform: AiPlatform;
  niche: string;
}

export function HashtagForm({ onSubmit, isLoading }: HashtagFormProps) {
  const { register, handleSubmit, watch, setValue, formState: { errors } } =
    useForm<FormValues>({
      defaultValues: {
        content_description: '',
        platform: 'instagram',
        niche: '',
      },
    });

  const selectedPlatform = watch('platform');

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="content_description">Content Title / Description</Label>
        <Textarea
          id="content_description"
          placeholder="Describe your post or video content..."
          rows={3}
          {...register('content_description', { required: 'Description is required' })}
        />
        {errors.content_description && (
          <p className="text-xs text-destructive">{errors.content_description.message}</p>
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
        <Label htmlFor="niche">Niche / Category</Label>
        <Input
          id="niche"
          placeholder="e.g. fitness, personal finance, travel photography"
          {...register('niche', { required: 'Niche is required' })}
        />
        {errors.niche && (
          <p className="text-xs text-destructive">{errors.niche.message}</p>
        )}
      </div>

      <Button type="submit" loading={isLoading} className="w-full">
        Generate Hashtags
      </Button>
    </form>
  );
}
