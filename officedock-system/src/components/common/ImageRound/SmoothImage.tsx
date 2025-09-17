'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Image, { ImageProps } from 'next/image';

export type ImageSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type ImageBorder = 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'full';

export type SmoothImageProps = {
  src: string;
  name: string;
  sz?: ImageSize;
  border?: ImageBorder;
  className?: string;
};

const SmoothImage = ({
  src,
  name,
  sz = 'md',
  border = 'none',
  className,
  ...props
}: SmoothImageProps & Omit<ImageProps, 'alt'>) => {
  const sizeClass = {
    xs: 'w-6 h-6',
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
    xl: 'w-14 h-14',
  }[sz];

  const borderClass = {
    none: 'rounded-none',
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    xl: 'rounded-xl',
    full: 'rounded-full',
  }[border];

  const [currentSrc, setCurrentSrc] = useState(src);
  const [nextSrc, setNextSrc] = useState<string | null>(null);
  const [hasErrorImage, setHasErrorImage] = useState(false);

  useEffect(() => {
    if (src !== currentSrc) {
      setNextSrc(src);
    }
  }, [src, currentSrc]);

  const onImageError = useCallback(() => {
    setHasErrorImage(true);
  }, []);

  const fallback = useMemo(() => '/images/no-image.png', []);

  return (
    <div
      className={` ${sizeClass} ${borderClass} ${className}`}
      style={props.style}>
      {/* Current image */}
      <Image
        src={hasErrorImage ? fallback : currentSrc}
        alt={name}
        fill
        className="object-cover object-center transition-opacity duration-300"
        onError={onImageError}
        {...props}
      />

      {/* New image (hidden until loaded) */}
      {nextSrc && !hasErrorImage && (
        <Image
          src={nextSrc}
          alt={name}
          fill
          className="object-cover object-center opacity-0 transition-opacity duration-300"
          onError={onImageError}
          onLoadingComplete={() => {
            setCurrentSrc(nextSrc);
            setNextSrc(null);
          }}
          {...props}
        />
      )}
    </div>
  );
};

export default SmoothImage;
