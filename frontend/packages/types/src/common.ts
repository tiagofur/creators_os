export type UUID = string;
export type Timestamp = string; // ISO 8601

export interface PaginationMeta {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
}

export type SortOrder = 'asc' | 'desc';
