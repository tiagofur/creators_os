# Frontend Integration Guide

> How the frontend (Web/Next.js, Mobile/React Native, Desktop/Electron) consumes the Go backend API for Ordo Creator OS.
>
> **Philosophy**: The `@ordo/api-client` is the SINGLE source of truth for all backend communication. No raw fetch calls from app code. Ever.

---

## 1. Architecture Overview

### 1.1 Monorepo Structure

```
creators_os/
├── apps/
│   ├── web/                    # Next.js 16 (primary)
│   │   ├── src/
│   │   │   ├── app/           # App Router (RSC + client)
│   │   │   ├── components/    # App-specific containers
│   │   │   └── middleware.ts
│   │   └── package.json
│   │
│   ├── mobile/                 # Expo/React Native
│   │   ├── app/               # Expo Router
│   │   ├── src/
│   │   │   ├── screens/       # App-specific screens
│   │   │   └── components/    # App-specific containers
│   │   └── package.json
│   │
│   └── desktop/                # Electron + Vite
│       ├── src/
│       │   ├── main/          # Main process
│       │   ├── renderer/      # Renderer process (React)
│       │   └── components/    # App-specific containers
│       └── package.json
│
├── packages/
│   ├── api-client/             # THE API CLIENT (required everywhere)
│   │   ├── src/
│   │   │   ├── client.ts       # HTTP client setup + interceptors
│   │   │   ├── auth/           # Token management
│   │   │   ├── resources/      # API endpoints per resource
│   │   │   │   ├── ideas.ts
│   │   │   │   ├── contents.ts
│   │   │   │   ├── publishing.ts
│   │   │   │   ├── ai.ts
│   │   │   │   └── ... (all resources)
│   │   │   ├── types/          # Generated TypeScript types
│   │   │   └── index.ts        # Barrel export
│   │   └── package.json
│   │
│   ├── hooks/                   # React Query hooks (consume api-client)
│   │   ├── src/
│   │   │   ├── query-keys.ts   # Query key factory
│   │   │   ├── use-ideas/
│   │   │   ├── use-contents/
│   │   │   ├── use-publishing/
│   │   │   ├── use-ai/
│   │   │   └── ... (all resources)
│   │   └── package.json
│   │
│   ├── stores/                  # Zustand stores (client UI state)
│   │   ├── src/
│   │   │   ├── auth.ts         # Current user, auth state
│   │   │   ├── workspace.ts    # Active workspace, recent
│   │   │   ├── ui.ts           # Sidebar, theme, filters
│   │   │   ├── pipeline.ts     # Drag state, selection
│   │   │   └── ai.ts           # Active conversation
│   │   └── package.json
│   │
│   ├── ui/                      # Shared UI components (platform-agnostic)
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── ideas/
│   │   │   │   ├── pipeline/
│   │   │   │   ├── publishing/
│   │   │   │   └── ...
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── core/                    # Domain entities, enums, utilities
│   │   ├── src/
│   │   │   ├── entities/
│   │   │   ├── enums.ts
│   │   │   └── constants.ts
│   │   └── package.json
│   │
│   ├── validations/             # Zod schemas for forms & API
│   │   ├── src/
│   │   │   ├── ideas.ts
│   │   │   ├── contents.ts
│   │   │   └── ...
│   │   └── package.json
│   │
│   └── styles/                  # Global design tokens
│       ├── tailwind.config.ts
│       └── globals.css
│
└── prd/                         # Design docs, specs (this file)
```

### 1.2 Core Principle: API Client as Single Source of Truth

**Every frontend call MUST go through `@ordo/api-client`:**

```typescript
// ✅ CORRECT: Use api-client
import { ideasApi } from '@ordo/api-client'
const { data } = useQuery({
  queryFn: () => ideasApi.list(workspaceId)
})

// ❌ WRONG: Raw fetch
const response = await fetch(`/api/workspaces/${id}/ideas`)

// ❌ WRONG: Using axios directly
const { data } = await axios.get(`/api/workspaces/${id}/ideas`)
```

**Why?**
- Centralized auth token handling
- Consistent error handling
- Request/response logging & monitoring
- Type safety (generated from Go OpenAPI spec)
- Workspace ID header injection
- Request deduplication
- Single cache strategy

### 1.3 The Three-Layer Component Model

```
┌─────────────────────────────────────────────────┐
│ LAYER 1: Page/Screen (App-Specific)            │
│ • Server Components (Next.js) or Screen exports│
│ • Fetch initial data                            │
│ • Set up providers & metadata                   │
│ • Import Container from Layer 2                 │
└─────────────────┬───────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────┐
│ LAYER 2: Container Component (App-Specific)    │
│ • Client component ('use client')               │
│ • useQuery/useMutation from @ordo/hooks        │
│ • useStore from @ordo/stores                   │
│ • Compose data + handle navigation             │
│ • Convert page-agnostic format to UI props    │
│ • Import UI Component from Layer 3             │
└─────────────────┬───────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────┐
│ LAYER 3: UI Component (Shared in packages/ui)  │
│ • Pure presentational                           │
│ • Accept data via props                         │
│ • Accept callbacks via props                    │
│ • No hooks, no routing, no API calls            │
│ • Platform-agnostic (works web/mobile/desktop) │
└─────────────────────────────────────────────────┘
```

**Example: Ideas List**

```typescript
// LAYER 1: Page (apps/web/src/app/[locale]/(pages)/ideas/page.tsx)
import { IdeasContainer } from '@/components/ideas/ideas-container'

export default function IdeasPage() {
  return (
    <div>
      <PageHeader title="Ideas" />
      <IdeasContainer />
    </div>
  )
}

// LAYER 2: Container (apps/web/src/components/ideas/ideas-container.tsx)
'use client'
import { useIdeas } from '@ordo/hooks'
import { IdeaList } from '@ordo/ui'
import { useRouter } from 'next/navigation'

export function IdeasContainer() {
  const { data: ideas, isLoading, refetch } = useIdeas(workspaceId)
  const router = useRouter()
  
  if (isLoading) return <IdeaSkeleton />
  
  return (
    <IdeaList
      ideas={ideas || []}
      onPromote={(id) => router.push(`/pipeline?idea=${id}`)}
      onDelete={(id) => refetch()}
    />
  )
}

// LAYER 3: UI Component (packages/ui/src/components/ideas/idea-list.tsx)
interface IdeaListProps {
  ideas: Idea[]
  onPromote: (id: string) => void
  onDelete: (id: string) => void
}

export function IdeaList({ ideas, onPromote, onDelete }: IdeaListProps) {
  return (
    <div className="grid gap-4">
      {ideas.map(idea => (
        <IdeaCard
          key={idea.id}
          idea={idea}
          onPromote={() => onPromote(idea.id)}
          onDelete={() => onDelete(idea.id)}
        />
      ))}
    </div>
  )
}
```

---

## 2. API Client Package (`@ordo/api-client`)

The `@ordo/api-client` is the single dependency that ALL apps use to talk to the backend. It handles:
- HTTP transport layer
- Authentication (JWT + refresh)
- Request/response logging
- Error handling
- Response type generation (from Go OpenAPI)

### 2.1 HTTP Client Setup

**File: `packages/api-client/src/client.ts`**

