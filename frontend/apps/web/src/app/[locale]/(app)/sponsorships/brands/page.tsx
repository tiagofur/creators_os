'use client';

import * as React from 'react';
import { Plus } from 'lucide-react';
import { useWorkspaceStore } from '@ordo/stores';
import {
  useBrandContacts,
  useCreateBrandContact,
  useSponsorshipDeals,
  useIncomeEntries,
} from '@/hooks/use-sponsorships';
import { BrandContactsList } from './_components/brand-contacts-list';
import { BrandContactForm } from './_components/brand-contact-form';
import { Button } from '@ordo/ui';
import type { BrandContact } from '@ordo/types';

export default function BrandsPage() {
  const [showForm, setShowForm] = React.useState(false);
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspace?.id) ?? '';

  const { data: brands, isLoading } = useBrandContacts(activeWorkspaceId);
  const { data: deals } = useSponsorshipDeals(activeWorkspaceId);
  const { data: income } = useIncomeEntries(activeWorkspaceId);
  const createBrand = useCreateBrandContact();

  const handleCreate = (body: Omit<BrandContact, 'id' | 'workspaceId' | 'createdAt'>) => {
    createBrand.mutate(
      { workspaceId: activeWorkspaceId, body },
      { onSuccess: () => setShowForm(false) },
    );
  };

  return (
    <main className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b px-6 py-4">
        <div>
          <h1 className="text-2xl font-bold">Brand Contacts</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your brand relationships.
          </p>
        </div>
        <Button onClick={() => setShowForm(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Add brand
        </Button>
      </div>

      {showForm && (
        <div className="border-b bg-muted/30 px-6 py-4">
          <h2 className="mb-4 text-base font-semibold">New brand contact</h2>
          <BrandContactForm
            onSubmit={handleCreate}
            onCancel={() => setShowForm(false)}
            isSubmitting={createBrand.isPending}
          />
        </div>
      )}

      <div className="flex-1 overflow-auto px-6 py-6">
        {isLoading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-36 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        ) : (
          <BrandContactsList
            brands={brands ?? []}
            deals={deals ?? []}
            income={income ?? []}
            onClickBrand={(brand) => {
              // TODO: open brand detail sheet
              console.log('clicked brand', brand.id);
            }}
          />
        )}
      </div>
    </main>
  );
}
