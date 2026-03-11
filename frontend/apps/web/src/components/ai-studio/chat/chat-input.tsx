'use client';

import * as React from 'react';
import { Send } from 'lucide-react';
import { Button } from '@ordo/ui';
import { cn } from '@ordo/core';

interface ChatInputProps {
  onSend: (content: string) => void;
  isStreaming: boolean;
  disabled?: boolean;
}

const MAX_CHARS = 4000;
const MAX_ROWS = 4;

export function ChatInput({ onSend, isStreaming, disabled }: ChatInputProps) {
  const [value, setValue] = React.useState('');
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const charCount = value.length;
  const canSend = value.trim().length > 0 && !isStreaming && !disabled;

  const adjustHeight = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const lineHeight = 24; // px approximation
    const maxHeight = lineHeight * MAX_ROWS;
    el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`;
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (e.target.value.length <= MAX_CHARS) {
      setValue(e.target.value);
      adjustHeight();
    }
  };

  const handleSend = () => {
    if (!canSend) return;
    onSend(value.trim());
    setValue('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border-t bg-background px-4 py-3">
      <div className="flex items-end gap-2 rounded-xl border bg-muted/30 px-3 py-2 focus-within:ring-2 focus-within:ring-ring">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Message AI Studio... (Enter to send, Shift+Enter for new line)"
          rows={1}
          className={cn(
            'flex-1 resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground',
            'focus:outline-none',
            'max-h-24 overflow-y-auto',
          )}
          disabled={isStreaming || disabled}
        />
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span
            className={cn(
              'text-xs',
              charCount > MAX_CHARS * 0.9
                ? 'text-destructive'
                : 'text-muted-foreground',
            )}
          >
            {charCount}/{MAX_CHARS}
          </span>
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!canSend}
            loading={isStreaming}
            aria-label="Send message"
            className="h-8 w-8 shrink-0"
          >
            <Send className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
