# i18n Implementation Guide — Ordo Creator OS

**Tech Stack:** Next.js 15 App Router, next-intl, React Native (Expo), TypeScript
**Supported Locales:** en (English), es (Español), pt (Português)
**Default Locale:** en

---

## 1. next-intl Setup

### Installation

```bash
npm install next-intl
npm install --save-dev @formatjs/intl-localematcher negotiateLanguages
```

### Configuration: `i18n.config.ts`

```typescript
// i18n.config.ts
export const defaultLocale = 'en';
export const locales = ['en', 'es', 'pt'] as const;
export type Locale = (typeof locales)[number];

export const localeNames: Record<Locale, string> = {
  en: 'English',
  es: 'Español',
  pt: 'Português',
};

export const localeFlags: Record<Locale, string> = {
  en: '🇺🇸',
  es: '🇪🇸',
  pt: '🇧🇷',
};
```

### Middleware Configuration: `middleware.ts`

```typescript
// middleware.ts
import { createNavigationMiddleware } from 'next-intl/next-middleware';
import { locales, defaultLocale, type Locale } from './i18n.config';

export default createNavigationMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'always', // Always show /en, /es, /pt prefix
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    '/((?!_next|.*\\..*|api/.*|static/.*|health).*)',
  ],
};
```

### Request Configuration: `i18n.request.ts`

```typescript
// lib/i18n.request.ts
import { getRequestConfig } from 'next-intl/server';
import { type Locale } from '@/i18n.config';

export default getRequestConfig(async ({ locale }) => {
  const validLocale = locale as Locale;

  return {
    messages: (
      await import(`../messages/${validLocale}.json`)
    ).default,
    timeZone: 'UTC',
    now: new Date(),
  };
});
```

### Next.js Config: `next.config.ts`

```typescript
// next.config.ts
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin(
  './lib/i18n.request.ts'
);

export default withNextIntl({
  reactStrictMode: true,
  swcMinify: true,
});
```

### Root Layout: `app/layout.tsx`

```typescript
// app/layout.tsx
import type { Metadata } from 'next';
import { getLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { locales, type Locale } from '@/i18n.config';

export async function generateMetadata(): Promise<Metadata> {
  const locale = (await getLocale()) as Locale;

  return {
    title: 'Ordo Creator OS',
    description: 'Professional content creation suite',
    metadataBase: new URL('https://ordocreatoros.com'),
    alternates: {
      languages: {
        en: 'https://ordocreatoros.com/en',
        es: 'https://ordocreatoros.com/es',
        pt: 'https://ordocreatoros.com/pt',
      },
    },
  };
}

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  if (!locales.includes(params.locale as Locale)) {
    notFound();
  }

  return (
    <html lang={params.locale}>
      <body>{children}</body>
    </html>
  );
}
```

---

## 2. Translation File Structure

### Directory Layout

```
messages/
├── en.json
├── es.json
├── pt.json
└── schemas/
    └── translations.schema.json
```

### Message Organization: `messages/en.json`

