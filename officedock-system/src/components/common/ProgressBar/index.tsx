import Slider from 'rc-slider';
import 'rc-slider/assets/index.css';
import './styles/progressBar.css';

interface ProgressBarProps {
  value: number;
}

export const ProgressBar = ({ value }: ProgressBarProps) => {
  return (
    <div className="custom-progress-bar">
      <Slider
        value={value}
        className=""
        trackStyle={{
          backgroundImage: 'linear-gradient(to right, #0068B6, #0088C3)',
          borderRadius: 0,
          height: 10,
          animation: 'pulse 2s infinite',
        }}
        railStyle={{
          backgroundColor: 'transparent',
          height: 25,
        }}
        handleStyle={{
          height: '0',
          width: '0',
        }}
      />
    </div>
  );
};
