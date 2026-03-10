# Frontend Architecture

> Component architecture, state management, and development patterns for Ordo Creator OS frontends.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                    APPLICATIONS                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐  │
│  │  Web     │  │  Mobile  │  │  Desktop         │  │
│  │  React   │  │  Expo    │  │  Electron+Vite   │  │
│  │          │  │          │  │                  │  │
│  └────┬─────┘  └────┬─────┘  └────────┬─────────┘  │
│       │              │                  │            │
│  ─────┴──────────────┴──────────────────┴─────────  │
│                                                      │
│                  SHARED PACKAGES                     │
│  ┌──────┐ ┌──────┐ ┌───────┐ ┌────────┐ ┌──────┐  │
│  │  ui  │ │hooks │ │stores │ │api-    │ │styles│  │
│  │      │ │      │ │       │ │client  │ │      │  │
│  └──────┘ └──────┘ └───────┘ └────────┘ └──────┘  │
│  ┌──────────┐ ┌────────────┐ ┌────────────────┐    │
│  │validations│ │auth-provider│ │  i18n          │    │
│  └──────────┘ └────────────┘ └────────────────┘    │
│                                                      │
│  ─────────────────────────────────────────────────  │
│                                                      │
│                  DOMAIN LAYER                        │
│  ┌─────────────────────────────────────────────┐    │
│  │  packages/core (entities, use cases)        │    │
│  └─────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────┘
```

---

## Component Architecture

### Three-Layer Component Model

```
LAYER 1: Pages (app-specific)
  └── Server Components (Next.js) / Screen Components (Mobile/Desktop)
      └── Fetch data, handle routing, set up providers

LAYER 2: Containers (app-specific)
  └── Client Components that wire up hooks, state, and navigation
      └── Use React Query hooks from packages/hooks
      └── Use Zustand stores from packages/stores
      └── Handle platform-specific logic (router, i18n)

LAYER 3: UI Components (shared - packages/ui)
  └── Pure presentational components
      └── Accept data and callbacks via props
      └── No hooks, no API calls, no routing
      └── Platform-agnostic
```

### Example: Ideas Page

```typescript
// LAYER 1: Page (apps/web/src/app/[locale]/(pages)/ideas/page.tsx)
// Server Component - handles route and initial setup
export default function IdeasPage() {
  return (
    <PageHeader title="Ideas" icon={<Lightbulb />} />
    <IdeasContainer />  // Client component
  );
}

// LAYER 2: Container (apps/web/src/components/ideas/ideas-container.tsx)
'use client';
// Wires up hooks, state, and navigation
export function IdeasContainer() {
  const { data: ideas, isLoading } = useIdeas();
  const router = useRouter();
  const t = useTranslations('ideas');

  if (isLoading) return <IdeasSkeleton />;

  return (
    <IdeaList
      ideas={ideas}
      onIdeaClick={(id) => router.push(`/ideas/${id}`)}
      onPromote={(id) => promoteIdea.mutate(id)}
      labels={{ promote: t('promote'), archive: t('archive') }}
    />
  );
}

// LAYER 3: UI Component (packages/ui/src/components/ideas/idea-list.tsx)
// Pure presentational - no hooks, no routing
interface IdeaListProps {
  ideas: Idea[];
  onIdeaClick: (id: string) => void;
  onPromote: (id: string) => void;
  labels?: { promote?: string; archive?: string };
}

export function IdeaList({ ideas, onIdeaClick, onPromote, labels }: IdeaListProps) {
  return (
    <div className="grid gap-4">
      {ideas.map(idea => (
        <IdeaCard key={idea.id} idea={idea} onClick={onIdeaClick} ... />
      ))}
    </div>
  );
}
```

---

## State Management

### Decision Tree

```
What kind of state?
│
├── Server State (API data)?
│   └── Use React Query (packages/hooks)
│       - Caching, deduplication, background refetch
│       - Factory pattern: createXHooks(apiClient)
│
├── Client UI State (sidebar, theme, filters)?
│   └── Use Zustand (packages/stores)
│       - Persisted to localStorage where needed
│       - Split into focused stores (useUIStore, useFilterStore)
│
├── Form State?
│   └── Use React Hook Form + Zod validation
│       - Zod schemas from packages/validations
│
├── URL State (filters, pagination, search)?
│   └── Use URL search params
│       - useSearchParams (Next.js)
│       - Shareable, bookmarkable
│
└── Component-Local State?
    └── Use useState / useReducer
        - Ephemeral state (dropdown open, hover)
        - Never shared between components
```

### React Query Pattern (packages/hooks)

```typescript
// Factory function - initialized per app
export function createIdeaHooks(apiClient: ApiClient) {
  return {
    useIdeas: (filters?: IdeaFilters) =>
      useQuery({
        queryKey: ["ideas", filters],
        queryFn: () => apiClient.ideas.getAll(filters),
        staleTime: 5 * 60 * 1000,
      }),

    useCreateIdea: () => {
      const queryClient = useQueryClient();
      return useMutation({
        mutationFn: apiClient.ideas.create,
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["ideas"] });
        },
      });
    },
  };
}

// Initialized in app (apps/web/src/lib/api-hooks.ts)
const ideaHooks = createIdeaHooks(apiClient);
export const useIdeas = ideaHooks.useIdeas;
export const useCreateIdea = ideaHooks.useCreateIdea;
```

### Zustand Pattern (packages/stores)

```typescript
// Focused store for UI state
export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      theme: "system",
      toggleSidebar: () =>
        set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setTheme: (theme) => set({ theme }),
    }),
    { name: "ui-storage" },
  ),
);
```

---

## Data Flow

```
User Action
    │
    ▼
