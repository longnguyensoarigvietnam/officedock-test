import React, { useEffect, useRef, useState } from 'react';

import {
  formatShowStatisticTask,
  formatTimeToJapanese,
  getJapaneseDayName,
} from '@utils/date';
import { DataPercentCompareType, OptionDropdownType } from '@interfaces/common';
import ImageRound from '../ImageRound';
import StatisticCompareLoading from '../SkeletonLoading/StatisticCompareLoading';

interface Props {
  isTag?: boolean;
  isLast?: boolean;
  data: DataPercentCompareType[];
  dataCompare: DataPercentCompareType[];
  isLoading: boolean;
  isLoadingCompare: boolean;
  startDate: Date;
  endDate: Date | null;
  startDateCompare: Date;
  endDateCompare: Date | null;
  totalDuration: string;
  totalDurationCompare: string;
  isAllTeamOption?: boolean;
  hasHover?: boolean;
  onActionHover?: () => void;
  handleClickTooltip: (
    id: number | null,
    isCompare: boolean,
    organizationId?: string,
  ) => void;
  handleClickChart: (data: OptionDropdownType) => void;
}

const PercentageBarCompare = ({
  data,
  dataCompare,
  startDate,
  endDate,
  isTag = false,
  isLast = false,
  startDateCompare,
  endDateCompare,
  totalDuration,
  totalDurationCompare,
  isAllTeamOption = false,
  hasHover,
  onActionHover,
  handleClickTooltip,
  handleClickChart,
  isLoading,
  isLoadingCompare,
}: Props) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  // Compare
  const [hoverIndexCompare, setHoverIndexCompare] = useState<number | null>(
    null,
  );
  const containerCompareRef = useRef<HTMLDivElement | null>(null);
  const hoverTimeoutCompareRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (hasHover) {
      setHoverIndex(null);
      setHoverIndexCompare(null);
    }
  }, [hasHover]);
  return (
    <div>
      {isLoading ? (
        <StatisticCompareLoading
          className={isTag ? '!w-[220px] mt-[76px]' : 'w-[280px] mt-10'}
        />
      ) : (
        <>
          <div className={`mt-[14px] ${!isTag && 'flex justify-between'}`}>
            <div className="flex items-center ">
              <p className="bg-[#EBF1F7]  w-[30px] h-[18px] text-primary rounded-sm text-xs font-medium flex items-center justify-center">
                基準
              </p>
              <div className="text-black text-xs font-normal flex items-center gap-[2px]">
                <p>{startDate && formatShowStatisticTask(startDate)}</p>~
                <p>{endDate && formatShowStatisticTask(endDate)}</p>
              </div>
            </div>
            {data.length > 0 ? (
              <div className="font-medium text-sm text-black">
                合計 {totalDuration && formatTimeToJapanese(totalDuration)}
              </div>
            ) : (
              <div className="">-</div>
            )}
          </div>
          <div
            ref={containerRef}
            onMouseLeave={() => {
              // If it really gets out of the whole container
              hoverTimeoutRef.current = setTimeout(() => {
                setHoverIndex(null);
              }, 1000);
            }}
            onMouseEnter={() => {
              onActionHover && onActionHover();
              setHoverIndexCompare(null);
              if (hoverTimeoutRef.current)
                clearTimeout(hoverTimeoutRef.current);
            }}
            className={`${isTag ? 'w-[220px]' : 'w-[280px]'} relative  h-[100px] mt-[14px] flex`}>
            {data.length > 0 ? (
              data.map((item, index) => (
                <div
                  key={index}
                  onClick={() => {
                    if (item.id !== -1) {
                      handleClickChart({
                        label: item.label,
                        value: item.id,
                      });
                    }
                  }}
                  onMouseEnter={() => {
                    if (hoverTimeoutRef.current)
                      clearTimeout(hoverTimeoutRef.current);
                    setHoverIndex(index);
                  }}
                  className="flex group border-l border-white  flex-col justify-center items-center text-white text-center py-2"
                  style={{
                    width: isTag
                      ? `${item.percentage * 2.19}px`
                      : `${item.percentage * 2.79}px`,
                    backgroundColor: item.color,
                    borderRadius: '4px',
                  }}>
                  <span className="w-full text-sm truncate break-all">
                    {item.label}
                  </span>
                  <span className="w-full text-lg font-bold truncate">
                    {item.percentage}%
                  </span>
                  {/*  Hover data */}
                  <div
                    style={{
                      boxShadow: '0px 2px 8px 0px #0000001A',
                    }}
                    onMouseEnter={() => {
                      if (hoverTimeoutRef.current)
                        clearTimeout(hoverTimeoutRef.current);
                    }}
                    onMouseLeave={(e) => {
                      const nextEl = e.relatedTarget as HTMLElement | null;
                      const container = containerRef.current;

                      // 🔍 If the next element is NOT in the container → it means it's really out
                      if (
                        !container ||
                        (nextEl && container.contains(nextEl))
                      ) {
                        // Still in the chart area → DO NOT turn off the tooltip
                        return;
                      }

                      // Exit the chart area → hide the tooltip
                      hoverTimeoutRef.current = setTimeout(() => {
                        setHoverIndex(null);
                      }, 1000);
                    }}
                    className={`absolute top-0 ${isLast ? (isTag ? 'right-[230px]' : 'right-[290px]') : isTag ? 'left-[230px]' : 'left-[290px]'} z-20  w-[250px]  rounded-[14px] p-5 bg-white ${hoverIndex === index ? 'block' : 'hidden'} pointer-events-auto transition-opacity duration-300 shadow-lg `}>
                    {item.mergedItems.length > 0 ? (
                      <>
                        <p className="text-xs text-start font-medium text-[#77858F] mb-5">
                          その他
                        </p>
                        {item.mergedItems.map((mergeItem, indexMerge) => {
                          return (
                            <div key={mergeItem.categoryId}>
                              <div className="flex items-center gap-1">
                                <div
                                  style={{
                                    backgroundColor: mergeItem.categoryColor,
                                  }}
                                  className="w-3 h-3 rounded-full flex-shrink-0"></div>
                                <span className="truncate max-w-[180px] font-bold text-base text-black">
                                  {mergeItem.categoryName}
                                </span>
                              </div>
                              <div className="flex items-center gap-[10px] font-normal text-base mt-4">
                                <span className="text-black">
                                  {mergeItem.percent}%
                                </span>
                                <span className="text-black">
                                  {mergeItem.duration &&
                                    formatTimeToJapanese(mergeItem.duration)}
                                </span>
                              </div>
                              <div className="flex w-full justify-end mt-3">
                                <div
                                  onClick={() => {
                                    handleClickTooltip(
                                      mergeItem.categoryId,
                                      false,
                                      String(mergeItem.organizationId),
                                    );
                                  }}
                                  className="bg-white flex items-center  justify-center gap-2 text-sm text-[#77858F] font-medium h-[34px] rounded-md hover:cursor-pointer">
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
                              <div
                                className={`${indexMerge === item.mergedItems.length - 1 && 'hidden'} w-full my-5  border-b border-[#D2DBE1]`}></div>
                            </div>
                          );
                        })}
                      </>
                    ) : (
                      <>
                        <div className="flex items-center ">
                          <p className="bg-[#EBF1F7] w-[57px] h-[18px] text-primary rounded-sm text-xs font-medium flex items-center justify-center">
                            基準期間
                          </p>
                          <div className="text-black text-xs font-normal flex items-center gap-[1px]">
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
                        <div className="flex items-center gap-1">
                          <div
                            style={{
                              backgroundColor: item.color,
                            }}
                            className="w-3 h-3 rounded-full flex-shrink-0"></div>

                          <span className="truncate max-w-[180px] font-bold text-base text-black">
                            {item.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-[10px] font-normal text-base mt-4">
                          <span className="text-black">{item.percentage}%</span>
                          <span className="text-black">
                            {item.totalDuration &&
                              formatTimeToJapanese(item.totalDuration)}
                          </span>
                        </div>
                        <ul>
                          {item.optionData.map((item, index) => (
                            <li
                              key={index}
                              className="break-all text-start line-clamp-3 text-[#77858F] text-sm font-normal]">
                              {item.label}
                            </li>
                          ))}
                        </ul>
                        {!isAllTeamOption && (
                          <div className="flex w-full justify-end mt-3">
                            <div
                              onClick={() => {
                                handleClickTooltip(
                                  item.id as number,
                                  false,
                                  String(item.organizationId),
                                );
                              }}
                              className="bg-white flex items-center  justify-center gap-2 text-sm text-[#77858F] font-medium h-[34px] rounded-md hover:cursor-pointer">
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
                      </>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="w-full h-full bg-[#EBF1F7]"></div>
            )}
          </div>
        </>
      )}
      {isLoadingCompare ? (
        <StatisticCompareLoading
          className={isTag ? '!w-[220px] mt-6' : 'w-[280px] mt-6'}
        />
      ) : (
        <>
          <div
            ref={containerCompareRef}
            onMouseLeave={() => {
              // If it really gets out of the whole container
              hoverTimeoutCompareRef.current = setTimeout(() => {
                setHoverIndexCompare(null);
              }, 1000);
            }}
            onMouseEnter={() => {
              setHoverIndex(null);
              onActionHover && onActionHover();

              if (hoverTimeoutCompareRef.current)
                clearTimeout(hoverTimeoutCompareRef.current);
            }}
            className={`${isTag ? 'w-[220px]' : 'w-[280px]'} relative  flex  h-[100px] mt-[30px]`}>
            {dataCompare.length > 0 ? (
              dataCompare.map((item, index) => (
                <div
                  key={index}
                  onClick={() => {
                    if (item.id !== -1) {
                      handleClickChart({
                        label: item.label,
                        value: item.id,
                      });
                    }
                  }}
                  onMouseEnter={() => {
                    if (hoverTimeoutCompareRef.current)
                      clearTimeout(hoverTimeoutCompareRef.current);
                    setHoverIndexCompare(index);
                  }}
                  className="flex group border-l border-white flex-col justify-center items-center text-white text-center py-2"
                  style={{
                    width: isTag
                      ? `${item.percentage * 2.188}px`
                      : `${item.percentage * 2.788}px`,
                    backgroundColor: item.color,
                    borderRadius: '4px',
                  }}>
                  <span className="text-sm w-full truncate break-all">
                    {item.label}
                  </span>
                  <span className="text-lg w-full font-bold truncate">
                    {item.percentage}%
                  </span>

                  {/* Hover data compare */}
                  <div
                    style={{
                      boxShadow: '0px 2px 8px 0px #0000001A',
                    }}
                    onMouseEnter={() => {
                      if (hoverTimeoutCompareRef.current)
                        clearTimeout(hoverTimeoutCompareRef.current);
                    }}
                    onMouseLeave={(e) => {
                      const nextEl = e.relatedTarget as HTMLElement | null;
                      const container = containerCompareRef.current;

                      // 🔍 If the next element is NOT in the container → it means it's really out
                      if (
                        !container ||
                        (nextEl && container.contains(nextEl))
                      ) {
                        // Still in the chart area → DO NOT turn off the tooltip
                        return;
                      }

                      // Exit the chart area → hide the tooltip
                      hoverTimeoutCompareRef.current = setTimeout(() => {
                        setHoverIndexCompare(null);
                      }, 1000);
                    }}
                    className={`absolute top-0 ${isLast ? (isTag ? 'right-[230px]' : 'right-[290px]') : isTag ? 'left-[230px]' : 'left-[290px]'} w-[250px] z-20  rounded-[14px] p-5 bg-white ${hoverIndexCompare === index ? 'block' : 'hidden'} pointer-events-auto transition-opacity duration-300 shadow-lg `}>
                    {item.mergedItems.length > 0 ? (
                      <>
                        <p className="text-xs text-start font-medium text-[#77858F] mb-5">
                          その他
                        </p>

                        {item.mergedItems.map((mergeItem, indexMerge) => {
                          return (
                            <div key={mergeItem.categoryId}>
                              <div className="flex items-center gap-1">
                                <div
                                  style={{
                                    backgroundColor: mergeItem.categoryColor,
                                  }}
                                  className="w-3 h-3 rounded-full flex-shrink-0"></div>
                                <span className="truncate max-w-[180px] font-bold text-base text-black">
                                  {mergeItem.categoryName}
                                </span>
                              </div>
                              <div className="flex items-center gap-[10px] font-normal text-base mt-4">
                                <span className="text-black">
                                  {mergeItem.percent}%
                                </span>
                                <span className="text-black">
                                  {mergeItem.duration &&
                                    formatTimeToJapanese(mergeItem.duration)}
                                </span>
                              </div>
                              <ul>
                                {mergeItem.tasks?.map((item, index) => (
                                  <li
                                    key={index}
                                    className="break-all text-start line-clamp-3 text-[#77858F] text-sm font-normal]">
                                    {item.title}
                                  </li>
                                ))}
                              </ul>
                              <div className="flex w-full justify-end mt-3">
                                <div
                                  onClick={() => {
                                    handleClickTooltip(
                                      mergeItem.categoryId,
                                      true,
                                      String(mergeItem.organizationId),
                                    );
                                  }}
                                  className="bg-white flex items-center  justify-center gap-2 text-sm text-[#77858F] font-medium h-[34px] rounded-md hover:cursor-pointer">
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
                              <div
                                className={`${indexMerge === item.mergedItems.length - 1 && 'hidden'} w-full my-5  border-b border-[#D2DBE1]`}></div>
                            </div>
                          );
                        })}
                      </>
                    ) : (
                      <>
                        <div className="flex items-center ">
                          <p className="bg-[#F9EAEA] w-[57px] h-[18px] text-[#E95062] rounded-sm text-xs font-medium flex items-center justify-center">
                            比較期間
                          </p>
                          <div className="text-black text-xs font-normal flex items-center gap-[1px]">
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
                        <div className="flex items-center gap-1">
                          <div
                            style={{
                              backgroundColor: item.color,
                            }}
                            className="w-3 h-3 rounded-full flex-shrink-0"></div>
                          <span className="truncate font-bold text-base text-black">
                            {item.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-[10px] font-normal text-base mt-4">
                          <span className="text-black">{item.percentage}%</span>
                          <span className="text-black">
                            {item.totalDuration &&
                              formatTimeToJapanese(item.totalDuration)}
                          </span>
                        </div>
                        <ul>
                          {item.optionData.map((item, index) => (
                            <li
                              key={index}
                              className="break-all text-start line-clamp-3 text-[#77858F] text-sm font-normal]">
                              {item.label}
                            </li>
                          ))}
                        </ul>
                        {!isAllTeamOption && (
                          <div className="flex w-full justify-end mt-3">
                            <div
                              onClick={() => {
                                handleClickTooltip(
                                  item.id as number,
                                  true,
                                  String(item.organizationId),
                                );
                              }}
                              className="bg-white flex items-center  justify-center gap-2 text-sm text-[#77858F] font-medium h-[34px] rounded-md hover:cursor-pointer">
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
                      </>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="w-full h-full bg-[#EBF1F7]"></div>
            )}
          </div>
          <div className={`mt-[14px] ${!isTag && 'flex justify-between'}`}>
            <div className="flex items-center">
              <p className="bg-[#F9EAEA] w-[30px] h-[18px] text-[#E95062] rounded-sm text-xs font-medium flex items-center justify-center">
                比較
              </p>
              <div className="text-black text-xs font-normal flex items-center gap-[2px]">
                <p>
                  {startDateCompare &&
                    formatShowStatisticTask(startDateCompare)}
                </p>
                ~
                <p>
                  {endDateCompare && formatShowStatisticTask(endDateCompare)}
                </p>
              </div>
            </div>
            {dataCompare.length ? (
              <div className="font-medium text-sm text-black">
                合計{' '}
                {totalDuration && formatTimeToJapanese(totalDurationCompare)}
              </div>
            ) : (
              <div>-</div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default PercentageBarCompare;
