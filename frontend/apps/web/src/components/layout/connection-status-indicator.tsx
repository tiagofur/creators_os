'use client';

import { useWsStore } from '@ordo/stores';
import { cn } from '@ordo/core';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@ordo/ui';

const stateConfig = {
  connected: {
    label: 'Connected',
    dotClass: 'bg-emerald-500',
    pulseClass: '',
  },
  reconnecting: {
    label: 'Reconnecting…',
    dotClass: 'bg-amber-500',
    pulseClass: 'animate-pulse',
  },
  disconnected: {
    label: 'Disconnected',
    dotClass: 'bg-red-500',
    pulseClass: '',
  },
} as const;

export function ConnectionStatusIndicator() {
  const connectionState = useWsStore((s) => s.connectionState);
  const { label, dotClass, pulseClass } = stateConfig[connectionState];

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={cn('inline-block h-2 w-2 shrink-0 rounded-full', dotClass, pulseClass)}
            role="status"
            aria-label={label}
          />
        </TooltipTrigger>
        <TooltipContent side="top">
          <p className="text-xs">{label}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
