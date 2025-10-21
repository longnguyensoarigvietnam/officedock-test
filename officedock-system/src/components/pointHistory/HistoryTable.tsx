'use client';

import { useEffect, useRef } from 'react';
import {
  FetchNextPageOptions,
  InfiniteQueryObserverResult,
} from '@tanstack/react-query';

import RowSkeleton from '@components/skeleton/RowSkeleton';
import ImageRound from '@components/common/ImageRound';

import { ResponseError } from '@interfaces/response';
import { HistoryPoint } from '@interfaces/history';

import { formatShowDateJapanese } from '@utils/date';

import { PointHistoryActiveTab } from '@constants/enums';

interface HistoryTableProps {
  activeTab: PointHistoryActiveTab
  historyList: HistoryPoint[];
  hasNextPage: boolean | undefined;
  isFetchingNextPage: boolean;
  isLoadingList: boolean;
  fetchNextPage: (options?: FetchNextPageOptions | undefined) => Promise<
    InfiniteQueryObserverResult<
      {
        currentUrl: string;
        count: number;
        numPages: number;
        results: HistoryPoint[];
        hasNext?: boolean;
        totalDuration?: string;
        next?: string | null;
        previous?: string | null;
      },
      ResponseError<any>
    >
  >;
}

export const HistoryTable = ({
  activeTab,
  historyList,
  hasNextPage,
  isFetchingNextPage,
  isLoadingList,
  fetchNextPage,
}: HistoryTableProps) => {
  const resultsContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let debounceTimer: NodeJS.Timeout;

    const handleScroll = () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        const resultsContainer = resultsContainerRef.current;
        if (
          resultsContainer &&
          hasNextPage &&
          !isFetchingNextPage &&
          Math.round(
            resultsContainer.clientHeight +
              Math.abs(resultsContainer.scrollTop),
          ) >= Math.round(0.9 * resultsContainer.scrollHeight)
        ) {
          fetchNextPage();
        }
      }, 200);
    };

    const resultsContainer = resultsContainerRef.current;

    if (resultsContainer) {
      resultsContainer.addEventListener('scroll', handleScroll);
    }

    return () => {
      if (resultsContainer) {
        resultsContainer.removeEventListener('scroll', handleScroll);
      }
      clearTimeout(debounceTimer);
    };
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);
  return (
    <div
      style={{
        background: 'rgba(53, 153, 216, 0.8)',
        boxShadow: '0px 4px 10px 0px #0000000D',
      }}
      className={`w-[720px] h-[calc(100%_-_60px)] p-[30px] absolute top-1/2 -translate-y-1/2 font-medium text-white border border-white rounded-3xl`}>
      {/* Title */}
      <div className="flex items-center gap-3 mb-[25px]">
        <ImageRound
          name="Badge icon"
          src={
            activeTab == PointHistoryActiveTab.COIN
              ? '/icons/badge.svg'
              : '/icons/pearl.svg'
          }
          className={`w-[30px] h-[30px]`}
        />
        <p className="text-[18px]">ポイント履歴</p>
      </div>
      {/* Header */}
      <div className="h-fit flex items-center  text-white text-xs font-medium">
        <div className="w-[134px]">日付</div>
        <div className="w-[130px] min-w-[130px] flex justify-between items-center">
          <div className="h-[9px] w-[1px] border-l border-[#D2DBE1]"></div>
          <div className="flex-grow px-5">使用</div>
          <div className="h-[9px] w-[1px] border-l border-[#D2DBE1]"></div>
        </div>
        <div className="w-[130px] min-w-[130px] flex justify-between items-center">
          <div className="flex-grow px-5">獲得</div>
          <div className="h-[9px] w-[1px] border-l border-[#D2DBE1]"></div>
        </div>
        <div className="w-[130px] min-w-[130px] flex justify-between items-center">
          <div className="flex-grow px-5">差引残高</div>
          <div className="h-[9px] w-[1px] border-l border-[#D2DBE1]"></div>
        </div>
        <div className="flex-grow px-5">メモ</div>
      </div>
      {/* Table */}
      <div
        ref={resultsContainerRef}
        className={`overflow-y-auto overflow-x-hidden customized-scrollbar h-fit max-h-[calc(100%_-_80px)] w-full mt-3 flex flex-col gap-[2px] ${!isLoadingList && !historyList.length ? 'h-full' : ''}`}>
        {isLoadingList ? (
          <div>
            <RowSkeleton
              numberOfRows={10}
              className="h-[80px] !rounded-[14px]"
            />
          </div>
        ) : (
          <div className="">
            {historyList.map((history, index) => {
              return (
                <>
                  <div
                    key={index}
                    className={`relative mb-[2px] hover:cursor-pointer ${index == 0 && 'rounded-t-[14px]'} ${index == historyList.length - 1 && 'rounded-b-[14px]'} bg-white flex items-center text-black font-normal py-[14px]`}>
                    {/* Date column */}
                    <div className="w-[134px] text-xs pl-5 py-[11px] text-nowrap leading-none">
                      <p>{formatShowDateJapanese(`${history.createdAt}`)}</p>
                    </div>
                    <div className="w-[1px] self-stretch bg-[#D2DBE1]"></div>
                    <div className="w-[129px] px-5 py-[11px]">
                      <p className="text-sm font-medium text-right break-all">
                        {history.amountUsed}
                      </p>
                    </div>
                    <div className="w-[1px] self-stretch bg-[#D2DBE1]"></div>
                    <div className="w-[129px] px-5 py-[11px]">
                      <p className="text-sm font-medium text-right break-all">
                        {history.amountReceived}
                      </p>
                    </div>
                    <div className="w-[1px] self-stretch bg-[#D2DBE1]"></div>
                    <div className="w-[129px] px-5 py-[11px]">
                      <p className="text-sm font-medium text-right break-all">
                        {history.balanceAfter}
                      </p>
                    </div>
                    <div className="w-[1px] self-stretch bg-[#D2DBE1]"></div>
                    <div className="w-[calc(100%_-_525px)] px-5 py-[11px]">
                      <p className="text-sm break-all">
                        {history.memo}
                      </p>
                    </div>
                  </div>
                </>
              );
            })}

            {isFetchingNextPage && (
              <div className="mt-2">
                <RowSkeleton
                  numberOfRows={2}
                  className="h-[80px] !rounded-[14px]"
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
