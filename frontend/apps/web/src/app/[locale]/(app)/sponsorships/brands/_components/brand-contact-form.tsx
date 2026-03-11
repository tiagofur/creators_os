'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@ordo/ui';
import type { BrandContact } from '@ordo/types';

const brandSchema = z.object({
  companyName: z.string().min(1, 'Company name is required'),
  contactName: z.string().min(1, 'Contact name is required'),
  email: z.string().email('Invalid email'),
  website: z.string().url('Invalid URL').optional().or(z.literal('')),
  niche: z.string().min(1, 'Niche is required'),
  notes: z.string().optional(),
});

type BrandFormValues = z.infer<typeof brandSchema>;

interface BrandContactFormProps {
  onSubmit: (values: Omit<BrandContact, 'id' | 'workspaceId' | 'createdAt'>) => void;
  onCancel?: () => void;
  isSubmitting?: boolean;
  defaultValues?: Partial<BrandContact>;
}

export function BrandContactForm({ onSubmit, onCancel, isSubmitting, defaultValues }: BrandContactFormProps) {
  const { register, handleSubmit, formState: { errors } } = useForm<BrandFormValues>({
    resolver: zodResolver(brandSchema),
    defaultValues: {
      companyName: defaultValues?.companyName ?? '',
      contactName: defaultValues?.contactName ?? '',
      email: defaultValues?.email ?? '',
      website: defaultValues?.website ?? '',
      niche: defaultValues?.niche ?? '',
      notes: defaultValues?.notes ?? '',
    },
  });

  const handleFormSubmit = (values: BrandFormValues) => {
    onSubmit({
      ...values,
      website: values.website || undefined,
      notes: values.notes || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium">Company name</label>
          <input
            {...register('companyName')}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          {errors.companyName && <p className="mt-1 text-xs text-destructive">{errors.companyName.message}</p>}
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Contact name</label>
          <input
            {...register('contactName')}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          {errors.contactName && <p className="mt-1 text-xs text-destructive">{errors.contactName.message}</p>}
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Email</label>
        <input
          {...register('email')}
          type="email"
          className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        {errors.email && <p className="mt-1 text-xs text-destructive">{errors.email.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium">Website</label>
          <input
            {...register('website')}
            type="url"
            className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="https://…"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Niche</label>
          <input
            {...register('niche')}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="Tech, Fitness, Beauty…"
          />
          {errors.niche && <p className="mt-1 text-xs text-destructive">{errors.niche.message}</p>}
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

      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
        )}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : 'Save brand'}
        </Button>
      </div>
    </form>
  );
}
