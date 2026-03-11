'use client';

import * as React from 'react';
import { cn } from '@ordo/core';
import { Avatar, AvatarFallback, Button, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ordo/ui';
import { getInitials } from '@ordo/core';
import { Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@ordo/ui';
import { useUpdateMemberRole, useRemoveMember } from '@/hooks/use-team';
import { useWorkspaceStore } from '@ordo/stores';
import type { WorkspaceMember } from '@ordo/types';

interface TeamMemberRowProps {
  member: WorkspaceMember;
  isCurrentUserAdmin: boolean;
}

export function TeamMemberRow({ member, isCurrentUserAdmin }: TeamMemberRowProps) {
  const workspace = useWorkspaceStore((s) => s.activeWorkspace);
  const updateRole = useUpdateMemberRole(workspace?.id ?? '');
  const removeMember = useRemoveMember(workspace?.id ?? '');
  const [removeOpen, setRemoveOpen] = React.useState(false);

  const roleBadgeColor: Record<string, string> = {
    admin: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
    editor: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    viewer: 'bg-muted text-muted-foreground',
  };

  return (
    <>
      <tr className="border-b last:border-0">
        <td className="py-3 pr-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarFallback>{getInitials(member.user_id)}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium">{member.user_id}</p>
            </div>
          </div>
        </td>
        <td className="py-3 pr-4">
          {isCurrentUserAdmin ? (
            <Select
              defaultValue={member.role}
              onValueChange={(role) => updateRole.mutate({ userId: member.user_id, role })}
            >
              <SelectTrigger className="h-7 w-28 text-xs" aria-label="Change role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="viewer">Viewer</SelectItem>
                <SelectItem value="editor">Editor</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <span
              className={cn(
                'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize',
                roleBadgeColor[member.role] ?? roleBadgeColor.viewer,
              )}
            >
              {member.role}
            </span>
          )}
        </td>
        <td className="py-3 pr-4 text-sm text-muted-foreground">
          {new Date(member.joined_at).toLocaleDateString()}
        </td>
        <td className="py-3">
          {isCurrentUserAdmin && (
            <Button
              variant="ghost"
              size="icon"
              aria-label="Remove member"
              onClick={() => setRemoveOpen(true)}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          )}
        </td>
      </tr>

      <Dialog open={removeOpen} onOpenChange={setRemoveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove member</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove this member from the workspace?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoveOpen(false)}>Cancel</Button>
            <Button
              variant="destructive"
              loading={removeMember.isPending}
              onClick={() => removeMember.mutate(member.user_id, { onSuccess: () => setRemoveOpen(false) })}
            >
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
