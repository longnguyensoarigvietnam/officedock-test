import React, { useState } from 'react';

import CustomUserAvatar from '@components/common/AvatarIcon/CustomUserAvatar';
import ImageRound from '@components/common/ImageRound';

import { OptionDropdownType } from '@interfaces/common';
import { UserListStatisticType } from '@interfaces/statistic';
import {
  formatShowStatisticTask,
  formatTimeToJapanese,
  getJapaneseDayName,
} from '@utils/date';

type ProgressDataType = {
  id: number;
  label: string;
  value: number;
  color: string;
  duration: string;
  optionData: UserListStatisticType[];
  mergedItems?: ProgressDataType[];
};

interface ProgressBarProps {
  item: ProgressDataType;
  itemCompare?: ProgressDataType;
  classProgressClass?: string;
  classProgressUserClass?: string;

  className?: string;
  startDate?: Date;
  endDate?: Date | null;
  startDateCompare?: Date;
  endDateCompare?: Date | null;
  handleClickTooltip: (id: number | null) => void;
  handleClickChart?: (data: OptionDropdownType) => void;
}
type UserCompareItem = {
  user: {
    id: number;
    fullName: string;
    avatarColor: string;
    avatar: string;
  };
  percent: string | number;
  duration: string;
};

type UserCompareRow = {
  userId: number;
  user: UserCompareItem;
  userCompare: UserCompareItem;
};

function buildUserCompareData(
  item: ProgressDataType,
  itemCompare?: ProgressDataType,
): UserCompareRow[] {
  const allUserIds = new Set<number>();

  item.optionData.forEach((u) => allUserIds.add(u.user.id));
  itemCompare?.optionData.forEach((u) => allUserIds.add(u.user.id));

  return Array.from(allUserIds).map((userId) => {
    const userA = item.optionData.find((u) => u.user.id === userId);
    const userB = itemCompare?.optionData.find((u) => u.user.id === userId);

    return {
      userId,
      user: userA
        ? {
            user: userA.user,
            percent: `${userA.percent}%`,
            duration: userA.duration,
          }
        : {
            user: userB!.user,
            percent: 0,
            duration: '-',
          },
      userCompare: userB
        ? {
            user: userB.user,
            percent: `${userB.percent}%`,
            duration: userB.duration,
          }
        : {
            user: userA!.user,
            percent: 0,
            duration: '-',
          },
    };
  });
}

