import * as React from 'react';
import { Card, CardContent, CardHeader } from '@ordo/ui';

function SkeletonBlock({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-muted ${className ?? ''}`} />;
}

function PlatformCardSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <SkeletonBlock className="h-3 w-3 rounded-full" />
          <SkeletonBlock className="h-4 w-24" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex items-end justify-between">
          <div className="space-y-1">
            <SkeletonBlock className="h-8 w-20" />
            <SkeletonBlock className="h-3 w-10" />
          </div>
          <SkeletonBlock className="h-6 w-28 rounded-full" />
        </div>
        <div className="grid grid-cols-3 gap-2 border-t pt-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-1 text-center">
              <SkeletonBlock className="mx-auto h-4 w-12" />
              <SkeletonBlock className="mx-auto h-3 w-10" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function AnalyticsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <PlatformCardSkeleton key={i} />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardContent className="pt-6">
            <SkeletonBlock className="h-[300px] w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <SkeletonBlock className="h-[300px] w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
