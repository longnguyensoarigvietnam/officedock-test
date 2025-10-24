import { memo, useMemo } from 'react';
import Image from 'next/image';
import { getFileURL } from '@utils';

export type CustomUserAvatarProps = {
  avatarUrl: string;
  avatarColor: string;
  size: number; // px trong thiết kế gốc (1440x890)
  customClassName?: string;
  avatarClassName?: string;
  isCalendarScreen?: boolean;
  isZoom?: boolean; // 👈 thêm biến này
};

const DESIGN_WIDTH = 1440;

const CustomUserAvatar = memo(
  ({
    avatarUrl,
    avatarColor,
    size,
    avatarClassName,
    customClassName,
    isZoom = false,
  }: CustomUserAvatarProps) => {
    const clipId = useMemo(() => `clip-${Math.random()}`, []);

    const scale = (size / DESIGN_WIDTH) * 100;
    const widthStyle = isZoom ? `${scale}vw` : `${size}px`;
    const heightStyle = isZoom ? `${scale}vw` : `${size}px`;

    return (
      <div className={customClassName}>
        {avatarUrl ? (
          <div
            className="relative rounded-full overflow-hidden bg-white"
            style={{ width: widthStyle, height: heightStyle }}>
            <Image
              src={getFileURL(avatarUrl)}
              className={`hover:cursor-pointer object-cover object-center ${avatarClassName || ''}`}
              fill
              alt="avatar"
              unoptimized
            />
          </div>
        ) : (
          <svg
            width={widthStyle}
            height={heightStyle}
            viewBox={`0 0 ${size} ${size}`}
            fill="none"
            xmlns="http://www.w3.org/2000/svg">
            <rect width={size} height={size} rx={size / 2} fill={avatarColor} />
            <defs>
              <clipPath id={clipId}>
                <rect width={size} height={size} rx={size / 2} />
              </clipPath>
            </defs>
            <g clipPath={`url(#${clipId})`}>
              <rect
                x={size * 0.19}
                y={size * 0.57}
                width={size * 0.62}
                height={size * 0.62}
                rx={size * 0.31}
                fill="#F3F3F3"
              />
              <rect
                x={size * 0.33}
                y={size * 0.17}
                width={size * 0.33}
                height={size * 0.33}
                rx={size * 0.17}
                fill="#F3F3F3"
              />
            </g>
          </svg>
        )}
      </div>
    );
  },
);

export default CustomUserAvatar;
