'use client';

import * as React from 'react';
import type { Editor } from '@tiptap/react';
import {
  Bold,
  Italic,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Minus,
  Sparkles,
} from 'lucide-react';
import { Button } from '@ordo/ui';
import { cn } from '@ordo/core';

interface ToolbarButtonProps {
  active?: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}

function ToolbarButton({ active, onClick, title, children }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cn(
        'flex h-7 w-7 items-center justify-center rounded text-sm transition-colors',
        active
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
      )}
    >
      {children}
    </button>
  );
}

interface ScriptToolbarProps {
  editor: Editor;
  onToggleAiPanel: () => void;
  aiPanelOpen: boolean;
  onAnalyze: () => void;
  isAnalyzing: boolean;
  hasSuggestions: boolean;
}

export function ScriptToolbar({
  editor,
  onToggleAiPanel,
  aiPanelOpen,
  onAnalyze,
  isAnalyzing,
  hasSuggestions,
}: ScriptToolbarProps) {
  return (
    <div className="flex items-center gap-1 border-b px-3 py-1.5 bg-muted/20 flex-wrap">
      <ToolbarButton
        active={editor.isActive('bold')}
        onClick={() => editor.chain().focus().toggleBold().run()}
        title="Bold"
      >
        <Bold className="h-3.5 w-3.5" />
      </ToolbarButton>

      <ToolbarButton
        active={editor.isActive('italic')}
        onClick={() => editor.chain().focus().toggleItalic().run()}
        title="Italic"
      >
        <Italic className="h-3.5 w-3.5" />
      </ToolbarButton>

      <div className="mx-1 h-4 w-px bg-border" />

      <ToolbarButton
        active={editor.isActive('heading', { level: 1 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        title="Heading 1"
      >
        <Heading1 className="h-3.5 w-3.5" />
      </ToolbarButton>

      <ToolbarButton
        active={editor.isActive('heading', { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        title="Heading 2"
      >
        <Heading2 className="h-3.5 w-3.5" />
      </ToolbarButton>

      <ToolbarButton
        active={editor.isActive('heading', { level: 3 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        title="Heading 3"
      >
        <Heading3 className="h-3.5 w-3.5" />
      </ToolbarButton>

      <div className="mx-1 h-4 w-px bg-border" />

      <ToolbarButton
        active={editor.isActive('bulletList')}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        title="Bullet List"
      >
        <List className="h-3.5 w-3.5" />
      </ToolbarButton>

      <ToolbarButton
        active={editor.isActive('orderedList')}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        title="Numbered List"
      >
        <ListOrdered className="h-3.5 w-3.5" />
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        title="Scene Break"
      >
        <Minus className="h-3.5 w-3.5" />
      </ToolbarButton>

      <div className="flex-1" />

      <Button
        size="sm"
        variant="default"
        onClick={onAnalyze}
        disabled={isAnalyzing}
        loading={isAnalyzing}
        leftIcon={<Sparkles className="h-3.5 w-3.5" />}
      >
        Analyze Script
      </Button>

      <Button
        size="sm"
        variant={aiPanelOpen ? 'secondary' : 'outline'}
        onClick={onToggleAiPanel}
      >
        {aiPanelOpen ? 'Hide Panel' : 'Show Panel'}
        {hasSuggestions && !aiPanelOpen && (
          <span className="ml-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
            !
          </span>
        )}
      </Button>
    </div>
  );
}
