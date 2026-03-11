'use client';

import * as React from 'react';
import { Download } from 'lucide-react';
import { Card, CardContent } from '@ordo/ui';
import { Button } from '@ordo/ui';
import { Badge } from '@ordo/ui';
import { format, parseISO, isSameMonth, startOfMonth } from 'date-fns';
import type { IncomeEntry, SponsorshipDeal } from '@ordo/types';

function exportIncomeCsv(income: IncomeEntry[], deals: SponsorshipDeal[]) {
  const dealMap = new Map(deals.map((d) => [d.id, d]));
  const headers = ['Date', 'Brand', 'Deal title', 'Amount', 'Currency'];
  const rows = income.map((e) => {
    const deal = dealMap.get(e.dealId);
    return [
      format(parseISO(e.receivedAt), 'yyyy-MM-dd'),
      deal?.brandContact?.companyName ?? '',
      deal?.title ?? '',
      String(e.amount),
      e.currency,
    ].join(',');
  });
  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'income.csv';
  a.click();
  URL.revokeObjectURL(url);
}

interface IncomeTrackerProps {
  income: IncomeEntry[];
  deals: SponsorshipDeal[];
}

export function IncomeTracker({ income, deals }: IncomeTrackerProps) {
  const now = new Date();
  const dealMap = new Map(deals.map((d) => [d.id, d]));

  const totalAllTime = income.reduce((s, e) => s + e.amount, 0);
  const totalThisMonth = income
    .filter((e) => isSameMonth(parseISO(e.receivedAt), now))
    .reduce((s, e) => s + e.amount, 0);
  const pendingDeals = deals.filter((d) => d.stage === 'Contracted');
  const pendingAmount = pendingDeals.reduce((s, d) => s + d.value, 0);
  const avgDealValue =
    deals.length > 0
      ? Math.round(deals.reduce((s, d) => s + d.value, 0) / deals.length)
      : 0;

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Total earned', value: `$${totalAllTime.toLocaleString()}` },
          { label: 'This month', value: `$${totalThisMonth.toLocaleString()}` },
          { label: 'Pending', value: `$${pendingAmount.toLocaleString()}` },
          { label: 'Avg deal value', value: `$${avgDealValue.toLocaleString()}` },
        ].map(({ label, value }) => (
          <Card key={label}>
            <CardContent className="pt-5 pb-5">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="mt-1 text-2xl font-bold">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Income table */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold">Income log</h2>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={() => exportIncomeCsv(income, deals)}
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </Button>
        </div>

        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">Date</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">Brand</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">Deal</th>
                <th className="px-4 py-2 text-right text-xs font-semibold text-muted-foreground">Amount</th>
              </tr>
            </thead>
            <tbody>
              {income.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-muted-foreground">
                    No income logged yet.
                  </td>
                </tr>
              ) : (
                income
                  .slice()
                  .sort((a, b) => b.receivedAt.localeCompare(a.receivedAt))
                  .map((entry) => {
                    const deal = dealMap.get(entry.dealId);
                    return (
                      <tr key={entry.id} className="border-t hover:bg-muted/20">
                        <td className="px-4 py-2.5 text-muted-foreground">
                          {format(parseISO(entry.receivedAt), 'MMM d, yyyy')}
                        </td>
                        <td className="px-4 py-2.5">
                          {deal?.brandContact?.companyName ?? '—'}
                        </td>
                        <td className="px-4 py-2.5 text-muted-foreground">{deal?.title ?? '—'}</td>
                        <td className="px-4 py-2.5 text-right font-semibold">
                          {new Intl.NumberFormat('en-US', {
                            style: 'currency',
                            currency: entry.currency,
                            maximumFractionDigits: 0,
                          }).format(entry.amount)}
                        </td>
                      </tr>
                    );
                  })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
