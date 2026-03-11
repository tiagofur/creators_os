export type SearchResultType = 'idea' | 'content' | 'series' | 'brand' | 'deal'

export interface SearchResult {
  id: string
  type: SearchResultType
  title: string
  subtitle?: string
  url: string
  icon?: string
}
