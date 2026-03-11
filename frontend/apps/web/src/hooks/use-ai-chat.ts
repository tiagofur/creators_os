'use client';

import * as React from 'react';
import { useToast } from '@ordo/ui';
import { useAuthStore } from '@ordo/stores';
import { API_BASE_URL } from '@ordo/core';
import type { ChatMessage } from '@ordo/types';

interface UseAiChatOptions {
  conversationId?: string;
}

interface UseAiChatReturn {
  messages: ChatMessage[];
  isStreaming: boolean;
  error: string | null;
  conversationId: string | null;
  sendMessage: (content: string) => Promise<void>;
  clearMessages: () => void;
}

export function useAiChat(options: UseAiChatOptions = {}): UseAiChatReturn {
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [conversationId, setConversationId] = React.useState<string | null>(
    options.conversationId ?? null,
  );

  const { toast } = useToast();
  const getAccessToken = () => useAuthStore.getState().accessToken;

  const sendMessage = React.useCallback(
    async (content: string) => {
      if (isStreaming) return;

      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content,
        created_at: new Date().toISOString(),
      };

      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: '',
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, userMessage, assistantMessage]);
      setIsStreaming(true);
      setError(null);

      const assistantId = assistantMessage.id;

      try {
        const token = getAccessToken();
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
        };
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(`${API_BASE_URL}/v1/ai/chat`, {
          method: 'POST',
          headers,
          credentials: 'include',
          body: JSON.stringify({
            content,
            conversation_id: conversationId ?? undefined,
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error('No response body');

        const decoder = new TextDecoder();
        let buffer = '';
        let newConversationId: string | null = null;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const raw = line.slice(6).trim();

            if (raw === '[DONE]') {
              setIsStreaming(false);
              break;
            }

            try {
              const parsed = JSON.parse(raw) as {
                token?: string;
                conversation_id?: string;
              };

              if (parsed.conversation_id && !newConversationId) {
                newConversationId = parsed.conversation_id;
                setConversationId(parsed.conversation_id);
              }

              if (parsed.token) {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId
                      ? { ...m, content: m.content + parsed.token }
                      : m,
                  ),
                );
              }
            } catch {
              // Non-JSON SSE line — skip
            }
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to send message';
        setError(msg);
        toast({ title: 'AI Chat error', description: msg, variant: 'destructive' });
        // Remove the empty assistant message on error
        setMessages((prev) =>
          prev.filter((m) => m.id !== assistantId || m.content.length > 0),
        );
      } finally {
        setIsStreaming(false);
      }
    },
    [isStreaming, conversationId, toast],
  );

  const clearMessages = React.useCallback(() => {
    setMessages([]);
    setConversationId(null);
    setError(null);
  }, []);

  return { messages, isStreaming, error, conversationId, sendMessage, clearMessages };
}
