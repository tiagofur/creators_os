'use client';

import * as React from 'react';
import { X, Trash2 } from 'lucide-react';
import { Button } from '@ordo/ui';
import { Badge } from '@ordo/ui';
import { cn } from '@ordo/core';
import { useUpdateDeal, useDeleteDeal, useAddIncome } from '@/hooks/use-sponsorships';
import { useWorkspaceStore } from '@ordo/stores';
import type { SponsorshipDeal, DealStage, IncomeEntry } from '@ordo/types';

const DEAL_STAGES: DealStage[] = [
  'Prospect', 'Outreach', 'Negotiation', 'Contracted', 'Delivered', 'Paid', 'Rejected',
];

interface DealDetailSheetProps {
  deal: SponsorshipDeal;
  open: boolean;
  onClose: () => void;
}

export function DealDetailSheet({ deal, open, onClose }: DealDetailSheetProps) {
  const [showIncomeForm, setShowIncomeForm] = React.useState(false);
  const [incomeAmount, setIncomeAmount] = React.useState('');
  const [incomeNotes, setIncomeNotes] = React.useState('');
  const [notes, setNotes] = React.useState(deal.notes ?? '');

  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspace?.id) ?? '';
  const updateDeal = useUpdateDeal();
  const deleteDeal = useDeleteDeal();
  const addIncome = useAddIncome();

  const handleStageChange = (stage: DealStage) => {
    updateDeal.mutate({ workspaceId: activeWorkspaceId, dealId: deal.id, body: { stage } });
  };

  const handleNotesBlur = () => {
    if (notes !== deal.notes) {
      updateDeal.mutate({ workspaceId: activeWorkspaceId, dealId: deal.id, body: { notes } });
    }
  };

  const handleDelete = () => {
    if (window.confirm(`Delete "${deal.title}"? This cannot be undone.`)) {
      deleteDeal.mutate({ workspaceId: activeWorkspaceId, dealId: deal.id });
      onClose();
    }
  };

  const handleLogIncome = () => {
    const amount = parseFloat(incomeAmount);
    if (isNaN(amount) || amount <= 0) return;
    addIncome.mutate({
      workspaceId: activeWorkspaceId,
      body: {
        dealId: deal.id,
        amount,
        currency: deal.currency,
        receivedAt: new Date().toISOString(),
        notes: incomeNotes || undefined,
      } satisfies Omit<IncomeEntry, 'id'>,
    }, {
      onSuccess: () => {
        setIncomeAmount('');
        setIncomeNotes('');
        setShowIncomeForm(false);
      },
    });
  };

  return (
    <div
      className={cn(
        'fixed inset-y-0 right-0 z-50 w-full max-w-md border-l bg-background shadow-2xl transition-transform duration-300',
        open ? 'translate-x-0' : 'translate-x-full',
      )}
    >
      <div className="flex h-14 items-center justify-between border-b px-4">
        <h2 className="font-semibold truncate">{deal.title}</h2>
        <Button size="icon" variant="ghost" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="h-[calc(100%-3.5rem)] overflow-y-auto p-4 space-y-5">
        {/* Brand */}
        {deal.brandContact && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Brand</p>
            <p className="text-sm font-medium">{deal.brandContact.companyName}</p>
            <p className="text-xs text-muted-foreground">{deal.brandContact.contactName} · {deal.brandContact.email}</p>
          </div>
        )}

        {/* Stage selector */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Stage</p>
          <div className="flex flex-wrap gap-1.5">
            {DEAL_STAGES.map((s) => (
              <button
                key={s}
                onClick={() => handleStageChange(s)}
                className={cn(
                  'rounded-full px-3 py-1 text-xs font-medium border transition-colors',
                  deal.stage === s
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-muted text-muted-foreground hover:border-primary/50',
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Value */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Deal value</p>
          <p className="text-2xl font-bold">
            {new Intl.NumberFormat('en-US', { style: 'currency', currency: deal.currency, maximumFractionDigits: 0 }).format(deal.value)}
          </p>
        </div>

        {/* Platform / content type */}
        <div className="flex gap-2">
          <Badge variant="secondary">{deal.platform}</Badge>
          <Badge variant="outline">{deal.contentType}</Badge>
        </div>

        {/* Log income */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase">Income</p>
            <Button size="sm" variant="outline" onClick={() => setShowIncomeForm(!showIncomeForm)}>
              {showIncomeForm ? 'Cancel' : 'Log income'}
            </Button>
          </div>
          {showIncomeForm && (
            <div className="space-y-2 rounded-lg border p-3">
              <input
                type="number"
                placeholder="Amount"
                value={incomeAmount}
                onChange={(e) => setIncomeAmount(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <input
                type="text"
                placeholder="Notes (optional)"
                value={incomeNotes}
                onChange={(e) => setIncomeNotes(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <Button
                size="sm"
                onClick={handleLogIncome}
                disabled={addIncome.isPending}
                className="w-full"
              >
                {addIncome.isPending ? 'Logging…' : 'Log payment'}
              </Button>
            </div>
          )}
        </div>

        {/* Notes */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Notes</p>
          <textarea
            rows={4}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={handleNotesBlur}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            placeholder="Add notes…"
          />
        </div>

        {/* Delete */}
        <div className="pt-4 border-t">
          <Button
            variant="ghost"
            className="text-destructive hover:text-destructive w-full gap-2"
            onClick={handleDelete}
          >
            <Trash2 className="h-4 w-4" />
            Delete deal
          </Button>
        </div>
      </div>
    </div>
  );
}
