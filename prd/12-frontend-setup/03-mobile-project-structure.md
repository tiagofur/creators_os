# React Native / Expo Project Structure Specification
## Ordo Creator OS Mobile App

> Complete project structure, file organization, and conventions for the React Native/Expo mobile application with Expo Router (file-based routing), TypeScript, NativeWind (Tailwind CSS for React Native), and shared packages within the Turborepo monorepo.

---

## 1. Mobile App Architecture Overview

### Design Principles

- **Expo Router**: File-based routing (same as Next.js App Router)
- **Shared Packages**: Reuse `ui`, `hooks`, `stores`, `api-client`, `validations`, `types`, `i18n` from monorepo
- **NativeWind**: Tailwind CSS for React Native with platform-specific variants
- **TypeScript**: Strict mode across all code
- **Platform Parity**: iOS and Android features aligned, with platform-specific patterns where needed
- **Offline-First**: AsyncStorage + MMKV for local state persistence
- **Deep Linking**: Universal links (iOS) + App Links (Android)
- **Push Notifications**: Expo Notifications with custom handlers

### Key Features
- Bottom tab navigation (5 main sections)
- Stack navigation for detail screens
- Auth flow with secure token storage
- Real-time sync across tabs
- Dark mode support
- Offline-capable screens

---

## 2. Mobile App Directory Structure (apps/mobile/)

