import ImageRound from '@components/common/ImageRound';
import { OptionDropdownType } from '@interfaces/common';
import {
  formatShowStatisticTask,
  formatTimeToJapanese,
  getJapaneseDayName,
} from '@utils/date';
import { useEffect, useRef, useState } from 'react';

interface ProgressBarProps {
  label: string;
  value: number;
  id: string | number;
  duration: string;
  maxValue?: number;
  optionData: string[];
  mergedItems?: {
    color: string;
    id: string | number;
    label: string;
    value: number;
    duration: string;
    optionData: string[];
    organizationId?: string;
  }[];
  organizationId?: string;
  color?: string;
  classProgressClass?: string;
  className?: string;
  showInfo?: boolean;
  startDate?: Date;
  endDate?: Date | null;
  startDateCompare?: Date;
  endDateCompare?: Date | null;
  isAllTeam?: boolean;
  isLast?: boolean;
  isActive?: boolean;
  onActivate?: (id: number) => void;
  handleClickTooltip: (id: number | null, organizationId?: string) => void;
  handleClickChart?: (data: OptionDropdownType) => void;
  onDeactivate?: (id: number) => void;
  tooltipDelay?: number;
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
  mergedItems,
  showInfo = true,
  startDate,
  endDate,
  startDateCompare,
  endDateCompare,
  organizationId,
  isAllTeam = false,
  isLast,
  isActive,
  onActivate,
  handleClickTooltip,
  handleClickChart,
  onDeactivate,
  tooltipDelay = 1000,
}: ProgressBarProps) => {
  const percentage = Math.round(Math.min((value / maxValue) * 100, 100));

  const containerRef = useRef<HTMLDivElement | null>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isHovering, setHovering] = useState<boolean>(false);

  useEffect(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setHovering(!!isActive);
  }, [isActive]);
  return (
    <>
      <div className={`font-medium text-sm text-black ${className}`}>
        <div className={`${showInfo ? 'mb-[10px]' : 'mb-[6px]'} `}>
          {showInfo && (
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium truncate max-w-40">
                {label}
              </span>
              <span className="text-sm font-medium truncate max-w-24">
                {duration && formatTimeToJapanese(duration)}
              </span>
            </div>
          )}
        </div>

        <div
          ref={containerRef}
          onMouseLeave={() => {
            // leave the container completely → count 1s before turning off to avoid flicker
            if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
            hoverTimeoutRef.current = setTimeout(() => {
              onDeactivate && onDeactivate(id as number);
            }, tooltipDelay);
          }}
          onMouseEnter={() => {
            if (hoverTimeoutRef.current) {
              clearTimeout(hoverTimeoutRef.current);
              hoverTimeoutRef.current = null;
            }
            onActivate && onActivate(id as number);
          }}
          className={`group w-full relative h-4 bg-[#EBF1F7] ${classProgressClass}`}>
          <div
            className="h-full transition-all duration-500 rounded-[4px]"
            style={{
              width: `${percentage}%`,
              backgroundColor: color,
            }}
            onClick={() => {
              handleClickChart &&
                handleClickChart({
                  label: label,
                  value: id || '',
                });
            }}
          />
          {percentage > 0 && (
            <div
              onMouseEnter={() => {
                if (hoverTimeoutRef.current)
                  clearTimeout(hoverTimeoutRef.current);
              }}
              onMouseLeave={(e) => {
                const nextEl = e.relatedTarget as HTMLElement | null;
                const container = containerRef.current;
                // If still in container → do not shut down
                if (container && nextEl && container.contains(nextEl)) return;

                // Leave completely → count 1s then turn off
                if (hoverTimeoutRef.current)
                  clearTimeout(hoverTimeoutRef.current);
                hoverTimeoutRef.current = setTimeout(() => {
                  onDeactivate && onDeactivate(id as number);
                }, tooltipDelay);
              }}
              className={`absolute -top-[25%] ${isLast ? 'right-[100%]' : 'left-[100%]'} w-[288px] rounded-[14px] py-5 bg-white ${isHovering ? 'block' : 'hidden'}  pointer-events-auto transition-opacity duration-300 shadow-lg z-10`}>
              {id != -1 ? (
                <div className="px-5">
                  {startDate && endDate && (
                    <div className="flex items-center mb-3 gap-[6px]">
                      <p className="bg-[#EBF1F7] w-[57px] h-[18px] text-primary rounded-sm text-xs font-medium flex items-center justify-center">
                        基準期間
                      </p>
                      <div className="text-[#77858F] text-sm font-normal flex items-center gap-[1px]">
                        <p>
                          {startDate && formatShowStatisticTask(startDate)}(
                          {getJapaneseDayName(String(startDate))})
                        </p>
                        ~
                        <p>
                          {endDate && formatShowStatisticTask(endDate)}(
                          {getJapaneseDayName(String(endDate))})
                        </p>
                      </div>
                    </div>
                  )}
                  {startDateCompare && endDateCompare && (
                    <div className="flex items-center mb-3 gap-[6px]">
                      <p className="bg-[#F9EAEA] w-[57px] h-[18px] text-[#E95062] rounded-sm text-xs font-medium flex items-center justify-center">
                        比較期間
                      </p>
                      <div className="text-[#77858F] text-sm font-normal flex items-center gap-[1px]">
                        <p>
                          {startDateCompare &&
                            formatShowStatisticTask(startDateCompare)}
                          ({getJapaneseDayName(String(startDateCompare))})
                        </p>
                        ~
                        <p>
                          {endDateCompare &&
                            formatShowStatisticTask(endDateCompare)}
                          ({getJapaneseDayName(String(endDateCompare))})
                        </p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <div
                      style={{
                        backgroundColor: color,
                      }}
                      className="w-3 h-3 rounded-full"></div>
                    <p className="max-w-[calc(100%_-_20px)] break-all line-clamp-3 font-bold text-[16px]">
                      {label}
                    </p>
                  </div>
                  <div className="flex items-center gap-[10px] font-normal text-sm my-2">
                    <span>{percentage}%</span>
                    <span>{duration && formatTimeToJapanese(duration)}</span>
                  </div>
                  <ul>
                    {optionData.map((item, index) => (
                      <li
                        key={index}
                        className="break-all line-clamp-3 text-[#77858F] text-sm font-normal">
                        {item}
                      </li>
                    ))}
                  </ul>
                  {!isAllTeam && (
                    <div className="flex w-full justify-end mt-3">
                      <div
                        onClick={() => {
                          handleClickTooltip(id as number, organizationId);
                        }}
                        className="bg-white flex items-center justify-center gap-2 font-normal text-[12px] text-[#77858F] h-[34px] rounded-md hover:cursor-pointer">
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
                  )}
                </div>
              ) : (
                <div>
                  <p className="text-xs px-5 text-start font-medium text-[#77858F] mb-3">
                    その他
                  </p>
                  {startDate && endDate && (
                    <div className="flex items-center mb-3 px-5 gap-[6px]">
                      <p className="bg-[#EBF1F7] w-[57px] h-[18px] text-primary rounded-sm text-xs font-medium flex items-center justify-center">
                        基準期間
                      </p>
                      <div className="text-[#77858F] text-sm font-normal flex items-center gap-[1px]">
                        <p>
                          {startDate && formatShowStatisticTask(startDate)}(
                          {getJapaneseDayName(String(startDate))})
                        </p>
                        ~
                        <p>
                          {endDate && formatShowStatisticTask(endDate)}(
                          {getJapaneseDayName(String(endDate))})
                        </p>
                      </div>
                    </div>
                  )}
                  {startDateCompare && endDateCompare && (
                    <div className="flex items-center mb-3 px-5 gap-[6px]">
                      <p className="bg-[#F9EAEA] w-[57px] h-[18px] text-[#E95062] rounded-sm text-xs font-medium flex items-center justify-center">
                        比較期間
                      </p>
                      <div className="text-[#77858F] text-sm font-normal flex items-center gap-[1px]">
                        <p>
                          {startDateCompare &&
                            formatShowStatisticTask(startDateCompare)}
                          ({getJapaneseDayName(String(startDateCompare))})
                        </p>
                        ~
                        <p>
                          {endDateCompare &&
                            formatShowStatisticTask(endDateCompare)}
                          ({getJapaneseDayName(String(endDateCompare))})
                        </p>
                      </div>
                    </div>
                  )}
                  <div className="max-h-[350px] overflow-y-auto px-5">
                    {mergedItems &&
                      mergedItems?.length > 0 &&
                      mergedItems.map((item, index) => {
                        return (
                          <div key={index}>
                            <div className="flex items-center gap-1">
                              <div
                                style={{
                                  backgroundColor: item.color,
                                }}
                                className="w-3 h-3 rounded-full"></div>
                              <p className="break-all line-clamp-3 max-w-[calc(100%_-_20px)] font-bold text-[16px]">
                                {item.label}
                              </p>
                            </div>
                            <div className="flex items-center gap-[10px] font-normal text-sm my-2">
                              <span>{item.value}%</span>
                              <span>
                                {item.duration &&
                                  formatTimeToJapanese(item.duration)}
                              </span>
                            </div>
                            {
                              <div className="flex w-full justify-end mt-3">
                                <div
                                  onClick={() => {
                                    handleClickTooltip(
                                      item.id as number,
                                      item.organizationId,
                                    );
                                  }}
                                  className="bg-white flex items-center justify-center font-normal gap-2 text-[12px] text-[#77858F] h-[34px] rounded-md hover:cursor-pointer">
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
                            }

                            <div className="w-full mb-4 border-b border-[#D2DBE1]"></div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default ProgressBarStatistic;
