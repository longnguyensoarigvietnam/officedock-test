'use client';

import { Dispatch, SetStateAction, useEffect, useRef } from 'react';
import {
  FetchNextPageOptions,
  InfiniteQueryObserverResult,
} from '@tanstack/react-query';

import CustomUserAvatar from '@components/common/AvatarIcon/CustomUserAvatar';
import RowSkeleton from '@components/skeleton/RowSkeleton';

import { MVPAnnouncementDetail } from '@interfaces/mvp';
import { ResponseError } from '@interfaces/response';

import { formatShowDateJapanese } from '@utils/date';

interface HistoryVotingTableProps {
  historyList: MVPAnnouncementDetail[];
  hasNextPage: boolean | undefined;
  isFetchingNextPage: boolean;
  isLoadingList: boolean;
  fetchNextPage: (options?: FetchNextPageOptions | undefined) => Promise<
    InfiniteQueryObserverResult<
      {
        currentUrl: string;
        count: number;
        numPages: number;
        results: MVPAnnouncementDetail[];
        hasNext?: boolean;
        totalDuration?: string;
        next?: string | null;
        previous?: string | null;
      },
      ResponseError<any>
    >
  >;
  setSelectedMvpVoteId: Dispatch<SetStateAction<number | undefined>>;
}

export const HistoryVotingTable = ({
  historyList,
  hasNextPage,
  isFetchingNextPage,
  isLoadingList,
  fetchNextPage,
  setSelectedMvpVoteId,
}: HistoryVotingTableProps) => {
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
        background: '#DFAEAECC',
        boxShadow: '0px 4px 10px 0px #0000000D',
      }}
      className="w-[720px] h-[calc(100vh_-_246px)] min-h-[715px]  p-[30px] absolute top-1/2 -translate-y-1/2 right-[30px] font-medium text-white border border-white rounded-3xl">
      {/* Header */}
      <div className="h-fit flex items-center text-white text-xs font-medium gap-[14px] mb-[14px]">
        <p className="w-[121px]">投票期間</p>
        <div className="w-[1px] h-[9px] bg-[#D2DBE1]"></div>
        <p className="w-[263px]">受賞テーマ</p>
        <div className="w-[1px] h-[9px] bg-[#D2DBE1]"></div>
        <p className="w-[calc(100%_-_442px)]">MVP</p>
      </div>
      {/* Table */}
      <div
        ref={resultsContainerRef}
        className={`overflow-y-auto overflow-x-hidden h-fit max-h-[calc(100%_-_30px)] w-full mt-3 flex flex-col gap-[2px] ${!isLoadingList && !historyList.length ? 'bg-white h-full' : 'customized-scrollbar'}`}>
        {isLoadingList ? (
          <div>
            <RowSkeleton
              numberOfRows={6}
              className="h-[125px] !rounded-[14px]"
            />
          </div>
        ) : (
          <div>
            {historyList.map((history, index) => {
              return (
                <>
                  <div
                    key={index}
                    className={`relative mb-[2px] hover:cursor-pointer ${index == 0 && 'rounded-t-[14px]'} ${index == historyList.length - 1 && 'rounded-b-[14px]'} bg-white flex items-center text-black font-normal gap-[14px] py-[14px]`}
                    onClick={() => setSelectedMvpVoteId(history.id)}>
                    {/* Date column */}
                    <div className="w-[121px] text-xs pl-5 pr-2 py-[15px] text-nowrap leading-none">
                      <p>{formatShowDateJapanese(`${history.startDate}`)}</p>
                      <p>
                        <span className="text-[#77858F] text-base">~</span>{' '}
                        {formatShowDateJapanese(`${history.endDate}`)}
                      </p>
                    </div>
                    <div className="w-[1px] self-stretch bg-[#D2DBE1]"></div>
                    <div className="w-[282px] flex flex-col gap-2 -ml-1 py-[15px]">
                      <p className="text-sm font-medium">{history.title}</p>
                    </div>
                    <div className="w-[1px] self-stretch bg-[#D2DBE1]"></div>
                    <div
                      className={`w-[calc(100%_-_430px)] max-w-[calc(100%_-_430px)] pr-2 text-sm break-all py-[15px] flex flex-col gap-5`}>
                      {history.topCandidates?.map((candidate) => (
                        <div
                          className="flex items-center justify-center gap-[10px]"
                          key={candidate.id}>
                          <CustomUserAvatar
                            avatarUrl={candidate?.avatar || ''}
                            avatarColor={candidate.avatarColor}
                            size={30}
                          />

                          <div className="space-y-1 w-full">
                            <p className="text-[#77858F] font-medium text-xs max-w-full break-all">
                              {candidate?.organizations?.name || ''}
                            </p>
                            <p className="text-black font-medium text-sm max-w-full break-all">
                              {candidate.fullName}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              );
            })}
          </div>
        )}
        {isFetchingNextPage && (
          <div className="mt-2">
            <RowSkeleton
              numberOfRows={2}
              className="h-[125px] !rounded-[14px]"
            />
          </div>
        )}
      </div>
    </div>
  );
};
