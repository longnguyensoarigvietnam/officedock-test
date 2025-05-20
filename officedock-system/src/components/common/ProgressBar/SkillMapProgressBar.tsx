import { Line } from 'rc-progress';

interface SkillMapProgressBarProps {
  value: number;
  strokeColor: string;
  className?: string;
}

export const SkillMapProgressBar = ({
  value,
  className,
  strokeColor,
}: SkillMapProgressBarProps) => {
  return (
    <div className="">
      <Line
        percent={value}
        strokeColor={strokeColor}
        strokeWidth={3}
        trailWidth={3}
        trailColor="#D2DBE1"
        className={`${className}`}
      />
    </div>
  );
};