```
apps/mobile/
├── app/                                    # Expo Router root (file-based routing)
│   ├── (auth)/                             # Auth group (shown before login)
│   │   ├── _layout.tsx                     # Auth layout (no tab bar)
│   │   ├── login/index.tsx                 # Login screen
│   │   ├── sign-up/index.tsx               # Sign up screen
│   │   ├── forgot-password/index.tsx       # Password recovery
│   │   ├── verify-email/[token].tsx        # Email verification
│   │   └── onboarding/
│   │       ├── _layout.tsx                 # Onboarding stack
│   │       ├── index.tsx                   # Welcome screen
│   │       ├── workspace-setup.tsx         # Workspace configuration
│   │       └── preferences.tsx             # User preferences setup
│   │
│   ├── (tabs)/                             # Main app (tab-based after login)
│   │   ├── _layout.tsx                     # Tab layout (Bottom Tabs Navigator)
│   │   │
│   │   ├── dashboard/                      # Tab 1: Dashboard
│   │   │   ├── _layout.tsx                 # Stack layout for dashboard
│   │   │   ├── index.tsx                   # Dashboard home
│   │   │   ├── [id].tsx                    # Detail screen (idea/item)
│   │   │   ├── quick-capture.tsx           # Quick capture modal
│   │   │   └── stats/
│   │   │       └── [metric].tsx            # Metric detail drill-down
│   │   │
│   │   ├── pipeline/                       # Tab 2: Pipeline
│   │   │   ├── _layout.tsx                 # Stack layout
│   │   │   ├── index.tsx                   # Pipeline board (Kanban)
│   │   │   ├── [id].tsx                    # Content item detail
│   │   │   ├── create.tsx                  # Create new content
│   │   │   ├── edit/[id].tsx               # Edit content
│   │   │   └── bulk-edit.tsx               # Bulk operations
│   │   │
│   │   ├── studio/                         # Tab 3: Studio (AI Chat)
│   │   │   ├── _layout.tsx                 # Stack layout
│   │   │   ├── index.tsx                   # AI Chat home (chat list)
│   │   │   ├── [chatId].tsx                # Chat conversation detail
│   │   │   ├── new.tsx                     # Start new chat
│   │   │   └── settings/[chatId].tsx       # Chat settings
│   │   │
│   │   ├── analytics/                      # Tab 4: Analytics
│   │   │   ├── _layout.tsx                 # Stack layout
│   │   │   ├── index.tsx                   # Overview dashboard
│   │   │   ├── growth/index.tsx            # Growth metrics
│   │   │   ├── consistency/index.tsx       # Consistency reports
│   │   │   ├── goals/index.tsx             # Goals tracker
│   │   │   ├── reports/[id].tsx            # Report detail
│   │   │   └── _charts.tsx                 # Shared chart components
│   │   │
│   │   └── more/                           # Tab 5: More (Menu)
│   │       ├── _layout.tsx                 # Stack layout
│   │       ├── index.tsx                   # More menu
│   │       ├── inbox.tsx                   # Inbox
│   │       ├── automations.tsx             # Automations
│   │       ├── integrations.tsx            # Integrations list
│   │       ├── settings/
│   │       │   ├── _layout.tsx             # Settings stack
│   │       │   ├── index.tsx               # Settings main
│   │       │   ├── workspace.tsx           # Workspace settings
│   │       │   ├── profile.tsx             # Profile settings
│   │       │   ├── account.tsx             # Account settings
│   │       │   ├── notifications.tsx       # Notification preferences
│   │       │   ├── integrations/
│   │       │   │   ├── index.tsx           # Integrations detail
│   │       │   │   └── [id]/connect.tsx    # Connect integration
│   │       │   └── about.tsx               # About app
│   │       ├── inbox/
│   │       │   ├── _layout.tsx
│   │       │   ├── index.tsx               # Inbox list
│   │       │   └── [id].tsx                # Inbox item detail
│   │       ├── automations/
│   │       │   ├── _layout.tsx
│   │       │   ├── index.tsx               # Automations list
│   │       │   ├── [id].tsx                # Automation detail
│   │       │   └── create.tsx              # Create automation
│   │       └── graveyard.tsx               # Deleted items
│   │
│   ├── _layout.tsx                         # Root layout (RootNavigator)
│   ├── index.tsx                           # Root redirect (to (tabs) or (auth))
│   └── +html.tsx                           # Root HTML wrapper (Expo Web only)
│
├── src/
│   ├── components/                         # Mobile-specific components
│   │   ├── shared/                         # Shared custom components
│   │   │   ├── Button.tsx                  # Mobile-optimized button
│   │   │   ├── Card.tsx                    # Mobile card wrapper
│   │   │   ├── Input.tsx                   # Mobile input field
│   │   │   ├── SelectPicker.tsx            # Native picker for selects
│   │   │   ├── TabNavigator.tsx            # Bottom tabs component
│   │   │   ├── SafeAreaWrapper.tsx         # Safe area handler
│   │   │   ├── TabBarIcon.tsx              # Tab bar icon wrapper
│   │   │   ├── GestureHandler.tsx          # Pan/swipe handlers
│   │   │   └── ErrorBoundary.tsx           # Error fallback UI
│   │   │
│   │   ├── auth/
│   │   │   ├── LoginForm.tsx               # Login form component
│   │   │   ├── SignUpForm.tsx              # Sign up form
│   │   │   ├── PasswordField.tsx           # Secure password input
│   │   │   └── SocialAuthButtons.tsx       # OAuth button group
│   │   │
│   │   ├── dashboard/
│   │   │   ├── StatsCard.tsx               # Metric stat card
│   │   │   ├── WelcomeBanner.tsx           # Welcome section
│   │   │   ├── RecentActivity.tsx          # Activity list
│   │   │   └── QuickActions.tsx            # Quick action buttons
│   │   │
│   │   ├── pipeline/
│   │   │   ├── KanbanColumn.tsx            # Kanban board column
│   │   │   ├── ContentCard.tsx             # Content item card
│   │   │   ├── DragDropWrapper.tsx         # Drag-drop handler
│   │   │   └── FilterBar.tsx               # Filter controls
│   │   │
│   │   ├── studio/
│   │   │   ├── ChatMessage.tsx             # Chat message bubble
│   │   │   ├── ChatInput.tsx               # Chat input (text + attachments)
│   │   │   ├── MessageList.tsx             # Messages scroll view
│   │   │   ├── SuggestedPrompts.tsx        # Suggested prompts
│   │   │   └── TypingIndicator.tsx         # Typing animation
│   │   │
│   │   ├── analytics/
│   │   │   ├── ChartRenderer.tsx           # Chart wrapper (Chart.js for RN)
│   │   │   ├── MetricRow.tsx               # Metric display row
│   │   │   ├── PeriodSelector.tsx          # Date range picker
│   │   │   └── ComparisonCard.tsx          # Comparison visualization
│   │   │
│   │   └── navigation/
│   │       ├── RootNavigator.tsx           # Root nav logic
│   │       ├── AuthNavigator.tsx           # Auth stack (deprecated, in _layout.tsx)
│   │       ├── MainNavigator.tsx           # Main tabs (deprecated, in _layout.tsx)
│   │       └── useNavigation.ts            # Navigation utilities
│   │
│   ├── hooks/                              # Mobile-specific hooks
│   │   ├── useKeyboard.ts                  # Keyboard state
│   │   ├── useSafeArea.ts                  # Safe area insets
│   │   ├── useBackButton.ts                # Android back button handler
│   │   ├── useDeepLinking.ts               # Deep link handler
│   │   ├── usePushNotifications.ts         # Notification listener setup
│   │   ├── useOfflineSync.ts               # Offline data sync
│   │   ├── useNetworkStatus.ts             # Network connectivity
│   │   ├── useDimensions.ts                # Screen dimensions
│   │   ├── useOrientation.ts               # Orientation changes
│   │   └── index.ts                        # Barrel export
│   │
│   ├── services/                           # Mobile-specific services
│   │   ├── auth.service.ts                 # Authentication logic
│   │   ├── storage.service.ts              # AsyncStorage / MMKV wrapper
│   │   ├── notifications.service.ts        # Push notification handling
│   │   ├── sync.service.ts                 # Data sync engine
│   │   ├── deeplink.service.ts             # Deep link router
│   │   ├── camera.service.ts               # Camera / photo picker
│   │   ├── location.service.ts             # Location services (GPS)
│   │   ├── analytics.service.ts            # Event analytics
│   │   └── index.ts                        # Barrel export
│   │
│   ├── utils/
│   │   ├── constants.ts                    # Mobile-specific constants
│   │   ├── formatting.ts                   # Date, number, text formatting
│   │   ├── validators.ts                   # Form validators (mobile-specific)
│   │   ├── device.ts                       # Device info (iOS/Android detection)
│   │   ├── permissions.ts                  # Permissions helpers
│   │   ├── haptics.ts                      # Haptic feedback
│   │   ├── logger.ts                       # Custom logging
│   │   └── index.ts                        # Barrel export
│   │
│   └── stores/                             # Mobile-specific state (Zustand)
│       ├── authStore.ts                    # Auth state (from packages/stores)
│       ├── uiStore.ts                      # UI state (tabs, modals, theme)
│       ├── syncStore.ts                    # Sync status state
│       ├── offlineStore.ts                 # Offline queue state
│       └── index.ts                        # Barrel export
│
├── assets/
│   ├── images/                             # PNG, JPG, WebP
│   │   ├── logos/
│   │   ├── illustrations/
│   │   ├── onboarding/
│   │   └── placeholders/
│   │
│   ├── fonts/
│   │   ├── inter-regular.ttf
│   │   ├── inter-bold.ttf
│   │   └── icons/
│   │       └── custom-icons.ttf            # Custom icon font
│   │
│   ├── lottie/                             # Lottie animation files
│   │   ├── loading.json
│   │   ├── empty-state.json
│   │   └── success.json
│   │
│   └── svg/                                # SVG assets (for vector graphics)
│       ├── icons/
│       ├── illustrations/
│       └── backgrounds/
│
├── types/                                  # Mobile-specific types (extends shared)
│   ├── navigation.types.ts                 # Navigation param types
│   ├── components.types.ts                 # Component props types
│   ├── auth.types.ts                       # Auth types
│   └── index.ts                            # Barrel export
│
├── config/
│   ├── constants.ts                        # App-wide constants
│   ├── theme.ts                            # Theme config (colors, typography)
│   ├── deeplink-config.ts                  # Deep link URL mapping
│   └── env.ts                              # Environment variables
│
├── __tests__/                              # Test files
│   ├── components/
│   ├── hooks/
│   ├── services/
│   ├── utils/
│   └── __fixtures__/                       # Test data
│
├── eas.json                                # EAS Build configuration
├── app.json                                # Expo app configuration
├── .env.example                            # Environment template
├── .env.local                              # Local overrides (git ignored)
├── .env.staging                            # Staging environment
├── .env.production                         # Production environment
├── tailwind.config.js                      # NativeWind config
├── nativewind.config.js                    # NativeWind platform-specific
├── babel.config.js                         # Babel configuration
├── tsconfig.json                           # TypeScript config
├── jest.config.js                          # Jest test config
├── metro.config.js                         # Metro bundler config
├── .gitignore
├── package.json
└── README.md
```

