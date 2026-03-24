'use client';

import * as React from 'react';
import type { Editor } from '@tiptap/react';
import { Sparkles, X, Check, Loader2, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { Button, Badge } from '@ordo/ui';
import { cn } from '@ordo/core';
import type { ScriptSuggestion, ScriptSuggestionType } from '@ordo/types';
import type { AnalysisSummary } from '@/hooks/use-script-doctor';

// ---------------------------------------------------------------------------
// Badge colours per suggestion type
// ---------------------------------------------------------------------------

const SUGGESTION_BADGE_COLORS: Record<ScriptSuggestionType, string> = {
  hook: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  clarity: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  cta: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  pacing: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  engagement: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300',
};

const SCORE_RING_COLORS: Record<string, string> = {
  high: 'text-green-500',
  medium: 'text-yellow-500',
  low: 'text-destructive',
};

function scoreLevel(score: number): 'high' | 'medium' | 'low' {
  if (score >= 70) return 'high';
  if (score >= 40) return 'medium';
  return 'low';
}

// ---------------------------------------------------------------------------
// Score ring (circular gauge)
// ---------------------------------------------------------------------------

function ScoreRing({ score, size = 64 }: { score: number; size?: number }) {
  const strokeWidth = 5;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const level = scoreLevel(score);

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className="stroke-muted"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={cn('transition-all duration-700', SCORE_RING_COLORS[level])}
          style={{ stroke: 'currentColor' }}
        />
      </svg>
      <span className="absolute text-sm font-bold">{score}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Category score bar
// ---------------------------------------------------------------------------

function CategoryBar({ label, score, count, description }: {
  label: string;
  score: number;
  count: number;
  description: string;
}) {
  const level = scoreLevel(score);
  const barColor =
    level === 'high'
      ? 'bg-green-500'
      : level === 'medium'
        ? 'bg-yellow-500'
        : 'bg-destructive';

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium">{label}</span>
        <span className="text-xs text-muted-foreground">
          {count === 0 ? 'No issues' : `${count} issue${count > 1 ? 's' : ''}`}
        </span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-500', barColor)}
          style={{ width: `${score}%` }}
        />
      </div>
      <p className="text-[10px] text-muted-foreground">{description}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main panel
// ---------------------------------------------------------------------------

interface AiSuggestionPanelProps {
  editor: Editor;
  suggestions: ScriptSuggestion[];
  summary: AnalysisSummary | null;
  isAnalyzing: boolean;
  error: string | null;
  onAnalyze: () => void;
  onApply: (editor: Editor, suggestion: ScriptSuggestion) => void;
  onDismiss: (id: string) => void;
}

export function AiSuggestionPanel({
  editor,
  suggestions,
  summary,
  isAnalyzing,
  error,
  onAnalyze,
  onApply,
  onDismiss,
}: AiSuggestionPanelProps) {
  const [showDetails, setShowDetails] = React.useState(true);

  return (
    <div className="flex h-full w-80 shrink-0 flex-col border-l bg-background">
      {/* Header */}
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
          {summary ? 'Re-analyze' : 'Analyze'}
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Error state */}
        {error && (
          <div className="mx-4 mt-4 flex items-start gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
            <div className="space-y-1">
              <p className="text-xs font-medium text-destructive">Analysis failed</p>
              <p className="text-xs text-muted-foreground">{error}</p>
              <Button size="sm" variant="outline" onClick={onAnalyze} className="mt-1">
                Retry
              </Button>
            </div>
          </div>
        )}

        {/* Loading state */}
        {isAnalyzing && (
          <div className="flex flex-col items-center justify-center py-8 gap-3 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
            <p className="text-sm">Analyzing your script...</p>
            <p className="text-xs">Checking hook, clarity, pacing, and more</p>
          </div>
        )}

        {/* Empty state */}
        {!isAnalyzing && !error && !summary && suggestions.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground px-4">
            <Sparkles className="h-8 w-8 mb-2 opacity-50" />
            <p className="text-sm font-medium">Ready to analyze</p>
            <p className="text-xs mt-1">
              Click Analyze to get AI feedback on your hook quality, pacing, clarity, and engagement.
            </p>
          </div>
        )}

        {/* Analysis summary */}
        {!isAnalyzing && summary && (
          <div className="p-4 space-y-4">
            {/* Overall score */}
            <div className="flex items-center gap-4 rounded-xl border p-4">
              <ScoreRing score={summary.overallScore} />
              <div className="flex-1 space-y-1">
                <p className="text-sm font-semibold">Overall Score</p>
                <p className="text-xs text-muted-foreground">
                  {summary.overallScore >= 70
                    ? 'Your script is in great shape!'
                    : summary.overallScore >= 40
                      ? 'Good foundation with room to improve.'
                      : 'Several areas need attention.'}
                </p>
              </div>
            </div>

            {/* Category breakdown */}
            <div className="space-y-1">
              <button
                onClick={() => setShowDetails((v) => !v)}
                className="flex w-full items-center justify-between text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
              >
                Category Breakdown
                {showDetails ? (
                  <ChevronUp className="h-3.5 w-3.5" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5" />
                )}
              </button>

              {showDetails && (
                <div className="space-y-3 pt-2">
                  {summary.categories.map((cat) => (
                    <CategoryBar
                      key={cat.type}
                      label={cat.label}
                      score={cat.score}
                      count={cat.count}
                      description={cat.description}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Recommendations */}
            {summary.recommendations.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground">Recommendations</p>
                <ul className="space-y-1.5">
                  {summary.recommendations.map((rec, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs">
                      <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-primary" />
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Divider before suggestions */}
            {suggestions.length > 0 && (
              <div className="border-t pt-3">
                <p className="text-xs font-semibold text-muted-foreground mb-3">
                  {suggestions.length} Suggestion{suggestions.length > 1 ? 's' : ''}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Individual suggestion cards */}
        {!isAnalyzing && suggestions.length > 0 && (
          <div className={cn('px-4 pb-4 space-y-3', !summary && 'pt-4')}>
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
        )}

        {/* All suggestions applied state */}
        {!isAnalyzing && summary && suggestions.length === 0 && (
          <div className="flex flex-col items-center justify-center px-4 py-6 text-center text-muted-foreground">
            <Check className="h-6 w-6 mb-2 text-green-500" />
            <p className="text-sm font-medium">All suggestions addressed!</p>
            <p className="text-xs mt-1">Click Re-analyze to check for more improvements.</p>
          </div>
        )}
      </div>
    </div>
  );
}
