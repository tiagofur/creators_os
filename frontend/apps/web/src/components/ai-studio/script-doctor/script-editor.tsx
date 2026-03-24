'use client';

import * as React from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';
import Highlight from '@tiptap/extension-highlight';
import { useToast } from '@ordo/ui';
import { useScriptDoctor } from '@/hooks/use-script-doctor';
import { ScriptToolbar } from './script-toolbar';
import { ScriptStats } from './script-stats';
import { AiSuggestionPanel } from './ai-suggestion-panel';

const LOCAL_STORAGE_KEY = 'ordo-script-draft';
const AUTOSAVE_DELAY = 1000;
const MIN_WORDS_FOR_ANALYSIS = 10;

export function ScriptEditor() {
  const { toast } = useToast();
  const [aiPanelOpen, setAiPanelOpen] = React.useState(false);
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    suggestions,
    summary,
    isAnalyzing,
    error,
    analyzeScript,
    applySuggestion,
    dismissSuggestion,
    clearSuggestions,
  } = useScriptDoctor();

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: 'Start writing your script here...\n\nTip: Write at least a few sentences, then open the AI Suggestions panel to get feedback on your hook, pacing, clarity, and more.',
      }),
      CharacterCount,
      Highlight.configure({ multicolor: false }),
    ],
    content: typeof window !== 'undefined'
      ? (localStorage.getItem(LOCAL_STORAGE_KEY) ?? '')
      : '',
    editorProps: {
      attributes: {
        class: 'prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[400px] p-4',
      },
    },
    onUpdate: ({ editor: ed }) => {
      // Debounced autosave
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        localStorage.setItem(LOCAL_STORAGE_KEY, ed.getHTML());
      }, AUTOSAVE_DELAY);
    },
  });

  React.useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // Show toast when analysis completes
  const prevAnalyzingRef = React.useRef(isAnalyzing);
  React.useEffect(() => {
    if (prevAnalyzingRef.current && !isAnalyzing) {
      if (error) {
        toast({ title: 'Analysis failed', description: error, variant: 'destructive' });
      } else if (summary) {
        const count = suggestions.length;
        toast({
          title: `Analysis complete — Score: ${summary.overallScore}/100`,
          description: count > 0
            ? `${count} suggestion${count > 1 ? 's' : ''} found`
            : 'No issues detected!',
        });
      }
    }
    prevAnalyzingRef.current = isAnalyzing;
  }, [isAnalyzing, error, summary, suggestions.length, toast]);

  const wordCount = editor?.storage.characterCount.words() ?? 0;
  const charCount = editor?.storage.characterCount.characters() ?? 0;

  const handleAnalyze = () => {
    if (!editor) return;
    const text = editor.getText();
    const words = text.split(/\s+/).filter(Boolean).length;

    if (words < MIN_WORDS_FOR_ANALYSIS) {
      toast({
        title: 'Script too short',
        description: `Write at least ${MIN_WORDS_FOR_ANALYSIS} words before analyzing.`,
        variant: 'destructive',
      });
      return;
    }

    // Auto-open the panel when analyzing
    if (!aiPanelOpen) {
      setAiPanelOpen(true);
    }

    analyzeScript(text);
  };

  if (!editor) return null;

  return (
    <div className="flex h-full flex-col">
      <ScriptToolbar
        editor={editor}
        onToggleAiPanel={() => setAiPanelOpen((prev) => !prev)}
        aiPanelOpen={aiPanelOpen}
        onAnalyze={handleAnalyze}
        isAnalyzing={isAnalyzing}
        hasSuggestions={suggestions.length > 0}
      />

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          <EditorContent editor={editor} />
        </div>

        {aiPanelOpen && (
          <AiSuggestionPanel
            editor={editor}
            suggestions={suggestions}
            summary={summary}
            isAnalyzing={isAnalyzing}
            error={error}
            onAnalyze={handleAnalyze}
            onApply={applySuggestion}
            onDismiss={dismissSuggestion}
          />
        )}
      </div>

      <ScriptStats wordCount={wordCount} charCount={charCount} />
    </div>
  );
}
