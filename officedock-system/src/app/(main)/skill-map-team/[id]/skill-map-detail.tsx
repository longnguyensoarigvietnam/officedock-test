'use client';
import { useState } from 'react';
import { AxiosError } from 'axios';

import { StepInfoTooltip } from '@components/tooltip/StepInfoTooltip';
import ImageRound from '@components/common/ImageRound';
import { TwinklingIcon } from '@components/common/TwinklingIcon';
import ViewSkillMapCommentModal from '@components/modals/ViewSkillMapCommentModal';
import { SkillMapProgressBar } from '@components/common/ProgressBar/SkillMapProgressBar';

import {
  SkillMapByOrganization,
  SkillMapByOrganizationInfo,
  SkillMapComment,
} from '@interfaces/skills';

import { getLastChar } from '@utils';

import { SKILL_MAP_LEVEL_COUNT } from '@constants';
import { ERROR_COMMON_MESSAGE } from '@constants/message';

import { useErrorToast } from '@hooks/useErrorToast';
import useSkillMapComment from '@hooks/useSkillMapComment';

interface SkillMapDetailByUserProps {
  detailSkillData: SkillMapByOrganization[];
}

export const SkillMapDetailByUser = ({
  detailSkillData,
}: SkillMapDetailByUserProps) => {
  const showErrorToast = useErrorToast();
  // View comment
  const [openSkillMapCommentModal, setOpenSkillMapCommentModal] =
    useState<boolean>(false);
  const [skillMapCommentList, setSkillMapCommentList] = useState<
    SkillMapComment[]
  >([]);
  const [selectedSkillMapToViewComment, setSelectedSkillMapToViewComment] =
    useState<number | null>(null);

  useSkillMapComment({
    skillMapId: Number(selectedSkillMapToViewComment),
    onSuccess: (data) => {
      setSkillMapCommentList(data);
      setOpenSkillMapCommentModal(true);
    },
    onError: (error: AxiosError) => {
      showErrorToast(error, ERROR_COMMON_MESSAGE);
    },
  });

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
          className="w-[51px] h-[40px]"
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
          className="w-[60px] h-[60px]"
        />
      );
    }

    // 3. Not completed → Show level and icons
    const renderStepIcons = () => {
      switch (step) {
        case 1:
          return (
            <div className="flex justify-center gap-1">
              {Array.from({ length: SKILL_MAP_LEVEL_COUNT }).map((_, i) => (
                <ImageRound
                  key={i}
                  name="Coin"
                  src={i < level ? '/icons/coin.svg' : '/icons/gray-coin.svg'}
                  className="w-[14px] h-[14px]"
                />
              ))}
            </div>
          );
        case 2:
          return (
            <div className="flex justify-center gap-1">
              {Array.from({ length: SKILL_MAP_LEVEL_COUNT }).map((_, i) => (
                <ImageRound
                  key={i}
                  name="Diamond"
                  src={
                    i < level ? '/icons/diamond.svg' : '/icons/gray-diamond.svg'
                  }
                  className="w-[14px] h-[14px]"
                />
              ))}
            </div>
          );
        case 3:
          return (
            <div className="flex justify-center gap-1">
              {Array.from({ length: SKILL_MAP_LEVEL_COUNT }).map((_, i) => (
                <ImageRound
                  key={i}
                  name="Crown"
                  src={i < level ? '/icons/crown.svg' : '/icons/gray-crown.svg'}
                  className="w-[14px] h-[14px]"
                />
              ))}
            </div>
          );
        default:
          return null;
      }
    };

    const renderLevelText = () => (
      <div className="flex gap-[2px] items-baseline">
        <p className="text-sm font-medium leading-[1]">Lv.</p>
        <p className="text-[30px] font-medium leading-[1]">{level}</p>
      </div>
    );

    return (
      <div className="flex flex-col items-center">
        {renderStepIcons()}
        {renderLevelText()}
      </div>
    );
  };

  const normalizeSkillMaps = (
    skillMaps: SkillMapByOrganizationInfo[][],
  ): SkillMapByOrganizationInfo[][] => {
    return skillMaps.map((skillMap) => {
      const skillSteps = ['1', '2', '3'];

      // Fill missing steps
      const filledSkillMap = skillSteps.map((step) => {
        // Check if the skillMap contains the step
        const skill = skillMap.find((skill) => {
          return skill.skill.step == `ステップ${step}`;
        });

        // If not found, return an empty object to fill the step
        if (!skill) {
          return {
            id: null,
            skill: {
              id: null,
              name: `ステップ${step}-Empty`,
              description: '',
              step: step,
            },
            isComplete: false,
            step: step,
            isLocked: false,
            isHaveComment: false,
            progressPercent: 0,
            level: {
              id: null,
              skillMap: null,
              level: '',
              measureCount: null,
              actualMeasureCount: null,
              measureTime: null,
              actualMeasureTime: null,
              startLookbackAt: null,
              nextSubmitAt: null,
              lookBackInterval: 0,
              lookBackType: '',
              items: [],
              isComplete: false,
            },
          };
        }

        // Return the existing skill if found
        return skill;
      });
      return filledSkillMap;
    });
  };

  return (
    <div>
      {detailSkillData.length > 0 &&
        detailSkillData.map((skillMap, index) => (
          <div
            key={index}
            className="w-full py-5 px-10 bg-[#F8FAFC] rounded-[30px] mb-6"
            style={{ boxShadow: '0px 4px 10px 0px #0000000D' }}>
            <p className="text-[#77858F] text-[16px] font-medium mb-4 max-w-[100%] break-all">
              {skillMap.organizationName}
            </p>

            <div>
              <div className="flex w-full font-medium text-white text-[16px] mb-5 h-[32px]">
                <StepInfoTooltip
                  placement="top"
                  currentStep={1}
                  stepDefinition={skillMap.steps.step1}>
                  <div className="w-[calc(33.33333%_+_25px)] rounded-l-[6px] bg-[#3DC1E2] relative clip-left  text-center flex items-center justify-center">
                    STEP 1
                  </div>
                </StepInfoTooltip>

                <StepInfoTooltip
                  placement="top"
                  currentStep={2}
                  stepDefinition={skillMap.steps.step2}>
                  <div className="w-[calc(33.33333%_+_40px)] ml-[-8.5px] bg-primary relative clip-middle text-center flex items-center justify-center">
                    STEP 2
                  </div>
                </StepInfoTooltip>

                <StepInfoTooltip
                  placement="top"
                  currentStep={3}
                  stepDefinition={skillMap.steps.step3}>
                  <div className="w-[calc(33.33333%_+_10px)] rounded-r-[6px] ml-[-9px] bg-[#355AC9] relative clip-right text-center flex items-center justify-center">
                    STEP 3
                  </div>
                </StepInfoTooltip>
              </div>

              {normalizeSkillMaps(skillMap.skillMaps).map(
                (skillMapDetail: SkillMapByOrganizationInfo[], index) => {
                  return (
                    <div
                      key={index}
                      className="flex w-full mb-5 bg-[#E9EEF3] rounded-[20px] p-[10px]">
                      {skillMapDetail.map((skill, idx) => {
                        const isLast = idx === skillMapDetail.length - 1;
                        const isLocked = skill.isLocked;
                        const step = skill.skill.step
                          ? Number(getLastChar(skill.skill.step))
                          : 1;
                        const stepCompleted = skill.isComplete;
                        const level = skill.level?.level
                          ? Number(getLastChar(skill.level?.level))
                          : 1;
                        const hasComment = skill.isHaveComment;
                        const progressPercent = skill?.progressPercent || 0;
                        const showTwinklingStars =
                          skill?.progressPercent == 100 &&
                          !stepCompleted &&
                          !skill.skill.deletedAt;

                        let strokeColor = '';
                        switch (step) {
                          case 1:
                            strokeColor = '#36ACDE';
                            break;
                          case 2:
                            strokeColor = '#0068B6';
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
                          <div
                            key={skill.id ?? `${index}-${idx}`}
                            className={`relative ${isLocked && 'hover:cursor-not-allowed'} flex items-center ${isLast ? 'w-[calc(33.33333%_-_30px)]' : 'w-[calc(33.33333%_+_15px)]'}`}>
                            {!skill.id ? (
                              <div className="px-5 h-[90px] bg-white w-full rounded-[14px]"></div>
                            ) : (
                              <div
                                className="px-5 h-[90px] flex gap-3 bg-white items-center w-full rounded-[14px] relative"
                                style={{
                                  boxShadow:
                                    showTwinklingStars && !skillMap.isDeleted
                                      ? '0px 0px 20px 0px #36ACDE80'
                                      : '0px 2px 8px 0px #0000001A',
                                }}>
                                {showTwinklingStars && !skillMap.isDeleted && (
                                  <>
                                    <div className="absolute -top-[20px] left-[20px] bg-primary rounded-[20px] w-[140px] h-[28px] flex items-center justify-center">
                                      <p className="text-white text-xs font-bold">
                                        レベルアップ申請可能
                                      </p>
                                    </div>
                                    <div className="bg-primary absolute clip-diagonal-left h-3 w-3 top-[3px] left-[38px]"></div>
                                  </>
                                )}
                                {showTwinklingStars && !skillMap.isDeleted && (
                                  <div>
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
                                  </div>
                                )}

                                <div className="w-[calc(100%_-_72px)]">
                                  <div className="flex justify-between items-center mb-[21px]">
                                    <p
                                      className={`text-[16px] font-medium max-w-[calc(100%_-_20px)] line-clamp-1 break-all ${stepCompleted ? 'text-[#B3B3B3]' : 'text-black'}`}>
                                      {skill.skill?.name}
                                    </p>
                                    {hasComment ? (
                                      <ImageRound
                                        name="Comment"
                                        src={'/icons/comment.svg'}
                                        className="w-[16px] h-[14px] hover:cursor-pointer"
                                        onClick={(e) => {
                                          if (skillMap.isDeleted) return;
                                          e.stopPropagation();
                                          setSelectedSkillMapToViewComment(
                                            skill.id,
                                          );
                                        }}
                                      />
                                    ) : (
                                      <div className="w-[16px]"></div>
                                    )}
                                  </div>

                                  <div
                                    className={`${skillMap.isDeleted && 'invisible'} ${skill.skill.deletedAt && 'invisible'}`}>
                                    <SkillMapProgressBar
                                      value={progressPercent}
                                      strokeColor={strokeColor}
                                      trailColor={
                                        stepCompleted ? '#D2DBE1' : '#EBF1F7'
                                      }
                                    />
                                  </div>
                                </div>
                                <div className="w-[60px] flex justify-end">
                                  {' '}
                                  {renderTreasureForStep(
                                    Boolean(isLocked),
                                    step,
                                    Boolean(stepCompleted),
                                    level,
                                  )}
                                </div>

                                {/* Gray overlay if locked */}
                                {isLocked && (
                                  <div className="absolute inset-0 bg-[#203D5480] bg-opacity-50 rounded-[14px] pointer-events-none">
                                    <div className="text-white flex items-center justify-center h-full gap-2">
                                      <ImageRound
                                        name="Lock"
                                        src={'/icons/white-lock.svg'}
                                        className="w-[30px] h-[30px] cursor-pointer"
                                      />
                                      <p className="font-medium text-[16px]">
                                        STEP {step} を未解放
                                      </p>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}

                            {!isLast && (
                              <div
                                style={{
                                  background: skillMapDetail[idx + 1].isLocked
                                    ? '#D2DBE1'
                                    : !skillMapDetail[idx + 1].id || !skill.id
                                      ? '#FFF'
                                      : idx === 0
                                        ? 'linear-gradient(90deg, #36ACDE 0%, #0068B6 100%)'
                                        : 'linear-gradient(90deg, #0068B6 0%, #355AC9 100%)',
                                }}
                                className="h-[10px] w-[30px]"></div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                },
              )}
            </div>
          </div>
        ))}

      {openSkillMapCommentModal && (
        <ViewSkillMapCommentModal
          open={openSkillMapCommentModal}
          skillMapCommentList={skillMapCommentList}
          onClose={() => {
            setSelectedSkillMapToViewComment(null);
            setSkillMapCommentList([]);
            setOpenSkillMapCommentModal(false);
          }}
        />
      )}
    </div>
  );
};
