'use client';

import * as React from 'react';
import { cn } from '@ordo/core';
import { Button, Card, CardContent } from '@ordo/ui';
import { Lock, Zap } from 'lucide-react';

interface UpgradePromptProps {
  feature: string;
  action: string;
  benefits?: string[];
  variant?: 'overlay' | 'inline';
  className?: string;
}

const DEFAULT_BENEFITS: Record<string, string[]> = {
  ai: [
    'Unlimited AI-powered content ideas',
    '500 AI credits per month',
    'Script doctor, title lab, and more',
  ],
  workspaces: [
    'Up to 3 workspaces',
    'Organize projects by brand or niche',
    'Switch contexts instantly',
  ],
  teamMembers: [
    'Invite up to 5 team members',
    'Role-based access control',
    'Collaborate in real time',
  ],
};

export function UpgradePrompt({
  feature,
  action,
  benefits,
  variant = 'inline',
  className,
}: UpgradePromptProps) {
  const benefitList = benefits ?? DEFAULT_BENEFITS[feature] ?? [
    'Unlock advanced features',
    'Grow your creator business',
    'Priority support',
  ];

  if (variant === 'overlay') {
    return (
      <div className={cn('relative', className)}>
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-lg bg-background/80 p-8 text-center backdrop-blur-sm">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Lock className="h-6 w-6 text-primary" />
          </div>
          <h3 className="font-semibold">Upgrade to Pro to {action}</h3>
          <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
            {benefitList.map((b) => (
              <li key={b} className="flex items-center gap-2">
                <Zap className="h-3.5 w-3.5 shrink-0 text-primary" />
                {b}
              </li>
            ))}
          </ul>
          <Button
            className="mt-5"
            onClick={() => {
              if (typeof window !== 'undefined') {
                window.location.href = '/settings/billing';
              }
            }}
          >
            Upgrade now
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Card className={cn('border-primary/30', className)}>
      <CardContent className="flex flex-col items-center py-10 text-center">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <Lock className="h-6 w-6 text-primary" />
        </div>
        <h3 className="font-semibold">Upgrade to Pro to {action}</h3>
        <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
          {benefitList.map((b) => (
            <li key={b} className="flex items-center gap-2">
              <Zap className="h-3.5 w-3.5 shrink-0 text-primary" />
              {b}
            </li>
          ))}
        </ul>
        <Button
          className="mt-5"
          onClick={() => {
            if (typeof window !== 'undefined') {
              window.location.href = '/settings/billing';
            }
          }}
        >
          Upgrade now
        </Button>
      </CardContent>
    </Card>
  );
}
