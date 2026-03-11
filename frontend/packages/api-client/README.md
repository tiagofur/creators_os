# @ordo/api-client

Type-safe HTTP and WebSocket client for the Creators OS backend API. Provides resource modules, automatic JWT refresh, Zod response validation, and a real-time WebSocket client with exponential backoff reconnection.

## Architecture

```
src/
  client.ts          # Core fetch wrapper (createApiClient)
  ws-client.ts       # WebSocket client with reconnection
  query-keys.ts      # TanStack Query key factory
  resources/         # One module per API domain
    auth.ts
    ideas.ts
    content.ts
    workspaces.ts
    ai.ts
    analytics.ts
    billing.ts
    gamification.ts
    notifications.ts
    search.ts
    sponsorships.ts
  index.ts           # Public barrel export
```

## Available resource modules

| Module | Factory function | API domain |
|--------|-----------------|------------|
| Auth | `createAuthResource` | `/v1/auth/*` |
| Workspaces | `createWorkspacesResource` | `/v1/workspaces/*` |
| Ideas | `createIdeasResource` | `/v1/ideas/*` |
| Content | `createContentResource` | `/v1/content/*` |
| AI | `createAiResource` | `/v1/ai/*` |
| Analytics | `createAnalyticsResource` | `/v1/analytics/*` |
| Billing | `createBillingResource` | `/v1/billing/*` |
| Gamification | `createGamificationResource` | `/v1/gamification/*` |
| Notifications | `createNotificationsResource` | `/v1/notifications/*` |
| Search | `createSearchResource` | `/v1/search/*` |
| Sponsorships | `createSponsorshipsResource` | `/v1/sponsorships/*` |

## JWT refresh flow

1. The client sends every request with an `Authorization: Bearer <access_token>` header.
2. If the server responds with **401**, the client calls `POST /api/auth/refresh` (a Next.js API route that proxies to the backend).
3. The refresh endpoint reads the `refresh_token` from an httpOnly cookie, exchanges it with the backend, and returns a new `access_token`. If the backend rotates the refresh token, the cookie is updated.
4. The original request is retried once with the new access token.
5. If refresh fails, `onUnauthorized()` is called (typically triggers logout and redirect to login).
6. Concurrent 401s are coalesced — only one refresh request is in-flight at a time.

## Adding a new resource module

Follow these steps to add a new API domain (e.g., "templates"):

### 1. Create the resource file

Create `src/resources/templates.ts`:

```ts
import type { OrdoApiClient } from '../client';
import type { Template, PaginatedResponse } from '@ordo/types';
import type { CreateTemplateInput } from '@ordo/validations';
import { templateSchema } from '@ordo/validations';
import { z } from 'zod';

const paginatedTemplatesSchema = z.object({
  data: z.array(templateSchema),
  meta: z.object({
    page: z.number(),
    per_page: z.number(),
    total: z.number(),
    total_pages: z.number(),
  }),
});

export function createTemplatesResource(client: OrdoApiClient) {
  return {
    list(page = 1): Promise<PaginatedResponse<Template>> {
      return client.get(`/v1/templates?page=${page}`, paginatedTemplatesSchema);
    },

    get(id: string): Promise<Template> {
      return client.get(`/v1/templates/${id}`, templateSchema);
    },

    create(body: CreateTemplateInput): Promise<Template> {
      return client.post('/v1/templates', body, templateSchema);
    },

    delete(id: string): Promise<void> {
      return client.delete(`/v1/templates/${id}`);
    },
  };
}
```

### 2. Re-export from the resources barrel

Add to `src/resources/index.ts`:

```ts
export { createTemplatesResource } from './templates';
```

### 3. Re-export from the package barrel

Add to `src/index.ts`:

```ts
export { createTemplatesResource } from './resources/index';
```

### 4. Add query keys (optional)

If using TanStack Query, add key entries in `src/query-keys.ts`.

### Key conventions

- Each resource factory receives the shared `OrdoApiClient` instance.
- Pass a Zod schema as the last argument to `client.get()` / `client.post()` for runtime response validation. Validation failures are logged but do not block the UI.
- Use `@ordo/types` for response types and `@ordo/validations` for Zod schemas and input types.
