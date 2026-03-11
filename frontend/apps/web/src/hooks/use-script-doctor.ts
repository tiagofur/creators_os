'use client';

import * as React from 'react';
import { useMutation } from '@tanstack/react-query';
import type { Editor } from '@tiptap/react';
import { apiClient } from '@/lib/api-client';
import { trackEvent } from '@/lib/analytics';
import type { ScriptDoctorRequest, ScriptSuggestion, ScriptDoctorResponse } from '@ordo/types';

interface UseScriptDoctorReturn {
  suggestions: ScriptSuggestion[];
  isAnalyzing: boolean;
  analyzeScript: (text: string) => void;
  applySuggestion: (editor: Editor, suggestion: ScriptSuggestion) => void;
  dismissSuggestion: (id: string) => void;
  clearSuggestions: () => void;
}

export function useScriptDoctor(): UseScriptDoctorReturn {
  const [suggestions, setSuggestions] = React.useState<ScriptSuggestion[]>([]);

  const { mutate: runAnalysis, isPending: isAnalyzing } = useMutation({
    mutationFn: (payload: ScriptDoctorRequest) =>
      apiClient.post<ScriptDoctorResponse>('/v1/ai/script-doctor', payload),
    onSuccess: (data) => {
      trackEvent('ai_credit_used', { tool: 'script_doctor', creditsUsed: 1 });
      setSuggestions(data.suggestions);
    },
  });

  const analyzeScript = React.useCallback(
    (text: string) => {
      if (!text.trim()) return;
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

      setSuggestions((prev) => prev.filter((s) => s.id !== suggestion.id));
    },
    [],
  );

  const dismissSuggestion = React.useCallback((id: string) => {
    setSuggestions((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const clearSuggestions = React.useCallback(() => {
    setSuggestions([]);
  }, []);

  return {
    suggestions,
    isAnalyzing,
    analyzeScript,
    applySuggestion,
    dismissSuggestion,
    clearSuggestions,
  };
}
