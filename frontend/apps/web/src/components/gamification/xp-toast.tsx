'use client';

import * as React from 'react';
import { cn } from '@ordo/core';
import { Zap } from 'lucide-react';

interface XpToastProps {
  amount: number;
  reason: string;
  onDone?: () => void;
}

export function XpToast({ amount, reason, onDone }: XpToastProps) {
  const [visible, setVisible] = React.useState(true);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onDone?.(), 300);
    }, 3000);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <div
      className={cn(
        'fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl border bg-background px-4 py-3 shadow-lg text-sm font-medium transition-all duration-300',
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none',
      )}
    >
      <Zap className="h-4 w-4 text-yellow-500" />
      <span>
        <span className="text-yellow-500">+{amount} XP</span>
        {reason && <span className="ml-1.5 text-muted-foreground">· {reason}</span>}
      </span>
    </div>
  );
}
