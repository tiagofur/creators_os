# Next.js 15+ Project Structure Specification
## Ordo Creator OS Web App

> Detailed project structure, file organization, and conventions for the Next.js 15+ web application with App Router, i18n (en/es/pt), Tailwind CSS, and ShadCN/UI within a Turborepo monorepo.

---

## 1. Monorepo Architecture (Turborepo)

### Root Structure
```
ordo/
├── apps/
│   ├── web/                    # Next.js 15 web app (PRIMARY)
│   ├── mobile/                 # React Native/Expo (separate doc)
│   └── desktop/                # Electron app (P1, separate doc)
│
├── packages/
│   ├── ui/                     # Shared component library (ShadCN-based)
│   ├── hooks/                  # Shared React hooks (React Query, Zustand)
│   ├── stores/                 # Zustand state management stores
│   ├── api-client/             # API client + React Query hooks
│   ├── validations/            # Zod schemas (shared across web/mobile)
│   ├── i18n/                   # Translation files + i18n utilities
│   ├── types/                  # Shared TypeScript types
│   ├── config/                 # Shared configs (eslint, tsconfig, tailwind)
│   └── core/                   # Domain layer (entities, use cases)
│
├── turbo.json                  # Turborepo configuration
├── package.json                # Root workspace package
├── pnpm-workspace.yaml         # PNPM workspace definition
├── .github/
│   └── workflows/              # CI/CD pipelines
├── .gitignore
└── README.md
```

---

## 2. Web App Directory Structure (apps/web/)

### 2.1 Top-Level Files and Directories

```
apps/web/
├── public/                     # Static assets (served at /)
│   ├── locales/                # Static translation fallbacks (optional)
│   ├── icons/                  # App icons, favicon.ico, apple-touch-icon
│   ├── images/                 # Static images (logos, placeholders)
│   └── svg/                    # SVG assets
│
├── src/
│   ├── app/                    # Next.js App Router (main)
│   ├── components/             # React components (web-specific)
│   ├── hooks/                  # Web-specific React hooks
│   ├── lib/                    # Utilities and helpers
│   ├── styles/                 # Global CSS and CSS variables
│   ├── middleware.ts           # Next.js middleware
│   └── env.ts                  # Environment variable validation (Zod)
│
├── .env.example                # Template environment variables
├── .env.local                  # Local environment variables (not committed)
├── .env.development            # Development environment
├── .env.production             # Production environment
│
├── next.config.ts             # Next.js configuration
├── tailwind.config.ts         # Tailwind CSS configuration
├── tsconfig.json              # TypeScript configuration
├── postcss.config.js          # PostCSS configuration
│
├── package.json               # Web app dependencies
├── pnpm-lock.yaml
└── README.md
```

### 2.2 App Router Directory (src/app/)

#### 2.2.1 Root Layout with Locale Segment

