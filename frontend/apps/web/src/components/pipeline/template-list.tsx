'use client';

import * as React from 'react';
import { Plus, Pencil, Trash2, FileText } from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Badge,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@ordo/ui';
import type { ContentTemplate } from '@ordo/types';
import { TemplateForm, type TemplateFormValues } from './template-form';

interface TemplateListProps {
  templates: ContentTemplate[];
  onCreateTemplate: (values: TemplateFormValues) => Promise<void>;
  onUpdateTemplate: (id: string, values: TemplateFormValues) => Promise<void>;
  onDeleteTemplate: (id: string) => Promise<void>;
  onSelectTemplate?: (template: ContentTemplate) => void;
  isLoading?: boolean;
}

export function TemplateList({
  templates,
  onCreateTemplate,
  onUpdateTemplate,
  onDeleteTemplate,
  onSelectTemplate,
  isLoading,
}: TemplateListProps) {
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editingTemplate, setEditingTemplate] = React.useState<ContentTemplate | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  const handleCreate = async (values: TemplateFormValues) => {
    setSubmitting(true);
    try {
      await onCreateTemplate(values);
      setCreateOpen(false);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (values: TemplateFormValues) => {
    if (!editingTemplate) return;
    setSubmitting(true);
    try {
      await onUpdateTemplate(editingTemplate.id, values);
      setEditingTemplate(null);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Content Templates</h3>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" />
              New Template
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create Template</DialogTitle>
            </DialogHeader>
            <TemplateForm
              onSubmit={handleCreate}
              onCancel={() => setCreateOpen(false)}
              isSubmitting={submitting}
            />
          </DialogContent>
        </Dialog>
      </div>

      {isLoading && (
        <div className="text-muted-foreground text-sm py-8 text-center">Loading templates...</div>
      )}

      {!isLoading && templates.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No templates yet. Create your first template to speed up content creation.</p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {templates.map((template) => (
          <Card
            key={template.id}
            className="cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => onSelectTemplate?.(template)}
          >
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <CardTitle className="text-base">{template.name}</CardTitle>
                <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                  <Dialog
                    open={editingTemplate?.id === template.id}
                    onOpenChange={(open) => {
                      if (!open) setEditingTemplate(null);
                    }}
                  >
                    <DialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => setEditingTemplate(template)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-lg">
                      <DialogHeader>
                        <DialogTitle>Edit Template</DialogTitle>
                      </DialogHeader>
                      <TemplateForm
                        template={template}
                        onSubmit={handleUpdate}
                        onCancel={() => setEditingTemplate(null)}
                        isSubmitting={submitting}
                        submitLabel="Save changes"
                      />
                    </DialogContent>
                  </Dialog>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete template?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete the "{template.name}" template. This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => onDeleteTemplate(template.id)}>
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
              {template.description && (
                <CardDescription className="line-clamp-2">{template.description}</CardDescription>
              )}
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex gap-2 flex-wrap">
                <Badge variant="secondary">{template.content_type}</Badge>
                {template.platform_target && (
                  <Badge variant="outline">{template.platform_target}</Badge>
                )}
                {template.prompt_template && (
                  <Badge variant="outline" className="text-xs">AI-enabled</Badge>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
