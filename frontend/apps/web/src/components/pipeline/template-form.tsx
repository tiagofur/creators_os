'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Button,
  Input,
  Textarea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@ordo/ui';
import type { ContentTemplate } from '@ordo/types';

const templateFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  content_type: z.enum(['video', 'short', 'reel', 'post', 'thread']),
  platform_target: z.string().optional(),
  prompt_template: z.string().optional(),
  default_checklist: z.string().optional(),
});

export type TemplateFormValues = z.infer<typeof templateFormSchema>;

interface TemplateFormProps {
  defaultValues?: Partial<TemplateFormValues>;
  template?: ContentTemplate;
  onSubmit: (values: TemplateFormValues) => Promise<void>;
  onCancel?: () => void;
  isSubmitting?: boolean;
  submitLabel?: string;
}

export function TemplateForm({
  defaultValues,
  template,
  onSubmit,
  onCancel,
  isSubmitting,
  submitLabel = 'Create template',
}: TemplateFormProps) {
  const form = useForm<TemplateFormValues>({
    resolver: zodResolver(templateFormSchema),
    defaultValues: {
      name: template?.name ?? '',
      description: template?.description ?? '',
      content_type: template?.content_type ?? 'video',
      platform_target: (template?.platform_target as string) ?? '',
      prompt_template: template?.prompt_template ?? '',
      default_checklist: template?.default_checklist
        ? JSON.stringify(template.default_checklist, null, 2)
        : '',
      ...defaultValues,
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {/* Name */}
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Template Name *</FormLabel>
              <FormControl>
                <Input {...field} placeholder="e.g. Weekly Vlog, Product Review" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Description */}
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  placeholder="Brief description of this template..."
                  className="min-h-[60px] resize-none"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Content Type */}
        <FormField
          control={form.control}
          name="content_type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Content Type</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select content type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="video">Video</SelectItem>
                  <SelectItem value="short">Short</SelectItem>
                  <SelectItem value="reel">Reel</SelectItem>
                  <SelectItem value="post">Post</SelectItem>
                  <SelectItem value="thread">Thread</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Platform Target */}
        <FormField
          control={form.control}
          name="platform_target"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Platform Target</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select platform" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="youtube">YouTube</SelectItem>
                  <SelectItem value="tiktok">TikTok</SelectItem>
                  <SelectItem value="instagram">Instagram</SelectItem>
                  <SelectItem value="twitter">Twitter</SelectItem>
                  <SelectItem value="linkedin">LinkedIn</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Prompt Template */}
        <FormField
          control={form.control}
          name="prompt_template"
          render={({ field }) => (
            <FormItem>
              <FormLabel>AI Prompt Template</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  placeholder="Write an outline for a {{topic}} video including intro, 3 main points, and a call to action..."
                  className="min-h-[80px] resize-none"
                />
              </FormControl>
              <p className="text-xs text-muted-foreground mt-1">
                Use {'{{topic}}'} as a placeholder for the topic when creating content from this template.
              </p>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Default Checklist (JSON) */}
        <FormField
          control={form.control}
          name="default_checklist"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Default Checklist (JSON)</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  placeholder='{"pre_production": ["Script review", "Equipment check"], "post_production": ["Thumbnail", "SEO tags"]}'
                  className="min-h-[80px] resize-none font-mono text-sm"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Actions */}
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
