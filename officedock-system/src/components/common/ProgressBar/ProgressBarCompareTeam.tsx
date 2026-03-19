import React, { useEffect, useRef, useState } from 'react';

import {
  formatShowStatisticTask,
  formatTimeToJapanese,
  getJapaneseDayName,
  sumDurationsChart,
} from '@utils/date';
import { DataPercentCompareType, OptionDropdownType } from '@interfaces/common';
import { UserListStatisticType } from '@interfaces/statistic';
import CustomUserAvatar from '../AvatarIcon/CustomUserAvatar';
import StatisticCompareLoading from '../SkeletonLoading/StatisticCompareLoading';

interface Props {
  isTag?: boolean;
  data: DataPercentCompareType[];
  dataCompare: DataPercentCompareType[];
  startDate: Date;
  isLast?: boolean;
  endDate: Date | null;
  startDateCompare: Date;
  endDateCompare: Date | null;
  totalDuration: string;
  totalDurationCompare: string;
  isLoading: boolean;
  isLoadingCompare: boolean;
  isAllTeam?: boolean;
  hasHover?: boolean;
  onActionHover?: () => void;
  handleClickTooltip: (id: number | null, isCompare: boolean) => void;
  handleClickChart: (data: OptionDropdownType) => void;
  showNoDataText?: boolean;
  tooltipDelay?: number;
}

