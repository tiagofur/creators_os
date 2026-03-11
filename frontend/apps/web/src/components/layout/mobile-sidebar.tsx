'use client';

import * as React from 'react';
import { Button } from '@ordo/ui';
import { Sheet, SheetContent, SheetTrigger } from '@ordo/ui';
import { Menu } from 'lucide-react';
import { Sidebar } from './sidebar';

export function MobileSidebar() {
  const [open, setOpen] = React.useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-64 p-0">
        <Sidebar />
      </SheetContent>
    </Sheet>
  );
}