```
src/app/
│
├── [locale]/                   # DYNAMIC SEGMENT FOR i18n (en, es, pt)
│   │
│   ├── layout.tsx              # ROOT LAYOUT
│   │                           # - Configures all providers (QueryClient, Theme, i18n)
│   │                           # - Sets up HTML lang attribute
│   │                           # - Renders <RootLayoutContent />
│   │
│   ├── page.tsx                # HOME PAGE (/[locale]/)
│   │                           # - Redirects to /[locale]/dashboard
│   │
│   ├── loading.tsx             # Global loading skeleton (fallback)
│   ├── error.tsx               # Global error boundary
│   ├── not-found.tsx           # 404 page
│   ├── opengraph-image.tsx     # Dynamic OG image generation (optional)
│   ├── robots.txt              # SEO robots.txt
│   ├── sitemap.xml             # SEO sitemap (optional)
│   │
│   ├── (auth)/                 # AUTH ROUTE GROUP (no sidebar/header)
│   │   │
│   │   ├── layout.tsx          # Auth layout
│   │   │                       # - Centered card container
│   │   │                       # - No sidebar
│   │   │                       # - Light/dark mode toggle
│   │   │
│   │   ├── login/
│   │   │   └── page.tsx        # Login page (/[locale]/login)
│   │   │
│   │   ├── register/
│   │   │   └── page.tsx        # Registration page (/[locale]/register)
│   │   │
│   │   ├── forgot-password/
│   │   │   └── page.tsx        # Forgot password page
│   │   │
│   │   └── reset-password/
│   │       ├── page.tsx        # Reset password page
│   │       └── [token]/
│   │           └── page.tsx    # Reset with token (/[locale]/reset-password/[token])
│   │
│   ├── (app)/                  # AUTHENTICATED ROUTE GROUP (with sidebar)
│   │   │
│   │   ├── layout.tsx          # App layout
│   │   │                       # - AppSidebar component
│   │   │                       # - AppHeader component
│   │   │                       # - Main content area
│   │   │                       # - Mobile navigation
│   │   │                       # - Authentication check middleware
│   │   │
│   │   ├── dashboard/
│   │   │   ├── page.tsx        # Dashboard overview (/[locale]/dashboard)
│   │   │   └── loading.tsx     # Dashboard skeleton
│   │   │
│   │   ├── ideas/
│   │   │   ├── page.tsx        # Ideas list page
│   │   │   ├── loading.tsx     # Ideas skeleton
│   │   │   ├── error.tsx       # Ideas error boundary
│   │   │   │
│   │   │   └── [id]/
│   │   │       ├── page.tsx    # Idea detail page (/[locale]/ideas/[id])
│   │   │       ├── edit/
│   │   │       │   └── page.tsx # Idea edit page (/[locale]/ideas/[id]/edit)
│   │   │       └── loading.tsx
│   │   │
│   │   ├── pipeline/
│   │   │   ├── page.tsx        # Kanban board view
│   │   │   ├── loading.tsx     # Pipeline skeleton
│   │   │   │
│   │   │   └── [id]/
│   │   │       ├── page.tsx    # Content detail (/[locale]/pipeline/[id])
│   │   │       ├── edit/
│   │   │       │   └── page.tsx # Content edit (/[locale]/pipeline/[id]/edit)
│   │   │       └── loading.tsx
│   │   │
│   │   ├── series/
│   │   │   ├── page.tsx        # Series list page
│   │   │   ├── loading.tsx     # Series skeleton
│   │   │   │
│   │   │   └── [id]/
│   │   │       ├── page.tsx    # Series detail (/[locale]/series/[id])
│   │   │       ├── edit/
│   │   │       │   └── page.tsx # Series edit
│   │   │       └── loading.tsx
│   │   │
│   │   ├── calendar/
│   │   │   ├── page.tsx        # Calendar view
│   │   │   └── loading.tsx     # Calendar skeleton
│   │   │
│   │   ├── publishing/
│   │   │   ├── page.tsx        # Publishing queue
│   │   │   └── loading.tsx     # Publishing skeleton
│   │   │
│   │   ├── remix/              # Content remixing/repurposing
│   │   │   ├── page.tsx        # Remix dashboard
│   │   │   ├── loading.tsx     # Remix skeleton
│   │   │   │
│   │   │   └── [jobId]/
│   │   │       ├── page.tsx    # Remix job detail (/[locale]/remix/[jobId])
│   │   │       └── loading.tsx
│   │   │
│   │   ├── studio/             # AI Creators Studio (Chat)
│   │   │   ├── page.tsx        # Chat interface
│   │   │   └── loading.tsx     # Chat skeleton
│   │   │
│   │   ├── analytics/
│   │   │   ├── page.tsx        # Analytics overview
│   │   │   ├── loading.tsx     # Analytics skeleton
│   │   │   │
│   │   │   └── [contentId]/
│   │   │       ├── page.tsx    # Content-specific analytics
│   │   │       └── loading.tsx
│   │   │
│   │   ├── consistency/
│   │   │   ├── page.tsx        # Consistency tracking
│   │   │   └── loading.tsx     # Consistency skeleton
│   │   │
│   │   ├── goals/
│   │   │   ├── page.tsx        # Goals list
│   │   │   ├── [id]/
│   │   │   │   └── page.tsx    # Goal detail (/[locale]/goals/[id])
│   │   │   └── loading.tsx
│   │   │
│   │   ├── gamification/
│   │   │   ├── page.tsx        # Gamification dashboard
│   │   │   └── loading.tsx
│   │   │
│   │   ├── reports/
│   │   │   ├── page.tsx        # Reports overview
│   │   │   └── [reportId]/
│   │   │       └── page.tsx    # Report detail
│   │   │
│   │   ├── inbox/
│   │   │   ├── page.tsx        # Inbox (comments, mentions, DMs)
│   │   │   └── loading.tsx
│   │   │
│   │   ├── sponsorships/
│   │   │   ├── page.tsx        # Sponsorships list
│   │   │   ├── loading.tsx     # Sponsorships skeleton
│   │   │   │
│   │   │   └── [id]/
│   │   │       ├── page.tsx    # Sponsorship detail (/[locale]/sponsorships/[id])
│   │   │       ├── edit/
│   │   │       │   └── page.tsx # Sponsorship edit
│   │   │       └── loading.tsx
│   │   │
│   │   ├── newsletter/
│   │   │   ├── page.tsx        # Newsletter management
│   │   │   └── loading.tsx
│   │   │
│   │   ├── automations/
│   │   │   ├── page.tsx        # Automations list
│   │   │   ├── [id]/
│   │   │   │   └── page.tsx    # Automation detail
│   │   │   └── loading.tsx
│   │   │
│   │   ├── webhooks/
│   │   │   ├── page.tsx        # Webhooks management
│   │   │   └── loading.tsx
│   │   │
│   │   ├── graveyard/
│   │   │   ├── page.tsx        # Archived content
│   │   │   └── loading.tsx
│   │   │
│   │   ├── trash/
│   │   │   ├── page.tsx        # Deleted content (recoverable)
│   │   │   └── loading.tsx
│   │   │
│   │   ├── notifications/
│   │   │   ├── page.tsx        # Notifications center
│   │   │   └── loading.tsx
│   │   │
│   │   └── settings/
│   │       ├── page.tsx        # Settings overview (/[locale]/settings)
│   │       ├── profile/
│   │       │   └── page.tsx    # Profile settings
│   │       ├── workspace/
│   │       │   └── page.tsx    # Workspace settings
│   │       ├── billing/
│   │       │   └── page.tsx    # Billing & subscription
│   │       ├── integrations/
│   │       │   └── page.tsx    # Third-party integrations
│   │       ├── team/
│   │       │   └── page.tsx    # Team management
│   │       ├── preferences/
│   │       │   └── page.tsx    # User preferences (theme, language)
│   │       └── security/
│   │           └── page.tsx    # Security & authentication
│   │
│   └── (onboarding)/           # ONBOARDING FLOW (separate layout)
│       │
│       ├── layout.tsx          # Onboarding layout
│       │                       # - Wizard/progressive disclosure
│       │                       # - No sidebar
│       │
│       ├── setup/
│       │   ├── page.tsx        # Onboarding setup wizard
│       │   └── [step]/
│       │       └── page.tsx    # Step-by-step onboarding
│       │
│       └── welcome/
│           └── page.tsx        # Welcome screen
│
├── api/                        # API routes (minimal - mostly webhooks)
│   │
│   └── webhooks/
│       ├── stripe/
│       │   └── route.ts        # Stripe webhook handler
│       ├── github/
│       │   └── route.ts        # GitHub webhook handler
│       └── loom/
│           └── route.ts        # Loom webhook handler
```

---

## 3. Components Directory (src/components/)

### 3.1 Structure

