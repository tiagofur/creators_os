'use client';

import * as React from 'react';
import { Button } from '@ordo/ui';
import { X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@ordo/ui';
import { useListInvitations, useDeleteInvitation } from '@/hooks/use-team';
import { useWorkspaceStore } from '@ordo/stores';
import type { WorkspaceInvitation } from '@ordo/types';

function InvitationRow({ invitation }: { invitation: WorkspaceInvitation }) {
  const workspace = useWorkspaceStore((s) => s.activeWorkspace);
  const deleteInvitation = useDeleteInvitation(workspace?.id ?? '');
  const [cancelOpen, setCancelOpen] = React.useState(false);

  return (
    <>
      <tr className="border-b last:border-0">
        <td className="py-3 pr-4 text-sm">{invitation.email}</td>
        <td className="py-3 pr-4">
          <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium capitalize text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
            {invitation.role}
          </span>
        </td>
        <td className="py-3 pr-4 text-sm text-muted-foreground">
          {new Date(invitation.created_at).toLocaleDateString()}
        </td>
        <td className="py-3">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Cancel invitation"
            onClick={() => setCancelOpen(true)}
          >
            <X className="h-4 w-4 text-destructive" />
          </Button>
        </td>
      </tr>

      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel invitation</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel the invitation to {invitation.email}?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelOpen(false)}>Keep</Button>
            <Button
              variant="destructive"
              loading={deleteInvitation.isPending}
              onClick={() =>
                deleteInvitation.mutate(invitation.id, {
                  onSuccess: () => setCancelOpen(false),
                })
              }
            >
              Cancel invitation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function PendingInvitationsList() {
  const workspace = useWorkspaceStore((s) => s.activeWorkspace);
  const { data: invitations, isLoading } = useListInvitations(workspace?.id ?? '');

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="h-10 animate-pulse rounded bg-muted" />
        ))}
      </div>
    );
  }

  if (!invitations?.length) {
    return (
      <p className="py-4 text-sm text-muted-foreground">
        No pending invitations.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            <th className="pb-3 pr-4 font-medium">Email</th>
            <th className="pb-3 pr-4 font-medium">Role</th>
            <th className="pb-3 pr-4 font-medium">Sent</th>
            <th className="pb-3 font-medium" aria-label="Actions" />
          </tr>
        </thead>
        <tbody>
          {invitations.map((invitation) => (
            <InvitationRow key={invitation.id} invitation={invitation} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
