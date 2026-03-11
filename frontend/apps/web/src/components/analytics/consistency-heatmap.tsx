'use client';

import * as React from 'react';
import { cn } from '@ordo/core';
import { format, parseISO, startOfYear, eachDayOfInterval, endOfYear, getDay } from 'date-fns';
import type { HeatmapDay } from '@ordo/types';

const INTENSITY_COLORS = [
  'bg-muted', // 0 — no activity
  'bg-violet-200 dark:bg-violet-900', // 1 — light
  'bg-violet-400 dark:bg-violet-700', // 2 — medium
  'bg-violet-600 dark:bg-violet-500', // 3 — brand purple
  'bg-violet-800 dark:bg-violet-300', // 4 — bright
];

const MONTH_LABELS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface ConsistencyHeatmapProps {
  data: HeatmapDay[];
  year: number;
  onYearChange?: (year: number) => void;
}

export function ConsistencyHeatmap({ data, year, onYearChange }: ConsistencyHeatmapProps) {
  const dataMap = React.useMemo(() => {
    const m = new Map<string, HeatmapDay>();
    data.forEach((d) => m.set(d.date, d));
    return m;
  }, [data]);

  // Build weeks grid (Sunday-first)
  const yearStart = startOfYear(new Date(year, 0, 1));
  const yearEnd = endOfYear(new Date(year, 0, 1));
  const allDays = eachDayOfInterval({ start: yearStart, end: yearEnd });

  // Pad start so first column aligns to Sunday
  const firstDayOfWeek = getDay(yearStart);
  const paddedDays: (Date | null)[] = [
    ...Array.from({ length: firstDayOfWeek }, () => null),
    ...allDays,
  ];

  const weeks: (Date | null)[][] = [];
  for (let i = 0; i < paddedDays.length; i += 7) {
    weeks.push(paddedDays.slice(i, i + 7));
  }

  // Month column positions
  const monthPositions: Record<number, number> = {};
  weeks.forEach((week, wi) => {
    const firstReal = week.find((d) => d !== null);
    if (firstReal) {
      const month = firstReal.getMonth();
      if (!(month in monthPositions)) {
        monthPositions[month] = wi;
      }
    }
  });

  const [tooltip, setTooltip] = React.useState<{ day: HeatmapDay; x: number; y: number } | null>(null);
  const currentYear = new Date().getFullYear();

  return (
    <div className="space-y-3">
      {/* Year selector */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => onYearChange?.(year - 1)}
          disabled={year <= currentYear - 5}
          className="rounded px-2 py-1 text-sm hover:bg-muted disabled:opacity-40"
        >
          ‹
        </button>
        <span className="text-sm font-semibold">{year}</span>
        <button
          onClick={() => onYearChange?.(year + 1)}
          disabled={year >= currentYear}
          className="rounded px-2 py-1 text-sm hover:bg-muted disabled:opacity-40"
        >
          ›
        </button>
      </div>

      <div className="overflow-x-auto">
        <div className="relative inline-flex gap-1">
          {/* Day labels on left */}
          <div className="flex flex-col gap-[2px] pt-5">
            {DAY_LABELS.map((d, i) => (
              <div
                key={d}
                className={cn(
                  'flex h-[10px] items-center text-[9px] text-muted-foreground',
                  i % 2 === 0 ? 'opacity-0' : '',
                )}
              >
                {d}
              </div>
            ))}
          </div>

          {/* Grid */}
          <div className="flex flex-col">
            {/* Month labels */}
            <div className="relative mb-1 flex h-4">
              {Object.entries(monthPositions).map(([month, col]) => (
                <div
                  key={month}
                  className="absolute text-[10px] text-muted-foreground"
                  style={{ left: col * 12 }}
                >
                  {MONTH_LABELS[Number(month)]}
                </div>
              ))}
            </div>

            {/* Weeks — transposed: each week is a column of 7 rows */}
            <div className="flex gap-[2px]">
              {weeks.map((week, wi) => (
                <div key={wi} className="flex flex-col gap-[2px]">
                  {week.map((day, di) => {
                    if (!day) {
                      return <div key={di} className="h-[10px] w-[10px]" />;
                    }
                    const dateStr = format(day, 'yyyy-MM-dd');
                    const hd = dataMap.get(dateStr);
                    const score = hd?.score ?? 0;

                    return (
                      <div
                        key={di}
                        className={cn(
                          'h-[10px] w-[10px] rounded-sm cursor-default',
                          INTENSITY_COLORS[Math.min(score, 4)],
                        )}
                        onMouseEnter={(e) => {
                          if (hd) {
                            setTooltip({
                              day: hd,
                              x: e.clientX,
                              y: e.clientY,
                            });
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
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>Less</span>
        {INTENSITY_COLORS.map((cls, i) => (
          <div key={i} className={cn('h-[10px] w-[10px] rounded-sm', cls)} />
        ))}
        <span>More</span>
      </div>

      {/* Tooltip portal-like overlay */}
      {tooltip && (
        <div
          className="pointer-events-none fixed z-50 rounded-lg border bg-background px-3 py-2 shadow-lg text-sm"
          style={{ left: tooltip.x + 12, top: tooltip.y - 36 }}
        >
          <span className="font-medium">
            {format(parseISO(tooltip.day.date), 'MMM d, yyyy')}
          </span>
          <span className="ml-2 text-muted-foreground">
            {tooltip.day.count} {tooltip.day.count === 1 ? 'piece' : 'pieces'} published
          </span>
        </div>
      )}
    </div>
  );
}
