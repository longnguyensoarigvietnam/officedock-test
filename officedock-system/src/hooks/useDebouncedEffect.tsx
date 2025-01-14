'use client';
import { useEffect } from 'react';

// Define the type for the effect callback
type EffectCallback = () => void | (() => void);

const useDebouncedEffect = (
  effect: EffectCallback,
  delay: number,
  deps: React.DependencyList = [],
) => {
  useEffect(() => {
    const handler = setTimeout(() => {
      effect();
    }, delay);

    return () => {
      clearTimeout(handler);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, delay]);
};

export default useDebouncedEffect;
