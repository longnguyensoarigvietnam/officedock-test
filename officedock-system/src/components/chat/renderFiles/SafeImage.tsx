'use client';

import Image, { ImageProps } from 'next/image';
import { useState } from 'react';

interface SafeImageProps extends ImageProps {
  fallbackColor?: string;
}

export default function SafeImage({
  src,
  alt,
  fallbackColor = '#e5e7eb',
  width,
  height,
  ...props
}: SafeImageProps) {
  const [isError, setIsError] = useState(false);

  const w = typeof width === 'number' ? `${width}px` : width;
  const h = typeof height === 'number' ? `${height}px` : height;

  if (isError) {
    return (
      <div
        style={{
          width: w,
          height: h,
          backgroundColor: fallbackColor,
          borderRadius: 4,
        }}
      />
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      onError={() => setIsError(true)}
      {...props}
    />
  );
}
