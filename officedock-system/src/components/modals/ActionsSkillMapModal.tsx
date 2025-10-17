'use client';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

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
import CategoryStepRaw from '@components/skillMap/CategoryStepRaw';

import useOrganizationStatisticCategories from '@hooks/useOrganizationStatisticCategories';

import {
  ActionsEvent,
  ActionsModal,
  EventWorkCategory,
  LevelUpConditionBy,
  PermissionsSystem,
  ScreenName,
  SkillMapStep,
} from '@constants/enums';
import {
  LEVEL_UP_PERIOD_OPTIONS,
  SKILL_MAP_LEVEL_COUNT,
  SKILL_MAP_STEP_COUNT,
  SKILL_MAP_STEPS,
} from '@constants';
import {
  ERROR_CREATE_MESSAGE,
  ERROR_LONG_FIELD_MESSAGE,
  ERROR_UPDATE_MESSAGE,
} from '@constants/message';

import { formatShowDateJapanese } from '@utils/date';
import {
  getInitialConditionMap,
  hasPermissionInArray,
  showModalHeaderBackgroundColorByTime,
} from '@utils';

import { OptionDropdownType } from '@interfaces/common';
import {
  ConditionByMap,
  RawCategoryItem,
  StepKey,
} from '@interfaces/skill-map';
import {
  CategoryStructure,
  OrganizationSkillMapDetail,
  SkillLevelDetail,
  SkillMapFormData,
  StepFormDataDetail,
} from '@interfaces/skills';

import { useSessionCache } from '@providers/SessionCacheProvider';
import { useToast } from '@providers/ToastProvider';

export type ActionsSkillMapModalProps = {
  open: boolean;
  skillMapEditDetail: OrganizationSkillMapDetail[] | null;
  action?: string | null;
  step?: number;
  onClose: () => void;
  onCreate?: (values: SkillMapFormData) => void;
  onEdit?: (values: SkillMapFormData) => void;
};

type StepField = keyof StepFormDataDetail;

