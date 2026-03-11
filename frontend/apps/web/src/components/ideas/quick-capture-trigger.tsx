'use client';

import * as React from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@ordo/ui';
import { QuickCaptureModal } from './quick-capture-modal';

export function QuickCaptureTrigger() {
  const [open, setOpen] = React.useState(false);

  // Cmd+K / Ctrl+K global shortcut
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <>
      <Button
        size="sm"
        variant="default"
        leftIcon={<Plus className="h-4 w-4" />}
        onClick={() => setOpen(true)}
        aria-label="Capture idea (Cmd+K)"
      >
        Capture
      </Button>
      <QuickCaptureModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
