'use client';

import * as React from 'react';
import { createContext, useContext, useState, useCallback } from 'react';
import { Toast, ToastTitle, ToastDescription } from './toast';

interface ToastItem {
  id: string;
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive' | 'success';
  duration?: number;
}

interface ToasterContextValue {
  toast: (item: Omit<ToastItem, 'id'>) => void;
}

const ToasterContext = createContext<ToasterContextValue | null>(null);

export function useToast(): ToasterContextValue {
  const ctx = useContext(ToasterContext);
  if (!ctx) throw new Error('useToast must be used within <Toaster>');
  return ctx;
}

export function Toaster({ children }: { children?: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const toast = useCallback((item: Omit<ToastItem, 'id'>) => {
    const id = Math.random().toString(36).slice(2);
    const newToast: ToastItem = { ...item, id };
    setToasts((prev) => [...prev, newToast]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, item.duration ?? 5000);
  }, []);

  const dismiss = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToasterContext.Provider value={{ toast }}>
      {children}
      <div
        role="region"
        aria-label="Notifications"
        className="fixed bottom-0 right-0 z-[100] flex max-h-screen w-full flex-col-reverse gap-2 p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col sm:max-w-[420px]"
      >
        {toasts.map((t) => (
          <Toast key={t.id} variant={t.variant} onClose={() => dismiss(t.id)}>
            {t.title && <ToastTitle>{t.title}</ToastTitle>}
            {t.description && <ToastDescription>{t.description}</ToastDescription>}
          </Toast>
        ))}
      </div>
    </ToasterContext.Provider>
  );
}
