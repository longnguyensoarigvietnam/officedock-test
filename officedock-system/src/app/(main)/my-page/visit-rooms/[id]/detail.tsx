'use client';
import React, { useContext } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AxiosError } from 'axios';

import CustomUserAvatar from '@components/common/AvatarIcon/CustomUserAvatar';
import { RenderAccessories } from '@components/custom/UserCustomize';
import ImageRound from '@components/common/ImageRound';
import { SkillMapProgressBar } from '@components/common/ProgressBar/SkillMapProgressBar';
import { MyPageMenu } from '@components/myPage/Menu';
import { TwinklingIcon } from '@components/common/TwinklingIcon';

import { GlobalStateContext } from '@providers/GlobalStateProvider';
import { useToast } from '@providers/ToastProvider';

import { getLastChar } from '@utils';

import useSetSkillList from '@hooks/useSetSkillList';

import { ServerStatusCode } from '@constants/enums';
import { pageRouters } from '@constants/routers';
import { ERROR_COMMON_MESSAGE } from '@constants/message';

const RoomDetail = () => {
  const router = useRouter();
  const { showToast } = useToast();

  const { dashboardMembersWithAvatars } = useContext(GlobalStateContext);

  // Params
  const params = useParams();

  // Get set skill list
  const { myPageSkillList } = useSetSkillList({
    filter: {
      userId: Number(params.id),
    },
    onError: (error: AxiosError) => {
      if (error.response?.status === ServerStatusCode.NOT_FOUND) {
        router.push(pageRouters.VISIT_ROOM.href);
        showToast({
          variant: 'error',
          description: ERROR_COMMON_MESSAGE,
        });
      }
    },
  });

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
          className={`w-[40px] h-[40px] cursor-pointer`}
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

  return (
    <div className="h-full w-full relative">
      <div
        style={{
          backgroundImage: 'url("/images/bg-visit-room-detail.jpg")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          width: '100%',
          height: '100%',
        }}
        className="h-[calc(100vh-120px)] w-full rounded-bl-[30px]  rounded-tr-[30px] rounded-br-[30px]">
        <div className="flex ">
          <div className="h-20 bg-white w-fit px-5 py-4 text-[#77858F] font-medium flex items-center gap-5 rounded-br-[30px]">
            <div>{params.id && renderBoxUser(params.id as string)}</div>
            <p className="break-all max-w-[100px] line-clamp-2">名前</p>
            <p className="break-all text-[22px] text-black max-w-[100px] line-clamp-2">
              {
                dashboardMembersWithAvatars.find(
                  (member) => member.id == params.id,
                )?.fullName
              }
            </p>
            <div className="h-full border-l border-[#D2DBE1]"></div>
            <div className="flex items-center text-sm font-medium gap-[10px]">
              <p>ID</p>
              <p className="text-base text-black">
                {
                  dashboardMembersWithAvatars.find(
                    (member) => member.id == params.id,
                  )?.id
                }
              </p>
            </div>
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
              <div
                key={skill.id}
                style={{
                  boxShadow: showTwinklingStars
                    ? '0px 0px 20px 0px #36ACDE80'
                    : '0px 2px 8px 0px #0000001A',
                }}
                className="w-[245px] h-[55px] relative bg-white px-5 py-3 flex items-center gap-[10px] justify-center  rounded-[14px]">
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
                    <TwinklingIcon
                      className="absolute top-[-10px] left-[-10px]"
                      delay={0}
                      iconUrl='/icons/blue-star.svg'
                    />
                    <TwinklingIcon
                      className="absolute top-[5px] right-[-15px]"
                      delay={0.5}
                      iconUrl='/icons/blue-star.svg'
                    />
                    <TwinklingIcon
                      className="absolute top-[-15px] right-[5px]"
                      delay={0.8}
                      iconUrl='/icons/blue-star.svg'
                    />
                    <TwinklingIcon
                      className="absolute bottom-[5px] left-[-15px]"
                      delay={1}
                      iconUrl='/icons/blue-star.svg'
                    />
                    <TwinklingIcon
                      className="absolute bottom-[-15px] left-[5px]"
                      delay={1.2}
                      iconUrl='/icons/blue-star.svg'
                    />
                    <TwinklingIcon
                      className="absolute bottom-[-10px] right-[-10px]"
                      delay={1.5}
                      iconUrl='/icons/blue-star.svg'
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
                      trailColor={stepCompleted ? '#D2DBE1' : '#EBF1F7'}
                      height={'6px'}
                    />
                  </div>
                </div>
                <div className="relative">
                  {renderTreasureForStep(
                    Boolean(isLocked),
                    step,
                    Boolean(stepCompleted),
                    level,
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-[120px] ml-[30px]">
          <MyPageMenu onClickSettingSurvey={() => {}} isVisitRoom={true} />
        </div>
        <div className="absolute bottom-[50px] left-[200px]">
          <div className="flex-grow">
            <div className="h-[424px] w-[336px] ml-[200px] relative">
              <RenderAccessories images={listAvatar} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoomDetail;
