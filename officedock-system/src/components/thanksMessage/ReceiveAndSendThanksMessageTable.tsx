'use client';

import { useEffect, useRef } from 'react';
import {
  FetchNextPageOptions,
  InfiniteQueryObserverResult,
} from '@tanstack/react-query';

import CustomUserAvatar from '@components/common/AvatarIcon/CustomUserAvatar';
import Button from '@components/common/Button';
import RowSkeleton from '@components/skeleton/RowSkeleton';

import { ThanksMessageType } from '@constants/enums';

import { ResponseError } from '@interfaces/response';
import { ThanksMessageDetail } from '@interfaces/thanks-message';

import { formatShowDateJapanese } from '@utils/date';
import { formatWithParagraphTags } from '@utils';

interface ReceiveAndSendThanksMessageTableProps {
  thanksMessageList: ThanksMessageDetail[];
  activeTab: ThanksMessageType;
  hasNextPage: boolean | undefined;
  isLoadingList: boolean;
  isFetchingNextPage: boolean;
  setActiveTab: React.Dispatch<React.SetStateAction<ThanksMessageType>>;
  fetchNextPage: (options?: FetchNextPageOptions | undefined) => Promise<
    InfiniteQueryObserverResult<
      {
        currentUrl: string;
        count: number;
        numPages: number;
        results: ThanksMessageDetail[];
        hasNext?: boolean;
        totalDuration?: string;
        next?: string | null;
        previous?: string | null;
      },
      ResponseError<any>
    >
  >;
}

