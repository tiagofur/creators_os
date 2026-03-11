'use client';

import * as React from 'react';
import { Play, Square } from 'lucide-react';
import { Button } from '@ordo/ui';
import { cn } from '@ordo/core';

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  if (h > 0) {
    return `${h}h ${m.toString().padStart(2, '0')}m`;
  }
  return `${m}m ${s.toString().padStart(2, '0')}s`;
}

interface TimeTrackerProps {
  totalSeconds?: number;
}

export function TimeTracker({ totalSeconds: initialTotal = 0 }: TimeTrackerProps) {
  const [isRunning, setIsRunning] = React.useState(false);
  const [elapsed, setElapsed] = React.useState(0);
  const intervalRef = React.useRef<NodeJS.Timeout | null>(null);

  React.useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setElapsed((prev) => prev + 1);
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning]);

  const handleToggle = () => {
    setIsRunning((prev) => !prev);
  };

  const total = initialTotal + elapsed;

  return (
    <div>
      <p className="mb-2 text-xs font-medium uppercase text-muted-foreground">
        Time Tracker
      </p>
      <div className="flex items-center gap-3">
        <Button
          type="button"
          size="sm"
          variant={isRunning ? 'destructive' : 'outline'}
          leftIcon={
            isRunning ? (
              <Square className="h-3 w-3" />
            ) : (
              <Play className="h-3 w-3" />
            )
          }
          onClick={handleToggle}
        >
          {isRunning ? 'Stop' : 'Start'}
        </Button>

        <span
          className={cn(
            'font-mono text-sm tabular-nums',
            isRunning && 'text-primary font-semibold',
          )}
        >
          {formatDuration(total)}
        </span>
        {isRunning && (
          <span className="flex h-2 w-2 items-center justify-center">
            <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
          </span>
        )}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Total logged: {formatDuration(initialTotal)}
      </p>
    </div>
  );
}
