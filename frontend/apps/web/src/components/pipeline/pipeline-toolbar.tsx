'use client';

import { Search, Plus, Kanban, List, FileText } from 'lucide-react';
import {
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  useToast,
} from '@ordo/ui';
import * as React from 'react';
import { ContentForm, type ContentFormValues } from './content-form';
import { TemplatePicker } from './template-picker';
import { useCreateContent } from '@/hooks/use-content';
import { useWorkspaceStore } from '@ordo/stores';
import type { ContentTemplate } from '@ordo/types';

export type PipelineViewMode = 'board' | 'list';

interface PipelineToolbarProps {
  search: string;
  onSearchChange: (v: string) => void;
  platformFilter: string;
  onPlatformChange: (v: string) => void;
  viewMode: PipelineViewMode;
  onViewModeChange: (v: PipelineViewMode) => void;
  templates?: ContentTemplate[];
  onInstantiateTemplate?: (templateId: string, topic: string, useAI: boolean) => Promise<void>;
}

export function PipelineToolbar({
  search,
  onSearchChange,
  platformFilter,
  onPlatformChange,
  viewMode,
  onViewModeChange,
  templates = [],
  onInstantiateTemplate,
}: PipelineToolbarProps) {
  const [addOpen, setAddOpen] = React.useState(false);
  const [templatePickerOpen, setTemplatePickerOpen] = React.useState(false);
  const { mutateAsync: createContent, isPending } = useCreateContent();
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspace?.id) ?? '';
  const { toast } = useToast();

  const handleSubmit = async (values: ContentFormValues) => {
    try {
      await createContent({
        title: values.title,
        workspace_id: activeWorkspaceId,
        pipeline_stage: values.pipeline_stage,
        platform: values.platform,
        body: values.description,
        tags: values.tags,
        scheduled_at: values.due_date,
      });
      toast({ title: 'Content created!' });
      setAddOpen(false);
    } catch {
      toast({ title: 'Failed to create content', variant: 'destructive' });
    }
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search content..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>

        {/* Platform filter */}
        <Select value={platformFilter} onValueChange={onPlatformChange}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Platform" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All platforms</SelectItem>
            <SelectItem value="youtube">YouTube</SelectItem>
            <SelectItem value="instagram">Instagram</SelectItem>
            <SelectItem value="tiktok">TikTok</SelectItem>
            <SelectItem value="twitter">Twitter</SelectItem>
            <SelectItem value="linkedin">LinkedIn</SelectItem>
            <SelectItem value="podcast">Podcast</SelectItem>
            <SelectItem value="blog">Blog</SelectItem>
          </SelectContent>
        </Select>

        {/* View toggle */}
        <div className="flex rounded-md border">
          <Button
            variant={viewMode === 'board' ? 'default' : 'ghost'}
            size="icon"
            className="h-9 w-9 rounded-r-none"
            onClick={() => onViewModeChange('board')}
            aria-label="Board view"
          >
            <Kanban className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'ghost'}
            size="icon"
            className="h-9 w-9 rounded-l-none border-l"
            onClick={() => onViewModeChange('list')}
            aria-label="List view"
          >
            <List className="h-4 w-4" />
          </Button>
        </div>

        {/* Start from template */}
        {templates.length > 0 && onInstantiateTemplate && (
          <Button
            size="sm"
            variant="outline"
            leftIcon={<FileText className="h-4 w-4" />}
            onClick={() => setTemplatePickerOpen(true)}
          >
            From template
          </Button>
        )}

        {/* Add content */}
        <Button
          size="sm"
          leftIcon={<Plus className="h-4 w-4" />}
          onClick={() => setAddOpen(true)}
        >
          Add content
        </Button>
      </div>

      {/* Create dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add content to pipeline</DialogTitle>
          </DialogHeader>
          <ContentForm
            onSubmit={handleSubmit}
            onCancel={() => setAddOpen(false)}
            isSubmitting={isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Template picker dialog */}
      {onInstantiateTemplate && (
        <TemplatePicker
          open={templatePickerOpen}
          onOpenChange={setTemplatePickerOpen}
          templates={templates}
          onSelectTemplate={async (templateId, topic, useAI) => {
            await onInstantiateTemplate(templateId, topic, useAI);
            toast({ title: 'Content created from template!' });
          }}
        />
      )}
    </>
  );
}
