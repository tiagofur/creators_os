'use client';

import * as React from 'react';
import { cn } from '@ordo/core';
import { WifiOff, Wifi } from 'lucide-react';

export function OfflineBanner() {
  const [online, setOnline] = React.useState(true);
  const [showOnlineFlash, setShowOnlineFlash] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
    setOnline(navigator.onLine);

    function handleOffline() {
      setOnline(false);
      setShowOnlineFlash(false);
    }

    function handleOnline() {
      setOnline(true);
      setShowOnlineFlash(true);
      setTimeout(() => setShowOnlineFlash(false), 3000);
    }

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  if (!mounted) return null;

  if (showOnlineFlash) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="sticky top-0 z-50 flex items-center justify-center gap-2 bg-green-600 px-4 py-2 text-sm text-white"
      >
        <Wifi className="h-4 w-4" />
        You&apos;re back online!
      </div>
    );
  }

  if (!online) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="sticky top-0 z-50 flex items-center justify-center gap-2 bg-amber-500 px-4 py-2 text-sm text-amber-950"
      >
        <WifiOff className="h-4 w-4" />
        You&apos;re offline. Some features may not work.
      </div>
    );
  }

  return null;
}
