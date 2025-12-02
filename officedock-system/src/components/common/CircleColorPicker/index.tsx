import Circle from '@uiw/react-color-circle';
import { useEffect, useRef } from 'react';

import ImageRound from '../ImageRound';

import { HIERARCHY_COLOR_LIST } from '@constants';

import './styles/style.css';

interface CircleColorPickerProps {
  onChange: (newColor: string) => void;
  onClose: () => void;
}

export const CircleColorPicker = ({
  onChange,
  onClose,
}: CircleColorPickerProps) => {
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={pickerRef}
      className="!w-[170px] bg-white pt-[10px] pb-[20px] pl-[20px] pr-[10px] rounded-[6px]"
      style={{ boxShadow: '0px 2px 8px 0px #0000001A' }}>
      <div className="flex justify-between !items-center mb-2">
        <p className="font-medium text-xs text-[#77858F]">色の選択</p>
        <div
          className="hover:bg-[#EBF1F4] p-1.5 hover:rounded-full hover:cursor-pointer"
          onClick={onClose}>
          <ImageRound
            name="Close"
            src={'/icons/close.svg'}
            className="w-[18px] h-[18px] hover:cursor-pointer"
          />
        </div>
      </div>

      <Circle
        colors={HIERARCHY_COLOR_LIST}
        color={'#F44E3B'}
        onChange={(e) => {
          onChange(e.hex);
        }}
        className="flex flex-wrap"
      />
    </div>
  );
};