Container Component
    │
    ├── Mutation (React Query)
    │   └── API Client (packages/api-client)
    │       └── Backend API
    │           └── Response
    │               └── Cache Invalidation
    │                   └── UI Re-renders
    │
    └── Client State (Zustand)
        └── Store Update
            └── Subscribed Components Re-render
```

### Optimistic Updates

For high-frequency interactions (drag-drop, toggles):

```typescript
useMutation({
  mutationFn: apiClient.pipeline.moveCard,
  onMutate: async (newData) => {
    // Cancel outgoing queries
    await queryClient.cancelQueries({ queryKey: ["pipeline"] });
    // Snapshot previous state
    const previous = queryClient.getQueryData(["pipeline"]);
    // Optimistic update
    queryClient.setQueryData(["pipeline"], optimisticUpdate(newData));
    return { previous };
  },
  onError: (err, variables, context) => {
    // Rollback on error
    queryClient.setQueryData(["pipeline"], context.previous);
  },
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: ["pipeline"] });
  },
});
```

---

## Routing

### Web (Next.js 16 App Router)

```
Route Groups:
(auth)     → Login, Register (no sidebar)
(pages)    → All authenticated pages (with sidebar)

Dynamic Routes:
[locale]   → i18n prefix (en, es, pt)
[id]       → Resource detail pages

Server Components by default
Client Components only when needed ('use client')
```

### Mobile (Expo Router - File-Based)

```
app/
├── _layout.tsx          → Root layout
├── (external)/          → Auth screens
│   ├── auth.tsx
│   └── oauth-callback.tsx
└── (internal)/          → Authenticated screens
    ├── _layout.tsx      → Tab navigation
    ├── (tabs)/          → Bottom tab screens
    └── [feature]/       → Feature screens
```

### Desktop (React Router)

```
Client-side routing with React Router
Sidebar navigation with route-based active states
```

---

## Error Handling

### Error Boundaries

```typescript
// Wrap page sections, not the entire app
<ErrorBoundary fallback={<ErrorState />}>
  <PipelineBoard />
</ErrorBoundary>
```

### API Error Handling

```typescript
// React Query handles errors automatically
const { data, error, isError } = useIdeas();

if (isError) {
  return <ErrorState message={error.message} onRetry={refetch} />;
}
```

### Error Hierarchy

1. **Network errors**: Show offline banner, retry on reconnect
2. **401 Unauthorized**: Redirect to login
3. **403 Forbidden**: Show "no access" state
4. **404 Not Found**: Show "not found" state
5. **422 Validation**: Show inline field errors
6. **500 Server Error**: Show generic error with retry

---

## Performance Patterns

### Code Splitting

```typescript
// Dynamic imports for heavy components
const KanbanBoard = dynamic(() => import('./KanbanBoard'), {
  loading: () => <KanbanSkeleton />,
});

const AIChat = dynamic(() => import('./AIChat'), {
  ssr: false, // Client-only
});
```

### Memoization

```typescript
// Memoize expensive renders
const MemoizedCard = React.memo(PipelineCard);

// Memoize callbacks passed to children
const handleClick = useCallback(
  (id: string) => {
    router.push(`/ideas/${id}`);
  },
  [router],
);

// Memoize computed values
const filteredIdeas = useMemo(() => ideas.filter(filterFn), [ideas, filterFn]);
```

### Image Optimization

```typescript
// Web: Next.js Image
import Image from 'next/image';
<Image src={url} width={400} height={300} alt={alt} />

// Mobile: Cached images
// Desktop: Optimized loading
```

---

## Testing Strategy

### Unit Tests (70%)

- **What**: Pure functions, hooks, utilities, individual components
- **How**: Vitest (web/desktop), Jest (backend/mobile)
- **Pattern**: Arrange-Act-Assert

### Integration Tests (20%)

- **What**: Component + hooks, multi-component flows
- **How**: React Testing Library + mock API
- **Pattern**: Render > Interact > Assert

### E2E Tests (10%)

- **What**: Critical user flows only
- **How**: Playwright (web), Detox (mobile)
- **Pattern**: Full user journey (login > create > verify)

---

## File Organization

### Per-Feature Structure (in apps)

```
src/components/ideas/
├── ideas-container.tsx    # Container (hooks + state)
├── ideas-filters.tsx      # Filter controls
├── ideas-skeleton.tsx     # Loading state
├── idea-detail-modal.tsx  # Detail modal
├── __tests__/
│   ├── ideas-container.test.tsx
│   └── ideas-filters.test.tsx
└── index.ts               # Barrel export
```

### Shared Components (packages/ui)

```
packages/ui/src/components/ideas/
├── idea-card.tsx          # Presentational card
├── idea-list.tsx          # List layout
├── idea-form.tsx          # Create/edit form
├── __tests__/
│   └── idea-card.test.tsx
└── index.ts               # Barrel export
```

---

## Import Order Convention

```typescript
// 1. React / framework
import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";

// 2. Third-party libraries
import { useQuery } from "@tanstack/react-query";

// 3. Shared packages (workspace)
import { Button, Card } from "@ordo-todo/ui";
import { useIdeas } from "@ordo-todo/hooks";
import { Idea } from "@ordo-todo/core";

// 4. Local imports (relative)
import { IdeasFilter } from "./ideas-filter";
import { formatDate } from "../utils";

// 5. Types (if separate)
import type { IdeaFilterOptions } from "./types";
```

---

_Architecture is not about frameworks. It's about making the right code easy to write and the wrong code hard to write._
