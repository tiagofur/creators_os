# Ordo Creator OS — Frontend

Turborepo monorepo for the Ordo Creator OS web application.

## Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **State**: Zustand + TanStack Query
- **i18n**: next-intl (en/es)
- **Package manager**: pnpm
- **Monorepo**: Turborepo

## Getting Started

```bash
pnpm install
pnpm dev
```

The web app will be available at `http://localhost:3000`.

## Workspace Structure

```
apps/
  web/          # Next.js 15 web application
packages/
  config/       # Shared ESLint, TypeScript, Tailwind configs
  types/        # Shared TypeScript interfaces
  validations/  # Zod schemas
  core/         # Domain logic, pure functions
  i18n/         # Translation files + next-intl utilities
  ui/           # shadcn/ui + Ordo component library
  hooks/        # Shared React hooks
  stores/       # Zustand store definitions
  api-client/   # HTTP client + React Query hooks
```