```
src/components/
│
├── layouts/                    # Layout/structural components
│   ├── app-sidebar.tsx        # Persistent sidebar (authenticated area)
│   ├── app-sidebar-items.tsx  # Sidebar menu items
│   ├── app-header.tsx         # App header with search, notifications
│   ├── app-header-right.tsx   # Header right section (notifications, avatar)
│   ├── auth-layout.tsx        # Centered card layout for auth pages
│   ├── mobile-nav.tsx         # Bottom tab bar for mobile
│   ├── content-container.tsx  # Main content area wrapper
│   └── root-layout-content.tsx # Root layout wrapper (providers)
│
├── features/                   # Feature-specific components (grouped by domain)
│   │
│   ├── ideas/
│   │   ├── idea-card.tsx              # Idea card component
│   │   ├── idea-list.tsx              # Ideas grid/list container
│   │   ├── idea-list-skeleton.tsx     # Loading skeleton
│   │   ├── idea-form.tsx              # Create/edit idea form
│   │   ├── idea-filters.tsx           # Filter sidebar
│   │   ├── idea-search.tsx            # Search/sort controls
│   │   ├── idea-detail-view.tsx       # Idea detail page content
│   │   ├── idea-actions-menu.tsx      # Idea context menu
│   │   ├── ideas-page-content.tsx     # Page-level container
│   │   └── ideas-skeleton.tsx         # Full page skeleton
│   │
│   ├── pipeline/
│   │   ├── kanban-board.tsx           # Kanban board container
│   │   ├── kanban-column.tsx          # Single column
│   │   ├── kanban-card.tsx            # Draggable card
│   │   ├── pipeline-card.tsx          # Content card in pipeline
│   │   ├── status-transition.tsx      # Status change UI
│   │   ├── pipeline-filters.tsx       # Column/status filters
│   │   ├── pipeline-page-content.tsx  # Page-level container
│   │   └── pipeline-skeleton.tsx      # Kanban skeleton
│   │
│   ├── studio/                 # AI Creators Studio (Chat)
│   │   ├── chat-interface.tsx         # Main chat layout
│   │   ├── chat-message.tsx           # Single message bubble
│   │   ├── chat-message-list.tsx      # Message history
│   │   ├── chat-input.tsx             # Message input with toolbar
│   │   ├── chat-suggestions.tsx       # Prompt suggestions
│   │   ├── studio-sidebar.tsx         # Chat history/sessions
│   │   ├── studio-page-content.tsx    # Page-level container
│   │   └── studio-skeleton.tsx        # Chat skeleton
│   │
│   ├── analytics/
│   │   ├── analytics-overview.tsx     # Main metrics dashboard
│   │   ├── metric-card.tsx            # Single metric card
│   │   ├── chart-container.tsx        # Generic chart wrapper
│   │   ├── performance-chart.tsx      # Performance metrics
│   │   ├── growth-chart.tsx           # Growth chart
│   │   ├── engagement-chart.tsx       # Engagement metrics
│   │   ├── analytics-filters.tsx      # Date/platform filters
│   │   ├── analytics-page-content.tsx # Page-level container
│   │   └── analytics-skeleton.tsx     # Dashboard skeleton
│   │
│   ├── calendar/
│   │   ├── calendar-view.tsx          # Calendar grid
│   │   ├── calendar-event.tsx         # Event cell
│   │   ├── calendar-sidebar.tsx       # Day/week view switcher
│   │   ├── calendar-day-view.tsx      # Day detail view
│   │   ├── calendar-page-content.tsx  # Page-level container
│   │   └── calendar-skeleton.tsx      # Calendar skeleton
│   │
│   ├── series/
│   │   ├── series-card.tsx            # Series card
│   │   ├── series-list.tsx            # Series list container
│   │   ├── series-form.tsx            # Create/edit series
│   │   ├── series-detail-view.tsx     # Series detail
│   │   ├── series-page-content.tsx    # Page-level container
│   │   └── series-skeleton.tsx        # Series skeleton
│   │
│   ├── publishing/
│   │   ├── publishing-queue.tsx       # Queue list
│   │   ├── publishing-card.tsx        # Queue item
│   │   ├── scheduling-dialog.tsx      # Schedule publish dialog
│   │   ├── publishing-page-content.tsx# Page-level container
│   │   └── publishing-skeleton.tsx    # Queue skeleton
│   │
│   ├── remix/
│   │   ├── remix-dashboard.tsx        # Remix jobs overview
│   │   ├── remix-job-card.tsx         # Job card
│   │   ├── remix-job-detail.tsx       # Job detail view
│   │   ├── remix-form.tsx             # Create remix job
│   │   ├── remix-page-content.tsx     # Page-level container
│   │   └── remix-skeleton.tsx         # Remix skeleton
│   │
│   ├── consistency/
│   │   ├── consistency-tracker.tsx    # Main tracker
│   │   ├── consistency-calendar.tsx   # Habit calendar
│   │   ├── consistency-stats.tsx      # Stats display
│   │   ├── consistency-page-content.tsx # Page-level container
│   │   └── consistency-skeleton.tsx   # Tracker skeleton
│   │
│   ├── goals/
│   │   ├── goals-list.tsx             # Goals list
│   │   ├── goal-card.tsx              # Goal card
│   │   ├── goal-form.tsx              # Create/edit goal
│   │   ├── goal-detail-view.tsx       # Goal detail
│   │   ├── goals-page-content.tsx     # Page-level container
│   │   └── goals-skeleton.tsx         # Goals skeleton
│   │
│   ├── gamification/
│   │   ├── gamification-dashboard.tsx # Badges, points, leaderboard
│   │   ├── badge-card.tsx             # Badge display
│   │   ├── leaderboard.tsx            # Leaderboard view
│   │   ├── points-tracker.tsx         # Points/level display
│   │   ├── gamification-page-content.tsx # Page-level container
│   │   └── gamification-skeleton.tsx  # Dashboard skeleton
│   │
│   ├── reports/
│   │   ├── reports-list.tsx           # Reports list
│   │   ├── report-card.tsx            # Report card
│   │   ├── report-detail-view.tsx     # Report full view
│   │   ├── report-generator.tsx       # Generate report dialog
│   │   ├── reports-page-content.tsx   # Page-level container
│   │   └── reports-skeleton.tsx       # Reports skeleton
│   │
│   ├── inbox/
│   │   ├── inbox-list.tsx             # Messages/comments list
│   │   ├── inbox-item.tsx             # Single item
│   │   ├── inbox-detail.tsx           # Item detail/thread
│   │   ├── inbox-filters.tsx          # Message type filters
│   │   ├── inbox-page-content.tsx     # Page-level container
│   │   └── inbox-skeleton.tsx         # Inbox skeleton
│   │
│   ├── sponsorships/
│   │   ├── sponsorships-list.tsx      # Sponsorships list
│   │   ├── sponsorship-card.tsx       # Sponsorship card
│   │   ├── sponsorship-form.tsx       # Create/edit sponsorship
│   │   ├── sponsorship-detail.tsx     # Sponsorship detail
│   │   ├── sponsorships-page-content.tsx # Page-level container
│   │   └── sponsorships-skeleton.tsx  # List skeleton
│   │
│   ├── newsletter/
│   │   ├── newsletter-editor.tsx      # Newsletter builder
│   │   ├── newsletter-preview.tsx     # Preview
│   │   ├── subscriber-list.tsx        # Subscribers list
│   │   ├── newsletter-page-content.tsx # Page-level container
│   │   └── newsletter-skeleton.tsx    # Editor skeleton
│   │
│   ├── automations/
│   │   ├── automations-list.tsx       # Automations list
│   │   ├── automation-card.tsx        # Automation card
│   │   ├── automation-builder.tsx     # Build automation (conditionals)
│   │   ├── automation-detail.tsx      # Detail view
│   │   ├── automations-page-content.tsx # Page-level container
│   │   └── automations-skeleton.tsx   # List skeleton
│   │
│   ├── webhooks/
│   │   ├── webhooks-list.tsx          # Webhooks list
│   │   ├── webhook-card.tsx           # Webhook card
│   │   ├── webhook-form.tsx           # Create/edit webhook
│   │   ├── webhook-logs.tsx           # Webhook event logs
│   │   ├── webhooks-page-content.tsx  # Page-level container
│   │   └── webhooks-skeleton.tsx      # List skeleton
│   │
│   ├── graveyard/
│   │   ├── graveyard-list.tsx         # Archived content list
│   │   ├── graveyard-card.tsx         # Content card
│   │   ├── graveyard-page-content.tsx # Page-level container
│   │   └── graveyard-skeleton.tsx     # List skeleton
│   │
│   ├── trash/
│   │   ├── trash-list.tsx             # Deleted items list
│   │   ├── trash-item.tsx             # Trash item card
│   │   ├── trash-recovery.tsx         # Recovery options
│   │   ├── trash-page-content.tsx     # Page-level container
│   │   └── trash-skeleton.tsx         # List skeleton
│   │
│   ├── notifications/
│   │   ├── notifications-list.tsx     # All notifications
│   │   ├── notification-item.tsx      # Single notification
│   │   ├── notifications-filter.tsx   # Filter by type
│   │   ├── notifications-page-content.tsx # Page-level container
│   │   └── notifications-skeleton.tsx # List skeleton
│   │
│   ├── auth/
│   │   ├── login-form.tsx             # Login form (email + password)
│   │   ├── register-form.tsx          # Registration form
│   │   ├── oauth-button.tsx           # Google/GitHub OAuth button
│   │   ├── forgot-password-form.tsx   # Forgot password form
│   │   ├── reset-password-form.tsx    # Reset password form
│   │   ├── auth-divider.tsx           # "Or continue with" divider
│   │   └── auth-sidebar.tsx           # Auth page sidebar (design elements)
│   │
│   └── settings/
│       ├── profile-form.tsx           # Profile settings form
│       ├── workspace-settings.tsx     # Workspace config
│       ├── billing-overview.tsx       # Billing/subscription
│       ├── integration-card.tsx       # Third-party integration card
│       ├── integrations-list.tsx      # Integrations list
│       ├── team-members-list.tsx      # Team management
│       ├── invite-member-dialog.tsx   # Invite dialog
│       ├── preferences-form.tsx       # Language, theme, etc.
│       ├── security-settings.tsx      # 2FA, password change
│       ├── settings-nav.tsx           # Settings sidebar nav
│       ├── settings-page-content.tsx  # Page-level container
│       └── settings-skeleton.tsx      # Settings skeleton
│
├── shared/                     # Shared components (web-specific, not in packages/ui)
│   ├── command-palette.tsx            # Cmd+K command palette
│   ├── command-palette-items.tsx      # Command list
│   ├── quick-capture.tsx              # Quick idea capture modal
│   ├── quick-capture-form.tsx         # Capture form
│   ├── notification-center.tsx        # Notification bell popup
│   ├── notification-toast.tsx         # Toast notifications (wrapper)
│   ├── workspace-switcher.tsx         # Workspace dropdown
│   ├── search-bar.tsx                 # Global search
│   ├── timer-widget.tsx               # Pomodoro timer
│   ├── theme-switcher.tsx             # Light/dark mode toggle
│   ├── language-switcher.tsx          # i18n language selector
│   ├── breadcrumb.tsx                 # Breadcrumb navigation
│   └── skip-to-content.tsx            # A11y skip link
│
└── ui/                         # ShadCN/UI base components (if overridden locally)
    ├── button.tsx              # Re-export from packages/ui
    ├── card.tsx
    ├── dialog.tsx
    └── ...
```

