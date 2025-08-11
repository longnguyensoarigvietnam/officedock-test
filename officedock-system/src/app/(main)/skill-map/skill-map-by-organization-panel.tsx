import { useRef, useState } from 'react';
import { useMutation, useQueryClient } from 'react-query';
import { AxiosError } from 'axios';

import ImageRound from '@components/common/ImageRound';
import { SkillMapProgressBar } from '@components/common/ProgressBar/SkillMapProgressBar';
import { TwinklingStar } from '@components/common/TwinklingStar';
import SubmitLevelUpModal from '@components/modals/SubmitLevelUpModal';
import ViewSkillMapCommentModal from '@components/modals/ViewSkillMapCommentModal';
import { StepInfoTooltip } from '@components/tooltip/StepInfoTooltip';

import { ActionsModal, ScreenName, SubmitLevelStatus } from '@constants/enums';
import { apiRouters } from '@constants/routers';
import { ERROR_SAVE_MESSAGE, SUCCESS_SAVE_MESSAGE } from '@constants/message';
import { SKILL_MAP_LEVEL_COUNT } from '@constants';

import useSkillMapComment from '@hooks/useSkillMapComment';
import useSkillMapLevelUp from '@hooks/useSkillMapLevelUp';
import { useErrorToast } from '@hooks/useErrorToast';

import {
  SkillMapByOrganization,
  SkillMapByOrganizationInfo,
  SkillMapComment,
  SkillMapLevelUp,
  SubmitLevelUpRequest,
} from '@interfaces/skills';

import { useToast } from '@providers/ToastProvider';

import { getLastChar } from '@utils';

import api from '@base/api';

interface SkillMapByOrganizationPanelProps {
  skillMapDetail: SkillMapByOrganization;
  userId: number;
  settingSkillAction?: ActionsModal;
  onOpenConfirmSettingSkillInfo:
    | ((skill: SkillMapByOrganizationInfo) => void)
    | undefined;
  onEditSettingSkill?: (skillId: string) => Promise<void>;
}

