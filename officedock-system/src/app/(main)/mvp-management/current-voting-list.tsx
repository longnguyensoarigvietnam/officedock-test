'use client';
import { AxiosError } from 'axios';
import { useContext, useState } from 'react';
import { useMutation } from 'react-query';

import Button from '@components/common/Button';
import ImageRound from '@components/common/ImageRound';
import ConfirmTerminateVotingModal from '@components/modals/ConfirmTerminateVotingModal';
import Spinner from '@components/common/Spinner';
import ViewVotingMemberListModal from '@components/modals/ViewVotingMemberListModal';

import { NO_SETTING } from '@constants';
import { apiRouters } from '@constants/routers';
import { ERROR_COMMON_MESSAGE, SUCCESS_SAVE_MESSAGE } from '@constants/message';
import { VotingManagementType } from '@constants/enums';

import {
  formatLocalDate,
  getCategoryFormattedDate,
  getFullFormattedDate,
} from '@utils/date';

import useCurrentVotingDetail from '@hooks/useCurrentVotingDetail';
import { useErrorToast } from '@hooks/useErrorToast';
import { useUpdateVotingCache } from '@hooks/CacheQuery/useUpdateVotingCache';

import { LoadingContext } from '@providers/LoadingProvider';
import { useToast } from '@providers/ToastProvider';
import { MVPManagementStateContext } from '@providers/MVPManagementProvider';

import api from '@base/api';