---

## 4. Hooks Directory (src/hooks/)

```
src/hooks/
├── use-keyboard-shortcuts.ts   # Global keyboard shortcuts (Cmd+K, Cmd+S, etc)
├── use-media-query.ts          # Responsive design (mobile, tablet, desktop)
├── use-sidebar.ts              # Sidebar open/close state
├── use-locale.ts               # Current locale hook
├── use-translations.ts         # i18n translations hook (wrapper)
├── use-window-size.ts          # Window dimensions
├── use-debounce.ts             # Debounce utility hook
├── use-throttle.ts             # Throttle utility hook
├── use-intersection-observer.ts # Intersection observer
├── use-local-storage.ts        # Persistent local storage
├── use-previous.ts             # Previous value tracking
├── use-auth.ts                 # Auth context hook
└── use-workspace.ts            # Current workspace context hook
```

---

## 5. Library Directory (src/lib/)

```
src/lib/
├── auth.ts                     # Authentication helpers
│                              # - Token storage (localStorage, httpOnly)
│                              # - Token refresh logic
│                              # - Session validation
│
├── providers.tsx               # All React providers
│                              # - QueryClientProvider
│                              # - ThemeProvider (next-themes)
│                              # - I18nProvider
│                              # - ToastProvider
│
├── api.ts                      # API client configuration
│                              # - Base URL setup
│                              # - Request/response interceptors
│                              # - Error handling
│
├── utils.ts                    # General utilities
│                              # - cn() classname merger
│                              # - formatDate()
│                              # - slugify()
│                              # - truncate()
│
├── constants.ts                # Application constants
│                              # - Route paths
│                              # - Feature flags
│                              # - Pagination limits
│
├── routes.ts                   # Type-safe route generation
│                              # - routes.dashboard(locale)
│                              # - routes.ideas.list(locale)
│                              # - routes.ideas.detail(locale, id)
│
├── format.ts                   # Formatting utilities
│                              # - formatDate()
│                              # - formatTime()
│                              # - formatNumber()
│                              # - formatFileSize()
│
├── validation.ts               # Validation helpers (Zod)
│                              # - parseFormData()
│                              # - validateEmail()
│
└── errors.ts                   # Error handling
                               # - AppError class
                               # - ApiError class
                               # - Error codes/messages
```

---

## 6. Styles Directory (src/styles/)

```
src/styles/
├── globals.css                 # Global Tailwind directives
│                              # @tailwind base, components, utilities
│                              # CSS variables for colors, spacing
│                              # Dark mode configuration
│
├── animations.css              # Reusable animations
│                              # Fade, slide, scale, pulse
│
├── variables.css               # CSS custom properties
│                              # Color palette
│                              # Spacing scale
│                              # Typography scale
│
└── typography.css              # Typography utilities
                               # Heading styles
                               # Prose formatting
```

---

## 7. File Naming Conventions

| Type | Convention | Example | Export |
|------|-----------|---------|--------|
| Page component | Next.js: `page.tsx` | `page.tsx` | Default export |
| Layout component | Next.js: `layout.tsx` | `layout.tsx` | Default export |
| Error boundary | Next.js: `error.tsx` | `error.tsx` | Default export |
| Loading skeleton | Next.js: `loading.tsx` | `loading.tsx` | Default export |
| Not found page | Next.js: `not-found.tsx` | `not-found.tsx` | Default export |
| Component | kebab-case | `idea-card.tsx` | PascalCase export |
| Hook | camelCase + `use-` | `use-keyboard-shortcuts.ts` | Named export |
| Utility function | kebab-case | `format-date.ts` | Named export |
| Type definition | kebab-case | `idea-types.ts` | Type exports |
| Constant file | kebab-case | `api-endpoints.ts` | Named export |
| API route | Next.js: `route.ts` | `route.ts` | Handler export |
| Test file | same + `.test.tsx` | `idea-card.test.tsx` | Test suite |

