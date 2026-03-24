'use client';

import * as React from 'react';
import { PlusCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button, useToast } from '@ordo/ui';
import { cn } from '@ordo/core';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import { useAiChat } from '@/hooks/use-ai-chat';
import { ChatMessageList } from './chat-message-list';
import { ChatInput } from './chat-input';
import type { AiConversation } from '@ordo/types';
import { format } from 'date-fns';

export function ChatInterface() {
  const [selectedConversationId, setSelectedConversationId] = React.useState<
    string | undefined
  >(undefined);
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const { toast } = useToast();

  const { messages, isStreaming, sendMessage, clearMessages, conversationId } =
    useAiChat({ conversationId: selectedConversationId });

  const { data: conversations } = useQuery<AiConversation[]>({
    queryKey: queryKeys.ai.conversations(),
    queryFn: () => apiClient.get<AiConversation[]>('/api/v1/ai/conversations'),
    staleTime: 30_000,
  });

  const handleSend = async (content: string) => {
    try {
      await sendMessage(content);
    } catch {
      toast({ title: 'Failed to send message', variant: 'destructive' });
    }
  };

  const handleNewConversation = () => {
    clearMessages();
    setSelectedConversationId(undefined);
  };

  return (
    <div className="flex h-full">
      {/* Conversation history sidebar */}
      {sidebarOpen && (
        <aside className="w-64 shrink-0 border-r bg-background overflow-y-auto">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <h3 className="text-sm font-semibold">History</h3>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(false)}
              aria-label="Close history"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>

          <div className="p-2 space-y-1">
            {(conversations ?? []).map((conv) => (
              <button
                key={conv.id}
                onClick={() => {
                  setSelectedConversationId(conv.id);
                  setSidebarOpen(false);
                }}
                className={cn(
                  'w-full text-left rounded-md px-3 py-2 text-sm hover:bg-accent',
                  conversationId === conv.id && 'bg-accent text-accent-foreground',
                )}
              >
                <p className="truncate font-medium">{conv.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {format(new Date(conv.updated_at), 'MMM d')}
                </p>
              </button>
            ))}

            {(!conversations || conversations.length === 0) && (
              <p className="px-3 py-2 text-sm text-muted-foreground">
                No conversations yet
              </p>
            )}
          </div>
        </aside>
      )}

      {/* Main chat area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center gap-2 border-b px-4 py-2">
          {!sidebarOpen && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open conversation history"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}
          <h2 className="text-sm font-semibold flex-1">AI Chat</h2>
          <Button
            variant="outline"
            size="sm"
            onClick={handleNewConversation}
            leftIcon={<PlusCircle className="h-3.5 w-3.5" />}
          >
            New conversation
          </Button>
        </div>

        {/* Message list */}
        <div className="flex-1 overflow-y-auto">
          <ChatMessageList
            messages={messages}
            isStreaming={isStreaming}
          />
        </div>

        {/* Input */}
        <ChatInput onSend={handleSend} isStreaming={isStreaming} />
      </div>
    </div>
  );
}
