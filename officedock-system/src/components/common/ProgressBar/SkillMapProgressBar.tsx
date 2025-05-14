import { Line } from 'rc-progress';

interface SkillMapProgressBarProps {
  value: number;
  strokeColor: string;
}

export const SkillMapProgressBar = ({ value, strokeColor }: SkillMapProgressBarProps) => {
  return (
    <div className="">
      <Line
        percent={value}
        strokeColor={strokeColor}
        strokeWidth={3}
        trailWidth={3}
        trailColor="#D2DBE1" 
      />
    </div>
  );
};
