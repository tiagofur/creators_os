import * as React from 'react';
import { Card, CardContent } from '@ordo/ui';
import { Badge } from '@ordo/ui';
import { format, parseISO } from 'date-fns';
import type { SponsorshipDeal } from '@ordo/types';

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

interface DealCardProps {
  deal: SponsorshipDeal;
  onClick?: () => void;
}

export function DealCard({ deal, onClick }: DealCardProps) {
  const companyName = deal.brandContact?.companyName ?? 'Unknown Brand';
  const initials = getInitials(companyName);

  return (
    <Card
      className="cursor-pointer transition-shadow hover:shadow-md"
      onClick={onClick}
    >
      <CardContent className="p-3 space-y-2">
        {/* Company + avatar */}
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
            {initials}
          </div>
          <p className="truncate text-xs font-semibold text-muted-foreground">
            {companyName}
          </p>
        </div>

        {/* Deal title */}
        <p className="text-sm font-medium leading-snug line-clamp-2">{deal.title}</p>

        {/* Value */}
        <p className="text-base font-bold">
          {formatCurrency(deal.value, deal.currency)}
        </p>

        {/* Platform badge + due date */}
        <div className="flex items-center justify-between gap-2">
          <Badge variant="secondary" className="text-xs">
            {deal.platform}
          </Badge>
          {deal.deliverableDate && (
            <p className="text-[10px] text-muted-foreground">
              Due {format(parseISO(deal.deliverableDate), 'MMM d')}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