```json
{
  "common": {
    "appName": "Ordo Creator OS",
    "save": "Save",
    "cancel": "Cancel",
    "delete": "Delete",
    "edit": "Edit",
    "loading": "Loading...",
    "error": "An error occurred",
    "success": "Success",
    "warning": "Warning",
    "info": "Information",
    "back": "Back",
    "next": "Next",
    "previous": "Previous",
    "search": "Search",
    "filter": "Filter",
    "sort": "Sort",
    "export": "Export",
    "import": "Import"
  },
  "auth": {
    "login": "Sign In",
    "logout": "Sign Out",
    "register": "Create Account",
    "forgotPassword": "Forgot Password?",
    "resetPassword": "Reset Password",
    "email": "Email",
    "password": "Password",
    "confirmPassword": "Confirm Password",
    "rememberMe": "Remember me",
    "loginTitle": "Sign in to Ordo Creator OS",
    "registerTitle": "Create your Creator account",
    "emailRequired": "Email is required",
    "invalidEmail": "Please enter a valid email",
    "passwordRequired": "Password is required",
    "passwordTooShort": "Password must be at least 8 characters",
    "passwordMismatch": "Passwords do not match",
    "accountExists": "An account with this email already exists"
  },
  "dashboard": {
    "title": "Creator Dashboard",
    "welcome": "Welcome back, {name}",
    "projects": "Projects",
    "recentProjects": "Recent Projects",
    "createProject": "Create Project",
    "noProjects": "No projects yet. Create your first project to get started.",
    "analytics": "Analytics",
    "performance": "Performance",
    "stats": {
      "totalViews": "Total Views",
      "totalEngagement": "Total Engagement",
      "averageWatchTime": "Avg. Watch Time",
      "subscribers": "Subscribers"
    },
    "upcomingPublications": "Upcoming Publications"
  },
  "editor": {
    "title": "Content Editor",
    "newProject": "New Project",
    "projectName": "Project Name",
    "projectDescription": "Project Description",
    "selectTemplate": "Select Template",
    "blank": "Blank",
    "videoProduction": "Video Production",
    "podcastProduction": "Podcast Production",
    "liveStream": "Live Stream",
    "videoTitle": "Video Title",
    "videoDescription": "Video Description",
    "duration": "Duration",
    "thumbnail": "Thumbnail",
    "uploadMedia": "Upload Media",
    "dragDropHere": "Drag and drop media here or click to browse",
    "timeline": "Timeline",
    "preview": "Preview",
    "publish": "Publish",
    "publishTitle": "Publish Project",
    "selectPlatforms": "Select Platforms",
    "publishSchedule": "Publish Schedule",
    "publishNow": "Publish Now",
    "publishLater": "Schedule for Later",
    "publishDate": "Publish Date",
    "publishTime": "Publish Time",
    "autoPublish": "Auto-publish to all platforms",
    "clips": "Auto-generate Clips",
    "clipsDescription": "Create short-form clips from your content",
    "transcribe": "Transcribe",
    "transcribeDescription": "Generate captions and subtitles",
    "generateThumbnail": "Generate Thumbnail",
    "aiEnhancements": "AI Enhancements"
  },
  "analytics": {
    "title": "Analytics",
    "overview": "Overview",
    "engagement": "Engagement",
    "audience": "Audience",
    "contentPerformance": "Content Performance",
    "timeRange": "Time Range",
    "today": "Today",
    "thisWeek": "This Week",
    "thisMonth": "This Month",
    "custom": "Custom Range",
    "views": "Views",
    "clicks": "Clicks",
    "impressions": "Impressions",
    "ctr": "Click-Through Rate",
    "watchTime": "Watch Time",
    "averageViewDuration": "Average View Duration",
    "subscriberGrowth": "Subscriber Growth",
    "topContent": "Top Content",
    "audienceDemographics": "Audience Demographics",
    "trafficSources": "Traffic Sources",
    "social": "Social",
    "direct": "Direct",
    "organic": "Organic Search",
    "referral": "Referral",
    "export": "Export Report"
  },
  "settings": {
    "title": "Settings",
    "account": "Account",
    "profile": "Profile",
    "email": "Email",
    "changePassword": "Change Password",
    "twoFactorAuth": "Two-Factor Authentication",
    "enable2FA": "Enable 2FA",
    "disable2FA": "Disable 2FA",
    "notifications": "Notifications",
    "emailNotifications": "Email Notifications",
    "pushNotifications": "Push Notifications",
    "privateMessagesNotifications": "Private Messages",
    "publishingAlerts": "Publishing Alerts",
    "analyticsUpdates": "Analytics Updates",
    "preferences": "Preferences",
    "language": "Language",
    "timezone": "Timezone",
    "theme": "Theme",
    "light": "Light",
    "dark": "Dark",
    "system": "System",
    "platforms": "Connected Platforms",
    "connectPlatform": "Connect Platform",
    "disconnectPlatform": "Disconnect",
    "integrations": "Integrations",
    "APIKeys": "API Keys",
    "createNewKey": "Create New Key",
    "danger": "Danger Zone",
    "deleteAccount": "Delete Account",
    "deleteAccountWarning": "This action cannot be undone"
  },
  "errors": {
    "pageNotFound": "Page Not Found",
    "pageNotFoundDescription": "The page you are looking for does not exist.",
    "unauthorized": "Unauthorized",
    "unauthorizedDescription": "You do not have permission to access this resource.",
    "forbidden": "Forbidden",
    "forbiddenDescription": "Access to this resource is forbidden.",
    "serverError": "Server Error",
    "serverErrorDescription": "Something went wrong on our end. Please try again later.",
    "networkError": "Network Error",
    "networkErrorDescription": "Please check your internet connection and try again.",
    "uploadFailed": "Upload Failed",
    "uploadFailedDescription": "The file upload was unsuccessful. Please try again.",
    "invalidFile": "Invalid File",
    "invalidFileDescription": "The file format is not supported.",
    "fileTooLarge": "File Too Large",
    "fileTooLargeDescription": "The file size exceeds the maximum allowed size.",
    "connectionTimeout": "Connection Timeout",
    "connectionTimeoutDescription": "The request took too long. Please try again.",
    "rateLimitExceeded": "Rate Limit Exceeded",
    "rateLimitExceededDescription": "You have made too many requests. Please wait before trying again.",
    "paymentRequired": "Payment Required",
    "paymentRequiredDescription": "Please upgrade your plan to access this feature."
  },
  "ai": {
    "title": "AI Assistant",
    "generate": "Generate",
    "generateTitle": "Generate Title",
    "generateDescription": "Generate Description",
    "generateTags": "Generate Tags",
    "generateScript": "Generate Script",
    "improveContent": "Improve Content",
    "optimizeForSEO": "Optimize for SEO",
    "generateThumbnailDescription": "Generate Thumbnail Description",
    "aiSuggestions": "AI Suggestions",
    "analyzing": "Analyzing content...",
    "generating": "Generating...",
    "rewrite": "Rewrite",
    "shorten": "Shorten",
    "expand": "Expand",
    "makeItProfessional": "Make It Professional",
    "makeItCasual": "Make It Casual",
    "makeItFunny": "Make It Funny",
    "makeItFormal": "Make It Formal",
    "tone": "Tone",
    "length": "Length",
    "keywords": "Keywords",
    "aiPrompt": "Describe what you want to generate...",
    "insertSuggestion": "Insert",
    "regenerate": "Regenerate",
    "creditUsage": "Credit Usage",
    "creditsRemaining": "Credits Remaining",
    "upgradeForMore": "Upgrade for more AI credits"
  }
}
```

### Spanish Translation: `messages/es.json` (sample)

