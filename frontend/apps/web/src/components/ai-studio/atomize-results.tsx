'use client';

import * as React from 'react';
import { Copy, Check, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Badge,
  Button,
  Skeleton,
  useToast,
} from '@ordo/ui';
import type { AtomizedContent } from '@ordo/types';

const PLATFORM_LABELS: Record<string, string> = {
  twitter: 'Twitter/X Thread',
  instagram: 'Instagram Carousel',
  tiktok: 'TikTok Script',
  linkedin: 'LinkedIn Post',
  short_video: 'Short-form Video',
};

interface AtomizeResultCardProps {
  variation: AtomizedContent;
}

function AtomizeResultCard({ variation }: AtomizeResultCardProps) {
  const { toast } = useToast();
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    const text = [variation.title, variation.body, variation.hooks]
      .filter(Boolean)
      .join('\n\n');
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast({ title: 'Copied to clipboard' });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
      <div className="flex items-center justify-between border-b px-4 py-2 bg-muted/30">
        <span className="text-sm font-semibold">
          {PLATFORM_LABELS[variation.platform] ?? variation.platform}
        </span>
        <Badge variant="outline" className="text-xs">
          {variation.content_type}
        </Badge>
      </div>

      <div className="p-4 space-y-2">
        <h4 className="text-sm font-medium">{variation.title}</h4>
        {variation.hooks && (
          <p className="text-xs text-muted-foreground italic">
            Hook: {variation.hooks}
          </p>
        )}
        <p className="text-sm leading-relaxed whitespace-pre-wrap">
          {variation.body}
        </p>
        {variation.hashtags && variation.hashtags.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-1">
            {variation.hashtags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 border-t px-4 py-2 bg-muted/10">
        <Button
          size="sm"
          variant="ghost"
          onClick={handleCopy}
          leftIcon={
            copied ? (
              <Check className="h-3 w-3" />
            ) : (
              <Copy className="h-3 w-3" />
            )
          }
        >
          {copied ? 'Copied' : 'Copy'}
        </Button>
      </div>
    </div>
  );
}

interface AtomizeResultsDialogProps {
  open: boolean;
  onClose: () => void;
  sourceTitle: string;
  variations: AtomizedContent[];
  isLoading: boolean;
}

export function AtomizeResultsDialog({
  open,
  onClose,
  sourceTitle,
  variations,
  isLoading,
}: AtomizeResultsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>
              Atomized Content{sourceTitle ? `: ${sourceTitle}` : ''}
            </DialogTitle>
            <Button size="sm" variant="ghost" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4">
            <div className="flex items-center justify-center py-4">
              <div className="flex flex-col items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-gradient-to-r from-primary to-purple-500 animate-pulse" />
                <p className="text-sm text-muted-foreground animate-pulse">
                  Atomizing your content into platform variations...
                </p>
              </div>
            </div>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-xl border p-4 space-y-3">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-20 w-full" />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {variations.length} platform variation
              {variations.length !== 1 ? 's' : ''} generated
            </p>
            <div className="grid grid-cols-1 gap-4">
              {variations.map((variation, i) => (
                <AtomizeResultCard key={i} variation={variation} />
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
