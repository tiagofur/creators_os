'use client';

import { useIdeas } from '@/hooks/use-ideas';
import { useContentItems } from '@/hooks/use-content';
import { useTeamMembers } from '@/hooks/use-team';
import { useConsistencyScore } from '@/hooks/use-analytics';

export function useDashboardStats(workspaceId: string) {
  const ideas = useIdeas(workspaceId, { limit: 1 });
  const allContent = useContentItems(workspaceId, { limit: 1 });
  const publishedContent = useContentItems(workspaceId, {
    pipeline_stage: 'publishing' as const,
    limit: 1,
  });
  const teamMembers = useTeamMembers(workspaceId);
  const consistency = useConsistencyScore(workspaceId);

  const isLoading =
    ideas.isLoading ||
    allContent.isLoading ||
    publishedContent.isLoading ||
    teamMembers.isLoading;

  const totalIdeas = ideas.data?.meta?.total ?? 0;
  const totalContent = allContent.data?.meta?.total ?? 0;
  const publishedCount = publishedContent.data?.meta?.total ?? 0;
  const inPipeline = totalContent - publishedCount;
  const memberCount = teamMembers.data?.length ?? 0;
  const streak = consistency.data?.streak ?? 0;

  return {
    isLoading,
    totalIdeas,
    inPipeline: inPipeline >= 0 ? inPipeline : 0,
    publishedCount,
    memberCount,
    streak,
    consistencyLoading: consistency.isLoading,
  };
}