```json
{
  "common": {
    "appName": "Ordo Creator OS",
    "save": "Guardar",
    "cancel": "Cancelar",
    "delete": "Eliminar",
    "edit": "Editar",
    "loading": "Cargando...",
    "error": "Ocurrió un error",
    "success": "Éxito",
    "back": "Atrás"
  },
  "dashboard": {
    "title": "Panel de Control",
    "welcome": "Bienvenido de nuevo, {name}",
    "projects": "Proyectos",
    "createProject": "Crear Proyecto"
  },
  "editor": {
    "title": "Editor de Contenido",
    "videoTitle": "Título del Video",
    "publish": "Publicar"
  }
}
```

### Portuguese Translation: `messages/pt.json` (sample)

```json
{
  "common": {
    "appName": "Ordo Creator OS",
    "save": "Salvar",
    "cancel": "Cancelar",
    "delete": "Excluir",
    "edit": "Editar",
    "loading": "Carregando...",
    "error": "Ocorreu um erro",
    "success": "Sucesso"
  },
  "dashboard": {
    "title": "Painel do Criador",
    "welcome": "Bem-vindo de volta, {name}",
    "projects": "Projetos",
    "createProject": "Criar Projeto"
  }
}
```

---

## 3. Message Format — ICU Message Syntax

### Plurals

```json
{
  "analytics": {
    "viewCount": "{count, plural, =0 {No views} one {# view} other {# views}}",
    "subscriberCount": "{count, plural, =0 {No subscribers} one {# subscriber} other {# subscribers}}",
    "commentCount": "{count, plural, =0 {No comments} one {# comment} other {# comments}}",
    "likeCount": "{count, plural, =0 {No likes} one {# like} other {# likes}}",
    "projectCount": "{count, plural, =0 {No projects} one {# project} other {# projects}}"
  },
  "editor": {
    "clipCount": "{count, plural, =0 {No clips} one {# clip} other {# clips}}",
    "selectedMedia": "{count, plural, =0 {Select media} one {# item selected} other {# items selected}}"
  }
}
```

### Dates

```json
{
  "dashboard": {
    "publishedOn": "Published on {date, date, long}",
    "publishedAt": "Published on {date, date, medium} at {date, time, short}",
    "lastUpdated": "Last updated {date, date, short}"
  },
  "editor": {
    "scheduledFor": "Scheduled for {date, date, long} at {time, time, medium}"
  }
}
```

### Numbers & Currency

```json
{
  "analytics": {
    "viewsPercentage": "Views increased by {percentage, number, ::percent}",
    "engagementRate": "Engagement rate: {rate, number, ::percent rounded-fraction-digits=2}",
    "revenue": "Revenue: {amount, number, ::currency/USD}"
  },
  "settings": {
    "storageUsed": "{used, number, ::percent} of {total, number} GB used"
  }
}
```

### Relative Time

```json
{
  "dashboard": {
    "projectCreated": "Created {date, date, ::relative}",
    "lastPublished": "Last published {date, date, ::relative}"
  },
  "editor": {
    "autosavedAt": "Auto-saved {timestamp, date, ::relative}"
  }
}
```

### Gender-Aware Translations

```json
{
  "dashboard": {
    "userGreeting": "{name} {gender, select, male {he is} female {she is} other {they are}} a top creator"
  }
}
```

---

## 4. Server Components Translation

### Using `getTranslations()`

```typescript
// app/[locale]/dashboard/page.tsx
import { getTranslations, getLocale } from 'next-intl/server';
import type { Locale } from '@/i18n.config';

export async function generateMetadata() {
  const t = await getTranslations('dashboard');
  const locale = (await getLocale()) as Locale;

  return {
    title: t('title'),
    description: t('welcome', { name: 'Creator' }),
    openGraph: {
      locale: locale === 'pt' ? 'pt_BR' : locale,
      type: 'website',
    },
  };
}

export default async function DashboardPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  const t = await getTranslations('dashboard');
  const tCommon = await getTranslations('common');

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">{t('title')}</h1>
      <p className="text-lg">{t('welcome', { name: 'Alex' })}</p>

      <section>
        <h2 className="text-xl font-semibold mb-4">{t('recentProjects')}</h2>
        {/* Projects list */}
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-4">{t('analytics')}</h2>
        {/* Analytics component */}
      </section>

      <button className="btn btn-primary">
        {t('createProject')}
      </button>
    </div>
  );
}
```

### Metadata Internationalization

```typescript
// app/[locale]/editor/page.tsx
import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('editor');

  return {
    title: t('title'),
    description: 'Create and publish professional content',
    keywords: ['editor', 'content', 'creator', 'publish'],
  };
}

export default async function EditorPage() {
  const t = await getTranslations('editor');

  return (
    <div>
      <h1>{t('title')}</h1>
      <section>
        <label>{t('projectName')}</label>
        <input
          type="text"
          placeholder={t('projectName')}
        />
      </section>
    </div>
  );
}
```

---

## 5. Client Components Translation

### `useTranslations()` Hook

```typescript
// components/ProjectCard.tsx
'use client';

import { useTranslations } from 'next-intl';
import { formatDate } from '@/lib/date-utils';

interface ProjectCardProps {
  id: string;
  name: string;
  description: string;
  createdAt: Date;
  viewCount: number;
  status: 'draft' | 'published' | 'scheduled';
}

export function ProjectCard({
  id,
  name,
  description,
  createdAt,
  viewCount,
  status,
}: ProjectCardProps) {
  const t = useTranslations('dashboard');
  const tCommon = useTranslations('common');

  return (
    <div className="border rounded-lg p-4 hover:shadow-lg transition">
      <h3 className="font-semibold text-lg">{name}</h3>
      <p className="text-gray-600">{description}</p>

      <div className="mt-4 flex justify-between items-center">
        <div className="text-sm text-gray-500">
          {t('projectCreated', { date: createdAt })}
        </div>
        <div className="text-sm font-medium">
          {t('stats.totalViews')}: {viewCount.toLocaleString()}
        </div>
      </div>

      <div className="mt-3 flex gap-2">
        <button className="btn btn-sm btn-outline">
          {tCommon('edit')}
        </button>
        <button className="btn btn-sm btn-outline text-red-600">
          {tCommon('delete')}
        </button>
      </div>
    </div>
  );
}
```

