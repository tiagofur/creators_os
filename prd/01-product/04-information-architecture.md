# Information Architecture

> Complete navigation structure and app organization for Ordo Creator OS.

---

## Global Navigation Structure

### Web App (Primary)

```
SIDEBAR (persistent)
├── Dashboard                    /dashboard
├── ─────────────────
├── CREATOR OS
│   ├── Ideas                    /ideas
│   ├── Pipeline                 /pipeline
│   ├── Series                   /series
│   ├── Publishing               /publishing
│   ├── Calendar                 /calendar
│   └── Remix                    /remix
├── ─────────────────
├── STUDIO
│   └── AI Chat                  /ai-chat
├── ─────────────────
├── GROWTH
│   ├── Analytics                /analytics
│   ├── Consistency              /consistency
│   ├── Goals                    /goals
│   ├── Gamification             /gamification
│   └── Reports                  /reports
├── ─────────────────
├── ENGAGEMENT
│   ├── Inbox                    /inbox
│   ├── Sponsorships             /sponsorships
│   └── Newsletter               /newsletter
├── ─────────────────
├── AUTOMATION
│   ├── Automations              /automations
│   └── Webhooks                 /webhooks
├── ─────────────────
├── Graveyard                    /graveyard
├── Trash                        /trash
└── Settings                     /settings
    └── Integrations             /settings/integrations

HEADER (persistent)
├── Workspace Switcher (left)
├── Search (center)
├── Quick Capture (Cmd+K)
├── Timer Widget
├── Notifications Bell
└── User Avatar > Profile Menu
```

### Mobile App

```
TAB BAR (bottom - 5 tabs)
├── Home (Dashboard)             /(internal)/index
├── Ideas                        /(internal)/ideas
├── Creator Hub                  /(internal)/creator
│   ├── Ideas (detailed)         /creator/ideas
│   ├── Series                   /creator/series
│   ├── Publishing               /creator/publishing
│   └── Pipeline                 /creator/pipeline
├── Analytics                    /(internal)/analytics
└── Profile                      /(internal)/profile

FLOATING ACTIONS
├── Quick Capture (FAB button)
├── Voice Capture
└── Timer Widget

ACCESSIBLE VIA NAVIGATION
├── AI Chat                      /ai-chat
├── Timer                        /timer
├── Settings                     /settings
├── Notifications                /notifications
├── Workspace Management         /workspaces
└── Reports                      /weekly-monthly-reports
```

### Desktop App

```
SIDEBAR (collapsible)
├── Dashboard
├── ─────────────────
├── CREATOR OS
│   ├── Ideas
│   ├── Pipeline
│   ├── Series (+ detail view)
│   ├── Publishing
│   ├── Calendar
│   ├── Remix
│   ├── Content Library
│   └── Graveyard
├── ─────────────────
├── STUDIO
│   ├── AI Chat
│   ├── AI Generation
│   └── AI SEO Tools
├── ─────────────────
├── GROWTH
│   ├── Analytics
│   ├── Consistency
│   ├── Goals
│   ├── Gamification
│   ├── Reports
│   └── AI Reports
├── ─────────────────
├── ENGAGEMENT
│   ├── Inbox
│   ├── Sponsorships
│   └── Newsletter
├── ─────────────────
├── MANAGEMENT
│   ├── Blog Management
│   ├── FAQ Management
│   ├── Automations
│   └── Webhooks
├── ─────────────────
├── Search
├── Workspaces
├── Timer (+ floating widget)
├── Trash
├── Notifications
└── Settings

TITLE BAR
├── Window Controls (native)
├── Workspace Name
└── Quick Actions
```

---

## Page Inventory

### Creator OS Pages

| Page | Route | Purpose | Platform |
|------|-------|---------|----------|
| Dashboard | `/` | Overview: metrics, recent activity, quick actions | All |
| Ideas | `/ideas` | Idea list, capture, validate | All |
| Pipeline | `/pipeline` | Kanban board for content pieces | All |
| Series | `/series` | Series list with thumbnails | All |
| Series Detail | `/series/[id]` | Episodes, schedule, settings | Web, Desktop |
| Publishing | `/publishing` | Schedule and manage social posts | All |
| Calendar | `/calendar` | Visual calendar of all scheduled content | Web, Desktop |
| Remix | `/remix` | Content atomization and repurposing | Web, Desktop |
| Graveyard | `/graveyard` | Archived/dead ideas | Web, Desktop |