```typescript
import axios, {
  AxiosInstance,
  AxiosError,
  InternalAxiosRequestConfig,
  AxiosResponse,
} from 'axios'

export interface ApiClientConfig {
  baseUrl: string
  environment: 'development' | 'staging' | 'production'
  getAccessToken: () => string | null
  getRefreshToken: () => string | null
  setTokens: (access: string, refresh: string) => void
  clearTokens: () => void
  onUnauthorized?: () => void // Called when refresh fails
}

/**
 * Create HTTP client with automatic token refresh
 */
export function createApiClient(config: ApiClientConfig): AxiosInstance {
  const client = axios.create({
    baseURL: config.baseUrl,
    headers: {
      'Content-Type': 'application/json',
    },
    timeout: 30_000,
  })

  // Generate unique request ID for tracing
  let requestIdCounter = 0
  const generateRequestId = () => `req-${Date.now()}-${++requestIdCounter}`

  // REQUEST INTERCEPTOR: Attach token + inject workspace ID
  client.interceptors.request.use(
    (requestConfig: InternalAxiosRequestConfig) => {
      const accessToken = config.getAccessToken()
      
      if (accessToken) {
        requestConfig.headers.Authorization = `Bearer ${accessToken}`
      }

      // Inject workspace ID from store (or URL)
      const workspaceId = getActiveWorkspaceId() // From useWorkspaceStore
      if (workspaceId) {
        requestConfig.headers['X-Workspace-ID'] = workspaceId
      }

      // Add request ID for tracing
      requestConfig.headers['X-Request-ID'] = generateRequestId()

      // Dev logging
      if (config.environment === 'development') {
        console.log(`[API] ${requestConfig.method?.toUpperCase()} ${requestConfig.url}`, {
          requestId: requestConfig.headers['X-Request-ID'],
          workspaceId,
        })
      }

      return requestConfig
    },
    (error) => Promise.reject(error)
  )

  // RESPONSE INTERCEPTOR: Handle 401 + auto-refresh
  let isRefreshing = false
  let refreshQueue: Array<() => void> = []

  const processQueue = (error: AxiosError | null = null) => {
    refreshQueue.forEach(prom => {
      if (error) {
        prom()
      } else {
        prom()
      }
    })
    refreshQueue = []
  }

  client.interceptors.response.use(
    (response: AxiosResponse) => {
      // Dev logging
      if (config.environment === 'development') {
        console.log(
          `[API] ${response.config.method?.toUpperCase()} ${response.config.url}`,
          {
            status: response.status,
            requestId: response.config.headers?.['X-Request-ID'],
          }
        )
      }
      return response
    },
    async (error: AxiosError<any>) => {
      const originalRequest = error.config as InternalAxiosRequestConfig & {
        _retry?: boolean
      }

      if (error.response?.status === 401 && !originalRequest._retry) {
        if (isRefreshing) {
          // Queue request while refresh is in progress
          return new Promise((resolve) => {
            refreshQueue.push(() => {
              resolve(client(originalRequest))
            })
          })
        }

        isRefreshing = true
        originalRequest._retry = true

        try {
          const refreshToken = config.getRefreshToken()
          if (!refreshToken) {
            throw new Error('No refresh token available')
          }

          // Call refresh endpoint
          const response = await axios.post(
            `${config.baseUrl}/v1/auth/refresh`,
            { refresh_token: refreshToken }
          )

          const { access_token, refresh_token } = response.data

          // Update stored tokens
          config.setTokens(access_token, refresh_token)

          // Retry original request
          originalRequest.headers.Authorization = `Bearer ${access_token}`
          processQueue()
          isRefreshing = false

          return client(originalRequest)
        } catch (refreshError) {
          // Refresh failed — logout user
          config.clearTokens()
          config.onUnauthorized?.()
          processQueue(error)
          isRefreshing = false
          return Promise.reject(refreshError)
        }
      }

      return Promise.reject(error)
    }
  )

  return client
}
```

**Usage:**

```typescript
// apps/web/src/lib/api-client.ts
import { createApiClient } from '@ordo/api-client'

const apiClient = createApiClient({
  baseUrl: process.env.NEXT_PUBLIC_API_URL || 'https://api.ordo.dev',
  environment: (process.env.NODE_ENV as 'development' | 'staging' | 'production') || 'development',
  
  getAccessToken: () => {
    // Get from secure storage (httpOnly cookie, localStorage, etc)
    return sessionStorage.getItem('access_token')
  },
  
  getRefreshToken: () => {
    return sessionStorage.getItem('refresh_token')
  },
  
  setTokens: (access, refresh) => {
    sessionStorage.setItem('access_token', access)
    sessionStorage.setItem('refresh_token', refresh)
  },
  
  clearTokens: () => {
    sessionStorage.removeItem('access_token')
    sessionStorage.removeItem('refresh_token')
  },
  
  onUnauthorized: () => {
    // Redirect to login
    window.location.href = '/login'
  },
})

export default apiClient
```

### 2.2 Token Management (Platform-Specific)

**Web: httpOnly Cookies (Secure)**

```typescript
// packages/api-client/src/auth/token-storage-web.ts
export const tokenStorageWeb = {
  getAccessToken: () => {
    // httpOnly cookies are automatically sent by browser
    // Never access them from JS — read from response only
    return null // Backend sets via Set-Cookie
  },

  getRefreshToken: () => {
    return null // Backend handles refresh via httpOnly
  },

  setTokens: (access: string, refresh: string) => {
    // Backend sends via Set-Cookie headers automatically
    // Frontend doesn't need to store
  },

  clearTokens: () => {
    // Backend clears via Set-Cookie headers
  },
}
```

**Mobile: React Native Secure Storage**

```typescript
// packages/api-client/src/auth/token-storage-mobile.ts
import * as SecureStore from 'expo-secure-store'

export const tokenStorageMobile = {
  async getAccessToken() {
    try {
      return await SecureStore.getItemAsync('access_token')
    } catch {
      return null
    }
  },

  async getRefreshToken() {
    try {
      return await SecureStore.getItemAsync('refresh_token')
    } catch {
      return null
    }
  },

  async setTokens(access: string, refresh: string) {
    try {
      await SecureStore.setItemAsync('access_token', access)
      await SecureStore.setItemAsync('refresh_token', refresh)
    } catch (error) {
      console.error('Failed to store tokens', error)
    }
  },

  async clearTokens() {
    try {
      await SecureStore.deleteItemAsync('access_token')
      await SecureStore.deleteItemAsync('refresh_token')
    } catch (error) {
      console.error('Failed to clear tokens', error)
    }
  },
}
```

**Desktop: Electron Safe Storage**

```typescript
// packages/api-client/src/auth/token-storage-electron.ts
import { ipcRenderer } from 'electron'

export const tokenStorageElectron = {
  async getAccessToken() {
    return ipcRenderer.invoke('token:get-access')
  },

  async getRefreshToken() {
    return ipcRenderer.invoke('token:get-refresh')
  },

  async setTokens(access: string, refresh: string) {
    await ipcRenderer.invoke('token:set', { access, refresh })
  },

  async clearTokens() {
    await ipcRenderer.invoke('token:clear')
  },
}

// Main process (apps/desktop/src/main/token-storage.ts)
import { safeStorage } from 'electron'

const store = new Store()

export function registerTokenHandlers() {
  ipcMain.handle('token:get-access', () => {
    const encrypted = store.get('access_token')
    return encrypted ? safeStorage.decryptString(encrypted) : null
  })

  ipcMain.handle('token:get-refresh', () => {
    const encrypted = store.get('refresh_token')
    return encrypted ? safeStorage.decryptString(encrypted) : null
  })

  ipcMain.handle('token:set', (_, { access, refresh }) => {
    store.set('access_token', safeStorage.encryptString(access))
    store.set('refresh_token', safeStorage.encryptString(refresh))
  })

  ipcMain.handle('token:clear', () => {
    store.delete('access_token')
    store.delete('refresh_token')
  })
}
```

### 2.3 API Client Methods (Resource Endpoints)

For EVERY resource in the backend, create typed methods. The API client exposes all backend endpoints with full TypeScript support.

**File: `packages/api-client/src/resources/ideas.ts`**

