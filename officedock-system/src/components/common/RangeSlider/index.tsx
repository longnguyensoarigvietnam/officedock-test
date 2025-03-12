'use client';
import React, { useState, useEffect, useRef } from 'react';
import Tippy from '@tippyjs/react';
import 'tippy.js/dist/tippy.css';
import '../../common/RangeSlider/ranger.css';

import ImageRound from '../ImageRound';

interface RangeSliderProps {
  min?: number;
  max?: number;
  initialValue?: number;
  resetTrigger?: any;
  onChange?: (value: number) => void;
}

const RangeSlider: React.FC<RangeSliderProps> = ({
  min = 0,
  max = 100,
  initialValue = 50,
  onChange,
  resetTrigger,
}) => {
  const [value, setValue] = useState<number>(initialValue);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStartX, setDragStartX] = useState<number>(0);
  const [startValue, setStartValue] = useState<number>(0);

  const sliderRef = useRef<HTMLDivElement | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const newValue = Number(e.target.value);
    setValue(newValue);
    setIsDragging(false);
    if (onChange) onChange(newValue);
  };
  const handleMouseMove = (e: MouseEvent): void => {
    if (isDragging) {
      const newX = e.clientX;
      const delta = newX - dragStartX;
      const newValue = Math.min(Math.max(startValue + delta / 3, min), max);
      setValue(newValue);
      if (onChange) onChange(newValue);
    }
  };

  const handleMouseUp = (): void => {
    setIsDragging(false);
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>): void => {
    setIsDragging(true);
    setDragStartX(e.clientX);
    setStartValue(value);
  };

  const handleClickOutside = (e: MouseEvent): void => {
    if (sliderRef.current && !sliderRef.current.contains(e.target as Node)) {
      setIsDragging(false);
    }
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('click', handleClickOutside);
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.addEventListener('click', handleClickOutside);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('click', handleClickOutside);
    };
  }, [isDragging]);

  useEffect(() => {
    setValue(initialValue);
    if (onChange) onChange(initialValue);
  }, [resetTrigger, initialValue, onChange]);

  useEffect(() => {
    setValue(initialValue);
    if (onChange) onChange(initialValue);
  }, [resetTrigger, initialValue, onChange]);

  // Create 5 red apartments from the 2nd to the 6th section running from 100% down

  // TODO : Confirm QA
  // const handleMarkerClick = (markerValue: number) => {
  //   setValue(markerValue);
  //   if (onChange) onChange(markerValue);
  // };
  // const numMarkers = 6;
  // const markerValues = [100, 84, 68, 50, 33];

  // const markers = Array.from({ length: numMarkers }, (_, index) => {
  //   if (index === 5) return null;

  //   const percent = ((numMarkers - index) / numMarkers) * 100;
  //   const markerValue = markerValues[index];

  //   return (
  //     <div
  //       key={index}
  //       className="absolute w-[2px] z-30 h-[14px] bg-red-500"
  //       style={{
  //         left: `${percent}%`,
  //         transform: 'translateX(-50%)',
  //         top: '-2px',
  //       }}
  //       onClick={() => handleMarkerClick(markerValue)}
  //     />
  //   );
  // });

  return (
    <div className="flex w-full items-center gap-2 justify-between">
      <Tippy
        content="縮小"
        arrow={false}
        delay={1000}
        placement="top"
        offset={[0, 3]}>
        <div>
          <button
            onClick={() => {
              const newValue = Math.max(value - 1, min);
              setValue(newValue);
              if (onChange) onChange(newValue);
            }}
            className="text-2xl h-[18px] rounded-full bg-[#ECF0F2] w-[18px] flex items-center justify-center cursor-pointer  border-none">
            <ImageRound
              className="w-[10px] h-[10px] opacity-80"
              src="/icons/zoom-out.svg"
              name="remove icon"
            />
          </button>
        </div>
      </Tippy>

      <div
        ref={sliderRef}
        className="relative w-[100px] h-10 flex items-center"
        style={{ height: '8px' }}>
        <div
          className="absolute w-full h-full"
          style={{
            background: 'linear-gradient(to right, #E0E6EA, #E0E6EA, #E0E6EA)',
            clipPath: 'polygon(25% 50%, 100% 0%, 100% 100%, 10% 50%)',
          }}
        />

        <input
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={handleChange}
          className="absolute w-full h-full z-20 appearance-none bg-transparent outline-none cursor-pointer"
          style={{
            WebkitAppearance: 'none',
            MozAppearance: 'none',
          }}
        />
        <div
          className="absolute z-30 shadow-md"
          style={{
            left: `${value}%`,
            transform: 'translate(-50%, -50%)',
            top: '50%',
            width: '5px',
            height: '14px',
            background: '#0068B6',
            borderRadius: '1px',
            cursor: 'pointer',
          }}
          onMouseDown={handleMouseDown}
        />
      </div>

      <Tippy
        content="拡大"
        arrow={false}
        delay={1000}
        placement="top"
        offset={[0, 3]}>
        <div>
          <button
            onClick={() => {
              const newValue = Math.min(value + 1, max);
              setValue(newValue);
              if (onChange) onChange(newValue);
            }}
            className="text-2xl cursor-pointer h-[18px] rounded-full bg-[#ECF0F2] w-[18px] border-none">
            <ImageRound
              className="w-[10px] h-[10px] relative left-1 opacity-80"
              src="/icons/add.svg"
              name="remove icon"
            />
          </button>
        </div>
      </Tippy>
    </div>
  );
};

export default RangeSlider;
