'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter, useParams } from 'next/navigation';
import { createWorkspaceSchema, type CreateWorkspaceInput } from '@ordo/validations';
import { useWorkspaceStore } from '@ordo/stores';
import {
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ordo/ui';
import { toSlug } from '@ordo/core';
import { apiClient } from '@/lib/api-client';
import type { Workspace } from '@ordo/types';

const TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Sao_Paulo',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Asia/Kolkata',
  'Australia/Sydney',
  'Pacific/Auckland',
] as const;

export function CreateWorkspaceForm() {
  const router = useRouter();
  const params = useParams<{ locale: string }>();
  const locale = params.locale;
  const addWorkspace = useWorkspaceStore((s) => s.addWorkspace);
  const setActiveWorkspace = useWorkspaceStore((s) => s.setActiveWorkspace);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
    setValue,
    setError,
  } = useForm<CreateWorkspaceInput>({
    resolver: zodResolver(createWorkspaceSchema),
    defaultValues: { timezone: 'America/New_York' },
  });

  const nameValue = watch('name');

  useEffect(() => {
    if (nameValue) {
      setValue('slug', toSlug(nameValue), { shouldValidate: false });
    }
  }, [nameValue, setValue]);

  async function onSubmit(data: CreateWorkspaceInput) {
    try {
      const workspace = await apiClient.post<Workspace>('/v1/workspaces', data);
      addWorkspace(workspace);
      setActiveWorkspace(workspace);
      router.push(`/${locale}/dashboard`);
    } catch {
      setError('root', { message: 'Failed to create workspace. Please try again.' });
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-4">
        {errors.root && (
          <p className="text-sm text-destructive" role="alert">
            {errors.root.message}
          </p>
        )}

        <Input
          label="Workspace name"
          placeholder="My Creator Studio"
          error={errors.name?.message}
          {...register('name')}
        />

        <Input
          label="Slug"
          placeholder="my-creator-studio"
          hint="URL-friendly identifier. Auto-generated from name."
          error={errors.slug?.message}
          {...register('slug')}
        />

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-foreground">Timezone</label>
          <Select
            defaultValue="America/New_York"
            onValueChange={(value) => setValue('timezone', value, { shouldValidate: true })}
          >
            <SelectTrigger error={errors.timezone?.message}>
              <SelectValue placeholder="Select timezone" />
            </SelectTrigger>
            <SelectContent>
              {TIMEZONES.map((tz) => (
                <SelectItem key={tz} value={tz}>
                  {tz}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.timezone && (
            <p className="text-xs text-destructive" role="alert">
              {errors.timezone.message}
            </p>
          )}
        </div>
      </div>

      <Button type="submit" className="w-full" loading={isSubmitting}>
        Create workspace
      </Button>
    </form>
  );
}