```typescript
import { AxiosInstance } from 'axios'
import { Idea, IdeasListResponse, CreateIdeaInput, UpdateIdeaInput, IdeaValidation, TransformIdeaInput, Content } from '../types'

export function createIdeasApi(client: AxiosInstance) {
  return {
    /**
     * List ideas in a workspace (paginated)
     * GET /v1/workspaces/{workspaceId}/ideas
     */
    list: async (
      workspaceId: string,
      params?: {
        cursor?: string
        limit?: number
        status?: 'draft' | 'validated' | 'archived'
        tags?: string[]
        sort?: 'created_at' | 'updated_at' | 'score'
      }
    ) => {
      const response = await client.get<IdeasListResponse>(
        `/v1/workspaces/${workspaceId}/ideas`,
        { params }
      )
      return response.data
    },

    /**
     * Get a specific idea
     * GET /v1/workspaces/{workspaceId}/ideas/{id}
     */
    get: async (workspaceId: string, ideaId: string) => {
      const response = await client.get<Idea>(
        `/v1/workspaces/${workspaceId}/ideas/${ideaId}`
      )
      return response.data
    },

    /**
     * Create a new idea
     * POST /v1/workspaces/{workspaceId}/ideas
     */
    create: async (workspaceId: string, data: CreateIdeaInput) => {
      const response = await client.post<Idea>(
        `/v1/workspaces/${workspaceId}/ideas`,
        data
      )
      return response.data
    },

    /**
     * Update an idea
     * PATCH /v1/workspaces/{workspaceId}/ideas/{id}
     */
    update: async (
      workspaceId: string,
      ideaId: string,
      data: UpdateIdeaInput
    ) => {
      const response = await client.patch<Idea>(
        `/v1/workspaces/${workspaceId}/ideas/${ideaId}`,
        data
      )
      return response.data
    },

    /**
     * Delete an idea
     * DELETE /v1/workspaces/{workspaceId}/ideas/{id}
     */
    delete: async (workspaceId: string, ideaId: string) => {
      await client.delete(`/v1/workspaces/${workspaceId}/ideas/${ideaId}`)
    },

    /**
     * Validate an idea (AI scoring)
     * POST /v1/workspaces/{workspaceId}/ideas/{id}/validate
     */
    validate: async (
      workspaceId: string,
      ideaId: string,
      options?: { includeRecommendations?: boolean }
    ) => {
      const response = await client.post<IdeaValidation>(
        `/v1/workspaces/${workspaceId}/ideas/${ideaId}/validate`,
        options
      )
      return response.data
    },

    /**
     * Transform idea to content (promote)
     * POST /v1/workspaces/{workspaceId}/ideas/{id}/transform
     */
    transform: async (
      workspaceId: string,
      ideaId: string,
      data: TransformIdeaInput
    ) => {
      const response = await client.post<Content>(
        `/v1/workspaces/${workspaceId}/ideas/${ideaId}/transform`,
        data
      )
      return response.data
    },

    /**
     * Bulk operations
     * POST /v1/workspaces/{workspaceId}/ideas/bulk
     */
    bulk: async (
      workspaceId: string,
      operations: Array<{ op: 'delete' | 'archive'; ideaId: string }>
    ) => {
      const response = await client.post(
        `/v1/workspaces/${workspaceId}/ideas/bulk`,
        { operations }
      )
      return response.data
    },
  }
}
```

**Repeat this pattern for ALL resources:**

```typescript
// packages/api-client/src/resources/

// Auth
export function createAuthApi(client: AxiosInstance) {
  return {
    login: (email: string, password: string) => { /* ... */ },
    register: (email: string, password: string, name: string) => { /* ... */ },
    refresh: (refreshToken: string) => { /* ... */ },
    logout: () => { /* ... */ },
    me: () => { /* ... */ },
  }
}

// Users
export function createUsersApi(client: AxiosInstance) {
  return {
    getProfile: (userId: string) => { /* ... */ },
    updateProfile: (userId: string, data: UpdateUserInput) => { /* ... */ },
    listWorkspaces: () => { /* ... */ },
  }
}

// Workspaces
export function createWorkspacesApi(client: AxiosInstance) {
  return {
    list: () => { /* ... */ },
    get: (workspaceId: string) => { /* ... */ },
    create: (data: CreateWorkspaceInput) => { /* ... */ },
    update: (workspaceId: string, data: UpdateWorkspaceInput) => { /* ... */ },
    delete: (workspaceId: string) => { /* ... */ },
    getMembers: (workspaceId: string) => { /* ... */ },
    inviteMember: (workspaceId: string, email: string, role: Role) => { /* ... */ },
  }
}

// Contents
export function createContentsApi(client: AxiosInstance) {
  return {
    list: (workspaceId: string, params?: ContentsListParams) => { /* ... */ },
    get: (workspaceId: string, contentId: string) => { /* ... */ },
    create: (workspaceId: string, data: CreateContentInput) => { /* ... */ },
    update: (workspaceId: string, contentId: string, data: UpdateContentInput) => { /* ... */ },
    delete: (workspaceId: string, contentId: string) => { /* ... */ },
    updateStatus: (workspaceId: string, contentId: string, status: ContentStatus) => { /* ... */ },
    getScript: (workspaceId: string, contentId: string) => { /* ... */ },
    updateScript: (workspaceId: string, contentId: string, script: string) => { /* ... */ },
    getThumbnail: (workspaceId: string, contentId: string) => { /* ... */ },
    generateThumbnails: (workspaceId: string, contentId: string, count?: number) => { /* ... */ },
  }
}

// Series
export function createSeriesApi(client: AxiosInstance) {
  return {
    list: (workspaceId: string) => { /* ... */ },
    get: (workspaceId: string, seriesId: string) => { /* ... */ },
    create: (workspaceId: string, data: CreateSeriesInput) => { /* ... */ },
    update: (workspaceId: string, seriesId: string, data: UpdateSeriesInput) => { /* ... */ },
    delete: (workspaceId: string, seriesId: string) => { /* ... */ },
    addEpisode: (workspaceId: string, seriesId: string, contentId: string) => { /* ... */ },
    removeEpisode: (workspaceId: string, seriesId: string, contentId: string) => { /* ... */ },
  }
}

// Publishing
export function createPublishingApi(client: AxiosInstance) {
  return {
    listPosts: (workspaceId: string, params?: PublishListParams) => { /* ... */ },
    getPost: (workspaceId: string, postId: string) => { /* ... */ },
    createPost: (workspaceId: string, data: CreatePublishInput) => { /* ... */ },
    updatePost: (workspaceId: string, postId: string, data: UpdatePublishInput) => { /* ... */ },
    deletePost: (workspaceId: string, postId: string) => { /* ... */ },
    schedulePost: (workspaceId: string, postId: string, scheduledAt: Date) => { /* ... */ },
    publishNow: (workspaceId: string, postId: string) => { /* ... */ },
    getAnalytics: (workspaceId: string, postId: string) => { /* ... */ },
  }
}

// Calendar
export function createCalendarApi(client: AxiosInstance) {
  return {
    getSchedule: (workspaceId: string, params?: CalendarParams) => { /* ... */ },
    getDay: (workspaceId: string, date: Date) => { /* ... */ },
  }
}

// AI
export function createAiApi(client: AxiosInstance) {
  return {
    chat: (workspaceId: string, messages: Array<{ role: string; content: string }>) => { /* ... */ },
    brainstorm: (workspaceId: string, topic: string, count?: number) => { /* ... */ },
    scoreIdea: (workspaceId: string, ideaId: string) => { /* ... */ },
    generateScript: (workspaceId: string, outline: string) => { /* ... */ },
    generateTitles: (workspaceId: string, topic: string, count?: number) => { /* ... */ },
    generateDescription: (workspaceId: string, contentId: string, platform: Platform) => { /* ... */ },
    generateHashtags: (workspaceId: string, topic: string) => { /* ... */ },
    chatStream: (workspaceId: string, messages: Message[], signal?: AbortSignal) => { /* ... */ },
  }
}

// Remix
export function createRemixApi(client: AxiosInstance) {
  return {
    repurpose: (workspaceId: string, contentId: string, platforms: Platform[]) => { /* ... */ },
    getVariants: (workspaceId: string, remixId: string) => { /* ... */ },
  }
}

// Analytics
export function createAnalyticsApi(client: AxiosInstance) {
  return {
    getDailyMetrics: (workspaceId: string, params?: AnalyticsParams) => { /* ... */ },
    getContentMetrics: (workspaceId: string, contentId: string) => { /* ... */ },
    getAudienceInsights: (workspaceId: string) => { /* ... */ },
    getPerformanceTrends: (workspaceId: string, days?: number) => { /* ... */ },
  }
}

// Consistency
export function createConsistencyApi(client: AxiosInstance) {
  return {
    getScore: (workspaceId: string) => { /* ... */ },
    getStreaks: (workspaceId: string) => { /* ... */ },
    getHeatmap: (workspaceId: string) => { /* ... */ },
  }
}

// Achievements
export function createAchievementsApi(client: AxiosInstance) {
  return {
    list: (workspaceId: string) => { /* ... */ },
    get: (workspaceId: string, achievementId: string) => { /* ... */ },
  }
}

// Sponsorships
export function createSponsorshipsApi(client: AxiosInstance) {
  return {
    list: (workspaceId: string) => { /* ... */ },
    get: (workspaceId: string, sponsorshipId: string) => { /* ... */ },
    create: (workspaceId: string, data: CreateSponsorshipInput) => { /* ... */ },
    update: (workspaceId: string, sponsorshipId: string, data: UpdateSponsorshipInput) => { /* ... */ },
  }
}

// Billing
export function createBillingApi(client: AxiosInstance) {
  return {
    getPlan: () => { /* ... */ },
    upgradePlan: (planId: string) => { /* ... */ },
    getInvoices: () => { /* ... */ },
    updatePaymentMethod: (paymentMethodId: string) => { /* ... */ },
  }
}

// Templates
export function createTemplatesApi(client: AxiosInstance) {
  return {
    list: () => { /* ... */ },
    get: (templateId: string) => { /* ... */ },
    createFromTemplate: (workspaceId: string, templateId: string) => { /* ... */ },
  }
}

// Search
export function createSearchApi(client: AxiosInstance) {
  return {
    search: (workspaceId: string, query: string, type?: 'content' | 'ideas' | 'all') => { /* ... */ },
  }
}

// Upload
export function createUploadApi(client: AxiosInstance) {
  return {
    getPresignedUrl: (workspaceId: string, fileName: string, fileType: string) => { /* ... */ },
    confirmUpload: (workspaceId: string, uploadId: string, fileSize: number) => { /* ... */ },
    cancelUpload: (workspaceId: string, uploadId: string) => { /* ... */ },
  }
}
```

