'use client';

import * as React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@ordo/ui';
import type { PipelineVelocity } from '@ordo/types';

const STAGE_COLORS: Record<string, string> = {
  Idea: '#6366f1',
  Draft: '#8b5cf6',
  'In Progress': '#a855f7',
  Review: '#d946ef',
  Scheduled: '#ec4899',
  Published: '#10b981',
};

function getStageColor(stage: string): string {
  return STAGE_COLORS[stage] ?? '#6366f1';
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: PipelineVelocity }>;
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload;
  return (
    <div className="rounded-lg border bg-background px-3 py-2 shadow-md text-sm">
      <p className="font-semibold">{item.stage}</p>
      <p className="text-muted-foreground">
        Avg {item.avgDaysInStage} days · {item.itemCount} items
      </p>
    </div>
  );
}

interface PipelineVelocityChartProps {
  data: PipelineVelocity[];
}

export function PipelineVelocityChart({ data }: PipelineVelocityChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Pipeline Velocity</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            layout="vertical"
            data={data}
            margin={{ top: 0, right: 24, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis
              type="number"
              dataKey="avgDaysInStage"
              label={{ value: 'Avg days', position: 'insideBottomRight', offset: -4 }}
              tick={{ fontSize: 12 }}
            />
            <YAxis
              type="category"
              dataKey="stage"
              width={90}
              tick={{ fontSize: 12 }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="avgDaysInStage" radius={[0, 4, 4, 0]}>
              {data.map((entry) => (
                <Cell key={entry.stage} fill={getStageColor(entry.stage)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
