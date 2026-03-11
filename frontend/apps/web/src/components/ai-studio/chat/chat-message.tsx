'use client';

import * as React from 'react';
import ReactMarkdown from 'react-markdown';
import { cn } from '@ordo/core';
import type { ChatMessage as ChatMessageType } from '@ordo/types';

interface ChatMessageProps {
  message: ChatMessageType;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';

  return (
    <div
      className={cn(
        'flex w-full',
        isUser ? 'justify-end' : 'justify-start',
      )}
    >
      <div
        className={cn(
          'max-w-[75%] rounded-2xl px-4 py-3 text-sm',
          isUser
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted text-foreground',
        )}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
        ) : (
          <div className="prose prose-sm dark:prose-invert max-w-none break-words">
            <ReactMarkdown
              components={{
                code: ({ children, className }) => {
                  const isBlock = className?.startsWith('language-');
                  return isBlock ? (
                    <pre className="overflow-x-auto rounded-md bg-black/10 p-3 text-xs dark:bg-white/10">
                      <code>{children}</code>
                    </pre>
                  ) : (
                    <code className="rounded bg-black/10 px-1 py-0.5 text-xs dark:bg-white/10">
                      {children}
                    </code>
                  );
                },
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}
