import { useEffect, useRef } from 'react';

export function useDebounceCallback<T>(
  callback: (v: T) => void,
  delay: number,
) {
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const cbRef = useRef(callback);

  useEffect(() => {
    cbRef.current = callback;
  }, [callback]);

  function debounced(value: T) {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => cbRef.current(value), delay);
  }

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) clearTimeout(timerRef.current);
    };
  }, []);

  return debounced;
}