**File: `packages/api-client/src/index.ts`**

```typescript
import { AxiosInstance } from 'axios'
import { createAuthApi } from './resources/auth'
import { createUsersApi } from './resources/users'
import { createWorkspacesApi } from './resources/workspaces'
import { createIdeasApi } from './resources/ideas'
import { createContentsApi } from './resources/contents'
import { createSeriesApi } from './resources/series'
import { createPublishingApi } from './resources/publishing'
import { createCalendarApi } from './resources/calendar'
import { createAiApi } from './resources/ai'
import { createRemixApi } from './resources/remix'
import { createAnalyticsApi } from './resources/analytics'
import { createConsistencyApi } from './resources/consistency'
import { createAchievementsApi } from './resources/achievements'
import { createSponsorshipsApi } from './resources/sponsorships'
import { createBillingApi } from './resources/billing'
import { createTemplatesApi } from './resources/templates'
import { createSearchApi } from './resources/search'
import { createUploadApi } from './resources/upload'

export interface ApiClient {
  auth: ReturnType<typeof createAuthApi>
  users: ReturnType<typeof createUsersApi>
  workspaces: ReturnType<typeof createWorkspacesApi>
  ideas: ReturnType<typeof createIdeasApi>
  contents: ReturnType<typeof createContentsApi>
  series: ReturnType<typeof createSeriesApi>
  publishing: ReturnType<typeof createPublishingApi>
  calendar: ReturnType<typeof createCalendarApi>
  ai: ReturnType<typeof createAiApi>
  remix: ReturnType<typeof createRemixApi>
  analytics: ReturnType<typeof createAnalyticsApi>
  consistency: ReturnType<typeof createConsistencyApi>
  achievements: ReturnType<typeof createAchievementsApi>
  sponsorships: ReturnType<typeof createSponsorshipsApi>
  billing: ReturnType<typeof createBillingApi>
  templates: ReturnType<typeof createTemplatesApi>
  search: ReturnType<typeof createSearchApi>
  upload: ReturnType<typeof createUploadApi>
}

export function createApi(client: AxiosInstance): ApiClient {
  return {
    auth: createAuthApi(client),
    users: createUsersApi(client),
    workspaces: createWorkspacesApi(client),
    ideas: createIdeasApi(client),
    contents: createContentsApi(client),
    series: createSeriesApi(client),
    publishing: createPublishingApi(client),
    calendar: createCalendarApi(client),
    ai: createAiApi(client),
    remix: createRemixApi(client),
    analytics: createAnalyticsApi(client),
    consistency: createConsistencyApi(client),
    achievements: createAchievementsApi(client),
    sponsorships: createSponsorshipsApi(client),
    billing: createBillingApi(client),
    templates: createTemplatesApi(client),
    search: createSearchApi(client),
    upload: createUploadApi(client),
  }
}

export * from './types'
export { createApiClient } from './client'
export type { ApiClientConfig } from './client'
```

**Usage:**

```typescript
// apps/web/src/lib/api.ts
import { createApiClient } from '@ordo/api-client'
import { createApi } from '@ordo/api-client'

const httpClient = createApiClient({
  baseUrl: process.env.NEXT_PUBLIC_API_URL,
  environment: process.env.NODE_ENV as any,
  // ... token handlers
})

export const api = createApi(httpClient)

// Then in components:
const ideas = await api.ideas.list(workspaceId)
const content = await api.contents.create(workspaceId, { title: 'New Post' })
```

---

## 3. React Query Integration (`@ordo/hooks`)

All server state goes through React Query. The hooks package provides a clean interface.

### 3.1 Query Key Factory

**File: `packages/hooks/src/query-keys.ts`**

```typescript
/**
 * Query key factory pattern for React Query
 * Ensures consistent cache invalidation across the app
 */

export const queryKeys = {
  // Auth
  auth: {
    all: ['auth'] as const,
    me: () => [...queryKeys.auth.all, 'me'] as const,
  },

  // Workspaces
  workspaces: {
    all: ['workspaces'] as const,
    list: () => [...queryKeys.workspaces.all, 'list'] as const,
    detail: (workspaceId: string) => [...queryKeys.workspaces.all, 'detail', workspaceId] as const,
    members: (workspaceId: string) => [...queryKeys.workspaces.detail(workspaceId), 'members'] as const,
  },

  // Ideas
  ideas: {
    all: (workspaceId: string) => ['workspaces', workspaceId, 'ideas'] as const,
    list: (workspaceId: string, params?: IdeasListParams) =>
      [...queryKeys.ideas.all(workspaceId), 'list', params] as const,
    detail: (workspaceId: string, ideaId: string) =>
      [...queryKeys.ideas.all(workspaceId), 'detail', ideaId] as const,
    validation: (workspaceId: string, ideaId: string) =>
      [...queryKeys.ideas.detail(workspaceId, ideaId), 'validation'] as const,
  },

  // Contents
  contents: {
    all: (workspaceId: string) => ['workspaces', workspaceId, 'contents'] as const,
    list: (workspaceId: string, params?: ContentsListParams) =>
      [...queryKeys.contents.all(workspaceId), 'list', params] as const,
    detail: (workspaceId: string, contentId: string) =>
      [...queryKeys.contents.all(workspaceId), 'detail', contentId] as const,
    script: (workspaceId: string, contentId: string) =>
      [...queryKeys.contents.detail(workspaceId, contentId), 'script'] as const,
    thumbnail: (workspaceId: string, contentId: string) =>
      [...queryKeys.contents.detail(workspaceId, contentId), 'thumbnail'] as const,
    metrics: (workspaceId: string, contentId: string) =>
      [...queryKeys.contents.detail(workspaceId, contentId), 'metrics'] as const,
  },

  // Publishing
  publishing: {
    all: (workspaceId: string) => ['workspaces', workspaceId, 'publishing'] as const,
    list: (workspaceId: string, params?: PublishListParams) =>
      [...queryKeys.publishing.all(workspaceId), 'list', params] as const,
    detail: (workspaceId: string, postId: string) =>
      [...queryKeys.publishing.all(workspaceId), 'detail', postId] as const,
  },

  // Series
  series: {
    all: (workspaceId: string) => ['workspaces', workspaceId, 'series'] as const,
    list: (workspaceId: string) => [...queryKeys.series.all(workspaceId), 'list'] as const,
    detail: (workspaceId: string, seriesId: string) =>
      [...queryKeys.series.all(workspaceId), 'detail', seriesId] as const,
  },

  // Calendar
  calendar: {
    all: (workspaceId: string) => ['workspaces', workspaceId, 'calendar'] as const,
    schedule: (workspaceId: string, params?: CalendarParams) =>
      [...queryKeys.calendar.all(workspaceId), 'schedule', params] as const,
    day: (workspaceId: string, date: Date) =>
      [...queryKeys.calendar.all(workspaceId), 'day', date.toISOString().split('T')[0]] as const,
  },

  // AI
  ai: {
    all: (workspaceId: string) => ['workspaces', workspaceId, 'ai'] as const,
    brainstorm: (workspaceId: string, topic: string) =>
      [...queryKeys.ai.all(workspaceId), 'brainstorm', topic] as const,
    score: (workspaceId: string, ideaId: string) =>
      [...queryKeys.ai.all(workspaceId), 'score', ideaId] as const,
  },

  // Analytics
  analytics: {
    all: (workspaceId: string) => ['workspaces', workspaceId, 'analytics'] as const,
    daily: (workspaceId: string, params?: AnalyticsParams) =>
      [...queryKeys.analytics.all(workspaceId), 'daily', params] as const,
    content: (workspaceId: string, contentId: string) =>
      [...queryKeys.analytics.all(workspaceId), 'content', contentId] as const,
    trends: (workspaceId: string, days?: number) =>
      [...queryKeys.analytics.all(workspaceId), 'trends', days] as const,
  },

  // Consistency
  consistency: {
    all: (workspaceId: string) => ['workspaces', workspaceId, 'consistency'] as const,
    score: (workspaceId: string) => [...queryKeys.consistency.all(workspaceId), 'score'] as const,
    streaks: (workspaceId: string) => [...queryKeys.consistency.all(workspaceId), 'streaks'] as const,
    heatmap: (workspaceId: string) => [...queryKeys.consistency.all(workspaceId), 'heatmap'] as const,
  },

  // Achievements
  achievements: {
    all: (workspaceId: string) => ['workspaces', workspaceId, 'achievements'] as const,
    list: (workspaceId: string) => [...queryKeys.achievements.all(workspaceId), 'list'] as const,
    detail: (workspaceId: string, achievementId: string) =>
      [...queryKeys.achievements.all(workspaceId), 'detail', achievementId] as const,
  },
}
```

