import * as React from 'react';
import { Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@ordo/ui';
import { Button } from '@ordo/ui';
import { format, parseISO } from 'date-fns';
import type { WeeklyReport, MonthlyReport } from '@ordo/types';

function StatRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b last:border-0 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}

interface WeeklyReportCardProps {
  report: WeeklyReport;
  onExport: () => void;
}

export function WeeklyReportCard({ report, onExport }: WeeklyReportCardProps) {
  const start = format(parseISO(report.weekStart), 'MMM d');
  const end = format(parseISO(report.weekEnd), 'MMM d, yyyy');

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Week of {start} – {end}</CardTitle>
          <Button size="sm" variant="outline" onClick={onExport} className="gap-1.5">
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <StatRow label="Published" value={report.published} />
        <StatRow label="Ideas captured" value={report.ideasCaptured} />
        <StatRow label="AI credits used" value={report.aiCreditsUsed} />
        <StatRow label="Top platform" value={report.topPlatform} />
        <StatRow label="Consistency score" value={report.consistencyScore} />
      </CardContent>
    </Card>
  );
}

interface MonthlyReportCardProps {
  report: MonthlyReport;
  onExport: () => void;
}

export function MonthlyReportCard({ report, onExport }: MonthlyReportCardProps) {
  const start = format(parseISO(report.monthStart), 'MMMM yyyy');

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{start}</CardTitle>
          <Button size="sm" variant="outline" onClick={onExport} className="gap-1.5">
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <StatRow label="Published" value={report.published} />
        <StatRow label="Ideas captured" value={report.ideasCaptured} />
        <StatRow label="AI credits used" value={report.aiCreditsUsed} />
        <StatRow label="Top platform" value={report.topPlatform} />
        <StatRow label="Consistency score" value={report.consistencyScore} />
        <StatRow
          label="Total income"
          value={`$${report.totalIncome.toLocaleString()}`}
        />
      </CardContent>
    </Card>
  );
}
