import { getFileURL } from '@utils';
import Image from 'next/image';

export type CustomUserAvatarProps = {
  avatarUrl: string;
  avatarColor: string;
  size: number;
  customClassName?: string;
  isCalendarScreen?: boolean;
};
const CustomUserAvatar = ({
  avatarUrl,
  avatarColor,
  size,
  customClassName,
}: CustomUserAvatarProps) => {
  return (
    <div className={`${customClassName}`}>
      {avatarUrl ? (
        <div
          className="relative rounded-full overflow-hidden"
          style={{ width: size, height: size }}>
          <Image
            src={getFileURL(avatarUrl)}
            className="hover:cursor-pointer object-cover object-center"
            fill 
            alt="avatar"
          />
        </div>
      ) : (
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          fill="none"
          xmlns="http://www.w3.org/2000/svg">
          <rect width={size} height={size} rx={size / 2} fill={avatarColor} />
          <mask
            id={`${Math.random()}`}
            style={{ 'mask-type': 'alpha' } as React.CSSProperties}
            maskUnits="userSpaceOnUse"
            x="0"
            y="0"
            width={size}
            height={size}>
            <rect width={size} height={size} rx={size / 2} fill={avatarColor} />
          </mask>
          <g
            mask={`${Math.random()}`}>
            <rect
              x={size * 0.19}
              y={size * 0.57}
              width={size * 0.62}
              height={size * 0.62}
              rx={size * 0.31}
              fill="#F3F3F3"
            />
          </g>
          <rect
            x={size * 0.33}
            y={size * 0.17}
            width={size * 0.33}
            height={size * 0.33}
            rx={size * 0.17}
            fill="#F3F3F3"
          />
        </svg>
      )}
    </div>
  );
};
export default CustomUserAvatar;
