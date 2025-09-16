'use client';

import { useContext, useState } from 'react';
import { useMutation } from 'react-query';
import { AxiosError } from 'axios';

import { VotingReasonModal } from '@components/modals/VotingReasonModal';
import { VotingCandidateList } from '@components/mvp/VotingCandidateList';
import SuccessMVPVotingModal from '@components/modals/SuccessMVPVotingModal';
import { ViewMVPVotingCommentModal } from '@components/modals/ViewMVPVotingCommentModal';
import ImageRound from '@components/common/ImageRound';
import { RenderAccessories } from '@components/custom/UserCustomize';

import { MVPOrganization } from '@interfaces/mvp';

import useMVPVotingDetail from '@hooks/useMVPVotingDetail';
import useCurrentVotingComment from '@hooks/useCurrentVotingComment';
import { useErrorToast } from '@hooks/useErrorToast';

import { LoadingContext } from '@providers/LoadingProvider';

import { apiRouters } from '@constants/routers';
import { ERROR_SAVE_MESSAGE } from '@constants/message';
import { REMAINING_ORGANIZATIONS_ID } from '@constants';

import { convertDateToJapaneseFormat, formatShowDeadline } from '@utils/date';

import api from '@base/api';

export const VotingListPage = () => {
  const [memberListByOrganization, setMemberListByOrganization] = useState<
    {
      orgInfo: MVPOrganization;
      collapseStatus: boolean;
    }[]
  >([]);
  // Voting reason modal
  const [openVotingReasonForm, setOpenVotingReasonForm] = useState<{
    status: boolean;
    userInfo: {
      id: number;
      fullName: string;
      avatarColor: string;
      avatar: string | null;
    } | null;
    votingInfo: {
      mvpVoteManagement: number | null;
      mvpCandidate: number | null;
    };
  }>({
    status: false,
    userInfo: null,
    votingInfo: {
      mvpVoteManagement: null,
      mvpCandidate: null,
    },
  });
  const [votingReason, setVotingReason] = useState<string>('');

  // Get my voting comment
  const [openVotingCommentModal, setOpenVotingCommentModal] = useState<{
    status: boolean;
    userInfo: {
      id: number;
      fullName: string;
      avatarColor: string;
      avatar: string | null;
      organizationName: string | null;
    } | null;
  }>({
    status: false,
    userInfo: null,
  });

  // Success voting modal
  const [openSuccessVotingModal, setOpenSuccessVotingModal] = useState(false);

  // Toast
  const showErrorToast = useErrorToast();

  // Loading context
  const { setIsLoading } = useContext(LoadingContext);

  // Get voting comment
  const { votingComment } = useCurrentVotingComment({
    mvpCandidateId: openVotingCommentModal.userInfo?.id || 0,
  });

  // Get current MVP voting info (title, start date, end date, members)
  const { currentMVPVotingDetail, refetchMVPVotingDetail } = useMVPVotingDetail(
    {
      onSuccess: (data) => {
        const organizationList = [
          ...(data?.organizations?.map((org) => ({
            orgInfo: { ...org },
            collapseStatus: true,
          })) ?? []),
          {
            orgInfo: {
              id: REMAINING_ORGANIZATIONS_ID,
              icon: '',
              iconColor: '',
              name: '',
              type: '',
              uuid: '',
              candidates: data?.remainingCandidates ?? [],
            },
            collapseStatus: true,
          },
        ];

        setMemberListByOrganization(organizationList);
      },
    },
  );

  // Call API to vote MVP
  const handleVoteMVP = async (data: {
    mvpVoteManagement: number;
    mvpCandidate: number;
    comment: string;
  }) => {
    setIsLoading(true);
    const { data: response } = await api.post(apiRouters.VOTE_MVP, data);
    return response;
  };

  const { mutate: voteMVP } = useMutation('voteMVP', handleVoteMVP, {
    onSuccess: () => {
      setOpenVotingReasonForm({
        status: false,
        userInfo: null,
        votingInfo: {
          mvpVoteManagement: null,
          mvpCandidate: null,
        },
      });
      setVotingReason('');
      refetchMVPVotingDetail();
      setOpenSuccessVotingModal(true);
    },
    onError: (error: AxiosError) => {
      showErrorToast(error, ERROR_SAVE_MESSAGE);
    },
    onSettled: () => {
      setIsLoading(false);
    },
  });

  return (
    <div
      className={`relative w-full h-full ${currentMVPVotingDetail && 'min-h-[800px]'}`}>
      <div className="relative w-[calc(100%_-_800px)] h-full">
        <div className="absolute bottom-10 left-[110px]">
          <div className="flex-grow">
            <div className="h-[424px] w-[336px] relative">
              <RenderAccessories isPodium />
            </div>
          </div>
        </div>
        {/* User's message */}
        {currentMVPVotingDetail ? (
          <>
            <div
              style={{
                background: 'linear-gradient(180deg, #C59941 0%, #D0AA5A 100%)',
                boxShadow: '0px 4px 0px 0px #355AC940',
              }}
              className="absolute bottom-[485px] left-[110px] p-[10px] rounded-[14px] w-[310px] h-fit">
              <div className="relative">
                <p className="text-white text-[13px] font-bold">マイルくん</p>
                <div className="mt-[10px] w-full bg-white rounded-[5px] p-4 text-[13px] font-semibold text-black space-y-[3px]">
                  <p> 今回のMVPテーマは、</p>
                  <p className="text-lg text-[#B58F42]">
                    {currentMVPVotingDetail.title}{' '}
                    <span className="text-black text-sm">だよ！</span>
                  </p>
                  <p> 見事MVPに輝いた方には、</p>
                  <div className="flex items-center gap-1">
                    <ImageRound
                      name="Coin"
                      src={'/icons/golden-coin.svg'}
                      className="w-5 h-5"
                    />
                    <p>
                      {' '}
                      <span className="text-base text-[#B58F42] font-bold">
                        200
                      </span>{' '}
                      コインを贈呈するよ！
                    </p>
                  </div>
                  <p>
                    {' '}
                    投票期間は、
                    <span className="text-base text-[#B58F42] text-nowrap">
                      {formatShowDeadline(
                        String(currentMVPVotingDetail?.startDate),
                      )}{' '}
                      ~{' '}
                      {convertDateToJapaneseFormat(
                        new Date(currentMVPVotingDetail?.endDate || new Date()),
                      )}
                    </span>
                    ！
                  </p>
                </div>
                <div
                  className="bg-[#D0A95A] absolute h-[25px] w-[22px] -bottom-[25px] left-[270px]"
                  style={{
                    clipPath: 'polygon(100% 0, 33% 0, 0 100%)',
                  }}></div>
              </div>
            </div>
          </>
        ) : (
          <></>
        )}
      </div>

      <VotingCandidateList
        memberListByOrganization={memberListByOrganization}
        currentMVPVotingDetail={currentMVPVotingDetail}
        setOpenVotingCommentModal={setOpenVotingCommentModal}
        setMemberListByOrganization={setMemberListByOrganization}
        setOpenVotingReasonForm={setOpenVotingReasonForm}
      />
      {openVotingReasonForm.status && openVotingReasonForm.userInfo && (
        <VotingReasonModal
          open={openVotingReasonForm.status}
          userInfo={openVotingReasonForm.userInfo}
          votingReason={votingReason}
          setVotingReason={setVotingReason}
          onSubmit={() =>
            voteMVP({
              mvpVoteManagement:
                openVotingReasonForm?.votingInfo?.mvpVoteManagement || 0,
              mvpCandidate: openVotingReasonForm?.votingInfo?.mvpCandidate || 0,
              comment: votingReason,
            })
          }
          onClose={() => {
            setOpenVotingReasonForm({
              status: false,
              userInfo: null,
              votingInfo: {
                mvpVoteManagement: null,
                mvpCandidate: null,
              },
            });
            setVotingReason('');
          }}
        />
      )}
      {openSuccessVotingModal && (
        <SuccessMVPVotingModal
          open={openSuccessVotingModal}
          onClose={() => setOpenSuccessVotingModal(false)}
        />
      )}
      {openVotingCommentModal.status &&
        openVotingCommentModal.userInfo &&
        votingComment && (
          <ViewMVPVotingCommentModal
            open={openVotingCommentModal.status}
            votingComment={votingComment}
            userInfo={openVotingCommentModal.userInfo}
            onClose={() =>
              setOpenVotingCommentModal({ status: false, userInfo: null })
            }
          />
        )}
    </div>
  );
};
