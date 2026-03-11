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
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@ordo/ui';
import { format, parseISO, startOfMonth, subMonths, isSameMonth } from 'date-fns';
import type { IncomeEntry } from '@ordo/types';

interface IncomeChartProps {
  income: IncomeEntry[];
}

interface MonthData {
  label: string;
  amount: number;
}

export function IncomeChart({ income }: IncomeChartProps) {
  const chartData = React.useMemo<MonthData[]>(() => {
    const now = new Date();
    return Array.from({ length: 12 }, (_, i) => {
      const month = subMonths(startOfMonth(now), 11 - i);
      const total = income
        .filter((e) => isSameMonth(parseISO(e.receivedAt), month))
        .reduce((sum, e) => sum + e.amount, 0);
      return {
        label: format(month, 'MMM yy'),
        amount: total,
      };
    });
  }, [income]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Monthly Income (last 12 months)</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis
              tick={{ fontSize: 11 }}
              tickFormatter={(v: number) =>
                v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`
              }
            />
            <Tooltip
              formatter={(value: number) => [
                `$${value.toLocaleString()}`,
                'Income',
              ]}
            />
            <Bar dataKey="amount" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
