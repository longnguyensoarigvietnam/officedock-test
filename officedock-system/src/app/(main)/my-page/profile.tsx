'use client';
import React, { useContext, useEffect, useState } from 'react';
import { useMutation } from 'react-query';
import { useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { useRouter } from 'next/navigation';

import CustomUserAvatar from '@components/common/AvatarIcon/CustomUserAvatar';
import { RenderAccessories } from '@components/custom/UserCustomize';
import ImageRound from '@components/common/ImageRound';
import { MyPageMenu } from '@components/myPage/Menu';
import CreateTweetModal from '@components/modals/CreateTweetModal';
import { SettingSkillModal } from '@components/modals/SettingSkillModal';
import { TimeLine } from '@components/myPage/TimeLine';
import { CompletedActionsSettingSkillModal } from '@components/modals/CompletedActionsSettingSkillModal';
import { ConfirmSettingSkillModal } from '@components/modals/ConfirmSettingSkillModal';
import ConfirmDeleteModal from '@components/modals/ConfirmDeleteModal';
import ActionSettingSurvey from '@components/modals/ActionSettingSurvey';
import SuccessSurveyActionModal from '@components/modals/SuccessSurveyActionModal';
import ReceiveEnvelopeAnimationOverlay from '@components/thanksMessage/ReceiveEnvelopeAnimationOverlay';
import { SkillSetting } from '@components/myPage/SkillSetting';

import { useSessionCache } from '@providers/SessionCacheProvider';
import { LoadingContext } from '@providers/LoadingProvider';
import { useToast } from '@providers/ToastProvider';

import { TweetFormData } from '@interfaces/tweet';
import { ThanksMessageDetail } from '@interfaces/thanks-message';
import { SkillMapByOrganizationInfo } from '@interfaces/skills';

import {
  ERROR_CREATE_MESSAGE,
  ERROR_DELETE_MESSAGE,
  ERROR_SAVE_MESSAGE,
  SUCCESS_DELETE_MESSAGE,
} from '@constants/message';
import { apiRouters, pageRouters } from '@constants/routers';
import { ActionsModal, ThanksMessageType } from '@constants/enums';

import useSetSkillList from '@hooks/useSetSkillList';
import useThanksMessageList from '@hooks/useThanksMessageList';
import useTweetList from '@hooks/useTweetList';
import { useErrorToast } from '@hooks/useErrorToast';
import { useUpdateTweetCache } from '@hooks/CacheQuery/useUpdateTweetCache';
import useCreationDataCommon from '@hooks/common/useCreationDataCommon';
import useAuthenticatedUser from '@hooks/useAuthenticatedUser';

import api from '@base/api';

const MyPage = () => {
  const { data: session } = useSessionCache();
  const showErrorToast = useErrorToast();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const { setIsLoading } = useContext(LoadingContext);
  const router = useRouter();

  // Set skills
  const [openSetSkillModal, setOpenSetSkillModal] = useState<boolean>(false);
  const [openConfirmDeleteSkillModal, setOpenConfirmDeleteSkillModal] =
    useState<boolean>(false);
  const [openConfirmSettingSkillModal, setOpenConfirmSettingSkillModal] =
    useState<boolean>(false);
  const [confirmSettingSkillInfo, setConfirmSettingSkillInfo] =
    useState<SkillMapByOrganizationInfo | null>(null);
  const [confirmDeleteSkillInfo, setConfirmDeleteSkillInfo] =
    useState<SkillMapByOrganizationInfo | null>(null);
  const [skillIdToUpdate, setSkillIdToUpdate] = useState<number | null>(null);
  const [openCompletedActionsSkillModal, setOpenCompletedActionsSkillModal] =
    useState<{
      open: boolean | null;
      message: string | null;
    }>({
      open: null,
      message: null,
    });

  // Tweet
  const [openCreateTweetModal, setOpenCreateTweetModal] =
    useState<boolean>(false);
  const [tweetMessage, setTweetMessage] = useState<string>('');
  const [selectedTweetToDelete, setSelectedTweetToDelete] = useState<
    number | null
  >(null);
  const { createTweetMessageLocal, deleteTweetLocal } = useUpdateTweetCache();

  // Thanks msg
  const [showReceiveEnvelopeAnimation, setShowReceiveEnvelopeAnimation] =
    useState<boolean>(false);
  const [receivedThanksMessageList, setReceivedThanksMessageList] = useState<
    ThanksMessageDetail[]
  >([]);
  const [isFirstLoad, setIsFirstLoad] = useState(true);

  // Total pearls and coins
  const [totalPearls, setTotalPearls] = useState(0);
  const [totalCoins, setTotalCoins] = useState(0);

  // Get tweet list
  const {
    tweetList,
    isLoadingList,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useTweetList({});
  // Survey
  const [openSettingSurvey, setOpenSettingSurvey] = useState(false);
  const [openSuccessSurvey, setOpenSuccessSurvey] = useState(false);

  // Get thanks message list
  const { refetchThanksMessageList } = useThanksMessageList({
    filter: {
      isRead: false,
      isPagination: false,
      type: ThanksMessageType.RECEIVED,
    },
    conditions: [Boolean(isFirstLoad || showReceiveEnvelopeAnimation)],
    onSuccess: (data) => {
      setReceivedThanksMessageList(
        data.map((message) => {
          return { ...message, isRead: false };
        }),
      );
      if (isFirstLoad) {
        setIsFirstLoad(false);
      }
    },
  });
  const { authenticatedUser } = useAuthenticatedUser({});

  // Render user's avatar
  const renderBoxUser = () => {
    if (!authenticatedUser) return;

    return (
      <CustomUserAvatar
        avatarUrl={authenticatedUser?.avatar || ''}
        avatarColor={authenticatedUser?.avatarColor || ''}
        size={46}
      />
    );
  };

  // Unanswered survey count
  // Current coin + pearl
  const { creationDataCommonData } = useCreationDataCommon({
    options: {
      get_unanswered_count_of_survey: true,
      get_current_mvp_vote: true,
      get_balances_of_user: true,
    },
    onSuccess: (data) => {
      setTotalPearls(data?.balancesOfUser?.pearl || 0);
      setTotalCoins(data?.balancesOfUser?.coin || 0);
    },
  });

  useEffect(() => {
    return () => {
      queryClient.removeQueries({ queryKey: ['fetchTweetList'] });
    };
  }, [queryClient]);

  // Call API to send tweet message
  const handleSendTweetMessage = async (data: TweetFormData) => {
    setIsLoading(true);
    const { data: response } = await api.post(apiRouters.TWEET_LIST, data);
    return response;
  };

  const { mutate: sendTweetMessage, isSuccess: isSendTweetSuccess } =
    useMutation('sendTweetMessage', handleSendTweetMessage, {
      onSuccess: (data) => {
        setTweetMessage('');
        createTweetMessageLocal(data);
      },
      onError: (error: AxiosError) => {
        showErrorToast(error, ERROR_CREATE_MESSAGE);
      },
      onSettled: () => {
        setIsLoading(false);
      },
    });

  // Call API to delete tweet message
  const handleDeleteTweetMessage = async (id: number) => {
    setIsLoading(true);
    const { data: response } = await api.delete(apiRouters.TWEET_DETAIL(id));
    return response;
  };

  const { mutate: deleteTweetMessage } = useMutation(
    'deleteTweetMessage',
    handleDeleteTweetMessage,
    {
      onSuccess: (_data, variables) => {
        setSelectedTweetToDelete(null);
        showToast({
          description: SUCCESS_DELETE_MESSAGE,
        });
        deleteTweetLocal(variables);
      },
      onError: (error: AxiosError) => {
        showErrorToast(error, ERROR_DELETE_MESSAGE);
      },
      onSettled: () => {
        setIsLoading(false);
      },
    },
  );

  // Get set skill list
  const { myPageSkillList, refetchSetSkillList } = useSetSkillList({
    filter: {
      userId: session?.user.id,
    },
  });

  // Call API to delete my page skill
  const handleDeleteMyPageSkill = async (id: string) => {
    setIsLoading(true);
    const { data: response } = await api.put(`${apiRouters.SET_SKILL(id)}`, {
      isDefault: false,
    });
    return response;
  };

  const { mutate: deleteMyPageSkill } = useMutation(
    'deleteMyPageSkill',
    handleDeleteMyPageSkill,
    {
      onSuccess: () => {
        setOpenCompletedActionsSkillModal({
          open: true,
          message: 'スキルのセットを解除しました',
        });
        setOpenConfirmDeleteSkillModal(false);
        setConfirmDeleteSkillInfo(null);
        refetchSetSkillList();
      },
      onError: (error: AxiosError) => {
        showErrorToast(error, ERROR_DELETE_MESSAGE);
        setIsLoading(false);
      },
    },
  );

  // Call API to update my page skill
  const handleUpdateMyPageSkill = async (data: {
    newSkillId: string;
    oldSkillId: string;
  }) => {
    setIsLoading(true);
    const { data: response } = await api.put(
      `${apiRouters.SET_SKILL(data.newSkillId)}`,
      {
        isDefault: false,
        unsetDefaultId: data.oldSkillId,
      },
    );
    return response;
  };

  const { mutate: updateMyPageSkill } = useMutation(
    'updateMyPageSkill',
    handleUpdateMyPageSkill,
    {
      onSuccess: () => {
        setOpenCompletedActionsSkillModal({
          open: true,
          message: 'スキルを変更しました',
        });
        refetchSetSkillList();
        setSkillIdToUpdate(null);
        setOpenConfirmSettingSkillModal(false);
        setOpenSetSkillModal(false);
        setConfirmSettingSkillInfo(null);
      },
      onError: (error: AxiosError) => {
        showErrorToast(error, ERROR_DELETE_MESSAGE);
        setIsLoading(false);
      },
    },
  );

  // Call API to set my page skill
  const handleSetSkill = async (id: string) => {
    const { data: response } = await api.put(`${apiRouters.SET_SKILL(id)}`, {
      isDefault: true,
    });
    return response;
  };

  const { mutate: setMyPageSkill } = useMutation(
    'setMyPageSkill',
    handleSetSkill,
    {
      onSuccess: () => {
        setOpenCompletedActionsSkillModal({
          open: true,
          message: skillIdToUpdate
            ? 'スキルを変更しました'
            : 'スキルをセットしました',
        });
        refetchSetSkillList();
        setSkillIdToUpdate(null);
        setOpenConfirmSettingSkillModal(false);
        setOpenSetSkillModal(false);
        setConfirmSettingSkillInfo(null);
      },
      onError: (error: AxiosError) => {
        showErrorToast(error, ERROR_SAVE_MESSAGE);
      },
    },
  );

  return (
    <div className="h-full w-full relative min-h-[772px]">
      <div
        style={{
          backgroundImage: 'url("/images/bg-profile.jpg")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          width: '100%',
          height: '100%',
        }}
        className="w-full flex flex-col rounded-bl-[30px] rounded-r-[30px]">
        <div className="flex ">
          <div className="h-20 bg-white w-fit px-5 py-4 text-[#77858F] font-medium flex items-center gap-5 rounded-br-[30px]">
            <div>{session?.user.id && renderBoxUser()}</div>
            <div className="flex items-center gap-[10px]">
              <p className="break-all max-w-[100px] line-clamp-2 text-sm">
                名前
              </p>
              <p className="break-all text-[22px] text-black max-w-[100px] line-clamp-2">
                {session?.user.profile.fullName}
              </p>
            </div>

            <div className="h-[16px] border-l border-[#D2DBE1]"></div>
            <div className="flex items-center text-sm font-medium gap-[10px]">
              <p>ID</p>
              <p className="text-base text-black">{session?.user.id}</p>
            </div>
          </div>
          <div className="w-fit px-5 shadow-common mt-5 ml-5 font-bold text-base bg-white rounded-full h-10 flex items-center justify-center gap-[9px]">
            <ImageRound
              name="Badge icon"
              src={'/icons/badge.svg'}
              className={`w-fit h-fit`}
            />
            <p>{totalCoins || 0}</p>
            <ImageRound
              name="Pearl icon"
              src={'/icons/pearl.svg'}
              className={`w-fit h-fit ml-[10px]`}
            />
            <p>{totalPearls || 0}</p>
            <p
              onClick={() => router.push(pageRouters.HISTORY_POINT.href)}
              className="text-sm text-primary underline ml-[11px] cursor-pointer hover:opacity-80">
              ポイント履歴/交換
            </p>
          </div>
        </div>
        <div className="mt-[30px] ml-[30px]">
          <SkillSetting
            myPageSkillList={myPageSkillList}
            setSkillIdToUpdate={setSkillIdToUpdate}
            setOpenSetSkillModal={setOpenSetSkillModal}
            setConfirmDeleteSkillInfo={setConfirmDeleteSkillInfo}
            setOpenConfirmDeleteSkillModal={setOpenConfirmDeleteSkillModal}
          />
        </div>
        <div className="absolute bottom-[30px] left-[30px] z-[1]">
          {/* Menu */}
          <MyPageMenu
            onClickSettingSurvey={() => setOpenSettingSurvey(true)}
            isOpenSurveys={
              creationDataCommonData?.unansweredCount?.isOpenSurveys || false
            }
            unAnsweredSurveyCount={
              creationDataCommonData?.unansweredCount?.count || 0
            }
            isHasMvpVoting={creationDataCommonData?.isHasMvpVoting || false}
          />
        </div>
        <div className="relative ml-[30px] mb-[40px] flex items-end flex-grow">
          <div className="flex-grow">
            <div className="h-[424px] w-[336px] ml-[337px] relative">
              <RenderAccessories />
            </div>

            {/* Message user */}
            <>
              <div
                style={{
                  background:
                    'linear-gradient(180deg, #355AC9 0%, #5282FC 100%)',
                  boxShadow: '0px 4px 0px 0px #355AC940',
                }}
                className="absolute top-[calc(100%_-_531px)] left-[555px] p-[10px] rounded-[14px] w-[258px] h-fit ">
                <p className="text-white text-[13px] font-bold">マイルくん</p>
                <div className="mt-[10px] w-full bg-white rounded-[5px] p-3 text-[13px] font-semibold text-black">
                  {receivedThanksMessageList?.length
                    ? '新しいサンクスメッセージが届いているよ！'
                    : 'ポイントが貯まると、素敵な商品と交換できるよ！'}
                </div>
              </div>
              <div className="bg-[#5282FB] rotate-[20deg] absolute clip-diagonal-left h-[25px] w-[22px] top-[calc(100%_-_425px)] left-[585px]"></div>
            </>
            {/* Seagull icon */}
            {receivedThanksMessageList?.length ? (
              <div className="absolute bottom-0 left-[620px]">
                <ImageRound
                  name="Seagull"
                  src="/icons/seagull.svg"
                  className="w-[201px] h-[317px] cursor-pointer"
                  onClick={() => setShowReceiveEnvelopeAnimation(true)}
                />
              </div>
            ) : (
              <></>
            )}
          </div>
          {/* Tweet icon */}
          <ImageRound
            name="Tweet icon"
            src={'/icons/tweet.svg'}
            className={`w-[92px] h-[99px] z-10 hover:cursor-pointer absolute -bottom-[10px] right-[10px]`}
            onClick={() => setOpenCreateTweetModal(true)}
          />
        </div>
      </div>
      {/* Timeline */}
      <TimeLine
        tweetList={tweetList}
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        isLoadingList={isLoadingList}
        fetchNextPage={fetchNextPage}
        setSelectedTweetToDelete={setSelectedTweetToDelete}
      />
      {showReceiveEnvelopeAnimation && receivedThanksMessageList?.length && (
        <ReceiveEnvelopeAnimationOverlay
          receivedThanksMessageList={receivedThanksMessageList}
          onFinish={() => {
            setReceivedThanksMessageList([]);
            setShowReceiveEnvelopeAnimation(false);
            refetchThanksMessageList();
          }}
          onNavigateToThanksMessageList={() => {
            setReceivedThanksMessageList([]);
            setShowReceiveEnvelopeAnimation(false);
            router.push(pageRouters.THANKS_MESSAGE.href);
          }}
          setReceivedThanksMessageList={setReceivedThanksMessageList}
        />
      )}
      {openCreateTweetModal && (
        <CreateTweetModal
          open={openCreateTweetModal}
          tweetMessage={tweetMessage}
          isSendTweetSuccess={isSendTweetSuccess}
          setTweetMessage={setTweetMessage}
          onClose={() => {
            setTweetMessage('');
            setOpenCreateTweetModal(false);
          }}
          onSubmit={() => sendTweetMessage({ content: tweetMessage })}
        />
      )}
      {openSetSkillModal && (
        <SettingSkillModal
          open={openSetSkillModal}
          action={skillIdToUpdate ? ActionsModal.EDIT : ActionsModal.CREATE}
          onClose={() => {
            setSkillIdToUpdate(null);
            setOpenSetSkillModal(false);
          }}
          onOpenConfirmSettingSkillInfo={(
            skill: SkillMapByOrganizationInfo,
          ) => {
            setConfirmSettingSkillInfo(skill);
            setOpenConfirmSettingSkillModal(true);
            setOpenSetSkillModal(false);
          }}
          onEditSettingSkill={async (skillId: string) =>
            updateMyPageSkill({
              newSkillId: skillId,
              oldSkillId: String(skillIdToUpdate),
            })
          }
        />
      )}
      {openConfirmDeleteSkillModal && confirmDeleteSkillInfo && (
        <ConfirmSettingSkillModal
          action={ActionsModal.DELETE}
          open={openConfirmDeleteSkillModal}
          confirmSettingSkillInfo={confirmDeleteSkillInfo}
          message="このスキルのセットを解除しますか？"
          onClose={() => {
            setOpenConfirmDeleteSkillModal(false);
            setConfirmDeleteSkillInfo(null);
          }}
          onSubmit={(id: string) => {
            deleteMyPageSkill(id);
          }}
        />
      )}
      {openConfirmSettingSkillModal && confirmSettingSkillInfo && (
        <ConfirmSettingSkillModal
          action={ActionsModal.CREATE}
          open={openConfirmSettingSkillModal}
          confirmSettingSkillInfo={confirmSettingSkillInfo}
          message="このスキルをセットしますか？"
          onClose={() => {
            setOpenSetSkillModal(false);
            setOpenConfirmSettingSkillModal(false);
            setConfirmSettingSkillInfo(null);
          }}
          onSubmit={(id: string) => {
            setMyPageSkill(id);
          }}
        />
      )}
      {openCompletedActionsSkillModal.open &&
        openCompletedActionsSkillModal.message && (
          <CompletedActionsSettingSkillModal
            open={openCompletedActionsSkillModal.open}
            completedMessage={openCompletedActionsSkillModal.message}
            onClose={() => {
              setOpenCompletedActionsSkillModal({
                open: null,
                message: null,
              });
            }}
          />
        )}
      {selectedTweetToDelete && (
        <ConfirmDeleteModal
          open={Boolean(selectedTweetToDelete)}
          type="つぶやき"
          onConfirm={() => deleteTweetMessage(Number(selectedTweetToDelete))}
          onClose={() => setSelectedTweetToDelete(null)}
        />
      )}

      {openSettingSurvey && (
        <ActionSettingSurvey
          open={openSettingSurvey}
          onSuccess={(title: string) => {
            const doc = new DOMParser().parseFromString(title, 'text/html');
            const paragraphs = doc.querySelectorAll('p');

            if (paragraphs.length > 0) {
              // Insert 【 at start of first <p>
              paragraphs[0].innerHTML = `【${paragraphs[0].innerHTML}`;
              // Insert 】 at end of last <p>
              paragraphs[paragraphs.length - 1].innerHTML =
                `${paragraphs[paragraphs.length - 1].innerHTML}】アンケート実施中！ぜひご協力ください！`;
            }
            setTweetMessage(doc.body.innerHTML);
            setOpenSettingSurvey(false);
            setOpenSuccessSurvey(true);
          }}
          onClose={() => setOpenSettingSurvey(false)}
        />
      )}
      {openSuccessSurvey && (
        <SuccessSurveyActionModal
          open={openSuccessSurvey}
          onClose={() => {
            setOpenSuccessSurvey(false);
            setTweetMessage('');
          }}
          onTweet={() => {
            setOpenSuccessSurvey(false);
            setOpenCreateTweetModal(true);
          }}
        />
      )}
    </div>
  );
};

export default MyPage;
