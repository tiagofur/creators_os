'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@ordo/ui';
import type { BrandContact, DealStage } from '@ordo/types';

const DEAL_STAGES: DealStage[] = [
  'Prospect', 'Outreach', 'Negotiation', 'Contracted', 'Delivered', 'Paid', 'Rejected',
];

const dealSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  brandContactId: z.string().min(1, 'Brand contact is required'),
  stage: z.enum(['Prospect', 'Outreach', 'Negotiation', 'Contracted', 'Delivered', 'Paid', 'Rejected']),
  value: z.coerce.number().min(0),
  currency: z.string().default('USD'),
  platform: z.string().min(1, 'Platform is required'),
  contentType: z.string().min(1, 'Content type is required'),
  deliverableDate: z.string().optional(),
  publishDate: z.string().optional(),
  notes: z.string().optional(),
});

type DealFormValues = z.infer<typeof dealSchema>;

interface DealFormProps {
  brands: BrandContact[];
  defaultStage?: DealStage;
  onSubmit: (values: DealFormValues) => void;
  onCancel?: () => void;
  isSubmitting?: boolean;
}

export function DealForm({ brands, defaultStage = 'Prospect', onSubmit, onCancel, isSubmitting }: DealFormProps) {
  const { register, handleSubmit, formState: { errors } } = useForm<DealFormValues>({
    resolver: zodResolver(dealSchema),
    defaultValues: { stage: defaultStage, currency: 'USD' },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium">Title</label>
        <input
          {...register('title')}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          placeholder="Sponsored integration, Product review…"
        />
        {errors.title && <p className="mt-1 text-xs text-destructive">{errors.title.message}</p>}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Brand contact</label>
        <select
          {...register('brandContactId')}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">Select a brand…</option>
          {brands.map((b) => (
            <option key={b.id} value={b.id}>{b.companyName}</option>
          ))}
        </select>
        {errors.brandContactId && <p className="mt-1 text-xs text-destructive">{errors.brandContactId.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium">Stage</label>
          <select
            {...register('stage')}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {DEAL_STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Currency</label>
          <select
            {...register('currency')}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {['USD', 'EUR', 'GBP', 'CAD', 'AUD'].map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Deal value</label>
        <input
          {...register('value')}
          type="number"
          min={0}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium">Platform</label>
          <input
            {...register('platform')}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="YouTube, Instagram…"
          />
          {errors.platform && <p className="mt-1 text-xs text-destructive">{errors.platform.message}</p>}
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Content type</label>
          <input
            {...register('contentType')}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="Video, Reel, Story…"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium">Deliverable date</label>
          <input
            {...register('deliverableDate')}
            type="date"
            className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Publish date</label>
          <input
            {...register('publishDate')}
            type="date"
            className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Notes</label>
        <textarea
          {...register('notes')}
          rows={3}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
        )}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : 'Create deal'}
        </Button>
      </div>
    </form>
  );
}
