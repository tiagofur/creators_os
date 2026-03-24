'use client';

import { formatDistanceToNow } from 'date-fns';
import { Badge, Card, CardContent, CardHeader, CardTitle, Skeleton } from '@ordo/ui';
import { useContentItems } from '@/hooks/use-content';
import { useWorkspaceStore } from '@ordo/stores';
import type { ContentItem } from '@ordo/types';

const statusColors: Record<string, string> = {
  idea: 'secondary',
  scripting: 'secondary',
  recording: 'default',
  editing: 'default',
  review: 'warning',
  scheduled: 'default',
  published: 'success',
  archived: 'secondary',
};

export function RecentActivity() {
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspace?.id) ?? '';
  const { data, isLoading } = useContentItems(activeWorkspaceId, { limit: 5 });

  const items = data?.data?.slice(0, 5) ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="space-y-3 p-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">
            No content yet. Create your first content item in the pipeline.
          </p>
        ) : (
          <ul className="divide-y">
            {items.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between px-6 py-3 text-sm"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{item.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(item.updated_at), {
                      addSuffix: true,
                    })}
                  </p>
                </div>
                <Badge variant={statusColors[item.status] as 'default' | 'secondary'} className="ml-3 shrink-0">
                  {item.status}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