### Dynamic Translations with Variables

```typescript
// components/AnalyticsPanel.tsx
'use client';

import { useTranslations } from 'next-intl';

interface AnalyticsPanelProps {
  viewCount: number;
  engagementRate: number;
  subscriberGrowth: number;
}

export function AnalyticsPanel({
  viewCount,
  engagementRate,
  subscriberGrowth,
}: AnalyticsPanelProps) {
  const t = useTranslations('analytics');

  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="stat">
        <div className="stat-title">{t('views')}</div>
        <div className="stat-value">{viewCount.toLocaleString()}</div>
        <div className="stat-desc">
          {t('viewsPercentage', { percentage: 0.15 })}
        </div>
      </div>

      <div className="stat">
        <div className="stat-title">{t('engagement')}</div>
        <div className="stat-value">
          {t('engagementRate', { rate: engagementRate })}
        </div>
      </div>

      <div className="stat">
        <div className="stat-title">{t('subscriberGrowth')}</div>
        <div className="stat-value">
          {subscriberGrowth > 0 ? '+' : ''}{subscriberGrowth}%
        </div>
      </div>
    </div>
  );
}
```

---

## 6. Locale Switching

### LanguageSwitcher Component

```typescript
// components/LanguageSwitcher.tsx
'use client';

import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { locales, localeNames, localeFlags, type Locale } from '@/i18n.config';

export function LanguageSwitcher() {
  const router = useRouter();
  const locale = useLocale() as Locale;

  const handleLocaleChange = (newLocale: Locale) => {
    // Construct URL with new locale
    const pathname = window.location.pathname;
    const currentLocalePrefix = `/${locale}`;
    const newPath = pathname.replace(
      currentLocalePrefix,
      `/${newLocale}`
    );

    // Save preference to localStorage
    localStorage.setItem('preferredLocale', newLocale);

    router.push(newPath);
  };

  return (
    <div className="dropdown dropdown-end">
      <button className="btn btn-ghost gap-2">
        <span>{localeFlags[locale]}</span>
        <span>{localeNames[locale]}</span>
      </button>
      <ul className="dropdown-content menu p-2 shadow bg-base-100 rounded-box">
        {locales.map((loc) => (
          <li key={loc}>
            <button
              onClick={() => handleLocaleChange(loc)}
              className={locale === loc ? 'active' : ''}
            >
              <span>{localeFlags[loc]}</span>
              <span>{localeNames[loc]}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

### Redirect Handling

```typescript
// lib/locale-redirect.ts
import { useRouter } from 'next/navigation';
import { locales, defaultLocale, type Locale } from '@/i18n.config';

export function useLocaleRedirect() {
  const router = useRouter();

  const redirect = (locale: Locale, path: string) => {
    router.push(`/${locale}${path}`);
  };

  const redirectToDefaultLocale = (path: string) => {
    const preferredLocale =
      (localStorage.getItem('preferredLocale') as Locale) || defaultLocale;
    redirect(preferredLocale, path);
  };

  return { redirect, redirectToDefaultLocale };
}
```

### Persisting Locale Preference

```typescript
// lib/locale-storage.ts
import { type Locale } from '@/i18n.config';

export function getStoredLocale(): Locale | null {
  if (typeof window === 'undefined') return null;
  return (localStorage.getItem('preferredLocale') as Locale) || null;
}

export function setStoredLocale(locale: Locale): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('preferredLocale', locale);
}

export function clearStoredLocale(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('preferredLocale');
}
```

---

## 7. Adding a New Language

> **NOTE: Current Supported Locales**
> The primary requirement is **en**, **es**, **pt**. French (**fr**) is shown below as an example for **P2 future enhancement**.
> If adding a new language, follow the pattern below.

### Step-by-Step Guide

#### 1. Update Config

```typescript
// i18n.config.ts
// CURRENT (Primary Requirement):
export const defaultLocale = 'en';
export const locales = ['en', 'es', 'pt'] as const;

// FUTURE ENHANCEMENT EXAMPLE (P2: Add French if needed):
// export const locales = ['en', 'es', 'pt', 'fr'] as const; // Uncomment to add French
export type Locale = (typeof locales)[number];

export const localeNames: Record<Locale, string> = {
  en: 'English',
  es: 'Español',
  pt: 'Português',
  fr: 'Français', // Add French name
};

