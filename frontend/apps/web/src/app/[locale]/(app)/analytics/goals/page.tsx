'use client';

import * as React from 'react';
import { Plus } from 'lucide-react';
import { useWorkspaceStore } from '@ordo/stores';
import { useAnalyticsGoals, useCreateGoal, useUpdateGoal, useDeleteGoal } from '@/hooks/use-analytics';
import { GoalCard } from '@/components/analytics/goal-card';
import { GoalForm } from '@/components/analytics/goal-form';
import { Button } from '@ordo/ui';
import { EmptyState } from '@/components/empty-state';
import type { AnalyticsGoal } from '@ordo/types';

export default function GoalsPage() {
  const [showForm, setShowForm] = React.useState(false);
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspace?.id) ?? '';

  const { data: goals, isLoading } = useAnalyticsGoals(activeWorkspaceId);
  const createGoal = useCreateGoal();
  const updateGoal = useUpdateGoal();
  const deleteGoal = useDeleteGoal();

  const handleCreate = (
    body: Omit<AnalyticsGoal, 'id' | 'workspaceId' | 'currentValue' | 'status' | 'createdAt'>,
  ) => {
    createGoal.mutate(
      { workspaceId: activeWorkspaceId, body },
      { onSuccess: () => setShowForm(false) },
    );
  };

  const handleMarkComplete = (id: string) => {
    updateGoal.mutate({
      workspaceId: activeWorkspaceId,
      goalId: id,
      body: { status: 'completed' },
    });
  };

  const handleDelete = (id: string) => {
    deleteGoal.mutate({ workspaceId: activeWorkspaceId, goalId: id });
  };

  return (
    <main className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b px-6 py-4">
        <div>
          <h1 className="text-2xl font-bold">Goals</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Set and track your creator goals.
          </p>
        </div>
        <Button onClick={() => setShowForm(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Add goal
        </Button>
      </div>

      <div className="flex-1 overflow-auto px-6 py-6 space-y-4">
        {showForm && (
          <div className="rounded-lg border bg-background p-5">
            <h2 className="mb-4 text-base font-semibold">New goal</h2>
            <GoalForm
              onSubmit={handleCreate}
              onCancel={() => setShowForm(false)}
              isSubmitting={createGoal.isPending}
            />
          </div>
        )}

        {isLoading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-40 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        ) : goals?.length === 0 ? (
          <EmptyState
            title="No goals yet"
            description="Set a goal to track your progress as a creator."
            action={{ label: 'Add your first goal', onClick: () => setShowForm(true) }}
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {goals?.map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                onMarkComplete={handleMarkComplete}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