### 3.2 Custom Hooks Pattern

**File: `packages/hooks/src/use-ideas.ts`**

```typescript
import {
  useQuery,
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  UseQueryOptions,
  UseInfiniteQueryOptions,
} from '@tanstack/react-query'
import { api } from '@ordo/api-client'
import { Idea, IdeasListResponse, CreateIdeaInput, UpdateIdeaInput } from '@ordo/api-client'
import { queryKeys } from './query-keys'

/**
 * List all ideas with infinite pagination
 */
export function useIdeas(
  workspaceId: string,
  params?: IdeasListParams,
  options?: UseInfiniteQueryOptions<IdeasListResponse>
) {
  return useInfiniteQuery({
    queryKey: queryKeys.ideas.list(workspaceId, params),
    queryFn: ({ pageParam }) =>
      api.ideas.list(workspaceId, {
        ...params,
        cursor: pageParam as string | undefined,
      }),
    getNextPageParam: (lastPage) =>
      lastPage.pagination?.has_more ? lastPage.pagination.next_cursor : undefined,
    initialPageParam: undefined,
    staleTime: 30_000, // 30s (ideas list changes frequently)
    ...options,
  })
}

/**
 * Get a single idea
 */
export function useIdea(
  workspaceId: string,
  ideaId: string,
  options?: UseQueryOptions<Idea>
) {
  return useQuery({
    queryKey: queryKeys.ideas.detail(workspaceId, ideaId),
    queryFn: () => api.ideas.get(workspaceId, ideaId),
    staleTime: 60_000, // 1 min (detail view is more stable)
    ...options,
  })
}

/**
 * Validate an idea (AI scoring)
 */
export function useIdeaValidation(
  workspaceId: string,
  ideaId: string,
  options?: UseQueryOptions<IdeaValidation>
) {
  return useQuery({
    queryKey: queryKeys.ideas.validation(workspaceId, ideaId),
    queryFn: () => api.ideas.validate(workspaceId, ideaId),
    staleTime: 5 * 60_000, // 5 min (validation results are stable)
    enabled: false, // Don't fetch automatically
    ...options,
  })
}

/**
 * Create a new idea
 */
export function useCreateIdea(workspaceId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateIdeaInput) => api.ideas.create(workspaceId, data),

    // Optimistic update
    onMutate: async (newIdea) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({
        queryKey: queryKeys.ideas.all(workspaceId),
      })

      // Snapshot previous state
      const previousIdeas = queryClient.getQueryData(
        queryKeys.ideas.list(workspaceId)
      )

      // Optimistically add to cache
      queryClient.setQueryData(
        queryKeys.ideas.list(workspaceId),
        (old: any) => {
          if (!old) return old
          return {
            ...old,
            pages: [
              {
                ...old.pages[0],
                ideas: [{ id: 'temp-' + Date.now(), ...newIdea }, ...old.pages[0].ideas],
              },
              ...old.pages.slice(1),
            ],
          }
        }
      )

      return { previousIdeas }
    },

    // Rollback on error
    onError: (error, newIdea, context) => {
      if (context?.previousIdeas) {
        queryClient.setQueryData(
          queryKeys.ideas.list(workspaceId),
          context.previousIdeas
        )
      }
    },

    // Invalidate after success
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.ideas.all(workspaceId),
      })
    },
  })
}

/**
 * Update an idea
 */
export function useUpdateIdea(workspaceId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ ideaId, data }: { ideaId: string; data: UpdateIdeaInput }) =>
      api.ideas.update(workspaceId, ideaId, data),

    onMutate: async ({ ideaId, data }) => {
      await queryClient.cancelQueries({
        queryKey: queryKeys.ideas.detail(workspaceId, ideaId),
      })

      const previous = queryClient.getQueryData(
        queryKeys.ideas.detail(workspaceId, ideaId)
      )

      queryClient.setQueryData(
        queryKeys.ideas.detail(workspaceId, ideaId),
        (old: Idea) => (old ? { ...old, ...data } : old)
      )

      return { previous }
    },

    onError: (error, variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(
          queryKeys.ideas.detail(workspaceId, variables.ideaId),
          context.previous
        )
      }
    },

    onSettled: (_, __, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.ideas.all(workspaceId),
      })
      queryClient.invalidateQueries({
        queryKey: queryKeys.ideas.detail(workspaceId, variables.ideaId),
      })
    },
  })
}

/**
 * Delete an idea
 */
export function useDeleteIdea(workspaceId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (ideaId: string) => api.ideas.delete(workspaceId, ideaId),

    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.ideas.all(workspaceId),
      })
    },
  })
}

/**
 * Transform idea to content (promote to pipeline)
 */
export function useTransformIdea(workspaceId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ ideaId, data }: { ideaId: string; data: TransformIdeaInput }) =>
      api.ideas.transform(workspaceId, ideaId, data),

    onSettled: () => {
      // Invalidate both ideas and contents
      queryClient.invalidateQueries({
        queryKey: queryKeys.ideas.all(workspaceId),
      })
      queryClient.invalidateQueries({
        queryKey: queryKeys.contents.all(workspaceId),
      })
    },
  })
}
```

**Create similar hooks for ALL resources. Export from `packages/hooks/src/index.ts`:**

```typescript
// Ideas
export { useIdeas, useIdea, useCreateIdea, useUpdateIdea, useDeleteIdea, useTransformIdea, useIdeaValidation } from './use-ideas'

// Contents
export { useContents, useContent, useCreateContent, useUpdateContent, useDeleteContent, useUpdateContentStatus, useContentScript, useGenerateThumbnails } from './use-contents'

// Publishing
export { usePublishingPosts, usePublishingPost, useCreatePublishingPost, useUpdatePublishingPost, useSchedulePost, usePublishNow } from './use-publishing'

// Series
export { useSeries, useSeriesList, useCreateSeries, useUpdateSeries, useDeleteSeries, useAddEpisode } from './use-series'

// Calendar
export { useCalendarSchedule, useCalendarDay } from './use-calendar'

// AI
export { useAiBrainstorm, useAiChat, useScoreIdea, useGenerateScript, useGenerateTitles, useGenerateDescription, useGenerateHashtags, useAiChatStream } from './use-ai'

// Analytics
export { useDailyMetrics, useContentMetrics, useAudienceInsights, usePerformanceTrends } from './use-analytics'

// Consistency
export { useConsistencyScore, useStreaks, useHeatmap } from './use-consistency'

// Achievements
export { useAchievements, useAchievement } from './use-achievements'

// Other
export { useSponsorships, useRemixVariants, useBillingPlan, useSearch } from './use-other'

export { queryKeys } from './query-keys'
```

