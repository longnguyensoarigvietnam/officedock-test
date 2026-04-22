import React from 'react';
import Slider from 'rc-slider';
import 'rc-slider/assets/index.css';
import './styles/slider.css';
import { TOTAL_SKILL_LEVELS } from '@constants';

interface RangeSliderProps {
  value: number;
  onChange?: (value: number) => void;
}

const RangeSlider = ({ value, onChange }: RangeSliderProps) => {
  const totalProgress = 100;
  const step = totalProgress / TOTAL_SKILL_LEVELS;

  return (
    <div className="relative w-full">
      <Slider
        value={value}
        onChange={(val) => {
          if (typeof val === 'number' && val >= 0 && val <= totalProgress) {
            onChange && onChange(val);
          }
        }}
        trackStyle={{
          backgroundImage: 'linear-gradient(to right, #0068B6, #0088C3)',
          borderRadius: 0,
          height: 25,
          position: 'absolute',
          top: '50%',
        }}
        railStyle={{ backgroundColor: 'transparent', height: 25 }}
        step={step}
        defaultValue={0}
        handleStyle={{
          height: '30px',
          width: '50px',
          borderRadius: 0,
          border: 0,
          marginLeft: -10,
          marginTop: -3,
          backgroundImage: `url('/icons/boat.svg')`,
          backgroundSize: 'contain',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center',
          backgroundColor: 'transparent',
        }}
      />
    </div>
  );
};

export default RangeSlider;
