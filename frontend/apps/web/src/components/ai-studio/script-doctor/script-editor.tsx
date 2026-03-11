'use client';

import * as React from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';
import Highlight from '@tiptap/extension-highlight';
import { useScriptDoctor } from '@/hooks/use-script-doctor';
import { ScriptToolbar } from './script-toolbar';
import { ScriptStats } from './script-stats';
import { AiSuggestionPanel } from './ai-suggestion-panel';

const LOCAL_STORAGE_KEY = 'ordo-script-draft';
const AUTOSAVE_DELAY = 1000;

export function ScriptEditor() {
  const [aiPanelOpen, setAiPanelOpen] = React.useState(false);
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    suggestions,
    isAnalyzing,
    analyzeScript,
    applySuggestion,
    dismissSuggestion,
  } = useScriptDoctor();

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: 'Start writing your script...',
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

  const wordCount = editor?.storage.characterCount.words() ?? 0;
  const charCount = editor?.storage.characterCount.characters() ?? 0;

  const handleAnalyze = () => {
    if (!editor) return;
    analyzeScript(editor.getText());
  };

  if (!editor) return null;

  return (
    <div className="flex h-full flex-col">
      <ScriptToolbar
        editor={editor}
        onToggleAiPanel={() => setAiPanelOpen((prev) => !prev)}
        aiPanelOpen={aiPanelOpen}
      />

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          <EditorContent editor={editor} />
        </div>

        {aiPanelOpen && (
          <AiSuggestionPanel
            editor={editor}
            suggestions={suggestions}
            isAnalyzing={isAnalyzing}
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
