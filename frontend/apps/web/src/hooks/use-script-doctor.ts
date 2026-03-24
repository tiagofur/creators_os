'use client';

import * as React from 'react';
import { useMutation } from '@tanstack/react-query';
import type { Editor } from '@tiptap/react';
import { apiClient } from '@/lib/api-client';
import { trackEvent } from '@/lib/analytics';
import type { ScriptDoctorRequest, ScriptSuggestion, ScriptDoctorResponse, ScriptSuggestionType } from '@ordo/types';

// ---------------------------------------------------------------------------
// Analysis summary — computed from the raw suggestions
// ---------------------------------------------------------------------------

export interface AnalysisSummary {
  /** Overall score 0-100 based on suggestion density and types */
  overallScore: number;
  /** Per-category breakdown */
  categories: {
    type: ScriptSuggestionType;
    label: string;
    score: number; // 0-100
    count: number;
    description: string;
  }[];
  /** Human-readable top-level recommendations */
  recommendations: string[];
}

const CATEGORY_META: Record<ScriptSuggestionType, { label: string; weight: number; description: string }> = {
  hook: { label: 'Hook Quality', weight: 25, description: 'Opening strength and scroll-stopping power' },
  clarity: { label: 'Clarity', weight: 20, description: 'Clear, concise, and easy to follow' },
  cta: { label: 'Call to Action', weight: 20, description: 'Clear and compelling viewer next steps' },
  pacing: { label: 'Pacing', weight: 20, description: 'Rhythm, energy, and audience retention' },
  engagement: { label: 'Engagement', weight: 15, description: 'Audience interaction and connection' },
};

function buildSummary(suggestions: ScriptSuggestion[], wordCount: number): AnalysisSummary {
  const typeCounts: Record<ScriptSuggestionType, number> = {
    hook: 0,
    clarity: 0,
    cta: 0,
    pacing: 0,
    engagement: 0,
  };

  for (const s of suggestions) {
    if (s.type in typeCounts) {
      typeCounts[s.type as ScriptSuggestionType]++;
    }
  }

  // Score per category: fewer issues = higher score
  // 0 issues -> 100, 1 issue -> 70, 2 -> 45, 3+ -> 20
  const scoreLookup = [100, 70, 45, 20];
  const categories = (Object.keys(CATEGORY_META) as ScriptSuggestionType[]).map((type) => {
    const count = typeCounts[type];
    const score = scoreLookup[Math.min(count, scoreLookup.length - 1)];
    return {
      type,
      label: CATEGORY_META[type].label,
      score,
      count,
      description: CATEGORY_META[type].description,
    };
  });

  // Weighted overall score
  const overallScore = Math.round(
    categories.reduce((acc, cat) => acc + cat.score * CATEGORY_META[cat.type].weight, 0) / 100,
  );

  // Build recommendations
  const recommendations: string[] = [];

  if (suggestions.length === 0) {
    recommendations.push('Your script looks great! No major issues detected.');
  } else {
    // Sort categories by score ascending to surface worst first
    const sorted = [...categories].sort((a, b) => a.score - b.score);
    for (const cat of sorted) {
      if (cat.count > 0) {
        recommendations.push(
          `${cat.label}: ${cat.count} suggestion${cat.count > 1 ? 's' : ''} found. ${cat.description}.`,
        );
      }
    }

    if (wordCount < 100) {
      recommendations.push('Your script is quite short. Consider expanding key sections for better depth.');
    } else if (wordCount > 2000) {
      recommendations.push('Your script is long. Consider tightening sections to maintain viewer attention.');
    }
  }

  return { overallScore, categories, recommendations };
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

interface UseScriptDoctorReturn {
  suggestions: ScriptSuggestion[];
  summary: AnalysisSummary | null;
  isAnalyzing: boolean;
  error: string | null;
  analyzeScript: (text: string) => void;
  applySuggestion: (editor: Editor, suggestion: ScriptSuggestion) => void;
  dismissSuggestion: (id: string) => void;
  clearSuggestions: () => void;
}

export function useScriptDoctor(): UseScriptDoctorReturn {
  const [suggestions, setSuggestions] = React.useState<ScriptSuggestion[]>([]);
  const [summary, setSummary] = React.useState<AnalysisSummary | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [lastWordCount, setLastWordCount] = React.useState(0);

  const { mutate: runAnalysis, isPending: isAnalyzing } = useMutation({
    mutationFn: (payload: ScriptDoctorRequest) =>
      apiClient.post<ScriptDoctorResponse>('/v1/ai/script-doctor', payload),
    onSuccess: (data) => {
      trackEvent('ai_credit_used', { tool: 'script_doctor', creditsUsed: 1 });
      setSuggestions(data.suggestions);
      setSummary(buildSummary(data.suggestions, lastWordCount));
      setError(null);
    },
    onError: (err: Error) => {
      setError(err.message || 'Failed to analyze script. Please try again.');
    },
  });

  const analyzeScript = React.useCallback(
    (text: string) => {
      if (!text.trim()) return;
      setError(null);
      setLastWordCount(text.split(/\s+/).filter(Boolean).length);
      runAnalysis({ script_text: text });
    },
    [runAnalysis],
  );

  const applySuggestion = React.useCallback(
    (editor: Editor, suggestion: ScriptSuggestion) => {
      const { state } = editor;
      const { doc } = state;
      let found = false;

      doc.descendants((node, pos) => {
        if (found) return false;
        if (node.isText && node.text?.includes(suggestion.affected_text)) {
          const start = pos + (node.text?.indexOf(suggestion.affected_text) ?? 0);
          const end = start + suggestion.affected_text.length;
          editor
            .chain()
            .focus()
            .setTextSelection({ from: start, to: end })
            .insertContent(suggestion.suggested_improvement)
            .run();
          found = true;
        }
        return true;
      });

      setSuggestions((prev) => {
        const next = prev.filter((s) => s.id !== suggestion.id);
        // Recompute summary after applying
        setSummary(buildSummary(next, lastWordCount));
        return next;
      });
    },
    [lastWordCount],
  );

  const dismissSuggestion = React.useCallback(
    (id: string) => {
      setSuggestions((prev) => {
        const next = prev.filter((s) => s.id !== id);
        setSummary(buildSummary(next, lastWordCount));
        return next;
      });
    },
    [lastWordCount],
  );

  const clearSuggestions = React.useCallback(() => {
    setSuggestions([]);
    setSummary(null);
  }, []);

  return {
    suggestions,
    summary,
    isAnalyzing,
    error,
    analyzeScript,
    applySuggestion,
    dismissSuggestion,
    clearSuggestions,
  };
}
