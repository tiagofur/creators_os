'use client';

import * as React from 'react';
import { cn } from '@ordo/core';
import { Button, Card, CardContent, CardHeader, CardTitle, Switch, Label } from '@ordo/ui';
import { Check } from 'lucide-react';
import {
  useNotificationPreferences,
  useUpdateNotificationPreferences,
  type NotificationPreferences,
} from '@/hooks/use-notification-preferences';

interface ToggleGroupProps {
  title: string;
  items: { key: string; label: string; checked: boolean; onChange: (v: boolean) => void }[];
}

function ToggleGroup({ title, items }: ToggleGroupProps) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">{title}</h3>
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.key} className="flex items-center justify-between">
            <Label htmlFor={item.key} className="cursor-pointer">{item.label}</Label>
            <Switch
              id={item.key}
              checked={item.checked}
              onCheckedChange={item.onChange}
              aria-label={item.label}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export function NotificationPreferencesForm() {
  const { data: prefs, isLoading } = useNotificationPreferences();
  const updateMutation = useUpdateNotificationPreferences();
  const [localPrefs, setLocalPrefs] = React.useState<NotificationPreferences | null>(null);
  const [saved, setSaved] = React.useState(false);
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    if (prefs && !localPrefs) {
      setLocalPrefs(prefs);
    }
  }, [prefs, localPrefs]);

  function updatePref<K extends keyof NotificationPreferences>(
    group: K,
    key: keyof NotificationPreferences[K],
    value: boolean,
  ) {
    setLocalPrefs((prev) => {
      if (!prev) return prev;
      const updated = {
        ...prev,
        [group]: { ...prev[group], [key]: value },
      };
      // Debounced auto-save
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        updateMutation.mutate(updated, {
          onSuccess: () => {
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
          },
        });
      }, 1000);
      return updated;
    });
  }

  if (isLoading || !localPrefs) {
    return (
      <Card>
        <CardContent className="space-y-4 pt-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="h-4 w-40 animate-pulse rounded bg-muted" />
              <div className="h-5 w-9 animate-pulse rounded-full bg-muted" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  const inApp = localPrefs.inApp;
  const email = localPrefs.email;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Notification preferences</CardTitle>
          {saved && (
            <span className="flex items-center gap-1.5 text-sm text-green-600 dark:text-green-400" role="status" aria-live="polite">
              <Check className="h-3.5 w-3.5" />
              Saved
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <ToggleGroup
          title="In-app notifications"
          items={[
            {
              key: 'xpEarned',
              label: 'XP earned',
              checked: inApp.xpEarned,
              onChange: (v) => updatePref('inApp', 'xpEarned', v),
            },
            {
              key: 'achievementUnlocked',
              label: 'Achievement unlocked',
              checked: inApp.achievementUnlocked,
              onChange: (v) => updatePref('inApp', 'achievementUnlocked', v),
            },
            {
              key: 'levelUp',
              label: 'Level up',
              checked: inApp.levelUp,
              onChange: (v) => updatePref('inApp', 'levelUp', v),
            },
            {
              key: 'teamMemberJoined',
              label: 'Team member joined',
              checked: inApp.teamMemberJoined,
              onChange: (v) => updatePref('inApp', 'teamMemberJoined', v),
            },
            {
              key: 'dealStageChanged',
              label: 'Deal stage changed',
              checked: inApp.dealStageChanged,
              onChange: (v) => updatePref('inApp', 'dealStageChanged', v),
            },
            {
              key: 'publishingReminder',
              label: 'Publishing reminder',
              checked: inApp.publishingReminder,
              onChange: (v) => updatePref('inApp', 'publishingReminder', v),
            },
          ]}
        />

        <div className="border-t pt-6">
          <ToggleGroup
            title="Email notifications"
            items={[
              {
                key: 'weeklyDigest',
                label: 'Weekly digest',
                checked: email.weeklyDigest,
                onChange: (v) => updatePref('email', 'weeklyDigest', v),
              },
              {
                key: 'monthlyReport',
                label: 'Monthly report',
                checked: email.monthlyReport,
                onChange: (v) => updatePref('email', 'monthlyReport', v),
              },
              {
                key: 'teamInvitations',
                label: 'Team invitations',
                checked: email.teamInvitations,
                onChange: (v) => updatePref('email', 'teamInvitations', v),
              },
              {
                key: 'billingAlerts',
                label: 'Billing alerts',
                checked: email.billingAlerts,
                onChange: (v) => updatePref('email', 'billingAlerts', v),
              },
            ]}
          />
        </div>
      </CardContent>
    </Card>
  );
}