export const localeFlags: Record<Locale, string> = {
  en: '🇺🇸',
  es: '🇪🇸',
  pt: '🇧🇷',
  fr: '🇫🇷', // Add French flag
};
```

#### 2. Create Translation File

```json
// messages/fr.json
{
  "common": {
    "appName": "Ordo Creator OS",
    "save": "Enregistrer",
    "cancel": "Annuler",
    "delete": "Supprimer",
    "edit": "Modifier",
    "loading": "Chargement...",
    "error": "Une erreur s'est produite",
    "success": "Succès"
  },
  "dashboard": {
    "title": "Tableau de Bord",
    "welcome": "Bienvenue, {name}",
    "projects": "Projets",
    "createProject": "Créer un Projet"
  },
  "editor": {
    "title": "Éditeur de Contenu",
    "videoTitle": "Titre de la Vidéo",
    "publish": "Publier"
  }
}
```

#### 3. Run Type Checking

```bash
npm run build
```

#### 4. Test New Locale

- Navigate to `/fr` in your app
- Verify translations display correctly
- Test dynamic locale switching

#### 5. Update Metadata & SEO

```typescript
// app/layout.tsx
export async function generateMetadata(): Promise<Metadata> {
  return {
    alternates: {
      languages: {
        en: 'https://ordocreatoros.com/en',
        es: 'https://ordocreatoros.com/es',
        pt: 'https://ordocreatoros.com/pt',
        fr: 'https://ordocreatoros.com/fr', // Add French
      },
    },
  };
}
```

---

## 8. Date/Time/Number Formatting

### Locale-Specific Formatters

```typescript
// lib/intl-formatters.ts
import { getLocale } from 'next-intl/server';
import type { Locale } from '@/i18n.config';

const localeToIntlLocale: Record<Locale, string> = {
  en: 'en-US',
  es: 'es-ES',
  pt: 'pt-BR',
};

export async function getIntlLocale(): Promise<string> {
  const locale = (await getLocale()) as Locale;
  return localeToIntlLocale[locale];
}

