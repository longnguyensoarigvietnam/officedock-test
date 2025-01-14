export type AvatarIconProps = {
  color: string;
  size: number;
};

const AvatarIconWithDynamicColor = ({ color, size }: AvatarIconProps) => {
  return (
    <div className="mt-0.5">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 36 36`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg">
        <rect width={size} height={size} rx={size / 2} fill={color} />
        <mask
          id={`mask0_528_5${size}`}
          style={{ 'mask-type': 'alpha' } as React.CSSProperties}
          maskUnits="userSpaceOnUse"
          x="0"
          y="0"
          width={size}
          height={size}>
          <rect width={size} height={size} rx={size / 2} fill={color} />
        </mask>
        <g mask={`url(#mask0_528_5${size})`}>
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
    </div>
  );
};

export default AvatarIconWithDynamicColor;
