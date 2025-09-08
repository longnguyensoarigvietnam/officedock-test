import { useContext, useEffect, useRef, useState } from 'react';
import { useMutation, useQueryClient } from 'react-query';
import { AxiosError } from 'axios';
import { useRouter, useSearchParams } from 'next/navigation';

import Button from '@components/common/Button';
import ImageRound from '@components/common/ImageRound';
import ActionsVotingModal from '@components/modals/ActionsVotingModal';
import ViewVotingMemberListModal from '@components/modals/ViewVotingMemberListModal';
import ConfirmDeleteModal from '@components/modals/ConfirmDeleteModal';
import Spinner from '@components/common/Spinner';

import {
  ActionsModal,
  ServerStatusCode,
  VotingManagementType,
} from '@constants/enums';
import { apiRouters } from '@constants/routers';
import { NO_SETTING, VOTING_BONUS_POINT } from '@constants';
import {
  ERROR_COMMON_MESSAGE,
  ERROR_CREATE_MESSAGE,
  ERROR_DELETE_MESSAGE,
  ERROR_UPDATE_MESSAGE,
  ERROR_WRONG_DATE_VOTING,
  SUCCESS_CREATE_MESSAGE,
  SUCCESS_DELETE_MESSAGE,
  SUCCESS_UPDATE_MESSAGE,
} from '@constants/message';

import useMVPVotingList from '@hooks/useMVPVotingList';
import useVotingDetail from '@hooks/useVotingDetail';
import { useErrorToast } from '@hooks/useErrorToast';
import { useUpdateVotingCache } from '@hooks/CacheQuery/useUpdateVotingCache';

import { UserProfile } from '@interfaces/user';
import { VotingDetail, VotingFormData, VotingRequest } from '@interfaces/mvp';

import {
  addTimeToDate,
  formatLocalDate,
  getFullFormattedDate,
} from '@utils/date';

import { LoadingContext } from '@providers/LoadingProvider';
import { useToast } from '@providers/ToastProvider';
import { MVPManagementStateContext } from '@providers/MVPManagementProvider';

import api from '@base/api';

