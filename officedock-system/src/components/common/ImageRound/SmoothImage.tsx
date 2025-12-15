'use client';

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import Image, { ImageProps } from 'next/image';

export type SmoothImageProps = {
  src: string;
  name: string;
  className?: string;
  style?: React.CSSProperties;
};

const getIntrinsicSize = (src: string) =>
  new Promise<{ width: number; height: number }>((resolve) => {
    const img = new window.Image();
    img.src = src;
    if (img.complete) {
      resolve({ width: img.width || 0, height: img.height || 0 });
    } else {
      img.onload = () =>
        resolve({ width: img.width || 0, height: img.height || 0 });
      img.onerror = () => resolve({ width: 0, height: 0 });
    }
  });

const CSS_FADE_MS = 300;

const SmoothImage = ({
  src,
  name,
  className = '',
  style = {},
  ...props
}: SmoothImageProps &
  Omit<ImageProps, 'alt' | 'style' | 'width' | 'height'>) => {
  const [currentSrc, setCurrentSrc] = useState(src);
  const [nextSrc, setNextSrc] = useState<string | null>(null);

  const [currentSize, setCurrentSize] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const [nextSize, setNextSize] = useState<{
    width: number;
    height: number;
  } | null>(null);

  const [isNextLoaded, setIsNextLoaded] = useState(false);
  const [errorCurrent, setErrorCurrent] = useState(false);
  const [errorNext, setErrorNext] = useState(false);

  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const nextBoxRef = useRef<HTMLDivElement | null>(null);
  const swapTimeoutRef = useRef<number | null>(null);

  const fallback = useMemo(() => '/images/no-image.png', []);

  // LOAD CURRENT IMAGE SIZE (intrinsic)
  useEffect(() => {
    let mounted = true;
    getIntrinsicSize(currentSrc).then((s) => {
      if (!mounted) return;
      setCurrentSize(s.width && s.height ? s : null);
    });
    return () => {
      mounted = false;
    };
  }, [currentSrc]);

  // WHEN SRC CHANGES → PRELOAD NEXT SIZE
  useEffect(() => {
    if (src && src !== currentSrc) {
      setNextSrc(src);
      setIsNextLoaded(false);
      setErrorNext(false);

      let mounted = true;
      getIntrinsicSize(src).then((s) => {
        if (!mounted) return;
        setNextSize(s.width && s.height ? s : null);
      });

      return () => {
        mounted = false;
      };
    }

    if (src === currentSrc) {
      setNextSrc(null);
      setNextSize(null);
      setIsNextLoaded(false);
      setErrorNext(false);
    }
  }, [src, currentSrc]);

  const onCurrentError = () => setErrorCurrent(true);
  const onNextError = () => setErrorNext(true);

  const doSwap = useCallback(() => {
    if (nextSrc) {
      setCurrentSrc(nextSrc);
      if (nextSize) setCurrentSize(nextSize);
      setNextSrc(null);
      setNextSize(null);
      setIsNextLoaded(false);
      setErrorNext(false);
    }
  }, [nextSrc, nextSize]);

  // Fade swap logic
  useEffect(() => {
    if (!isNextLoaded || !nextBoxRef.current) return;

    const el = nextBoxRef.current;
    let swapped = false;

    const onEnd = (e: TransitionEvent) => {
      if (e.propertyName === 'opacity') {
        swapped = true;
        doSwap();
      }
    };

    el.addEventListener('transitionend', onEnd);

    const timeout = window.setTimeout(() => {
      if (!swapped) doSwap();
    }, CSS_FADE_MS + 50);

    swapTimeoutRef.current = timeout;

    return () => {
      el.removeEventListener('transitionend', onEnd);
      clearTimeout(timeout);
    };
  }, [isNextLoaded, doSwap]);

  // DO NOT SCALE → ALWAYS RETURN ORIGINAL SIZE
  const getDisplaySize = (s: { width: number; height: number } | null) => {
    if (!s) return null;
    return { width: s.width, height: s.height };
  };

  const currentDisplay = getDisplaySize(currentSize);
  const nextDisplay = getDisplaySize(nextSize);

  const makeBoxStyle = (w: number, h: number): React.CSSProperties => ({
    position: 'absolute',
    bottom: 0,
    left: '50%',
    transform: 'translateX(-50%)',
    width: `${w}px`,
    height: `${h}px`,
    pointerEvents: 'none',
  });

  return (
    <div ref={wrapperRef} className={className} style={style}>
      {/* CURRENT IMAGE */}
      {currentDisplay && (
        <div
          style={{
            ...makeBoxStyle(currentDisplay.width, currentDisplay.height),
            zIndex: 0,
          }}>
          <Image
            key={`current-${currentSrc}`}
            src={errorCurrent ? fallback : currentSrc}
            alt={name}
            width={currentDisplay.width}
            height={currentDisplay.height}
            onError={onCurrentError}
            {...props}
          />
        </div>
      )}

      {/* NEXT IMAGE (fade in) */}
      {nextSrc && nextDisplay && !errorNext && (
        <div
          ref={nextBoxRef}
          style={{
            ...makeBoxStyle(nextDisplay.width, nextDisplay.height),
            zIndex: 1,
            opacity: isNextLoaded ? 1 : 0,
            transition: `opacity ${CSS_FADE_MS}ms ease`,
          }}>
          <Image
            key={`next-${nextSrc}`}
            src={nextSrc}
            alt={name}
            width={nextDisplay.width}
            height={nextDisplay.height}
            onError={onNextError}
            onLoadingComplete={() => setIsNextLoaded(true)}
            {...props}
          />
        </div>
      )}

      {/* NEXT IMAGE FALLBACK */}
      {nextSrc && errorNext && nextDisplay && (
        <div
          style={{
            ...makeBoxStyle(nextDisplay.width, nextDisplay.height),
            zIndex: 1,
          }}>
          <Image
            key={`next-fallback-${nextSrc}`}
            src={fallback}
            alt={name}
            width={nextDisplay.width}
            height={nextDisplay.height}
            {...props}
          />
        </div>
      )}
    </div>
  );
};

export default SmoothImage;
