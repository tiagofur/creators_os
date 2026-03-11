'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import type { WorkspaceMember, WorkspaceInvitation } from '@ordo/types';

const TEAM_KEYS = {
  all: (workspaceId: string) => ['team', workspaceId] as const,
  members: (workspaceId: string) => ['team', workspaceId, 'members'] as const,
  invitations: (workspaceId: string) => ['team', workspaceId, 'invitations'] as const,
};

export function useTeamMembers(workspaceId: string) {
  return useQuery({
    queryKey: TEAM_KEYS.members(workspaceId),
    queryFn: () => apiClient.get<WorkspaceMember[]>(`/v1/workspaces/${workspaceId}/members`),
    enabled: Boolean(workspaceId),
    staleTime: 1000 * 60, // 1 minute
  });
}

export function useInviteMember(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: { email: string; role: string }) =>
      apiClient.post<WorkspaceInvitation>(`/v1/workspaces/${workspaceId}/invitations`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TEAM_KEYS.invitations(workspaceId) });
      toast.success('Invitation sent successfully.');
    },
    onError: () => {
      toast.error('Failed to send invitation. Please try again.');
    },
  });
}

export function useUpdateMemberRole(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) =>
      apiClient.patch<WorkspaceMember>(`/v1/workspaces/${workspaceId}/members/${userId}/role`, { role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TEAM_KEYS.members(workspaceId) });
      toast.success('Member role updated.');
    },
    onError: () => {
      toast.error('Failed to update role. Please try again.');
    },
  });
}

export function useRemoveMember(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) =>
      apiClient.delete<void>(`/v1/workspaces/${workspaceId}/members/${userId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TEAM_KEYS.members(workspaceId) });
      toast.success('Member removed from workspace.');
    },
    onError: () => {
      toast.error('Failed to remove member. Please try again.');
    },
  });
}

export { TEAM_KEYS };
