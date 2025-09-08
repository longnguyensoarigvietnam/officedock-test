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

import { useToast } from '@providers/ToastProvider';
import { LoadingContext } from '@providers/LoadingProvider';

import { apiRouters } from '@constants/routers';
import { ERROR_SAVE_MESSAGE, SUCCESS_SAVE_MESSAGE } from '@constants/message';

import api from '@base/api';
import { formatJapaneseDateRange } from '@utils/date';

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
  const { showToast } = useToast();

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
        data?.organizations &&
          setMemberListByOrganization(
            data?.organizations?.map((org) => {
              return {
                orgInfo: { ...org },
                collapseStatus: true,
              };
            }),
          );
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
      showToast({
        description: SUCCESS_SAVE_MESSAGE,
      });
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

  const listAvatar = ['podium', 'body', 'head-full', 'hat', 'shoes'];

  return (
    <div className="relative w-full h-full">
      <div className="absolute bottom-[50px] left-[123px]">
        <div className="flex-grow">
          <div className="h-[424px] w-[336px] relative">
            <RenderAccessories images={listAvatar} />
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
            className="absolute bottom-[500px] left-[123px] p-[10px] rounded-[14px] w-[310px] h-fit] ">
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
                <span className="text-base text-[#B58F42] ">
                  {formatJapaneseDateRange(
                    currentMVPVotingDetail?.startDate,
                    currentMVPVotingDetail?.endDate,
                    false
                  )}
                </span>
                ！
              </p>
            </div>
          </div>
          <div
            className="bg-[#D0A95A] absolute h-[25px] w-[22px] bottom-[485px] left-[400px]"
            style={{
              clipPath: 'polygon(100% 0, 33% 0, 0 100%)',
            }}></div>
        </>
      ) : (
        <></>
      )}

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