export function formatDate(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

export function formatDateTime(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function formatTime(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(date);
}

export function formatNumber(num: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

export function formatCurrency(amount: number, locale: string): string {
  const currencyMap: Record<Locale, string> = {
    en: 'USD',
    es: 'EUR',
    pt: 'BRL',
  };

  const intlLocale = Object.entries(localeToIntlLocale).find(
    ([, val]) => val === locale
  )?.[0] as Locale;
  const currency = currencyMap[intlLocale] || 'USD';

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(amount);
}

export function formatPercent(value: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  }).format(value / 100);
}
```

### Client-Side Formatters

```typescript
// lib/date-utils.ts
'use client';

import { useLocale } from 'next-intl';

const localeToIntlLocale: Record<string, string> = {
  en: 'en-US',
  es: 'es-ES',
  pt: 'pt-BR',
};

export function useDateFormatter() {
  const locale = useLocale();
  const intlLocale = localeToIntlLocale[locale] || 'en-US';

  return {
    formatDate: (date: Date) =>
      new Intl.DateTimeFormat(intlLocale, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }).format(date),

    formatDateTime: (date: Date) =>
      new Intl.DateTimeFormat(intlLocale, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(date),

    formatRelativeTime: (date: Date) => {
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffSecs = Math.round(diffMs / 1000);
      const diffMins = Math.round(diffSecs / 60);
      const diffHours = Math.round(diffMins / 60);
      const diffDays = Math.round(diffHours / 24);

      const rtf = new Intl.RelativeTimeFormat(intlLocale, {
        numeric: 'auto',
      });

      if (diffSecs < 60) {
        return rtf.format(-diffSecs, 'second');
      } else if (diffMins < 60) {
        return rtf.format(-diffMins, 'minute');
      } else if (diffHours < 24) {
        return rtf.format(-diffHours, 'hour');
      } else {
        return rtf.format(-diffDays, 'day');
      }
    },
  };
}
```

### Usage Example

```typescript
// components/PublishSchedule.tsx
'use client';

import { useDateFormatter } from '@/lib/date-utils';

interface PublishScheduleProps {
  scheduledDate: Date;
  createdDate: Date;
}

export function PublishSchedule({
  scheduledDate,
  createdDate,
}: PublishScheduleProps) {
  const { formatDateTime, formatRelativeTime } = useDateFormatter();

  return (
    <div>
      <p>
        Scheduled for: {formatDateTime(scheduledDate)}
      </p>
      <p>
        Created {formatRelativeTime(createdDate)}
      </p>
    </div>
  );
}
```

---

## 9. Mobile i18n — React Native (Expo)

### Installation

```bash
expo install expo-localization i18next react-i18next
npm install --save-dev i18next-http-backend i18next-fs-backend
```

### Configuration: `i18n-mobile.ts`

```typescript
// app/mobile/i18n/i18n-mobile.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import en from './locales/en.json';
import es from './locales/es.json';
import pt from './locales/pt.json';

const resources = {
  en: { translation: en },
  es: { translation: es },
  pt: { translation: pt },
};

const deviceLanguage = Localization.getLocales()[0]?.languageCode;
const defaultLanguage = 'en';

const initialLanguage = resources[deviceLanguage as keyof typeof resources]
  ? deviceLanguage
  : defaultLanguage;

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: initialLanguage,
    fallbackLng: defaultLanguage,
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
```

### Shared Translation Files

```typescript
// app/mobile/i18n/sync-translations.ts
// Script to sync messages from Next.js to React Native
import fs from 'fs';
import path from 'path';

const nextIntlPath = path.join(process.cwd(), 'messages');
const expoI18nPath = path.join(
  process.cwd(),
  'app/mobile/i18n/locales'
);

['en', 'es', 'pt'].forEach((locale) => {
  const nextSource = path.join(nextIntlPath, `${locale}.json`);
  const expoTarget = path.join(expoI18nPath, `${locale}.json`);

  if (fs.existsSync(nextSource)) {
    const content = fs.readFileSync(nextSource, 'utf-8');
    fs.writeFileSync(expoTarget, content);
    console.log(`Synced ${locale}`);
  }
});
```

### Mobile Hook: `useTranslationMobile()`

```typescript
// app/mobile/hooks/useTranslationMobile.ts
import { useTranslation } from 'react-i18next';

export function useTranslationMobile(namespace?: string) {
  const { t, i18n } = useTranslation(namespace || 'translation');
  return { t, locale: i18n.language, changeLocale: i18n.changeLanguage };
}
```

### Mobile Components

```typescript
// app/mobile/screens/DashboardScreen.tsx
import { View, Text, ScrollView } from 'react-native';
import { useTranslationMobile } from '../hooks/useTranslationMobile';

export function DashboardScreen() {
  const { t } = useTranslationMobile();

  return (
    <ScrollView className="flex-1 bg-white">
      <View className="p-4">
        <Text className="text-2xl font-bold">{t('dashboard.title')}</Text>
        <Text className="text-lg mt-2">
          {t('dashboard.welcome', { name: 'Creator' })}
        </Text>
      </View>
    </ScrollView>
  );
}
```

### Mobile Locale Switcher

```typescript
// app/mobile/components/LocaleSwitcher.tsx
import { View, TouchableOpacity, Text } from 'react-native';
import { useTranslationMobile } from '../hooks/useTranslationMobile';
import AsyncStorage from '@react-native-async-storage/async-storage';

export function LocaleSwitcher() {
  const { locale, changeLocale } = useTranslationMobile();
  const locales = ['en', 'es', 'pt'];

  const handleLocaleChange = async (newLocale: string) => {
    await changeLocale(newLocale);
    await AsyncStorage.setItem('preferredLocale', newLocale);
  };

  return (
    <View className="flex-row gap-2 p-4">
      {locales.map((loc) => (
        <TouchableOpacity
          key={loc}
          onPress={() => handleLocaleChange(loc)}
          className={`px-3 py-2 rounded ${
            locale === loc ? 'bg-blue-500' : 'bg-gray-300'
          }`}
        >
          <Text className={locale === loc ? 'text-white' : 'text-black'}>
            {loc.toUpperCase()}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}
```

---

## 10. Translation Keys Convention

### Naming Convention

```
namespace.feature.element.state
```

**Examples:**
- `dashboard.stats.views` — Dashboard stats views metric
- `editor.media.upload.error` — Editor media upload error
- `analytics.chart.legend.tooltip` — Analytics chart legend tooltip
- `auth.login.form.password.placeholder` — Login form password placeholder

### Nesting Rules

1. **Max 4 levels deep** to maintain clarity
2. **Avoid single-use keys** — reuse common patterns
3. **Use consistent structure** across namespaces
4. **Group related keys** by feature

```json
{
  "editor": {
    "toolbar": {
      "export": "Export",
      "exportAs": "Export As",
      "exportFormats": {
        "video": "Export as Video",
        "audio": "Export as Audio",
        "subtitle": "Export as Subtitle"
      }
    }
  }
}
```

### Reusable Keys

```json
{
  "common": {
    "actions": {
      "save": "Save",
      "delete": "Delete",
      "edit": "Edit",
      "cancel": "Cancel",
      "confirm": "Confirm"
    },
    "status": {
      "loading": "Loading",
      "error": "Error",
      "success": "Success",
      "warning": "Warning"
    },
    "time": {
      "now": "Just now",
      "minuteAgo": "{minutes, plural, one {# minute ago} other {# minutes ago}}",
      "hourAgo": "{hours, plural, one {# hour ago} other {# hours ago}}",
      "dayAgo": "{days, plural, one {# day ago} other {# days ago}}"
    }
  }
}
```

### Namespace Organization

```
messages/
├── common.json        (shared, ui primitives)
├── auth.json          (authentication)
├── dashboard.json     (creator dashboard)
├── editor.json        (content editor)
├── analytics.json     (analytics dashboard)
├── settings.json      (user settings)
├── errors.json        (error messages)
└── ai.json            (ai features)
```

---

## 11. Dynamic Content Translation

### AI-Generated Content

```typescript
// lib/ai-translator.ts
import { getTranslations } from 'next-intl/server';

interface AITranslationRequest {
  content: string;
  targetLocale: 'en' | 'es' | 'pt';
  contentType: 'title' | 'description' | 'script' | 'tag';
}

export async function translateAIContent(
  request: AITranslationRequest
): Promise<string> {
  const { content, targetLocale, contentType } = request;

  // Call AI service to translate
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `You are a professional translator for content creators.
          Translate the following ${contentType} for a creator platform.
          Target language: ${targetLocale}.
          Keep the tone professional and platform-appropriate.`,
        },
        {
          role: 'user',
          content,
        },
      ],
      temperature: 0.7,
      max_tokens: 500,
    }),
  });

  const data = await response.json();
  return data.choices[0].message.content;
}
```

### User-Generated Content

```typescript
// components/UserContentDisplay.tsx
'use client';

import { useTranslations } from 'next-intl';
import { useLocale } from 'next-intl';

interface UserContentProps {
  content: {
    en?: string;
    es?: string;
    pt?: string;
  };
  fallbackText?: string;
}

