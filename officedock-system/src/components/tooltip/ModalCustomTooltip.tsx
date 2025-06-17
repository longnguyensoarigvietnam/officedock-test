import React from 'react';

import ImageRound from '@components/common/ImageRound';
import CustomUserAvatar from '@components/common/AvatarIcon/CustomUserAvatar';

import { StatisticCategoryInfo } from '@interfaces/statistic';
import { convertToJapaneseTime } from '@utils/date';

type Props = {
  isTeam: boolean;
  tooltipData: {
    x: number;
    y: number;
    value: number;
  };
  labels: string[];
  colors: string[];
  actualValues: string[];
  optionsData: {
    label: string;
    percent?: number;
    avatarColor?: string;
    avatarUrl?: string;
    mergedItems?: StatisticCategoryInfo[];
  }[][];
  data: number[];
  mergedItems: StatisticCategoryInfo[];
  listIdData: number[];
  handleClickTooltip: ((id: number | null) => void) | undefined;
};

const ModalCustomTooltip = ({
  isTeam,
  tooltipData,
  labels,
  colors,
  data,
  optionsData,
  actualValues,
  listIdData,
  mergedItems,
  handleClickTooltip,
}: Props) => {
  const label = labels[tooltipData.value];
  const color = colors[tooltipData.value];
  const percent = data[tooltipData.value];
  const id = listIdData[tooltipData.value];

  const option = optionsData[tooltipData.value];
  const actualValue = actualValues[tooltipData.value];

  return (
    <div className="py-5">
      {id == -1 ? (
        <div>
          <p className="text-xs font-medium text-[#77858F] mb-5 px-5">その他</p>
          {mergedItems.map((item, index) => {
            return (
              <div key={item.categoryId}>
                <div className="w-[250px] h-fit ">
                  <div className="px-5">
                    <div className="flex items-center gap-2 mb-[14px]">
                      <div
                        style={{
                          backgroundColor: item.categoryColor,
                        }}
                        className="w-3 h-3 rounded-sm"></div>
                      <span className="font-bold max-w-[205px] line-clamp-3">
                        {item.categoryName || item.tagName}
                      </span>
                    </div>
                    <div className="flex gap-2 text-base font-normal">
                      <span>{item.percent}% </span>
                      <span>{convertToJapaneseTime(item.duration)}</span>
                    </div>
                  </div>
                  <div className=" max-h-[250px]  overflow-y-auto px-5">
                    <ul className="font-normal mt-4 text-[#77858F] overflow-hidden break-words line-clamp-4">
                      {isTeam ? (
                        item &&
                        item.users &&
                        item.users.map((user) => {
                          return (
                            <li
                              key={user.user.id}
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
                          );
                        })
                      ) : (
                        <div></div>
                      )}
                    </ul>
                  </div>
                  {!isTeam && (
                    <div className="mt-4 px-5 flex items-center justify-end">
                      <button
                        onClick={() =>
                          handleClickTooltip &&
                          handleClickTooltip(item.categoryId)
                        }
                        className="flex items-center justify-center gap-2 bg-white text-[#77858F] text-xs font-normal h-[34px] rounded-md no-underline ">
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
                  )}
                </div>
                <div
                  className={`${index === mergedItems.length - 1 && 'hidden'} w-full my-5  border-b border-[#D2DBE1]`}></div>
              </div>
            );
          })}
        </div>
      ) : (
        <>
          <div className="w-[250px] h-fit">
            <div className="px-5">
              <div className="flex items-center gap-2 mb-[14px]">
                <div
                  style={{
                    backgroundColor: color,
                  }}
                  className="w-3 h-3 rounded-sm"></div>
                <span className="font-bold max-w-[224px] line-clamp-3">
                  {label}
                </span>
              </div>
              <div className="flex gap-2 text-base font-normal">
                <span>{percent}% </span>
                <span>{actualValue}</span>
              </div>
            </div>
            <div className="max-h-[250px]  overflow-y-auto px-5">
              <div className="font-normal  mt-4 text-[#77858F] overflow-hidden break-words line-clamp-4">
                {isTeam
                  ? option &&
                    option.map((opt) => {
                      return (
                        <div
                          key={opt.label}
                          className="flex w-full max-w-[150px] items-center justify-between mb-2 ">
                          <div className="flex items-center gap-2">
                            <div>
                              <CustomUserAvatar
                                avatarUrl={opt?.avatarUrl || ''}
                                avatarColor={opt?.avatarColor || ''}
                                size={30}
                              />
                            </div>
                            <span className="inline-block w-[130px] overflow-hidden whitespace-nowrap text-ellipsis">
                              {opt.label}
                            </span>
                          </div>
                          <div className="flex-shrink-0">{opt.percent}%</div>
                        </div>
                      );
                    })
                  : option &&
                    option.map((opt) => <li key={opt.label}>{opt.label}</li>)}
              </div>
            </div>
            {!isTeam && (
              <div className="mt-4 px-5 flex items-center justify-end">
                <button
                  onClick={() => handleClickTooltip && handleClickTooltip(id)}
                  className="flex items-center justify-center gap-2 bg-white text-[#77858F] text-xs font-normal h-[34px] rounded-md no-underline ">
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
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default ModalCustomTooltip;
