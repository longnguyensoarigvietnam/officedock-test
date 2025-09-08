'use client';

import { useState } from 'react';
import Image from 'next/image';

import { HonoredUser } from '@components/mvp/HonoredUser';
import { HonoredUsersVotingReasonsModal } from '@components/modals/HonoredUsersVotingReasonsModal';
import { HistoryVotingTable } from '@components/mvp/HistoryVotingTable';

import { HonoredUserInfoDirection } from '@constants/enums';

import { Candidate } from '@interfaces/mvp';

import useMVPAnnouncementList from '@hooks/useMVPAnnouncementList';
import useMVPAnnouncementDetail from '@hooks/useMVPAnnouncementDetail';
import useMVPVotingReasonList from '@hooks/useMVPVotingReasonList';

import { assignRankingsToCandidateList } from '@utils';
import { formatJapaneseDateRange } from '@utils/date';

export const MVPHistoryList = () => {
  const [openVotingReasonsModal, setOpenVotingReasonsModal] = useState<{
    status: boolean;
    userInfo: Candidate | null;
  }>({
    status: false,
    userInfo: null,
  });
  const [selectedMvpVoteId, setSelectedMvpVoteId] = useState<
    number | undefined
  >(undefined);

  const {
    mvpAnnouncementList,
    fetchNextPage,
    hasNextPage,
    isLoadingList,
    isFetchingNextPage,
  } = useMVPAnnouncementList({});

  const { mvpAnnouncementDetail } = useMVPAnnouncementDetail({
    mvpVoteId: selectedMvpVoteId,
  });

  // Get voting reason list
  const {
    mvpVotingReasonList,
    fetchNextPage: fetchNextPageVotingReason,
    isLoadingList: isLoadingVotingReason,
    hasNextPage: hasNextPageVotingReason,
    isFetchingNextPage: isFetchingNextPageVotingReason,
  } = useMVPVotingReasonList({
    mvpCandidateId: openVotingReasonsModal.userInfo?.mvpCandidateId || 0,
    conditions: [
      openVotingReasonsModal.status,
      !!openVotingReasonsModal.userInfo,
    ],
  });

  const shouldMergeSecondAndThird =
    mvpAnnouncementDetail &&
    assignRankingsToCandidateList(mvpAnnouncementDetail.candidates).secondUsers
      .length === 1 &&
    assignRankingsToCandidateList(mvpAnnouncementDetail.candidates).thirdUsers
      .length === 1;

  const { firstUsers, secondUsers, thirdUsers } = mvpAnnouncementDetail
    ? assignRankingsToCandidateList(mvpAnnouncementDetail.candidates)
    : { firstUsers: [], secondUsers: [], thirdUsers: [] };

  return (
    <div className="relative w-full h-full flex">
      <div className="w-[calc(100%_-_800px)] relative mt-[80px]">
        {/* Fixed background image */}
        <Image
          src={'/images/history-spotlight.svg'}
          fill
          alt=""
          className="!z-0 pointer-events-none -mt-[20px] scale-110 object-contain"
        />
        <div className="customized-scrollbar overflow-x-hidden max-h-[calc(100vh_-_210px)] overflow-y-auto">
          {mvpAnnouncementDetail ? (
            <div className="space-y-[14px] mb-[80px] flex flex-col items-center mt-[20px] relative z-10">
              <div className="text-white font-medium flex gap-[10px] items-end">
                <p className="text-xs">投票期間</p>
                <p className="text-sm">
                  {formatJapaneseDateRange(
                    mvpAnnouncementDetail?.startDate,
                    mvpAnnouncementDetail?.endDate,
                    true
                  )}
                </p>
              </div>
              <p className="text-[#B58F42] w-fit font-medium text-[20px] bg-white rounded-[6px] py-[8px] px-[14px] leading-none">
                {mvpAnnouncementDetail?.title || ''}
              </p>
            </div>
          ) : (
            <></>
          )}

          <div className="flex flex-col items-center gap-[70px] mb-10">
            {/* First Ranking */}
            {firstUsers.map((user) => (
              <HonoredUser
                key={user.id}
                userInfo={user}
                avatarSize={160}
                setOpenVotingReasonsModal={setOpenVotingReasonsModal}
                direction={HonoredUserInfoDirection.HORIZONTAL}
              />
            ))}

            {/* Second & Third Grouping */}
            {shouldMergeSecondAndThird ? (
              <div className="flex flex-wrap justify-center gap-x-10 gap-y-10">
                {[...secondUsers, ...thirdUsers].map((user) => (
                  <HonoredUser
                    key={user.id}
                    userInfo={user}
                    avatarSize={160}
                    setOpenVotingReasonsModal={setOpenVotingReasonsModal}
                    direction={HonoredUserInfoDirection.VERTICAL}
                  />
                ))}
              </div>
            ) : (
              <>
                {secondUsers.length > 0 && (
                  <div className="flex flex-wrap justify-center gap-x-10 gap-y-10">
                    {secondUsers.map((user) => (
                      <HonoredUser
                        key={user.id}
                        userInfo={user}
                        avatarSize={160}
                        setOpenVotingReasonsModal={setOpenVotingReasonsModal}
                        direction={HonoredUserInfoDirection.VERTICAL}
                      />
                    ))}
                  </div>
                )}

                {thirdUsers.length > 0 && (
                  <div className="flex flex-wrap justify-center gap-x-10 gap-y-10">
                    {thirdUsers.map((user) => (
                      <HonoredUser
                        key={user.id}
                        userInfo={user}
                        avatarSize={160}
                        setOpenVotingReasonsModal={setOpenVotingReasonsModal}
                        direction={HonoredUserInfoDirection.VERTICAL}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
      <div className="w-[800px] relative h-full">
        <HistoryVotingTable
          historyList={mvpAnnouncementList}
          hasNextPage={hasNextPage}
          isFetchingNextPage={isFetchingNextPage}
          isLoadingList={isLoadingList}
          fetchNextPage={fetchNextPage}
          setSelectedMvpVoteId={setSelectedMvpVoteId}
        />
      </div>

      {openVotingReasonsModal.status && openVotingReasonsModal.userInfo && (
        <HonoredUsersVotingReasonsModal
          open={openVotingReasonsModal.status}
          userInfo={openVotingReasonsModal.userInfo}
          mvpVotingReasonList={mvpVotingReasonList}
          isLoadingList={isLoadingVotingReason}
          isFetchingNextPage={isFetchingNextPageVotingReason}
          hasNextPage={hasNextPageVotingReason}
          fetchNextPage={fetchNextPageVotingReason}
          onClose={() => {
            setOpenVotingReasonsModal({
              status: false,
              userInfo: null,
            });
          }}
        />
      )}
    </div>
  );
};
