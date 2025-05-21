interface SkillMapProgressBarProps {
  value: number; // 0 to 100
  className?: string;
  strokeColor: string;
  trailColor?: string;
}

export const SkillMapProgressBar = ({
  value,
  className = '',
  strokeColor,
  trailColor = '#D2DBE1',
}: SkillMapProgressBarProps) => {
  return (
    <div
      className={`w-full rounded-full overflow-hidden ${className}`}
      style={{ backgroundColor: trailColor, height: '10px' }}
    >
      <div
        className="h-full transition-all duration-300 ease-in-out"
        style={{
          width: `${Math.min(Math.max(value, 0), 100)}%`,
          backgroundColor: strokeColor,
        }}
      />
    </div>
  );
};
