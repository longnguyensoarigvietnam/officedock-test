import Image from 'next/image';
import { useEffect, useRef } from 'react';
import {
  FetchNextPageOptions,
  InfiniteQueryObserverResult,
} from '@tanstack/react-query';

import CustomUserAvatar from '@components/common/AvatarIcon/CustomUserAvatar';
import Button from '@components/common/Button';
import Modal from '@components/common/Modal';
import Spinner from '@components/common/Spinner';

import { VotingCandidateRanking } from '@constants/enums';

import { Candidate, MVPVotingComment } from '@interfaces/mvp';
import { ResponseError } from '@interfaces/response';

export const HonoredUsersVotingReasonsModal = ({
  open,
  userInfo,
  mvpVotingReasonList,
  isLoadingList,
  isFetchingNextPage,
  hasNextPage,
  fetchNextPage,
  onClose,
}: {
  open: boolean;
  userInfo: Candidate;
  mvpVotingReasonList: MVPVotingComment[];
  isLoadingList: boolean;
  isFetchingNextPage: boolean;
  hasNextPage: boolean | undefined;
  fetchNextPage: (options?: FetchNextPageOptions | undefined) => Promise<
    InfiniteQueryObserverResult<
      {
        currentUrl: string;
        count: number;
        numPages: number;
        results: MVPVotingComment[];
        hasNext?: boolean;
        totalDuration?: string;
        next?: string | null;
        previous?: string | null;
      },
      ResponseError<any>
    >
  >;
  onClose: () => void;
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

  return (
    <Modal
      open={open}
      isOutSideAction={false}
      className="font-primary !rounded-[20px] !p-0 w-[500px]"
      titleClassName="!text-[14px] !text-[#5B6770] !font-medium"
      headerClassName="bg-[#EBF1F7] !rounded-t-[20px] !rounded-b-none px-6 py-4 !mb-0"
      contentClass="!rounded-[20px] w-[500px]"
      closeIconClassName="!bg-white !rounded-full !p-2 !hover:cursor-pointer !shadow-sm"
      closeClassName="!mt-0 opacity-70 !w-4 !h-4 !hover:cursor-pointer"
      onClose={() => {
        onClose();
      }}>
      <div className="w-[500px] h-fit bg-white rounded-[20px] shadow p-[30px] text-sm">
        <div className="flex items-center justify-center gap-[30px] mb-5 w-full">
          <div className="relative">
            <Image
              src={`${userInfo.ranking == VotingCandidateRanking.FIRST ? '/icons/mvp-icon.svg' : userInfo.ranking == VotingCandidateRanking.SECOND ? '/icons/silver-medal.svg' : '/icons/bronze-medal.svg'}`}
              width={userInfo.ranking == VotingCandidateRanking.FIRST ? 42 : 36}
              height={36}
              alt="Prize icon"
              className={`absolute top-0 -left-4 z-10`}
            />
            <CustomUserAvatar
              avatarUrl={userInfo?.avatar || ''}
              avatarColor={userInfo?.avatarColor || ''}
              size={100}
            />
          </div>
          <div className="font-medium !leading-none max-w-full">
            <p className="text-base break-all mb-2">
              {userInfo?.mainOrganization?.name || ''}
            </p>
            <p className="text-[20px] break-all">
              {userInfo.fullName} <span className="text-xs">さん</span>
            </p>
          </div>
        </div>
        <p className="text-xs text-[#B58F42] font-medium mb-3">投票理由</p>
        {isLoadingList ? (
          <Spinner className="!h-fit py-3" iconClassName="h-6 w-6" />
        ) : (
          <></>
        )}

        <div
          ref={resultsContainerRef}
          className={`max-h-[389px] w-[440px] overflow-y-auto border-[1px] border-[#D2DBE1] rounded-[6px] ${!mvpVotingReasonList?.length && 'hidden'}`}>
          {mvpVotingReasonList?.length > 0 &&
            mvpVotingReasonList.map((reason) => (
              <p
                key={reason.id}
                className="py-[14px] px-[16px] border-b-[1px] border-[#D2DBE1] last:border-b-[0px] break-all"
                dangerouslySetInnerHTML={{
                  __html: reason.comment,
                }}></p>
            ))}{' '}
          {isFetchingNextPage ? (
            <Spinner className="!h-fit py-3" iconClassName="h-6 w-6" />
          ) : (
            <></>
          )}
        </div>

        <div className="flex justify-center mt-[30px]">
          <Button
            variant="text"
            className="!text-[13px] !p-0 font-medium"
            onClick={onClose}>
            閉じる
          </Button>
        </div>
      </div>
    </Modal>
  );
};
