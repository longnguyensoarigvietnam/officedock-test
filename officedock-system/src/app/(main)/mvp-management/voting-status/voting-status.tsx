'use client';
import { useContext, useState } from 'react';

import ImageRound from '@components/common/ImageRound';
import Spinner from '@components/common/Spinner';
import ViewVotingReasonListModal from '@components/modals/ViewVotingReasonListModal';
import CandidateList from '@components/mvp/CandidateList';

import useCurrentVotingDetail from '@hooks/useCurrentVotingDetail';
import useVoteCommentList from '@hooks/useVoteCommentList';

import { MVPManagementStateContext } from '@providers/MVPManagementProvider';

import { getCategoryFormattedDate, getFullFormattedDate } from '@utils/date';

export const VotingStatus = () => {
  const [openViewVotingCommentList, setOpenViewVotingCommentList] = useState<{
    status: boolean;
    candidateId: number | null;
  }>({
    status: false,
    candidateId: null,
  });
  
  const { setCurrentVoting } = useContext(MVPManagementStateContext);
  
  const {
    voteCommentList,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoadingList,
  } = useVoteCommentList({
    mvpCandidateId: Number(openViewVotingCommentList.candidateId),
  });
  const { currentVotingDetail, isLoadingCurrentVotingDetail } =
    useCurrentVotingDetail({
      onSuccess: (data) => {
        setCurrentVoting(data); // Store current voting detail in context
      },
    });

  return (
    <>
      <div
        className="bg-white pt-[30px] pb-[40px] px-[30px] rounded-[30px] w-full"
        style={{ boxShadow: '0px 4px 10px 0px #0000000D' }}>
        <div className="flex justify-between items-center mb-[16px]">
          <div className="flex items-center gap-[10px]">
            <ImageRound
              name="MVP Crown"
              src={'/icons/mvp-crown.svg'}
              className="w-4 h-4 cursor-pointer"
            />
            <p className="text-base font-medium text-[#77858F]">
              社内行事を一番頑張ったで賞 投票状況
            </p>
          </div>
          <div className="flex gap-3 items-center">
            <p className="text-sm font-normal text-[#77858F]">開始日</p>
            <p className="text-sm font-medium text-black">
              {getCategoryFormattedDate(
                new Date(currentVotingDetail?.startDate || new Date()),
              )}
            </p>
            <p className="text-sm font-normal text-[#77858F]">~</p>
            <p className="text-sm font-normal text-[#77858F]">終了日</p>
            <p className="text-sm font-medium text-black">
              {getFullFormattedDate(
                new Date(currentVotingDetail?.endDate || new Date()),
              )}
            </p>
          </div>
        </div>

        {isLoadingCurrentVotingDetail ? (
          <Spinner className="!h-fit py-3" iconClassName="h-6 w-6" />
        ) : currentVotingDetail ? (
          <>
            <CandidateList
              detail={{
                candidates: currentVotingDetail.candidates,
                totalVoters: currentVotingDetail.totalVoters,
              }}
              isVotingStatusPage={true}
              isOpen={true}
              onOpenViewVotingReasonList={(mvpCandidateId: number) => {
                setOpenViewVotingCommentList({
                  status: true,
                  candidateId: mvpCandidateId,
                });
              }}
            />
          </>
        ) : (
          <p className="text-sm font-medium">現在実施中の投票はありません。</p>
        )}
      </div>
      {openViewVotingCommentList.status &&
        openViewVotingCommentList.candidateId && (
          <ViewVotingReasonListModal
            open={openViewVotingCommentList.status}
            reasonList={voteCommentList}
            hasNextPage={hasNextPage}
            isFetchingNextPage={isFetchingNextPage}
            isLoadingList={isLoadingList}
            fetchNextPage={fetchNextPage}
            onClose={() => {
              setOpenViewVotingCommentList({
                status: false,
                candidateId: null,
              });
            }}
          />
        )}
    </>
  );
};
