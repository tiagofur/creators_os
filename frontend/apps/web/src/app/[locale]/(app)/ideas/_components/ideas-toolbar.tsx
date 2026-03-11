'use client';

import { LayoutGrid, LayoutList, SlidersHorizontal, Plus } from 'lucide-react';
import { Button, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ordo/ui';
import { useUiStore } from '@ordo/stores';

export type SortOption = 'newest' | 'oldest' | 'priority' | 'title';

interface IdeasToolbarProps {
  sort: SortOption;
  onSortChange: (sort: SortOption) => void;
  selectedCount: number;
  onBulkArchive?: () => void;
  onBulkDelete?: () => void;
  onCreateIdea?: () => void;
}

export function IdeasToolbar({
  sort,
  onSortChange,
  selectedCount,
  onBulkArchive,
  onBulkDelete,
  onCreateIdea,
}: IdeasToolbarProps) {
  const viewMode = useUiStore((s) => s.ideasViewMode ?? 'grid');
  const setViewMode = useUiStore((s) => s.setIdeasViewMode);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Bulk action bar */}
      {selectedCount > 0 && (
        <div className="flex items-center gap-2 rounded-md border bg-muted px-3 py-1.5 text-sm">
          <span className="font-medium">{selectedCount} selected</span>
          <Button variant="ghost" size="sm" onClick={onBulkArchive}>
            Archive
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={onBulkDelete}
          >
            Delete
          </Button>
        </div>
      )}

      <div className="ml-auto flex items-center gap-2">
        {/* Sort */}
        <Select value={sort} onValueChange={(v) => onSortChange(v as SortOption)}>
          <SelectTrigger className="w-32">
            <SlidersHorizontal className="mr-2 h-4 w-4" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest</SelectItem>
            <SelectItem value="oldest">Oldest</SelectItem>
            <SelectItem value="priority">Priority</SelectItem>
            <SelectItem value="title">Title A–Z</SelectItem>
          </SelectContent>
        </Select>

        {/* View toggle */}
        <div className="flex rounded-md border">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'ghost'}
            size="icon"
            className="h-9 w-9 rounded-r-none"
            onClick={() => setViewMode?.('grid')}
            aria-label="Grid view"
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'ghost'}
            size="icon"
            className="h-9 w-9 rounded-l-none border-l"
            onClick={() => setViewMode?.('list')}
            aria-label="List view"
          >
            <LayoutList className="h-4 w-4" />
          </Button>
        </div>

        {/* Create */}
        <Button
          size="sm"
          leftIcon={<Plus className="h-4 w-4" />}
          onClick={onCreateIdea}
        >
          New idea
        </Button>
      </div>
    </div>
  );
}
