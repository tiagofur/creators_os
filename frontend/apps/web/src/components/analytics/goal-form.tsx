'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@ordo/ui';
import type { AnalyticsGoal } from '@ordo/types';

const goalSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  metricType: z.enum(['views', 'followers', 'published', 'consistency']),
  targetValue: z.coerce.number().min(1, 'Target must be at least 1'),
  deadline: z.string().optional(),
});

type GoalFormValues = z.infer<typeof goalSchema>;

interface GoalFormProps {
  onSubmit: (values: Omit<AnalyticsGoal, 'id' | 'workspaceId' | 'currentValue' | 'status' | 'createdAt'>) => void;
  onCancel?: () => void;
  isSubmitting?: boolean;
}

export function GoalForm({ onSubmit, onCancel, isSubmitting }: GoalFormProps) {
  const { register, handleSubmit, formState: { errors } } = useForm<GoalFormValues>({
    resolver: zodResolver(goalSchema),
    defaultValues: { metricType: 'published' },
  });

  const handleFormSubmit = (values: GoalFormValues) => {
    onSubmit({
      title: values.title,
      metricType: values.metricType,
      targetValue: values.targetValue,
      deadline: values.deadline || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium">Title</label>
        <input
          {...register('title')}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          placeholder="e.g. Publish 4 videos/month"
        />
        {errors.title && (
          <p className="mt-1 text-xs text-destructive">{errors.title.message}</p>
        )}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Metric type</label>
        <select
          {...register('metricType')}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="views">Views</option>
          <option value="followers">Followers</option>
          <option value="published">Published content</option>
          <option value="consistency">Consistency score</option>
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Target value</label>
        <input
          {...register('targetValue')}
          type="number"
          min={1}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        {errors.targetValue && (
          <p className="mt-1 text-xs text-destructive">{errors.targetValue.message}</p>
        )}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Deadline (optional)</label>
        <input
          {...register('deadline')}
          type="date"
          className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : 'Add goal'}
        </Button>
      </div>
    </form>
  );
}
