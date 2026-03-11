'use client';

import * as React from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@ordo/ui';
import { useIsMobile } from '@/hooks/use-media-query';

interface ResponsiveSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * Sheet that slides from the right on desktop and from the bottom on mobile.
 */
export function ResponsiveSheet({
  open,
  onClose,
  title,
  children,
  className,
}: ResponsiveSheetProps) {
  const isMobile = useIsMobile();

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        side={isMobile ? 'bottom' : 'right'}
        className={className ?? 'w-full sm:max-w-lg overflow-y-auto'}
      >
        {title && (
          <SheetHeader>
            <SheetTitle>{title}</SheetTitle>
          </SheetHeader>
        )}
        {children}
      </SheetContent>
    </Sheet>
  );
}
