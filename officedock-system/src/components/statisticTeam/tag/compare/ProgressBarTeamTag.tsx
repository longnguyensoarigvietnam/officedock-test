import React, { useEffect, useRef, useState } from 'react';

import CustomUserAvatar from '@components/common/AvatarIcon/CustomUserAvatar';
import ImageRound from '@components/common/ImageRound';

import { DEFAULT_TIME_TEXT } from '@constants';

import { OptionDropdownType } from '@interfaces/common';
import { UserListStatisticType } from '@interfaces/statistic';
import {
  formatShowStatisticTask,
  formatTimeToJapanese,
  getJapaneseDayName,
} from '@utils/date';

type ProgressDataType = {
  id: number | string;
  label: string;
  value: number;
  color: string;
  duration: string;
  optionData: UserListStatisticType[];
  mergedItems?: ProgressDataType[];
  organizationId?: string;
};

interface ProgressBarProps {
  isLast?: boolean;
  item: ProgressDataType;
  itemCompare?: ProgressDataType;
  classProgressClass?: string;
  classProgressUserClass?: string;
  organizationId?: string;
  className?: string;
  startDate?: Date;
  endDate?: Date | null;
  startDateCompare?: Date;
  endDateCompare?: Date | null;
  hasHover?: boolean;
  onActionHover?: () => void;
  handleClickTooltip: ({
    userId,
    categoryId,
    isCompare,
    organizationId,
  }: {
    userId: number;
    categoryId: number;
    isCompare?: boolean;
    organizationId?: string;
  }) => void;
  handleClickChart?: (data: OptionDropdownType) => void;
}
type UserCompareItem = {
  user: {
    id: number;
    fullName: string;
    avatarColor: string;
    avatar: string;
  };
  tasks: {
    id: number;
    title: string;
    type: string;
  }[];
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
            tasks: userA.tasks,
            percent: `${userA.percent}`,
            duration: userA.duration,
          }
        : {
            user: userB!.user,
            tasks: [],
            percent: '0',
            duration: DEFAULT_TIME_TEXT,
          },
      userCompare: userB
        ? {
            user: userB.user,
            tasks: userB.tasks,
            percent: `${userB.percent}`,
            duration: userB.duration,
          }
        : {
            user: userA!.user,
            tasks: [],
            percent: '0',
            duration: DEFAULT_TIME_TEXT,
          },
    };
  });
}

