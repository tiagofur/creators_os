'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import type { AiCredits } from '@ordo/types';

export function useAiCredits() {
  return useQuery<AiCredits>({
    queryKey: queryKeys.ai.credits(),
    queryFn: () => apiClient.get<AiCredits>('/v1/ai/credits'),
    staleTime: 60_000, // 1 minute
  });
}