### 3.3 Stale Time Configuration

These times are critical for UX and performance:

```typescript
// packages/hooks/src/config.ts
export const STALE_TIMES = {
  // Ideas: Captured frequently, changes often
  IDEAS_LIST: 30_000,        // 30s
  IDEA_DETAIL: 60_000,       // 1 min
  IDEA_VALIDATION: 5 * 60_000, // 5 min (AI results stable)

  // Contents: Pipeline entries, status changes frequently
  CONTENTS_LIST: 30_000,     // 30s
  CONTENT_DETAIL: 60_000,    // 1 min
  CONTENT_SCRIPT: 120_000,   // 2 min
  CONTENT_THUMBNAIL: 5 * 60_000, // 5 min

  // Publishing: Scheduled posts, status changes
  PUBLISHING_LIST: 30_000,   // 30s
  PUBLISHING_POST: 60_000,   // 1 min

  // Series: Structural changes less often
  SERIES_LIST: 5 * 60_000,   // 5 min
  SERIES_DETAIL: 10 * 60_000, // 10 min

  // Calendar: Aggregated view, changes less
  CALENDAR_SCHEDULE: 5 * 60_000, // 5 min
  CALENDAR_DAY: 5 * 60_000,  // 5 min

  // Analytics: Expensive to compute, infrequent updates
  ANALYTICS_DAILY: 5 * 60_000,   // 5 min
  ANALYTICS_CONTENT: 5 * 60_000, // 5 min
  ANALYTICS_TRENDS: 10 * 60_000, // 10 min

  // Consistency: Daily computation
  CONSISTENCY_SCORE: 10 * 60_000,  // 10 min
  CONSISTENCY_STREAKS: 10 * 60_000, // 10 min
  CONSISTENCY_HEATMAP: 10 * 60_000, // 10 min

  // User data: Rarely changes
  USER_PROFILE: 10 * 60_000, // 10 min
  WORKSPACE_SETTINGS: 10 * 60_000, // 10 min
  ACHIEVEMENTS: 10 * 60_000, // 10 min

  // Auth: Critical, don't cache
  AUTH_ME: 0, // Always fresh
}
```

---

## 4. State Management (Zustand)

Use Zustand for client-only UI state. NEVER duplicate server data.

### 4.1 Stores

**File: `packages/stores/src/auth.ts`**

```typescript
import { create } from 'zustand'

export interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  setUser: (user: User | null) => void
  setIsAuthenticated: (value: boolean) => void
  setIsLoading: (value: boolean) => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  setUser: (user) => set({ user }),
  setIsAuthenticated: (isAuthenticated) => set({ isAuthenticated }),
  setIsLoading: (isLoading) => set({ isLoading }),
}))
```

**File: `packages/stores/src/workspace.ts`**

```typescript
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface WorkspaceState {
  activeWorkspaceId: string | null
  recentWorkspaces: Array<{ id: string; name: string }>
  setActiveWorkspace: (id: string) => void
  addRecentWorkspace: (id: string, name: string) => void
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set) => ({
      activeWorkspaceId: null,
      recentWorkspaces: [],

      setActiveWorkspace: (id) => set({ activeWorkspaceId: id }),

      addRecentWorkspace: (id, name) =>
        set((state) => ({
          recentWorkspaces: [
            { id, name },
            ...state.recentWorkspaces.filter((w) => w.id !== id),
          ].slice(0, 5),
        })),
    }),
    {
      name: 'workspace-storage',
    }
  )
)
```

**File: `packages/stores/src/ui.ts`**

```typescript
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Theme = 'light' | 'dark' | 'system'

export interface UIState {
  sidebarCollapsed: boolean
  theme: Theme
  commandPaletteOpen: boolean
  activeFilters: Record<string, any>

  toggleSidebar: () => void
  setTheme: (theme: Theme) => void
  setCommandPaletteOpen: (open: boolean) => void
  setActiveFilters: (filters: Record<string, any>) => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      theme: 'system' as Theme,
      commandPaletteOpen: false,
      activeFilters: {},

      toggleSidebar: () =>
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

      setTheme: (theme) => set({ theme }),

      setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),

      setActiveFilters: (filters) => set({ activeFilters: filters }),
    }),
    {
      name: 'ui-storage',
    }
  )
)
```

**File: `packages/stores/src/ai.ts`**

```typescript
import { create } from 'zustand'

export interface AIMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export interface AIState {
  conversationId: string | null
  messages: AIMessage[]
  isGenerating: boolean
  streamingChunk: string

  startConversation: (id: string) => void
  addMessage: (message: AIMessage) => void
  appendStreamChunk: (chunk: string) => void
  finalizeStream: () => void
  setIsGenerating: (value: boolean) => void
  clearConversation: () => void
}

export const useAIStore = create<AIState>((set) => ({
  conversationId: null,
  messages: [],
  isGenerating: false,
  streamingChunk: '',

  startConversation: (id) =>
    set({ conversationId: id, messages: [], streamingChunk: '' }),

  addMessage: (message) =>
    set((state) => ({
      messages: [...state.messages, message],
    })),

  appendStreamChunk: (chunk) =>
    set((state) => ({
      streamingChunk: state.streamingChunk + chunk,
    })),

  finalizeStream: () =>
    set((state) => {
      if (state.streamingChunk) {
        return {
          messages: [
            ...state.messages,
            {
              id: Date.now().toString(),
              role: 'assistant' as const,
              content: state.streamingChunk,
              timestamp: new Date(),
            },
          ],
          streamingChunk: '',
        }
      }
      return state
    }),

  setIsGenerating: (isGenerating) => set({ isGenerating }),

  clearConversation: () =>
    set({ conversationId: null, messages: [], streamingChunk: '' }),
}))
```

### 4.2 Zustand + React Query Boundary

**CRITICAL RULE**: Never duplicate server state in Zustand.

```typescript
// ✅ CORRECT: Server state in React Query
const { data: ideas } = useIdeas(workspaceId) // From @ordo/hooks

// ✅ CORRECT: UI state in Zustand
const { sidebarCollapsed } = useUIStore()

// ❌ WRONG: Duplicating server state
const [ideas, setIdeas] = useState([]) // Never do this!
useEffect(() => {
  setIdeas(queryResult.data) // This creates sync issues
}, [queryResult.data])

// ❌ WRONG: Storing server data in Zustand
const { addIdeasCache } = useUIStore() // Never do this!
```

---

## 5. WebSocket Integration

Real-time updates via WebSocket, with automatic cache invalidation.

### 5.1 Connection Manager

**File: `packages/api-client/src/websocket.ts`**

```typescript
import { ReconnectingWebSocket } from 'reconnecting-websocket'

export interface WebSocketConfig {
  url: string
  accessToken: string
  workspaceId: string
  onMessage?: (event: WebSocketMessage) => void
  onConnect?: () => void
  onDisconnect?: () => void
}

export type WebSocketMessage =
  | { type: 'content:updated'; data: { contentId: string; field: string; oldValue: string; newValue: string } }
  | { type: 'content:status_changed'; data: { contentId: string; oldStatus: string; newStatus: string } }
  | { type: 'notification:created'; data: { notificationId: string; type: string; title: string; message: string } }
  | { type: 'ai:response'; data: { conversationId: string; chunk: string } }
  | { type: 'workspace:member_joined'; data: { userId: string; name: string; role: string } }
  | { type: 'workspace:member_role_changed'; data: { userId: string; oldRole: string; newRole: string } }
  | { type: 'analytics:updated'; data: { metric: string; platform: string; newTotal: number } }
  | { type: 'collaboration:typing'; data: { userId: string; userName: string; contentId: string; field: string } }
  | { type: 'remix:completed'; data: { jobId: string; outputsCount: number } }
  | { type: 'ping' }
  | { type: 'pong' }

export class WebSocketManager {
  private ws: ReconnectingWebSocket | null = null
  private config: WebSocketConfig
  private messageQueue: WebSocketMessage[] = []
  private isOnline = true

  constructor(config: WebSocketConfig) {
    this.config = config
  }

  connect() {
    const url = new URL(this.config.url)
    url.searchParams.set('token', this.config.accessToken)
    url.searchParams.set('workspace', this.config.workspaceId)

    this.ws = new ReconnectingWebSocket(url.toString(), [], {
      maxReconnectionDelay: 30_000,
      minReconnectionDelay: 1_000,
      reconnectionDelayGrowFactor: 1.3,
      maxRetries: Infinity,
    })

    this.ws.addEventListener('open', () => {
      this.isOnline = true
      this.config.onConnect?.()
      this.flushQueue()
      this.startHeartbeat()
    })

    this.ws.addEventListener('message', (event) => {
      try {
        const message = JSON.parse(event.data) as WebSocketMessage
        this.config.onMessage?.(message)
      } catch (error) {
        console.error('Failed to parse WebSocket message', error)
      }
    })

    this.ws.addEventListener('close', () => {
      this.isOnline = false
      this.config.onDisconnect?.()
    })
  }

  send(message: WebSocketMessage) {
    if (this.isOnline && this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message))
    } else {
      this.messageQueue.push(message)
    }
  }

  private flushQueue() {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift()
      if (message) {
        this.send(message)
      }
    }
  }

  private startHeartbeat() {
    const interval = setInterval(() => {
      if (this.isOnline) {
        this.send({ type: 'ping' } as any)
      }
    }, 30_000)

    // Clear on disconnect
    this.ws?.addEventListener('close', () => clearInterval(interval))
  }

  disconnect() {
    this.ws?.close()
    this.ws = null
  }
}
```

