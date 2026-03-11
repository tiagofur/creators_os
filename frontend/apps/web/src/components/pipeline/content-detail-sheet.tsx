'use client';

import * as React from 'react';
import { format, isPast } from 'date-fns';
import { Trash2 } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  Badge,
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Separator,
  useToast,
} from '@ordo/ui';
import { useUpdateContent, useDeleteContent } from '@/hooks/use-content';
import { StageChecklist } from './stage-checklist';
import { TimeTracker } from './time-tracker';
import type { ContentItem, PipelineStage } from '@ordo/types';

const STAGE_LABELS: Record<PipelineStage, string> = {
  idea: 'Idea',
  scripting: 'Scripting',
  recording: 'Recording',
  editing: 'Editing',
  review: 'Review',
  publishing: 'Publishing',
};

interface ContentDetailSheetProps {
  item: ContentItem;
  open: boolean;
  onClose: () => void;
}

export function ContentDetailSheet({ item, open, onClose }: ContentDetailSheetProps) {
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const { mutate: updateContent } = useUpdateContent();
  const { mutateAsync: deleteContent, isPending: isDeleting } = useDeleteContent();
  const { toast } = useToast();

  const isOverdue =
    item.scheduled_at != null && isPast(new Date(item.scheduled_at));

  const handleDelete = async () => {
    try {
      await deleteContent(item.id);
      setDeleteOpen(false);
      onClose();
      toast({ title: 'Content deleted' });
    } catch {
      toast({ title: 'Failed to delete content', variant: 'destructive' });
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-left">{item.title}</SheetTitle>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            {/* Stage & Status */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">
                  Stage
                </p>
                <Select
                  value={item.pipeline_stage}
                  onValueChange={(v) =>
                    updateContent({ id: item.id, pipeline_stage: v as PipelineStage })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(STAGE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">
                  Platform
                </p>
                {item.platform ? (
                  <Badge variant="secondary" className="capitalize">
                    {item.platform}
                  </Badge>
                ) : (
                  <span className="text-sm text-muted-foreground">—</span>
                )}
              </div>
            </div>

            {/* Due date */}
            {item.scheduled_at && (
              <div>
                <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">
                  Scheduled
                </p>
                <p
                  className={
                    isOverdue ? 'text-sm text-destructive font-medium' : 'text-sm'
                  }
                >
                  {format(new Date(item.scheduled_at), 'PPP')}
                  {isOverdue && ' — Overdue!'}
                </p>
              </div>
            )}

            {/* Description */}
            {item.body && (
              <div>
                <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">
                  Description
                </p>
                <p className="text-sm">{item.body}</p>
              </div>
            )}

            {/* Tags */}
            {item.tags.length > 0 && (
              <div>
                <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">
                  Tags
                </p>
                <div className="flex flex-wrap gap-2">
                  {item.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <Separator />

            {/* Stage checklist */}
            <StageChecklist stage={item.pipeline_stage} />

            <Separator />

            {/* Time tracker */}
            <TimeTracker />

            <Separator />

            {/* Activity log */}
            <div>
              <p className="mb-2 text-xs font-medium uppercase text-muted-foreground">
                Activity
              </p>
              <div className="space-y-2 text-xs text-muted-foreground">
                <p>
                  Created{' '}
                  {format(new Date(item.created_at), 'MMM d, yyyy')}
                </p>
                <p>
                  Last updated{' '}
                  {format(new Date(item.updated_at), 'MMM d, yyyy')}
                </p>
              </div>
            </div>

            <Separator />

            {/* Delete */}
            <Button
              variant="destructive"
              leftIcon={<Trash2 className="h-4 w-4" />}
              onClick={() => setDeleteOpen(true)}
              className="w-full"
            >
              Delete content
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete confirmation */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete content?</DialogTitle>
            <DialogDescription>
              This will permanently delete "{item.title}". This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              loading={isDeleting}
              onClick={handleDelete}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