const PercentageBarCompareTeam = ({
  data,
  dataCompare,
  startDate,
  endDate,
  isLast = false,
  isTag = false,
  isAllTeam = false,
  startDateCompare,
  endDateCompare,
  totalDuration,
  totalDurationCompare,
  isLoading,
  isLoadingCompare,
  hasHover,
  onActionHover,
  handleClickChart,
  showNoDataText = false,
  tooltipDelay = 1000,
}: Props) => {
  const mergeUsers = (
    users: UserListStatisticType[],
  ): UserListStatisticType[] => {
    const byUserKey = new Map<string, UserListStatisticType>();

    users.forEach((u) => {
      const user = u?.user;
      if (!user?.fullName) return;

      // Some APIs can return duplicate "same person" rows with different ids.
      // Use a display-identity key to avoid duplicate rows in tooltip.
      const key = `${user.fullName}||${user.avatar || ''}||${user.avatarColor || ''}`;

      const existing = byUserKey.get(key);
      if (!existing) {
        byUserKey.set(key, {
          user,
          percent: Number(u.percent) || 0,
          duration: u.duration,
          tasks: u.tasks ?? [],
        });
        return;
      }

      const mergedTasks = [...(existing.tasks ?? []), ...(u.tasks ?? [])];
      const taskMap = new Map<number, (typeof mergedTasks)[number]>();
      mergedTasks.forEach((t) => taskMap.set(t.id, t));

      byUserKey.set(key, {
        user: existing.user,
        percent: (Number(existing.percent) || 0) + (Number(u.percent) || 0),
        duration: sumDurationsChart([existing.duration, u.duration]),
        tasks: Array.from(taskMap.values()),
      });
    });

    return Array.from(byUserKey.values());
  };

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
          className={isTag ? '!w-[220px] mt-[76px]' : 'w-[280px] mt-12'}
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
              <div className="font-medium text-sm text-black ">
                合計 {totalDuration && formatTimeToJapanese(totalDuration)}
              </div>
            ) : (
              <div>-</div>
            )}
          </div>
          <div
            ref={containerRef}
            onMouseLeave={() => {
              // If it really gets out of the whole container
              hoverTimeoutRef.current = setTimeout(() => {
                setHoverIndex(null);
              }, tooltipDelay);
            }}
            onMouseEnter={() => {
              onActionHover && onActionHover();
              setHoverIndexCompare(null);
              if (hoverTimeoutRef.current)
                clearTimeout(hoverTimeoutRef.current);
            }}
            className={`${isTag ? 'w-[220px]' : 'w-[280px]'} relative mt-[14px]  h-[100px] flex`}>
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
                      ? `${item.percentage * 2.188}px`
                      : `${item.percentage * 2.788}px`,
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
                      const nextEl = e.relatedTarget;
                      const container = containerRef.current;

                      if (
                        !container ||
                        (nextEl instanceof Node && container.contains(nextEl))
                      ) {
                        // Still in the chart area → DO NOT turn off the tooltip
                        return;
                      }

                      // Exit the chart area → hide the tooltip
                      hoverTimeoutRef.current = setTimeout(() => {
                        setHoverIndex(null);
                      }, tooltipDelay);
                    }}
                    className={`absolute top-0 ${isLast ? 'right-[100%]' : 'left-[100%]'}  w-[288px]  rounded-md py-5 bg-white ${hoverIndex === index ? 'block' : 'hidden'}  pointer-events-auto transition-opacity duration-300 shadow-lg z-10`}>
                    {item.mergedItems.length > 0 ? (
                      <>
                        <p className="text-xs text-start font-medium text-[#77858F] mb-5 px-5">
                          その他
                        </p>
                        <div className="max-h-[350px] overflow-y-auto">
                          {item.mergedItems.map((mergeItem, indexMerge) => {
                            return (
                              <div key={mergeItem.categoryId}>
                                <div className="flex items-center gap-1 px-5">
                                  <div
                                    style={{
                                      backgroundColor: mergeItem.categoryColor,
                                    }}
                                    className="w-3 h-3 rounded-full flex-shrink-0"></div>
                                  <span className="truncate max-w-[180px] font-bold text-base text-black">
                                    {mergeItem.categoryName ||
                                      mergeItem.tagName}
                                  </span>
                                </div>
                                <div className="flex items-center gap-[10px] font-normal text-base mt-4 px-5">
                                  <span className="text-black">
                                    {mergeItem.percent}%
                                  </span>
                                  <span className="text-black">
                                    {mergeItem.duration &&
                                      formatTimeToJapanese(mergeItem.duration)}
                                  </span>
                                </div>
                                <div className="max-h-[250px] overflow-y-auto px-5">
                                  <ul className="mt-2">
                                    {mergeItem.users &&
                                      mergeUsers(mergeItem.users).map(
                                        (itemMer) => {
                                          return (
                                            <li
                                              key={`${itemMer.user.fullName}||${itemMer.user.avatar || ''}||${itemMer.user.avatarColor || ''}`}
                                              className="flex items-center justify-between mb-2">
                                              <div className="flex items-center gap-2">
                                                <div>
                                                  <CustomUserAvatar
                                                    avatarUrl={
                                                      itemMer.user?.avatar || ''
                                                    }
                                                    avatarColor={
                                                      itemMer.user
                                                        ?.avatarColor || ''
                                                    }
                                                    size={30}
                                                  />
                                                </div>
                                                <span className="inline-block ml-3 max-w-[180px] text-black overflow-hidden whitespace-nowrap text-ellipsis">
                                                  {itemMer.user.fullName}
                                                </span>
                                              </div>
                                              <span className="text-black">
                                                {itemMer.percent}%
                                              </span>
                                            </li>
                                          );
                                        },
                                      )}
                                  </ul>
                                </div>

                                <div
                                  className={`${indexMerge === item.mergedItems.length - 1 && 'hidden'} w-full my-5  border-b px-5 border-[#D2DBE1]`}></div>
                              </div>
                            );
                          })}
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center gap-1 px-5">
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
                        <div className="flex items-center gap-1 mt-[10px] px-5">
                          <div
                            style={{
                              backgroundColor: item.color,
                            }}
                            className="w-3 h-3 rounded-full flex-shrink-0"></div>
                          <span className="truncate max-w-[180px] font-bold text-base text-black">
                            {item.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-[10px] font-normal text-base mt-[10px] px-5">
                          <span className="text-black">{item.percentage}%</span>
                          <span className="text-black">
                            {item.totalDuration &&
                              formatTimeToJapanese(item.totalDuration)}
                          </span>
                        </div>
                        <div className="max-h-[250px] overflow-y-auto px-5">
                          <ul>
                            {!isAllTeam &&
                              item.optionData.map((itemOption, index) => (
                                <li
                                  key={index}
                                  className="break-all text-start flex items-center justify-between gap-2 line-clamp-3 text-[#77858F] text-sm font-normal mb-2">
                                  <div className="flex items-center w-fit">
                                    <CustomUserAvatar
                                      avatarUrl={itemOption?.avatarUrl || ''}
                                      avatarColor={
                                        itemOption?.avatarColor || ''
                                      }
                                      size={30}
                                    />
                                    <span className="relative ml-3 max-w-[160px] truncate top-[-3px]">
                                      {' '}
                                      {itemOption.label}
                                    </span>
                                  </div>
                                  <span>{itemOption.percent}%</span>
                                </li>
                              ))}
                            {isAllTeam &&
                              item.optionData.map((itemOption, index) => (
                                <li
                                  key={index}
                                  className="break-all mt-1 text-start flex items-center justify-between gap-2 line-clamp-3 text-[#77858F] text-sm font-normal mb-2">
                                  <div className="flex items-center w-fit">
                                    <span className="relative max-w-[160px] truncate ">
                                      {' '}
                                      {itemOption.label}
                                    </span>
                                  </div>
                                </li>
                              ))}
                          </ul>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="w-full h-full bg-[#EBF1F7] flex items-center justify-center rounded-[4px]">
                {showNoDataText && (
                  <span className="text-sm text-[#77858F]">
                    データがありません
                  </span>
                )}
              </div>
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
              }, tooltipDelay);
            }}
            onMouseEnter={() => {
              setHoverIndex(null);
              onActionHover && onActionHover();

              if (hoverTimeoutCompareRef.current)
                clearTimeout(hoverTimeoutCompareRef.current);
            }}
            className={`${isTag ? 'w-[220px]' : 'w-[280px]'} relative flex  h-[100px] mt-[30px]`}>
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
                    setHoverIndex(null);
                    if (hoverTimeoutCompareRef.current)
                      clearTimeout(hoverTimeoutCompareRef.current);
                    setHoverIndexCompare(index);
                  }}
                  className="flex  border-l border-white group flex-col justify-center items-center text-white text-center py-2"
                  style={{
                    width: isTag
                      ? `${item.percentage * 2.188}px`
                      : `${item.percentage * 2.799}px`,
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
                      const nextEl = e.relatedTarget;
                      const container = containerCompareRef.current;

                      if (
                        !container ||
                        (nextEl instanceof Node && container.contains(nextEl))
                      ) {
                        // Still in the chart area → DO NOT turn off the tooltip
                        return;
                      }

                      // Exit the chart area → hide the tooltip
                      hoverTimeoutCompareRef.current = setTimeout(() => {
                        setHoverIndexCompare(null);
                      }, tooltipDelay);
                    }}
                    className={`absolute top-0 ${isLast ? 'right-[100%]' : 'left-[100%]'}  w-[288px]  rounded-md py-5 bg-white ${hoverIndexCompare === index ? 'block' : 'hidden'}  pointer-events-auto transition-opacity duration-300 shadow-lg z-10`}>
                    {item.mergedItems.length > 0 ? (
                      <>
                        <p className="text-xs text-start font-medium text-[#77858F] mb-5 px-5">
                          その他
                        </p>
                        <div className="max-h-[350px] overflow-y-auto">
                          {item.mergedItems.map((mergeItem, indexMerge) => {
                            return (
                              <div key={mergeItem.categoryId}>
                                <div className="flex items-center gap-1 px-5">
                                  <div
                                    style={{
                                      backgroundColor: mergeItem.categoryColor,
                                    }}
                                    className="w-3 h-3 rounded-full flex shrink-0"></div>
                                  <span className="truncate max-w-[180px] font-bold text-base text-black">
                                    {mergeItem.categoryName ||
                                      mergeItem.tagName}
                                  </span>
                                </div>
                                <div className="flex items-center gap-[10px] font-normal text-base mt-4 px-5">
                                  <span className="text-black">
                                    {mergeItem.percent}%
                                  </span>
                                  <span className="text-black">
                                    {mergeItem.duration &&
                                      formatTimeToJapanese(mergeItem.duration)}
                                  </span>
                                </div>
                                <div className="max-h-[250px] overflow-y-auto px-5">
                                  <ul className="mt-2">
                                    {mergeItem.users &&
                                      mergeUsers(mergeItem.users).map(
                                        (item) => {
                                          return (
                                            <li
                                              key={`${item.user.fullName}||${item.user.avatar || ''}||${item.user.avatarColor || ''}`}
                                              className="flex items-center justify-between mb-2">
                                              <div className="flex items-center gap-2">
                                                <div>
                                                  <CustomUserAvatar
                                                    avatarUrl={
                                                      item.user?.avatar || ''
                                                    }
                                                    avatarColor={
                                                      item?.user.avatarColor ||
                                                      ''
                                                    }
                                                    size={30}
                                                  />
                                                </div>
                                                <span className="inline-block text-black  ml-3 max-w-[180px] overflow-hidden whitespace-nowrap text-ellipsis">
                                                  {item.user.fullName}
                                                </span>
                                              </div>
                                              <span className="text-black">
                                                {item.percent}%
                                              </span>
                                            </li>
                                          );
                                        },
                                      )}
                                  </ul>
                                </div>

                                <div
                                  className={`${indexMerge === item.mergedItems.length - 1 && 'hidden'} px-5 w-full my-5  border-b border-[#D2DBE1]`}></div>
                              </div>
                            );
                          })}
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center gap-1 px-5">
                          <p className="bg-[#F9EAEA] w-[57px] h-[18px] text-[#E95062] rounded-sm text-xs font-medium flex items-center justify-center">
                            比較期間
                          </p>
                          <div className="text-[#77858F] text-sm  font-normal flex items-center gap-[1px]">
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
                        <div className="flex items-center gap-1 mt-[10px] px-5">
                          <div
                            style={{
                              backgroundColor: item.color,
                            }}
                            className="w-3 h-3 rounded-full flex-shrink-0"></div>
                          <span className="truncate max-w-[180px] font-bold text-base text-black">
                            {item.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-[10px] font-normal text-base mt-[10px] px-5">
                          <span className="text-black">{item.percentage}%</span>
                          <span className="text-black">
                            {item.totalDuration &&
                              formatTimeToJapanese(item.totalDuration)}
                          </span>
                        </div>
                        <div className="max-h-[250px] overflow-y-auto px-5">
                          <ul>
                            {!isAllTeam &&
                              item.optionData.map((item, index) => (
                                <li
                                  key={index}
                                  className="break-all text-start flex items-center justify-between gap-2 line-clamp-3 text-[#77858F] text-sm font-normal">
                                  <div className="flex items-center w-fit">
                                    <CustomUserAvatar
                                      avatarUrl={item?.avatarUrl || ''}
                                      avatarColor={item?.avatarColor || ''}
                                      size={30}
                                    />
                                    <span className="relative ml-3 max-w-[160px] truncate top-[-3px]">
                                      {' '}
                                      {item.label}
                                    </span>
                                  </div>
                                  <span>{item.percent}%</span>
                                </li>
                              ))}
                            {isAllTeam &&
                              item.optionData.map((item, index) => (
                                <li
                                  key={index}
                                  className="break-all mt-1 text-start flex items-center justify-between gap-2 line-clamp-3 text-[#77858F] text-sm font-normal">
                                  <div className="flex items-center w-fit">
                                    <span className="relative max-w-[160px] truncate">
                                      {' '}
                                      {item.label}
                                    </span>
                                  </div>
                                </li>
                              ))}
                          </ul>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="w-full h-full bg-[#EBF1F7] flex items-center justify-center rounded-[4px]">
                {showNoDataText && (
                  <span className="text-sm text-[#77858F]">
                    データがありません
                  </span>
                )}
              </div>
            )}
          </div>
          <div className={`mt-[14px] ${!isTag && 'flex justify-between'}`}>
            <div className="flex items-center gap-1">
              <p className="bg-[#F9EAEA] w-[30px] h-[18px] text-[#E95062] rounded-sm text-xs font-medium flex items-center justify-center">
                比較
              </p>
              <div className="text-[#77858F] text-sm  font-normal flex items-center gap-[2px]">
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

export default PercentageBarCompareTeam;
