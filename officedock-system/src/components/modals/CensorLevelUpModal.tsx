'use client';
import { Dispatch, memo, SetStateAction, useEffect, useState } from 'react';

import Modal from '@components/common/Modal';
import ImageRound from '@components/common/ImageRound';
import Button from '@components/common/Button';
import CustomUserAvatar from '@components/common/AvatarIcon/CustomUserAvatar';
import Checkbox from '@components/common/Checkbox';
import TextArea from '@components/common/TextArea';
import RadioButton from '@components/common/RadioButton';
import Input from '@components/common/Input';
import Dropdown from '@components/common/Dropdown';

import { CensorSubmittedLevelRequest, SubmitLevel } from '@interfaces/skills';

import {
  LevelUpConditionBy,
  SkillMapLookBackType,
  SkillMapTypeInterval,
  SubmitLevelStatus,
} from '@constants/enums';
import { ONLY_DIGITS_REGEX } from '@constants/regex';
import { LEVEL_UP_PERIOD_OPTIONS, SKILL_MAP_STEPS } from '@constants';

import { getLastChar } from '@utils';

export type CensorLevelUpModalProps = {
  open: boolean;
  submitLevelUpDetail: SubmitLevel;
  selectRejectOption: boolean | null;
  setSelectRejectOption: Dispatch<SetStateAction<boolean | null>>;
  onSubmit: (data: CensorSubmittedLevelRequest) => void;
  onClose: () => void;
};

