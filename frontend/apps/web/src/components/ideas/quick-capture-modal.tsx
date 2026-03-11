'use client';

import * as React from 'react';
import { X } from 'lucide-react';
import { cn } from '@ordo/core';
import {
  Button,
  Textarea,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@ordo/ui';
import { useCreateIdea } from '@/hooks/use-ideas';
import { useWorkspaceStore } from '@ordo/stores';
import { useToast } from '@ordo/ui';
import { trackEvent } from '@/lib/analytics';

type Platform =
  | 'youtube'
  | 'instagram'
  | 'tiktok'
  | 'twitter'
  | 'linkedin'
  | 'podcast'
  | 'blog';

const PLATFORMS: { value: Platform; label: string }[] = [
  { value: 'youtube', label: 'YouTube' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'twitter', label: 'Twitter' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'podcast', label: 'Podcast' },
  { value: 'blog', label: 'Blog' },
];

const MAX_CHARS = 500;

interface QuickCaptureModalProps {
  open: boolean;
  onClose: () => void;
}

export function QuickCaptureModal({ open, onClose }: QuickCaptureModalProps) {
  const [text, setText] = React.useState('');
  const [selectedPlatforms, setSelectedPlatforms] = React.useState<Platform[]>([]);
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspace?.id) ?? '';
  const { mutateAsync, isPending } = useCreateIdea();
  const { toast } = useToast();

  const togglePlatform = (platform: Platform) => {
    setSelectedPlatforms((prev) =>
      prev.includes(platform)
        ? prev.filter((p) => p !== platform)
        : [...prev, platform],
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;

    try {
      await mutateAsync({
        title: text.trim(),
        tags: selectedPlatforms,
        workspace_id: activeWorkspaceId,
      });
      trackEvent('idea_captured', { source: 'quick_capture' });
      toast({ title: 'Idea captured!', variant: 'default' });
      setText('');
      setSelectedPlatforms([]);
      onClose();
    } catch {
      toast({ title: 'Failed to capture idea', variant: 'destructive' });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleSubmit(e as unknown as React.FormEvent);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Capture an idea</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Textarea
              autoFocus
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, MAX_CHARS))}
              onKeyDown={handleKeyDown}
              placeholder="What's your idea? (Cmd+Enter to save)"
              className="min-h-[120px] resize-none pr-16"
            />
            <span
              className={cn(
                'absolute bottom-2 right-3 text-xs',
                text.length >= MAX_CHARS
                  ? 'text-destructive'
                  : 'text-muted-foreground',
              )}
            >
              {text.length}/{MAX_CHARS}
            </span>
          </div>

          {/* Platform selector */}
          <div>
            <p className="mb-2 text-xs font-medium text-muted-foreground">
              Platform (optional)
            </p>
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => togglePlatform(value)}
                  className={cn(
                    'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                    selectedPlatforms.includes(value)
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-input bg-background hover:bg-accent',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!text.trim() || isPending}
              loading={isPending}
            >
              Capture idea
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