---

## 3. Expo Router Routing Structure

### 3.1 File-Based Routing (App Directory)

Expo Router uses the same file-based routing as Next.js App Router:

- `app/` directory = routes
- `[param]` = dynamic segment (matches any value)
- `[...slug]` = catch-all segment
- `(group)` = route group (doesn't affect URL)
- `_layout.tsx` = layout component for directory
- `index.tsx` = default route

### 3.2 Route Organization

```
URL Path                          File Location
─────────────────────────────────────────────────────────
/                                 app/index.tsx (root redirect)
/login                            app/(auth)/login/index.tsx
/sign-up                          app/(auth)/sign-up/index.tsx
/dashboard                        app/(tabs)/dashboard/index.tsx
/dashboard/123                    app/(tabs)/dashboard/[id].tsx
/pipeline                         app/(tabs)/pipeline/index.tsx
/pipeline/create                  app/(tabs)/pipeline/create.tsx
/studio                           app/(tabs)/studio/index.tsx
/studio/chat-123                  app/(tabs)/studio/[chatId].tsx
/analytics                        app/(tabs)/analytics/index.tsx
/analytics/growth                 app/(tabs)/analytics/growth/index.tsx
/more                             app/(tabs)/more/index.tsx
/more/settings                    app/(tabs)/more/settings/index.tsx
/more/settings/workspace          app/(tabs)/more/settings/workspace.tsx
```

### 3.3 Layout Nesting

```
Root (_layout.tsx)
├── Auth Group (_layout.tsx) → Stack Navigator
│   ├── Login
│   ├── Sign Up
│   ├── Forgot Password
│   └── Onboarding → Stack
│
└── Tabs Group (_layout.tsx) → Bottom Tabs Navigator
    ├── Dashboard → Stack Navigator
    │   ├── Dashboard Home
    │   ├── Detail [id]
    │   └── Stats [metric]
    │
    ├── Pipeline → Stack Navigator
    │   ├── Kanban Board
    │   ├── Detail [id]
    │   ├── Create
    │   └── Edit [id]
    │
    ├── Studio → Stack Navigator
    │   ├── Chat List
    │   ├── Chat Detail [chatId]
    │   └── New Chat
    │
    ├── Analytics → Stack Navigator
    │   ├── Overview
    │   ├── Growth
    │   ├── Consistency
    │   └── Goals
    │
    └── More → Stack Navigator
        ├── Menu
        ├── Inbox
        ├── Automations
        └── Settings → Nested Stack
```

---

## 4. Navigation Structure in Detail

### 4.1 Root Layout (`app/_layout.tsx`)

```typescript
import { Slot, useSegments } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { useEffect } from 'react';

export default function RootLayout() {
  const segments = useSegments();
  const { isLoggedIn, isLoading } = useAuthStore();

  useEffect(() => {
    // Redirect logic based on auth state
    const inAuthGroup = segments[0] === '(auth)';
    if (!isLoggedIn && !inAuthGroup && !isLoading) {
      // Redirect to login
    }
  }, [isLoggedIn, segments, isLoading]);

  if (isLoading) {
    return <SplashScreen />;
  }

  return (
    <RootNavigationWrapper>
      <Slot />
    </RootNavigationWrapper>
  );
}
```

### 4.2 Auth Group Layout (`app/(auth)/_layout.tsx`)

```typescript
import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animationEnabled: true,
        cardStyle: { backgroundColor: 'white' },
      }}
    >
      <Stack.Screen name="login" />
      <Stack.Screen name="sign-up" />
      <Stack.Screen name="forgot-password" />
      <Stack.Screen
        name="onboarding"
        options={{
          animationEnabled: false,
          gestureEnabled: false
        }}
      />
    </Stack>
  );
}
```

### 4.3 Tabs Group Layout (`app/(tabs)/_layout.tsx`)

```typescript
import { BottomTabNavigationOptions, createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColorScheme } from '@/hooks/useColorScheme';

const Tab = createBottomTabNavigator();

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const isDark = useColorScheme() === 'dark';

  const tabScreenOptions: BottomTabNavigationOptions = {
    tabBarActiveTintColor: isDark ? '#fff' : '#000',
    tabBarInactiveTintColor: isDark ? '#666' : '#999',
    tabBarLabelStyle: { fontSize: 11, fontWeight: '500' },
    tabBarStyle: {
      height: 60 + insets.bottom,
      paddingBottom: insets.bottom,
      borderTopColor: isDark ? '#222' : '#eee',
    },
    headerShown: false,
  };

  return (
    <Tab.Navigator screenOptions={tabScreenOptions}>
      <Tab.Screen
        name="dashboard"
        options={{
          tabBarLabel: 'Dashboard',
          tabBarIcon: ({ color }) => <DashboardIcon color={color} />,
        }}
      />
      <Tab.Screen
        name="pipeline"
        options={{
          tabBarLabel: 'Pipeline',
          tabBarIcon: ({ color }) => <PipelineIcon color={color} />,
        }}
      />
      <Tab.Screen
        name="studio"
        options={{
          tabBarLabel: 'Studio',
          tabBarIcon: ({ color }) => <StudioIcon color={color} />,
        }}
      />
      <Tab.Screen
        name="analytics"
        options={{
          tabBarLabel: 'Analytics',
          tabBarIcon: ({ color }) => <AnalyticsIcon color={color} />,
        }}
      />
      <Tab.Screen
        name="more"
        options={{
          tabBarLabel: 'More',
          tabBarIcon: ({ color }) => <MoreIcon color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}
```

### 4.4 Stack Layouts (Dashboard Example: `app/(tabs)/dashboard/_layout.tsx`)

```typescript
import { Stack } from 'expo-router';
import { useColorScheme } from '@/hooks/useColorScheme';

export default function DashboardLayout() {
  const isDark = useColorScheme() === 'dark';

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: isDark ? '#1a1a1a' : '#fff',
        },
        headerTintColor: isDark ? '#fff' : '#000',
        headerTitleStyle: {
          fontWeight: '600',
          fontSize: 18,
        },
        cardStyle: { backgroundColor: isDark ? '#000' : '#fff' },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'Dashboard',
          headerShown: false, // Custom header in screen
        }}
      />
      <Stack.Screen
        name="[id]"
        options={({ route }) => ({
          title: route.params?.title || 'Details',
        })}
      />
      <Stack.Screen
        name="quick-capture"
        options={{
          presentation: 'modal',
          animationEnabled: true,
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="stats/[metric]"
        options={({ route }) => ({
          title: route.params?.metric || 'Metric',
        })}
      />
    </Stack>
  );
}
```

---

## 5. Shared Component Architecture

### 5.1 Importing from `packages/ui`

The mobile app shares components from the monorepo's `packages/ui` library. Many components need platform-specific variants.

### 5.2 Platform-Specific Imports

Use file extensions to provide platform variants:

```
packages/ui/src/
├── Button.tsx                  # Base component
├── Button.web.tsx             # Web-only override
├── Button.native.tsx          # Native-only override
└── index.ts
```

Import without extension (React Native auto-selects):
```typescript
import { Button } from '@/ui/Button';  // Uses Button.native.tsx on mobile
```

### 5.3 Mobile-Specific Component Wrappers

For components that don't exist in the shared library, create in `src/components/`:

```typescript
// src/components/shared/Button.tsx
import { Pressable, Text } from 'react-native';
import { useColorScheme } from '@/hooks/useColorScheme';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'tertiary';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
}: ButtonProps) {
  const isDark = useColorScheme() === 'dark';

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      className={cn(
        'rounded-lg px-4 py-2 items-center justify-center',
        variant === 'primary' && (isDark ? 'bg-blue-600' : 'bg-blue-500'),
        variant === 'secondary' && (isDark ? 'bg-gray-700' : 'bg-gray-200'),
        size === 'sm' && 'px-3 py-1',
        size === 'lg' && 'px-6 py-3',
        disabled && 'opacity-50',
      )}
    >
      {loading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Text className="text-white font-semibold">{label}</Text>
      )}
    </Pressable>
  );
}
```

### 5.4 Shared Package Imports

```typescript
// Validations (Zod schemas)
import { loginSchema } from '@ordo/validations/auth';

// API Client (React Query hooks)
import { useGetDashboard, useCreateContent } from '@ordo/api-client/hooks';

// Types
import type { User, Dashboard } from '@ordo/types';

// i18n
import { useTranslation } from '@ordo/i18n';

// Stores (Zustand)
import { useAuthStore, usePipelineStore } from '@ordo/stores';

// Hooks (custom React hooks)
import { useDebounce, useAsync } from '@ordo/hooks';
```

---

## 6. NativeWind Configuration

### 6.1 Installation & Setup

```bash
npm install nativewind tailwindcss react-native-reanimated

npx tailwindcss init --config tailwind.config.js
```

### 6.2 `tailwind.config.js`

```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Shared with web from packages/config/tailwind.config.js
        primary: '#3b82f6',
        secondary: '#8b5cf6',
        success: '#10b981',
        warning: '#f59e0b',
        error: '#ef4444',
        // Dark mode
        dark: {
          bg: '#0f172a',
          surface: '#1e293b',
          border: '#334155',
        },
      },
      spacing: {
        'safe-bottom': 'env(safe-area-inset-bottom)',
        'safe-top': 'env(safe-area-inset-top)',
      },
      fontSize: {
        xs: ['12px', { lineHeight: '16px' }],
        sm: ['14px', { lineHeight: '20px' }],
        base: ['16px', { lineHeight: '24px' }],
        lg: ['18px', { lineHeight: '28px' }],
        xl: ['20px', { lineHeight: '28px' }],
      },
    },
  },
  plugins: [],
};
```

### 6.3 `nativewind.config.js`

```javascript
module.exports = {
  input: './tailwind.config.js',
  output: './nativewind.json',
};
```

### 6.4 `babel.config.js`

```javascript
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
    plugins: [
      'react-native-reanimated/plugin',
    ],
  };
};
```

### 6.5 Usage in Components

```typescript
import { View, Text, Pressable } from 'react-native';
import { cn } from '@/utils/cn';

export function Card({ isDark }) {
  return (
    <View className={cn(
      'rounded-lg p-4 mb-4',
      isDark ? 'bg-gray-900 border border-gray-800' : 'bg-white border border-gray-200'
    )}>
      <Text className="text-lg font-bold text-white">Metric</Text>
      <Text className={cn(
        'text-sm mt-2',
        isDark ? 'text-gray-400' : 'text-gray-600'
      )}>
        Value: 42
      </Text>
    </View>
  );
}
```

---

## 7. Platform-Specific Patterns

### 7.1 iOS vs Android Differences

#### Safe Area Handling

```typescript
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function SafeAreaView() {
  const insets = useSafeAreaInsets();

  return (
    <View style={{
      paddingTop: insets.top,
      paddingBottom: insets.bottom,
      paddingLeft: insets.left,
      paddingRight: insets.right,
    }}>
      {/* Content */}
    </View>
  );
}
```

#### Status Bar & Navigation Bar

```typescript
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from '@/hooks/useColorScheme';

export default function App() {
  const isDark = useColorScheme() === 'dark';

  return (
    <>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={isDark ? '#000' : '#fff'}
      />
      {/* App content */}
    </>
  );
}
```

#### Back Button (Android)

```typescript
import { useBackButton } from '@/hooks/useBackButton';
import { useRouter } from 'expo-router';

export function ScreenWithCustomBack() {
  const router = useRouter();

  useBackButton(() => {
    // Custom back logic
    router.back();
    return true; // Return true to prevent default behavior
  });

  return <View>{/* Content */}</View>;
}
```

### 7.2 Platform-Specific File Names

```
components/
├── Header.tsx              # Shared logic
├── Header.ios.tsx          # iOS-only override
├── Header.android.tsx      # Android-only override
└── index.ts
```

React Native automatically imports the correct file:
```typescript
import { Header } from '@/components/Header'; // Selects .ios or .android automatically
```

### 7.3 Device Detection Utility

```typescript
// src/utils/device.ts
import { Platform } from 'react-native';
import { getDeviceTypeAsync } from 'expo-device';

export const isIOS = Platform.OS === 'ios';
export const isAndroid = Platform.OS === 'android';
export const isWeb = Platform.OS === 'web';

export async function getDeviceType() {
  return await getDeviceTypeAsync();
}

// Usage
import { isIOS } from '@/utils/device';

if (isIOS) {
  // iOS-specific code
}
```

---

## 8. File Naming Conventions

### 8.1 Component Files

```
src/components/shared/Button.tsx
src/components/dashboard/StatsCard.tsx
src/components/auth/LoginForm.tsx
```

**Convention**:
- PascalCase for component files
- One component per file (except for tightly coupled sub-components)
- Related components in subdirectories

### 8.2 Utility & Service Files

```
src/utils/formatting.ts
src/utils/validators.ts
src/services/auth.service.ts
src/services/storage.service.ts
src/hooks/useKeyboard.ts
src/stores/authStore.ts
```

**Convention**:
- camelCase for utility and service files
- Suffix with `.service.ts` for services
- Suffix with `.ts` for utilities
- Prefix with `use` for hooks (React convention)

### 8.3 Type Files

```
src/types/navigation.types.ts
src/types/components.types.ts
types/index.ts (barrel export)
```

**Convention**:
- Suffix with `.types.ts`
- Can be in `src/types/` or co-located with related files

### 8.4 Screen Files (in app/)

```
app/(tabs)/dashboard/index.tsx      # Main screen
app/(tabs)/dashboard/[id].tsx       # Dynamic detail screen
app/(tabs)/dashboard/quick-capture.tsx
```

**Convention**:
- kebab-case for folders with special meaning
- index.tsx = default route
- [param].tsx = dynamic route

---

## 9. Environment Setup

### 9.1 `.env` Files

```
# .env.example
EXPO_PUBLIC_API_URL=https://api.example.com
EXPO_PUBLIC_API_VERSION=v1
EXPO_PUBLIC_ENVIRONMENT=development
EXPO_PUBLIC_APP_NAME=Ordo
EXPO_PUBLIC_SENTRY_DSN=

# Local overrides (git-ignored)
API_ACCESS_TOKEN=
SECURE_STORE_KEY=
```

**Convention**:
- `EXPO_PUBLIC_*` = exposed to frontend (safe, non-sensitive)
- Other variables = kept secure (not sent to client)

### 9.2 Accessing Environment Variables

```typescript
// src/config/env.ts
import Constants from 'expo-constants';

export const ENV = {
  API_URL: Constants.expoConfig?.extra?.apiUrl || 'https://api.example.com',
  API_VERSION: Constants.expoConfig?.extra?.apiVersion || 'v1',
  ENVIRONMENT: Constants.expoConfig?.extra?.environment || 'development',
  APP_NAME: Constants.expoConfig?.name,
  SENTRY_DSN: Constants.expoConfig?.extra?.sentryDsn,
};

// Usage
import { ENV } from '@/config/env';

const apiUrl = `${ENV.API_URL}/${ENV.API_VERSION}/...`;
```

### 9.3 `app.json` (Expo Configuration)

```json
{
  "expo": {
    "name": "Ordo Creator OS",
    "slug": "ordo-mobile",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/images/icon.png",
    "splash": {
      "image": "./assets/images/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "updates": {
      "fallbackToCacheTimeout": 0,
      "url": "https://u.expo.dev/PROJECT_ID"
    },
    "assetBundlePatterns": ["**/*"],
    "ios": {
      "supportsTabletMode": false,
      "bundleIdentifier": "com.ordo.creator",
      "usesNonExemptEncryption": false,
      "infoPlist": {
        "NSLocalNetworkUsageDescription": "Allow local network access for collaboration",
        "NSBonjourServiceTypes": ["_ordo._tcp"],
        "NSCameraUsageDescription": "Camera access for content creation",
        "NSMicrophoneUsageDescription": "Microphone access for audio content",
        "NSPhotoLibraryUsageDescription": "Photo access for content uploads"
      }
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/images/adaptive-icon.png",
        "backgroundColor": "#ffffff"
      },
      "permissions": [
        "android.permission.CAMERA",
        "android.permission.RECORD_AUDIO",
        "android.permission.READ_MEDIA_IMAGES",
        "android.permission.READ_MEDIA_VIDEO",
        "android.permission.ACCESS_FINE_LOCATION",
        "android.permission.ACCESS_COARSE_LOCATION"
      ],
      "package": "com.ordo.creator"
    },
    "web": {
      "favicon": "./assets/images/favicon.png"
    },
    "plugins": [
      "expo-router",
      [
        "expo-notifications",
        {
          "icon": "./assets/images/notification-icon.png",
          "color": "#ffffff",
          "sounds": ["./assets/sounds/notification.wav"]
        }
      ],
      [
        "expo-camera",
        {
          "cameraPermission": "Allow Ordo to access your camera"
        }
      ],
      [
        "expo-media-library",
        {
          "photosPermission": "Allow Ordo to access your photos"
        }
      ]
    ],
    "extra": {
      "apiUrl": "https://api.ordo.com",
      "apiVersion": "v1",
      "environment": "development",
      "sentryDsn": "",
      "eas": {
        "projectId": "PROJECT_ID"
      }
    },
    "scheme": "ordo"
  }
}
```

### 9.4 `eas.json` (Build Configuration)

```json
{
  "cli": {
    "version": ">= 5.0.0",
    "promptToConfigurePushNotifications": false
  },
  "build": {
    "preview": {
      "android": {
        "buildType": "apk",
        "distribution": "internal"
      },
      "ios": {
        "buildType": "simulator"
      }
    },
    "preview-ios": {
      "ios": {
        "buildType": "simulator"
      }
    },
    "preview-android": {
      "android": {
        "buildType": "apk",
        "distribution": "internal"
      }
    },
    "staging": {
      "android": {
        "buildType": "apk"
      },
      "ios": true,
      "env": {
        "EXPO_PUBLIC_ENVIRONMENT": "staging"
      }
    },
    "production": {
      "android": {
        "buildType": "aab"
      },
      "ios": true,
      "env": {
        "EXPO_PUBLIC_ENVIRONMENT": "production"
      }
    }
  },
  "submit": {
    "production-ios": {
      "ios": true
    },
    "production-android": {
      "android": true
    }
  }
}
```

---

## 10. Deep Linking Configuration

### 10.1 Universal Links (iOS) & App Links (Android)

Update `app.json`:
```json
{
  "scheme": "ordo",
  "plugins": [
    [
      "expo-router",
      {
        "origin": "https://ordo.com"
      }
    ]
  ]
}
```

### 10.2 Deep Link Service

```typescript
// src/services/deeplink.service.ts
import { useEffect } from 'react';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';

const linking = {
  prefixes: ['ordo://', 'https://ordo.com'],
  config: {
    screens: {
      'dashboard': 'dashboard',
      'dashboard/[id]': 'dashboard/:id',
      'pipeline': 'pipeline',
      'pipeline/[id]': 'pipeline/:id',
      'studio': 'studio',
      'studio/[chatId]': 'studio/:chatId',
      'analytics': 'analytics',
      'more/settings': 'settings',
      'not-found': '*',
    },
  },
};

export function useDeepLinking() {
  const router = useRouter();

  useEffect(() => {
    const getInitialUrl = async () => {
      const url = await Linking.getInitialURL();
      if (url != null) {
        setInitialRoute(url);
      }
    };

    getInitialUrl();

    const subscription = Linking.addEventListener('url', ({ url }) => {
      const route = url.replace(/.*?:\/\//g, '');
      router.push(route);
    });

    return () => subscription.remove();
  }, [router]);

  return linking;
}
```

### 10.3 Linking Configuration in Root Layout

```typescript
import { useDeepLinking } from '@/services/deeplink.service';

export default function RootLayout() {
  const linking = useDeepLinking();

  return (
    <NavigationContainer linking={linking} fallback={<SplashScreen />}>
      <Slot />
    </NavigationContainer>
  );
}
```

---

## 11. Push Notifications Setup

### 11.1 Expo Notifications Configuration

`app.json`:
```json
{
  "plugins": [
    [
      "expo-notifications",
      {
        "icon": "./assets/images/notification-icon.png",
        "color": "#ffffff",
        "sounds": ["./assets/sounds/notification.wav"],
        "defaultChannel": "default",
        "channels": [
          {
            "id": "default",
            "name": "Default",
            "sound": "notification.wav",
            "priority": "max",
            "lights": true,
            "vibrationPattern": [0, 250, 250, 250],
            "lightColor": "#FF0000"
          }
        ]
      }
    ]
  ]
}
```

### 11.2 Notifications Service

```typescript
// src/services/notifications.service.ts
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { useEffect } from 'react';
import { useAuthStore } from '@ordo/stores';

// Set notification handler
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const data = notification.request.content.data;

    // Handle notification logic (navigate, show alert, etc.)
    console.log('Notification received:', data);

    return {
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    };
  },
});

export async function registerForPushNotificationsAsync() {
  if (!Device.isDevice) {
    console.warn('Push notifications only work on physical devices');
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.warn('Failed to get push notification permissions');
    return null;
  }

  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  if (!projectId) {
    throw new Error('Missing EAS project ID');
  }

  const pushToken = await Notifications.getExpoPushTokenAsync({ projectId });
  return pushToken.data;
}

export function usePushNotifications() {
  const { user } = useAuthStore();

  useEffect(() => {
    registerForPushNotificationsAsync()
      .then(token => {
        if (token && user?.id) {
          // Send token to backend
          console.log('Push token:', token);
        }
      })
      .catch(err => console.error('Push notification setup failed:', err));

    // Listen for notifications
    const notificationListener = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received in foreground:', notification);
    });

    const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      console.log('Notification tapped:', data);
      // Navigate based on notification type
    });

    return () => {
      Notifications.removeNotificationSubscription(notificationListener);
      Notifications.removeNotificationSubscription(responseListener);
    };
  }, [user?.id]);
}
```

### 11.3 Usage in Root Layout

```typescript
import { usePushNotifications } from '@/services/notifications.service';

export default function RootLayout() {
  usePushNotifications();

  return <Slot />;
}
```

---

## 12. Offline Storage & Sync

### 12.1 AsyncStorage Setup

```typescript
// src/services/storage.service.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import MMKV from 'react-native-mmkv';

// AsyncStorage for complex data (JSON)
export async function saveData(key: string, value: any) {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Failed to save ${key}:`, error);
  }
}

