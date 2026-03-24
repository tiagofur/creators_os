export type SearchResultType = 'idea' | 'content' | 'series' | 'sponsorship';

export interface SearchResult {
  id: string;
  type: SearchResultType;
  title: string;
  description?: string | null;
  rank: number;

  // Legacy fields kept for backward compatibility
  /** @deprecated Use description instead */
  subtitle?: string;
  /** @deprecated Not returned by backend */
  url?: string;
  /** @deprecated Not returned by backend */
  icon?: string;
}

export interface SearchResponse {
  results: SearchResult[];
  total_count: number;
  query: string;
}
