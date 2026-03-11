'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Textarea, Separator } from '@ordo/ui';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@ordo/ui';
import { useAuth } from '@ordo/hooks';
import { apiClient } from '@/lib/api-client';
import { AvatarUpload } from './avatar-upload';

interface ProfileFormValues {
  name: string;
  handle: string;
  bio: string;
  website: string;
  timezone: string;
}

export function ProfileForm() {
  const { user } = useAuth();
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deleteEmail, setDeleteEmail] = React.useState('');
  const [deleting, setDeleting] = React.useState(false);
  const [avatarUrl, setAvatarUrl] = React.useState<string | null>(user?.avatar_url ?? null);

  const { register, handleSubmit, formState: { isSubmitting } } = useForm<ProfileFormValues>({
    defaultValues: {
      name: user?.name ?? '',
      handle: (user as Record<string, unknown>)?.handle as string ?? '',
      bio: (user as Record<string, unknown>)?.bio as string ?? '',
      website: (user as Record<string, unknown>)?.website as string ?? '',
      timezone: (user as Record<string, unknown>)?.timezone as string ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
  });

  async function onSubmit(data: ProfileFormValues) {
    try {
      await apiClient.patch('/v1/users/me', { ...data, avatarUrl });
      toast.success('Profile saved.');
    } catch {
      toast.error('Failed to save profile. Please try again.');
    }
  }

  async function handleDeleteAccount() {
    if (deleteEmail !== user?.email) {
      toast.error('Email does not match. Account not deleted.');
      return;
    }
    setDeleting(true);
    try {
      await apiClient.delete('/v1/users/me');
      window.location.href = '/';
    } catch {
      toast.error('Failed to delete account. Please contact support.');
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <Label>Avatar</Label>
              <div className="mt-2">
                <AvatarUpload
                  currentUrl={avatarUrl}
                  name={user?.name ?? 'User'}
                  onChange={setAvatarUrl}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="name">Display name</Label>
                <Input
                  id="name"
                  placeholder="Your name"
                  {...register('name', { required: true })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="handle">Username / handle</Label>
                <Input
                  id="handle"
                  placeholder="@yourhandle"
                  {...register('handle')}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                placeholder="Tell the world about yourself…"
                maxLength={200}
                rows={3}
                {...register('bio')}
              />
              <p className="text-xs text-muted-foreground">Max 200 characters</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="website">Website URL</Label>
              <Input
                id="website"
                type="url"
                placeholder="https://yourwebsite.com"
                {...register('website')}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="timezone">Timezone</Label>
              <Input
                id="timezone"
                placeholder="America/New_York"
                {...register('timezone')}
              />
            </div>

            <div className="flex justify-end">
              <Button type="submit" loading={isSubmitting}>
                Save changes
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Danger zone */}
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-destructive">Danger zone</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Permanently delete your account and all associated data. This action cannot be undone.
          </p>
          <Button
            variant="destructive"
            size="sm"
            className="mt-3"
            onClick={() => setDeleteOpen(true)}
          >
            Delete account
          </Button>
        </CardContent>
      </Card>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete account</DialogTitle>
            <DialogDescription>
              This action is permanent and cannot be undone. All your data will be removed.
              Type your email address to confirm.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-1.5">
            <Label htmlFor="confirm-email">Your email: {user?.email}</Label>
            <Input
              id="confirm-email"
              type="email"
              placeholder={user?.email}
              value={deleteEmail}
              onChange={(e) => setDeleteEmail(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              loading={deleting}
              onClick={handleDeleteAccount}
              disabled={deleteEmail !== user?.email}
            >
              Delete my account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