const ProgressBarTeamTagCompare = ({
  isLast,
  item,
  itemCompare,
  organizationId,
  className,
  classProgressClass,
  classProgressUserClass,
  startDate,
  endDate,
  startDateCompare,
  endDateCompare,
  hasHover,
  onActionHover,
  handleClickChart,
  handleClickTooltip,
}: ProgressBarProps) => {
  const [isExtendUser, setExtendUser] = useState(false);

  const userCompareRows = buildUserCompareData(item, itemCompare);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isHovering, setHovering] = useState<boolean>(false);
  // user
  const containerUserRef = useRef<HTMLDivElement | null>(null);
  const hoverTimeoutUserRef = useRef<NodeJS.Timeout | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  // Compare
  const containerCompareRef = useRef<HTMLDivElement | null>(null);
  const hoverTimeoutCompareRef = useRef<NodeJS.Timeout | null>(null);
  const [isCompareHovering, setCompareHovering] = useState<boolean>(false);

  // User compare
  const containerUserCompareRef = useRef<HTMLDivElement | null>(null);
  const hoverTimeoutUserCompareRef = useRef<NodeJS.Timeout | null>(null);

  const [hoverUserCompareIndex, setHoverUserCompareIndex] = useState<
    number | null
  >(null);

  useEffect(() => {
    if (hasHover) {
      setHovering(false);
      setCompareHovering(false);
      setHoverIndex(null);
      setHoverUserCompareIndex(null);
    }
  }, [hasHover]);

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
                {item.id !== -1 && (
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
                )}
              </div>
            </div>
          </div>
          <div
            ref={containerRef}
            onMouseLeave={() => {
              // If it really gets out of the whole container
              hoverTimeoutRef.current = setTimeout(() => {
                setHovering(false);
              }, 0);
            }}
            onMouseEnter={() => {
              onActionHover && onActionHover();

              if (hoverTimeoutRef.current)
                clearTimeout(hoverTimeoutRef.current);
              setCompareHovering(false);
              setHoverUserCompareIndex(null);
              setHoverIndex(null);
              setHovering(true);
            }}
            onClick={() => {
              handleClickChart &&
                handleClickChart({
                  label: item.label,
                  value: item.id || '',
                });
            }}
            className={`group w-full relative h-4 bg-[#EBF1F7] ${classProgressClass}`}>
            <div
              className="h-full transition-all duration-500 rounded-[4px]"
              style={{
                width: `${item.value}%`,
                backgroundColor: item.color,
              }}></div>
            <div
              onMouseEnter={() => {
                if (hoverTimeoutRef.current)
                  clearTimeout(hoverTimeoutRef.current);
              }}
              onMouseLeave={(e) => {
                const nextEl = e.relatedTarget as HTMLElement | null;
                const container = containerRef.current;

                if (!container || (nextEl && container.contains(nextEl))) {
                  // Still in the chart area → DO NOT turn off the tooltip
                  return;
                }

                // Exit the chart area → hide the tooltip
                hoverTimeoutRef.current = setTimeout(() => {
                  setHovering(false);
                }, 0);
              }}
              className={`absolute -top-[25%] ${isLast ? 'right-[100%]' : 'left-[100%]'} ${isHovering ? 'block' : 'hidden'} w-[288px] rounded-[14px] py-5 bg-white  pointer-events-auto transition-opacity duration-300 shadow-lg z-10`}>
              {item.id != -1 ? (
                <div>
                  {startDate && endDate && (
                    <div className="flex items-center mb-3 px-5 gap-1">
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
                  <div className="flex items-center gap-1 px-5">
                    <div
                      style={{
                        backgroundColor: item.color,
                      }}
                      className="w-3 h-3 rounded-full"></div>
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
                                className="w-3 h-3 rounded-full"></div>
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
                                {mergeItem.optionData.map((user, userIndex) => (
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
          </div>
        </div>
        {/* Item Compare */}
        <div className="mt-[6px]">
          <div
            ref={containerCompareRef}
            onMouseLeave={() => {
              // If it really gets out of the whole container
              hoverTimeoutCompareRef.current = setTimeout(() => {
                setCompareHovering(false);
              }, 0);
            }}
            onMouseEnter={() => {
              onActionHover && onActionHover();

              if (hoverTimeoutCompareRef.current)
                clearTimeout(hoverTimeoutCompareRef.current);
              setHovering(false);
              setHoverUserCompareIndex(null);
              setHoverIndex(null);
              setCompareHovering(true);
            }}
            onClick={() => {
              handleClickChart &&
                handleClickChart({
                  label: itemCompare?.label || '',
                  value: itemCompare?.id || '',
                });
            }}
            className={`group w-full relative h-4 bg-[#EBF1F7] ${classProgressClass}`}>
            <div
              className="h-full transition-all duration-500 rounded-[4px]"
              style={{
                width: `${itemCompare?.value}%`,
                backgroundColor: itemCompare?.color,
              }}></div>
            {itemCompare && itemCompare?.value > 0 && (
              <div
                onMouseEnter={() => {
                  if (hoverTimeoutCompareRef.current)
                    clearTimeout(hoverTimeoutCompareRef.current);
                }}
                onMouseLeave={(e) => {
                  const nextEl = e.relatedTarget as HTMLElement | null;
                  const container = containerCompareRef.current;

                  if (!container || (nextEl && container.contains(nextEl))) {
                    // Still in the chart area → DO NOT turn off the tooltip
                    return;
                  }

                  // Exit the chart area → hide the tooltip
                  hoverTimeoutCompareRef.current = setTimeout(() => {
                    setHovering(false);
                  }, 0);
                }}
                className={`absolute -top-[25%] ${isLast ? 'right-[100%]' : 'left-[100%]'} w-[250px] ${isCompareHovering ? 'block' : 'hidden'} rounded-[14px] py-5 bg-white pointer-events-auto transition-opacity duration-300 shadow-lg z-10`}>
                {itemCompare.id != -1 ? (
                  <div>
                    {startDateCompare && endDateCompare && (
                      <div className="flex items-center mb-3 px-5">
                        <p className="bg-[#F9EAEA] w-[57px] h-[18px] text-[#E95062] rounded-sm text-xs font-medium flex items-center justify-center">
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
                        className="w-3 h-3 rounded-full"></div>
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
                        <p className="bg-[#F9EAEA] w-[57px] h-[18px] text-[#E95062] rounded-sm text-xs font-medium flex items-center justify-center">
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
                                  className="w-3 h-3 rounded-full"></div>
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
        item.id !== -1 &&
        userCompareRows.map((itemUser, index) => (
          <div
            key={index}
            className={`font-medium text-sm mt-3 text-black ${className}`}>
            {/* user item */}
            <div>
              <div className="mb-[10px]">
                <div className="flex justify-between items-center w-full">
                  <div className="flex items-center gap-2 w-[calc(100%_-_96px)]">
                    <CustomUserAvatar
                      avatarUrl={itemUser.user.user.avatar || ''}
                      avatarColor={itemUser.user.user.avatarColor || ''}
                      size={30}
                    />
                    <span className="text-sm font-medium truncate max-w-[calc(100%_-_30px)]">
                      {itemUser.user.user.fullName}
                    </span>
                  </div>
                  <span className="text-sm font-medium truncate max-w-24">
                    {itemUser.user.duration &&
                      formatTimeToJapanese(itemUser.user.duration)}
                  </span>
                </div>
              </div>
              <div
                className={`w-full group relative h-[10px] bg-[#EBF1F7]${classProgressUserClass}`}>
                <div
                  ref={containerUserRef}
                  onMouseLeave={() => {
                    // If it really gets out of the whole container
                    hoverTimeoutUserRef.current = setTimeout(() => {
                      setHoverIndex(null);
                    }, 1000);
                  }}
                  onMouseEnter={() => {
                    if (hoverTimeoutUserRef.current)
                      clearTimeout(hoverTimeoutUserRef.current);
                    setHovering(false);
                    setCompareHovering(false);
                    setHoverUserCompareIndex(null);
                    setHoverIndex(index);
                  }}
                  className="h-full transition-all duration-500 "
                  style={{
                    width: `${itemUser.user.percent}%`,
                    backgroundColor: itemUser.user.user.avatarColor,
                  }}></div>

                {/*  Hover user */}
                <div
                  className={`absolute -top-[25%] ${isLast ? 'right-[100%]' : 'left-[100%]'} w-[288px] ${hoverIndex === index ? 'block' : 'hidden'} rounded-[14px] p-5 bg-white pointer-events-auto transition-opacity duration-300 shadow-lg z-10`}>
                  <div className="flex items-center gap-2">
                    <CustomUserAvatar
                      avatarUrl={itemUser.user.user.avatar || ''}
                      avatarColor={itemUser.user.user.avatarColor || ''}
                      size={30}
                    />
                    <span className="text-sm font-medium truncate max-w-40">
                      {itemUser.user.user.fullName}
                    </span>
                  </div>
                  <div>
                    {startDate && endDate && (
                      <div className="flex items-center my-4 gap-1">
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
                    <div className="flex items-center gap-1">
                      <span className="truncate max-w-[calc(100%_-_20px)] font-normal text-[16px]">
                        {item.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-[10px] font-normal text-base mt-[10px] mb-2">
                      <span>{itemUser.user.percent}%</span>
                      <span>
                        {itemUser.user.duration &&
                          formatTimeToJapanese(itemUser.user.duration)}
                      </span>
                    </div>
                    {/* Task of user */}
                    <div className="flex flex-col gap-1">
                      {itemUser.user.tasks.map((taskUser) => (
                        <p
                          key={taskUser.id}
                          className="text-sm font-normal text-[#77858F] truncate">
                          {taskUser.title}
                        </p>
                      ))}
                    </div>

                    {/* Handle Modal */}
                    <div className="mt-2  flex items-center justify-end">
                      <button
                        onClick={() =>
                          handleClickTooltip({
                            userId: itemUser.user.user.id,
                            categoryId: item.id as number,
                            organizationId: organizationId,
                          })
                        }
                        className="flex items-center justify-center gap-2 bg-white text-[#77858F] text-xs font-normal h-[34px] rounded-md no-underline hover:cursor-pointer ">
                        <span>タスクを見る</span>
                        <div className="flex items-center justify-center w-[18px] h-[18px] bg-[#EBF1F7] rounded-full text-[#77858F]">
                          <ImageRound
                            src="/icons/right-statistic.svg"
                            className="h-2 w-fit  cursor-pointer relative"
                            name={'redirect'}
                          />
                        </div>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {/* user item compare */}
            <div className="mt-[6px]">
              <div
                className={`w-full group relative h-[10px] bg-[#EBF1F7]   ${classProgressUserClass}`}>
                <div
                  ref={containerUserCompareRef}
                  onMouseLeave={() => {
                    // If it really gets out of the whole container
                    hoverTimeoutUserCompareRef.current = setTimeout(() => {
                      setHoverUserCompareIndex(null);
                    }, 1000);
                  }}
                  onMouseEnter={() => {
                    if (hoverTimeoutUserCompareRef.current)
                      clearTimeout(hoverTimeoutUserCompareRef.current);
                    setHovering(false);
                    setCompareHovering(false);
                    setHoverIndex(null);
                    setHoverUserCompareIndex(index);
                  }}
                  className="h-full transition-all overflow-hidden duration-500 "
                  style={{
                    width: `${itemUser.userCompare.percent}%`,
                    backgroundColor: itemUser.userCompare.user.avatarColor,
                  }}></div>
                {/*  Hover user compare */}
                <div
                  onMouseEnter={() => {
                    if (hoverTimeoutUserCompareRef.current)
                      clearTimeout(hoverTimeoutUserCompareRef.current);
                  }}
                  onMouseLeave={(e) => {
                    const nextEl = e.relatedTarget as HTMLElement | null;
                    const container = containerUserCompareRef.current;

                    if (!container || (nextEl && container.contains(nextEl))) {
                      // Still in the chart area → DO NOT turn off the tooltip
                      return;
                    }

                    // Exit the chart area → hide the tooltip
                    hoverTimeoutUserCompareRef.current = setTimeout(() => {
                      setHoverUserCompareIndex(null);
                    }, 1000);
                  }}
                  className={`absolute -top-[25%] ${isLast ? 'right-[100%]' : 'left-[100%]'} w-[288px] ${hoverUserCompareIndex === index ? 'block' : 'hidden'} rounded-[14px] p-5 bg-white hidden  group-hover:block group-hover:pointer-events-auto transition-opacity duration-300 shadow-lg z-10`}>
                  <div className="flex items-center gap-2">
                    <CustomUserAvatar
                      avatarUrl={itemUser.userCompare.user.avatar || ''}
                      avatarColor={itemUser.userCompare.user.avatarColor || ''}
                      size={30}
                    />
                    <span className="text-sm font-medium truncate max-w-40">
                      {itemUser.userCompare.user.fullName}
                    </span>
                  </div>
                  <div>
                    {startDate && endDate && (
                      <div className="flex items-center my-4 gap-1">
                        <p className="bg-[#F9EAEA] w-[57px] h-[18px] text-[#E95062] rounded-sm text-xs font-medium flex items-center justify-center">
                          比較期間
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
                    <div className="flex items-center gap-1">
                      <span className="truncate max-w-[calc(100%_-_20px)] font-normal text-[16px]">
                        {item.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-[10px] font-normal text-base mt-[10px] mb-2">
                      <span>{itemUser.userCompare.percent}%</span>
                      <span>
                        {itemUser.userCompare.duration &&
                          formatTimeToJapanese(itemUser.userCompare.duration)}
                      </span>
                    </div>
                    {/* Task of user */}
                    <div className="flex flex-col gap-1">
                      {itemUser.userCompare.tasks.map((taskUser) => (
                        <p
                          key={taskUser.id}
                          className="text-sm font-normal text-[#77858F] truncate">
                          {taskUser.title}
                        </p>
                      ))}
                    </div>

                    {/* Handle Modal */}
                    <div className="mt-2  flex items-center justify-end">
                      <button
                        onClick={() =>
                          handleClickTooltip({
                            userId: itemUser.userCompare.user.id,
                            categoryId: item.id as number,
                            isCompare: true,
                            organizationId: organizationId,
                          })
                        }
                        className="flex items-center justify-center gap-2 bg-white text-[#77858F] text-xs font-normal h-[34px] rounded-md no-underline hover:cursor-pointer ">
                        <span>タスクを見る</span>
                        <div className="flex items-center justify-center w-[18px] h-[18px] bg-[#EBF1F7] rounded-full text-[#77858F]">
                          <ImageRound
                            src="/icons/right-statistic.svg"
                            className="h-2 w-fit  cursor-pointer relative"
                            name={'redirect'}
                          />
                        </div>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
    </>
  );
};

export default ProgressBarTeamTagCompare;
