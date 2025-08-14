'use client';
import React, { Fragment, useContext, useRef, useState } from 'react';
import { useMutation } from 'react-query';
import { useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import {
  Popover,
  PopoverButton,
  PopoverPanel,
  Transition,
} from '@headlessui/react';

import CustomUserAvatar from '@components/common/AvatarIcon/CustomUserAvatar';
import { RenderAccessories } from '@components/custom/UserCustomize';
import ImageRound from '@components/common/ImageRound';
import { SkillMapProgressBar } from '@components/common/ProgressBar/SkillMapProgressBar';
import { TwinklingStar } from '@components/common/TwinklingStar';
import { MyPageMenu } from '@components/myPage/Menu';
import CreateTweetModal from '@components/modals/CreateTweetModal';
import { SettingSkillModal } from '@components/modals/SettingSkillModal';
import { TimeLine } from '@components/myPage/TimeLine';
import { CompletedActionsSettingSkillModal } from '@components/modals/CompletedActionsSettingSkillModal';
import { ConfirmSettingSkillModal } from '@components/modals/ConfirmSettingSkillModal';
import ActionSettingSurvey from '@components/modals/ActionSettingSurvey';
import SuccessSurveyActionModal from '@components/modals/SuccessSurveyActionModal';

import { GlobalStateContext } from '@providers/GlobalStateProvider';
import { useSessionCache } from '@providers/SessionCacheProvider';
import { LoadingContext } from '@providers/LoadingProvider';
import { useToast } from '@providers/ToastProvider';

import { TweetFormData } from '@interfaces/tweet';
import { SkillMapByOrganizationInfo } from '@interfaces/skills';

import {
  ERROR_CREATE_MESSAGE,
  ERROR_DELETE_MESSAGE,
  ERROR_SAVE_MESSAGE,
  SUCCESS_CREATE_MESSAGE,
} from '@constants/message';
import { apiRouters } from '@constants/routers';
import { MAX_MY_PAGE_SET_SKILLS } from '@constants';
import { ActionsModal } from '@constants/enums';

import useTweetList from '@hooks/useTweetList';
import useSetSkillList from '@hooks/useSetSkillList';
import { useErrorToast } from '@hooks/useErrorToast';

import { getLastChar } from '@utils';

import api from '@base/api';

const MyPage = () => {
  const { data: session } = useSessionCache();
  const showErrorToast = useErrorToast();
  const { showToast } = useToast();

  const { dashboardMembersWithAvatars } = useContext(GlobalStateContext);
  const { setIsLoading } = useContext(LoadingContext);

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
  const [lastTweetId, setLastTweetId] = useState<number | null>(null);
  const isLoadingTweetRef = useRef(false);
  const queryClient = useQueryClient();

  // Get tweet list
  const { tweetList, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useTweetList({
      isLoadingTweetRef,
      lastTweetId,
      onSuccess: (data) => {
        if (
          data.results.length > 0 &&
          data.results[data.results.length - 1].id
        ) {
          setLastTweetId &&
            setLastTweetId(data.results[data.results.length - 1].id);
        } else {
          setLastTweetId(null);
        }
      },
    });
  // Survey
  const [openSettingSurvey, setOpenSettingSurvey] = useState(false);
  const [openSuccessSurvey, setOpenSuccessSurvey] = useState(false);
  // Render user's avatar
  const renderBoxUser = (userId: string) => {
    const memberInfo = dashboardMembersWithAvatars.find(
      (member) => member.id == userId,
    );

    return (
      <CustomUserAvatar
        avatarUrl={memberInfo?.avatar || ''}
        avatarColor={memberInfo?.avatarColor || ''}
        size={36}
      />
    );
  };

  const renderTreasureForStep = (
    isLocked: boolean,
    step: number,
    stepCompleted: boolean,
    level: number,
  ) => {
    // 1. Render locked state
    if (isLocked) {
      return (
        <ImageRound
          name="Lock treasure"
          src="/icons/lock-treasure.svg"
          className="w-[51px] h-[40px] cursor-pointer"
        />
      );
    }

    // 2. If step is completed, return treasure image
    const treasureIcons: Record<number, string> = {
      1: '/icons/step-1-treasure.svg',
      2: '/icons/step-2-treasure.svg',
      3: '/icons/step-3-treasure.svg',
    };

    if (stepCompleted) {
      return (
        <ImageRound
          name={`Step ${step} treasure`}
          src={treasureIcons[step]}
          className={`w-[50px] h-[50px] cursor-pointer`}
        />
      );
    }

    const renderLevelText = () => (
      <div className="flex gap-1 items-baseline">
        <p className="text-sm font-medium">Lv.</p>
        <p className="text-[30px] font-medium">{level}</p>
      </div>
    );

    return (
      <div className="flex flex-col items-center">{renderLevelText()}</div>
    );
  };

  const listAvatar = ['body', 'head-full', 'hat', 'shoes'];

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
        showToast({
          description: SUCCESS_CREATE_MESSAGE,
        });
        queryClient.setQueryData(['fetchTweetList'], (oldData: any) => {
          if (!oldData) return oldData;

          // Insert new tweet at the start of the first page
          return {
            ...oldData,
            pages: oldData.pages.map((page: any, index: number) => {
              if (index === 0) {
                return {
                  ...page,
                  results: [data, ...page.results],
                };
              }
              return page;
            }),
          };
        });
      },
      onError: (error: AxiosError) => {
        showErrorToast(error, ERROR_CREATE_MESSAGE);
      },
      onSettled: () => {
        setIsLoading(false);
      },
    });

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
        if (!skillIdToUpdate) {
          setOpenCompletedActionsSkillModal({
            open: true,
            message: 'スキルのセットを解除しました',
          });
          setOpenConfirmDeleteSkillModal(false);
          setConfirmDeleteSkillInfo(null);
          refetchSetSkillList();
        }
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
    <div className="h-full w-full relative">
      <div
        style={{
          backgroundImage: 'url("/images/bg-profile.jpg")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          width: '100%',
          height: '100%',
        }}
        className="h-[calc(100vh-120px)] w-full">
        <div className="flex ">
          <div className="h-20 bg-white w-fit px-5 py-4 text-[#77858F] font-medium flex items-center gap-5 rounded-br-[30px]">
            <div>
              {session?.user.id && renderBoxUser(`${session?.user.id}`)}
            </div>
            <p className="break-all max-w-[100px] line-clamp-2">名前</p>
            <p className="break-all text-[22px] text-black max-w-[100px] line-clamp-2">
              {session?.user.profile.fullName}
            </p>
            <div className="h-full border-l border-[#D2DBE1]"></div>
            <div className="flex items-center text-sm font-medium gap-[10px]">
              <p>ID</p>
              <p className="text-base text-black">001</p>
            </div>
          </div>
          <div className="w-[303px] mt-5 ml-5 font-bold text-base bg-white rounded-full h-10 flex items-center justify-center gap-[9px]">
            <ImageRound
              name="Badge icon"
              src={'/icons/badge.svg'}
              className={`w-fit h-fit`}
            />
            <p>200</p>
            <ImageRound
              name="Pearl icon"
              src={'/icons/pearl.svg'}
              className={`w-fit h-fit ml-[10px]`}
            />
            <p>10</p>
            <p className="text-sm text-primary underline ml-[11px] cursor-pointer hover:opacity-80">
              ポイント履歴/交換
            </p>
          </div>
        </div>
        <div className="mt-[30px] ml-[30px] flex item-center gap-[14px]">
          {myPageSkillList?.map((skill) => {
            const isLocked = skill.isLocked;
            const step = skill.skill.step
              ? Number(getLastChar(skill.skill.step))
              : 1;
            const stepCompleted = skill.isComplete;
            const level = skill.level?.level
              ? Number(getLastChar(skill.level?.level))
              : 1;
            const progressPercent = skill?.progressPercent || 0;
            const showTwinklingStars =
              skill?.progressPercent == 100 && !stepCompleted;
            let strokeColor = '';
            switch (step) {
              case 1:
                strokeColor = '#36ACDE';
                break;
              case 2:
                strokeColor = '#0068B6';
                break;
              case 3:
                strokeColor = '#424EC1';
                break;
            }
            if (stepCompleted) {
              strokeColor = '#D2DBE1';
            } else if (isLocked || progressPercent == 0) {
              strokeColor = '#EBF1F7';
            }

            return (
              <Popover className="relative" key={skill.id}>
                {({ close }) => {
                  return (
                    <>
                      <PopoverButton className={`focus:outline-none`}>
                        <div
                          style={{
                            boxShadow: showTwinklingStars
                              ? '0px 0px 20px 0px #36ACDE80'
                              : '0px 2px 8px 0px #0000001A',
                          }}
                          className="w-[245px] h-[55px] relative bg-white px-5 py-3 flex items-center gap-3 justify-center  rounded-[14px]">
                          {showTwinklingStars && (
                            <>
                              <div className="absolute -top-[20px] left-[20px] bg-primary rounded-[20px] w-[140px] h-[20px] flex items-center justify-center">
                                <p className="text-white text-xs font-bold">
                                  レベルアップ申請可能
                                </p>
                              </div>
                              <div className="bg-primary absolute clip-diagonal-left h-[7px] w-[7px] top-0 left-[38px]"></div>
                            </>
                          )}

                          {showTwinklingStars && (
                            <div>
                              <TwinklingStar
                                className="absolute top-[-10px] left-[-10px]"
                                delay={0}
                              />
                              <TwinklingStar
                                className="absolute top-[5px] right-[-15px]"
                                delay={0.5}
                              />
                              <TwinklingStar
                                className="absolute top-[-15px] right-[5px]"
                                delay={0.8}
                              />
                              <TwinklingStar
                                className="absolute bottom-[5px] left-[-15px]"
                                delay={1}
                              />
                              <TwinklingStar
                                className="absolute bottom-[-15px] left-[5px]"
                                delay={1.2}
                              />
                              <TwinklingStar
                                className="absolute bottom-[-10px] right-[-10px]"
                                delay={1.5}
                              />
                            </div>
                          )}

                          <div className="w-fit h-fit">
                            <p className="max-w-[150px] truncate text-[15px] text-left font-medium">
                              {skill.skill.name}
                            </p>
                            <div className="w-[156px] mt-[5px]">
                              <SkillMapProgressBar
                                value={progressPercent}
                                strokeColor={strokeColor}
                                trailColor={
                                  stepCompleted ? '#D2DBE1' : '#EBF1F7'
                                }
                                height={'6px'}
                              />
                            </div>
                          </div>
                          <div className="relative top-[5px]">
                            {renderTreasureForStep(
                              Boolean(isLocked),
                              step,
                              Boolean(stepCompleted),
                              level,
                            )}
                          </div>
                        </div>
                      </PopoverButton>
                      <Transition
                        as={Fragment}
                        enter="transition ease-out duration-200"
                        enterFrom="opacity-0 translate-y-1"
                        enterTo="opacity-100 translate-y-0"
                        leave="transition ease-in duration-150"
                        leaveFrom="opacity-100 translate-y-0"
                        leaveTo="opacity-0 translate-y-1">
                        <PopoverPanel className="absolute left-0 z-10 min-w-[155px] max-w-[155px] transform">
                          <div className="bg-white !border-primary border-[1px] text-black rounded-[6px] mt-2 text-sm font-medium text-center">
                            <p
                              className="hover:cursor-pointer py-[10px] border-b-[1px] border-[#EBF1F7]"
                              onClick={() => {
                                setSkillIdToUpdate(skill.id);
                                setOpenSetSkillModal(true);
                                close();
                              }}>
                              スキル変更
                            </p>
                            <p
                              className="hover:cursor-pointer py-[10px]"
                              onClick={() => {
                                setConfirmDeleteSkillInfo(skill);
                                setOpenConfirmDeleteSkillModal(true);
                                close();
                              }}>
                              スキル解除
                            </p>
                          </div>
                        </PopoverPanel>
                      </Transition>
                    </>
                  );
                }}
              </Popover>
            );
          })}
          {/* Skill add */}
          {myPageSkillList &&
          myPageSkillList.length < MAX_MY_PAGE_SET_SKILLS ? (
            <div
              style={{
                boxShadow: '0px 0px 7px 0px #00000080',
              }}
              className="w-[245px] min-w-[245px] h-[55px] bg-transparent border border-white rounded-[14px] hover:opacity-70 flex items-center cursor-pointer justify-center text-white text-center font-medium text-sm"
              onClick={() => setOpenSetSkillModal(true)}>
              <p>＋ スキルをセットできます</p>
            </div>
          ) : (
            <></>
          )}
        </div>
        <div className="mt-[74px] relative ml-[30px] flex items-end">
          {/* Menu */}
          <MyPageMenu onClickSettingSurvey={() => setOpenSettingSurvey(true)} />
          <div className="flex-grow">
            <div className="h-[424px] w-[336px] ml-[200px] relative">
              <RenderAccessories images={listAvatar} />
            </div>
            {/* Message user */}
            <>
              <div
                style={{
                  background:
                    'linear-gradient(180deg, #355AC9 0%, #5282FC 100%)',
                  boxShadow: '0px 4px 0px 0px #355AC940',
                }}
                className="absolute top-[13px] left-[555px] p-[10px] rounded-[14px] w-[258px] h-fit] ">
                <p className="text-white text-[13px] font-bold">マイルくん</p>
                <div className="mt-[10px] w-full bg-white rounded-[5px] p-4 text-[13px] font-semibold text-black">
                  ポイントが貯まると、素敵な商品と交換できるよ！
                </div>
              </div>
              <div className="bg-[#5282FB] rotate-[20deg] absolute clip-diagonal-left h-[25px] w-[22px] top-[128px] left-[585px]"></div>
            </>
          </div>
          {/* Tweet icon */}
          <ImageRound
            name="Tweet icon"
            src={'/icons/tweet.svg'}
            className={`w-[88px] h-[94px] z-10 hover:cursor-pointer absolute bottom-[0px] right-[20px]`}
            onClick={() => setOpenCreateTweetModal(true)}
          />
        </div>
      </div>
      {/* Timeline */}
      <TimeLine
        tweetList={tweetList}
        hasNextPage={hasNextPage}
        isLoadingTweetRef={isLoadingTweetRef}
        isFetchingNextPage={isFetchingNextPage}
        fetchNextPage={fetchNextPage}
      />
      {openCreateTweetModal && (
        <CreateTweetModal
          open={openCreateTweetModal}
          tweetMessage={tweetMessage}
          isSendTweetSuccess={isSendTweetSuccess}
          setTweetMessage={setTweetMessage}
          onClose={() => setOpenCreateTweetModal(false)}
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
          onEditSettingSkill={async (skillId: string) => {
            await Promise.all([
              deleteMyPageSkill(String(skillIdToUpdate)),
              setMyPageSkill(skillId),
            ]);
          }}
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
      {openSettingSurvey && (
        <ActionSettingSurvey
          open={openSettingSurvey}
          onSusses={() => {
            setOpenSettingSurvey(false);
            setOpenSuccessSurvey(true);
          }}
          onClose={() => setOpenSettingSurvey(false)}
        />
      )}
      {openSuccessSurvey && (
        <SuccessSurveyActionModal
          open={openSuccessSurvey}
          onClose={() => setOpenSuccessSurvey(false)}
          onTweet={() => setOpenCreateTweetModal(true)}
        />
      )}
    </div>
  );
};

export default MyPage;
