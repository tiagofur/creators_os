# ADR-001: State Management with Zustand

## Status

Accepted

## Context

Creators OS needs client-side state management for authentication, workspace selection, UI preferences, and WebSocket connection state. The application uses Next.js 15 with the App Router and React 19, which already provides React Context and server components for many data-fetching needs. TanStack Query handles server-state (API caching, refetching, optimistic updates), so the remaining client-only state is relatively small and focused.

The main options considered were:

1. **React Context + useReducer** — built-in, no dependencies, but causes re-renders of the entire subtree when any value changes. Requires manual memoisation and provider nesting for multiple domains.
2. **Redux Toolkit** — mature ecosystem, but introduces significant boilerplate (slices, actions, selectors, provider setup) for what amounts to a few small stores. The devtools are powerful but overkill for the scope of client state in this app.
3. **Zustand** — minimal API surface, no provider required, selector-based subscriptions prevent unnecessary re-renders, works seamlessly with React 19 and server components (stores are client-only by nature).

## Decision

Use **Zustand** for all client-only state. Each domain gets its own independent store:

- `useAuthStore` — access token (memory-only, never persisted), user object, authentication status
- `useWorkspaceStore` — active workspace selection
- `useUiStore` — sidebar state, theme preferences, and other UI flags
- `useWsStore` — WebSocket connection state

Server state (API data) is managed exclusively by **TanStack Query** via the `@ordo/api-client` resource modules and query keys.

## Consequences

**Positive:**
- Near-zero boilerplate — each store is a single `create()` call with typed state and actions.
- Granular subscriptions via selectors prevent unnecessary re-renders without manual memoisation.
- No provider wrapping required, so stores can be imported and used anywhere in client components.
- Stores are defined in `@ordo/stores`, keeping them decoupled from the Next.js app.
- Small bundle footprint (~1 KB gzipped).

**Negative:**
- No built-in devtools (though the `zustand/devtools` middleware can be added if needed).
- Developers unfamiliar with Zustand need to learn the selector pattern (`useAuthStore((s) => s.user)`) to avoid full-store re-renders.
- If client state scope grows significantly, the flat store model may need to be revisited.
