import React from 'react';

import {
  formatShowStatisticTask,
  formatTimeToJapanese,
  getJapaneseDayName,
} from '@utils/date';
import { DataPercentCompareType } from '@interfaces/common';
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
  handleClickTooltip: (id: number | null, isCompare: boolean) => void;
  handleClickChart: (data: number) => void;
}

const PercentageBarCompareTeam = ({
  data,
  dataCompare,
  startDate,
  endDate,
  isLast = false,
  isTag = false,
  startDateCompare,
  endDateCompare,
  totalDuration,
  totalDurationCompare,
  isLoading,
  isLoadingCompare,
  handleClickChart,
}: Props) => {
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
              <p className="bg-[#EBF1F7]  w-[30px] h-[18px] text-[#0068B6] rounded-sm text-xs font-medium flex items-center justify-center">
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
            className={`${isTag ? 'w-[220px]' : 'w-[280px]'} mt-[14px]  h-[100px] flex`}>
            {data.length > 0 ? (
              data.map((item, index) => (
                <div
                  key={index}
                  onClick={() => {
                    if (item.id !== -1) {
                      handleClickChart(item.id);
                    }
                  }}
                  className="flex group border-l border-white relative flex-col justify-center items-center text-white text-center py-2"
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
                    className={`absolute top-0 ${isLast ? 'left-[-100px]' : 'left-[70%]'}  w-[288px]  rounded-md py-5 bg-white hidden  group-hover:block group-hover:pointer-events-auto transition-opacity duration-300 shadow-lg z-10`}>
                    {item.mergedItems.length > 0 ? (
                      <>
                        <p className="text-xs text-start font-medium text-[#77858F] mb-5 px-5">
                          その他
                        </p>

                        {item.mergedItems.map((mergeItem, indexMerge) => {
                          return (
                            <div key={mergeItem.categoryId}>
                              <div className="flex items-center gap-1 px-5">
                                <div
                                  style={{
                                    backgroundColor: mergeItem.categoryColor,
                                  }}
                                  className="w-3 h-3"></div>
                                <span className="truncate max-w-[180px] font-bold text-base text-black">
                                  {mergeItem.categoryName || mergeItem.tagName}
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
                                    mergeItem.users.map(
                                      (itemMer, indexMerge) => {
                                        return (
                                          <li
                                            key={indexMerge}
                                            className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                              <div>
                                                <CustomUserAvatar
                                                  avatarUrl={
                                                    itemMer.user?.avatar || ''
                                                  }
                                                  avatarColor={
                                                    itemMer.user?.avatarColor ||
                                                    ''
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
                      </>
                    ) : (
                      <>
                        <div className="flex items-center gap-1 px-5">
                          <p className="bg-[#EBF1F7] w-[57px] h-[18px] text-[#0068B6] rounded-sm text-xs font-medium flex items-center justify-center">
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
                            className="w-3 h-3"></div>
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
                            {item.optionData.map((itemOption, index) => (
                              <li
                                key={index}
                                className="break-all text-start flex items-center justify-between gap-2 line-clamp-3 text-[#77858F] text-sm font-normal mb-2">
                                <div className="flex items-center w-fit">
                                  <CustomUserAvatar
                                    avatarUrl={itemOption?.avatarUrl || ''}
                                    avatarColor={itemOption?.avatarColor || ''}
                                    size={30}
                                  />
                                  <span className="relative ml-3 max-w-[180px] truncate top-[-3px]">
                                    {' '}
                                    {itemOption.label}
                                  </span>
                                </div>
                                <span>{itemOption.percent}%</span>
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
              <div className="w-full h-full bg-[#EBF1F7] px-5"></div>
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
            className={`${isTag ? 'w-[220px]' : 'w-[280px]'} flex  h-[100px] mt-[30px]`}>
            {dataCompare.length > 0 ? (
              dataCompare.map((item, index) => (
                <div
                  key={index}
                  onClick={() => {
                    if (item.id !== -1) {
                      handleClickChart(item.id);
                    }
                  }}
                  className="flex relative border-l border-white group flex-col justify-center items-center text-white text-center py-2"
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
                    className={`absolute top-0 ${isLast ? 'left-[-100px]' : 'left-[70%]'}  w-[288px]  rounded-md py-5 bg-white hidden  group-hover:block group-hover:pointer-events-auto transition-opacity duration-300 shadow-lg z-10`}>
                    {item.mergedItems.length > 0 ? (
                      <>
                        <p className="text-xs text-start font-medium text-[#77858F] mb-5 px-5">
                          その他
                        </p>

                        {item.mergedItems.map((mergeItem, indexMerge) => {
                          return (
                            <div key={mergeItem.categoryId}>
                              <div className="flex items-center gap-1 px-5">
                                <div
                                  style={{
                                    backgroundColor: mergeItem.categoryColor,
                                  }}
                                  className="w-3 h-3"></div>
                                <span className="truncate max-w-[180px] font-bold text-base text-black">
                                  {mergeItem.categoryName}
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
                                    mergeItem.users.map((item, index) => {
                                      return (
                                        <li
                                          key={index}
                                          className="flex items-center justify-between mb-2">
                                          <div className="flex items-center gap-2">
                                            <div>
                                              <CustomUserAvatar
                                                avatarUrl={
                                                  item.user?.avatar || ''
                                                }
                                                avatarColor={
                                                  item?.user.avatarColor || ''
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
                                    })}
                                </ul>
                              </div>

                              <div
                                className={`${indexMerge === item.mergedItems.length - 1 && 'hidden'} px-5 w-full my-5  border-b border-[#D2DBE1]`}></div>
                            </div>
                          );
                        })}
                      </>
                    ) : (
                      <>
                        <div className="flex items-center gap-1 px-5">
                          <p className="bg-[#F9EAEA] w-[57px] h-[18px] text-[#C32E2E] rounded-sm text-xs font-medium flex items-center justify-center">
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
                            className="w-3 h-3"></div>
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
                            {item.optionData.map((item, index) => (
                              <li
                                key={index}
                                className="break-all text-start flex items-center justify-between gap-2 line-clamp-3 text-[#77858F] text-sm font-normal">
                                <div className="flex items-center w-fit">
                                  <CustomUserAvatar
                                    avatarUrl={item?.avatarUrl || ''}
                                    avatarColor={item?.avatarColor || ''}
                                    size={30}
                                  />
                                  <span className="relative ml-3 max-w-[180px] truncate top-[-3px]">
                                    {' '}
                                    {item.label}
                                  </span>
                                </div>
                                <span>{item.percent}%</span>
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
              <div className="w-full h-full bg-[#EBF1F7]"></div>
            )}
          </div>
          <div className={`mt-[14px] ${!isTag && 'flex justify-between'}`}>
            <div className="flex items-center gap-1">
              <p className="bg-[#F9EAEA] w-[30px] h-[18px] text-[#C32E2E] rounded-sm text-xs font-medium flex items-center justify-center">
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