export const ReceiveAndSendThanksMessageTable = ({
  thanksMessageList,
  activeTab,
  hasNextPage,
  isLoadingList,
  isFetchingNextPage,
  setActiveTab,
  fetchNextPage,
}: ReceiveAndSendThanksMessageTableProps) => {
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
      className="w-[720px] h-[calc(100vh_-_246px)] min-h-[715px]  overflow-y-hidden overflow-x-hidden p-5 absolute top-1/2 -translate-y-1/2 right-[30px] font-medium text-white border border-white rounded-3xl">
      <div className="flex gap-2 items-center mb-7 bg-white w-fit p-[6px] rounded-[20px]">
        <Button
          variant="secondary"
          className={`w-[200px] !p-0 text-xs h-[30px] !font-bold ${activeTab == ThanksMessageType.RECEIVED ? 'text-white' : '!text-[#77858F] !bg-[#EBF1F7] border-none'}  !rounded-[20px]`}
          style={{
            background:
              activeTab == ThanksMessageType.RECEIVED
                ? 'linear-gradient(180deg, #355AC9 0%, #5282FC 100%)'
                : '',
          }}
          onClick={() => setActiveTab(ThanksMessageType.RECEIVED)}>
          受け取ったサンクスメッセージ
        </Button>
        <Button
          variant="secondary"
          className={`w-[176px] !p-0 text-xs h-[30px] !font-bold ${activeTab == ThanksMessageType.SENT ? 'text-white' : '!text-[#77858F] !bg-[#EBF1F7] border-none'} !rounded-[20px]`}
          onClick={() => setActiveTab(ThanksMessageType.SENT)}
          style={{
            background:
              activeTab == ThanksMessageType.SENT
                ? 'linear-gradient(180deg, #355AC9 0%, #5282FC 100%)'
                : '',
          }}>
          送ったサンクスメッセージ
        </Button>
      </div>
      {/* Header */}
      <div className="h-fit flex items-center text-white text-xs font-medium gap-[14px]">
        <p className="w-[108px]">日付</p>
        <div className="w-[1px] h-[9px] bg-[#D2DBE1]"></div>
        <p className="w-[148px]">名前</p>
        <div className="w-[1px] h-[9px] bg-[#D2DBE1]"></div>
        <p className="w-[calc(100%_-_314px)]">サンクスメッセージ</p>
      </div>
      {/* Table */}
      <div
        ref={resultsContainerRef}
        className={`overflow-y-auto overflow-x-hidden h-fit max-h-[calc(100%_-_105px)] w-full mt-3 flex flex-col gap-[2px]  ${!isLoadingList && !thanksMessageList.length ? 'bg-white h-full w-full' : 'customized-scrollbar'}`}>
        {isLoadingList ? (
          <div className="pl-3">
            <RowSkeleton
              numberOfRows={6}
              className="h-[125px] !rounded-[14px] w-[calc(100%_-_10px)]"
            />
          </div>
        ) : (
          <div className="pr-[10px]">
            {thanksMessageList.map((message, index) => {
              return (
                <>
                  <div
                    key={index}
                    className={`relative mb-[2px] ${index == 0 && 'rounded-t-[14px]'} ${index == thanksMessageList.length - 1 && 'rounded-b-[14px]'} flex items-start ${activeTab == ThanksMessageType.RECEIVED && !message.readAt ? 'bg-[#FFF3F9]' : 'bg-white'} text-black font-normal gap-[14px] py-[14px]`}>
                    {activeTab == ThanksMessageType.RECEIVED &&
                    !message.readAt ? (
                      <div
                        className="absolute w-[10px] h-[10px] rounded-full top-3 right-3"
                        style={{
                          background:
                            'linear-gradient(157.85deg, #FF4D50 15%, #FF6E90 85.72%)',
                        }}></div>
                    ) : (
                      <></>
                    )}
                    {/* Date column */}
                    <p className="w-[109px] text-xs pl-5 pr-2 flex items-center text-nowrap py-[15px]">
                      {message.createdAt
                        ? formatShowDateJapanese(message.createdAt)
                        : formatShowDateJapanese(new Date())}
                    </p>
                    <div className="w-[1px] self-stretch bg-[#D2DBE1]"></div>
                    <div className="w-[154px] flex flex-col gap-2 py-[15px]">
                      <p
                        className={`${activeTab == ThanksMessageType.RECEIVED && !message.readAt ? 'bg-[#FFDAEC] text-[#D85A9D]' : 'bg-[#EBF1F7] text-primary'} text-[11px] font-medium w-fit rounded-[2px] py-[4px] px-[5px] leading-none`}>
                        {activeTab == ThanksMessageType.RECEIVED
                          ? 'From'
                          : 'To'}
                      </p>
                      <div className="flex items-center justify-center gap-2">
                        <CustomUserAvatar
                          avatarUrl={
                            activeTab == ThanksMessageType.RECEIVED
                              ? message.sender?.avatar || ''
                              : message.recipient?.avatar || ''
                          }
                          avatarColor={
                            activeTab == ThanksMessageType.RECEIVED
                              ? message.sender?.avatarColor || ''
                              : message.recipient?.avatarColor || ''
                          }
                          size={30}
                        />
                        <div className="space-y-1 w-full">
                          <p className="text-[#77858F] font-medium text-xs max-w-full break-all">
                            {activeTab == ThanksMessageType.RECEIVED
                              ? message.sender?.organizations?.name || ''
                              : message.recipient?.organizations?.name || ''}
                          </p>
                          <p className="text-black text-[15px] font-medium text-sm max-w-full break-all">
                            {activeTab == ThanksMessageType.RECEIVED
                              ? message.sender?.fullName || ''
                              : message.recipient?.fullName || ''}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="w-[1px] self-stretch bg-[#D2DBE1]"></div>
                    <p
                      className={`w-[calc(100%_-_300px)] max-w-[calc(100%_-_300px)] pr-2 text-sm break-all py-[15px] ${message.deletedAt && 'text-[#77858F]'}`}
                      dangerouslySetInnerHTML={{
                        __html: formatWithParagraphTags(
                          message.deletedAt
                            ? 'サンクスメッセージは、管理者によって削除されました。 この履歴は、30日後に自動で削除されます。'
                            : message.message,
                        ),
                      }}></p>
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
              className="h-[125px] !rounded-[14px] w-[calc(100%_-_10px)]"
            />
          </div>
        )}
      </div>
    </div>
  );
};