---

## 8. Import Order Convention

Follow this order in all files:

```typescript
// 1. React and Next.js
import { useState, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Suspense } from 'react'

// 2. Third-party libraries
import { useQuery, useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

// 3. Monorepo packages (absolute imports with @ordo)
import { Button, Card, Dialog } from '@ordo/ui'
import { useIdeas, useCreateIdea } from '@ordo/api-client'
import { useIdeaStore } from '@ordo/stores'
import { ideaSchema, createIdeaSchema } from '@ordo/validations'
import { tailwindConfig } from '@ordo/config'
import type { Idea, CreateIdeaPayload } from '@ordo/types'

// 4. Local imports (absolute imports with @/)
import { IdeaCard } from '@/components/features/ideas/idea-card'
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts'
import { cn } from '@/lib/utils'
import { IDEA_ROUTES } from '@/lib/constants'

// 5. CSS imports (last)
import '@/styles/globals.css'
```

---

## 9. Page Component Pattern

### Standard Page Structure

```typescript
// File: src/app/[locale]/(app)/ideas/page.tsx
import { Suspense } from 'react'
import type { Metadata } from 'next'

import { IdeasPageContent } from '@/components/features/ideas/ideas-page-content'
import { IdeasSkeleton } from '@/components/features/ideas/ideas-skeleton'

export const metadata: Metadata = {
  title: 'Ideas | Ordo Creator OS',
  description: 'Capture and organize your creative ideas',
}

export const revalidate = 60 // ISR: revalidate every 60 seconds

export default function IdeasPage() {
  return (
    <Suspense fallback={<IdeasSkeleton />}>
      <IdeasPageContent />
    </Suspense>
  )
}
```

### Page Container (Client Component) Pattern

```typescript
// File: src/components/features/ideas/ideas-page-content.tsx
'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'

import { useIdeas } from '@ordo/api-client'
import { ideaSchema } from '@ordo/validations'

import { IdeaList } from './idea-list'
import { IdeaFilters } from './idea-filters'

export function IdeasPageContent() {
  const t = useTranslations('ideas')
  const router = useRouter()
  const [filters, setFilters] = useState({})

  const { data: ideas, isLoading, error } = useIdeas(filters)

  const handleIdeaClick = useCallback((id: string) => {
    router.push(`/ideas/${id}`)
  }, [router])

  if (error) return <div>{t('error.load')}</div>

  return (
    <div className="space-y-6">
      <IdeaFilters value={filters} onChange={setFilters} />
      <IdeaList ideas={ideas} isLoading={isLoading} onSelectIdea={handleIdeaClick} />
    </div>
  )
}
```

---

## 10. Server vs Client Components Strategy

| Type | Location | Role | Rules |
|------|----------|------|-------|
| **Pages** | `page.tsx` | Entry point | Server by default |
| **Layouts** | `layout.tsx` | Structure | Server by default (can wrap client) |
| **Data Fetching** | Pages/Layouts | Load data | Server only |
| **Interactive Sections** | Feature components | Interactivity | 'use client' directive |
| **Leaf Components** | UI components | Pure rendering | No directive (shared across) |
| **Hooks Usage** | Client components | useState, useEffect | 'use client' required |
| **API Calls** | Server actions + client hooks | Data mutation | Use server actions or React Query |

### Recommended Pattern: Server Page → Client Container → Pure UI

```
page.tsx (server)
  └── PageContent (client) [use client]
      ├── Container (client) [use client]
      │   ├── Card (pure, no directive) ← reusable
      │   ├── Card (pure, no directive)
      │   └── Form (client) [use client]
      │       └── Input (pure, no directive)
      └── Sidebar (pure, no directive)
```

---

## 11. Middleware Configuration

### Middleware File: src/middleware.ts

```typescript
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse, type NextRequest } from 'next/server'

// Locales configuration
const locales = ['en', 'es', 'pt']
const defaultLocale = 'en'

// Public routes (no auth required)
const publicRoutes = ['/', '/login', '/register', '/forgot-password']

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // 1. Locale handling
  const localePatternMatch = pathname.match(/^\/(en|es|pt)($|\/)/)?.[1]
  const locale = localePatternMatch || defaultLocale

  // Redirect missing locale
  if (!localePatternMatch && !publicRoutes.includes(pathname)) {
    const newUrl = new URL(`/${locale}${pathname}`, request.url)
    return NextResponse.redirect(newUrl)
  }

  // 2. Authentication check for protected routes
  const supabase = createMiddlewareClient({ req: request, res: NextResponse.next() })
  const { data: { session } } = await supabase.auth.getSession()

  const protectedRoutes = ['/dashboard', '/ideas', '/pipeline', '/settings']
  const isProtectedRoute = protectedRoutes.some(route =>
    pathname.includes(route)
  )

  if (isProtectedRoute && !session) {
    return NextResponse.redirect(new URL(`/${locale}/login`, request.url))
  }

  // Allow public routes
  if (publicRoutes.some(route => pathname.includes(route)) && session) {
    return NextResponse.redirect(new URL(`/${locale}/dashboard`, request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
}
```

---

## 12. Environment Variables

### Required Environment Variables

```bash
# Public (exposed to browser)
NEXT_PUBLIC_API_URL=http://localhost:8080/v1
NEXT_PUBLIC_WS_URL=ws://localhost:8080/v1/ws
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
NEXT_PUBLIC_GOOGLE_CLIENT_ID=...
NEXT_PUBLIC_GITHUB_CLIENT_ID=...
NEXT_PUBLIC_SENTRY_DSN=https://...

# Secret (server-only)
STRIPE_SECRET_KEY=sk_test_...
GOOGLE_CLIENT_SECRET=...
GITHUB_CLIENT_SECRET=...
SUPABASE_URL=https://...
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
JWT_SECRET=...
ENCRYPTION_KEY=...
```

### Environment Configuration File: .env.example

```bash
# Rename to .env.local for development

# ============ PUBLIC VARIABLES ============
NEXT_PUBLIC_API_URL=http://localhost:8080/v1
NEXT_PUBLIC_WS_URL=ws://localhost:8080/v1/ws
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Auth
NEXT_PUBLIC_GOOGLE_CLIENT_ID=
NEXT_PUBLIC_GITHUB_CLIENT_ID=

# Payments
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=

# Monitoring
NEXT_PUBLIC_SENTRY_DSN=

# ============ SECRET VARIABLES (SERVER-ONLY) ============
STRIPE_SECRET_KEY=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_SECRET=

# Database
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Secrets
JWT_SECRET=
ENCRYPTION_KEY=
```

### Environment Validation: src/env.ts

