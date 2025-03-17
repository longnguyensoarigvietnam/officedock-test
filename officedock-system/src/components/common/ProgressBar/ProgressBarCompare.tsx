import React from 'react';

import { formatShowDeadlineTask, formatTimeToJapanese } from '@utils/date';
import { DataPercentCompareType } from '@interfaces/common';
import ImageRound from '../ImageRound';

interface Props {
  data: DataPercentCompareType[];
  dataCompare: DataPercentCompareType[];
  startDate: Date;
  endDate: Date | null;
  startDateCompare: Date;
  endDateCompare: Date | null;
  totalDuration: string;
  totalDurationCompare: string;
  handleClickTooltip: (id: number | null, isCompare: boolean) => void;
}

const PercentageBarCompare = ({
  data,
  dataCompare,
  startDate,
  endDate,
  startDateCompare,
  endDateCompare,
  totalDuration,
  totalDurationCompare,
  handleClickTooltip,
}: Props) => {
  return (
    <div>
      <div className="mb-[14px]">
        <div className="flex items-center ">
          <p className="bg-[#EBF1F7]  w-[30px] h-[18px] text-[#0068B6] rounded-sm text-xs font-medium flex items-center justify-center">
            比較
          </p>
          <div className="text-black text-xs font-normal flex items-center gap-[2px]">
            <p>{startDate && formatShowDeadlineTask(startDate)}</p>~
            <p>{endDate && formatShowDeadlineTask(endDate)}</p>
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
      <div className="w-[280px]  h-[100px] flex">
        {data.length > 0 ? (
          data.map((item, index) => (
            <div
              key={index}
              onClick={() => {
                if (item.id !== -1) {
                  handleClickTooltip(item.id, false);
                }
              }}
              className="flex group relative flex-col justify-center items-center text-white text-center py-2"
              style={{
                width: `${item.percentage * 2.8}px`,
                backgroundColor: item.color,
                margin: '2px',
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
                className="absolute top-0 left-[70%] w-[250px]  rounded-md p-5 bg-white hidden  group-hover:block group-hover:pointer-events-auto transition-opacity duration-300 shadow-lg z-10">
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
                              className="w-3 h-3"></div>
                            <span className="truncate font-bold text-base text-black">
                              {mergeItem.categoryName}
                            </span>
                          </div>
                          <div className="flex items-center gap-[10px] font-normal text-base mt-4">
                            <span className="text-black">
                              {item.percentage}%
                            </span>
                            <span className="text-black">
                              {mergeItem.duration &&
                                formatTimeToJapanese(mergeItem.duration)}
                            </span>
                          </div>
                          <ul>
                            {mergeItem.tasks.map((item, index) => (
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
                                handleClickTooltip(mergeItem.categoryId, false);
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
                          <div
                            className={`${indexMerge === item.mergedItems.length - 1 && 'hidden'} w-full my-5  border-b border-[#D2DBE1]`}></div>
                        </div>
                      );
                    })}
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-1">
                      <div
                        style={{
                          backgroundColor: item.color,
                        }}
                        className="w-3 h-3"></div>
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
                    <div className="flex w-full justify-end mt-3">
                      <div
                        onClick={() => {
                          handleClickTooltip(item.id, false);
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
                  </>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="w-full h-full bg-[#EBF1F7]"></div>
        )}
      </div>
      <div className="w-[280px] flex  h-[100px] mt-[30px]">
        {dataCompare.length > 0 ? (
          dataCompare.map((item, index) => (
            <div
              key={index}
              onClick={() => {
                if (item.id !== -1) {
                  handleClickTooltip(item.id, true);
                }
              }}
              className="flex relative group flex-col justify-center items-center text-white text-center py-2"
              style={{
                width: `${item.percentage * 2.8}px`,
                backgroundColor: item.color,
                margin: '2px',
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
                className="absolute top-0 left-[70%] w-[250px]  rounded-md p-5 bg-white hidden  group-hover:block group-hover:pointer-events-auto transition-opacity duration-300 shadow-lg z-10">
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
                              className="w-3 h-3"></div>
                            <span className="truncate font-bold text-base text-black">
                              {mergeItem.categoryName}
                            </span>
                          </div>
                          <div className="flex items-center gap-[10px] font-normal text-base mt-4">
                            <span className="text-black">
                              {item.percentage}%
                            </span>
                            <span className="text-black">
                              {mergeItem.duration &&
                                formatTimeToJapanese(mergeItem.duration)}
                            </span>
                          </div>
                          <ul>
                            {mergeItem.tasks.map((item, index) => (
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
                                handleClickTooltip(mergeItem.categoryId, false);
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
                          <div
                            className={`${indexMerge === item.mergedItems.length - 1 && 'hidden'} w-full my-5  border-b border-[#D2DBE1]`}></div>
                        </div>
                      );
                    })}
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-1">
                      <div
                        style={{
                          backgroundColor: item.color,
                        }}
                        className="w-3 h-3"></div>
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
                    <div className="flex w-full justify-end mt-3">
                      <div
                        onClick={() => {
                          handleClickTooltip(item.id, false);
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
                  </>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="w-full h-full bg-[#EBF1F7]"></div>
        )}
      </div>
      <div className="flex items-center mt-[14px]">
        <p className="bg-[#F9EAEA] w-[30px] h-[18px] text-[#C32E2E] rounded-sm text-xs font-medium flex items-center justify-center">
          比較
        </p>
        <div className="text-black text-xs font-normal flex items-center gap-[2px]">
          <p>{startDateCompare && formatShowDeadlineTask(startDateCompare)}</p>~
          <p>{endDateCompare && formatShowDeadlineTask(endDateCompare)}</p>
        </div>
      </div>
      {dataCompare.length ? (
        <div className="font-medium text-sm text-black">
          合計 {totalDuration && formatTimeToJapanese(totalDurationCompare)}
        </div>
      ) : (
        <div>-</div>
      )}
    </div>
  );
};

export default PercentageBarCompare;
