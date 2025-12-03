import React, { Dispatch, SetStateAction, useEffect } from 'react';
import {
  Control,
  Controller,
  useFieldArray,
  UseFormClearErrors,
  UseFormGetValues,
  UseFormSetError,
  UseFormSetValue,
  UseFormWatch,
  useWatch,
} from 'react-hook-form';

import Button from '@components/common/Button';
import Dropdown from '@components/common/Dropdown';
import ImageRound from '@components/common/ImageRound';

import { ActionsModal, EventWorkCategory } from '@constants/enums';

import { OptionDropdownType } from '@interfaces/common';
import { StepKey } from '@interfaces/skill-map';
import { CategoryStructure, SkillMapFormData } from '@interfaces/skills';

type StepRawCategoriesProps = {
  action: string | null;
  stepKey: StepKey;
  control: Control<SkillMapFormData>;
  setError: UseFormSetError<SkillMapFormData>;
  clearErrors: UseFormClearErrors<SkillMapFormData>;
  watch: UseFormWatch<SkillMapFormData>;
  setValue: UseFormSetValue<SkillMapFormData>;
  getValues: UseFormGetValues<SkillMapFormData>;
  dataOptionsCategoryLarge: OptionDropdownType[];
  dataOptionsCategoryMedium: {
    step1: OptionDropdownType[][];
    step2: OptionDropdownType[][];
    step3: OptionDropdownType[][];
  };
  dataOptionsCategorySmall: {
    step1: OptionDropdownType[][];
    step2: OptionDropdownType[][];
    step3: OptionDropdownType[][];
  };
  dataOrganizationCategories: CategoryStructure[];
  setDataOptionsCategoryMedium: Dispatch<
    SetStateAction<{
      step1: OptionDropdownType[][];
      step2: OptionDropdownType[][];
      step3: OptionDropdownType[][];
    }>
  >;
  setDataOptionsCategorySmall: Dispatch<
    SetStateAction<{
      step1: OptionDropdownType[][];
      step2: OptionDropdownType[][];
      step3: OptionDropdownType[][];
    }>
  >;
  setIsFormTouched: Dispatch<SetStateAction<boolean>>;
};
const CategoryStepRaw = ({
  stepKey,
  control,
  action,
  watch,
  setError,
  clearErrors,
  setValue,
  getValues,
  dataOptionsCategoryLarge,
  dataOptionsCategoryMedium,
  dataOptionsCategorySmall,
  dataOrganizationCategories,
  setDataOptionsCategoryMedium,
  setDataOptionsCategorySmall,
  setIsFormTouched,
}: StepRawCategoriesProps) => {
  const {
    fields: outerFields,
    append: appendOuter,
    remove: removeOuter,
  } = useFieldArray({
    control,
    name: `${stepKey}.rawCategories` as const,
  });
  const rawCategories = useWatch({
    control,
    name: `${stepKey}.rawCategories`,
  });
  type CategorySize =
    | EventWorkCategory.LARGE
    | EventWorkCategory.MEDIUM
    | EventWorkCategory.SMALL;
  const sizeKeys = [
    EventWorkCategory.LARGE,
    EventWorkCategory.MEDIUM,
    EventWorkCategory.SMALL,
  ] as const;
  type SizeKey = (typeof sizeKeys)[number];
  const mediumOptionsForCurrentStep = dataOptionsCategoryMedium[stepKey] ?? [];
  const smallOptionsForCurrentStep = dataOptionsCategorySmall[stepKey] ?? [];

  // Add field if empty

  useEffect(() => {
    const rawCategories = getValues(`${stepKey}.rawCategories`) as any[];
    const isAllEmpty =
      Array.isArray(rawCategories) &&
      rawCategories.length > 0 &&
      rawCategories.every((item) =>
        [
          EventWorkCategory.LARGE,
          EventWorkCategory.MEDIUM,
          EventWorkCategory.SMALL,
        ].every(
          (key) =>
            item[key]?.label?.trim() === '' && item[key]?.value?.trim() === '',
        ),
      );

    if (
      !Array.isArray(rawCategories) ||
      rawCategories.length === 0 ||
      isAllEmpty
    ) {
      if (rawCategories && rawCategories.length === 0) {
        appendOuter({
          LARGE: { label: '', value: '' },
          MEDIUM: { label: '', value: '' },
          SMALL: { label: '', value: '' },
        });
      } else {
        if (action !== ActionsModal.EDIT) {
          setTimeout(() => {
            removeOuter();
            appendOuter({
              LARGE: { label: '', value: '' },
              MEDIUM: { label: '', value: '' },
              SMALL: { label: '', value: '' },
            });
          }, 0);
        } else {
          removeOuter();
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepKey]);

  // Validate show error duplicate row
  useEffect(() => {
    if (!Array.isArray(rawCategories)) return;

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

    clearErrors(`${stepKey}.rawCategories`);

    duplicates.forEach((idx) => {
      (
        [
          EventWorkCategory.LARGE,
          EventWorkCategory.MEDIUM,
          EventWorkCategory.SMALL,
        ] as CategorySize[]
      ).forEach((size) => {
        setError(`${stepKey}.rawCategories.${idx}.${size}`, {
          type: 'duplicate',
          message: 'duplicate',
        });
      });
    });
  }, [rawCategories, stepKey, setError, clearErrors]);

  return (
    <div>
      <p className="text-base text-black font-medium mb-[14px] leading-none">
        対応カテゴリー
      </p>
      <div className="flex gap-[10px] flex-col">
        {outerFields.map((field, index) => (
          <div key={field.id} className="flex gap-2 items-center h-[30px]">
            {sizeKeys.map((size, indexSize) => (
              <Controller
                key={size}
                control={control}
                name={
                  `${stepKey}.rawCategories.${index}.${size}` as
                    | `step1.rawCategories.${number}.${SizeKey}`
                    | `step2.rawCategories.${number}.${SizeKey}`
                    | `step3.rawCategories.${number}.${SizeKey}`
                }
                render={({ field: { value, onChange }, fieldState }) => {
                  let optionsData: OptionDropdownType[] = [];
                  let isDisabledOption = false;

                  // Get option data with size
                  if (size === EventWorkCategory.LARGE) {
                    optionsData = [...dataOptionsCategoryLarge];
                    isDisabledOption = false;
                  }
                  if (size === EventWorkCategory.MEDIUM) {
                    const largeSelected = watch(
                      `${stepKey}.rawCategories.${index}.LARGE`,
                    )?.value;
                    optionsData = largeSelected
                      ? [...(mediumOptionsForCurrentStep[index] ?? [])]
                      : [];
                    isDisabledOption = !largeSelected;
                  } else if (size === EventWorkCategory.SMALL) {
                    const mediumSelected = watch(
                      `${stepKey}.rawCategories.${index}.MEDIUM`,
                    )?.value;
                    optionsData = mediumOptionsForCurrentStep[index]
                      ? [...(smallOptionsForCurrentStep[index] ?? [])]
                      : [];
                    isDisabledOption = !mediumSelected;
                  }
                  return (
                    <div className="flex gap-2 items-center">
                      <div className="w-[175px] h-[30px] ">
                        <Dropdown
                          className={` h-full !py-1 text-xs !bg-[#EBF1F7] border border-[#EBF1F7] rounded-md ${fieldState.error ? 'border border-red-500' : '!border-transparent'}`}
                          classNameTextData="!text-xs min-h-3 !py-3 !px-3"
                          classNameOption="!text-xs !py-0"
                          classNameError="!text-xs !py-0"
                          options={optionsData}
                          disabled={isDisabledOption}
                          selectedOption={
                            value?.value
                              ? optionsData.find(
                                  (element) => element.value === value?.value,
                                ) || value
                              : undefined
                          }
                          onChange={(e) => {
                            setIsFormTouched(true);
                            if (size === EventWorkCategory.LARGE) {
                              //  Reset data MEDIUM and SMALL if LARGE change
                              setValue(
                                `${stepKey}.rawCategories.${index}.MEDIUM`,
                                {
                                  label: '',
                                  value: '',
                                },
                              );
                              setValue(
                                `${stepKey}.rawCategories.${index}.SMALL`,
                                {
                                  label: '',
                                  value: '',
                                },
                              );
                              // Set dataOption MEDIUM
                              const selectedLargeCategory =
                                dataOrganizationCategories.find(
                                  (category) => category.LARGE.id == e.value,
                                );

                              const initialMediumCategory: OptionDropdownType[] =
                                [
                                  {
                                    label: '',
                                    value: '',
                                  },
                                ];

                              if (selectedLargeCategory) {
                                selectedLargeCategory.MEDIUM.map(
                                  (mediumCategory) => {
                                    if (
                                      !initialMediumCategory.find(
                                        (item) =>
                                          item.value ==
                                          mediumCategory.MEDIUM.id,
                                      )
                                    ) {
                                      initialMediumCategory.push({
                                        label: mediumCategory.MEDIUM.name,
                                        value: mediumCategory.MEDIUM.id,
                                      });
                                    }
                                  },
                                );
                              }
                              setDataOptionsCategoryMedium((prev) => ({
                                ...prev,
                                [stepKey]: prev[stepKey].map((item, i) =>
                                  i === index
                                    ? initialMediumCategory.filter(
                                        (item) => item.value !== '',
                                      )
                                    : item,
                                ),
                              }));
                            }
                            if (size === EventWorkCategory.MEDIUM) {
                              //  Reset data SMALL if MEDIUM change
                              setValue(
                                `${stepKey}.rawCategories.${index}.SMALL`,
                                {
                                  label: '',
                                  value: '',
                                },
                              );
                              // Set dataOption SMALL
                              const selectedLargeCategoryOption =
                                dataOrganizationCategories.find(
                                  (category) =>
                                    category.LARGE.id ==
                                    watch(
                                      `${stepKey}.rawCategories.${index}.LARGE`,
                                    ).value,
                                );

                              const selectedMediumCategoryOption =
                                selectedLargeCategoryOption
                                  ? selectedLargeCategoryOption?.MEDIUM.find(
                                      (category) =>
                                        category.MEDIUM.id == e.value,
                                    )
                                  : null;

                              const initialSmallCategory: OptionDropdownType[] =
                                [
                                  {
                                    label: '',
                                    value: '',
                                  },
                                ];
                              if (selectedMediumCategoryOption) {
                                selectedMediumCategoryOption.SMALL &&
                                  selectedMediumCategoryOption.SMALL.map(
                                    (smallCategory) => {
                                      if (
                                        !initialSmallCategory.find(
                                          (item) =>
                                            item.value == smallCategory.id,
                                        )
                                      ) {
                                        initialSmallCategory.push({
                                          label: smallCategory.name,
                                          value: smallCategory.id,
                                        });
                                      }
                                    },
                                  );
                              }

                              setDataOptionsCategorySmall((prev) => ({
                                ...prev,
                                [stepKey]: prev[stepKey].map((item, i) =>
                                  i === index
                                    ? initialSmallCategory.filter(
                                        (item) => item.value !== '',
                                      )
                                    : item,
                                ),
                              }));
                            }
                            onChange(e);
                          }}
                        />
                      </div>
                      {sizeKeys.length - 1 !== indexSize && (
                        <div>
                          <ImageRound
                            className="w-fit h-fit"
                            src="/icons/statistic-compare.svg"
                            name="icon chevron right"
                          />
                        </div>
                      )}
                    </div>
                  );
                }}
              />
            ))}

            <Button
              sz="sm"
              variant="outline"
              className="w-12 h-[30px] hover:opacity-70 !border-none !px-0 !py-0 !rounded-md text-xs !bg-[#EBF1F7]"
              type="button"
              name="Remove Category"
              onClick={() => {
                setIsFormTouched(true);
                removeOuter(index);

                setDataOptionsCategoryMedium((prev) => ({
                  ...prev,
                  [stepKey]: prev[stepKey].filter((_, i) => i !== index),
                }));

                setDataOptionsCategorySmall((prev) => ({
                  ...prev,
                  [stepKey]: prev[stepKey].filter((_, i) => i !== index),
                }));
              }}>
              削除
            </Button>
          </div>
        ))}
      </div>
      <div className="text-right flex justify-center w-full mt-2 ">
        <Button
          sz="sm"
          variant="outline"
          className="w-6 h-6 mr-[54px] text-xs !py-0 !px-0 border-none !rounded-full !bg-[#ECF0F2] hover:opacity-70"
          type="button"
          onClick={() => {
            setIsFormTouched(true);
            appendOuter({
              LARGE: { value: '', label: '' },
              MEDIUM: { value: '', label: '' },
              SMALL: { value: '', label: '' },
            });
            setDataOptionsCategoryMedium((prev) => ({
              ...prev,
              [stepKey]: [...prev[stepKey], [{ label: '', value: '' }]],
            }));

            setDataOptionsCategorySmall((prev) => ({
              ...prev,
              [stepKey]: [...prev[stepKey], [{ label: '', value: '' }]],
            }));
          }}>
          <ImageRound
            src="/icons/plus.svg"
            name="Add organization"
            className="h-3 w-3"
          />
        </Button>
      </div>
    </div>
  );
};

export default CategoryStepRaw;
