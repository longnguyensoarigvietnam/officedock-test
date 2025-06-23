import { memo, useMemo } from 'react';
import Image from 'next/image';

import { getFileURL } from '@utils';

export type CustomUserAvatarProps = {
  avatarUrl: string;
  avatarColor: string;
  size: number;
  customClassName?: string;
  isCalendarScreen?: boolean;
};
const CustomUserAvatar = memo(({
  avatarUrl,
  avatarColor,
  size,
  customClassName,
}: CustomUserAvatarProps) => {
  const clipId = useMemo(() => `clip-${Math.random()}`, []);

  return (
    <div className={`${customClassName}`}>
      {avatarUrl ? (
        <div
          className="relative rounded-full overflow-hidden bg-white"
          style={{ width: size, height: size }}>
          <Image
            src={getFileURL(avatarUrl)}
            className="hover:cursor-pointer object-cover object-center"
            fill
            alt="avatar"
            unoptimized={true}
          />
        </div>
      ) : (
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          fill="none"
          xmlns="http://www.w3.org/2000/svg">
          {/* Circle background */}
          <rect width={size} height={size} rx={size / 2} fill={avatarColor} />

          {/* Define a circular clipPath */}
          <defs>
            <clipPath id={clipId}>
              <rect width={size} height={size} rx={size / 2} />
            </clipPath>
          </defs>

          {/* Group clipped by the circular path */}
          <g clipPath={`url(#${clipId})`}>
            {/* Bottom rectangle (mouth?) */}
            <rect
              x={size * 0.19}
              y={size * 0.57}
              width={size * 0.62}
              height={size * 0.62}
              rx={size * 0.31}
              fill="#F3F3F3"
            />

            {/* Top rectangle */}
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
});
export default CustomUserAvatar;
