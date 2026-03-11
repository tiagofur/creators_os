'use client';

import { useState, useEffect } from 'react';
import { storage } from '@ordo/core';

/**
 * A useState-like hook that persists state to localStorage.
 */
export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    const item = storage.get<T>(key);
    return item !== null ? item : initialValue;
  });

  const setValue = (value: T) => {
    setStoredValue(value);
    storage.set(key, value);
  };

  useEffect(() => {
    const item = storage.get<T>(key);
    if (item !== null) {
      setStoredValue(item);
    }
  }, [key]);

  return [storedValue, setValue];
}