export async function getData<T>(key: string): Promise<T | null> {
  try {
    const value = await AsyncStorage.getItem(key);
    return value ? JSON.parse(value) : null;
  } catch (error) {
    console.error(`Failed to get ${key}:`, error);
    return null;
  }
}

export async function removeData(key: string) {
  try {
    await AsyncStorage.removeItem(key);
  } catch (error) {
    console.error(`Failed to remove ${key}:`, error);
  }
}

// MMKV for high-frequency access (tokens, prefs)
const mmkv = new MMKV();

export function setSecure(key: string, value: string) {
  mmkv.set(key, value);
}

export function getSecure(key: string): string | null {
  return mmkv.getString(key) || null;
}

export function removeSecure(key: string) {
  mmkv.delete(key);
}

// Clear all data on logout
export async function clearAllData() {
  try {
    await AsyncStorage.clear();
    mmkv.clearAll();
  } catch (error) {
    console.error('Failed to clear storage:', error);
  }
}
```

### 12.2 Offline Queue Store

```typescript
// src/stores/offlineStore.ts
import create from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface QueuedAction {
  id: string;
  action: 'create' | 'update' | 'delete';
  resource: string;
  resourceId?: string;
  payload: any;
  timestamp: number;
  retries: number;
}

interface OfflineStoreState {
  queue: QueuedAction[];
  isOnline: boolean;
  addToQueue: (action: QueuedAction) => Promise<void>;
  removeFromQueue: (id: string) => Promise<void>;
  syncQueue: () => Promise<void>;
  setOnlineStatus: (online: boolean) => void;
}

