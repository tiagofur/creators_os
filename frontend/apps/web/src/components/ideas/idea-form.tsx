'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X } from 'lucide-react';
import { cn } from '@ordo/core';
import {
  Button,
  Input,
  Textarea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Checkbox,
  Badge,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@ordo/ui';
import type { Idea } from '@ordo/types';

const PLATFORMS = [
  'youtube',
  'instagram',
  'tiktok',
  'twitter',
  'linkedin',
  'podcast',
  'blog',
] as const;

const ideaFormSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be ≤ 200 characters'),
  description: z.string().max(2000, 'Description must be ≤ 2000 characters').optional(),
  platforms: z.array(z.string()).optional(),
  effort: z.enum(['S', 'M', 'L', 'XL']).optional(),
  tags: z.array(z.string()).optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
});

export type IdeaFormValues = z.infer<typeof ideaFormSchema>;

interface IdeaFormProps {
  defaultValues?: Partial<IdeaFormValues>;
  onSubmit: (values: IdeaFormValues) => Promise<void>;
  onCancel?: () => void;
  isSubmitting?: boolean;
  submitLabel?: string;
}

export function IdeaForm({
  defaultValues,
  onSubmit,
  onCancel,
  isSubmitting,
  submitLabel = 'Save',
}: IdeaFormProps) {
  const [tagInput, setTagInput] = React.useState('');

  const form = useForm<IdeaFormValues>({
    resolver: zodResolver(ideaFormSchema),
    defaultValues: {
      title: '',
      description: '',
      platforms: [],
      tags: [],
      priority: 'medium',
      ...defaultValues,
    },
  });

  const tags = form.watch('tags') ?? [];
  const platforms = form.watch('platforms') ?? [];

  const addTag = () => {
    const newTags = tagInput
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t && !tags.includes(t));
    if (newTags.length) {
      form.setValue('tags', [...tags, ...newTags]);
    }
    setTagInput('');
  };

  const removeTag = (tag: string) => {
    form.setValue(
      'tags',
      tags.filter((t) => t !== tag),
    );
  };

  const togglePlatform = (platform: string) => {
    form.setValue(
      'platforms',
      platforms.includes(platform)
        ? platforms.filter((p) => p !== platform)
        : [...platforms, platform],
    );
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        {/* Title */}
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title *</FormLabel>
              <FormControl>
                <Input {...field} placeholder="What's your idea?" maxLength={200} />
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
              <FormLabel>Description / Notes</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  placeholder="Add more details..."
                  className="min-h-[100px] resize-none"
                  maxLength={2000}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Platforms multi-select */}
        <FormField
          control={form.control}
          name="platforms"
          render={() => (
            <FormItem>
              <FormLabel>Platform(s)</FormLabel>
              <div className="flex flex-wrap gap-3">
                {PLATFORMS.map((platform) => (
                  <label
                    key={platform}
                    className="flex cursor-pointer items-center gap-2 text-sm capitalize"
                  >
                    <Checkbox
                      checked={platforms.includes(platform)}
                      onCheckedChange={() => togglePlatform(platform)}
                    />
                    {platform}
                  </label>
                ))}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Effort */}
        <FormField
          control={form.control}
          name="effort"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Estimated Effort</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select effort" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="S">Small (S)</SelectItem>
                  <SelectItem value="M">Medium (M)</SelectItem>
                  <SelectItem value="L">Large (L)</SelectItem>
                  <SelectItem value="XL">Extra Large (XL)</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Tags */}
        <FormField
          control={form.control}
          name="tags"
          render={() => (
            <FormItem>
              <FormLabel>Tags</FormLabel>
              <div className="flex gap-2">
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  placeholder="tag1, tag2 (comma-separated)"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addTag();
                    }
                  }}
                />
                <Button type="button" variant="outline" size="sm" onClick={addTag}>
                  Add
                </Button>
              </div>
              {tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="flex items-center gap-1"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="ml-1 rounded-full hover:text-destructive"
                        aria-label={`Remove ${tag}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Priority */}
        <FormField
          control={form.control}
          name="priority"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Priority</FormLabel>
              <div className="flex gap-4">
                {(['low', 'medium', 'high'] as const).map((p) => (
                  <label
                    key={p}
                    className={cn(
                      'flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm capitalize transition-colors',
                      field.value === p
                        ? 'border-primary bg-primary/5 font-medium text-primary'
                        : 'border-input hover:bg-accent',
                    )}
                  >
                    <input
                      type="radio"
                      value={p}
                      checked={field.value === p}
                      onChange={() => field.onChange(p)}
                      className="sr-only"
                    />
                    {p}
                  </label>
                ))}
              </div>
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
