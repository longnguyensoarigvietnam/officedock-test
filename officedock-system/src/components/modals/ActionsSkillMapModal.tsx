'use client';
import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import {
  Controller,
  SubmitHandler,
  useFieldArray,
  useForm,
  get,
} from 'react-hook-form';

import Button from '@components/common/Button';
import Input from '@components/common/Input';
import ImageRound from '@components/common/ImageRound';
import Drawer from '@components/common/Drawers';
import Dropdown from '@components/common/Dropdown';
import RadioButton from '@components/common/RadioButton';

import {
  OrganizationSkillMapDetail,
  SkillLevelDetail,
  SkillMapFormData,
  StepFormDataDetail,
} from '@interfaces/skills';

import {
  ActionsEvent,
  ActionsModal,
  LevelUpConditionBy,
  PermissionsSystem,
} from '@constants/enums';
import {
  LEVEL_UP_PERIOD_OPTIONS,
  SKILL_MAP_LEVEL_COUNT,
  SKILL_MAP_STEP_COUNT,
  SKILL_MAP_STEPS,
} from '@constants';

import { formatShowDateJapanese } from '@utils/date';
import {
  hasPermissionInArray,
  showModalHeaderBackgroundColorByTime,
} from '@utils';

export type ActionsSkillMapModalProps = {
  open: boolean;
  skillMapEditDetail: OrganizationSkillMapDetail[] | null;
  action?: string | null;
  step?: number;
  onClose: () => void;
  onCreate?: (values: SkillMapFormData) => void;
  onEdit?: (values: SkillMapFormData) => void;
};

