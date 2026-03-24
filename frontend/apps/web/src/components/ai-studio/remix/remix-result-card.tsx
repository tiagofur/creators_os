'use client';

import * as React from 'react';
import { Copy, Save, Edit2, Check } from 'lucide-react';
import { Button, Badge, useToast } from '@ordo/ui';
import { useCreateIdea } from '@/hooks/use-ideas';
import { useWorkspaceStore } from '@ordo/stores';
import type { RemixVariant, AiPlatform } from '@ordo/types';

const PLATFORM_LABELS: Record<AiPlatform, string> = {
  youtube: 'YouTube',
  tiktok: 'TikTok Reel',
  instagram: 'Instagram Reel',
  twitter: 'Twitter Thread',
  linkedin: 'LinkedIn Post',
  blog: 'Blog Post',
  podcast: 'Podcast Script',
  email: 'Email Newsletter',
};

interface RemixResultCardProps {
  variant: RemixVariant;
}

export function RemixResultCard({ variant }: RemixResultCardProps) {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = React.useState(false);
  const [editedContent, setEditedContent] = React.useState(variant.content);
  const [copied, setCopied] = React.useState(false);
  const workspaceId = useWorkspaceStore((s) => s.activeWorkspace?.id) ?? '';
  const { mutateAsync: createIdea, isPending: isSaving } = useCreateIdea(workspaceId);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(editedContent);
    setCopied(true);
    toast({ title: 'Copied to clipboard' });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = async () => {
    if (!workspaceId) return;
    try {
      await createIdea({
        title: `${PLATFORM_LABELS[variant.platform]} Remix`,
        description: editedContent.slice(0, 500),
      });
      toast({ title: 'Saved as idea!' });
    } catch {
      toast({ title: 'Failed to save', variant: 'destructive' });
    }
  };

  return (
    <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
      <div className="flex items-center justify-between border-b px-4 py-2 bg-muted/30">
        <span className="text-sm font-semibold">{PLATFORM_LABELS[variant.platform]}</span>
        <div className="flex items-center gap-1.5">
          <Badge variant="outline" className="text-xs">
            {variant.word_count} words
          </Badge>
          <Badge variant="outline" className="text-xs">
            {variant.character_count} chars
          </Badge>
        </div>
      </div>

      <div className="p-4">
        {isEditing ? (
          <textarea
            value={editedContent}
            onChange={(e) => setEditedContent(e.target.value)}
            className="w-full resize-none rounded-md border bg-background p-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring min-h-[120px]"
          />
        ) : (
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{editedContent}</p>
        )}
      </div>

      <div className="flex items-center gap-2 border-t px-4 py-2 bg-muted/10">
        <Button
          size="sm"
          variant="ghost"
          onClick={handleCopy}
          leftIcon={copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
        >
          {copied ? 'Copied' : 'Copy'}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setIsEditing((v) => !v)}
          leftIcon={<Edit2 className="h-3 w-3" />}
        >
          {isEditing ? 'Done' : 'Edit'}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleSave}
          loading={isSaving}
          leftIcon={<Save className="h-3 w-3" />}
        >
          Save as Idea
        </Button>
      </div>
    </div>
  );
}
