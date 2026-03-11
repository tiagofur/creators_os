'use client';

import { useWorkspaceStore } from '@ordo/stores';
import { usePlatformCredentials, type Platform, type PlatformCredential } from '@/hooks/use-platform-credentials';
import { PlatformConnectCard } from '@/components/publishing/platform-connect-card';
import { Skeleton } from '@ordo/ui';

const DEFAULT_PLATFORMS: Platform[] = [
  'youtube',
  'instagram',
  'tiktok',
  'twitter',
  'linkedin',
];

export default function IntegrationsPage() {
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspace?.id) ?? '';
  const { data: credentials, isLoading } = usePlatformCredentials(activeWorkspaceId);

  // Merge fetched credentials with default platforms (fill missing as disconnected)
  const platformCards: PlatformCredential[] = DEFAULT_PLATFORMS.map((platform) => {
    const found = credentials?.find((c) => c.platform === platform);
    return (
      found ?? {
        id: platform,
        platform,
        display_name: platform,
        connected: false,
        connected_at: null,
      }
    );
  });

  return (
    <main className="p-6 space-y-5 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Integrations</h1>
        <p className="mt-1 text-muted-foreground">
          Connect your social media accounts to publish directly from Ordo.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {platformCards.map((credential) => (
            <PlatformConnectCard key={credential.platform} credential={credential} />
          ))}
        </div>
      )}
    </main>
  );
}
