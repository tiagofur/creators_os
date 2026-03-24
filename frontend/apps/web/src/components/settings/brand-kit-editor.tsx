'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Textarea,
  Badge,
} from '@ordo/ui';
import { useWorkspaceStore } from '@ordo/stores';
import { apiClient } from '@/lib/api-client';
import type { BrandKit } from '@ordo/types';

interface BrandKitFormValues {
  voice: string;
  tone: string;
  style_rules: string;
  boilerplate_intro: string;
  boilerplate_outro: string;
}

export function BrandKitEditor() {
  const workspace = useWorkspaceStore((s) => s.activeWorkspace);
  const [keywords, setKeywords] = React.useState<string[]>([]);
  const [antiKeywords, setAntiKeywords] = React.useState<string[]>([]);
  const [keywordInput, setKeywordInput] = React.useState('');
  const [antiKeywordInput, setAntiKeywordInput] = React.useState('');
  const [loading, setLoading] = React.useState(true);

  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<BrandKitFormValues>({
    defaultValues: {
      voice: '',
      tone: '',
      style_rules: '',
      boilerplate_intro: '',
      boilerplate_outro: '',
    },
  });

  // Load existing brand kit on mount
  React.useEffect(() => {
    if (!workspace?.id) return;
    let cancelled = false;

    async function load() {
      try {
        const kit = await apiClient.get<BrandKit>(
          `/api/v1/workspaces/${workspace!.id}/brand-kit`,
        );
        if (cancelled) return;
        reset({
          voice: kit.voice ?? '',
          tone: kit.tone ?? '',
          style_rules: kit.style_rules ?? '',
          boilerplate_intro: kit.boilerplate_intro ?? '',
          boilerplate_outro: kit.boilerplate_outro ?? '',
        });
        setKeywords(kit.keywords ?? []);
        setAntiKeywords(kit.anti_keywords ?? []);
      } catch {
        // First time — no brand kit yet, that's fine
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [workspace?.id, reset]);

  async function onSubmit(data: BrandKitFormValues) {
    if (!workspace?.id) return;
    try {
      await apiClient.put(`/api/v1/workspaces/${workspace.id}/brand-kit`, {
        ...data,
        keywords,
        anti_keywords: antiKeywords,
      });
      toast.success('Brand kit saved.');
    } catch {
      toast.error('Failed to save brand kit.');
    }
  }

  function addKeyword(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      const value = keywordInput.trim();
      if (value && !keywords.includes(value)) {
        setKeywords((prev) => [...prev, value]);
      }
      setKeywordInput('');
    }
  }

  function removeKeyword(kw: string) {
    setKeywords((prev) => prev.filter((k) => k !== kw));
  }

  function addAntiKeyword(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      const value = antiKeywordInput.trim();
      if (value && !antiKeywords.includes(value)) {
        setAntiKeywords((prev) => [...prev, value]);
      }
      setAntiKeywordInput('');
    }
  }

  function removeAntiKeyword(kw: string) {
    setAntiKeywords((prev) => prev.filter((k) => k !== kw));
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Loading brand kit...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Brand Kit</CardTitle>
        <p className="text-sm text-muted-foreground">
          Define your brand voice, tone, and style rules. These guidelines are
          automatically applied to all AI-generated content in this workspace.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="bk-voice">Brand Voice</Label>
            <Textarea
              id="bk-voice"
              placeholder="e.g. Friendly, authoritative, conversational..."
              rows={2}
              {...register('voice')}
            />
            <p className="text-xs text-muted-foreground">
              Describe how your brand sounds. This shapes the personality of all generated content.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="bk-tone">Tone</Label>
            <Input
              id="bk-tone"
              placeholder="e.g. Professional but approachable"
              {...register('tone')}
            />
            <p className="text-xs text-muted-foreground">
              The emotional quality of your content (e.g. witty, serious, upbeat).
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="bk-style-rules">Style Rules</Label>
            <Textarea
              id="bk-style-rules"
              placeholder="e.g. Use short sentences. Avoid jargon. Always use active voice..."
              rows={3}
              {...register('style_rules')}
            />
            <p className="text-xs text-muted-foreground">
              Specific writing rules the AI should follow.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="bk-intro">Boilerplate Intro</Label>
            <Textarea
              id="bk-intro"
              placeholder="e.g. Hey creators! Welcome back to..."
              rows={2}
              {...register('boilerplate_intro')}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="bk-outro">Boilerplate Outro</Label>
            <Textarea
              id="bk-outro"
              placeholder="e.g. If you found this helpful, hit subscribe and..."
              rows={2}
              {...register('boilerplate_outro')}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="bk-keywords">Preferred Keywords</Label>
            <Input
              id="bk-keywords"
              placeholder="Type a keyword and press Enter"
              value={keywordInput}
              onChange={(e) => setKeywordInput(e.target.value)}
              onKeyDown={addKeyword}
            />
            {keywords.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {keywords.map((kw) => (
                  <Badge
                    key={kw}
                    variant="secondary"
                    className="cursor-pointer"
                    onClick={() => removeKeyword(kw)}
                  >
                    {kw} &times;
                  </Badge>
                ))}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Words or phrases the AI should prefer in generated content.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="bk-anti-keywords">Words to Avoid</Label>
            <Input
              id="bk-anti-keywords"
              placeholder="Type a word to avoid and press Enter"
              value={antiKeywordInput}
              onChange={(e) => setAntiKeywordInput(e.target.value)}
              onKeyDown={addAntiKeyword}
            />
            {antiKeywords.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {antiKeywords.map((kw) => (
                  <Badge
                    key={kw}
                    variant="destructive"
                    className="cursor-pointer"
                    onClick={() => removeAntiKeyword(kw)}
                  >
                    {kw} &times;
                  </Badge>
                ))}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Words or phrases the AI should avoid.
            </p>
          </div>

          <div className="flex justify-end">
            <Button type="submit" loading={isSubmitting}>
              Save brand kit
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