```typescript
import { z } from 'zod'

const envSchema = z.object({
  NEXT_PUBLIC_API_URL: z.string().url(),
  NEXT_PUBLIC_WS_URL: z.string().url(),
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string(),
  NEXT_PUBLIC_GOOGLE_CLIENT_ID: z.string(),
  STRIPE_SECRET_KEY: z.string().optional(),
  SUPABASE_URL: z.string().url().optional(),
})

export const env = envSchema.parse(process.env)
```

---

## 13. Configuration Files

### 13.1 Next.js Configuration (next.config.ts)

```typescript
import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./src/i18n.ts')

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // Enable optimizations
  swcMinify: true,
  experimental: {
    optimizePackageImports: ['@ordo/ui', '@ordo/hooks'],
  },

  // Image optimization
  images: {
    remotePatterns: [
      { hostname: 'cdn.example.com' },
      { hostname: '*.supabase.co' },
    ],
    formats: ['image/avif', 'image/webp'],
  },

  // Redirects for old URLs
  redirects: async () => [
    {
      source: '/old-path/:path*',
      destination: '/new-path/:path*',
      permanent: true,
    },
  ],

  // Environment variables
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  },
}

export default withNextIntl(nextConfig)
```

### 13.2 Tailwind Configuration (tailwind.config.ts)

```typescript
import type { Config } from 'tailwindcss'
import defaultTheme from 'tailwindcss/defaultTheme'
import { baseConfig } from '@ordo/config/tailwind'

const config: Config = {
  ...baseConfig,
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-sans)', ...defaultTheme.fontFamily.sans],
        mono: ['var(--font-mono)', ...defaultTheme.fontFamily.mono],
      },
      colors: {
        brand: {
          50: 'hsl(var(--color-brand-50))',
          // ... other shades
        },
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}

export default config
```

### 13.3 TypeScript Configuration (tsconfig.json)

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "strict": true,
    "esModuleInterop": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@/stores/*": ["./src/stores/*"],
      "@/components/*": ["./src/components/*"],
      "@/hooks/*": ["./src/hooks/*"],
      "@/lib/*": ["./src/lib/*"],
      "@/features/*": ["./src/features/*"],
      "@/styles/*": ["./src/styles/*"],
      "@ordo/*": ["../../packages/*/src"]
    },
    "plugins": [
      { "name": "next" }
    ]
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

### 13.4 PostCSS Configuration (postcss.config.js)

```javascript
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

---

## 14. Package.json Structure

```json
{
  "name": "@ordo/web",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev -p 3000",
    "build": "next build",
    "start": "next start",
    "lint": "eslint . --max-warnings 0",
    "type-check": "tsc --noEmit",
    "test": "vitest",
    "test:ui": "vitest --ui",
    "format": "prettier --write .",
    "storybook": "storybook dev -p 6006",
    "storybook:build": "storybook build"
  },
  "dependencies": {
    "@ordo/ui": "workspace:*",
    "@ordo/hooks": "workspace:*",
    "@ordo/stores": "workspace:*",
    "@ordo/api-client": "workspace:*",
    "@ordo/validations": "workspace:*",
    "@ordo/types": "workspace:*",
    "@ordo/i18n": "workspace:*",
    "@ordo/config": "workspace:*",
    "next": "^15.1.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "next-intl": "^3.0.0",
    "@tanstack/react-query": "^5.0.0",
    "zustand": "^4.4.0",
    "react-hook-form": "^7.50.0",
    "zod": "^3.22.0",
    "tailwindcss": "^3.4.0",
    "next-themes": "^0.2.1",
    "date-fns": "^2.30.0"
  },
  "devDependencies": {
    "typescript": "^5.3.0",
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@types/node": "^20.0.0",
    "eslint": "^8.50.0",
    "eslint-config-next": "^15.1.0",
    "prettier": "^3.1.0",
    "vitest": "^1.0.0",
    "@testing-library/react": "^14.1.0"
  }
}
```

---

## 15. Getting Started Guide

### Development Setup

```bash
# From repository root
cd apps/web

# Install dependencies (already done by root pnpm install)
pnpm install

# Create .env.local from .env.example
cp .env.example .env.local

# Update environment variables
# Edit .env.local with your API URL, keys, etc.

# Start development server (port 3000)
pnpm dev
```

### Building for Production

```bash
# From repository root
pnpm build

# Run production server
pnpm start
```

### Project Commands

```bash
# Development
pnpm dev              # Start dev server at http://localhost:3000

# Testing
pnpm test             # Run all tests
pnpm test:ui          # UI test dashboard

# Code Quality
pnpm lint             # ESLint
pnpm type-check       # TypeScript
pnpm format           # Prettier

# Building
pnpm build            # Next.js build
pnpm start            # Start production server

