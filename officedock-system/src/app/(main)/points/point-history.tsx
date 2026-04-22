'use client';

import { useEffect, useRef } from 'react';

import ImageRound from '@components/common/ImageRound';
import RowSkeleton from '@components/skeleton/RowSkeleton';
import CustomUserAvatar from '@components/common/AvatarIcon/CustomUserAvatar';

import usePointHistoryList from '@hooks/usePointHistoryList';

import { TransactionType } from '@constants/enums';

import { formatShowDateJapanese } from '@utils/date';

const PointHistory = () => {
  const resultsContainerRef = useRef<HTMLDivElement | null>(null);

  const {
    pointHistoryList,
    fetchNextPage,
    hasNextPage,
    isLoadingList,
    isFetchingNextPage,
  } = usePointHistoryList({});

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
      className="bg-[#F8FAFC] !w-[calc(100%_-_360px)] rounded-[30px] p-[30px] text-black"
      style={{ boxShadow: '0px 4px 10px 0px #0000000D' }}>
      <div className="flex items-center gap-[10px] mb-[30px]">
        <ImageRound
          name="Badge icon"
          src={'/icons/badge.svg'}
          className={`w-[30px] h-[30px]`}
        />
        <p className="text-lg font-medium">コイン履歴</p>
      </div>
      <div className="!w-full">
        {/* Header */}
        <div className="h-fit flex items-center text-xs font-medium gap-[16px] mb-[14px] !w-[calc(100%_-_6px)]">
          <p className="w-[18%]">日付</p>
          <div className="w-[1px] h-[9px] bg-[#D2DBE1]"></div>
          <p className="w-[21%]">内容</p>
          <div className="w-[1px] h-[9px] bg-[#D2DBE1]"></div>
          <p className="w-[21%]">取引主体</p>
          <div className="w-[1px] h-[9px] bg-[#D2DBE1]"></div>
          <p className="w-[18%]">増減数</p>
          <div className="w-[1px] h-[9px] bg-[#D2DBE1]"></div>
          <p className="w-[21%]">総コイン数</p>
        </div>
        {/* Table */}
        <div
          ref={resultsContainerRef}
          className={`overflow-y-auto overflow-x-hidden h-[488px] !w-full flex flex-col ${!isLoadingList && !pointHistoryList.length ? 'bg-white h-full' : 'customized-scrollbar'}`}>
          {isLoadingList ? (
            <div>
              <RowSkeleton
                numberOfRows={6}
                className="h-[125px] !rounded-[14px]"
              />
            </div>
          ) : (
            <div className="bg-[#e6e7e9] rounded-[14px] !w-[calc(100%_+_2px)] flex flex-col divide-y-[2px] divide-[#e6e7e9]">
              {pointHistoryList.map((history, index) => {
                return (
                  <>
                    <div
                      key={index}
                      className={`relative !w-full  ${index == 0 && 'rounded-t-[14px]'} ${index == pointHistoryList.length - 1 ? 'rounded-b-[14px]' : ''} bg-white flex items-center text-black font-normal gap-[16px] py-[10px]`}>
                      {/* Date column */}
                      <div className="w-[18%] text-xs py-[6px] text-nowrap leading-none pl-5 box-border">
                        <p>{formatShowDateJapanese(`${history.createdAt}`)}</p>
                      </div>
                      <div className="w-[1px] self-stretch bg-[#D2DBE1]"></div>
                      <div className="w-[21%] py-[6px]">
                        {history.transactionType ==
                        TransactionType.PLAN_AUTO_GRANTED_COIN_EXPIRATION ? (
                          <div className="text-sm">
                            <p>プラン自動付与</p>
                            <p>コイン失効</p>
                          </div>
                        ) : (
                          <p className="text-sm">{history.transactionType}</p>
                        )}
                      </div>
                      <div className="w-[1px] self-stretch bg-[#D2DBE1]"></div>
                      <div className="w-[21%] py-[6px]">
                        <p className="text-sm">
                          {history.user ? (
                            <div className="flex items-center justify-start gap-[10px]">
                              <CustomUserAvatar
                                avatarUrl={history.user?.avatar || ''}
                                avatarColor={history.user.avatarColor}
                                size={20}
                              />

                              <p className="text-black text-sm max-w-full break-all">
                                {history.user.profile.fullName}
                              </p>
                            </div>
                          ) : (
                            '会社（管理者）'
                          )}
                        </p>
                      </div>
                      <div className="w-[1px] self-stretch bg-[#D2DBE1]"></div>
                      <div className="w-[18%] flex justify-end gap-2 py-[6px]">
                        {history.amountReceived ? (
                          <div className="flex items-center gap-[5px]">
                            <ImageRound
                              name="Plus"
                              src={'/icons/primary-plus.svg'}
                              className="w-[10px] h-[10px]"
                            />
                            <p className="text-sm font-medium">
                              {history.amountReceived}
                            </p>
                          </div>
                        ) : history.amountUsed ? (
                          <div className="flex items-center gap-[5px]">
                            <ImageRound
                              name="Minus"
                              src={'/icons/minus.svg'}
                              className="w-[10px] h-[10px]"
                            />
                            <p className="text-sm font-medium">
                              {history.amountUsed}
                            </p>
                          </div>
                        ) : (
                          0
                        )}
                      </div>
                      <div className="w-[1px] self-stretch bg-[#D2DBE1]"></div>
                      <div className="w-[21%] flex justify-end gap-2 py-[6px] pr-5 !box-border">
                        <p className="text-sm font-medium">
                          {Number(history?.companyBalanceAfter || 0)}
                        </p>
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
    </div>
  );
};

export default PointHistory;
