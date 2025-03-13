import ImageRound from '@components/common/ImageRound';
import { formatTimeToJapanese } from '@utils/date';
import React from 'react';

interface ProgressBarProps {
  label: string;
  value: number;
  id: number;
  duration: string;
  maxValue?: number;
  optionData: string[];
  color?: string;
  classProgressClass?: string;
  className?: string;
  handleClickTooltip: (id: number | null) => void;
}

const ProgressBarStatistic = ({
  id,
  label,
  value,
  duration,
  maxValue = 100,
  color = '#007bff',
  className,
  classProgressClass,
  optionData,
  handleClickTooltip,
}: ProgressBarProps) => {
  const percentage = Math.min((value / maxValue) * 100, 100);

  return (
    <>
      <div className={`font-medium text-sm text-black ${className}`}>
        <div className="flex justify-between items-center mb-[10px]">
          <span className="text-lg font-medium truncate max-w-40">{label}</span>
          <span className="text-lg font-medium truncate max-w-24">
            {duration && formatTimeToJapanese(duration)}
          </span>
        </div>

        <div
          className={`group w-full relative h-4 bg-gray-300 rounded-full  ${classProgressClass}`}>
          <div
            className="h-full transition-all duration-500"
            style={{
              width: `${percentage}%`,
              backgroundColor: color,
            }}></div>
          <div className="absolute top-0 left-[70%] w-[250px]  rounded-md p-5 bg-white hidden  group-hover:block group-hover:pointer-events-auto transition-opacity duration-300 shadow-lg z-10">
            <div className="flex items-center gap-1">
              <div
                style={{
                  backgroundColor: color,
                }}
                className="w-3 h-3"></div>
              <span className="truncate font-bold text-base">{label}</span>
            </div>
            <div className="flex items-center gap-[10px] font-normal text-base mt-4">
              <span>${percentage}%</span>
              <span>{duration && formatTimeToJapanese(duration)}</span>
            </div>
            <ul>
              {optionData.map((item, index) => (
                <li
                  key={index}
                  className="break-all line-clamp-3 text-[#77858F] text-sm font-normal]">
                  {item}
                </li>
              ))}
            </ul>
            <div className="flex w-full justify-end mt-3">
              <div
                onClick={() => {
                  handleClickTooltip(id);
                }}
                className="bg-white flex items-center  justify-center gap-2 text-sm text-[#77858F] font-medium h-[34px] rounded-md">
                <span>タスクを見る</span>
                <div className="flex items-center justify-center w-[18px] h-[18px] bg-[#EBF1F7] rounded-full">
                  <ImageRound
                    className=" h-[8px] w-fit cursor-pointer relative left-[0.5px]"
                    src="/icons/right-statistic.svg"
                    name="right"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ProgressBarStatistic;
