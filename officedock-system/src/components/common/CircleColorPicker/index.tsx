import Circle from '@uiw/react-color-circle';
import { useEffect, useRef } from 'react';

import { HIERARCHY_COLOR_LIST } from '@constants';

import './styles/style.css';

interface CircleColorPickerProps {
  onChange: (newColor: string) => void;
  onClose: () => void;
}

export const CircleColorPicker = ({ onChange, onClose }: CircleColorPickerProps) => {
  const pickerRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const handleClickOutside = (event: any) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div
      ref={pickerRef}
      className="!w-[170px] bg-white pt-[10px] pb-[20px] pl-[20px] pr-[10px] rounded-[6px]"
      style={{ boxShadow: '0px 2px 8px 0px #0000001A' }}>
      <p className="font-medium text-xs text-[#77858F] mb-4">色の選択</p>
      <Circle
        colors={HIERARCHY_COLOR_LIST}
        color={'#F44E3B'}
        onChange={(e) => {
          onChange(e.hex)
        }}
        className="flex flex-wrap"
      />
    </div>
  );
};