export const useOfflineStore = create<OfflineStoreState>((set, get) => ({
  queue: [],
  isOnline: true,

  addToQueue: async (action) => {
    const queue = [...get().queue, action];
    set({ queue });
    await AsyncStorage.setItem('offline_queue', JSON.stringify(queue));
  },

  removeFromQueue: async (id) => {
    const queue = get().queue.filter(a => a.id !== id);
    set({ queue });
    await AsyncStorage.setItem('offline_queue', JSON.stringify(queue));
  },

  syncQueue: async () => {
    const { queue, isOnline } = get();
    if (!isOnline || queue.length === 0) return;

    for (const action of queue) {
      try {
        // Call API to process action
        await processAction(action);
        await get().removeFromQueue(action.id);
      } catch (error) {
        console.error('Failed to sync action:', action.id, error);
      }
    }
  },

  setOnlineStatus: (online) => set({ isOnline: online }),
}));

async function processAction(action: QueuedAction) {
  // API call implementation
  console.log('Processing action:', action);
}
```

### 12.3 Network Status Hook

```typescript
// src/hooks/useNetworkStatus.ts
import { useEffect, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { useOfflineStore } from '@/stores/offlineStore';

export function useNetworkStatus() {
  const [isConnected, setIsConnected] = useState(true);
  const setOnlineStatus = useOfflineStore(state => state.setOnlineStatus);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      const online = state.isConnected && state.isInternetReachable;
      setIsConnected(online || false);
      setOnlineStatus(online || false);

      // Sync queue when coming back online
      if (online) {
        useOfflineStore.getState().syncQueue();
      }
    });

    return () => unsubscribe();
  }, [setOnlineStatus]);

  return isConnected;
}
```

---

## 13. Getting Started Commands

### 13.1 Installation

```bash
# From project root
cd apps/mobile

