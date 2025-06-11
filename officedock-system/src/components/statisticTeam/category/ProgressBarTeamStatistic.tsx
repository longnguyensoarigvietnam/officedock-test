import CustomUserAvatar from '@components/common/AvatarIcon/CustomUserAvatar';
import ImageRound from '@components/common/ImageRound';
import { OptionDropdownType } from '@interfaces/common';
import { UserListStatisticType } from '@interfaces/statistic';
import {
  formatShowStatisticTask,
  formatTimeToJapanese,
  getJapaneseDayName,
} from '@utils/date';
import React, { useState } from 'react';

interface ProgressBarProps {
  label: string;
  value: number;
  id: number;
  duration: string;
  maxValue?: number;
  optionData: UserListStatisticType[];
  mergedItems?: {
    color: string;
    id: number;
    label: string;
    value: number;
    duration: string;
    optionData: UserListStatisticType[];
  }[];
  color?: string;
  classProgressClass?: string;
  classProgressUserClass?: string;
  className?: string;
  showInfo?: boolean;
  startDate?: Date;
  endDate?: Date | null;
  handleClickChart?: (data: OptionDropdownType) => void;
}

const ProgressBarTeamStatistic = ({
  id,
  label,
  value,
  duration,
  maxValue = 100,
  color = '#007bff',
  className,
  classProgressClass,
  classProgressUserClass,
  optionData,
  mergedItems,
  showInfo = true,
  startDate,
  endDate,
  handleClickChart,
}: ProgressBarProps) => {
  const [isExtendUser, setExtendUser] = useState(true);
  const percentage = Math.round(Math.min((value / maxValue) * 100, 100));
  return (
    <>
      <div className={`font-medium text-sm text-black ${className}`}>
        <div className="mb-[10px]">
          {showInfo && (
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium truncate max-w-40">
                {label}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium truncate max-w-24">
                  {duration && formatTimeToJapanese(duration)}
                </span>
                <ImageRound
                  src="/icons/extend-calendar.svg"
                  name="Extend calendar"
                  className={`!w-3 !h-3 hover:cursor-pointer ${
                    isExtendUser ? '-rotate-90' : 'rotate-90'
                  }`}
                  onClick={() => {
                    setExtendUser(!isExtendUser);
                  }}
                />
              </div>
            </div>
          )}
        </div>
        <div
          className={`group w-full relative h-4 bg-gray-300 ${classProgressClass}`}>
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
            }}></div>
          {percentage > 0 && (
            <div className="absolute -top-[25%] left-[40%] w-[250px] rounded-md py-5 bg-white hidden  group-hover:block group-hover:pointer-events-auto transition-opacity duration-300 shadow-lg z-10">
              {id != -1 ? (
                <div>
                  {startDate && endDate && (
                    <div className="flex items-center mb-3 px-5">
                      <p className="bg-[#EBF1F7] w-[57px] h-[18px] text-[#0068B6] rounded-sm text-xs font-medium flex items-center justify-center">
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
                  )}
                  <div className="flex items-center gap-1 px-5">
                    <div
                      style={{
                        backgroundColor: color,
                      }}
                      className="w-3 h-3"></div>
                    <span className="truncate max-w-[calc(100%_-_20px)] font-bold text-[16px]">
                      {label}
                    </span>
                  </div>
                  <div className="flex items-center gap-[10px] font-normal text-sm my-2 px-5">
                    <span>{percentage}%</span>
                    <span>{duration && formatTimeToJapanese(duration)}</span>
                  </div>
                  <div className="max-h-[250px]  overflow-y-auto px-5">
                    <ul>
                      {optionData.map((user, index) => (
                        <li
                          key={index}
                          className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div>
                              <CustomUserAvatar
                                avatarUrl={user.user?.avatar || ''}
                                avatarColor={user.user?.avatarColor || ''}
                                size={30}
                                customClassName={`${!user.user?.avatar && '!mt-0'}`}
                              />
                            </div>
                            <span className="inline-block w-[130px] overflow-hidden whitespace-nowrap text-ellipsis">
                              {user.user.fullName}
                            </span>
                          </div>
                          <span>{user.percent}%</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-xs text-start font-medium text-[#77858F] mb-3 px-5">
                    その他
                  </p>
                  {startDate && endDate && (
                    <div className="flex items-center mb-3 px-5">
                      <p className="bg-[#EBF1F7] w-[57px] h-[18px] text-[#0068B6] rounded-sm text-xs font-medium flex items-center justify-center">
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
                  )}
                  <div className="max-h-[450px] overflow-y-auto">
                    {mergedItems &&
                      mergedItems?.length > 0 &&
                      mergedItems.map((item, index) => {
                        return (
                          <div key={index}>
                            <div className="flex items-center gap-1 px-5">
                              <div
                                style={{
                                  backgroundColor: item.color,
                                }}
                                className="w-3 h-3"></div>
                              <span className="truncate max-w-[calc(100%_-_20px)] font-bold text-[16px]">
                                {item.label}
                              </span>
                            </div>
                            <div className="flex items-center gap-[10px] font-normal text-sm my-2 px-5">
                              <span>{item.value}%</span>
                              <span>
                                {item.duration &&
                                  formatTimeToJapanese(item.duration)}
                              </span>
                            </div>
                            <div
                              className={`max-h-[250px] overflow-y-auto px-5`}>
                              <ul>
                                {item.optionData.map((user, userIndex) => (
                                  <li
                                    key={userIndex}
                                    className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                      <div>
                                        <CustomUserAvatar
                                          avatarUrl={user.user?.avatar || ''}
                                          avatarColor={
                                            user.user?.avatarColor || ''
                                          }
                                          size={30}
                                          customClassName={`${!user.user?.avatar && '!mt-0'}`}
                                        />
                                      </div>
                                      <span className="inline-block w-[130px] overflow-hidden whitespace-nowrap text-ellipsis">
                                        {user.user.fullName}
                                      </span>
                                    </div>
                                    <span>{user.percent}%</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
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
      {isExtendUser &&
        optionData.map((item, index) => (
          <div
            key={index}
            className={`font-medium text-sm text-black ${className}`}>
            <div className="mb-[10px]">
              {showInfo && (
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <CustomUserAvatar
                      avatarUrl={item.user.avatar || ''}
                      avatarColor={item.user.avatarColor || ''}
                      size={30}
                    />
                    <span className="text-sm font-medium truncate max-w-40">
                      {item.user.fullName}
                    </span>
                  </div>
                  <span className="text-sm font-medium truncate max-w-24">
                    {duration && formatTimeToJapanese(duration)}
                  </span>
                </div>
              )}
            </div>
            <div
              className={`w-full relative h-[10px] bg-gray-300 ${classProgressUserClass}`}>
              <div
                className="h-full transition-all duration-500 rounded-[4px]"
                style={{
                  width: `${item.percent}%`,
                  backgroundColor: color,
                }}></div>
            </div>
          </div>
        ))}
    </>
  );
};

export default ProgressBarTeamStatistic;
