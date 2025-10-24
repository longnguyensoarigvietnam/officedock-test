import { useEffect, useRef } from 'react';

import CustomUserAvatar from '@components/common/AvatarIcon/CustomUserAvatar';
import Spinner from '@components/common/Spinner';
import RowSkeleton from '@components/skeleton/RowSkeleton';
import ImageRound from '@components/common/ImageRound';

import { TweetDetail } from '@interfaces/tweet';

import { SYSTEM_TWEET_NAME } from '@constants';

import {
  convertToCurrentTimezone,
  formatCheckDate,
  getFormattedDateTime,
} from '@utils/date';
import { formatWithParagraphTags } from '@utils';

export const TimeLine = ({
  tweetList,
  hasNextPage,
  isLoadingList,
  isFetchingNextPage,
  fetchNextPage,
}: {
  tweetList: TweetDetail[];
  hasNextPage: boolean | undefined;
  isLoadingList: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: any;
  setSelectedTweetToDelete?: React.Dispatch<
    React.SetStateAction<number | null>
  >;
}) => {
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

  const renderAvatar = (avatarUrl: string | null, avatarColor: string) => {
    return (
      <div className="h-fit">
        <CustomUserAvatar
          avatarUrl={avatarUrl || ''}
          avatarColor={avatarColor || ''}
          size={30}
          avatarClassName={'hover:!cursor-default'}
          isZoom={true}
        />
      </div>
    );
  };

  return (
    <div className="w-[24.44vw] h-[calc(100%_-_8.76vh)] py-[3.48vh] px-[1.32vw] absolute top-[3.37vh] right-[2.08vw] border-[0.07vw] border-white bg-[#3599D8CC] rounded-[1.67vw] space-y-[2.81vh]">
      {/* Header */}
      <div className="border-b-[1px] border-b-white pb-[1.91vh]">
        <p className="text-[1.25vw] text-white font-semibold leading-none">
          OFFICE DOCK タイムライン
        </p>
      </div>

      {/* Messages */}
      <div
        ref={resultsContainerRef}
        className={`customized-scrollbar ${isLoadingList && tweetList.length == 0 ? 'overflow-y-hidden' : 'overflow-y-auto'} max-h-[calc(100%_-_5.62vh)] flex flex-col-reverse gap-[1.12vh] !w-full`}>
        {isLoadingList && tweetList.length == 0 ? (
          <div className="flex flex-col items-start ml-3 space-y-2">
            <RowSkeleton
              className={`!h-[11.24vh] w-[12.5vw] !bg-[#248bcacc]`}
            />
            <RowSkeleton
              className={`!h-[22.47vh] w-[19.44vw] !bg-[#248bcacc]`}
            />
            <RowSkeleton
              className={`!h-[11.24vh] w-[12.5vw] !bg-[#248bcacc]`}
            />
            <RowSkeleton
              className={`!h-[22.47vh] w-[19.44vw] !bg-[#248bcacc]`}
            />
            <RowSkeleton
              numberOfRows={4}
              className={`!h-[5.62vh] w-[18.06vw] !bg-[#248bcacc]`}
            />
          </div>
        ) : (
          <></>
        )}

        {!isLoadingList && tweetList.length ? (
          tweetList.map((tweet) => {
            {
              /* TODO: Show delete icon */
            }
            // const showDeleteIcon = tweet.user.id == session?.user.id;
            return (
              <div
                key={tweet.id}
                className="space-y-[1.12vh] text-white !w-full px-[0.69vw]">
                <div className="flex items-center justify-between">
                  <div className={`flex gap-[0.63vw] items-center`}>
                    <div className="h-[3.37vh]">
                      {tweet.isSystem ? (
                        <ImageRound
                          name="Blue company"
                          src={'/icons/blue-company.svg'}
                          className={`w-[3.37vh] h-[3.37vh]`}
                        />
                      ) : (
                        renderAvatar(
                          tweet?.user?.avatar || '',
                          tweet?.user?.avatarColor || '',
                        )
                      )}
                    </div>
                    <p className="text-[1.11vw] font-medium !break-all !max-w-full">
                      {tweet.isSystem
                        ? SYSTEM_TWEET_NAME
                        : tweet?.user?.fullName || ''}
                    </p>
                  </div>
                  {/* TODO: Show delete icon */}
                  {/* {showDeleteIcon ? (
                    <ImageRound
                      className="w-[12px] h-[14px] hover:cursor-pointer"
                      src="/icons/delete-event.svg"
                      name="Delete icon"
                      onClick={() => setSelectedTweetToDelete(tweet.id)}
                    />
                  ) : (
                    <></>
                  )} */}
                </div>

                <p
                  className="!break-all !max-w-full text-[0.97vw] font-semibold"
                  dangerouslySetInnerHTML={{
                    __html: formatWithParagraphTags(tweet.content),
                  }}></p>

                <p className="text-[0.83vw]">
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
          <Spinner
            className="!h-fit py-[0.34vh]"
            iconClassName="h-[0.67vw] w-[0.67vw]"
          />
        )}
      </div>
    </div>
  );
};