# Documentation
pnpm storybook        # Start Storybook at http://localhost:6006
pnpm storybook:build  # Build Storybook
```

---

## 16. Key Conventions Summary

### File Organization Principles
1. **Colocation**: Place files close to where they're used
2. **Feature folders**: Group by domain (ideas, pipeline, analytics)
3. **Scalability**: Deep nesting for large features is acceptable
4. **Clarity**: Filename should indicate purpose

### Naming Principles
- **Components**: kebab-case filename, PascalCase export
- **Hooks**: use-kebab-case
- **Utilities**: kebab-case
- **Next.js special files**: lowercase exact names (page.tsx, layout.tsx)

### Code Organization Principles
1. **Server-first**: Pages are servers by default
2. **Client-deep**: 'use client' on interactive components only
3. **Props-over-hooks**: Prefer passing props to using shared state
4. **Separation**: Domain logic → packages/core, UI logic → components

### Import Principles
- React/Next.js first
- Third-party packages second
- Monorepo packages third (@ordo/*)
- Local imports last (@/*)
- CSS imports at the very end

---

## 17. File Size Limits & Performance

| Type | Recommended Max | Notes |
|------|-----------------|-------|
| Page component | 150 lines | Extract containers |
| Container component | 200 lines | Extract features |
| Feature component | 100 lines | Extract UI components |
| Utility file | 200 lines | Split by domain |
| Hooks file | 100 lines | One hook per file |

---

## 18. Documentation & Examples

Refer to the following documents for implementation details:
- **Architecture**: `/prd/03-frontend-guidelines/01-architecture.md`
- **Information Architecture**: `/prd/01-product/04-information-architecture.md`
- **Component Library Setup**: `/prd/12-frontend-setup/02-shadcn-ui-setup.md` (pending)
- **i18n Configuration**: `/prd/12-frontend-setup/03-i18n-setup.md` (pending)
- **API Client & Hooks**: `/prd/12-frontend-setup/04-api-client-setup.md` (pending)
- **State Management**: `/prd/12-frontend-setup/05-zustand-stores.md` (pending)
- **Testing Strategy**: `/prd/12-frontend-setup/06-testing-setup.md` (pending)

---

## 19. Appendix: Complete File Tree Reference

```
ordo/
├── apps/
│   └── web/
│       ├── public/
│       │   ├── locales/
│       │   ├── icons/
│       │   │   ├── favicon.ico
│       │   │   ├── apple-touch-icon.png
│       │   │   └── favicon-16x16.png
│       │   ├── images/
│       │   │   ├── logo.svg
│       │   │   ├── logo-dark.svg
│       │   │   └── placeholder.png
│       │   └── svg/
│       │       ├── illustration-empty-state.svg
│       │       └── pattern-background.svg
│       │
│       ├── src/
│       │   ├── app/
│       │   │   ├── [locale]/
│       │   │   │   ├── layout.tsx
│       │   │   │   ├── page.tsx
│       │   │   │   ├── loading.tsx
│       │   │   │   ├── error.tsx
│       │   │   │   ├── not-found.tsx
│       │   │   │   ├── (auth)/
│       │   │   │   │   ├── layout.tsx
│       │   │   │   │   ├── login/page.tsx
│       │   │   │   │   ├── register/page.tsx
│       │   │   │   │   ├── forgot-password/page.tsx
│       │   │   │   │   └── reset-password/[token]/page.tsx
│       │   │   │   ├── (app)/
│       │   │   │   │   ├── layout.tsx
│       │   │   │   │   ├── dashboard/
│       │   │   │   │   │   ├── page.tsx
│       │   │   │   │   │   └── loading.tsx
│       │   │   │   │   ├── ideas/
│       │   │   │   │   │   ├── page.tsx
│       │   │   │   │   │   ├── loading.tsx
│       │   │   │   │   │   ├── error.tsx
│       │   │   │   │   │   └── [id]/
│       │   │   │   │   │       ├── page.tsx
│       │   │   │   │   │       ├── edit/page.tsx
│       │   │   │   │   │       └── loading.tsx
│       │   │   │   │   ├── pipeline/
│       │   │   │   │   │   ├── page.tsx
│       │   │   │   │   │   ├── loading.tsx
│       │   │   │   │   │   └── [id]/
│       │   │   │   │   │       ├── page.tsx
│       │   │   │   │   │       ├── edit/page.tsx
│       │   │   │   │   │       └── loading.tsx
│       │   │   │   │   ├── series/
│       │   │   │   │   │   ├── page.tsx
│       │   │   │   │   │   ├── loading.tsx
│       │   │   │   │   │   └── [id]/
│       │   │   │   │   │       ├── page.tsx
│       │   │   │   │   │       ├── edit/page.tsx
│       │   │   │   │   │       └── loading.tsx
│       │   │   │   │   ├── calendar/
│       │   │   │   │   │   ├── page.tsx
│       │   │   │   │   │   └── loading.tsx
│       │   │   │   │   ├── publishing/
│       │   │   │   │   │   ├── page.tsx
│       │   │   │   │   │   └── loading.tsx
│       │   │   │   │   ├── remix/
│       │   │   │   │   │   ├── page.tsx
│       │   │   │   │   │   ├── loading.tsx
│       │   │   │   │   │   └── [jobId]/
│       │   │   │   │   │       ├── page.tsx
│       │   │   │   │   │       └── loading.tsx
│       │   │   │   │   ├── studio/
│       │   │   │   │   │   ├── page.tsx
│       │   │   │   │   │   └── loading.tsx
│       │   │   │   │   ├── analytics/
│       │   │   │   │   │   ├── page.tsx
│       │   │   │   │   │   ├── loading.tsx
│       │   │   │   │   │   └── [contentId]/
│       │   │   │   │   │       ├── page.tsx
│       │   │   │   │   │       └── loading.tsx
│       │   │   │   │   ├── consistency/
│       │   │   │   │   │   ├── page.tsx
│       │   │   │   │   │   └── loading.tsx
│       │   │   │   │   ├── goals/
│       │   │   │   │   │   ├── page.tsx
│       │   │   │   │   │   ├── loading.tsx
│       │   │   │   │   │   └── [id]/
│       │   │   │   │   │       ├── page.tsx
│       │   │   │   │   │       └── loading.tsx
│       │   │   │   │   ├── gamification/
│       │   │   │   │   │   ├── page.tsx
│       │   │   │   │   │   └── loading.tsx
│       │   │   │   │   ├── reports/
│       │   │   │   │   │   ├── page.tsx
│       │   │   │   │   │   ├── loading.tsx
│       │   │   │   │   │   └── [reportId]/
│       │   │   │   │   │       ├── page.tsx
│       │   │   │   │   │       └── loading.tsx
│       │   │   │   │   ├── inbox/
│       │   │   │   │   │   ├── page.tsx
│       │   │   │   │   │   └── loading.tsx
│       │   │   │   │   ├── sponsorships/
│       │   │   │   │   │   ├── page.tsx
│       │   │   │   │   │   ├── loading.tsx
│       │   │   │   │   │   └── [id]/
│       │   │   │   │   │       ├── page.tsx
│       │   │   │   │   │       ├── edit/page.tsx
│       │   │   │   │   │       └── loading.tsx
│       │   │   │   │   ├── newsletter/
│       │   │   │   │   │   ├── page.tsx
│       │   │   │   │   │   └── loading.tsx
│       │   │   │   │   ├── automations/
│       │   │   │   │   │   ├── page.tsx
│       │   │   │   │   │   ├── loading.tsx
│       │   │   │   │   │   └── [id]/
│       │   │   │   │   │       ├── page.tsx
│       │   │   │   │   │       └── loading.tsx
│       │   │   │   │   ├── webhooks/
│       │   │   │   │   │   ├── page.tsx
│       │   │   │   │   │   └── loading.tsx
│       │   │   │   │   ├── graveyard/
│       │   │   │   │   │   ├── page.tsx
│       │   │   │   │   │   └── loading.tsx
│       │   │   │   │   ├── trash/
│       │   │   │   │   │   ├── page.tsx
│       │   │   │   │   │   └── loading.tsx
│       │   │   │   │   ├── notifications/
│       │   │   │   │   │   ├── page.tsx
│       │   │   │   │   │   └── loading.tsx
│       │   │   │   │   └── settings/
│       │   │   │   │       ├── page.tsx
│       │   │   │   │       ├── profile/page.tsx
│       │   │   │   │       ├── workspace/page.tsx
│       │   │   │   │       ├── billing/page.tsx
│       │   │   │   │       ├── integrations/page.tsx
│       │   │   │   │       ├── team/page.tsx
│       │   │   │   │       ├── preferences/page.tsx
│       │   │   │   │       └── security/page.tsx
│       │   │   │   │
│       │   │   │   └── (onboarding)/
│       │   │   │       ├── layout.tsx
│       │   │   │       ├── setup/
│       │   │   │       │   └── page.tsx
│       │   │   │       ├── [step]/
│       │   │   │       │   └── page.tsx
│       │   │   │       └── welcome/page.tsx
│       │   │   │
│       │   │   └── api/
│       │   │       └── webhooks/
│       │   │           ├── stripe/route.ts
│       │   │           ├── github/route.ts
│       │   │           └── loom/route.ts
│       │   │
│       │   ├── components/
│       │   │   ├── layouts/
│       │   │   │   ├── app-sidebar.tsx
│       │   │   │   ├── app-sidebar-items.tsx
│       │   │   │   ├── app-header.tsx
│       │   │   │   ├── app-header-right.tsx
│       │   │   │   ├── auth-layout.tsx
│       │   │   │   ├── mobile-nav.tsx
│       │   │   │   ├── content-container.tsx
│       │   │   │   └── root-layout-content.tsx
│       │   │   │
│       │   │   ├── features/
│       │   │   │   ├── ideas/
│       │   │   │   │   ├── idea-card.tsx
│       │   │   │   │   ├── idea-list.tsx
│       │   │   │   │   ├── idea-list-skeleton.tsx
│       │   │   │   │   ├── idea-form.tsx
│       │   │   │   │   ├── idea-filters.tsx
│       │   │   │   │   ├── idea-search.tsx
│       │   │   │   │   ├── idea-detail-view.tsx
│       │   │   │   │   ├── idea-actions-menu.tsx
│       │   │   │   │   ├── ideas-page-content.tsx
│       │   │   │   │   └── ideas-skeleton.tsx
│       │   │   │   │
│       │   │   │   ├── pipeline/
│       │   │   │   │   ├── kanban-board.tsx
│       │   │   │   │   ├── kanban-column.tsx
│       │   │   │   │   ├── kanban-card.tsx
│       │   │   │   │   ├── pipeline-card.tsx
│       │   │   │   │   ├── status-transition.tsx
│       │   │   │   │   ├── pipeline-filters.tsx
│       │   │   │   │   ├── pipeline-page-content.tsx
│       │   │   │   │   └── pipeline-skeleton.tsx
│       │   │   │   │
│       │   │   │   ├── studio/
│       │   │   │   │   ├── chat-interface.tsx
│       │   │   │   │   ├── chat-message.tsx
│       │   │   │   │   ├── chat-message-list.tsx
│       │   │   │   │   ├── chat-input.tsx
│       │   │   │   │   ├── chat-suggestions.tsx
│       │   │   │   │   ├── studio-sidebar.tsx
│       │   │   │   │   ├── studio-page-content.tsx
│       │   │   │   │   └── studio-skeleton.tsx
│       │   │   │   │
│       │   │   │   ├── analytics/
│       │   │   │   │   ├── analytics-overview.tsx
│       │   │   │   │   ├── metric-card.tsx
│       │   │   │   │   ├── chart-container.tsx
│       │   │   │   │   ├── performance-chart.tsx
│       │   │   │   │   ├── growth-chart.tsx
│       │   │   │   │   ├── engagement-chart.tsx
│       │   │   │   │   ├── analytics-filters.tsx
│       │   │   │   │   ├── analytics-page-content.tsx
│       │   │   │   │   └── analytics-skeleton.tsx
│       │   │   │   │
│       │   │   │   └── [other-features]/
│       │   │   │       └── ...
│       │   │   │
│       │   │   ├── shared/
│       │   │   │   ├── command-palette.tsx
│       │   │   │   ├── command-palette-items.tsx
│       │   │   │   ├── quick-capture.tsx
│       │   │   │   ├── quick-capture-form.tsx
│       │   │   │   ├── notification-center.tsx
│       │   │   │   ├── notification-toast.tsx
│       │   │   │   ├── workspace-switcher.tsx
│       │   │   │   ├── search-bar.tsx
│       │   │   │   ├── timer-widget.tsx
│       │   │   │   ├── theme-switcher.tsx
│       │   │   │   ├── language-switcher.tsx
│       │   │   │   ├── breadcrumb.tsx
│       │   │   │   └── skip-to-content.tsx
│       │   │   │
│       │   │   └── ui/
│       │   │       ├── button.tsx
│       │   │       ├── card.tsx
│       │   │       ├── dialog.tsx
│       │   │       └── ... (ShadCN re-exports)
│       │   │
│       │   ├── hooks/
│       │   │   ├── use-keyboard-shortcuts.ts
│       │   │   ├── use-media-query.ts
│       │   │   ├── use-sidebar.ts
│       │   │   ├── use-locale.ts
│       │   │   ├── use-translations.ts
│       │   │   ├── use-window-size.ts
│       │   │   ├── use-debounce.ts
│       │   │   ├── use-throttle.ts
│       │   │   ├── use-intersection-observer.ts
│       │   │   ├── use-local-storage.ts
│       │   │   ├── use-previous.ts
│       │   │   ├── use-auth.ts
│       │   │   └── use-workspace.ts
│       │   │
│       │   ├── lib/
│       │   │   ├── auth.ts
│       │   │   ├── providers.tsx
│       │   │   ├── api.ts
│       │   │   ├── utils.ts
│       │   │   ├── constants.ts
│       │   │   ├── routes.ts
│       │   │   ├── format.ts
│       │   │   ├── validation.ts
│       │   │   └── errors.ts
│       │   │
│       │   ├── styles/
│       │   │   ├── globals.css
│       │   │   ├── animations.css
│       │   │   ├── variables.css
│       │   │   └── typography.css
│       │   │
│       │   ├── middleware.ts
│       │   ├── env.ts
│       │   └── i18n.ts (configured in next.config.ts)
│       │
│       ├── .env.example
│       ├── .env.local
│       ├── next.config.ts
│       ├── tailwind.config.ts
│       ├── tsconfig.json
│       ├── postcss.config.js
│       ├── package.json
│       ├── pnpm-lock.yaml
│       └── README.md
│
└── packages/
    ├── ui/
    ├── hooks/
    ├── stores/
    ├── api-client/
    ├── validations/
    ├── i18n/
    ├── types/
    ├── config/
    └── core/
```

---

## 20. Next Steps

This specification provides the complete structure for the Next.js 15+ web application. The following setup documents should be created:

1. **ShadCN/UI Setup**: Component library configuration and component registration
2. **i18n Configuration**: next-intl setup with en/es/pt locales
3. **API Client & Hooks**: React Query setup with Supabase integration
4. **Zustand Stores**: State management store definitions
5. **Testing Setup**: Vitest, React Testing Library configuration
6. **Styling System**: CSS variables, Tailwind customization, dark mode

