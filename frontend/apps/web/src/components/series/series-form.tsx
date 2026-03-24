'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Button,
  Input,
  Textarea,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@ordo/ui';
import { Upload, X } from 'lucide-react';
import { toast } from 'sonner';
import { useUpload } from '@/hooks/use-upload';
import { useWorkspaceStore } from '@ordo/stores';

const seriesFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  description: z.string().max(1000).optional(),
  cover_url: z.string().optional().or(z.literal('')),
});

export type SeriesFormValues = z.infer<typeof seriesFormSchema>;

interface SeriesFormProps {
  defaultValues?: Partial<SeriesFormValues>;
  onSubmit: (values: SeriesFormValues) => Promise<void>;
  onCancel?: () => void;
  isSubmitting?: boolean;
  submitLabel?: string;
}

export function SeriesForm({
  defaultValues,
  onSubmit,
  onCancel,
  isSubmitting,
  submitLabel = 'Save series',
}: SeriesFormProps) {
  const form = useForm<SeriesFormValues>({
    resolver: zodResolver(seriesFormSchema),
    defaultValues: {
      name: '',
      description: '',
      cover_url: '',
      ...defaultValues,
    },
  });

  const fileRef = React.useRef<HTMLInputElement>(null);
  const { upload, isUploading, progress } = useUpload();
  const workspaceId = useWorkspaceStore((s) => s.activeWorkspace?.id) ?? '';
  const coverUrl = form.watch('cover_url');

  async function handleCoverUpload(file: File) {
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file.');
      return;
    }

    try {
      const result = await upload(file, { workspaceId });
      form.setValue('cover_url', result.objectKey, { shouldValidate: true });
      toast.success('Cover image uploaded.');
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to upload cover image.',
      );
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Series Name *</FormLabel>
              <FormControl>
                <Input {...field} placeholder="My Awesome Series" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  placeholder="What is this series about?"
                  className="min-h-[80px] resize-none"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="cover_url"
          render={() => (
            <FormItem>
              <FormLabel>Cover Image</FormLabel>
              <FormControl>
                <div className="space-y-2">
                  {coverUrl && (
                    <div className="relative inline-block">
                      <img
                        src={coverUrl}
                        alt="Cover preview"
                        className="h-32 w-auto rounded-md border object-cover"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute -right-2 -top-2 h-6 w-6 rounded-full p-0"
                        onClick={() =>
                          form.setValue('cover_url', '', { shouldValidate: true })
                        }
                        aria-label="Remove cover image"
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      loading={isUploading}
                      onClick={() => fileRef.current?.click()}
                    >
                      <Upload className="mr-1.5 h-3.5 w-3.5" />
                      {coverUrl ? 'Replace image' : 'Upload image'}
                    </Button>
                    {isUploading && progress > 0 && (
                      <span className="text-xs text-muted-foreground">
                        {progress}%
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    JPG, PNG or WebP up to 50 MB
                  </p>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    aria-hidden="true"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleCoverUpload(file);
                      e.target.value = '';
                    }}
                  />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2 pt-2">
          {onCancel && (
            <Button type="button" variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button type="submit" loading={isSubmitting}>
            {submitLabel}
          </Button>
        </div>
      </form>
    </Form>
  );
}
