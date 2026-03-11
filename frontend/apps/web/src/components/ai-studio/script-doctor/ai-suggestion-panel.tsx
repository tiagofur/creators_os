'use client';

import * as React from 'react';
import type { Editor } from '@tiptap/react';
import { Sparkles, X, Check, Loader2 } from 'lucide-react';
import { Button, Badge } from '@ordo/ui';
import { cn } from '@ordo/core';
import type { ScriptSuggestion, ScriptSuggestionType } from '@ordo/types';

const SUGGESTION_BADGE_COLORS: Record<ScriptSuggestionType, string> = {
  hook: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  clarity: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  cta: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  pacing: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  engagement: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300',
};

interface AiSuggestionPanelProps {
  editor: Editor;
  suggestions: ScriptSuggestion[];
  isAnalyzing: boolean;
  onAnalyze: () => void;
  onApply: (editor: Editor, suggestion: ScriptSuggestion) => void;
  onDismiss: (id: string) => void;
}

export function AiSuggestionPanel({
  editor,
  suggestions,
  isAnalyzing,
  onAnalyze,
  onApply,
  onDismiss,
}: AiSuggestionPanelProps) {
  return (
    <div className="flex h-full w-80 shrink-0 flex-col border-l bg-background">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">AI Suggestions</h3>
        </div>
        <Button
          size="sm"
          onClick={onAnalyze}
          disabled={isAnalyzing}
          loading={isAnalyzing}
        >
          Analyze
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {isAnalyzing && (
          <div className="flex flex-col items-center justify-center py-8 gap-3 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
            <p className="text-sm">Analyzing your script...</p>
          </div>
        )}

        {!isAnalyzing && suggestions.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
            <Sparkles className="h-8 w-8 mb-2 opacity-50" />
            <p className="text-sm">Click Analyze to get AI feedback on your script</p>
          </div>
        )}

        {suggestions.map((suggestion) => (
          <div
            key={suggestion.id}
            className="rounded-xl border p-3 space-y-2"
          >
            <div className="flex items-center justify-between">
              <span
                className={cn(
                  'rounded-full px-2 py-0.5 text-xs font-medium capitalize',
                  SUGGESTION_BADGE_COLORS[suggestion.type],
                )}
              >
                {suggestion.type}
              </span>
              <button
                onClick={() => onDismiss(suggestion.id)}
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Dismiss suggestion"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium">Original:</p>
              <p className="text-xs bg-muted rounded p-1.5 italic">
                &ldquo;{suggestion.affected_text}&rdquo;
              </p>
            </div>

            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium">Suggestion:</p>
              <p className="text-xs leading-relaxed">{suggestion.suggested_improvement}</p>
            </div>

            <Button
              size="sm"
              variant="outline"
              className="w-full"
              onClick={() => onApply(editor, suggestion)}
              leftIcon={<Check className="h-3 w-3" />}
            >
              Apply
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