# Install dependencies
pnpm install

# Install Expo CLI globally (one-time)
npm install -g eas-cli expo-cli

# Link EAS project
eas init
```

### 13.2 Development

```bash
# Start Expo dev server
pnpm start

# Run on iOS simulator
pnpm ios

# Run on Android emulator
pnpm android

# Run web version
pnpm web

# Tunnel mode (for remote devices)
pnpm start --tunnel

# With specific environment
EXPO_PUBLIC_ENVIRONMENT=staging pnpm start
```

### 13.3 Building & Deploying

```bash
# Build preview (internal testing)
eas build --platform ios --profile preview
eas build --platform android --profile preview

# Build staging
eas build --platform ios --profile staging
eas build --platform android --profile staging

# Build production
eas build --platform ios --profile production
eas build --platform android --profile production

# Submit to app stores
eas submit --platform ios --latest
eas submit --platform android --latest
```

### 13.4 Testing

```bash
# Run tests
pnpm test

# Run tests with coverage
pnpm test:coverage

# Watch mode
pnpm test:watch

# End-to-end tests (Detox)
pnpm e2e

# Type checking
pnpm type-check
```

---

## 14. Electron Desktop App Structure (P1)

> **Priority**: P1 - Basic setup with Vite + React + Electron. This is a future-looking foundation; development will ramp up post-MVP for web and mobile.

### 14.1 Directory Structure

```
apps/desktop/
├── public/
│   ├── icon.png                    # App icon
│   ├── icon-128x128.png
│   ├── icon-256x256.png
│   └── preload.js                  # Preload script (IPC bridge)
│
├── src/
│   ├── main/
│   │   ├── main.ts                 # Electron main process
│   │   ├── preload.ts              # Preload script (security)
│   │   ├── ipc-handlers.ts         # IPC event handlers
│   │   ├── windows.ts              # Window management
│   │   ├── menu.ts                 # Application menu
│   │   └── utils.ts                # Main process utilities
│   │
│   ├── renderer/
│   │   ├── app/                    # Same routing as web/mobile
│   │   ├── src/
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── services/
│   │   │   └── utils/
│   │   ├── main.tsx                # React app entry
│   │   ├── App.tsx                 # Root component
│   │   └── index.css
│   │
│   ├── shared/
│   │   ├── ipc-events.ts           # IPC event definitions
│   │   └── types.ts                # Shared types
│   │
│   └── index.ts
│
├── dist/
│   ├── main.js                     # Compiled main process
│   └── renderer/                   # Compiled React app
│
├── electron-builder.yml            # Build configuration
├── vite.config.ts                  # Vite config
├── tsconfig.json
├── package.json
└── README.md
```

### 14.2 Vite Configuration

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src/renderer/src'),
      '@shared': path.resolve(__dirname, './src/shared'),
    },
  },
  build: {
    outDir: 'dist/renderer',
  },
});
```