export function UserContentDisplay({
  content,
  fallbackText = 'Content unavailable in this language',
}: UserContentProps) {
  const locale = useLocale();
  const t = useTranslations('common');

  // Fallback: en > default > fallbackText
  const displayContent =
    content[locale as keyof typeof content] ||
    content.en ||
    fallbackText;

  return (
    <div>
      <p>{displayContent}</p>
      {content[locale as keyof typeof content] === undefined &&
        content.en && (
          <small className="text-gray-500">
            {t('displayedIn')} English
          </small>
        )}
    </div>
  );
}
```

### Fallback Strategies

```typescript
// lib/translation-fallback.ts
type SupportedLocale = 'en' | 'es' | 'pt';

const fallbackMap: Record<SupportedLocale, SupportedLocale[]> = {
  en: ['en'],
  es: ['es', 'en'], // Spanish → English
  pt: ['pt', 'en'], // Portuguese → English
};

export function getAvailableContent(
  content: Partial<Record<SupportedLocale, string>>,
  locale: SupportedLocale
): string | null {
  const fallbacks = fallbackMap[locale];

  for (const fb of fallbacks) {
    if (content[fb]) {
      return content[fb];
    }
  }

  return null;
}
```

---

## 12. SEO & i18n

### hreflang Tags

```typescript
// app/[locale]/layout.tsx
import type { Metadata } from 'next';
import { locales, type Locale } from '@/i18n.config';

export async function generateMetadata(): Promise<Metadata> {
  const canonicalUrl = 'https://ordocreatoros.com';

  return {
    alternates: {
      canonical: canonicalUrl,
      languages: {
        en: `${canonicalUrl}/en`,
        es: `${canonicalUrl}/es`,
        pt: `${canonicalUrl}/pt`,
        'x-default': canonicalUrl, // Default for search engines
      },
    },
  };
}
```

### Locale-Specific Metadata

```typescript
// app/[locale]/editor/page.tsx
import { getTranslations, getLocale } from 'next-intl/server';
import type { Locale } from '@/i18n.config';

export async function generateMetadata() {
  const t = await getTranslations('editor');
  const locale = (await getLocale()) as Locale;

  const localeInfo = {
    en: { og: 'en_US', iso: 'en' },
    es: { og: 'es_ES', iso: 'es' },
    pt: { og: 'pt_BR', iso: 'pt' },
  };

  return {
    title: t('title'),
    description: t('description') || 'Create professional content',
    openGraph: {
      title: t('title'),
      description: t('description'),
      locale: localeInfo[locale].og,
      siteName: 'Ordo Creator OS',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: t('title'),
      description: t('description'),
    },
  };
}
```

### Sitemap with Locales

```typescript
// app/sitemap.ts
import { MetadataRoute } from 'next';
import { locales, type Locale } from '@/i18n.config';

const baseUrl = 'https://ordocreatoros.com';
const routes = ['', '/dashboard', '/editor', '/analytics', '/settings'];

export default function sitemap(): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = [];

  locales.forEach((locale) => {
    routes.forEach((route) => {
      entries.push({
        url: `${baseUrl}/${locale}${route}`,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: route === '' ? 1 : 0.8,
        alternates: {
          languages: Object.fromEntries(
            locales.map((loc) => [
              loc === 'pt' ? 'pt-BR' : loc,
              `${baseUrl}/${loc}${route}`,
            ])
          ),
        },
      });
    });
  });

  return entries;
}
```

### robots.txt with hreflang

```
# public/robots.txt
User-agent: *
Allow: /

Sitemap: https://ordocreatoros.com/sitemap.xml

Disallow: /api/
Disallow: /admin/
Disallow: /auth/
```

---

## 13. RTL Support (Future-Proofing)

### CSS Module for RTL

```typescript
// lib/rtl-utils.ts
import { getLocale } from 'next-intl/server';

export async function isRTLLocale(): Promise<boolean> {
  const locale = await getLocale();
  return ['ar', 'he'].includes(locale);
}

export function getTextDirection(locale: string): 'ltr' | 'rtl' {
  return ['ar', 'he'].includes(locale) ? 'rtl' : 'ltr';
}
```

### RTL Layout Classes

```typescript
// app/[locale]/layout.tsx
import { getLocale } from 'next-intl/server';
import { getTextDirection } from '@/lib/rtl-utils';

export default async function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  const direction = getTextDirection(params.locale);
  const isRTL = direction === 'rtl';

  return (
    <html lang={params.locale} dir={direction}>
      <body className={isRTL ? 'rtl' : 'ltr'}>
        {children}
      </body>
    </html>
  );
}
```

### Tailwind RTL Plugin

```typescript
// tailwind.config.ts
import rtlPlugin from 'tailwindcss-rtl';

export default {
  plugins: [rtlPlugin],
  corePlugins: {
    direction: true,
  },
};
```

### RTL-Aware Components

```typescript
// components/ProjectCard.tsx
'use client';

import { useLocale } from 'next-intl';

export function ProjectCard({ project }: { project: Project }) {
  const locale = useLocale();
  const isRTL = ['ar', 'he'].includes(locale);

  return (
    <div className={`flex ${isRTL ? 'flex-row-reverse' : 'flex-row'} gap-4`}>
      <img src={project.thumbnail} alt={project.name} />
      <div>
        <h3 className={isRTL ? 'text-right' : 'text-left'}>
          {project.name}
        </h3>
      </div>
    </div>
  );
}
```

---

## 14. Testing Translations

### Missing Keys Detection

```typescript
// __tests__/i18n.test.ts
import { describe, it, expect } from '@jest/globals';
import en from '@/messages/en.json';
import es from '@/messages/es.json';
import pt from '@/messages/pt.json';

