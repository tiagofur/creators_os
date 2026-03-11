'use client';

import { Sidebar } from './sidebar';
import { Topbar } from './topbar';
import { SkipToContent } from '@/components/skip-to-content';
import { OfflineBanner } from '@/components/offline-banner';
import { UpgradeBanner } from '@/components/upgrade-banner';

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <>
      <SkipToContent />
      <div className="flex h-screen overflow-hidden">
        {/* Desktop sidebar — hidden on mobile */}
        <div className="hidden md:block">
          <Sidebar />
        </div>
        <div className="flex flex-1 flex-col overflow-hidden">
          <Topbar />
          <OfflineBanner />
          <UpgradeBanner />
          <main id="main-content" className="flex-1 overflow-y-auto">{children}</main>
        </div>
      </div>
    </>
  );
}
