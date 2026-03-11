'use client';

import * as React from 'react';
import { Plus } from 'lucide-react';
import { useWorkspaceStore } from '@ordo/stores';
import { useSponsorshipDeals, useBrandContacts, useCreateDeal } from '@/hooks/use-sponsorships';
import { DealPipeline } from './_components/deal-pipeline';
import { DealDetailSheet } from './_components/deal-detail-sheet';
import { DealForm } from './_components/deal-form';
import { Button } from '@ordo/ui';
import type { SponsorshipDeal } from '@ordo/types';

export default function SponsorshipsPage() {
  const [selectedDeal, setSelectedDeal] = React.useState<SponsorshipDeal | null>(null);
  const [showCreateForm, setShowCreateForm] = React.useState(false);
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspace?.id) ?? '';

  const { data: deals, isLoading } = useSponsorshipDeals(activeWorkspaceId);
  const { data: brands } = useBrandContacts(activeWorkspaceId);
  const createDeal = useCreateDeal();

  return (
    <main className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b px-6 py-4">
        <div>
          <h1 className="text-2xl font-bold">Sponsorships</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your brand partnerships and sponsorship pipeline.
          </p>
        </div>
        <Button onClick={() => setShowCreateForm(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          New deal
        </Button>
      </div>

      {/* Create form */}
      {showCreateForm && (
        <div className="border-b bg-muted/30 px-6 py-4">
          <h2 className="mb-4 text-base font-semibold">Create deal</h2>
          <DealForm
            brands={brands ?? []}
            onSubmit={(values) => {
              createDeal.mutate(
                {
                  workspaceId: activeWorkspaceId,
                  body: {
                    ...values,
                    brandContactId: values.brandContactId,
                  },
                },
                { onSuccess: () => setShowCreateForm(false) },
              );
            }}
            onCancel={() => setShowCreateForm(false)}
            isSubmitting={createDeal.isPending}
          />
        </div>
      )}

      <div className="flex-1 overflow-auto px-6 py-4">
        {isLoading ? (
          <div className="flex gap-3">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="h-64 w-[260px] shrink-0 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        ) : (
          <DealPipeline
            deals={deals ?? []}
            onClickDeal={setSelectedDeal}
            onAddDeal={() => setShowCreateForm(true)}
          />
        )}
      </div>

      {selectedDeal && (
        <DealDetailSheet
          deal={selectedDeal}
          open={Boolean(selectedDeal)}
          onClose={() => setSelectedDeal(null)}
        />
      )}
    </main>
  );
}
