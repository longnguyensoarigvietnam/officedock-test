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
          className={`w-[4.49vh] h-[4.49vh] cursor-pointer`}
        />
      );
    }

    const renderLevelText = () => (
      <div className="flex gap-[0.14vw] items-baseline">
        <p className="text-[1.04vw] font-medium">Lv.</p>
        <p className="text-[1.8vw] font-medium">{level}</p>
      </div>
    );

    return (
      <div className="flex flex-col items-center">{renderLevelText()}</div>
    );
  };

  return (
    <div className="flex item-center gap-[0.97vw]">
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
                      className="w-[17.01vw] h-[6.18vh] relative bg-white px-[1.39vw] py-[1.35vh] flex items-center gap-[0.69vw] justify-center rounded-[14px]">
                      {showTwinklingStars && (
                        <>
                          <div className="absolute -top-[1.3vw] left-[1.4vw] bg-primary rounded-[1.4vw] w-[8.75vw] h-[1.32vw] flex items-center justify-center">
                            <p className="text-white text-[0.76vw] font-bold leading-none">
                              レベルアップ申請可能
                            </p>
                          </div>
                          <div className="bg-primary absolute clip-diagonal-left h-[0.49vw] w-[0.49vw] top-0 left-[2.8vw]"></div>
                        </>
                      )}

                      {showTwinklingStars && (
                        <>
                          <TwinklingIcon
                            className="absolute top-[0.69vw] left-[-0.21vw] w-[0.3vw] h-[0.3vw]"
                            delay={0}
                            iconUrl="/icons/blue-star.svg"
                          />
                          <TwinklingIcon
                            className="absolute top-[0.21vw] left-[0.35vw] w-[0.3vw] h-[0.3vw]"
                            delay={0.5}
                            iconUrl="/icons/blue-star.svg"
                          />
                          <TwinklingIcon
                            className="absolute top-[0.69vw] -right-[0.21vw] w-[0.3vw] h-[0.3vw]"
                            delay={0.8}
                            iconUrl="/icons/blue-star.svg"
                          />
                          <TwinklingIcon
                            className="absolute bottom-[0.35vw] left-[-0.21vw] w-[0.3vw] h-[0.3vw]"
                            delay={1}
                            iconUrl="/icons/blue-star.svg"
                          />
                          <TwinklingIcon
                            className="absolute bottom-[0.35vw] -right-[0.21vw] w-[0.3vw] h-[0.3vw]"
                            delay={1.2}
                            iconUrl="/icons/blue-star.svg"
                          />
                          <TwinklingIcon
                            className="absolute -bottom-[0.21vw] right-[0.35vw] w-[0.3vw] h-[0.3vw]"
                            delay={1.5}
                            iconUrl="/icons/blue-star.svg"
                          />
                        </>
                      )}

                      <div className="w-fit h-fit">
                        <p className="max-w-[10.4vw] truncate text-[1.04vw] text-left font-medium leading-none">
                          {skill.skill.name}
                        </p>
                        <div className="w-[10.83vw] mt-[0.35vw]">
                          <SkillMapProgressBar
                            value={progressPercent}
                            strokeColor={strokeColor}
                            trailColor={stepCompleted ? '#D2DBE1' : '#EBF1F7'}
                            height="0.42vw"
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
                    <PopoverPanel className="absolute left-0 z-10 min-w-[155px] max-w-[155px] transform">
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
            boxShadow: '0px 0px 0.49vw 0px #00000080',
          }}
          className="w-[17.01vw] min-w-[17.01vw] h-[6.18vh]  bg-transparent border border-white rounded-[14px] hover:opacity-70 flex items-center cursor-pointer justify-center text-white text-center font-medium text-[1vw]"
          onClick={() => setOpenSetSkillModal(true)}>
          <p className="font-medium">＋ スキルをセットできます</p>
        </div>
      ) : (
        <></>
      )}
    </div>
  );
};