### 5.2 Event Handlers → React Query Cache Updates

**File: `packages/hooks/src/use-websocket.ts`**

```typescript
import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { WebSocketManager, WebSocketMessage } from '@ordo/api-client'
import { queryKeys } from './query-keys'

export function useWebSocketEvents(workspaceId: string) {
  const queryClient = useQueryClient()

  useEffect(() => {
    const wsManager = new WebSocketManager({
      url: `${process.env.NEXT_PUBLIC_WS_URL}/ws`,
      accessToken: getAccessToken(),
      workspaceId,

      onMessage: (message: WebSocketMessage) => {
        handleWebSocketMessage(message, workspaceId, queryClient)
      },
    })

    wsManager.connect()

    return () => {
      wsManager.disconnect()
    }
  }, [workspaceId, queryClient])
}

function handleWebSocketMessage(
  message: WebSocketMessage,
  workspaceId: string,
  queryClient: QueryClient
) {
  switch (message.type) {
    case 'content.status_changed': {
      const { contentId, newStatus } = message.data

      // Update the specific content
      queryClient.setQueryData(
        queryKeys.contents.detail(workspaceId, contentId),
        (old: any) => (old ? { ...old, status: newStatus } : old)
      )

      // Invalidate list to show changes
      queryClient.invalidateQueries({
        queryKey: queryKeys.contents.all(workspaceId),
      })

      // Invalidate pipeline stats
      queryClient.invalidateQueries({
        queryKey: queryKeys.analytics.daily(workspaceId),
      })

      break
    }

    case 'achievement.unlocked': {
      const { name } = message.data

      // Show toast notification
      toast.success(`Achievement unlocked: ${name}!`)

      // Invalidate achievements
      queryClient.invalidateQueries({
        queryKey: queryKeys.achievements.all(workspaceId),
      })

      break
    }

    case 'ai.message': {
      const { chunk } = message.data

      // Append to streaming AI store
      useAIStore.getState().appendStreamChunk(chunk)

      break
    }

    case 'analytics.updated': {
      // Invalidate all analytics
      queryClient.invalidateQueries({
        queryKey: queryKeys.analytics.all(workspaceId),
      })

      break
    }

    case 'user.joined': {
      // Show online users indicator
      // Update real-time presence
      break
    }

    case 'cursor.moved': {
      // Update collaborative cursor position
      break
    }
  }
}
```

### 5.3 AI Streaming (Server-Sent Events)

For long-running AI operations, use SSE instead of WebSocket:

**File: `packages/hooks/src/use-ai-chat-stream.ts`**

```typescript
import { useState, useCallback, useRef } from 'react'

export function useAiChatStream(workspaceId: string) {
  const [isStreaming, setIsStreaming] = useState(false)
  const abortControllerRef = useRef<AbortController | null>(null)

  const chat = useCallback(
    async (messages: Array<{ role: string; content: string }>) => {
      const abortController = new AbortController()
      abortControllerRef.current = abortController

      setIsStreaming(true)
      const aiStore = useAIStore.getState()

      try {
        const response = await fetch(
          `/v1/workspaces/${workspaceId}/ai/chat`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${getAccessToken()}`,
            },
            body: JSON.stringify({ messages }),
            signal: abortController.signal,
          }
        )

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }

        const reader = response.body?.getReader()
        if (!reader) throw new Error('No response body')

        const decoder = new TextDecoder()

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value, { stream: true })

          // Parse SSE format: data: {...}\n\n
          const lines = chunk.split('\n')
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6))
                aiStore.appendStreamChunk(data.chunk)
              } catch {
                // Ignore parse errors
              }
            }
          }
        }

        aiStore.finalizeStream()
      } catch (error) {
        if (error instanceof Error && error.name !== 'AbortError') {
          console.error('Chat stream error:', error)
        }
      } finally {
        setIsStreaming(false)
      }
    },
    [workspaceId]
  )

  const cancel = useCallback(() => {
    abortControllerRef.current?.abort()
  }, [])

  return { chat, isStreaming, cancel }
}
```

---

## 6. File Upload Pattern

Bypass the backend for file uploads using presigned URLs:

**File: `packages/hooks/src/use-file-upload.ts`**

```typescript
import { useState, useCallback } from 'react'
import { api } from '@ordo/api-client'

export function useFileUpload(workspaceId: string) {
  const [isUploading, setIsUploading] = useState(false)
  const [progress, setProgress] = useState(0)

  const uploadFile = useCallback(
    async (file: File): Promise<string> => {
      setIsUploading(true)
      setProgress(0)

      try {
        // Step 1: Get presigned URL
        const presigned = await api.upload.getPresignedUrl(
          workspaceId,
          file.name,
          file.type
        )

        // Step 2: Upload directly to S3
        const xhr = new XMLHttpRequest()

        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            setProgress((event.loaded / event.total) * 100)
          }
        })

        await new Promise<void>((resolve, reject) => {
          xhr.addEventListener('load', () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve()
            } else {
              reject(new Error(`Upload failed: ${xhr.status}`))
            }
          })

          xhr.addEventListener('error', () => {
            reject(new Error('Upload error'))
          })

          xhr.open('PUT', presigned.url)

          // Add headers from presigned URL
          Object.entries(presigned.headers || {}).forEach(([key, value]) => {
            xhr.setRequestHeader(key, value as string)
          })

          xhr.send(file)
        })

        // Step 3: Confirm upload to backend
        const uploadId = await api.upload.confirmUpload(
          workspaceId,
          presigned.uploadId,
          file.size
        )

        return uploadId

        // Return URL for use in content
        return presigned.fileUrl
      } finally {
        setIsUploading(false)
      }
    },
    [workspaceId]
  )

  return { uploadFile, isUploading, progress }
}
```

---

## 7. Error Handling

### 7.1 Global Error Handler in API Client

```typescript
// packages/api-client/src/client.ts (in response interceptor)

client.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ErrorResponse>) => {
    const status = error.response?.status
    const data = error.response?.data

    switch (status) {
      case 400:
        // Validation error — show field-level errors
        console.error('Validation error:', data?.validationErrors)
        break

      case 401:
        // Unauthorized — handled by refresh logic
        break

      case 403:
        // Forbidden — user lacks permission
        toast.error('You do not have permission to access this resource')
        break

      case 404:
        // Not found
        toast.error('Resource not found')
        break

      case 409:
        // Conflict — data changed
        toast.error('This resource was modified. Please refresh and try again.')
        break

      case 422:
        // Unprocessable entity
        toast.error(data?.message || 'Failed to process request')
        break

      case 429:
        // Rate limited
        const retryAfter = error.response?.headers['retry-after']
        toast.error(`Rate limited. Try again in ${retryAfter || '60'} seconds.`)
        break

      case 500:
      case 502:
      case 503:
      case 504:
        // Server error
        toast.error('Server error. Please try again later.')
        break

      default:
        if (!error.response) {
          // Network error
          toast.error('Network error. Check your connection.')
        } else {
          toast.error('An unexpected error occurred')
        }
    }

    return Promise.reject(error)
  }
)
```

### 7.2 Error Boundary Strategy

```typescript
// apps/web/src/components/error-boundary.tsx
'use client'

