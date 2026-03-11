'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { PLATFORM_CREDENTIALS_CACHE } from '@/lib/query-config';

export type Platform = 'youtube' | 'instagram' | 'tiktok' | 'twitter' | 'linkedin';

export interface PlatformCredential {
  id: string;
  platform: Platform;
  display_name: string;
  connected: boolean;
  connected_at: string | null;
}

const credentialKeys = {
  all: () => ['platform-credentials'] as const,
  list: (workspaceId: string) => ['platform-credentials', 'list', workspaceId] as const,
};

export function usePlatformCredentials(workspaceId: string) {
  return useQuery({
    queryKey: credentialKeys.list(workspaceId),
    queryFn: () =>
      apiClient.get<PlatformCredential[]>(
        `/v1/workspaces/${workspaceId}/platform-credentials`,
      ),
    enabled: Boolean(workspaceId),
    ...PLATFORM_CREDENTIALS_CACHE,
  });
}

export function useDisconnectPlatform() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      workspaceId,
      platform,
    }: {
      workspaceId: string;
      platform: Platform;
    }) =>
      apiClient.delete<void>(
        `/v1/workspaces/${workspaceId}/platform-credentials/${platform}`,
      ),
    onSuccess: (_data, { workspaceId }) => {
      queryClient.invalidateQueries({
        queryKey: credentialKeys.list(workspaceId),
      });
    },
  });
}
