'use client';

import { Search } from 'lucide-react';
import { Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ordo/ui';
import type { IdeaStatus } from '@ordo/types';
import type { IdeaFilters } from '@/hooks/use-ideas';

interface IdeasFiltersProps {
  filters: IdeaFilters;
  onChange: (filters: IdeaFilters) => void;
}

export function IdeasFilters({ filters, onChange }: IdeasFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Search */}
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search ideas..."
          value={filters.search ?? ''}
          onChange={(e) =>
            onChange({ ...filters, search: e.target.value || undefined })
          }
        />
      </div>

      {/* Status filter */}
      <Select
        value={filters.status ?? 'all'}
        onValueChange={(v) =>
          onChange({
            ...filters,
            status: v === 'all' ? undefined : (v as IdeaStatus),
          })
        }
      >
        <SelectTrigger className="w-36">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          <SelectItem value="inbox">Inbox</SelectItem>
          <SelectItem value="validated">Validated</SelectItem>
          <SelectItem value="in_progress">In Progress</SelectItem>
          <SelectItem value="done">Done</SelectItem>
          <SelectItem value="archived">Archived</SelectItem>
        </SelectContent>
      </Select>

      {/* Platform filter */}
      <Select
        value={filters.stage ?? 'all'}
        onValueChange={(v) =>
          onChange({ ...filters, stage: v === 'all' ? undefined : v })
        }
      >
        <SelectTrigger className="w-36">
          <SelectValue placeholder="Platform" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All platforms</SelectItem>
          <SelectItem value="youtube">YouTube</SelectItem>
          <SelectItem value="instagram">Instagram</SelectItem>
          <SelectItem value="tiktok">TikTok</SelectItem>
          <SelectItem value="twitter">Twitter</SelectItem>
          <SelectItem value="linkedin">LinkedIn</SelectItem>
          <SelectItem value="podcast">Podcast</SelectItem>
          <SelectItem value="blog">Blog</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
