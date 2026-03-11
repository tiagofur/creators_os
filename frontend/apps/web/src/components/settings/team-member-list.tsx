'use client';

import { useTeamMembers } from '@/hooks/use-team';
import { useWorkspaceStore } from '@ordo/stores';
import { useAuth } from '@ordo/hooks';
import { TeamMemberRow } from './team-member-row';

export function TeamMemberList() {
  const workspace = useWorkspaceStore((s) => s.activeWorkspace);
  const { user } = useAuth();
  const { data: members, isLoading } = useTeamMembers(workspace?.id ?? '');

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-12 animate-pulse rounded bg-muted" />
        ))}
      </div>
    );
  }

  if (!members?.length) {
    return (
      <p className="py-4 text-sm text-muted-foreground">
        No team members yet. Invite someone to get started.
      </p>
    );
  }

  const currentMember = members.find((m) => m.user_id === user?.id);
  const isAdmin = currentMember?.role === 'admin';

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            <th className="pb-3 pr-4 font-medium">Member</th>
            <th className="pb-3 pr-4 font-medium">Role</th>
            <th className="pb-3 pr-4 font-medium">Joined</th>
            <th className="pb-3 font-medium" aria-label="Actions" />
          </tr>
        </thead>
        <tbody>
          {members.map((member) => (
            <TeamMemberRow
              key={member.user_id}
              member={member}
              isCurrentUserAdmin={isAdmin}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