describe('Translation Keys', () => {
  it('should have matching keys across all locales', () => {
    const extractKeys = (obj: any, prefix = ''): string[] => {
      return Object.keys(obj).flatMap((key) => {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        if (typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
          return extractKeys(obj[key], fullKey);
        }
        return [fullKey];
      });
    };

    const enKeys = new Set(extractKeys(en));
    const esKeys = new Set(extractKeys(es));
    const ptKeys = new Set(extractKeys(pt));

    // Check Spanish has all English keys
    const missingInEs = [...enKeys].filter((key) => !esKeys.has(key));
    expect(missingInEs).toEqual([]);

    // Check Portuguese has all English keys
    const missingInPt = [...enKeys].filter((key) => !ptKeys.has(key));
    expect(missingInPt).toEqual([]);
  });

  it('should not have placeholder keys without values', () => {
    const validateMessages = (obj: any): string[] => {
      const errors: string[] = [];

      Object.keys(obj).forEach((key) => {
        const value = obj[key];
        if (typeof value === 'string') {
          if (!value.trim()) {
            errors.push(`Empty translation: ${key}`);
          }
        } else if (typeof value === 'object' && !Array.isArray(value)) {
          errors.push(...validateMessages(value));
        }
      });

      return errors;
    };

    const errors = [
      ...validateMessages(en),
      ...validateMessages(es),
      ...validateMessages(pt),
    ];

    expect(errors).toEqual([]);
  });
});
```

### Snapshot Testing

```typescript
// __tests__/translations.snapshot.test.ts
import { describe, it, expect } from '@jest/globals';
import en from '@/messages/en.json';

describe('English Translations Snapshot', () => {
  it('should match snapshot', () => {
    expect(en).toMatchSnapshot();
  });

  it('should have all required namespaces', () => {
    const requiredNamespaces = [
      'common',
      'auth',
      'dashboard',
      'editor',
      'analytics',
      'settings',
      'errors',
      'ai',
    ];

    requiredNamespaces.forEach((ns) => {
      expect(en).toHaveProperty(ns);
    });
  });
});
```

### CI Validation Script

```bash
#!/bin/bash
# scripts/validate-translations.sh

echo "Validating translation files..."

# Check if all locales exist
for locale in en es pt; do
  if [ ! -f "messages/${locale}.json" ]; then
    echo "❌ Missing messages/${locale}.json"
    exit 1
  fi
done

# Run key consistency check
npm run test:i18n

# Check for TODO or FIXME in translations
if grep -r "TODO\|FIXME" messages/ --include="*.json"; then
  echo "⚠️ Found TODO/FIXME in translations"
fi

echo "✅ Translation validation passed"
```

### Accessibility Testing

```typescript
// __tests__/i18n-accessibility.test.ts
describe('Translation Accessibility', () => {
  it('should not have excessively long keys', () => {
    // Keys should be readable when used in code
    const checkKeyLength = (obj: any, path = ''): string[] => {
      const errors: string[] = [];

      Object.keys(obj).forEach((key) => {
        const fullPath = path ? `${path}.${key}` : key;
        if (fullPath.length > 50) {
          errors.push(`Key too long: ${fullPath}`);
        }
        if (typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
          errors.push(...checkKeyLength(obj[key], fullPath));
        }
      });

      return errors;
    };

    expect(checkKeyLength(en)).toEqual([]);
  });

  it('should support screen readers with proper language tags', () => {
    // Ensure HTML lang attributes match locale
    const localeMap = {
      en: 'en',
      es: 'es',
      pt: 'pt',
    };

    Object.entries(localeMap).forEach(([key, value]) => {
      expect(value).toBeDefined();
    });
  });
});
```

### Performance Testing

```typescript
// __tests__/i18n-performance.test.ts
import { getTranslations } from 'next-intl/server';

describe('Translation Performance', () => {
  it('should resolve translations within acceptable time', async () => {
    const startTime = performance.now();

    for (let i = 0; i < 1000; i++) {
      const t = await getTranslations('dashboard');
      t('title');
    }

    const endTime = performance.now();
    const timePerIteration = (endTime - startTime) / 1000;

    // Should complete 1000 iterations in under 100ms
    expect(timePerIteration).toBeLessThan(0.1);
  });
});
```

---

## Implementation Checklist

- [ ] Install next-intl and dependencies
- [ ] Create i18n.config.ts with supported locales
- [ ] Configure middleware.ts for locale detection
- [ ] Create translation files (en.json, es.json, pt.json)
- [ ] Implement getTranslations() for server components
- [ ] Implement useTranslations() for client components
- [ ] Create LanguageSwitcher component
- [ ] Set up date/time/number formatting utilities
- [ ] Implement Mobile i18n with Expo
- [ ] Create SEO metadata for each locale
- [ ] Add hreflang tags to metadata
- [ ] Generate locale-specific sitemap
- [ ] Implement RTL support structure
- [ ] Add translation validation tests
- [ ] Document translation key conventions
- [ ] Set up translation update workflow
- [ ] Deploy and test with real users

---

## References

- [next-intl Documentation](https://next-intl-docs.vercel.app/)
- [ICU Message Format](https://unicode-org.github.io/icu/userguide/format_parse/messages/)
- [Intl API Documentation](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl)
- [React i18next](https://react.i18next.com/)
- [expo-localization](https://docs.expo.dev/versions/latest/sdk/localization/)
