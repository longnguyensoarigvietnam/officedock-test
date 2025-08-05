import ImageRound from '@components/common/ImageRound';
import React from 'react';

type Props = {
  color?: string;
};

const ClockIconColor = ({ color }: Props) => {
  return (
    <div
      style={{
        backgroundColor: color || '#228CDB',
      }}
      className=" w-[14px] h-[14px] rounded-full flex items-start justify-center mt-[2px] mr-1">
      <ImageRound
        src="/icons/half-clock.svg"
        name="Clock icon"
        className="text-gray-400 mt-[2px] ml-[4px] w-fit h-fit"
      />
    </div>
  );
};

export default ClockIconColor;