export const CurrentVotingList = () => {
  const { setIsLoading } = useContext(LoadingContext);
  const { setCurrentVoting } = useContext(MVPManagementStateContext);
  const showErrorToast = useErrorToast();
  const { showToast } = useToast();

  const { createVotingLocal } = useUpdateVotingCache();

  const [openViewVotingMemberList, setOpenViewVotingMemberList] =
    useState(false);

  // Terminate voting modal
  const [openConfirmTerminateModal, setOpenConfirmTerminateModal] =
    useState(false);
  const [selectedVotingToTerminate, setSelectedVotingToTerminate] = useState<
    number | null
  >(null);

  const {
    currentVotingDetail,
    isLoadingCurrentVotingDetail,
    refetchCurrentVotingDetail,
  } = useCurrentVotingDetail({
    onSuccess: (data) => {
      setCurrentVoting(data);
    },
  });

  // Call API to terminate current vote
  const handleTerminateCurrentVote = async (id: number) => {
    setIsLoading(true);
    const { data: response } = await api.patch(
      apiRouters.MVP_VOTING_DETAIL(String(id)),
      {
        isStart: false,
        endDate: formatLocalDate(new Date()),
      },
    );
    return response;
  };

  const { mutate: terminateCurrentVote } = useMutation(
    'terminateCurrentVote',
    handleTerminateCurrentVote,
    {
      onSuccess: (data) => {
        showToast({
          description: SUCCESS_SAVE_MESSAGE,
        });
        refetchCurrentVotingDetail();
        createVotingLocal(data, VotingManagementType.PAST);
        setCurrentVoting(null);
        setOpenConfirmTerminateModal(false);
        setSelectedVotingToTerminate(null);
      },
      onError: (error: AxiosError) => {
        showErrorToast(error, ERROR_COMMON_MESSAGE);
      },
      onSettled: () => {
        setIsLoading(false);
      },
    },
  );

  return (
    <>
      <div
        className="bg-white pt-[30px] pb-[40px] px-[30px] rounded-[30px] w-full"
        style={{ boxShadow: '0px 4px 10px 0px #0000000D' }}>
        <div className="flex justify-between items-center mb-[30px]">
          <div className="flex items-center gap-[10px]">
            <ImageRound
              name="MVP Crown"
              src={'/icons/mvp-crown.svg'}
              className="w-[21px] h-5 cursor-pointer"
            />
            <p className="text-lg font-semibold">現在実施中の投票</p>
          </div>
          <Button
            className={`w-[100px] h-[34px] !text-sm !font-medium !text-nowrap !text-white ${!currentVotingDetail && 'hidden'}`}
            onClick={() => {
              setSelectedVotingToTerminate(Number(currentVotingDetail?.id));
              setOpenConfirmTerminateModal(true);
            }}>
            投票終了
          </Button>
        </div>

        {isLoadingCurrentVotingDetail ? (
          <Spinner className="!h-fit py-3" iconClassName="h-6 w-6" />
        ) : currentVotingDetail ? (
          <table className="w-full">
            <tr className="border-b-[1px] border-[#D2DBE1]">
              <td className="py-5 text-[#77858F] text-sm font-medium w-[120px]">
                テーマ
              </td>
              <td className="text-black text-sm font-medium">
                {currentVotingDetail.title}
              </td>
            </tr>
            <tr className=" border-b-[1px] border-[#D2DBE1]">
              <td className="py-5 text-[#77858F] text-sm font-medium w-[120px]">
                候補メンバー
              </td>
              <td className="text-black text-sm font-medium">
                <div className="flex gap-3 items-center w-full">
                  <p className="font-medium text-nowrap">
                    {currentVotingDetail.isAllUsers ? '全員' : '選択メンバー'}
                  </p>
                  {!currentVotingDetail.isAllUsers ? (
                    <Button
                      className="w-[42px] h-[25px] !rounded-[8px] !text-xs !text-nowrap !text-white"
                      onClick={() => {
                        setOpenViewVotingMemberList(true);
                      }}>
                      詳細
                    </Button>
                  ) : (
                    <></>
                  )}
                </div>
              </td>
            </tr>
            <tr className="border-b-[1px] border-[#D2DBE1]">
              <td className="py-5 text-[#77858F] text-sm font-medium w-[120px]">
                贈呈コイン
              </td>
              <td className="text-black text-sm font-medium">
                {currentVotingDetail.bonusPoint}
              </td>
            </tr>
            <tr className="border-b-[1px] border-[#D2DBE1]">
              <td className="py-5 text-[#77858F] text-sm font-medium w-[120px]">
                投票期間
              </td>
              <td className="text-black text-sm font-medium">
                <div className="flex items-center gap-3">
                  <p className="text-sm text-[#77858F]">開始日</p>
                  <p className="font-medium">
                    {currentVotingDetail.startDate
                      ? getCategoryFormattedDate(
                          new Date(currentVotingDetail.startDate),
                        )
                      : NO_SETTING}
                  </p>
                  <p className="text-base text-[#77858F]">~</p>
                  <p className="text-sm text-[#77858F]">終了日時</p>
                  <p className="font-medium">
                    {currentVotingDetail.endDate
                      ? getFullFormattedDate(
                          new Date(currentVotingDetail.endDate),
                        )
                      : NO_SETTING}
                  </p>
                </div>
              </td>
            </tr>
            <tr className="border-b-[1px] border-[#D2DBE1]">
              <td className="py-5 text-[#77858F] text-sm font-medium w-[120px]">
                設定者
              </td>
              <td className="text-black text-sm font-medium">
                {(currentVotingDetail?.createdBy as string) || ''}
              </td>
            </tr>
            <tr className="">
              <td className="py-5 text-[#77858F] text-sm font-medium w-[120px]">
                最終更新者
              </td>
              <td className="text-black text-sm font-medium">
                {(currentVotingDetail?.updatedBy as string) || ''}
              </td>
            </tr>
          </table>
        ) : (
          <p className="text-sm font-medium">現在実施中の投票はありません。</p>
        )}
      </div>
      {openViewVotingMemberList && currentVotingDetail && (
        <ViewVotingMemberListModal
          candidateList={currentVotingDetail.candidates}
          organizationList={currentVotingDetail.organizations}
          open={openViewVotingMemberList}
          onClose={() => {
            setOpenViewVotingMemberList(false);
          }}
        />
      )}
      {openConfirmTerminateModal && selectedVotingToTerminate && (
        <ConfirmTerminateVotingModal
          open={openConfirmTerminateModal}
          message="本当に投票を終了しますか？"
          onConfirm={() =>
            terminateCurrentVote(Number(selectedVotingToTerminate))
          }
          onClose={() => {
            setOpenConfirmTerminateModal(false);
            setSelectedVotingToTerminate(null);
          }}
        />
      )}
    </>
  );
};
