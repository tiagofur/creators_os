'use client';

import * as React from 'react';
import { Plus } from 'lucide-react';
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle } from '@ordo/ui';
import { useWorkspaceStore } from '@ordo/stores';
import { useSeries, useCreateSeries } from '@/hooks/use-series';
import { SeriesList } from './_components/series-list';
import { SeriesForm, type SeriesFormValues } from '@/components/series/series-form';
import { useToast } from '@ordo/ui';

export default function SeriesPage() {
  const [createOpen, setCreateOpen] = React.useState(false);
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspace?.id) ?? '';
  const { data: series, isLoading } = useSeries(activeWorkspaceId);
  const { mutateAsync: createSeries, isPending } = useCreateSeries();
  const { toast } = useToast();

  const handleCreate = async (values: SeriesFormValues) => {
    try {
      await createSeries({
        name: values.name,
        workspace_id: activeWorkspaceId,
        description: values.description,
        cover_url: values.cover_url || undefined,
      });
      toast({ title: 'Series created!' });
      setCreateOpen(false);
    } catch {
      toast({ title: 'Failed to create series', variant: 'destructive' });
    }
  };

  return (
    <main className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Series</h1>
          <p className="mt-1 text-muted-foreground">
            Group related content into organized series.
          </p>
        </div>
        <Button
          leftIcon={<Plus className="h-4 w-4" />}
          onClick={() => setCreateOpen(true)}
        >
          Create series
        </Button>
      </div>

      <SeriesList
        series={series ?? []}
        isLoading={isLoading}
        onCreateSeries={() => setCreateOpen(true)}
      />

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create series</DialogTitle>
          </DialogHeader>
          <SeriesForm
            onSubmit={handleCreate}
            onCancel={() => setCreateOpen(false)}
            isSubmitting={isPending}
          />
        </DialogContent>
      </Dialog>
    </main>
  );
}