const CensorLevelUpModal = memo(
  ({
    open,
    submitLevelUpDetail,
    selectRejectOption,
    setSelectRejectOption,
    onSubmit,
    onClose,
  }: CensorLevelUpModalProps) => {
    const [itemStatusList, setItemStatusList] = useState<
      {
        item: string;
        isChecked: boolean;
        id: number;
      }[]
    >(
      submitLevelUpDetail.skillMapSkillLevel.items
        ? submitLevelUpDetail.skillMapSkillLevel.items.map((item, index) => {
            return {
              item: item.item,
              isChecked: false,
              id: index,
            };
          })
        : [],
    );
    const [currentStep, setCurrentStep] = useState<number>(1);

    const [comment, setComment] = useState<string>('');
    const [levelUpConditionBy, setLevelUpConditionBy] =
      useState<LevelUpConditionBy>(LevelUpConditionBy.NUMBER_OF_TIMES);
    const [measureCount, setMeasureCount] = useState<number | null>(null);
    const [measureTime, setMeasureTime] = useState<number | null>(null);
    const [lookBackInterval, setLookBackInterval] = useState<number | null>(
      null,
    );
    const [lookBackType, setLookBackType] =
      useState<SkillMapLookBackType | null>(null);
    const [showLookBackIntervalErr, setShowLookBackIntervalErr] =
      useState<boolean>(false);
    const [showLookBackTypeErr, setShowLookBackTypeErr] =
      useState<boolean>(false);

    const resetMeasureFieldsWhenChangeRadioBtn = () => {
      setMeasureCount(null);
      setMeasureTime(null);
      setLookBackInterval(null);
      setLookBackType(null);
    };

    useEffect(() => {
      if (submitLevelUpDetail) {
        setMeasureCount(submitLevelUpDetail.skillMapSkillLevel.measureCount);
        setMeasureTime(submitLevelUpDetail.skillMapSkillLevel.measureTime);
        setLookBackInterval(
          submitLevelUpDetail.skillMapSkillLevel.lookBackInterval,
        );
        setLookBackType(
          submitLevelUpDetail.skillMapSkillLevel
            .lookBackType as SkillMapLookBackType,
        );
        if (submitLevelUpDetail.skillMapSkillLevel.measureCount != null) {
          setLevelUpConditionBy(LevelUpConditionBy.NUMBER_OF_TIMES);
        } else if (submitLevelUpDetail.skillMapSkillLevel.measureTime != null) {
          setLevelUpConditionBy(LevelUpConditionBy.MEASUREMENT_TIME);
        } else {
          setLevelUpConditionBy(LevelUpConditionBy.PERIOD);
        }
      }
    }, [submitLevelUpDetail]);

    const renderConditionByRadioButton = (
      levelUpConditionBy: string | undefined,
    ) => {
      switch (levelUpConditionBy) {
        case LevelUpConditionBy.NUMBER_OF_TIMES:
          return (
            <div className="flex gap-2 items-center text-black">
              <p className="text-[13px] font-normal">対応タスクを</p>
              <div className="w-[50px]">
                <Input
                  className={`shadow-none text-sm leading-[56px] !pl-3 flex items-center !py-0 h-[34px] !w-[50px] focus:!shadow-none focus:border !border-[1px] border-[#77858F] rounded-md`}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  onChange={(e) => {
                    const value = e.target.value;
                    if (ONLY_DIGITS_REGEX.test(value)) {
                      setMeasureCount(Number(value));
                    }
                  }}
                  value={measureCount || ''}
                />
              </div>
              <p className="text-[13px] font-normal">回完了した</p>
            </div>
          );
        case LevelUpConditionBy.MEASUREMENT_TIME:
          return (
            <div className="flex gap-2 items-center text-black">
              <p className="text-[13px] font-normal">対応タスクを</p>
              <div className="w-[50px]">
                <Input
                  className={`shadow-none text-sm leading-[56px] !pl-3 flex items-center !py-0 h-[34px] !w-[50px] focus:!shadow-none focus:border !border-[1px] border-[#77858F] rounded-md`}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  onChange={(e) => {
                    const value = e.target.value;
                    if (ONLY_DIGITS_REGEX.test(value)) {
                      setMeasureTime(Number(value));
                    }
                  }}
                  value={measureTime || ''}
                />
              </div>
              <p className="text-[13px] font-normal">時間行った</p>
            </div>
          );
        case LevelUpConditionBy.PERIOD:
          return (
            <div className="flex w-full gap-2 items-center text-black">
              <p className="text-[13px] font-normal">振り返りの期間</p>{' '}
              <div className="w-[36px] mr-3">
                <Input
                  className={`shadow-none text-sm leading-[56px] !pl-3 flex items-center !py-0 h-[34px] !w-[50px] focus:!shadow-none focus:border !border-[1px] rounded-md ${showLookBackIntervalErr ? 'border-error' : 'border-[#77858F]'}`}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  onChange={(e) => {
                    const value = e.target.value;
                    if (ONLY_DIGITS_REGEX.test(value)) {
                      setLookBackInterval(Number(value));
                      setShowLookBackIntervalErr(false);
                    }
                  }}
                  value={lookBackInterval || ''}
                />
              </div>
              <div className="w-[68px]">
                <Dropdown
                  className={`h-[34px] !w-[68px] !py-1 !pr-0 text-xs !border-[1px] !rounded-md ${showLookBackTypeErr ? 'border-error' : 'border-[#77858F]'}`}
                  classNameTextData="!text-xs"
                  classNameOption="!text-xs"
                  classNameError="!text-xs"
                  labelOptionClass="!pr-0"
                  options={LEVEL_UP_PERIOD_OPTIONS}
                  selectedOption={LEVEL_UP_PERIOD_OPTIONS.find(
                    (option) => option.value == lookBackType,
                  )}
                  onChange={(e) => {
                    setLookBackType(e.value as SkillMapLookBackType);
                    setShowLookBackTypeErr(false);
                  }}
                />
              </div>
              <p className="text-[13px] font-normal">ごと</p>
            </div>
          );
      }
    };

    const renderNewConditionText = () => {
      if (measureCount) {
        return (
          <div className="text-black">
            <p className="text-sm font-medium mb-3">
              再度レベルアップ条件の設定
            </p>
            <p className="text-[13px] font-normal">
              対応タスクを{measureCount}回完了した
            </p>
          </div>
        );
      } else if (measureTime) {
        return (
          <div className="text-black">
            <p className="text-sm font-medium mb-3">
              再度レベルアップ条件の設定
            </p>
            <p className="text-[13px] font-normal">
              対応タスクを{measureTime}時間行った
            </p>
          </div>
        );
      } else if (lookBackInterval && lookBackType) {
        let lookBackTypeText = '';
        switch (lookBackType) {
          case SkillMapLookBackType.DAY:
            lookBackTypeText = SkillMapTypeInterval.DAY;
            break;
          case SkillMapLookBackType.WEEK:
            lookBackTypeText = SkillMapTypeInterval.WEEK;
            break;
          case SkillMapLookBackType.MONTH:
            lookBackTypeText = SkillMapTypeInterval.MONTH;
            break;
          case SkillMapLookBackType.YEAR:
            lookBackTypeText = SkillMapTypeInterval.YEAR;
            break;
        }
        return (
          <div className="text-black">
            <p className="text-sm font-medium mb-3">
              再度レベルアップ条件の設定
            </p>
            <p className="text-[13px] font-normal">
              振り返りの期間{lookBackInterval}
              {lookBackTypeText}ごと
            </p>
          </div>
        );
      }
    };

    return (
      <Modal
        open={open}
        className="font-primary !rounded-[8px] text-gray-700 !p-0 w-[400px] "
        contentClass="!w-[400px] !rounded-[8px]"
        onClose={onClose}>
        <div className="py-[40px] px-[20px] flex flex-col gap-5 items-center">
          {/* Header */}
          {currentStep < 3 ? (
            <div className="flex gap-2 justify-center items-center">
              <CustomUserAvatar
                avatarUrl={submitLevelUpDetail.staff?.avatar || ''}
                avatarColor={submitLevelUpDetail.staff?.avatarColor || ''}
                size={30}
              />
              <p className="max-w-full text-[15px] font-medium break-all line-clamp-2">
                {submitLevelUpDetail.staff.profile.fullName}
              </p>
            </div>
          ) : currentStep == 3 ? (
            <p className="text-primary font-medium text-sm">
              {selectRejectOption
                ? 'この内容で差し戻しますか？'
                : 'この内容で承認しますか？'}
            </p>
          ) : (
            <></>
          )}

          {/* Step before and after */}
          {currentStep < 4 && (
            <>
              <p className="text-black font-medium text-[18px] max-w-full break-all text-center">
                {submitLevelUpDetail.skill.name}
              </p>
              <div className="flex justify-between items-center w-full">
                <div className="flex items-center justify-center w-full gap-2">
                  <div className="bg-[#EBF1F7] rounded-[6px] w-[62px] h-[62px] flex flex-col items-center justify-center">
                    <p
                      className="text-white text-xs font-medium bg-primary rounded-[10px] w-[51px] h-[21px] flex justify-center items-center"
                      style={{
                        background:
                          SKILL_MAP_STEPS.find((step) =>
                            step.label.includes(
                              getLastChar(
                                submitLevelUpDetail.progression
                                  .stepBeforeSubmit,
                              ),
                            ),
                          )?.color || '#0068B6',
                      }}>
                      STEP{' '}
                      {getLastChar(
                        submitLevelUpDetail.progression.stepBeforeSubmit,
                      )}
                    </p>
                    <div className="flex gap-1 items-baseline">
                      <p className="text-sm font-medium">Lv.</p>
                      <p className="text-[20px] font-medium">
                        {getLastChar(
                          submitLevelUpDetail.progression.levelBeforeSubmit,
                        )}
                      </p>
                    </div>
                  </div>
                  <ImageRound
                    className={`w-fit h-fit ${selectRejectOption && 'opacity-25'}`}
                    src="/icons/blue-chevron.svg"
                    name="Blue chevron"
                  />
                  <div
                    className={`bg-[#EBF1F7] rounded-[6px] w-[62px] h-[62px] flex flex-col items-center justify-center ${selectRejectOption && 'opacity-25'}`}>
                    <p
                      className="text-white text-xs font-medium rounded-[10px] w-[51px] h-[21px] flex justify-center items-center"
                      style={{
                        background:
                          SKILL_MAP_STEPS.find((step) =>
                            step.label.includes(
                              getLastChar(
                                submitLevelUpDetail.progression.stepAfterSubmit,
                              ),
                            ),
                          )?.color || '#0068B6',
                      }}>
                      STEP{' '}
                      {getLastChar(
                        submitLevelUpDetail.progression.stepAfterSubmit,
                      )}
                    </p>
                    <div className="flex gap-1 items-baseline">
                      <p className="text-sm font-medium">Lv.</p>
                      <p className="text-[20px] font-medium">
                        {getLastChar(
                          submitLevelUpDetail.progression.levelAfterSubmit,
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Checkbox to select items */}
          {(currentStep == 1 || (currentStep < 4 && selectRejectOption)) && (
            <>
              <div className="bg-[#EBF1F7] py-[24px] px-[30px] rounded-[6px] !w-full">
                <p className="text-primary font-medium text-[16px] text-center mb-3">
                  {currentStep == 1
                    ? 'チェックリストを確認する'
                    : '再設定後のチェックリスト'}
                </p>
                <div className="flex flex-col gap-2 justify-start">
                  {submitLevelUpDetail.skillMapSkillLevel.items &&
                    submitLevelUpDetail.skillMapSkillLevel.items.map(
                      (item, index) => {
                        return (
                          <div key={index} className="flex gap-2">
                            <Checkbox
                              classLabel="text-black text-sm font-medium !max-w-full !break-all"
                              label={item.item}
                              onChange={() => {
                                setItemStatusList((prev) =>
                                  prev.map((itemWithStatus) => {
                                    if (
                                      itemWithStatus.item === item.item &&
                                      itemWithStatus.id == index
                                    ) {
                                      return {
                                        ...itemWithStatus,
                                        isChecked: !itemWithStatus.isChecked,
                                      };
                                    }
                                    return itemWithStatus;
                                  }),
                                );
                              }}
                              isChecked={
                                itemStatusList.find(
                                  (itemWithStatus) =>
                                    itemWithStatus.item == item.item &&
                                    itemWithStatus.id == index,
                                )?.isChecked
                              }
                            />
                          </div>
                        );
                      },
                    )}
                </div>
              </div>
              {currentStep == 1 && (
                <div className="flex gap-2 justify-center mt-5">
                  <Button
                    variant="outline"
                    className="w-[140px] h-[36px] !p-0 text-sm font-medium rounded-[6px] text-primary bg-white"
                    onClick={() => {
                      setCurrentStep(2);
                      setSelectRejectOption(true);
                    }}>
                    差し戻す
                  </Button>
                  <Button
                    variant="primary"
                    disabled={itemStatusList.some((item) => !item.isChecked)}
                    onClick={() => {
                      setCurrentStep(2);
                      setSelectRejectOption(false);
                    }}
                    className="w-[140px] h-[36px] !p-0 text-sm font-medium rounded-[6px] text-white">
                    承認する
                  </Button>
                </div>
              )}
            </>
          )}

          {/* Modify level up conditions */}
          {currentStep == 2 && selectRejectOption && (
            <div className="!w-full">
              <p className="text-sm font-medium mb-3">
                再度レベルアップ条件の設定
              </p>
              <div className="flex gap-3 items-center mt-3">
                {' '}
                <RadioButton
                  name={`level-up-condition`}
                  label="回数"
                  onChange={(e: any) => {
                    if (e) {
                      setLevelUpConditionBy(LevelUpConditionBy.NUMBER_OF_TIMES);
                      resetMeasureFieldsWhenChangeRadioBtn();
                    }
                  }}
                  isChecked={
                    levelUpConditionBy == LevelUpConditionBy.NUMBER_OF_TIMES
                  }
                />
                <RadioButton
                  name={`level-up-condition`}
                  label="計測時間"
                  onChange={(e: any) => {
                    if (e) {
                      setLevelUpConditionBy(
                        LevelUpConditionBy.MEASUREMENT_TIME,
                      );
                      resetMeasureFieldsWhenChangeRadioBtn();
                    }
                  }}
                  isChecked={
                    levelUpConditionBy == LevelUpConditionBy.MEASUREMENT_TIME
                  }
                />
                <RadioButton
                  name={`level-up-condition`}
                  label="期間"
                  onChange={(e: any) => {
                    if (e) {
                      setLevelUpConditionBy(LevelUpConditionBy.PERIOD);
                      resetMeasureFieldsWhenChangeRadioBtn();
                    }
                  }}
                  isChecked={levelUpConditionBy == LevelUpConditionBy.PERIOD}
                />
              </div>
              <div className="mt-3">
                {renderConditionByRadioButton(levelUpConditionBy)}
              </div>
            </div>
          )}

          {/* New level up conditions text */}
          {currentStep == 3 && selectRejectOption && (
            <div className="!w-full">{renderNewConditionText()}</div>
          )}

          {/* Comment box */}
          {currentStep == 2 && (
            <div className="!w-full">
              <p className="text-sm font-medium mb-3">コメント</p>
              <TextArea
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setComment(e.target.value)
                }
                className="h-[130px] !resize-none !w-full text-sm !border-[1px] !border-[#77858F] !rounded-[6px]"
              />
            </div>
          )}

          {/* Comment text */}
          {currentStep == 3 && (
            <div className="bg-[#EBF1F7] py-[24px] px-[30px] rounded-[6px] !w-full">
              <div className="flex gap-2 justify-start items-center mb-3">
                <CustomUserAvatar
                  avatarUrl={submitLevelUpDetail.staff?.avatar || ''}
                  avatarColor={submitLevelUpDetail.staff?.avatarColor || ''}
                  size={24}
                />
                <p className="text-[15px] max-w-full font-medium break-all line-clamp-4">
                  {submitLevelUpDetail.staff?.profile?.fullName}{' '}
                  <span className="text-[#77858F] text-xs font-medium">
                    さんへのコメント
                  </span>
                </p>
              </div>
              <p className="text-sm max-w-full break-all">{comment}</p>
            </div>
          )}

          {/* Reject and submit buttons */}
          {currentStep > 1 && currentStep < 4 && (
            <div>
              {selectRejectOption ? (
                <Button
                  variant="outline"
                  className="w-[140px] h-[36px] !p-0 text-sm font-medium rounded-[6px] text-primary bg-white"
                  onClick={() => {
                    if (lookBackInterval && !lookBackType) {
                      setShowLookBackTypeErr(true);
                      return;
                    }
                    if (!lookBackInterval && lookBackType) {
                      setShowLookBackIntervalErr(true);
                      return;
                    }
                    setCurrentStep((prev) => prev + 1);
                    if (currentStep == 3) {
                      onSubmit({
                        status: SubmitLevelStatus.REJECTED,
                        comment,
                        items: itemStatusList.map((item) => {
                          return {
                            item: item.item,
                            isChecked: item.isChecked,
                          };
                        }),
                        measureCount: measureCount!,
                        measureTime: measureTime!,
                        lookBackInterval: lookBackInterval!,
                        lookBackType: lookBackType!,
                      });
                    }
                  }}>
                  差し戻す
                </Button>
              ) : (
                <Button
                  variant="primary"
                  disabled={itemStatusList.some((item) => !item.isChecked)}
                  onClick={() => {
                    setCurrentStep((prev) => prev + 1);
                    if (currentStep == 3) {
                      onSubmit({
                        status: SubmitLevelStatus.APPROVAL,
                        comment,
                        items: itemStatusList.map((item) => {
                          return {
                            item: item.item,
                            isChecked: item.isChecked,
                          };
                        }),
                      });
                    }
                  }}
                  className="w-[140px] h-[36px] !p-0 text-sm font-medium rounded-[6px] text-white">
                  承認する
                </Button>
              )}
            </div>
          )}

          {/* Close button */}
          <p
            className="text-primary text-[13px] font-medium flex justify-center hover:cursor-pointer"
            onClick={onClose}>
            キャンセル
          </p>
        </div>
      </Modal>
    );
  },
);

export default CensorLevelUpModal;