### 14.3 Electron Main Process

```typescript
// src/main/main.ts
import { app, BrowserWindow, Menu, ipcMain } from 'electron';
import isDev from 'electron-is-dev';
import path from 'path';

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 1024,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, '../public/preload.js'),
      contextIsolation: true,
      enableRemoteModule: false,
      nodeIntegration: false,
    },
  });

  const startUrl = isDev
    ? 'http://localhost:5173'
    : `file://${path.join(__dirname, '../renderer/index.html')}`;

  mainWindow.loadURL(startUrl);

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.on('ready', () => {
  createWindow();
  createMenu();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

function createMenu() {
  const menu = Menu.buildFromTemplate([
    {
      label: 'File',
      submenu: [
        {
          label: 'Exit',
          accelerator: 'CmdOrCtrl+Q',
          click: () => app.quit(),
        },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
      ],
    },
  ]);

  Menu.setApplicationMenu(menu);
}

// IPC event handlers
ipcMain.handle('get-app-path', () => app.getAppPath());
ipcMain.handle('get-version', () => app.getVersion());
```

### 14.4 Preload Script (Security Bridge)

```typescript
// src/main/preload.ts
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electron', {
  ipcRenderer: {
    send: (channel: string, args: any) => ipcRenderer.send(channel, args),
    invoke: (channel: string, args: any) => ipcRenderer.invoke(channel, args),
    on: (channel: string, listener: any) => ipcRenderer.on(channel, listener),
    removeListener: (channel: string, listener: any) =>
      ipcRenderer.removeListener(channel, listener),
  },
});
```

### 14.5 React App Entry

```typescript
// src/renderer/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