export const FutureVotingSettings = () => {
  const { setIsLoading } = useContext(LoadingContext);
  const showErrorToast = useErrorToast();
  const { showToast } = useToast();

  const searchParams = useSearchParams();
  const params = new URLSearchParams(searchParams);
  const router = useRouter();

  const { currentVoting } = useContext(MVPManagementStateContext);

  const queryClient = useQueryClient();

  const [openActionsVotingModal, setOpenActionsVotingModal] = useState(false);
  const [votingDateTimeErrorMsg, setVotingDateTimeErrorMsg] = useState<
    string | null
  >(null);

  const [votingIdParam, setVotingIdParam] = useState<string | null>(
    searchParams.get('votingId'),
  );
  const [actionTypeParam, setActionTypeParam] = useState<string | null>(
    searchParams.get('action'),
  );
  const [dataVotingEdit, setDataVotingEdit] = useState<VotingDetail | null>(
    null,
  );

  const [openViewVotingMemberList, setOpenViewVotingMemberList] =
    useState(false);
  const [selectedVotingId, setSelectedVotingId] = useState<number | null>(null);
  const [selectedVotingToDelete, setSelectedVotingToDelete] = useState<{
    id: number;
    title: string;
  } | null>({
    id: 0,
    title: '',
  });
  const [selectedVotingIdToUpdate, setSelectedVotingIdToUpdate] = useState<
    number | null
  >(null);

  const {
    votingList,
    isLoadingList,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useMVPVotingList({
    timeline: VotingManagementType.UPCOMING,
  });
  const { createVotingLocal, updateVotingLocal, deleteVotingLocal } =
    useUpdateVotingCache();
  const { votingDetail } = useVotingDetail({
    id: Number(selectedVotingId) || Number(selectedVotingIdToUpdate),
    onSuccess: (data) => {
      if (selectedVotingIdToUpdate) {
        setDataVotingEdit(data);
        setOpenActionsVotingModal(true);
        if (selectedVotingIdToUpdate) {
          handleSetParam({
            id: String(selectedVotingIdToUpdate),
            action: ActionsModal.EDIT,
          });
        }
        setIsLoading(false);
      }
    },
    onError: (error: AxiosError) => {
      if (error.response?.status === ServerStatusCode.NOT_FOUND) {
        showToast({
          variant: 'error',
          description: ERROR_COMMON_MESSAGE,
        });
        handleRemoveParam();
      }
      setIsLoading(false);
    },
  });

  const handleSetParam = ({
    id,
    action,
  }: {
    id?: string | null;
    action?: string | null;
  }) => {
    if (id) {
      params.set('votingId', id);
      setVotingIdParam(id);
    }
    if (action) {
      params.set('action', action);
      setActionTypeParam(action);
    }
    router.push(`?${params.toString()}`);
  };

  const handleRemoveParam = () => {
    const params = new URLSearchParams(searchParams);
    params.delete('votingId');
    params.delete('action');
    setVotingIdParam(null);
    setActionTypeParam(null);
    router.replace(`?${params.toString()}`);
  };

  useEffect(() => {
    if (
      votingIdParam &&
      !dataVotingEdit &&
      actionTypeParam === ActionsModal.EDIT
    ) {
      setSelectedVotingIdToUpdate(Number(votingIdParam));
    }

    if (actionTypeParam === ActionsModal.CREATE && !openActionsVotingModal) {
      setOpenActionsVotingModal(true);
    }
  }, [votingIdParam, actionTypeParam, dataVotingEdit, openActionsVotingModal]);

  // Call API to delete vote
  const handleDeleteVote = async (id: number) => {
    setIsLoading(true);
    const { data: response } = await api.delete(
      apiRouters.MVP_VOTING_DETAIL(String(id)),
    );
    return response;
  };

  const { mutate: deleteVote } = useMutation('deleteVote', handleDeleteVote, {
    onSuccess: (_data, variables) => {
      setSelectedVotingToDelete(null);
      showToast({
        description: SUCCESS_DELETE_MESSAGE,
      });
      deleteVotingLocal(variables, VotingManagementType.UPCOMING);
    },
    onError: (error: AxiosError) => {
      showErrorToast(error, ERROR_DELETE_MESSAGE);
    },
    onSettled: () => {
      setIsLoading(false);
    },
  });

  // Create voting
  const handleCreateVoting = async (data: VotingRequest) => {
    setIsLoading(true);
    return await api.post(apiRouters.MVP_VOTING_LIST, data);
  };

  const { mutate: createVoting } = useMutation(
    'postCreateVoting',
    handleCreateVoting,
    {
      onSuccess: ({ data }) => {
        showToast({
          description: SUCCESS_CREATE_MESSAGE,
        });
        setOpenActionsVotingModal(false);
        createVotingLocal(data, VotingManagementType.UPCOMING);
        setVotingDateTimeErrorMsg(null)
        handleRemoveParam();
      },
      onError: (data: any) => {
        const error = data.response.data;
        if (error && error.endDate) {
          setVotingDateTimeErrorMsg(ERROR_WRONG_DATE_VOTING)
        } else {
          showToast({
            variant: 'error',
            description: ERROR_CREATE_MESSAGE,
          });
        }
      },
      onSettled: () => {
        setIsLoading(false);
      },
    },
  );

  const handleConfirmCreateVoting = (data: VotingFormData) => {
    createVoting({
      title: data.title || '',
      selectedOrganizations: data.selectedOrganizations.join(',') || '',
      candidateIds: data.candidateIds || [],
      bonusPoint: VOTING_BONUS_POINT,
      endDate:
        data.endDate && data.endTime
          ? addTimeToDate(data.endDate as Date, data.endTime)
          : null,
      isStart: false,
    });
  };

  // Update voting
  const handleUpdateVoting = async (request: {
    id: number;
    data: VotingRequest;
  }) => {
    setIsLoading(true);
    return await api.patch(
      apiRouters.MVP_VOTING_DETAIL(String(request.id)),
      request.data,
    );
  };

  const { mutate: updateVoting } = useMutation(
    'postUpdateVoting',
    handleUpdateVoting,
    {
      onSuccess: ({ data }) => {
        showToast({
          description: SUCCESS_UPDATE_MESSAGE,
        });
        setOpenActionsVotingModal(false);
        updateVotingLocal(data, VotingManagementType.UPCOMING);
        handleRemoveParam();
        setSelectedVotingIdToUpdate(null);
        setVotingDateTimeErrorMsg(null)
        setDataVotingEdit(null);
      },
      onError: (data: any) => {
        const error = data.response.data;
        if (error && error.endDate) {
          setVotingDateTimeErrorMsg(ERROR_WRONG_DATE_VOTING)
        } else {
          showToast({
            variant: 'error',
            description: ERROR_UPDATE_MESSAGE,
          });
        }
      },
      onSettled: () => {
        setIsLoading(false);
      },
    },
  );

  const handleConfirmUpdateVoting = (id: number, data: VotingFormData) => {
    updateVoting({
      id,
      data: {
        title: data.title || '',
        selectedOrganizations: data.selectedOrganizations.join(',') || '',
        candidateIds: data.candidateIds || [],
        bonusPoint: data.bonusPoint || 0,
        endDate:
          data.endDate && data.endTime
            ? addTimeToDate(data.endDate as Date, data.endTime)
            : null,
        isStart: false,
      },
    });
  };

  // Call API to start voting
  const handleStartVoting = async (id: number) => {
    setIsLoading(true);
    const { data: response } = await api.patch(
      apiRouters.MVP_VOTING_DETAIL(String(id)),
      {
        isStart: true,
        startDate: formatLocalDate(new Date()),
      },
    );
    return response;
  };

  const { mutate: startVoting } = useMutation(
    'startVoting',
    handleStartVoting,
    {
      onSuccess: (_data, variables) => {
        queryClient.invalidateQueries({
          predicate: (query) => query.queryKey[0] === 'getCurrentVotingDetail',
        });

        deleteVotingLocal(variables, VotingManagementType.UPCOMING);
      },
      onError: (error: AxiosError) => {
        showErrorToast(error, ERROR_COMMON_MESSAGE);
      },
      onSettled: () => {
        setIsLoading(false);
      },
    },
  );

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
    <>
      <div
        className="bg-white pt-[30px] pb-[40px] px-[30px] rounded-[30px] w-full"
        style={{ boxShadow: '0px 4px 10px 0px #0000000D' }}>
        <div className="flex items-center justify-between mb-[30px]">
          <p className="text-lg font-semibold">今後の投票設定</p>
          <Button
            className="w-[100px] h-[34px] !text-sm !text-nowrap !text-white"
            onClick={() => {
              setOpenActionsVotingModal(true);
              handleSetParam({
                action: ActionsModal.CREATE,
              });
            }}>
            <ImageRound
              src="/icons/add-with-background.svg"
              name="Add icon"
              className="!w-4 !h-4 mr-[6px] cursor-pointer"
            />
            新規追加
          </Button>
        </div>
        {isLoadingList ? (
          <Spinner className="!h-fit py-3" iconClassName="h-6 w-6" />
        ) : votingList.length > 0 ? (
          <div
            ref={resultsContainerRef}
            className="max-h-[500px] overflow-y-auto bg-white text-xs font-medium !text-[#77858F] !rounded-[10px] relative !py-0 !px-0">
            <div className="flex sticky top-0 z-10 [&>p]:text-xs [&>p]:text-left [&>p]:px-[14px] [&>p]:py-[16px] [&>p]:border-l [&>p]:border-b [&>p]:border-t [&>p]:border-[#D2DBE1] [&>p:last-child]:border-r [&>p:first-child]:rounded-tl-[14px] [&>p:last-child]:rounded-tr-[14px] !bg-white">
              <p className="w-[30%]">テーマ</p>
              <p className="w-[14%]">候補メンバー</p>
              <p className="w-[10%]">贈呈コイン</p>
              <p className="w-[26%]">終了日時</p>
              <p className="w-[10%]">設定者</p>
              <p className="w-[10%]">最終更新者</p>
            </div>
            <div
              className={`border-[1px] border-[#D2DBE1] border-t-0 ${isFetchingNextPage && 'border-b-0'} rounded-b-[14px]`}>
              {votingList.map((element, index) => (
                <div
                  key={index}
                  className={`flex text-sm text-black font-medium [&>div]:border-l rounded-b-[14px] ${votingList.length - 1 != index && '[&>div]:border-b'} [&>div:first-child]:border-l-0 [&>div]:border-[#D2DBE1]`}>
                  <div className="px-[14px] py-[17px] w-[30%] break-all text-left flex items-center">
                    <div className="flex items-center w-full justify-between">
                      <p
                        className={`text-sm font-medium w-[calc(100%_-_50px)] max-w-[calc(100%_-_50px)] break-all ${element.title ? '' : 'text-primary'}`}>
                        {element.title || NO_SETTING}
                      </p>
                      <div className="flex items-center gap-2 w-10">
                        <ImageRound
                          name="Edit"
                          src={`/icons/edit.svg`}
                          className={`w-[14px] h-[14px] hover:cursor-pointer`}
                          onClick={() => {
                            setSelectedVotingIdToUpdate(Number(element.id));
                          }}
                        />
                        <ImageRound
                          name="Delete"
                          src={'/icons/delete.svg'}
                          className={`w-[13px] h-[15px] hover:cursor-pointer`}
                          onClick={() =>
                            setSelectedVotingToDelete({
                              id: element.id as number,
                              title: element.title as string,
                            })
                          }
                        />
                      </div>
                    </div>
                  </div>
                  <div className="px-[14px] py-[17px] w-[14%] break-all text-left !pt-4 flex items-center">
                    <div className="flex justify-between items-center w-full">
                      <p className="text-xs font-medium text-nowrap">
                        {element.isAllUsers ? '全員' : '選択メンバー'}
                      </p>
                      {!element.isAllUsers ? (
                        <Button
                          className="w-[42px] h-[25px] !rounded-[8px] !text-xs !text-nowrap !text-white"
                          onClick={() => {
                            setSelectedVotingId(element.id);
                            setOpenViewVotingMemberList(true);
                          }}>
                          詳細
                        </Button>
                      ) : (
                        <></>
                      )}
                    </div>
                  </div>
                  <div className="px-[14px] py-[17px] text-left w-[10%] break-all !pt-4 flex items-center">
                    <p
                      className={`text-xs font-medium ${element.bonusPoint ? '' : 'text-primary'}`}>
                      {element.bonusPoint || NO_SETTING}
                    </p>
                  </div>
                  <div className="px-[14px] py-[17px] text-left w-[26%] break-all !pt-4 flex items-center">
                    <div className="flex justify-between items-center w-full">
                      <p
                        className={`${element.endDate ? '' : 'text-primary'} text-xs font-medium`}>
                        {element.endDate
                          ? getFullFormattedDate(new Date(element.endDate))
                          : NO_SETTING}
                      </p>
                      <Button
                        className="w-[42px] h-[25px] !rounded-[8px] !text-xs !text-nowrap !text-white"
                        disabled={
                          !element.title ||
                          !element.bonusPoint ||
                          !element.endDate ||
                          !element.createdBy ||
                          Boolean(currentVoting)
                        }
                        onClick={() => startVoting(element.id)}>
                        開始
                      </Button>
                    </div>
                  </div>
                  <div className="px-[14px] py-[17px] w-[10%] text-left break-all !pt-4 flex items-center">
                    <p className="text-xs font-medium">
                      {(element.createdBy as UserProfile)?.fullName || ''}
                    </p>
                  </div>
                  <div className="px-[14px] py-[17px] w-[10%] text-left break-all !pt-4 flex items-center">
                    <p className="text-xs font-medium">
                      {(element.updatedBy as UserProfile)?.fullName || ''}
                    </p>
                  </div>
                </div>
              ))}
              {isFetchingNextPage && (
                <div className="py-5 text-center text-sm leading-6 w-full">
                  <Spinner className="!h-fit" iconClassName="h-6 w-6" />
                </div>
              )}
            </div>
          </div>
        ) : (
          <p className="text-sm font-medium">今後実施中の投票はありません。</p>
        )}
      </div>
      {openViewVotingMemberList && votingDetail && (
        <ViewVotingMemberListModal
          candidateList={votingDetail.candidates}
          organizationList={votingDetail.organizations}
          open={openViewVotingMemberList}
          onClose={() => {
            setSelectedVotingId(null);
            setOpenViewVotingMemberList(false);
          }}
        />
      )}
      {selectedVotingToDelete && (
        <ConfirmDeleteModal
          open={Boolean(selectedVotingToDelete?.id)}
          type="投票"
          name={selectedVotingToDelete.title}
          onConfirm={() => deleteVote(Number(selectedVotingToDelete?.id))}
          onClose={() => setSelectedVotingToDelete(null)}
        />
      )}
      {openActionsVotingModal && actionTypeParam && (
        <ActionsVotingModal
          open={true}
          action={actionTypeParam}
          dataVoting={dataVotingEdit}
          votingDateTimeErrorMsg={votingDateTimeErrorMsg}
          setVotingDateTimeErrorMsg={setVotingDateTimeErrorMsg}
          onClose={() => {
            setOpenActionsVotingModal(false);
            handleRemoveParam();
            setDataVotingEdit(null);
            setSelectedVotingIdToUpdate(null);
            setVotingDateTimeErrorMsg(null)
          }}
          onCreate={(data) => {
            handleConfirmCreateVoting(data);
          }}
          onEdit={(data) => {
            handleConfirmUpdateVoting(data.id as number, data);
          }}
          onDelete={(data) => {
            setSelectedVotingToDelete({
              id: data.id as number,
              title: data.title as string,
            });
            setDataVotingEdit(null);
            setOpenActionsVotingModal(false);
            setVotingDateTimeErrorMsg(null)
            handleRemoveParam();
          }}
        />
      )}
    </>
  );
};
