'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Pencil } from 'lucide-react';
import {
  Button,
  Skeleton,
  Badge,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@ordo/ui';
import { useSerie, useUpdateSeries } from '@/hooks/use-series';
import { useContentItems, useCreateContent } from '@/hooks/use-content';
import { useWorkspaceStore } from '@ordo/stores';
import { EpisodesList } from './_components/episodes-list';
import { SeriesForm, type SeriesFormValues } from '@/components/series/series-form';
import { EpisodeForm, type EpisodeFormValues } from '@/components/series/episode-form';
import { useToast } from '@ordo/ui';

export default function SeriesDetailPage() {
  const params = useParams<{ id: string; locale: string }>();
  const router = useRouter();
  const [editOpen, setEditOpen] = React.useState(false);
  const [addEpisodeOpen, setAddEpisodeOpen] = React.useState(false);

  const { data: series, isLoading: seriesLoading } = useSerie(params.id);
  const { mutateAsync: updateSeries, isPending: isUpdating } = useUpdateSeries();
  const { mutateAsync: createContent, isPending: isCreating } = useCreateContent();
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspace?.id) ?? '';
  const { toast } = useToast();

  // Load episodes (content items linked to this series' content IDs)
  const { data: contentData, isLoading: episodesLoading } = useContentItems(
    activeWorkspaceId,
    {},
  );
  const episodes = (contentData?.data ?? []).filter(
    (c) => series?.content_ids.includes(c.id),
  );

  const handleEditSubmit = async (values: SeriesFormValues) => {
    try {
      await updateSeries({
        id: params.id,
        name: values.name,
        description: values.description,
        cover_url: values.cover_url || undefined,
      });
      toast({ title: 'Series updated!' });
      setEditOpen(false);
    } catch {
      toast({ title: 'Failed to update series', variant: 'destructive' });
    }
  };

  const handleAddEpisode = async (values: EpisodeFormValues) => {
    try {
      await createContent({
        title: values.title,
        workspace_id: activeWorkspaceId,
        body: values.description,
      });
      toast({ title: 'Episode added!' });
      setAddEpisodeOpen(false);
    } catch {
      toast({ title: 'Failed to add episode', variant: 'destructive' });
    }
  };

  if (seriesLoading) {
    return (
      <main className="p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
        <Skeleton className="h-64" />
      </main>
    );
  }

  if (!series) {
    return (
      <main className="p-6">
        <p className="text-muted-foreground">Series not found.</p>
      </main>
    );
  }

  return (
    <main className="p-6 space-y-6">
      {/* Back navigation */}
      <Button
        variant="ghost"
        size="sm"
        leftIcon={<ArrowLeft className="h-4 w-4" />}
        onClick={() => router.back()}
      >
        Back to Series
      </Button>

      {/* Series header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex gap-4">
          {/* Cover */}
          {series.cover_url && (
            <img
              src={series.cover_url}
              alt={series.name}
              className="h-20 w-20 rounded-lg object-cover shrink-0"
            />
          )}
          <div>
            <h1 className="text-2xl font-bold">{series.name}</h1>
            {series.description && (
              <p className="mt-1 text-muted-foreground">{series.description}</p>
            )}
            <div className="mt-2 flex gap-2">
              <Badge variant="secondary">
                {series.content_ids.length} episode
                {series.content_ids.length !== 1 ? 's' : ''}
              </Badge>
            </div>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          leftIcon={<Pencil className="h-4 w-4" />}
          onClick={() => setEditOpen(true)}
        >
          Edit series
        </Button>
      </div>

      {/* Episodes */}
      <EpisodesList
        episodes={episodes}
        isLoading={episodesLoading}
        onAddEpisode={() => setAddEpisodeOpen(true)}
      />

      {/* Edit series sheet */}
      <Sheet open={editOpen} onOpenChange={setEditOpen}>
        <SheetContent className="w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Edit series</SheetTitle>
          </SheetHeader>
          <div className="mt-6">
            <SeriesForm
              defaultValues={{
                name: series.name,
                description: series.description ?? '',
                cover_url: series.cover_url ?? '',
              }}
              onSubmit={handleEditSubmit}
              onCancel={() => setEditOpen(false)}
              isSubmitting={isUpdating}
              submitLabel="Save changes"
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* Add episode dialog */}
      <Dialog open={addEpisodeOpen} onOpenChange={setAddEpisodeOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add episode</DialogTitle>
          </DialogHeader>
          <EpisodeForm
            defaultValues={{ episode_number: episodes.length + 1 }}
            onSubmit={handleAddEpisode}
            onCancel={() => setAddEpisodeOpen(false)}
            isSubmitting={isCreating}
          />
        </DialogContent>
      </Dialog>
    </main>
  );
}