import { ReactNode } from 'react'
import ErrorBoundary from 'react-error-boundary'

interface AppErrorBoundaryProps {
  children: ReactNode
  level?: 'page' | 'section' | 'component'
}

export function AppErrorBoundary({
  children,
  level = 'component',
}: AppErrorBoundaryProps) {
  const fallback =
    level === 'page' ? (
      <FullPageError />
    ) : level === 'section' ? (
      <SectionError />
    ) : (
      <ComponentError />
    )

  return (
    <ErrorBoundary
      FallbackComponent={fallback}
      onError={(error, info) => {
        console.error('Error boundary caught:', error, info)
        // Send to error tracking (Sentry)
      }}
    >
      {children}
    </ErrorBoundary>
  )
}

// Usage
export function IdeasPage() {
  return (
    <AppErrorBoundary level="page">
      <IdeasContainer />
    </AppErrorBoundary>
  )
}

export function IdeasContainer() {
  return (
    <AppErrorBoundary level="section">
      <IdeaList />
    </AppErrorBoundary>
  )
}
```

---

## 8. Offline Support (Mobile/Desktop)

### 8.1 Mutation Queue

```typescript
// packages/hooks/src/use-mutation-queue.ts
import { useEffect, useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'

export interface QueuedMutation {
  id: string
  mutation: () => Promise<any>
  retries: number
}

export function useMutationQueue() {
  const queryClient = useQueryClient()
  const queueRef = useRef<QueuedMutation[]>([])
  const isOnlineRef = useRef(true)

  useEffect(() => {
    const handleOnline = () => {
      isOnlineRef.current = true
      processQueue()
    }

    const handleOffline = () => {
      isOnlineRef.current = false
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const addToQueue = (mutation: () => Promise<any>) => {
    const id = Date.now().toString()
    queueRef.current.push({ id, mutation, retries: 0 })

    if (isOnlineRef.current) {
      processQueue()
    }

    return id
  }

  const processQueue = async () => {
    while (queueRef.current.length > 0 && isOnlineRef.current) {
      const item = queueRef.current[0]

      try {
        await item.mutation()
        queueRef.current.shift()
      } catch (error) {
        if (item.retries < 3) {
          item.retries++
          // Wait before retry
          await new Promise((resolve) => setTimeout(resolve, 1000 * item.retries))
        } else {
          // Max retries reached
          console.error('Mutation failed after retries:', error)
          queueRef.current.shift()
        }
      }
    }
  }

  return { addToQueue, queueLength: queueRef.current.length }
}
```

### 8.2 React Query Persister

```typescript
// packages/hooks/src/use-persisted-cache.ts
import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister'
import { persistQueryClient } from '@tanstack/react-query-persist-client'
import AsyncStorage from '@react-native-async-storage/async-storage'

export function usePersistedCache() {
  const queryClient = useQueryClient()

  useEffect(() => {
    const persister = createAsyncStoragePersister({
      storage: AsyncStorage,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    })

    const unpersist = persistQueryClient({
      queryClient,
      persister,
      maxAge: 24 * 60 * 60 * 1000,
    })

    return () => {
      unpersist()
    }
  }, [queryClient])
}
```

---

## 9. Type Generation

**CRITICAL**: All TypeScript types must be auto-generated from the Go backend OpenAPI spec. Never manually write API response types.

**File: `packages/api-client/scripts/generate-types.ts`**

```typescript
import { generateApi } from 'swagger-typescript-api'
import { promises as fs } from 'fs'
import path from 'path'

async function generateTypes() {
  const apiUrl = process.env.API_URL || 'http://localhost:8080'
  const specUrl = `${apiUrl}/openapi.json`

  console.log(`Generating types from ${specUrl}...`)

  try {
    await generateApi({
      url: specUrl,
      output: path.resolve(__dirname, '../src/types'),
      name: 'api-types.ts',
      httpClientType: 'axios',
      singleHttpClient: true,
      prettier: true,
    })

    console.log('✅ Types generated successfully')
  } catch (error) {
    console.error('Failed to generate types:', error)
    process.exit(1)
  }
}

generateTypes()
```

**In `package.json`:**

```json
{
  "scripts": {
    "generate:types": "ts-node scripts/generate-types.ts",
    "prepare": "npm run generate:types"
  }
}
```

---

## 10. Platform-Specific Differences

### Web (Next.js)

```typescript
// apps/web/src/lib/api.ts
import { createApiClient, createApi } from '@ordo/api-client'

const httpClient = createApiClient({
  baseUrl: process.env.NEXT_PUBLIC_API_URL,
  environment: 'production',
  getAccessToken: () => {
    // httpOnly cookies handled by browser
    return null
  },
  getRefreshToken: () => null,
  setTokens: () => {
    // Browser handles via Set-Cookie
  },
  clearTokens: () => {
    // Browser clears via Set-Cookie
  },
  onUnauthorized: () => {
    window.location.href = '/login'
  },
})

export const api = createApi(httpClient)
```

### Mobile (React Native)

```typescript
// apps/mobile/src/lib/api.ts
import { createApiClient, createApi } from '@ordo/api-client'
import { tokenStorageMobile } from '@ordo/api-client'

const httpClient = createApiClient({
  baseUrl: process.env.EXPO_PUBLIC_API_URL,
  environment: 'production',
  ...tokenStorageMobile,
  onUnauthorized: () => {
    // Navigate to login screen
    navigationRef.reset({ index: 0, routes: [{ name: 'Auth' }] })
  },
})

export const api = createApi(httpClient)
```

### Desktop (Electron)

```typescript
// apps/desktop/src/renderer/lib/api.ts
import { createApiClient, createApi } from '@ordo/api-client'
import { tokenStorageElectron } from '@ordo/api-client'

const httpClient = createApiClient({
  baseUrl: process.env.VITE_API_URL,
  environment: 'production',
  ...tokenStorageElectron,
  onUnauthorized: () => {
    // Navigate to login window
    ipcRenderer.invoke('window:open-auth')
  },
})

export const api = createApi(httpClient)
```

---

## 11. Testing

### API Mocking with MSW

```typescript
// packages/api-client/__tests__/mocks.ts
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'

export const handlers = [
  http.get('/v1/workspaces/:workspaceId/ideas', () => {
    return HttpResponse.json({
      ideas: [
        { id: '1', title: 'Test Idea', score: 75 },
      ],
      pagination: { has_more: false },
    })
  }),

  http.post('/v1/workspaces/:workspaceId/ideas', async ({ request }) => {
    const body = await request.json()
    return HttpResponse.json(
      { id: 'new', ...body },
      { status: 201 }
    )
  }),
]

export const server = setupServer(...handlers)
```

### Hook Testing

```typescript
// packages/hooks/__tests__/use-ideas.test.tsx
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClientProvider, QueryClient } from '@tanstack/react-query'
import { useIdeas } from '../src/use-ideas'
import { server } from '@ordo/api-client/__tests__/mocks'

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

test('useIdeas fetches and returns ideas', async () => {
  const queryClient = new QueryClient()

  const { result } = renderHook(() => useIdeas('workspace-1'), {
    wrapper: ({ children }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    ),
  })

  await waitFor(() => {
    expect(result.current.data).toBeDefined()
  })

  expect(result.current.data?.pages[0].ideas).toHaveLength(1)
})
```

---

## Summary

This Frontend Integration Guide ensures:

1. **Single API Client**: All communication through `@ordo/api-client`
2. **Type Safety**: Auto-generated types from Go OpenAPI spec
3. **Consistent Error Handling**: Centralized error interceptors
4. **Token Management**: Platform-specific secure storage
5. **React Query**: Optimized server state caching
6. **Zustand**: Clean client-only UI state
7. **WebSocket**: Real-time cache updates
8. **Offline Support**: Mutation queues + cache persistence
9. **Testing**: MSW mocks + hook testing patterns

Frontend developers should start by:
1. Reading this guide
2. Reviewing the `@ordo/api-client` package
3. Understanding the three-layer component model
4. Using the query key factory for consistent caching
5. Never making raw API calls

---

**Version**: 1.0
**Last Updated**: March 10, 2026
**Status**: Complete & Ready for Implementation
