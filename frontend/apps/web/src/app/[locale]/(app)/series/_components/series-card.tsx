'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { BookOpen } from 'lucide-react';
import { cn } from '@ordo/core';
import { Badge, Card, CardContent } from '@ordo/ui';
import type { Series } from '@ordo/types';

interface SeriesCardProps {
  series: Series;
}

export function SeriesCard({ series }: SeriesCardProps) {
  const params = useParams<{ locale: string }>();
  const locale = params.locale ?? 'en';

  return (
    <Link href={`/${locale}/series/${series.id}`}>
      <Card className="overflow-hidden transition-shadow hover:shadow-md cursor-pointer h-full">
        {/* Cover image */}
        <div className="relative h-40 bg-muted flex items-center justify-center">
          {series.cover_url ? (
            <img
              src={series.cover_url}
              alt={series.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <BookOpen className="h-12 w-12 text-muted-foreground opacity-30" />
          )}
        </div>

        <CardContent className="p-4 space-y-2">
          <h3 className="font-semibold leading-snug line-clamp-2">{series.name}</h3>
          {series.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {series.description}
            </p>
          )}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="secondary">
              {series.content_ids.length} episode
              {series.content_ids.length !== 1 ? 's' : ''}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
