'use client';

import { useState } from 'react';

import { HonoredUser } from '@components/mvp/HonoredUser';
import { HonoredUsersVotingReasonsModal } from '@components/modals/HonoredUsersVotingReasonsModal';

import { HonoredUserInfoDirection } from '@constants/enums';

import useMVPAnnouncementDetail from '@hooks/useMVPAnnouncementDetail';
import useMVPVotingReasonList from '@hooks/useMVPVotingReasonList';

import { Candidate } from '@interfaces/mvp';

import { formatJapaneseDateRange } from '@utils/date';
import { assignRankingsToCandidateList } from '@utils';

export const AnnouncementListPage = () => {
  const [openVotingReasonsModal, setOpenVotingReasonsModal] = useState<{
    status: boolean;
    userInfo: Candidate | null;
  }>({
    status: false,
    userInfo: null,
  });

  const { mvpAnnouncementDetail } = useMVPAnnouncementDetail({});

  // Get voting reason list
  const {
    mvpVotingReasonList,
    fetchNextPage,
    isLoadingList,
    hasNextPage,
    isFetchingNextPage,
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
    <div className="relative customized-scrollbar w-full max-h-[calc(100vh_-_230px)] mt-[100px] overflow-y-auto">
      {mvpAnnouncementDetail ? (
        <div className="space-y-[14px] mb-[80px] flex flex-col items-center mt-[20px]">
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
            {mvpAnnouncementDetail?.title}
          </p>
        </div>
      ) : (
        <></>
      )}

      {/* Honored users */}
      <div className="flex flex-col items-center gap-[70px] mb-[100px]">
        {/* First Ranking */}
        <div className="flex flex-wrap justify-center gap-x-[100px] gap-y-[70px]">
          {firstUsers.map((user) => (
            <HonoredUser
              key={user.id}
              userInfo={user}
              avatarSize={200}
              setOpenVotingReasonsModal={setOpenVotingReasonsModal}
              direction={HonoredUserInfoDirection.HORIZONTAL}
            />
          ))}
        </div>

        {/* Second & Third Grouping */}
        {shouldMergeSecondAndThird ? (
          <div className="flex flex-wrap justify-center gap-x-[100px] gap-y-[70px]">
            {[...secondUsers, ...thirdUsers].map((user) => (
              <HonoredUser
                key={user.id}
                userInfo={user}
                avatarSize={160}
                setOpenVotingReasonsModal={setOpenVotingReasonsModal}
                direction={HonoredUserInfoDirection.HORIZONTAL}
              />
            ))}
          </div>
        ) : (
          <>
            {secondUsers.length > 0 && (
              <div className="flex flex-wrap justify-center gap-x-[100px] gap-y-[70px]">
                {secondUsers.map((user) => (
                  <HonoredUser
                    key={user.id}
                    userInfo={user}
                    avatarSize={160}
                    setOpenVotingReasonsModal={setOpenVotingReasonsModal}
                    direction={HonoredUserInfoDirection.HORIZONTAL}
                  />
                ))}
              </div>
            )}

            {thirdUsers.length > 0 && (
              <div className="flex flex-wrap justify-center gap-x-[100px] gap-y-[70px]">
                {thirdUsers.map((user) => (
                  <HonoredUser
                    key={user.id}
                    userInfo={user}
                    avatarSize={160}
                    setOpenVotingReasonsModal={setOpenVotingReasonsModal}
                    direction={HonoredUserInfoDirection.HORIZONTAL}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {openVotingReasonsModal.status && openVotingReasonsModal.userInfo && (
        <HonoredUsersVotingReasonsModal
          open={openVotingReasonsModal.status}
          userInfo={openVotingReasonsModal.userInfo}
          fetchNextPage={fetchNextPage}
          isLoadingList={isLoadingList}
          isFetchingNextPage={isFetchingNextPage}
          hasNextPage={hasNextPage}
          mvpVotingReasonList={mvpVotingReasonList}
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