### Studio Pages

| Page | Route | Purpose | Platform |
|------|-------|---------|----------|
| AI Chat | `/ai-chat` | Conversational AI assistant | All |
| AI Generation | (desktop) | Content generation tools | Desktop |
| AI SEO Tools | (desktop) | SEO optimization | Desktop |

### Growth Pages

| Page | Route | Purpose | Platform |
|------|-------|---------|----------|
| Analytics | `/analytics` | Daily metrics, audience insights | All |
| Consistency | `/consistency` | Streaks, heatmap, score | Web, Desktop |
| Goals | `/goals` | Goal setting and progress | Web, Desktop |
| Gamification | `/gamification` | XP, levels, achievements | Web, Desktop |
| Reports | `/reports` | Dashboards and reports | All |

### Engagement Pages

| Page | Route | Purpose | Platform |
|------|-------|---------|----------|
| Inbox | `/inbox` | Unified social comments/messages | Web, Desktop |
| Sponsorships | `/sponsorships` | Deal pipeline and brand CRM | Web, Desktop |
| Newsletter | `/newsletter` | Subscriber management | Web, Desktop |

### System Pages

| Page | Route | Purpose | Platform |
|------|-------|---------|----------|
| Settings | `/settings` | User preferences | All |
| Integrations | `/settings/integrations` | OAuth connections | Web |
| Notifications | `/notifications` | Notification center | All |
| Timer | `/timer` | Pomodoro/focus timer | All |
| Trash | `/trash` | Soft-deleted items | Web, Desktop |
| Search | `/search` | Content library search | Desktop |

---

## Content Hierarchy

```
Workspace (organization boundary)
├── Ideas (raw sparks)
│   ├── Tags
│   └── Transformations
│
├── Content Pipeline (actionable pieces)
│   ├── Pipeline Entries
│   │   ├── Scripts + Versions
│   │   ├── Assets
│   │   ├── Comments
│   │   ├── Time Sessions
│   │   └── Checklists
│   └── Series
│       ├── Episodes (Pipeline Entries)
│       └── Templates
│
├── Publishing (distribution)
│   ├── Social Posts
│   │   ├── Platform Metadata
│   │   └── Scheduling Slots
│   └── Calendar
│
├── Analytics (measurement)
│   ├── Daily Metrics
│   ├── Consistency Score
│   ├── Goals + Milestones
│   └── Reports
│
├── Engagement (community)
│   ├── Inbox (Comments + Messages)
│   ├── Sponsorships (Brands + Deals)
│   └── Personas
│
└── Settings (configuration)
    ├── User Preferences
    ├── Workspace Settings
    ├── Integrations
    ├── Automations
    └── Webhooks
```

---

## Data Flow

```
CAPTURE                    PRODUCE                    DISTRIBUTE
┌─────────┐   Promote    ┌─────────────┐  Schedule  ┌───────────┐
│  Ideas   │ ──────────> │  Pipeline   │ ────────> │ Publishing │
│  Inbox   │             │  (Kanban)   │           │ (Calendar) │
│  Capture │             │  Studio     │           │ Multi-plat │
└─────────┘             └─────────────┘           └───────────┘
     │                        │                        │
     │    AI Copilot          │    AI Copilot          │    AI Copilot
     │    (Expand,            │    (Script Dr,         │    (SEO,
     │     Validate)          │     Title Lab)         │     Repurpose)
     │                        │                        │
     └────────────────────────┴────────────────────────┘
                              │
                    ┌─────────────────┐
                    │   Analytics     │
                    │   Consistency   │
                    │   Gamification  │
                    └─────────────────┘
```

---

## URL Structure

### Pattern
```
/{locale}/{section}/{resource}/{id}/{action}

Examples:
/en/ideas                    # Ideas list
/en/pipeline                 # Pipeline kanban
/en/series/abc123            # Series detail
/en/settings/integrations    # Integration settings
```

### Locales Supported
- `en` - English
- `es` - Spanish
- `pt` - Portuguese

---

*Architecture designed for creator workflows, not developer convenience.*