const ActionsSkillMapModal = ({
  open,
  skillMapEditDetail,
  action = ActionsModal.CREATE,
  step = 1,
  onCreate,
  onClose,
  onEdit,
}: ActionsSkillMapModalProps) => {
  const { data: session } = useSessionCache();
  const searchParams = useSearchParams();
  const organizationId = searchParams.get('organization');
  const { showToast } = useToast();

  const [currentStep, setCurrentStep] = useState<number>(
    action == ActionsModal.EDIT ? Number(step) : 1,
  );
  const [dataOrganizationCategories, setDataOrganizationCategories] = useState<
    CategoryStructure[]
  >([]);
  const [isFormTouched, setIsFormTouched] = useState<boolean>(false);

  const [dataOptionsCategorySmall, setDataOptionsCategorySmall] = useState<{
    step1: OptionDropdownType[][];
    step2: OptionDropdownType[][];
    step3: OptionDropdownType[][];
  }>({
    step1: [
      [
        {
          label: '',
          value: '',
        },
      ],
    ],
    step2: [
      [
        {
          label: '',
          value: '',
        },
      ],
    ],
    step3: [
      [
        {
          label: '',
          value: '',
        },
      ],
    ],
  });
  const [dataOptionsCategoryMedium, setDataOptionsCategoryMedium] = useState<{
    step1: OptionDropdownType[][];
    step2: OptionDropdownType[][];
    step3: OptionDropdownType[][];
  }>({
    step1: [
      [
        {
          label: '',
          value: '',
        },
      ],
    ],
    step2: [
      [
        {
          label: '',
          value: '',
        },
      ],
    ],
    step3: [
      [
        {
          label: '',
          value: '',
        },
      ],
    ],
  });
  const [dataOptionsCategoryLarge, setDataOptionsCategoryLarge] = useState<
    OptionDropdownType[]
  >([
    {
      label: '',
      value: '',
    },
  ]);

  const [conditionByMap, setConditionByMap] = useState<ConditionByMap>(() => {
    return action === ActionsModal.CREATE ? getInitialConditionMap() : {};
  });

  const {
    register,
    watch,
    handleSubmit,
    reset,
    setError,
    clearErrors,
    setValue,
    getValues,
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
      rawCategories: [],
    });

    const value: SkillMapFormData = {
      step1: baseStep(SkillMapStep.STEP_1),
      step2: baseStep(SkillMapStep.STEP_2),
      step3: baseStep(SkillMapStep.STEP_3),
    };
    if (skillMapEditDetail) {
      const getStepDetail = (step: string): StepFormDataDetail | null => {
        const detail = skillMapEditDetail.find((skill) => skill.step === step);
        if (!detail) return null;

        const skillLevels: SkillLevelDetail[] = [
          'レベル1',
          'レベル2',
          'レベル3',
        ]
          .map((levelKey) => {
            const levelDetail = detail.skillLevels.find(
              (level) => level.level === levelKey,
            );
            return levelDetail
              ? {
                  skillLevelId: levelDetail.id ?? null,
                  organization: detail.organization?.id ?? 0,
                  level: levelKey,
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
          rawCategories: [],
        };
      };

      value.step1 = getStepDetail(SkillMapStep.STEP_1);
      value.step2 = getStepDetail(SkillMapStep.STEP_2);
      value.step3 = getStepDetail(SkillMapStep.STEP_3);
    }
    return value;
  }, [skillMapEditDetail]);

  useEffect(() => {
    reset(defaultValues);
  }, [defaultValues, reset, open]);

  useEffect(() => {
    if (skillMapEditDetail && dataOrganizationCategories) {
      skillMapEditDetail.map((skill, index) => {
        const stepKey = `step${index + 1}`;
        setTimeout(() => {
          const mappedCategories = skill.categories.map((cate) => ({
            LARGE: {
              label:
                cate.find((item) => item.type === EventWorkCategory.LARGE)
                  ?.name || '',
              value:
                cate.find((item) => item.type === EventWorkCategory.LARGE)
                  ?.id || '',
            },
            MEDIUM: {
              label:
                cate.find((item) => item.type === EventWorkCategory.MEDIUM)
                  ?.name || '',
              value:
                cate.find((item) => item.type === EventWorkCategory.MEDIUM)
                  ?.id || '',
            },
            SMALL: {
              label:
                cate.find((item) => item.type === EventWorkCategory.SMALL)
                  ?.name || '',
              value:
                cate.find((item) => item.type === EventWorkCategory.SMALL)
                  ?.id || '',
            },
          }));

          const mediumOptions = mappedCategories.map((row) => {
            const selectedLarge = dataOrganizationCategories.find(
              (category) => category.LARGE.id === row.LARGE.value,
            );

            if (!selectedLarge) return [];

            return selectedLarge.MEDIUM.map((medium) => ({
              label: medium.MEDIUM.name,
              value: medium.MEDIUM.id,
            }));
          });
          const smallOptions = mappedCategories.map((row) => {
            const selectedLarge = dataOrganizationCategories.find(
              (category) => category.LARGE.id === row.LARGE.value,
            );

            const selectedMedium = selectedLarge?.MEDIUM.find(
              (m) => m.MEDIUM.id === row.MEDIUM.value,
            );

            if (!selectedMedium) return [];

            return (
              selectedMedium.SMALL &&
              selectedMedium.SMALL.map((small) => ({
                label: small.name,
                value: small.id,
              }))
            );
          });
          setDataOptionsCategoryMedium((prev) => ({
            ...prev,
            [stepKey]: mediumOptions,
          }));
          setDataOptionsCategorySmall((prev) => ({
            ...prev,
            [stepKey]: smallOptions,
          }));
          setValue(`${stepKey}.rawCategories` as any, mappedCategories, {
            shouldDirty: true,
            shouldValidate: true,
          });
        }, 0);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skillMapEditDetail, dataOrganizationCategories]);

  const stepMap: Record<number, StepKey> = {
    1: 'step1',
    2: 'step2',
    3: 'step3',
  };
  const stepKey = stepMap[currentStep];

  useOrganizationStatisticCategories({
    organizationId: Number(organizationId),
    condition: [Boolean(organizationId)],
    currentScreen: ScreenName.SKILL_MAP,
    onSuccess: (data) => {
      const organizationCategories = data.map((category) => {
        const largeCategory = category.LARGE || {
          id: '',
          name: '',
          uuid: '',
        };

        const mediumCategories = (category.MEDIUM || []).map(
          (mediumCategory) => {
            const mediumCategoryField = mediumCategory.MEDIUM || {
              id: '',
              name: '',
              uuid: '',
            };
            const smallCategories = mediumCategory.SMALL || [
              { id: '', name: '', uuid: '' },
            ];

            return {
              MEDIUM: mediumCategoryField,
              SMALL: smallCategories,
            };
          },
        );

        return {
          LARGE: largeCategory,
          MEDIUM: mediumCategories,
        };
      });

      setDataOrganizationCategories(organizationCategories);
      setDataOptionsCategoryLarge(() => {
        const largeCategories: OptionDropdownType[] = [
          {
            label: '',
            value: '',
          },
        ];
        data.map((category) => {
          if (category.LARGE) {
            largeCategories.push({
              label: category.LARGE.name,
              value: category.LARGE.id,
            });
          }
        });
        return largeCategories.filter((item) => item.value !== '');
      });
    },
  });
  // Submit form data
  const onSubmitData: SubmitHandler<SkillMapFormData> = async (data) => {
    // Validate duplicate category
    const checkDuplicates = (stepData: StepFormDataDetail | null) => {
      if (!stepData) return [];

      const rawCategories = stepData.rawCategories || [];
      const duplicates: number[] = [];

      rawCategories.forEach((item, idx, arr) => {
        const isEmptyAll =
          !item.LARGE?.value && !item.MEDIUM?.value && !item.SMALL?.value;

        if (isEmptyAll) return;
        const currentKey = `${item.LARGE?.value}-${item.MEDIUM?.value}-${item.SMALL?.value}`;
        for (let j = 0; j < arr.length; j++) {
          if (j === idx) continue;
          const compareKey = `${arr[j].LARGE?.value}-${arr[j].MEDIUM?.value}-${arr[j].SMALL?.value}`;
          if (currentKey && currentKey === compareKey) {
            duplicates.push(idx);
            break;
          }
        }
      });

      return duplicates;
    };
    // Validate complete full information category with raw
    const checkIncompleteFields = (
      rawCategories: RawCategoryItem[] | undefined | null,
    ): number[] => {
      if (!Array.isArray(rawCategories)) return [];

      const inCompletes: number[] = [];

      rawCategories.forEach((item, idx) => {
        const large = item.LARGE?.value;
        const medium = item.MEDIUM?.value;
        const small = item.SMALL?.value;

        const filledCount = [large, medium, small].filter(Boolean).length;

        if (filledCount > 0 && filledCount < 3) {
          inCompletes.push(idx);
        }
      });

      return inCompletes;
    };

    const steps = ['step1', 'step2', 'step3'] as const;
    let hasError = false;

    for (const stepKey of steps) {
      const stepData = data[stepKey];
      const rawCategories = stepData?.rawCategories || [];
      const duplicates = checkDuplicates(data[stepKey]);
      const inCompletes = checkIncompleteFields(rawCategories);

      if (duplicates.length > 0) {
        hasError = true;
        duplicates.forEach((idx) => {
          [
            EventWorkCategory.LARGE,
            EventWorkCategory.MEDIUM,
            EventWorkCategory.SMALL,
          ].forEach((size) => {
            setError(`${stepKey}.rawCategories.${idx}.${size}` as any, {
              type: 'duplicate',
              message: 'duplicate',
            });
          });
        });
      }
      inCompletes.forEach((idx) => {
        hasError = true;
        [
          EventWorkCategory.LARGE,
          EventWorkCategory.MEDIUM,
          EventWorkCategory.SMALL,
        ].forEach((size) => {
          setError(`${stepKey}.rawCategories.${idx}.${size}` as any, {
            type: 'incomplete',
            message: 'incomplete',
          });
        });
      });
    }

    if (hasError) {
      if (action === ActionsEvent.CREATE) {
        showToast({
          variant: 'error',
          description: ERROR_CREATE_MESSAGE,
        });
      } else {
        showToast({
          variant: 'error',
          description: ERROR_UPDATE_MESSAGE,
        });
      }
      return;
    }
    if (action === ActionsEvent.CREATE) {
      onCreate && onCreate(data as SkillMapFormData);
    }
    if (action === ActionsEvent.EDIT) {
      !isFormTouched ? onClose() : onEdit && onEdit(data as SkillMapFormData);
    }
  };

  const handleCloseModal = () => {
    onClose();
  };

  const isDisabled =
    session?.user.permissions &&
    ((action === ActionsEvent.EDIT &&
      !hasPermissionInArray(
        session?.user.permissions,
        PermissionsSystem.SKILL_MAP_MANAGEMENT_UPDATE,
      )) ||
      (action === ActionsEvent.CREATE &&
        !hasPermissionInArray(
          session?.user.permissions,
          PermissionsSystem.SKILL_MAP_MANAGEMENT_ADD,
        )));

  const getStepField = <T extends StepField>(
    step: 1 | 2 | 3,
    field: T,
  ): `step${1 | 2 | 3}.${T}` => {
    return `step${step}.${field}`;
  };

  const getItemListFieldArrayPath = (
    step: 1 | 2 | 3,
    level: 1 | 2 | 3,
  ): `step${1 | 2 | 3}.skillLevels.${1 | 2 | 3}.items` => {
    return `step${step}.skillLevels.${level}.items` as any;
  };

  const getSkillLevelField = <K extends keyof SkillLevelDetail>(
    step: 1 | 2 | 3,
    level: 1 | 2 | 3,
    field: K,
  ): `step${1 | 2 | 3}.skillLevels.${1 | 2 | 3}.${K}` => {
    return `step${step}.skillLevels.${level}.${field}` as const;
  };

  const getItemFieldArrayPath = (
    step: 1 | 2 | 3,
    level: 1 | 2 | 3,
    index: number,
  ) => {
    return `step${step}.skillLevels.${level}.items.${index}.value` as any;
  };

  const resetMeasureFieldsWhenChangeRadioBtn = (
    currentStep: number,
    levelKey: number,
  ) => {
    setValue(
      getSkillLevelField(
        currentStep as 1 | 2 | 3,
        levelKey as 1 | 2 | 3,
        'measureCount',
      ),
      null,
    );
    setValue(
      getSkillLevelField(
        currentStep as 1 | 2 | 3,
        levelKey as 1 | 2 | 3,
        'measureTime',
      ),
      null,
    );
    setValue(
      getSkillLevelField(
        currentStep as 1 | 2 | 3,
        levelKey as 1 | 2 | 3,
        'lookBackInterval',
      ),
      null,
    );
    setValue(
      getSkillLevelField(
        currentStep as 1 | 2 | 3,
        levelKey as 1 | 2 | 3,
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
                      levelKey as 1 | 2 | 3,
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
                    levelKey as 1 | 2 | 3,
                    'measureCount',
                  ),
                  {
                    required: true,
                    onChange: (e) => {
                      const cleanValue = e.target.value.replace(/\D/g, ''); // Remove non-digits
                      e.target.value = cleanValue;
                      setIsFormTouched(true);
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
                        levelKey as 1 | 2 | 3,
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
                    levelKey as 1 | 2 | 3,
                    'measureTime',
                  ),
                  {
                    required: true,
                    onChange: (e) => {
                      const cleanValue = e.target.value.replace(/\D/g, ''); // Remove non-digits
                      e.target.value = cleanValue;
                      setIsFormTouched(true);
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
          <div className="flex gap-2 items-center w-full">
            <p className="text-[13px] font-normal">振り返りの期間</p>{' '}
            <div className="w-[36px]">
              <Input
                className={`shadow-none text-sm leading-[56px] !pl-3 flex items-center !py-0 h-[34px] !w-[36px] focus:!shadow-none focus:border !border-[1px] rounded-md
                  ${
                    !get(
                      errors,
                      getSkillLevelField(
                        currentStep as 1 | 2 | 3,
                        levelKey as 1 | 2 | 3,
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
                    levelKey as 1 | 2 | 3,
                    'lookBackInterval',
                  ),
                  {
                    required: true,
                    onChange: (e) => {
                      const cleanValue = e.target.value.replace(/\D/g, ''); // Remove non-digits
                      e.target.value = cleanValue;
                      setIsFormTouched(true);
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
                  levelKey as 1 | 2 | 3,
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
                          levelKey as 1 | 2 | 3,
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
                            levelKey as 1 | 2 | 3,
                            'lookBackType',
                          ),
                        )?.value,
                    )}
                    onChange={(e) => {
                      setIsFormTouched(true);
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
        levelKey as 1 | 2 | 3,
      ),
    });

    return (
      <div>
        <p className="text-primary text-md font-medium leading-none">{levelTitle}</p>
        <p className="text-sm font-medium mt-5 leading-none">レベルアップ条件</p>
        <div className="flex gap-3 items-center mt-3">
          {' '}
          <RadioButton
            name={`level-up-condition-by${levelKey}`}
            label="回数"
            onChange={(e: any) => {
              if (e) {
                setIsFormTouched(true);
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
                setIsFormTouched(true);
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
                setIsFormTouched(true);
                setLevelUpConditionBy(LevelUpConditionBy.PERIOD);
                resetMeasureFieldsWhenChangeRadioBtn(currentStep, levelKey);
              }
            }}
            isChecked={levelUpConditionBy == LevelUpConditionBy.PERIOD}
          />
        </div>
        <div className="mt-[14px]">
          {renderConditionByRadioButton(
            levelUpConditionBy,
            currentStep,
            levelKey,
          )}
        </div>
        <div>
          <p className="text-sm font-medium mb-[14px] mt-5 leading-none">振り返り項目</p>
          <div className="w-full flex flex-col gap-[6px] items-start ">
            {fields.map((field, index) => (
              <div
                className="flex gap-2 relative w-full items-center"
                key={field.id}>
                <div className="w-1 h-1 rounded-full bg-black mx-2"></div>
                <div className="w-full">
                  <Input
                    register={register(
                      getItemFieldArrayPath(
                        currentStep as 1 | 2 | 3,
                        levelKey as 1 | 2 | 3,
                        index,
                      ),
                      {
                        onChange: () => {
                          setIsFormTouched(true);
                        },
                      },
                    )}
                    className="shadow-none text-sm leading-[56px] !pl-3 flex items-center !py-0 h-[34px] focus:!shadow-none focus:border !border-[#77858F] !border-[1px] rounded-md"
                    placeholder="振り返り項目"
                  />
                </div>
              </div>
            ))}
            <div className="flex justify-center items-center w-full">
              <Button
                sz="sm"
                variant="outline"
                className="w-6 h-6 text-xs !py-0 !px-0 border-none !rounded-full !bg-[#ECF0F2] hover:opacity-70"
                type="button"
                onClick={() => {
                  append({ value: '' });
                  setIsFormTouched(true);
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
      className="font-primary bg-white w-[700px] !px-0 !rounded-l-[30px]"
      onClose={handleCloseModal}>
      <header
        className="px-9 rounded-tl-[30px] h-[50px] flex items-center justify-between"
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
        className="px-9 pb-9 !h-[calc(100vh_-_130px)] overflow-y-auto flex flex-col gap-10">
        <header className="sticky z-[100] top-[0px] pt-10 gap-2 bg-white">
          <div className="flex rounded-[20px] font-medium bg-[#EBF1F7] mb-8 p-[6px]">
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
                      ? { background: step.color, color: 'white' }
                      : { color: step.color, background: '#EBF1F7' }
                  }
                  className={`w-1/3 text-center !h-[30px] leading-none border-none !rounded-[20px]`}>
                  {step.label}
                </Button>
              );
            })}
          </div>
          <div className="flex items-center gap-5 justify-between">
            <div className="w-full">
              <Input
                className={`shadow-none text-[22px] leading-[56px] font-bold !pl-3 flex items-center !py-0 h-[42px] focus:!shadow-none focus:border !border-[1px] rounded-md ${
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
                    onChange: () => {
                      setIsFormTouched(true);
                    },
                  },
                )}
              />
            </div>
            <div className="flex gap-[10px] items-center">
              {!isDisabled && (
                <Button
                  type="submit"
                  disabled={action == ActionsModal.EDIT && !isFormTouched}
                  className="w-[86px] h-[36px] !text-[12px] !px-2">
                  保存
                </Button>
              )}
              <Button
                variant="outline"
                type="button"
                onClick={onClose}
                className="!rounded-md  w-[86px] h-[36px] !text-[12px] !px-2">
                キャンセル
              </Button>
            </div>
          </div>
        </header>
        <div>
          <p className="text-sm font-medium mb-[14px]">スキルの定義</p>
          <Input
            className={`shadow-none text-sm leading-[56px] !pl-3 flex items-center !py-0 h-[34px] focus:!shadow-none focus:border !border-[#77858F] !border-[1px] rounded-md`}
            value={
              watch(getStepField(currentStep as 1 | 2 | 3, 'description')) || ''
            }
            register={register(
              getStepField(currentStep as 1 | 2 | 3, 'description'),

              {
                maxLength: {
                  value: 255,
                  message: ERROR_LONG_FIELD_MESSAGE,
                },
                onChange: () => {
                  setIsFormTouched(true);
                },
              },
            )}
          />
        </div>
        <CategoryStepRaw
          clearErrors={clearErrors}
          control={control}
          dataOptionsCategoryLarge={dataOptionsCategoryLarge}
          dataOptionsCategoryMedium={dataOptionsCategoryMedium}
          dataOptionsCategorySmall={dataOptionsCategorySmall}
          dataOrganizationCategories={dataOrganizationCategories}
          setIsFormTouched={setIsFormTouched}
          setDataOptionsCategoryMedium={setDataOptionsCategoryMedium}
          setDataOptionsCategorySmall={setDataOptionsCategorySmall}
          setError={setError}
          setValue={setValue}
          stepKey={stepKey}
          watch={watch}
          key={stepKey}
          getValues={getValues}
          action={action}
        />

        {['レベル1', 'レベル2', 'レベル3'].map((levelTitle, idx) => {
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
        {!isDisabled && (
          <div className="flex justify-center">
            <Button
              type="submit"
              disabled={action == ActionsModal.EDIT && !isFormTouched}
              style={{ boxShadow: '0px 1px 5px 0px #00000033' }}
              className="w-[200px] h-[46px] !text-[14px] border-none">
              保存
            </Button>
          </div>
        )}
      </form>
    </Drawer>
  );
};

export default ActionsSkillMapModal;
