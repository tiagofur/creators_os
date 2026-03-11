'use client';

import * as React from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  startOfWeek,
  endOfWeek,
  isToday,
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@ordo/core';
import { Button, Badge } from '@ordo/ui';
import type { ContentItem } from '@ordo/types';

const PLATFORM_COLORS: Record<string, string> = {
  youtube: 'bg-red-500',
  instagram: 'bg-purple-500',
  tiktok: 'bg-sky-500',
  twitter: 'bg-blue-500',
  linkedin: 'bg-indigo-500',
  podcast: 'bg-amber-500',
  blog: 'bg-green-500',
};

interface PublishingCalendarProps {
  scheduledItems: ContentItem[];
  onClickItem?: (item: ContentItem) => void;
}

export function PublishingCalendar({
  scheduledItems,
  onClickItem,
}: PublishingCalendarProps) {
  const [currentMonth, setCurrentMonth] = React.useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const getItemsForDay = (day: Date) =>
    scheduledItems.filter(
      (item) =>
        item.scheduled_at && isSameDay(new Date(item.scheduled_at), day),
    );

  return (
    <div>
      {/* Month navigation */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-semibold text-lg">
          {format(currentMonth, 'MMMM yyyy')}
        </h2>
        <div className="flex gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() =>
              setCurrentMonth(
                (prev) => new Date(prev.getFullYear(), prev.getMonth() - 1),
              )
            }
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentMonth(new Date())}
          >
            Today
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() =>
              setCurrentMonth(
                (prev) => new Date(prev.getFullYear(), prev.getMonth() + 1),
              )
            }
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 border-b mb-1">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div
            key={day}
            className="py-2 text-center text-xs font-medium text-muted-foreground"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7">
        {days.map((day) => {
          const dayItems = getItemsForDay(day);
          const isCurrentMonth = day.getMonth() === currentMonth.getMonth();

          return (
            <div
              key={day.toISOString()}
              className={cn(
                'min-h-[80px] border-b border-r p-1.5',
                !isCurrentMonth && 'bg-muted/20',
              )}
            >
              <p
                className={cn(
                  'mb-1 flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium',
                  isToday(day) && 'bg-primary text-primary-foreground',
                  !isCurrentMonth && 'text-muted-foreground',
                )}
              >
                {format(day, 'd')}
              </p>

              <div className="space-y-0.5">
                {dayItems.slice(0, 2).map((item) => (
                  <button
                    key={item.id}
                    className="w-full rounded px-1 py-0.5 text-left text-xs truncate hover:bg-accent"
                    onClick={() => onClickItem?.(item)}
                    title={item.title}
                  >
                    <span
                      className={cn(
                        'mr-1 inline-block h-1.5 w-1.5 rounded-full',
                        PLATFORM_COLORS[item.platform] ?? 'bg-muted-foreground',
                      )}
                    />
                    {item.title}
                  </button>
                ))}
                {dayItems.length > 2 && (
                  <p className="text-xs text-muted-foreground px-1">
                    +{dayItems.length - 2} more
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
