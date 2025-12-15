'use client';

import { Fragment } from 'react';
import {
  Popover,
  PopoverButton,
  PopoverPanel,
  Transition,
} from '@headlessui/react';

import ImageRound from '@components/common/ImageRound';
import { SkillMapProgressBar } from '@components/common/ProgressBar/SkillMapProgressBar';
import { TwinklingIcon } from '@components/common/TwinklingIcon';

import { MAX_MY_PAGE_SET_SKILLS } from '@constants';

import { SkillMapByOrganizationInfo } from '@interfaces/skills';

import { getLastChar } from '@utils';

interface SkillSettingProps {
  myPageSkillList: SkillMapByOrganizationInfo[] | undefined;
  setSkillIdToUpdate: React.Dispatch<React.SetStateAction<number | null>>;
  setOpenSetSkillModal: React.Dispatch<React.SetStateAction<boolean>>;
  setConfirmDeleteSkillInfo: React.Dispatch<
    React.SetStateAction<SkillMapByOrganizationInfo | null>
  >;
  setOpenConfirmDeleteSkillModal: React.Dispatch<React.SetStateAction<boolean>>;
}

export const SkillSetting = ({
  myPageSkillList,
  setSkillIdToUpdate,
  setOpenSetSkillModal,
  setConfirmDeleteSkillInfo,
  setOpenConfirmDeleteSkillModal,
}: SkillSettingProps) => {
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
          className={`w-10 h-10 cursor-pointer`}
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

  return (
    <div className="flex item-center gap-[14px]">
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
            strokeColor = '#3DC1E2';
            break;
          case 2:
            strokeColor = '#228CDB';
            break;
          case 3:
            strokeColor = '#355AC9';
            break;
        }
        if (stepCompleted) {
          strokeColor = '#D2DBE1';
        } else if (isLocked || progressPercent == 0) {
          strokeColor = '#EBF1F7';
        }

        return (
          <Popover className="relative z-[50]" key={skill.id}>
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
                      className="w-[245px] h-[55px] relative bg-white px-5 py-3 flex items-center gap-[10px] justify-center rounded-[14px]">
                      {showTwinklingStars &&
                        !skill.skill.deletedAt &&
                        !skill.isDeleted && (
                          <>
                            <div className="absolute -top-[20px] left-[20px] bg-primary rounded-[20px] w-[140px] h-[20px] flex items-center justify-center">
                              <p className="text-white text-xs font-bold leading-none">
                                レベルアップ申請可能
                              </p>
                            </div>
                            <div className="bg-primary absolute clip-diagonal-left h-[7px] w-[7px] top-0 left-[38px]"></div>
                          </>
                        )}

                      {showTwinklingStars &&
                        !skill.skill.deletedAt &&
                        !skill.isDeleted && (
                          <>
                            <TwinklingIcon
                              className="absolute top-[-10px] left-[-10px]"
                              delay={0}
                              iconUrl="/icons/blue-star.svg"
                            />
                            <TwinklingIcon
                              className="absolute top-[5px] right-[-15px]"
                              delay={0.5}
                              iconUrl="/icons/blue-star.svg"
                            />
                            <TwinklingIcon
                              className="absolute top-[-15px] right-[5px]"
                              delay={0.8}
                              iconUrl="/icons/blue-star.svg"
                            />
                            <TwinklingIcon
                              className="absolute bottom-[5px] left-[-15px]"
                              delay={1}
                              iconUrl="/icons/blue-star.svg"
                            />
                            <TwinklingIcon
                              className="absolute bottom-[-15px] left-[5px]"
                              delay={1.2}
                              iconUrl="/icons/blue-star.svg"
                            />
                            <TwinklingIcon
                              className="absolute bottom-[-10px] right-[-10px]"
                              delay={1.5}
                              iconUrl="/icons/blue-star.svg"
                            />
                          </>
                        )}

                      <div className="w-fit h-fit">
                        <p className="max-w-[150px] truncate text-[15px] text-left font-medium leading-none">
                          {skill.skill.name}
                        </p>
                        <div
                          className={`w-[156px] mt-[5px] ${skill.skill.deletedAt ? 'invisible' : ''} ${skill.isDeleted ? 'invisible' : ''}`}>
                          <SkillMapProgressBar
                            value={progressPercent}
                            strokeColor={strokeColor}
                            trailColor={stepCompleted ? '#D2DBE1' : '#EBF1F7'}
                            height="6px"
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
                  </PopoverButton>
                  <Transition
                    as={Fragment}
                    enter="transition ease-out duration-200"
                    enterFrom="opacity-0 translate-y-1"
                    enterTo="opacity-100 translate-y-0"
                    leave="transition ease-in duration-150"
                    leaveFrom="opacity-100 translate-y-0"
                    leaveTo="opacity-0 translate-y-1">
                    <PopoverPanel className="absolute left-0 z-30 min-w-[155px] max-w-[155px] transform">
                      <div className="bg-white !border-primary border-[1px] text-black rounded-[6px] mt-[6px] p-1 text-sm font-medium text-center">
                        <p
                          className="hover:cursor-pointer py-[12px] border-b-[1px] border-[#EBF1F7] !leading-none"
                          onClick={() => {
                            setSkillIdToUpdate(skill.id);
                            setOpenSetSkillModal(true);
                            close();
                          }}>
                          スキル変更
                        </p>
                        <p
                          className="hover:cursor-pointer py-[12px] !leading-none"
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
      {/* Skill creation button */}
      {myPageSkillList && myPageSkillList.length < MAX_MY_PAGE_SET_SKILLS ? (
        <div
          style={{
            boxShadow: '0px 0px 7px 0px #00000080',
          }}
          className="w-[245px] min-w-[245px] h-[52.5px]  bg-transparent border border-white rounded-[14px] hover:opacity-70 flex items-center cursor-pointer justify-center text-white text-center font-medium text-sm"
          onClick={() => setOpenSetSkillModal(true)}>
          <p className="font-medium">＋ スキルをセットできます</p>
        </div>
      ) : (
        <></>
      )}
    </div>
  );
};
