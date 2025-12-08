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

type Props = {
  cate: {
    color: string;
    id: number;
    label: string;
    value: number;
    duration: string;
    optionData: UserListStatisticType[];
    organizationId?: string;
  };
  showInfo: boolean;
  className?: string;
  startDate?: Date;
  endDate?: Date | null;
  classProgressClass?: string;
  classProgressUserClass?: string;
  handleClickChart?: (data: OptionDropdownType) => void;
  handleClickTooltip: ({
    userId,
    tagId,
    duration,
    organizationId,
  }: {
    userId: number;
    tagId: number;
    duration: string;
    organizationId?: string;
  }) => void;
};

const DetailProgressData = ({
  cate,
  showInfo,
  className,
  startDate,
  endDate,
  classProgressClass,
  classProgressUserClass,
  handleClickChart,
  handleClickTooltip,
}: Props) => {
  const [isExtendUser, setExtendUser] = useState(false);

  return (
    <>
      <div className="mb-[10px]">
        {showInfo && (
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium truncate max-w-40">
              {cate.label}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium truncate max-w-24">
                {cate.duration && formatTimeToJapanese(cate.duration)}
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
        className={`group w-full !h-[12px] relative  bg-[#EBF1F7] ${classProgressClass}`}>
        <div
          className="h-full transition-all duration-500 rounded-[4px]"
          style={{
            width: `${cate.value}%`,
            backgroundColor: cate.color,
          }}
          onClick={() => {
            handleClickChart &&
              handleClickChart({
                label: cate.label,
                value: cate.id || '',
              });
          }}></div>
        <div className="absolute -top-[25%] left-[40%] w-[250px] rounded-md py-5 bg-white hidden  group-hover:block group-hover:pointer-events-auto transition-opacity duration-300 shadow-lg z-10">
          <div>
            <div className="flex items-center gap-1 px-5">
              <div
                style={{
                  backgroundColor: cate.color,
                }}
                className="w-3 h-3"></div>
              <span className="truncate max-w-[calc(100%_-_20px)] font-bold text-[16px]">
                {cate.label}
              </span>
            </div>
            <div className="flex items-center gap-[10px] font-normal text-sm my-2 px-5">
              <span>{cate.value}%</span>
              <span>
                {cate.duration && formatTimeToJapanese(cate.duration)}
              </span>
            </div>
            <div className="max-h-[250px]  overflow-y-auto px-5">
              <ul>
                {cate.optionData.map((user, index) => (
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
        </div>
      </div>
      {isExtendUser &&
        cate.optionData.map((item, index) => (
          <div
            key={index}
            className={`font-medium mt-3 text-sm text-black ${className}`}>
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
                    {item.duration && formatTimeToJapanese(item.duration)}
                  </span>
                </div>
              )}
            </div>
            <div
              className={`w-full group relative h-[10px] bg-[#EBF1F7] ${classProgressUserClass}`}>
              <div
                className="h-full transition-all duration-500"
                style={{
                  width: `${item.percent}%`,
                  backgroundColor: cate.color,
                }}></div>
              {/*  Hover user compare */}
              <div className="absolute -top-[25%] left-[40%] w-[288px] rounded-md p-5 bg-white hidden  group-hover:block group-hover:pointer-events-auto transition-opacity duration-300 shadow-lg z-10">
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
                <div>
                  {startDate && endDate && (
                    <div className="flex items-center my-4 gap-1">
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
                      {cate.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-[10px] font-normal text-base mt-[10px] mb-2">
                    <span>{item.percent}%</span>
                    <span>
                      {item.duration && formatTimeToJapanese(item.duration)}
                    </span>
                  </div>
                  {/* Task of user */}
                  <div className="flex flex-col gap-1">
                    {item.tasks.map((taskUser) => (
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
                          userId: item.user.id,
                          tagId: cate.id,
                          duration: item.duration,
                          organizationId: cate.organizationId,
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
        ))}
    </>
  );
};

export default DetailProgressData;
