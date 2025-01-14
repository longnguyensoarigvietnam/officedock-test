'use client';
import { useCallback, useMemo, useState } from 'react';
import Image, { ImageProps } from 'next/image';

export type ImageSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type ImageBorder = 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'full';

export type ImageRoundProps = {
  src: string;
  name: string;
  sz?: ImageSize;
  border?: ImageBorder;
  className?: string;
};

const ImageRound = ({
  src,
  name,
  sz = 'md',
  border = 'none',
  className,
  ...props
}: ImageRoundProps & Omit<ImageProps, 'alt'>) => {
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

  const [hasErrorImage, setHasErrorImage] = useState<boolean>(false);

  const onImageError = useCallback(() => {
    setHasErrorImage(true);
  }, []);

  const renderImage = useMemo(() => {
    if (hasErrorImage || !src) {
      return '/images/no-image.png';
    }
    return src;
  }, [src, hasErrorImage]);

  return (
    <Image
      src={renderImage}
      width={0}
      height={0}
      sizes="100vw"
      className={`object-cover object-center ${borderClass} ${sizeClass} ${className}`}
      alt={name}
      onError={onImageError}
      {...props}
    />
  );
};

export default ImageRound;
