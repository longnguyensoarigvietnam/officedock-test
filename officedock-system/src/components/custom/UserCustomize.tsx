/* eslint-disable @next/next/no-img-element */
'use client';

interface props {
  images: string[];
}

export const RenderAccessories = ({ images }: props) => {
  return (
    <div className="relative h-full w-full">
      {images.map((name, index) => (
        <img
          key={name}
          src={`/images/users/${name}.png`}
          alt={name}
          className="absolute inset-0 w-full h-full object-contain pointer-events-none"
          style={{ zIndex: index }}
        />
      ))}
    </div>
  );
};