export const SkillMapByOrganizationPanel = ({
  skillMapDetail,
  userId,
  settingSkillAction,
  onOpenConfirmSettingSkillInfo,
  onEditSettingSkill,
}: SkillMapByOrganizationPanelProps) => {
  const showErrorToast = useErrorToast();
  const { showToast } = useToast();

  const queryClient = useQueryClient();

  // View comment
  const [openSkillMapCommentModal, setOpenSkillMapCommentModal] =
    useState<boolean>(false);
  const [skillMapCommentList, setSkillMapCommentList] = useState<
    SkillMapComment[]
  >([]);
  const [selectedSkillMapToViewComment, setSelectedSkillMapToViewComment] =
    useState<number | null>(null);

  // Submit level
  const [openSubmitLevelUpModal, setOpenSubmitLevelUpModal] =
    useState<boolean>(false);
  const [selectedSkillMapToSubmitLevelUp, setSelectedSkillMapToSubmitLevelUp] =
    useState<number | null>(null);
  const [submitLevelUpDetail, setSubmitLevelUpDetail] = useState<
    (SkillMapLevelUp & { staffId: number }) | null
  >(null);
  const [isSuccessSubmitLevelUp, setIsSuccessSubmitLevelUp] =
    useState<boolean>(false);

  // Refs
  const isEditingRef = useRef(false);
  const isSubmittingRef = useRef(false);

  useSkillMapComment({
    skillMapId: Number(selectedSkillMapToViewComment),
    onSuccess: (data: SkillMapComment[]) => {
      setSkillMapCommentList(
        data.sort((preComment, nextComment) => preComment.id - nextComment.id),
      );
      setOpenSkillMapCommentModal(true);
    },
  });

  useSkillMapLevelUp({
    skillMapId: Number(selectedSkillMapToSubmitLevelUp),
    onSuccess: (data) => {
      if (Object.keys(data).length) {
        setSubmitLevelUpDetail({
          ...data,
          staffId: userId,
        });
        setOpenSubmitLevelUpModal(true);
        if (data.isApplying) {
          setIsSuccessSubmitLevelUp(true);
        }
      } else {
        setSelectedSkillMapToSubmitLevelUp(null);
        queryClient.invalidateQueries({
          predicate: (query) => query.queryKey[0] === 'getSkillMapInfo',
        });
      }
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
          className={`${!settingSkillAction ? 'w-[60px] h-[60px]' : 'w-[50px] h-[50px]'} cursor-pointer`}
        />
      );
    }

    // 3. Not completed → Show level and icons
    const renderStepIcons = () => {
      switch (step) {
        case 1:
          return (
            <div className="flex justify-center pt-1 gap-1">
              {Array.from({ length: SKILL_MAP_LEVEL_COUNT }).map((_, i) => (
                <ImageRound
                  key={i}
                  name="Coin"
                  src={i < level ? '/icons/coin.svg' : '/icons/gray-coin.svg'}
                  className="w-[14px] h-[14px] cursor-pointer"
                />
              ))}
            </div>
          );
        case 2:
          return (
            <div className="flex justify-center pt-1 gap-1">
              {Array.from({ length: SKILL_MAP_LEVEL_COUNT }).map((_, i) => (
                <ImageRound
                  key={i}
                  name="Diamond"
                  src={
                    i < level ? '/icons/diamond.svg' : '/icons/gray-diamond.svg'
                  }
                  className="w-[14px] h-[14px] cursor-pointer"
                />
              ))}
            </div>
          );
        case 3:
          return (
            <div className="flex justify-center pt-1 gap-1">
              {Array.from({ length: SKILL_MAP_LEVEL_COUNT }).map((_, i) => (
                <ImageRound
                  key={i}
                  name="Crown"
                  src={i < level ? '/icons/crown.svg' : '/icons/gray-crown.svg'}
                  className="w-[14px] h-[14px] cursor-pointer"
                />
              ))}
            </div>
          );
        default:
          return null;
      }
    };

    const renderLevelText = () => (
      <div className="flex gap-1 items-baseline">
        <p className="text-sm font-medium">Lv.</p>
        <p className="text-[30px] font-medium">{level}</p>
      </div>
    );

    return (
      <div className="flex flex-col items-center">
        {!settingSkillAction && renderStepIcons()}
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

  const handleConfirmSubmitLevelUp = (data: SubmitLevelUpRequest) => {
    if (data.submitLevel) {
      if (isEditingRef.current) return;
      editSubmittedLevelUp(data);
    } else {
      if (isSubmittingRef.current) return;
      submitLevelUp(data);
    }
  };

  // Call API to edit submitted level up
  const handleEditSubmittedLevelUp = async (data: SubmitLevelUpRequest) => {
    const { data: response } = await api.put(
      `${apiRouters.SUBMIT_LEVELS_DETAIL(Number(data.submitLevel))}?current_screen=${ScreenName.MY_TASK_SKILL_MAP}`,
      { status: SubmitLevelStatus.PENDING, approverId: data.approverId },
    );
    return response;
  };

  const { mutate: editSubmittedLevelUp } = useMutation(
    'editSubmittedLevelUp',
    handleEditSubmittedLevelUp,
    {
      onMutate: () => {
        isEditingRef.current = true;
      },
      onSuccess: () => {
        setIsSuccessSubmitLevelUp(true);
        isEditingRef.current = false;
      },
      onError: (error: AxiosError) => {
        showErrorToast(error, ERROR_SAVE_MESSAGE);
        isEditingRef.current = false;
      },
      onSettled: () => {},
    },
  );

  // Call API to submit level up
  const handleSubmitLevelUp = async (data: SubmitLevelUpRequest) => {
    const { data: response } = await api.post(
      `${apiRouters.SUBMIT_LEVELS_LIST}?current_screen=${ScreenName.MY_TASK_SKILL_MAP}`,
      data,
    );
    return response;
  };

  const { mutate: submitLevelUp } = useMutation(
    'submitLevelUp',
    handleSubmitLevelUp,
    {
      onMutate: () => {
        isSubmittingRef.current = true;
      },
      onSuccess: () => {
        setIsSuccessSubmitLevelUp(true);
        isSubmittingRef.current = false;
      },
      onError: (error: AxiosError) => {
        showErrorToast(error, ERROR_SAVE_MESSAGE);
        isSubmittingRef.current = false;
      },
      onSettled: () => {},
    },
  );

  // Call API to save level up draft
  const { mutate: saveLevelUpDraft } = useMutation(
    'handleSaveLevelUpDraft',
    handleSubmitLevelUp,
    {
      onSuccess: () => {
        setOpenSubmitLevelUpModal(false);
        setSelectedSkillMapToSubmitLevelUp(null);
        setSubmitLevelUpDetail(null);
        setIsSuccessSubmitLevelUp(false);
        showToast({
          variant: 'success',
          description: SUCCESS_SAVE_MESSAGE,
        });
      },
      onError: (error: AxiosError) => {
        showErrorToast(error, ERROR_SAVE_MESSAGE);
      },
      onSettled: () => {},
    },
  );

  return (
    <div
      className={`w-full py-5 ${settingSkillAction ? 'px-4' : 'px-10'} bg-[#F8FAFC] rounded-[30px] mb-6`}
      style={{ boxShadow: '0px 4px 10px 0px #0000000D' }}>
      <p className="text-[#77858F] text-[16px] font-medium mb-4 max-w-[100%] break-all">
        {skillMapDetail.organizationName}
      </p>

      <div>
        {/* Steps bar */}
        <div className="flex w-full font-medium text-white text-[16px] mb-5 h-[32px]">
          <StepInfoTooltip
            placement="top"
            currentStep={1}
            stepDefinition={skillMapDetail.steps.step1}>
            <div className="w-[calc(33.33333%_+_16px)] rounded-l-[6px] bg-[#3DC1E2] relative clip-left  text-center flex items-center justify-center">
              STEP 1
            </div>
          </StepInfoTooltip>

          <StepInfoTooltip
            placement="top"
            currentStep={2}
            stepDefinition={skillMapDetail.steps.step2}>
            <div className="w-[calc(33.33333%_+_34px)] ml-[-8.5px] bg-primary relative clip-middle text-center flex items-center justify-center">
              STEP 2
            </div>
          </StepInfoTooltip>

          <StepInfoTooltip
            placement="top"
            currentStep={3}
            stepDefinition={skillMapDetail.steps.step3}>
            <div className="w-[calc(33.33333%_+_16px)] rounded-r-[6px] ml-[-9px] bg-[#355AC9] relative clip-right text-center flex items-center justify-center">
              STEP 3
            </div>
          </StepInfoTooltip>
        </div>

        {normalizeSkillMaps(skillMapDetail.skillMaps).map(
          (skillMap: SkillMapByOrganizationInfo[], index) => {
            return (
              <div
                key={index}
                className="flex w-full mb-5 bg-[#E9EEF3] rounded-[20px] p-[10px]">
                {skillMap.map((skill, idx) => {
                  const isLast = idx === skillMap.length - 1;
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
                      key={skill.id ?? `${index}-${idx}`}
                      className={`relative hover:cursor-pointer flex items-center ${isLast ? 'w-[calc(33.33333%_-_30px)]' : 'w-[calc(33.33333%_+_15px)]'}`}
                      onClick={async () => {
                        if (stepCompleted || isLocked) return;

                        if (settingSkillAction === ActionsModal.CREATE) {
                          onOpenConfirmSettingSkillInfo &&
                            onOpenConfirmSettingSkillInfo(skill);
                          return;
                        }

                        if (settingSkillAction === ActionsModal.EDIT) {
                          onEditSettingSkill &&
                            onEditSettingSkill(String(skill.id));

                          return;
                        }

                        setSelectedSkillMapToSubmitLevelUp(skill.id);
                        setOpenSubmitLevelUpModal(true);
                      }}>
                      {!skill.id ? (
                        <div
                          className={`${settingSkillAction ? 'px-5 h-[55px]' : 'px-5 h-[90px]'} bg-white w-full rounded-[14px]`}></div>
                      ) : (
                        <div
                          className={`${settingSkillAction ? 'px-5 h-[55px]' : 'px-5 h-[90px]'} flex gap-3 bg-white items-center w-full rounded-[14px] relative`}
                          style={{
                            boxShadow: showTwinklingStars
                              ? '0px 0px 20px 0px #36ACDE80'
                              : '0px 2px 8px 0px #0000001A',
                          }}>
                          {showTwinklingStars && (
                            <>
                              <div className="absolute -top-[20px] left-[20px] bg-primary rounded-[20px] w-[140px] h-[28px] flex items-center justify-center">
                                <p className="text-white text-xs font-bold">
                                  レベルアップ申請可能
                                </p>
                              </div>
                              <div className="bg-primary absolute clip-diagonal-left h-3 w-3 top-[3px] left-[38px]"></div>
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

                          <div className="w-[calc(100%_-_72px)]">
                            <div
                              className={`flex justify-between items-start ${settingSkillAction ? 'mb-1' : 'mb-4'}`}>
                              <p
                                className={`text-[16px] font-medium ${settingSkillAction ? 'max-w-[calc(100%_-_5px)]' : 'max-w-[calc(100%_-_20px)]'} line-clamp-1 break-all ${stepCompleted ? 'text-[#B3B3B3]' : 'text-black'}`}>
                                {skill.skill?.name}
                              </p>
                              {!settingSkillAction && hasComment ? (
                                <ImageRound
                                  name="Comment"
                                  src={'/icons/comment.svg'}
                                  className="w-[16px] h-[14px] cursor-pointer"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedSkillMapToViewComment(skill.id);
                                  }}
                                />
                              ) : (
                                <div className="w-[16px]"></div>
                              )}
                            </div>

                            <div>
                              <SkillMapProgressBar
                                value={progressPercent}
                                strokeColor={strokeColor}
                                trailColor={
                                  stepCompleted ? '#D2DBE1' : '#EBF1F7'
                                }
                                height={settingSkillAction ? '6px' : '10px'}
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
                            <div className="absolute inset-0 bg-[#203D5480] bg-opacity-50 rounded-[6px] pointer-events-none">
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
                            background: skillMap[idx + 1].isLocked
                              ? '#D2DBE1'
                              : !skillMap[idx + 1].id || !skill.id
                                ? '#FFF'
                                : idx === 0
                                  ? 'linear-gradient(90deg, #36ACDE 0%, #0068B6 100%)'
                                  : 'linear-gradient(90deg, #0068B6 0%, #424EC1 100%)',
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

      {/* View skill map comments modal */}
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

      {/* Open submit level up modal */}
      {openSubmitLevelUpModal && submitLevelUpDetail && (
        <SubmitLevelUpModal
          open={openSubmitLevelUpModal}
          submitLevelUpDetail={submitLevelUpDetail}
          isSuccessSubmitLevelUp={isSuccessSubmitLevelUp}
          onCloseAndSave={(data) => saveLevelUpDraft(data)}
          onClose={() => {
            setOpenSubmitLevelUpModal(false);
            setSelectedSkillMapToSubmitLevelUp(null);
            setSubmitLevelUpDetail(null);
            setIsSuccessSubmitLevelUp(false);
          }}
          onSubmitLevelUp={(data) => handleConfirmSubmitLevelUp(data)}
        />
      )}
    </div>
  );
};
