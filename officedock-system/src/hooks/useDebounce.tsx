'use client';

import { useState, useEffect } from 'react';

export const useDebounce = (
  callback: (value: string) => void,
  delay: number,
) => {
  const [debouncedValue, setDebouncedValue] = useState<string>('');

  useEffect(() => {
    const handler = setTimeout(() => {
      callback(debouncedValue);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [debouncedValue, delay, callback]);

  return setDebouncedValue;
};