const ActionsSkillMapModal = ({
  open,
  skillMapEditDetail,
  action = ActionsModal.CREATE,
  step = 1,
  onCreate,
  onClose,
  onEdit,
}: ActionsSkillMapModalProps) => {
  const { data: session } = useSession();

  const [currentStep, setCurrentStep] = useState<number>(ActionsModal.EDIT ? Number(step) : 1);

  const {
    register,
    watch,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
    control,
  } = useForm<SkillMapFormData>({
    mode: 'onSubmit',
  });
  const defaultValues = useMemo<SkillMapFormData>(() => {
    const baseStep = (stepName: string): StepFormDataDetail => ({
      skillId: 0,
      name: '',
      organizationId: 0,
      step: stepName,
      description: '',
      skillLevels: [],
      categories: [],
    });

    const value: SkillMapFormData = {
      step1: baseStep('ステップ1'),
      step2: baseStep('ステップ2'),
      step3: baseStep('ステップ3'),
    };

    if (skillMapEditDetail) {
      const getStepDetail = (step: string): StepFormDataDetail | null => {
        const detail = skillMapEditDetail.find((skill) => skill.step === step);
        if (!detail) return null;

        const skillLevels: SkillLevelDetail[] = [
          'レベル0',
          'レベル1',
          'レベル2',
        ]
          .map((levelKey) => {
            const levelDetail = detail.skillLevels.find(
              (level) => level.level === levelKey,
            );
            return levelDetail
              ? {
                  level: levelKey,
                  skillLevelId: levelDetail.id ?? null,
                  items: levelDetail.items.map((item) => ({ value: item })),
                  measureCount: levelDetail.measureCount ?? null,
                  measureTime: levelDetail.measureTime ?? null,
                  lookBackInterval: levelDetail.lookBackInterval ?? null,
                  lookBackType: levelDetail.lookBackType
                    ? {
                        value: levelDetail.lookBackType,
                        label: levelDetail.lookBackType,
                      }
                    : null,
                }
              : null;
          })
          .filter(Boolean) as SkillLevelDetail[];

        return {
          skillId: detail.id ?? 0,
          name: detail.name,
          organizationId: detail.organization?.id ?? 0,
          step: detail.step,
          description: detail.description,
          skillLevels,
          categories: detail.categories,
        };
      };

      value.step1 = getStepDetail('ステップ1');
      value.step2 = getStepDetail('ステップ2');
      value.step3 = getStepDetail('ステップ3');
    }
    return value;
  }, [skillMapEditDetail]);

  useEffect(() => {
    reset(defaultValues);
  }, [defaultValues, reset]);

  const onSubmitData: SubmitHandler<SkillMapFormData> = async (data) => {
    if (action === ActionsEvent.CREATE) {
      onCreate && onCreate(data as SkillMapFormData);
    }
    if (action === ActionsEvent.EDIT) {
      onEdit && onEdit(data as SkillMapFormData);
    }
  };

  const handleCloseModal = () => {
    onClose();
  };

  // const isDisabled =
  //   session?.user.permissions &&
  //   ((action === ActionsEvent.EDIT &&
  //     !hasPermissionInArray(
  //       session?.user.permissions,
  //       PermissionsSystem.TAG_UPDATE,
  //     )) ||
  //     (action === ActionsEvent.CREATE &&
  //       !hasPermissionInArray(
  //         session?.user.permissions,
  //         PermissionsSystem.TAG_ADD,
  //       )));

  type StepField = keyof StepFormDataDetail;

  function getStepField<T extends StepField>(
    step: 1 | 2 | 3,
    field: T,
  ): `step${1 | 2 | 3}.${T}` {
    return `step${step}.${field}`;
  }

  function getItemListFieldArrayPath(
    step: 1 | 2 | 3,
    level: 0 | 1 | 2,
  ): `step${1 | 2 | 3}.skillLevels.${0 | 1 | 2}.items` {
    return `step${step}.skillLevels.${level}.items` as any;
  }

  function getSkillLevelField<K extends keyof SkillLevelDetail>(
    step: 1 | 2 | 3,
    level: 0 | 1 | 2,
    field: K,
  ): `step${1 | 2 | 3}.skillLevels.${0 | 1 | 2}.${K}` {
    return `step${step}.skillLevels.${level}.${field}` as const;
  }

  function getItemFieldArrayPath(
    step: 1 | 2 | 3,
    level: 0 | 1 | 2,
    index: number,
  ) {
    return `step${step}.skillLevels.${level}.items.${index}.value` as any;
  }

  const resetMeasureFieldsWhenChangeRadioBtn = (
    currentStep: number,
    levelKey: number,
  ) => {
    setValue(
      getSkillLevelField(
        currentStep as 1 | 2 | 3,
        levelKey as 0 | 1 | 2,
        'measureCount',
      ),
      null,
    );
    setValue(
      getSkillLevelField(
        currentStep as 1 | 2 | 3,
        levelKey as 0 | 1 | 2,
        'measureTime',
      ),
      null,
    );
    setValue(
      getSkillLevelField(
        currentStep as 1 | 2 | 3,
        levelKey as 0 | 1 | 2,
        'lookBackInterval',
      ),
      null,
    );
    setValue(
      getSkillLevelField(
        currentStep as 1 | 2 | 3,
        levelKey as 0 | 1 | 2,
        'lookBackType',
      ),
      null,
    );
  };

  const renderConditionByRadioButton = (
    levelUpConditionBy: string | undefined,
    currentStep: number,
    levelKey: number,
  ) => {
    switch (levelUpConditionBy) {
      case LevelUpConditionBy.NUMBER_OF_TIMES:
        return (
          <div className="flex gap-2 items-center">
            <p className="text-[13px] font-normal">対応タスクを</p>
            <div className="w-[50px]">
              <Input
                className={`shadow-none text-sm leading-[56px] !pl-3 flex items-center !py-0 h-[34px] !w-[50px] focus:!shadow-none focus:border !border-[1px] rounded-md ${
                  !get(
                    errors,
                    getSkillLevelField(
                      currentStep as 1 | 2 | 3,
                      levelKey as 0 | 1 | 2,
                      'measureCount',
                    ),
                  )
                    ? '!border-[#77858F]'
                    : '!border-error'
                }`}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                register={register(
                  getSkillLevelField(
                    currentStep as 1 | 2 | 3,
                    levelKey as 0 | 1 | 2,
                    'measureCount',
                  ),
                  {
                    required: true,
                    onChange: (e) => {
                      const cleanValue = e.target.value.replace(/\D/g, ''); // Remove non-digits
                      e.target.value = cleanValue;
                    },
                  },
                )}
              />
            </div>
            <p className="text-[13px] font-normal">回完了した</p>
          </div>
        );
      case LevelUpConditionBy.MEASUREMENT_TIME:
        return (
          <div className="flex gap-2 items-center">
            <p className="text-[13px] font-normal">対応タスクを</p>
            <div className="w-[50px]">
              <Input
                className={`shadow-none text-sm leading-[56px] !pl-3 flex items-center !py-0 h-[34px] !w-[50px] focus:!shadow-none focus:border !border-[1px] rounded-md
                  ${
                    !get(
                      errors,
                      getSkillLevelField(
                        currentStep as 1 | 2 | 3,
                        levelKey as 0 | 1 | 2,
                        'measureTime',
                      ),
                    )
                      ? '!border-[#77858F]'
                      : '!border-error'
                  }`}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                register={register(
                  getSkillLevelField(
                    currentStep as 1 | 2 | 3,
                    levelKey as 0 | 1 | 2,
                    'measureTime',
                  ),
                  {
                    required: true,
                    onChange: (e) => {
                      const cleanValue = e.target.value.replace(/\D/g, ''); // Remove non-digits
                      e.target.value = cleanValue;
                    },
                  },
                )}
              />
            </div>
            <p className="text-[13px] font-normal">時間行った</p>
          </div>
        );
      case LevelUpConditionBy.PERIOD:
        return (
          <div className="flex gap-2 items-center">
            <p className="text-[13px] font-normal">振り返りの期間</p>{' '}
            <div className="w-[36px]">
              <Input
                className={`shadow-none text-sm leading-[56px] !pl-3 flex items-center !py-0 h-[34px] !w-[36px] focus:!shadow-none focus:border !border-[1px] rounded-md
                  ${
                    !get(
                      errors,
                      getSkillLevelField(
                        currentStep as 1 | 2 | 3,
                        levelKey as 0 | 1 | 2,
                        'lookBackInterval',
                      ),
                    )
                      ? '!border-[#77858F]'
                      : '!border-error'
                  } `}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                register={register(
                  getSkillLevelField(
                    currentStep as 1 | 2 | 3,
                    levelKey as 0 | 1 | 2,
                    'lookBackInterval',
                  ),
                  {
                    required: true,
                    onChange: (e) => {
                      const cleanValue = e.target.value.replace(/\D/g, ''); // Remove non-digits
                      e.target.value = cleanValue;
                    },
                  },
                )}
              />
            </div>
            <div className="w-[68px]">
              <Controller
                control={control}
                name={getSkillLevelField(
                  currentStep as 1 | 2 | 3,
                  levelKey as 0 | 1 | 2,
                  'lookBackType',
                )}
                rules={{
                  required: true,
                }}
                render={({ field: { onChange } }) => (
                  <Dropdown
                    className={`h-[34px] !w-[68px] !py-1 !pr-0 text-xs !border-[1px] !rounded-md ${
                      !get(
                        errors,
                        getSkillLevelField(
                          currentStep as 1 | 2 | 3,
                          levelKey as 0 | 1 | 2,
                          'lookBackType',
                        ),
                      )
                        ? '!border-[#77858F]'
                        : '!border-error'
                    }`}
                    classNameTextData="!text-xs"
                    classNameOption="!text-xs"
                    classNameError="!text-xs"
                    labelOptionClass="!pr-0"
                    options={LEVEL_UP_PERIOD_OPTIONS}
                    selectedOption={LEVEL_UP_PERIOD_OPTIONS.find(
                      (element) =>
                        element.value ==
                        watch(
                          getSkillLevelField(
                            currentStep as 1 | 2 | 3,
                            levelKey as 0 | 1 | 2,
                            'lookBackType',
                          ),
                        )?.value,
                    )}
                    onChange={(e) => {
                      onChange(e);
                    }}
                  />
                )}
              />
            </div>
            <p className="text-[13px] font-normal">ごと</p>
          </div>
        );
    }
  };

  const LevelUpConditions = ({
    levelTitle,
    levelKey,
    currentStep,
    levelUpConditionBy,
    setLevelUpConditionBy,
  }: {
    levelTitle: string;
    levelKey: number;
    currentStep: number;
    levelUpConditionBy: LevelUpConditionBy | undefined;
    setLevelUpConditionBy: (value: LevelUpConditionBy) => void;
  }) => {
    const { fields, append } = useFieldArray({
      control,
      name: getItemListFieldArrayPath(
        currentStep as 1 | 2 | 3,
        levelKey as 0 | 1 | 2,
      ),
    });

    return (
      <div>
        <p className="text-[#0068B6] text-md font-medium mt-3">{levelTitle}</p>
        <p className="text-sm font-medium mt-3">レベルアップ条件</p>
        <div className="flex gap-3 items-center mt-3">
          {' '}
          <RadioButton
            name={`level-up-condition-by${levelKey}`}
            label="回数"
            onChange={(e: any) => {
              if (e) {
                setLevelUpConditionBy(LevelUpConditionBy.NUMBER_OF_TIMES);
                resetMeasureFieldsWhenChangeRadioBtn(currentStep, levelKey);
              }
            }}
            isChecked={levelUpConditionBy == LevelUpConditionBy.NUMBER_OF_TIMES}
          />
          <RadioButton
            name={`level-up-condition-by${levelKey}`}
            label="計測時間"
            onChange={(e: any) => {
              if (e) {
                setLevelUpConditionBy(LevelUpConditionBy.MEASUREMENT_TIME);
                resetMeasureFieldsWhenChangeRadioBtn(currentStep, levelKey);
              }
            }}
            isChecked={
              levelUpConditionBy == LevelUpConditionBy.MEASUREMENT_TIME
            }
          />
          <RadioButton
            name={`level-up-condition-by${levelKey}`}
            label="期間"
            onChange={(e: any) => {
              if (e) {
                setLevelUpConditionBy(LevelUpConditionBy.PERIOD);
                resetMeasureFieldsWhenChangeRadioBtn(currentStep, levelKey);
              }
            }}
            isChecked={levelUpConditionBy == LevelUpConditionBy.PERIOD}
          />
        </div>
        <div className="my-3">
          {renderConditionByRadioButton(
            levelUpConditionBy,
            currentStep,
            levelKey,
          )}
        </div>
        <div>
          <p className="text-sm font-medium my-3">振り返り項目</p>
          <div className="w-full flex flex-col gap-1 items-start ">
            {fields.map((field, index) => (
              <div
                className="flex gap-2 relative w-full items-center"
                key={field.id}>
                <div className="w-1 h-1 rounded-full bg-black ml-2"></div>
                <div className="w-full">
                  <Input
                    register={register(
                      getItemFieldArrayPath(
                        currentStep as 1 | 2 | 3,
                        levelKey as 0 | 1 | 2,
                        index,
                      ),
                    )}
                    className="shadow-none text-sm leading-[56px] !pl-3 flex items-center !py-0 h-[34px] focus:!shadow-none focus:border !border-[#77858F] !border-[1px] rounded-md"
                    placeholder="スキルの定義"
                  />
                </div>
              </div>
            ))}
            <div className="flex justify-center items-center w-full mt-4">
              <Button
                sz="sm"
                variant="outline"
                className="w-6 h-6 text-xs !py-0 !px-0 border-none !rounded-full !bg-[#ECF0F2] hover:opacity-70"
                type="button"
                onClick={() => {
                  append({ value: '' });
                }}>
                <ImageRound
                  src="/icons/plus.svg"
                  name="Add item"
                  className="h-3 w-3"
                />
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  type ConditionByMap = {
    [step: number]: {
      [level: number]: LevelUpConditionBy;
    };
  };

  useEffect(() => {
    if (action === ActionsModal.EDIT && defaultValues) {
      const editedMap: ConditionByMap = {};
      for (let step = 1; step <= SKILL_MAP_STEP_COUNT; step++) {
        editedMap[step] = {};
        const stepKey = `step${step}` as keyof SkillMapFormData;

        const stepData = defaultValues[stepKey];
        const skillLevels = stepData?.skillLevels || [];

        for (let level = 0; level < SKILL_MAP_LEVEL_COUNT; level++) {
          const measureCount = skillLevels[level]?.measureCount;
          const measureTime = skillLevels[level]?.measureTime;

          if (measureCount != null) {
            editedMap[step][level] = LevelUpConditionBy.NUMBER_OF_TIMES;
          } else if (measureTime != null) {
            editedMap[step][level] = LevelUpConditionBy.MEASUREMENT_TIME;
          } else {
            editedMap[step][level] = LevelUpConditionBy.PERIOD;
          }
        }
      }
      setConditionByMap(editedMap);
    }
  }, [action, defaultValues]);

  const getInitialConditionMap = (): ConditionByMap => {
    const map: ConditionByMap = {};
    for (let step = 1; step <= SKILL_MAP_STEP_COUNT; step++) {
      map[step] = {};
      for (let level = 0; level < SKILL_MAP_LEVEL_COUNT; level++) {
        map[step][level] = LevelUpConditionBy.NUMBER_OF_TIMES;
      }
    }

    return map;
  };

  const [conditionByMap, setConditionByMap] = useState<ConditionByMap>(() => {
    return action === ActionsModal.CREATE ? getInitialConditionMap() : {};
  });

  const getCondition = (
    step: number,
    level: number,
  ): LevelUpConditionBy | undefined => conditionByMap[step]?.[level];

  const updateCondition = (
    step: number,
    level: number,
    value: LevelUpConditionBy,
  ) => {
    setConditionByMap((prev) => ({
      ...prev,
      [step]: {
        ...prev[step],
        [level]: value,
      },
    }));
  };

  return (
    <Drawer
      open={open}
      className="font-primary bg-white h-screen w-[700px] !px-0 !rounded-tl-xl"
      onClose={handleCloseModal}>
      <header
        className="px-8 rounded-tl-xl h-[50px] flex items-center justify-between"
        style={{
          background: showModalHeaderBackgroundColorByTime(),
        }}>
        <div className="flex text-sm items-center gap-4 text-white">
          <p className="">
            登録日{' '}
            {action === ActionsEvent.EDIT &&
            skillMapEditDetail?.find(
              (skillMap) => skillMap.step == `ステップ${currentStep}`,
            )?.createdAt
              ? formatShowDateJapanese(
                  skillMapEditDetail?.find(
                    (skillMap) => skillMap.step == `ステップ${currentStep}`,
                  )?.createdAt || '',
                )
              : formatShowDateJapanese(new Date())}
          </p>
        </div>
        <div className="flex gap-5 items-center">
          <ImageRound
            className="mt-1 w-3 h-[14px] hover:cursor-pointer"
            src="/icons/drawer-close-white.svg"
            name="Close icon"
            onClick={() => {
              reset();
              onClose();
            }}
          />
        </div>
      </header>
      <form
        onSubmit={handleSubmit(onSubmitData)}
        className="px-8 pb-8 !h-[calc(100vh_-_130px)] overflow-y-auto flex flex-col gap-5">
        <header className="sticky z-[100] top-[0px] py-5 gap-2 bg-white">
          <div className="flex rounded-[20px] font-medium bg-[#EBF1F7] mb-8 px-[6px] py-[4px]">
            {SKILL_MAP_STEPS.map((step, index) => {
              const stepNumber = index + 1;
              const isActive = currentStep === stepNumber;
              const isDisabled =
                action == ActionsModal.EDIT &&
                ((defaultValues.step1 == null && stepNumber == 1) ||
                  (defaultValues.step2 == null && stepNumber == 2) ||
                  (defaultValues.step3 == null && stepNumber == 3));
              return (
                <Button
                  key={step.label}
                  type="button"
                  onClick={() => {
                    if (isDisabled) return;
                    setCurrentStep(stepNumber);
                  }}
                  disabled={isDisabled}
                  style={
                    isActive
                      ? { backgroundColor: step.color, color: 'white' }
                      : { color: step.color, backgroundColor: '#EBF1F7' }
                  }
                  className={`w-1/3 text-center py-[4px] border-none !rounded-[20px]`}>
                  {step.label}
                </Button>
              );
            })}
          </div>
          <div className="flex items-center gap-2 justify-between">
            <div className="w-full">
              <Input
                className={`shadow-none text-2xl leading-[56px] font-bold !pl-3 flex items-center !py-0 h-[46px] focus:!shadow-none focus:border !border-[1px] rounded-md ${
                  !get(errors, getStepField(currentStep as 1 | 2 | 3, 'name'))
                    ? '!border-[#77858F]'
                    : '!border-error'
                }`}
                value={
                  watch(getStepField(currentStep as 1 | 2 | 3, 'name')) || ''
                }
                register={register(
                  getStepField(currentStep as 1 | 2 | 3, 'name'),
                  {
                    required: true,
                  },
                )}
              />
            </div>
            <div className="flex gap-2 items-center">
              {session?.user.permissions &&
                ((action === ActionsEvent.EDIT &&
                  hasPermissionInArray(
                    session?.user.permissions,
                    PermissionsSystem.TAG_UPDATE,
                  )) ||
                  (action === ActionsEvent.CREATE &&
                    hasPermissionInArray(
                      session?.user.permissions,
                      PermissionsSystem.TAG_ADD,
                    ))) && (
                  <Button
                    type="submit"
                    className="w-[82px] h-[36px] !text-[12px] !px-2">
                    保存
                  </Button>
                )}
              <Button
                variant="outline"
                type="button"
                onClick={onClose}
                className="w-[82px] !rounded-md  h-[34px] !text-[12px] !px-2">
                キャンセル
              </Button>
            </div>
          </div>
        </header>
        <div>
          <p className="text-sm font-medium mb-3">スキルの定義</p>
          <Input
            className={`shadow-none text-sm leading-[56px] !pl-3 flex items-center !py-0 h-[34px] focus:!shadow-none focus:border !border-[#77858F] !border-[1px] rounded-md`}
            value={
              watch(getStepField(currentStep as 1 | 2 | 3, 'description')) || ''
            }
            register={register(
              getStepField(currentStep as 1 | 2 | 3, 'description'),
            )}
          />
        </div>
        {action == ActionsModal.EDIT &&
          (watch(getStepField(currentStep as 1 | 2 | 3, 'categories')) || [])
            ?.length > 0 && (
            <div className="w-full">
              <p className="text-sm font-medium mb-3">対応カテゴリー</p>
              <div className="flex flex-col gap-2">
                {(
                  watch(getStepField(currentStep as 1 | 2 | 3, 'categories')) ||
                  []
                ).map((categoryLine, index) => {
                  return (
                    <div className="flex items-center gap-2 w-full" key={index}>
                      {categoryLine.map((category, idx) => {
                        return (
                          <div
                            key={idx}
                            className="flex items-center w-1/3 max-w-1/3 min-w-0 gap-1">
                            <div className="bg-[#EBF1F7] truncate w-full rounded-[6px] pl-[8px] py-[10px] text-[13px] text-black font-normal">
                              {category.name}
                            </div>
                            {idx !== categoryLine.length - 1 && (
                              <ImageRound
                                className="w-fit h-fit"
                                src="/icons/statistic-compare.svg"
                                name="icon chevron right"
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        {['レベル0→1', 'レベル1→2', 'レベル2→3'].map((levelTitle, idx) => {
          return (
            <LevelUpConditions
              key={idx}
              levelTitle={levelTitle}
              levelKey={idx}
              currentStep={currentStep}
              levelUpConditionBy={getCondition(currentStep, idx)}
              setLevelUpConditionBy={(value) =>
                updateCondition(currentStep, idx, value)
              }
            />
          );
        })}
        <div className="flex justify-center">
          <Button type="submit" className="w-[200px] h-[46px] !text-[15px]">
            保存
          </Button>
        </div>
      </form>
    </Drawer>
  );
};

export default ActionsSkillMapModal;
