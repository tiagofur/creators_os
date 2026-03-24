'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { Trash2, ArrowRight } from 'lucide-react';
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
  useToast,
} from '@ordo/ui';
import { useDeleteIdea, useChangeIdeaStatus } from '@/hooks/use-ideas';
import { useCreateContent } from '@/hooks/use-content';
import { useWorkspaceStore } from '@ordo/stores';
import type { Idea, IdeaStatus } from '@ordo/types';

interface IdeaDetailSheetProps {
  idea: Idea;
  open: boolean;
  onClose: () => void;
}

export function IdeaDetailSheet({ idea, open, onClose }: IdeaDetailSheetProps) {
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspace?.id) ?? '';
  const { mutateAsync: deleteIdea, isPending: isDeleting } = useDeleteIdea(activeWorkspaceId);
  const { mutate: changeStatus } = useChangeIdeaStatus(activeWorkspaceId);
  const { mutateAsync: createContent } = useCreateContent();
  const { toast } = useToast();

  const handleStatusChange = (status: string) => {
    changeStatus({ id: idea.id, status: status as IdeaStatus });
  };

  const handleMoveToPipeline = async () => {
    try {
      await createContent({
        title: idea.title,
        workspace_id: activeWorkspaceId,
        idea_id: idea.id,
      });
      toast({ title: 'Moved to pipeline!' });
      onClose();
    } catch {
      toast({ title: 'Failed to move to pipeline', variant: 'destructive' });
    }
  };

  const handleDelete = async () => {
    try {
      await deleteIdea(idea.id);
      setDeleteOpen(false);
      onClose();
      toast({ title: 'Idea deleted' });
    } catch {
      toast({ title: 'Failed to delete idea', variant: 'destructive' });
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-left">{idea.title}</SheetTitle>
          </SheetHeader>

          <div className="mt-6 space-y-5">
            {/* Status */}
            <div>
              <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">
                Status
              </p>
              <Select value={idea.status} onValueChange={handleStatusChange}>
                <SelectTrigger className="w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="inbox">Inbox</SelectItem>
                  <SelectItem value="validated">Validated</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="done">Done</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Description */}
            {idea.description && (
              <div>
                <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">
                  Description
                </p>
                <p className="text-sm">{idea.description}</p>
              </div>
            )}

            {/* Tags / Platforms */}
            {idea.tags.length > 0 && (
              <div>
                <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">
                  Tags
                </p>
                <div className="flex flex-wrap gap-2">
                  {idea.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="capitalize">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Timestamps */}
            <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
              <div>
                <p className="mb-0.5 text-xs font-medium uppercase">Created</p>
                <p>{format(new Date(idea.created_at), 'MMM d, yyyy')}</p>
              </div>
              <div>
                <p className="mb-0.5 text-xs font-medium uppercase">Updated</p>
                <p>{format(new Date(idea.updated_at), 'MMM d, yyyy')}</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2 pt-2 border-t">
              <Button
                variant="outline"
                leftIcon={<ArrowRight className="h-4 w-4" />}
                onClick={handleMoveToPipeline}
              >
                Move to Pipeline
              </Button>
              <Button
                variant="destructive"
                leftIcon={<Trash2 className="h-4 w-4" />}
                onClick={() => setDeleteOpen(true)}
              >
                Delete
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete idea?</DialogTitle>
            <DialogDescription>
              This will permanently delete "{idea.title}". This action cannot be undone.
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
