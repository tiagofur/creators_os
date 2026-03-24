'use client';

import * as React from 'react';
import { cn } from '@ordo/core';
import type { BestTimesResponse, PostingTimeSlot } from '@ordo/types';

const ENGAGEMENT_COLORS = [
  'bg-muted',                                   // 0 — no data
  'bg-emerald-200 dark:bg-emerald-900',          // 1 — low
  'bg-emerald-400 dark:bg-emerald-700',          // 2 — medium
  'bg-emerald-600 dark:bg-emerald-500',          // 3 — good
  'bg-emerald-800 dark:bg-emerald-300',          // 4 — best
];

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const HOUR_LABELS = [
  '12a', '1a', '2a', '3a', '4a', '5a', '6a', '7a', '8a', '9a', '10a', '11a',
  '12p', '1p', '2p', '3p', '4p', '5p', '6p', '7p', '8p', '9p', '10p', '11p',
];

const PLATFORMS = [
  { value: '', label: 'All Platforms' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'twitter', label: 'Twitter' },
  { value: 'linkedin', label: 'LinkedIn' },
];

interface BestTimesHeatmapProps {
  data: BestTimesResponse | undefined;
  isLoading: boolean;
  platform: string;
  onPlatformChange: (platform: string) => void;
}

function getIntensity(value: number, max: number): number {
  if (value <= 0 || max <= 0) return 0;
  const ratio = value / max;
  if (ratio > 0.75) return 4;
  if (ratio > 0.5) return 3;
  if (ratio > 0.25) return 2;
  return 1;
}

export function BestTimesHeatmap({ data, isLoading, platform, onPlatformChange }: BestTimesHeatmapProps) {
  const [tooltip, setTooltip] = React.useState<{
    slot: PostingTimeSlot;
    x: number;
    y: number;
  } | null>(null);

  // Build a lookup map: `${dayOfWeek}-${hour}` -> slot
  const slotMap = React.useMemo(() => {
    const m = new Map<string, PostingTimeSlot>();
    if (data?.slots) {
      for (const slot of data.slots) {
        m.set(`${slot.day_of_week}-${slot.hour}`, slot);
      }
    }
    return m;
  }, [data]);

  const maxEngagement = React.useMemo(() => {
    if (!data?.slots?.length) return 0;
    return Math.max(...data.slots.map((s) => s.avg_engagement));
  }, [data]);

  if (isLoading) {
    return (
      <div className="rounded-lg border bg-card p-6">
        <div className="h-5 w-48 animate-pulse rounded bg-muted mb-4" />
        <div className="h-[280px] w-full animate-pulse rounded bg-muted" />
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Best Times to Post</h3>
        <select
          value={platform}
          onChange={(e) => onPlatformChange(e.target.value)}
          className="rounded-md border bg-background px-3 py-1.5 text-sm"
        >
          {PLATFORMS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
      </div>

      {data?.message ? (
        <div className="flex items-center justify-center h-[280px] text-muted-foreground text-sm">
          {data.message}
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <div className="inline-block">
              {/* Hour labels across top */}
              <div className="flex">
                <div className="w-10 shrink-0" />
                {HOUR_LABELS.map((label, i) => (
                  <div
                    key={i}
                    className={cn(
                      'w-[28px] text-center text-[9px] text-muted-foreground',
                      i % 3 !== 0 && 'opacity-0',
                    )}
                  >
                    {label}
                  </div>
                ))}
              </div>

              {/* Grid rows (one per day) */}
              {DAY_LABELS.map((dayLabel, dayIndex) => (
                <div key={dayIndex} className="flex items-center">
                  <div className="w-10 shrink-0 text-[10px] text-muted-foreground pr-1 text-right">
                    {dayLabel}
                  </div>
                  {Array.from({ length: 24 }, (_, hour) => {
                    const slot = slotMap.get(`${dayIndex}-${hour}`);
                    const intensity = slot
                      ? getIntensity(slot.avg_engagement, maxEngagement)
                      : 0;

                    return (
                      <div
                        key={hour}
                        className={cn(
                          'h-[24px] w-[24px] m-[2px] rounded-sm cursor-default transition-colors',
                          ENGAGEMENT_COLORS[intensity],
                        )}
                        onMouseEnter={(e) => {
                          if (slot) {
                            setTooltip({ slot, x: e.clientX, y: e.clientY });
                          }
                        }}
                        onMouseLeave={() => setTooltip(null)}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Less engagement</span>
            {ENGAGEMENT_COLORS.map((cls, i) => (
              <div key={i} className={cn('h-[10px] w-[10px] rounded-sm', cls)} />
            ))}
            <span>More engagement</span>
          </div>
        </>
      )}

      {/* Tooltip */}
      {tooltip && (
        <div
          className="pointer-events-none fixed z-50 rounded-lg border bg-background px-3 py-2 shadow-lg text-sm"
          style={{ left: tooltip.x + 12, top: tooltip.y - 48 }}
        >
          <div className="font-medium">
            {DAY_LABELS[tooltip.slot.day_of_week]} at {HOUR_LABELS[tooltip.slot.hour]}
          </div>
          <div className="text-muted-foreground">
            Avg engagement: {tooltip.slot.avg_engagement.toFixed(1)}
          </div>
          <div className="text-muted-foreground">
            {tooltip.slot.post_count} {tooltip.slot.post_count === 1 ? 'post' : 'posts'} &middot;{' '}
            <span
              className={cn(
                tooltip.slot.confidence === 'high' && 'text-emerald-600 dark:text-emerald-400',
                tooltip.slot.confidence === 'medium' && 'text-amber-600 dark:text-amber-400',
                tooltip.slot.confidence === 'low' && 'text-red-500 dark:text-red-400',
              )}
            >
              {tooltip.slot.confidence} confidence
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
