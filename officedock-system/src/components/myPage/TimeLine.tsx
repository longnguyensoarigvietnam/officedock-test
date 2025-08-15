import { useEffect, useRef } from 'react';

import CustomUserAvatar from '@components/common/AvatarIcon/CustomUserAvatar';
import Spinner from '@components/common/Spinner';
import RowSkeleton from '@components/skeleton/RowSkeleton';
import ImageRound from '@components/common/ImageRound';

import { TweetDetail } from '@interfaces/tweet';

import {
  convertToCurrentTimezone,
  formatCheckDate,
  getFormattedDateTime,
} from '@utils/date';

import { useSessionCache } from '@providers/SessionCacheProvider';
import { formatWithParagraphTags } from '@utils';

export const TimeLine = ({
  tweetList,
  hasNextPage,
  isLoadingTweetRef,
  isFetchingNextPage,
  fetchNextPage,
  setSelectedTweetToDelete,
}: {
  tweetList: TweetDetail[];
  hasNextPage: boolean | undefined;
  isLoadingTweetRef: React.MutableRefObject<boolean>;
  isFetchingNextPage: boolean;
  fetchNextPage: any;
  setSelectedTweetToDelete: React.Dispatch<React.SetStateAction<number | null>>;
}) => {
  const resultsContainerRef = useRef<HTMLDivElement | null>(null);
  const { data: session } = useSessionCache();

  useEffect(() => {
    const handleScroll = () => {
      const resultsContainer = resultsContainerRef.current;
      if (
        resultsContainer &&
        hasNextPage &&
        !isFetchingNextPage &&
        Math.round(
          resultsContainer.clientHeight + Math.abs(resultsContainer.scrollTop),
        ) >= Math.round(0.9 * resultsContainer.scrollHeight)
      ) {
        if (isLoadingTweetRef && isLoadingTweetRef.current) return;
        fetchNextPage();
      }
    };

    const resultsContainer = resultsContainerRef.current;

    if (resultsContainer) {
      resultsContainer.addEventListener('scroll', handleScroll);
    }

    return () => {
      if (resultsContainer) {
        resultsContainer.removeEventListener('scroll', handleScroll);
      }
    };
  }, [hasNextPage, isLoadingTweetRef, isFetchingNextPage, fetchNextPage]);

  const renderAvatar = (avatarUrl: string | null, avatarColor: string) => {
    return (
      <div className="h-[30px]">
        <CustomUserAvatar
          avatarUrl={avatarUrl || ''}
          avatarColor={avatarColor || ''}
          size={30}
        />
      </div>
    );
  };

  return (
    <div className="w-[352px] h-[90%] py-[31px] px-[19px] absolute top-1/2 -translate-y-1/2 right-[30px] border-[1px] border-white bg-[#3599D8CC] rounded-[24px] space-y-5">
      {/* Header */}
      <div className="border-b-[1px] border-b-white pb-3">
        <p className="text-[18px] text-white">OFFICE DOCK タイムライン</p>
      </div>

      {/* Messages */}
      <div
        ref={resultsContainerRef}
        className={`customized-scrollbar ${isLoadingTweetRef.current && tweetList.length == 0 ? 'overflow-y-hidden' : 'overflow-y-auto'}  max-h-[calc(100%_-_50px)] flex flex-col-reverse gap-10 !w-full`}>
        {isLoadingTweetRef.current && tweetList.length == 0 ? (
          <div className="flex flex-col items-start ml-3 space-y-2">
            <RowSkeleton className={`!h-[100px] w-[180px] !bg-[#248bcacc]`} />
            <RowSkeleton className={`!h-[200px] w-[280px] !bg-[#248bcacc]`} />
            <RowSkeleton className={`!h-[100px] w-[180px] !bg-[#248bcacc]`} />
            <RowSkeleton className={`!h-[200px] w-[280px] !bg-[#248bcacc]`} />
            <RowSkeleton
              numberOfRows={4}
              className={`!h-[50px] w-[260px] !bg-[#248bcacc]`}
            />
          </div>
        ) : (
          <></>
        )}

        {tweetList.length ? (
          tweetList.map((tweet) => {
            const showDeleteIcon = tweet.user.id == session?.user.id;
            return (
              <div key={tweet.id} className="space-y-2 text-white !w-full pr-3">
                <div className="flex items-center justify-between">
                  <div
                    className={`flex gap-3 items-center ${showDeleteIcon && 'w-[calc(100%_-_30px)]'}`}>
                    <div className="h-[30px]">
                      {renderAvatar(tweet.user.avatar, tweet.user.avatarColor)}
                    </div>
                    <p className="text-[16px] font-medium !break-all !max-w-full">
                      {tweet.user.fullName}
                    </p>
                  </div>
                  {showDeleteIcon ? (
                    <ImageRound
                      className="w-[12px] h-[14px] hover:cursor-pointer"
                      src="/icons/delete-event.svg"
                      name="Delete icon"
                      onClick={() => setSelectedTweetToDelete(tweet.id)}
                    />
                  ) : (
                    <></>
                  )}
                </div>

                <p
                  className="!break-all !max-w-full text-sm font-semibold"
                  dangerouslySetInnerHTML={{
                    __html: formatWithParagraphTags(tweet.content),
                  }}></p>

                <p className="text-xs">
                  {tweet.createdAt &&
                    formatCheckDate(
                      getFormattedDateTime(
                        convertToCurrentTimezone(tweet.createdAt),
                      ),
                    )}
                </p>
              </div>
            );
          })
        ) : (
          <></>
        )}
        {isFetchingNextPage && (
          <Spinner className="!h-fit py-3" iconClassName="h-6 w-6" />
        )}
      </div>
    </div>
  );
};
