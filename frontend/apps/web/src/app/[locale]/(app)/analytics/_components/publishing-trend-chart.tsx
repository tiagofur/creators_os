'use client';

import * as React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@ordo/ui';
import { format, parseISO } from 'date-fns';
import type { HeatmapDay } from '@ordo/types';

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  let formatted = label ?? '';
  try {
    formatted = format(parseISO(label ?? ''), 'MMM d, yyyy');
  } catch {
    // keep raw label
  }
  return (
    <div className="rounded-lg border bg-background px-3 py-2 shadow-md text-sm">
      <p className="font-semibold">{formatted}</p>
      <p className="text-muted-foreground">{payload[0].value} published</p>
    </div>
  );
}

interface PublishingTrendChartProps {
  data: HeatmapDay[];
}

export function PublishingTrendChart({ data }: PublishingTrendChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Publishing Trend</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data} margin={{ top: 4, right: 24, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="publishGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tickFormatter={(val: string) => {
                try {
                  return format(parseISO(val), 'MMM d');
                } catch {
                  return val;
                }
              }}
              tick={{ fontSize: 11 }}
            />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="count"
              stroke="#8b5cf6"
              strokeWidth={2}
              fill="url(#publishGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