const ProgressBarTeamStatisticCompare = ({
  item,
  itemCompare,
  className,
  classProgressClass,
  classProgressUserClass,
  startDate,
  endDate,
  startDateCompare,
  endDateCompare,
  handleClickChart,
}: ProgressBarProps) => {
  const [isExtendUser, setExtendUser] = useState(true);

  const userCompareRows = buildUserCompareData(item, itemCompare);

  return (
    <>
      <div className={`font-medium text-sm text-black ${className}`}>
        {/* Item */}
        <div>
          <div className="mb-[10px]">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium truncate max-w-40">
                {item.label}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium truncate max-w-24">
                  {item.duration && formatTimeToJapanese(item.duration)}
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
          </div>
          <div
            className={`group w-full relative h-4 bg-gray-300 ${classProgressClass}`}>
            <div
              className="h-full transition-all duration-500 rounded-[4px]"
              style={{
                width: `${item.value}%`,
                backgroundColor: item.color,
              }}
              onClick={() => {
                handleClickChart &&
                  handleClickChart({
                    label: item.label,
                    value: item.id || '',
                  });
              }}></div>
            {item.value > 0 && (
              <div className="absolute -top-[25%] left-[40%] w-[288px] rounded-md py-5 bg-white hidden  group-hover:block group-hover:pointer-events-auto transition-opacity duration-300 shadow-lg z-10">
                {item.id != -1 ? (
                  <div>
                    {startDate && endDate && (
                      <div className="flex items-center mb-3 px-5 gap-1">
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
                    )}
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
                    <div className="flex items-center gap-[10px] font-normal text-sm mt-[10px] mb-2 px-5">
                      <span>{item.value}%</span>
                      <span>
                        {item.duration && formatTimeToJapanese(item.duration)}
                      </span>
                    </div>
                    <div className="max-h-[250px]  overflow-y-auto px-5">
                      <ul>
                        {item.optionData.map((user, index) => (
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
                      {item.mergedItems &&
                        item.mergedItems?.length > 0 &&
                        item.mergedItems.map((mergeItem, index) => {
                          return (
                            <div key={index}>
                              <div className="flex items-center gap-1 px-5">
                                <div
                                  style={{
                                    backgroundColor: mergeItem.color,
                                  }}
                                  className="w-3 h-3"></div>
                                <span className="truncate max-w-[calc(100%_-_20px)] font-bold text-[16px]">
                                  {mergeItem.label}
                                </span>
                              </div>
                              <div className="flex items-center gap-[10px] font-normal text-sm my-2 px-5">
                                <span>{mergeItem.value}%</span>
                                <span>
                                  {mergeItem.duration &&
                                    formatTimeToJapanese(mergeItem.duration)}
                                </span>
                              </div>
                              <div
                                className={`max-h-[250px] overflow-y-auto px-5`}>
                                <ul>
                                  {mergeItem.optionData.map(
                                    (user, userIndex) => (
                                      <li
                                        key={userIndex}
                                        className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                          <div>
                                            <CustomUserAvatar
                                              avatarUrl={
                                                user.user?.avatar || ''
                                              }
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
                                    ),
                                  )}
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
        {/* Item Compare */}
        <div className="mt-[6px]">
          <div
            className={`group w-full relative h-4 bg-gray-300 ${classProgressClass}`}>
            <div
              className="h-full transition-all duration-500 rounded-[4px]"
              style={{
                width: `${itemCompare?.value}%`,
                backgroundColor: itemCompare?.color,
              }}
              onClick={() => {
                handleClickChart &&
                  handleClickChart({
                    label: itemCompare?.label || '',
                    value: itemCompare?.id || '',
                  });
              }}></div>
            {itemCompare && itemCompare?.value > 0 && (
              <div className="absolute -top-[25%] left-[40%] w-[250px] rounded-md py-5 bg-white hidden  group-hover:block group-hover:pointer-events-auto transition-opacity duration-300 shadow-lg z-10">
                {itemCompare.id != -1 ? (
                  <div>
                    {startDateCompare && endDateCompare && (
                      <div className="flex items-center mb-3 px-5">
                        <p className="bg-[#F9EAEA] w-[57px] h-[18px] text-[#C32E2E] rounded-sm text-xs font-medium flex items-center justify-center">
                          比較期間
                        </p>
                        <div className="text-black text-xs font-normal flex items-center gap-[1px]">
                          <p>
                            {startDateCompare &&
                              formatShowStatisticTask(startDateCompare)}
                            ({getJapaneseDayName(String(startDate))})
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
                    <div className="flex items-center gap-1 px-5">
                      <div
                        style={{
                          backgroundColor: itemCompare.color,
                        }}
                        className="w-3 h-3"></div>
                      <span className="truncate max-w-[calc(100%_-_20px)] font-bold text-[16px]">
                        {itemCompare.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-[10px] font-normal text-sm my-2 px-5">
                      <span>{itemCompare.value}%</span>
                      <span>
                        {itemCompare.duration &&
                          formatTimeToJapanese(itemCompare.duration)}
                      </span>
                    </div>
                    <div className="max-h-[250px]  overflow-y-auto px-5">
                      <ul>
                        {itemCompare.optionData.map((user, index) => (
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
                    {startDateCompare && endDateCompare && (
                      <div className="flex items-center mb-3 px-5">
                        <p className="bg-[#F9EAEA] w-[57px] h-[18px] text-[#C32E2E] rounded-sm text-xs font-medium flex items-center justify-center">
                          比較期間
                        </p>
                        <div className="text-black text-xs font-normal flex items-center gap-[1px]">
                          <p>
                            {startDateCompare &&
                              formatShowStatisticTask(startDateCompare)}
                            ({getJapaneseDayName(String(startDate))})
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
                    <div className="max-h-[450px] overflow-y-auto">
                      {itemCompare.mergedItems &&
                        itemCompare.mergedItems?.length > 0 &&
                        itemCompare.mergedItems.map((itemUser, index) => {
                          return (
                            <div key={index}>
                              <div className="flex items-center gap-1 px-5">
                                <div
                                  style={{
                                    backgroundColor: itemUser.color,
                                  }}
                                  className="w-3 h-3"></div>
                                <span className="truncate max-w-[calc(100%_-_20px)] font-bold text-[16px]">
                                  {itemUser.label}
                                </span>
                              </div>
                              <div className="flex items-center gap-[10px] font-normal text-sm my-2 px-5">
                                <span>{itemUser.value}%</span>
                                <span>
                                  {itemUser.duration &&
                                    formatTimeToJapanese(itemUser.duration)}
                                </span>
                              </div>
                              <div
                                className={`max-h-[250px] overflow-y-auto px-5`}>
                                <ul>
                                  {itemUser.optionData.map(
                                    (user, userIndex) => (
                                      <li
                                        key={userIndex}
                                        className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                          <div>
                                            <CustomUserAvatar
                                              avatarUrl={
                                                user.user?.avatar || ''
                                              }
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
                                    ),
                                  )}
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
      </div>
      {isExtendUser &&
        userCompareRows.map((item, index) => (
          <div
            key={index}
            className={`font-medium text-sm text-black ${className}`}>
            {/* user item */}
            <div>
              <div className="mb-[10px]">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <CustomUserAvatar
                      avatarUrl={item.user.user.avatar || ''}
                      avatarColor={item.user.user.avatarColor || ''}
                      size={30}
                    />
                    <span className="text-sm font-medium truncate max-w-40">
                      {item.user.user.fullName}
                    </span>
                  </div>
                  <span className="text-sm font-medium truncate max-w-24">
                    {item.user.duration &&
                      formatTimeToJapanese(item.user.duration)}
                  </span>
                </div>
              </div>
              <div
                className={`w-full relative h-[10px] bg-gray-300 rounded-[4px] overflow-hidden ${classProgressUserClass}`}>
                <div
                  className="h-full transition-all duration-500 "
                  style={{
                    width: `${item.user.percent}%`,
                    backgroundColor: item.user.user.avatarColor,
                  }}></div>
              </div>
            </div>
            {/* user item compare */}
            <div className="mt-[6px]">
              <div
                className={`w-full relative h-[10px] bg-gray-300 rounded-[4px] overflow-hidden ${classProgressUserClass}`}>
                <div
                  className="h-full transition-all duration-500 "
                  style={{
                    width: `${item.userCompare.percent}%`,
                    backgroundColor: item.userCompare.user.avatarColor,
                  }}></div>
              </div>
            </div>
          </div>
        ))}
    </>
  );
};

export default ProgressBarTeamStatisticCompare;
