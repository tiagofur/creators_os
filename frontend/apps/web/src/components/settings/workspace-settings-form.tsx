'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label } from '@ordo/ui';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@ordo/ui';
import { useWorkspaceStore } from '@ordo/stores';
import { apiClient } from '@/lib/api-client';

interface WorkspaceFormValues {
  name: string;
  slug: string;
  timezone: string;
  contentGoalPerMonth: number;
}

export function WorkspaceSettingsForm() {
  const workspace = useWorkspaceStore((s) => s.activeWorkspace);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [confirmName, setConfirmName] = React.useState('');
  const [deleting, setDeleting] = React.useState(false);

  const { register, handleSubmit, formState: { isSubmitting } } = useForm<WorkspaceFormValues>({
    defaultValues: {
      name: workspace?.name ?? '',
      slug: (workspace as Record<string, unknown>)?.slug as string ?? '',
      timezone: (workspace as Record<string, unknown>)?.timezone as string ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
      contentGoalPerMonth: (workspace as Record<string, unknown>)?.contentGoalPerMonth as number ?? 4,
    },
  });

  async function onSubmit(data: WorkspaceFormValues) {
    if (!workspace?.id) return;
    try {
      await apiClient.patch(`/v1/workspaces/${workspace.id}`, data);
      toast.success('Workspace settings saved.');
    } catch {
      toast.error('Failed to save workspace settings.');
    }
  }

  async function handleDelete() {
    if (!workspace || confirmName !== workspace.name) {
      toast.error('Workspace name does not match.');
      return;
    }
    setDeleting(true);
    try {
      await apiClient.delete(`/v1/workspaces/${workspace.id}`);
      window.location.href = '/';
    } catch {
      toast.error('Failed to delete workspace.');
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Workspace settings</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="ws-name">Workspace name</Label>
              <Input
                id="ws-name"
                placeholder="My Workspace"
                {...register('name', { required: true })}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ws-slug">Workspace slug</Label>
              <Input
                id="ws-slug"
                placeholder="my-workspace"
                {...register('slug', {
                  required: true,
                  pattern: { value: /^[a-z0-9-]+$/, message: 'Only lowercase letters, numbers, and hyphens' },
                })}
              />
              <p className="text-xs text-muted-foreground">
                Used in URLs. Only lowercase letters, numbers, and hyphens.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ws-tz">Timezone</Label>
              <Input
                id="ws-tz"
                placeholder="America/New_York"
                {...register('timezone')}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ws-goal">Content publishing goal (pieces / month)</Label>
              <Input
                id="ws-goal"
                type="number"
                min={1}
                max={30}
                {...register('contentGoalPerMonth', { min: 1, max: 30, valueAsNumber: true })}
              />
            </div>

            <div className="flex justify-end">
              <Button type="submit" loading={isSubmitting}>
                Save changes
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-destructive">Danger zone</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Deleting a workspace is permanent and removes all associated content, ideas, and settings.
          </p>
          <Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)}>
            Delete workspace
          </Button>
        </CardContent>
      </Card>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete workspace</DialogTitle>
            <DialogDescription>
              This will permanently delete <strong>{workspace?.name}</strong> and all its content.
              Type the workspace name to confirm.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="confirm-ws-name">Workspace name</Label>
            <Input
              id="confirm-ws-name"
              placeholder={workspace?.name}
              value={confirmName}
              onChange={(e) => setConfirmName(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button
              variant="destructive"
              loading={deleting}
              onClick={handleDelete}
              disabled={confirmName !== workspace?.name}
            >
              Delete workspace
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
