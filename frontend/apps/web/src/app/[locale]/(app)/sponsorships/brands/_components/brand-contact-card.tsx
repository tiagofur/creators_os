import * as React from 'react';
import { ExternalLink } from 'lucide-react';
import { Card, CardContent } from '@ordo/ui';
import { Badge } from '@ordo/ui';
import type { BrandContact } from '@ordo/types';

interface BrandContactCardProps {
  brand: BrandContact;
  dealCount?: number;
  totalEarned?: number;
  onClick?: () => void;
}

function getInitials(name: string): string {
  return name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();
}

export function BrandContactCard({ brand, dealCount = 0, totalEarned = 0, onClick }: BrandContactCardProps) {
  return (
    <Card className="cursor-pointer transition-shadow hover:shadow-md" onClick={onClick}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 font-bold text-primary">
            {getInitials(brand.companyName)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold truncate">{brand.companyName}</p>
            <p className="text-xs text-muted-foreground truncate">{brand.contactName}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <Badge variant="outline">{brand.niche}</Badge>
          {brand.website && (
            <a
              href={brand.website}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-muted-foreground hover:text-foreground"
            >
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>

        <div className="flex justify-between text-xs text-muted-foreground border-t pt-2">
          <span>{dealCount} deal{dealCount !== 1 ? 's' : ''}</span>
          <span className="font-semibold text-foreground">
            ${totalEarned.toLocaleString()} earned
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