### 14.6 Electron Builder Configuration

```yaml
# electron-builder.yml
appId: com.ordo.desktop
productName: Ordo Creator OS
directories:
  buildResources: public
  output: dist/electron

files:
  - dist/main.js
  - dist/renderer
  - public/preload.js
  - node_modules

win:
  target:
    - nsis
    - portable
  certificateFile: null

mac:
  target:
    - dmg
    - zip
  category: public.app-category.productivity

android: null
```

### 14.7 Build & Run Commands

```bash
# Development
pnpm dev                    # Start Vite dev server + Electron with hot reload

# Build
pnpm build                  # Build React app + package Electron app

# Package for distribution
pnpm dist                   # Create installers for all platforms
```

---

## 15. Testing Strategy

### 15.1 Test Structure

```
__tests__/
├── components/
│   ├── shared/
│   │   ├── Button.test.tsx
│   │   └── Card.test.tsx
│   ├── auth/
│   │   └── LoginForm.test.tsx
│   └── dashboard/
│       └── StatsCard.test.tsx
├── hooks/
│   ├── useNetworkStatus.test.ts
│   └── usePushNotifications.test.ts
├── services/
│   ├── auth.service.test.ts
│   └── storage.service.test.ts
├── utils/
│   └── device.test.ts
└── __fixtures__/
    ├── mock-data.ts
    └── test-utils.tsx
```

### 15.2 Jest Configuration

```javascript
// jest.config.js
module.exports = {
  preset: 'react-native',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/__tests__/setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@ordo/(.*)$': '<rootDir>/../../packages/$1',
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    'app/**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
};
```

---

## 16. Performance Optimization

### 16.1 Code Splitting with Expo Router

Routes are automatically code-split by Expo Router. Additional optimization:

```typescript
// src/utils/lazy-loading.ts
import { lazy, Suspense } from 'react';

export function withLazyLoad(Component: React.ReactType) {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Component />
    </Suspense>
  );
}
```

### 16.2 Image Optimization

```typescript
import { Image } from 'react-native';

<Image
  source={require('@/assets/images/dashboard.png')}
  style={{ width: 200, height: 200 }}
  // Use native image optimization
  defaultSource={require('@/assets/images/placeholder.png')}
/>
```

### 16.3 Memoization

```typescript
import { memo, useMemo, useCallback } from 'react';

const StatsCard = memo(({ data }: { data: Stats }) => {
  const formattedValue = useMemo(() =>
    data.value.toLocaleString(),
    [data.value]
  );

  const handlePress = useCallback(() => {
    // Navigate to detail
  }, []);

  return <Card>{formattedValue}</Card>;
});
```

---

## 17. CI/CD for Mobile & Desktop

### 17.1 GitHub Actions Workflow

```yaml
# .github/workflows/mobile-build.yml
name: Mobile Build & Deploy

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
          cache: 'pnpm'

      - run: pnpm install
      - run: pnpm lint --filter=@ordo/mobile
      - run: pnpm test --filter=@ordo/mobile
      - run: pnpm type-check --filter=@ordo/mobile

  eas-build:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v3
      - uses: expo/expo-github-action@v8
        with:
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}

      - name: Build iOS
        run: eas build --platform ios --profile production --non-interactive

      - name: Build Android
        run: eas build --platform android --profile production --non-interactive
```

---

## 18. Summary & Checklist

### Pre-Development Checklist

- [ ] Set up Turborepo monorepo structure
- [ ] Configure Expo project (`expo init`)
- [ ] Install dependencies: `pnpm install`
- [ ] Set up NativeWind and Tailwind CSS
- [ ] Configure Expo Router file-based routing
- [ ] Set up authentication flow with secure storage
- [ ] Configure deep linking
- [ ] Set up push notifications with Expo Notifications
- [ ] Implement offline storage (AsyncStorage + MMKV)
- [ ] Create shared component library bridges
- [ ] Set up environment variables (`.env` files)
- [ ] Configure EAS builds for iOS and Android
- [ ] Set up testing infrastructure (Jest + React Native Testing Library)
- [ ] Configure CI/CD pipeline (GitHub Actions)
- [ ] Create desktop app foundation with Electron + Vite
- [ ] Document API integration patterns
- [ ] Set up error tracking (Sentry)

### Key Dependencies

```json
{
  "expo": "^50.0.0",
  "expo-router": "^2.0.0",
  "react": "^18.2.0",
  "react-native": "^0.73.0",
  "nativewind": "^2.0.0",
  "tailwindcss": "^3.3.0",
  "zustand": "^4.4.0",
  "react-query": "^3.39.0",
  "zod": "^3.22.0",
  "typescript": "^5.3.0"
}
```

---

## References

- [Expo Router Docs](https://expo.github.io/router/)
- [NativeWind Docs](https://www.nativewind.dev/)
- [React Native Documentation](https://reactnative.dev/)
- [Expo Notifications](https://docs.expo.dev/notifications/overview/)
- [React Navigation](https://reactnavigation.org/)
- [Electron Documentation](https://www.electronjs.org/docs)
- [Vite Documentation](https://vitejs.dev/)
