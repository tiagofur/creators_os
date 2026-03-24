'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import { AI_CREDITS_CACHE } from '@/lib/query-config';
import type { AiCredits } from '@ordo/types';

export function useAiCredits() {
  return useQuery<AiCredits>({
    queryKey: queryKeys.ai.credits(),
    queryFn: () => apiClient.get<AiCredits>('/api/v1/ai/credits'),
    ...AI_CREDITS_CACHE,
  });
}
