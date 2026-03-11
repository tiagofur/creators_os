'use client';

import * as React from 'react';
import { cn } from '@ordo/core';
import { ChatMessage } from './chat-message';
import type { ChatMessage as ChatMessageType } from '@ordo/types';

interface ChatMessageListProps {
  messages: ChatMessageType[];
  isStreaming: boolean;
  className?: string;
}

export function ChatMessageList({
  messages,
  isStreaming,
  className,
}: ChatMessageListProps) {
  const bottomRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming]);

  return (
    <div className={cn('flex flex-col gap-4 p-4', className)}>
      {messages.length === 0 && !isStreaming && (
        <div className="flex flex-1 flex-col items-center justify-center py-16 text-center text-muted-foreground">
          <p className="text-lg font-medium">Start a conversation</p>
          <p className="mt-1 text-sm">
            Ask anything — content ideas, strategy, script feedback, or more.
          </p>
        </div>
      )}

      {messages.map((msg) => (
        <ChatMessage key={msg.id} message={msg} />
      ))}

      {isStreaming && (
        <div className="flex justify-start">
          <div className="flex items-center gap-1 rounded-2xl bg-muted px-4 py-3">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground"
                style={{ animationDelay: `${i * 150}ms` }}
              />
            ))}
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
