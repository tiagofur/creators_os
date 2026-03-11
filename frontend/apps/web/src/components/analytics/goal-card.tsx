import * as React from 'react';
import { Trash2, CheckCircle2 } from 'lucide-react';
import { Card, CardContent } from '@ordo/ui';
import { Badge } from '@ordo/ui';
import { Button } from '@ordo/ui';
import { cn } from '@ordo/core';
import { format, parseISO } from 'date-fns';
import type { AnalyticsGoal } from '@ordo/types';

const STATUS_VARIANT: Record<AnalyticsGoal['status'], 'success' | 'destructive' | 'secondary'> = {
  active: 'secondary',
  completed: 'success',
  failed: 'destructive',
};

const METRIC_LABELS: Record<AnalyticsGoal['metricType'], string> = {
  views: 'Views',
  followers: 'Followers',
  published: 'Published',
  consistency: 'Consistency Score',
};

interface GoalCardProps {
  goal: AnalyticsGoal;
  onMarkComplete?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export function GoalCard({ goal, onMarkComplete, onDelete }: GoalCardProps) {
  const progressPct = Math.min(
    Math.round((goal.currentValue / goal.targetValue) * 100),
    100,
  );

  return (
    <Card>
      <CardContent className="pt-5 pb-5">
        <div className="mb-3 flex items-start justify-between gap-2">
          <div className="flex-1">
            <p className="font-semibold leading-snug">{goal.title}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {METRIC_LABELS[goal.metricType]} · Target: {goal.targetValue}
            </p>
          </div>
          <Badge variant={STATUS_VARIANT[goal.status]} className="shrink-0 capitalize">
            {goal.status}
          </Badge>
        </div>

        {/* Progress bar */}
        <div className="mb-2">
          <div className="mb-1 flex justify-between text-xs text-muted-foreground">
            <span>{goal.currentValue} / {goal.targetValue}</span>
            <span>{progressPct}%</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all',
                progressPct >= 100 ? 'bg-green-500' : 'bg-primary',
              )}
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-3">
          {goal.deadline && (
            <p className="text-xs text-muted-foreground">
              Due {format(parseISO(goal.deadline), 'MMM d, yyyy')}
            </p>
          )}
          <div className="ml-auto flex gap-1">
            {goal.status === 'active' && onMarkComplete && (
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                onClick={() => onMarkComplete(goal.id)}
                title="Mark complete"
              >
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              </Button>
            )}
            {onDelete && (
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                onClick={() => onDelete(goal.id)}
                title="Delete goal"
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
