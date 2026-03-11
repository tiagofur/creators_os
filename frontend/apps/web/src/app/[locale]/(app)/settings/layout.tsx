import { SettingsNav } from '@/components/settings/settings-nav';

interface SettingsLayoutProps {
  children: React.ReactNode;
}

export default function SettingsLayout({ children }: SettingsLayoutProps) {
  return (
    <div className="flex min-h-full">
      {/* Left sidebar — desktop only */}
      <aside className="hidden w-56 shrink-0 border-r md:block">
        <div className="sticky top-0 p-4">
          <h1 className="mb-4 text-lg font-semibold">Settings</h1>
          <SettingsNav />
        </div>
      </aside>

      {/* Mobile tabs — md and below */}
      <div className="w-full md:hidden">
        <div className="border-b px-4 pt-4">
          <h1 className="mb-3 text-lg font-semibold">Settings</h1>
          <div className="overflow-x-auto">
            <SettingsNav />
          </div>
        </div>
        <main id="main-content" className="p-4">
          {children}
        </main>
      </div>

      {/* Main content — desktop */}
      <main id="main-content" className="hidden flex-1 p-6 md:block">
        {children}
      </main>
    </div>
  );
}
