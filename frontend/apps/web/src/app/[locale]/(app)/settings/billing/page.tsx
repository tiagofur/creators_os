import { CurrentPlanCard } from './_components/current-plan-card';
import { UsageMeters } from './_components/usage-meters';
import { PlanSelector } from './_components/plan-selector';
import { InvoicesTable } from './_components/invoices-table';

export default function BillingPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Billing</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your subscription, usage, and payment details.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <CurrentPlanCard />
        <UsageMeters />
      </div>

      <PlanSelector />
      <InvoicesTable />
    </div>
  );
}
