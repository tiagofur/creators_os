import { Skeleton } from '@ordo/ui';

export default function DashboardLoading() {
  return (
    <main className="p-6 space-y-6">
      {/* Page header */}
      <div>
        <Skeleton className="h-8 w-48 rounded-md" />
        <Skeleton className="mt-2 h-4 w-96 rounded-md" />
      </div>

      {/* Quick actions placeholder */}
      <section>
        <Skeleton className="mb-3 h-4 w-28 rounded-md" />
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-32 rounded-md" />
          ))}
        </div>
      </section>

      {/* Stats grid */}
      <section>
        <Skeleton className="mb-3 h-4 w-20 rounded-md" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[156px] w-full rounded-lg" />
          ))}
        </div>
      </section>

      {/* Bottom grid */}
      <section className="grid gap-4 lg:grid-cols-3">
        <Skeleton className="h-64 w-full rounded-lg lg:col-span-2" />
        <Skeleton className="h-24 w-full rounded-lg" />
      </section>
    </main>
  );
}
