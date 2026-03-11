'use client';

import * as React from 'react';
import { Button } from '@ordo/ui';
import { Search } from 'lucide-react';
import { CommandPalette } from './command-palette';

export function CommandPaletteTrigger() {
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="hidden gap-2 text-muted-foreground sm:flex"
        onClick={() => setOpen(true)}
        aria-label="Open command palette"
      >
        <Search className="h-3.5 w-3.5" />
        <span>Search</span>
        <kbd className="rounded border bg-muted px-1 py-0.5 text-xs">⌘K</kbd>
      </Button>

      {/* Mobile: icon only */}
      <Button
        variant="ghost"
        size="icon"
        className="sm:hidden"
        onClick={() => setOpen(true)}
        aria-label="Open command palette"
      >
        <Search className="h-4 w-4" />
      </Button>

      <CommandPalette open={open} onOpenChange={setOpen} />
    </>
  );
}
