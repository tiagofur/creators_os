'use client';

import { useTheme } from 'next-themes';
import { Sun, Moon, Monitor } from 'lucide-react';
import { Button } from '@ordo/ui';

const THEMES = ['light', 'dark', 'system'] as const;
type Theme = (typeof THEMES)[number];

const themeIcons: Record<Theme, React.ComponentType<{ className?: string }>> = {
  light: Sun,
  dark: Moon,
  system: Monitor,
};

const themeLabels: Record<Theme, string> = {
  light: 'Light mode',
  dark: 'Dark mode',
  system: 'System theme',
};

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  const currentTheme = (THEMES.includes(theme as Theme) ? theme : 'system') as Theme;
  const currentIndex = THEMES.indexOf(currentTheme);
  const nextTheme = THEMES[(currentIndex + 1) % THEMES.length] as Theme;

  const Icon = themeIcons[currentTheme];

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(nextTheme)}
      aria-label={`Current: ${themeLabels[currentTheme]}. Click to switch to ${themeLabels[nextTheme]}`}
    >
      <Icon className="h-4 w-4" />
    </Button>
  );
}
