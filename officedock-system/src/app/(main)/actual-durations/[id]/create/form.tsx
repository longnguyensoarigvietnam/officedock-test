'use client';
import React, {
  ChangeEvent,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useMutation } from 'react-query';
import { AxiosError } from 'axios';

import Button from '@components/common/Button';
import ErrorMessage from '@components/common/ErrorMessage';
import { Controller, useFieldArray, useForm, useWatch } from 'react-hook-form';
import Switch from '@components/common/Switch';
import Input from '@components/common/Input';
import ImageRound from '@components/common/ImageRound';
import DatePickerCustom from '@components/common/DatePicker/DatePickerCustom';
import Dropdown from '@components/common/Dropdown';

import useTaskDetail from '@hooks/useTaskDetail';
import useEventDetail from '@hooks/useEventDetail';
import useCreationDataTask from '@hooks/useCreationDataTask';
import useCreationDataEventCalendar from '@hooks/useCreationDataEventCalendar';
import useOrganizationStatisticCategories from '@hooks/useOrganizationStatisticCategories';

import { OptionDropdownType } from '@interfaces/common';
import {
  ActualDurationDefaultData,
  ActualDurationRequest,
  CreateActualDurationFormData,
} from '@interfaces/durations';
import { CategoryStructure } from '@interfaces/skills';

import { apiRouters, pageRouters } from '@constants/routers';
import {
  DATE_REQUIRED_DURATION,
  END_DATE_WRONG_SELECTED,
  ERROR_COMMON_MESSAGE,
  ERROR_MESSAGE_TIME_TASK,
  SUCCESS_CREATE_MESSAGE,
} from '@constants/message';
import {
  EventCalendarType,
  EventWorkCategory,
  ServerStatusCode,
} from '@constants/enums';
import { DEFAULT_TASK_SCHEDULE_DURATION, NO_OPTION_CATEGORY } from '@constants';

import { useToast } from '@providers/ToastProvider';
import { LoadingContext } from '@providers/LoadingProvider';
import {
  addTimeToDate,
  calculateActualDuration,
  convertToMinutes,
  convertToTimeString,
  formatTimeInput,
  generateTimeOptionsAsObjects,
} from '@utils/date';
import api from '@base/api';

const CreateActualDurationsForm = () => {
  const params = useParams();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const [dataOrganizationCategories, setDataOrganizationCategories] = useState<
    CategoryStructure[]
  >([]);
  const [dataOptionsCategorySmall, setDataOptionsCategorySmall] = useState<
    OptionDropdownType[]
  >([
    {
      label: NO_OPTION_CATEGORY,
      value: NO_OPTION_CATEGORY,
    },
  ]);
  const [dataOptionsCategoryMedium, setDataOptionsCategoryMedium] = useState<
    OptionDropdownType[]
  >([
    {
      label: NO_OPTION_CATEGORY,
      value: NO_OPTION_CATEGORY,
    },
  ]);
  const [dataOptionsCategoryLarge, setDataOptionsCategoryLarge] = useState<
    OptionDropdownType[]
  >([
    {
      label: NO_OPTION_CATEGORY,
      value: NO_OPTION_CATEGORY,
    },
  ]);
  const [dataOptionsTagIds, setDataOptionsTagIds] = useState<
    OptionDropdownType[]
  >([]);
  const [selectedTagIdsOptions, setSelectedTagIdsOptions] = useState<
    OptionDropdownType[]
  >([]);
  const [unSelectedTagIdsOptions, setUnSelectedTagIdsOptions] = useState<
    OptionDropdownType[]
  >([]);
  const [dataOptionsEventTypes, setDataOptionsEventTypes] = useState<
    OptionDropdownType[]
  >([]);
  const [calculatedActualDuration, setCalculatedActualDuration] = useState(
    DEFAULT_TASK_SCHEDULE_DURATION,
  );
  const [isSubmit, setIsSubmit] = useState(false);
  const { setIsLoading } = useContext(LoadingContext);
  const { creationDataTaskData } = useCreationDataTask({
    condition: [searchParams.get('type') == EventCalendarType.TASK],
  });
  const { creationDataEventCalendar } = useCreationDataEventCalendar({
    condition: [searchParams.get('type') == EventCalendarType.SCHEDULE],
  });

  const router = useRouter();
  const [time, setTime] = useState<string>('');
  const [minDatePlan, setMinDatePlan] = useState<Date | null>();
  const currentDate = new Date();
  const optionTimeInput = generateTimeOptionsAsObjects();
  const [defaultTaskScheduleData, setDefaultTaskScheduleData] =
    useState<ActualDurationDefaultData>();
  const taskId =
    searchParams.get('type') === EventCalendarType.TASK
      ? Number(params.id)
      : undefined;
  const scheduleId =
    searchParams.get('type') !== EventCalendarType.TASK
      ? Number(params.id)
      : undefined;
  useTaskDetail({
    taskId: taskId ? String(taskId) : '',
    onSuccess: (data) => {
      setDefaultTaskScheduleData({
        title: data.title,
        taskId: data.id,
        isImportant: data.isImportant || false,
        organization: data.organization && data.organization.id,
        largeCategory: {
          label: data.categories
            ? data.categories.find(
                (category) => category.type === EventWorkCategory.LARGE,
              )?.name ?? NO_OPTION_CATEGORY
            : NO_OPTION_CATEGORY,
          value: data.categories
            ? data.categories.find(
                (category) => category.type === EventWorkCategory.LARGE,
              )?.id ?? NO_OPTION_CATEGORY
            : NO_OPTION_CATEGORY,
        },
        mediumCategory: {
          label: data.categories
            ? data.categories.find(
                (category) => category.type === EventWorkCategory.MEDIUM,
              )?.name ?? NO_OPTION_CATEGORY
            : NO_OPTION_CATEGORY,
          value: data.categories
            ? data.categories.find(
                (category) => category.type === EventWorkCategory.MEDIUM,
              )?.id ?? NO_OPTION_CATEGORY
            : NO_OPTION_CATEGORY,
        },
        smallCategory: {
          label: data.categories
            ? data.categories.find(
                (category) => category.type === EventWorkCategory.SMALL,
              )?.name ?? NO_OPTION_CATEGORY
            : NO_OPTION_CATEGORY,
          value: data.categories
            ? data.categories.find(
                (category) => category.type === EventWorkCategory.SMALL,
              )?.id ?? NO_OPTION_CATEGORY
            : NO_OPTION_CATEGORY,
        },
        tagIds: data.tags as { id: number; name: string }[],
      });
    },
    onError: (error: AxiosError) => {
      if (error.response?.status === ServerStatusCode.NOT_FOUND) {
        router.push(pageRouters.ACTUAL_DURATIONS_MANAGEMENT.href);
        showToast({
          variant: 'error',
          description: ERROR_COMMON_MESSAGE,
        });
      }
    },
  });
  useEventDetail({
    scheduleId: scheduleId ? String(scheduleId) : '',
    onSuccess: (data) => {
      setDefaultTaskScheduleData({
        title: data.title,
        scheduleId: data.id,
        organization: data.organization && data.organization.id,
        largeCategory: {
          label:
            data.categories.length > 0
              ? data.categories.find(
                  (category: { id: number; type: string; name: string }) =>
                    category.type == EventWorkCategory.LARGE,
                )?.name ?? NO_OPTION_CATEGORY
              : NO_OPTION_CATEGORY,
          value:
            data.categories.length > 0
              ? data.categories.find(
                  (category: { id: number; type: string; name: string }) =>
                    category.type == EventWorkCategory.LARGE,
                )?.id ?? NO_OPTION_CATEGORY
              : NO_OPTION_CATEGORY,
        },
        mediumCategory: {
          label:
            data.categories.length > 0
              ? data.categories.find(
                  (category: { id: number; type: string; name: string }) =>
                    category.type == EventWorkCategory.MEDIUM,
                )?.name ?? NO_OPTION_CATEGORY
              : NO_OPTION_CATEGORY,
          value:
            data.categories.length > 0
              ? data.categories.find(
                  (category: { id: number; type: string; name: string }) =>
                    category.type == EventWorkCategory.MEDIUM,
                )?.id ?? NO_OPTION_CATEGORY
              : NO_OPTION_CATEGORY,
        },
        smallCategory: {
          label:
            data.categories.length > 0
              ? data.categories.find(
                  (category: { id: number; type: string; name: string }) =>
                    category.type == EventWorkCategory.SMALL,
                )?.name ?? NO_OPTION_CATEGORY
              : NO_OPTION_CATEGORY,
          value:
            data.categories.length > 0
              ? data.categories.find(
                  (category: { id: number; type: string; name: string }) =>
                    category.type == EventWorkCategory.SMALL,
                )?.id ?? NO_OPTION_CATEGORY
              : NO_OPTION_CATEGORY,
        },
        tagIds: data.tags,
        scheduleType: {
          label: data.type,
          value: data.type,
        },
      });
    },
    onError: (error: AxiosError) => {
      if (error.response?.status === ServerStatusCode.NOT_FOUND) {
        router.push(pageRouters.ACTUAL_DURATIONS_MANAGEMENT.href);
        showToast({
          variant: 'error',
          description: ERROR_COMMON_MESSAGE,
        });
      }
    },
  });
  const {
    control,
    watch,
    handleSubmit,
    getValues,
    setValue,
    setError,
    register,
    reset,
    formState: { errors },
  } = useForm<CreateActualDurationFormData>({
    mode: 'onSubmit',
  });
  const {
    fields: projectFields,
    append: appendProject,
    remove: removeProject,
  } = useFieldArray({
    control,
    name: 'tagIds',
  });

  useEffect(() => {
    const selectedValues = selectedTagIdsOptions.map((element) =>
      String(element.value),
    );
    const unSelectedOptions = dataOptionsTagIds.filter(
      (option) => !selectedValues.includes(String(option.value)),
    );
    setUnSelectedTagIdsOptions(unSelectedOptions);
  }, [dataOptionsTagIds, selectedTagIdsOptions]);

  useEffect(() => {
    if (creationDataTaskData) {
      setDataOptionsTagIds(
        creationDataTaskData.tags.map((org) => ({
          label: String(org.name),
          value: String(org.id),
        })),
      );
    }
  }, [creationDataTaskData]);

  useEffect(() => {
    if (creationDataEventCalendar) {
      setDataOptionsEventTypes(
        creationDataEventCalendar.types.map((org) => ({
          label: org,
          value: org,
        })),
      );
    }
  }, [creationDataEventCalendar]);

  const { refetchOrganizationStatisticCategories } =
    useOrganizationStatisticCategories({
      organizationId: Number(defaultTaskScheduleData?.organization),
      condition: [Boolean(defaultTaskScheduleData?.organization)],
      onSuccess: (data) => {
        const organizationCategories = data.map((category) => {
          const largeCategory = category.LARGE || {
            id: NO_OPTION_CATEGORY,
            name: NO_OPTION_CATEGORY,
            uuid: '',
          };

          const mediumCategories = (category.MEDIUM || []).map(
            (mediumCategory) => {
              const mediumCategoryField = mediumCategory.MEDIUM || {
                id: NO_OPTION_CATEGORY,
                name: NO_OPTION_CATEGORY,
                uuid: '',
              };
              const smallCategories = mediumCategory.SMALL || [
                { id: NO_OPTION_CATEGORY, name: NO_OPTION_CATEGORY, uuid: '' },
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
              label: NO_OPTION_CATEGORY,
              value: NO_OPTION_CATEGORY,
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
          return largeCategories;
        });
      },
    });

  useEffect(() => {
    if (defaultTaskScheduleData) {
      refetchOrganizationStatisticCategories();
    }
  }, [defaultTaskScheduleData, refetchOrganizationStatisticCategories]);

  const defaultValues = useMemo(() => {
    const value = {
      taskId: '',
      scheduleId: '',
      tagIds: defaultTaskScheduleData ? [] : [{ label: '', value: '' }],
      largeCategory: { label: '', value: '' },
      mediumCategory: { label: '', value: '' },
      smallCategory: { label: '', value: '' },
      isImportant: false,
      scheduleType: { label: '', value: '' },
    };
    if (defaultTaskScheduleData) {
      value.isImportant = defaultTaskScheduleData.isImportant || false;
      value.largeCategory = {
        value: defaultTaskScheduleData.largeCategory
          ? String(defaultTaskScheduleData.largeCategory?.value)
          : NO_OPTION_CATEGORY,
        label: defaultTaskScheduleData.largeCategory
          ? String(defaultTaskScheduleData.largeCategory?.label)
          : NO_OPTION_CATEGORY,
      };
      value.mediumCategory = {
        value: defaultTaskScheduleData.mediumCategory
          ? String(defaultTaskScheduleData.mediumCategory?.value)
          : NO_OPTION_CATEGORY,
        label: defaultTaskScheduleData.mediumCategory
          ? String(defaultTaskScheduleData.mediumCategory?.label)
          : NO_OPTION_CATEGORY,
      };
      value.smallCategory = {
        value: defaultTaskScheduleData.smallCategory
          ? String(defaultTaskScheduleData.smallCategory?.value)
          : NO_OPTION_CATEGORY,
        label: defaultTaskScheduleData.smallCategory
          ? String(defaultTaskScheduleData.smallCategory?.label)
          : NO_OPTION_CATEGORY,
      };
      value.scheduleType = {
        value: defaultTaskScheduleData.scheduleType
          ? String(defaultTaskScheduleData.scheduleType?.value)
          : '',
        label: defaultTaskScheduleData.scheduleType
          ? String(defaultTaskScheduleData.scheduleType?.label)
          : '',
      };
    }
    return value;
  }, [defaultTaskScheduleData]);

  useEffect(() => {
    reset(defaultValues);
  }, [defaultValues, reset]);

  // Watch the form fields dynamically
  const largeCategoryValue = useWatch({
    control,
    name: 'largeCategory.value',
  });

  const mediumCategoryValue = useWatch({
    control,
    name: 'mediumCategory.value',
  });

  // Dynamically compute dropdown options
  useMemo(() => {
    if (!dataOrganizationCategories || !watch('largeCategory.value')) {
      setDataOptionsCategoryMedium([
        {
          label: NO_OPTION_CATEGORY,
          value: NO_OPTION_CATEGORY,
        },
      ]);
      return;
    }

    const selectedLargeCategory = dataOrganizationCategories.find(
      (category) => category.LARGE.id == watch('largeCategory.value'),
    );

    const initialMediumCategory: OptionDropdownType[] = [
      {
        label: NO_OPTION_CATEGORY,
        value: NO_OPTION_CATEGORY,
      },
    ];

    if (selectedLargeCategory) {
      selectedLargeCategory.MEDIUM.map((mediumCategory) => {
        if (
          !initialMediumCategory.find(
            (item) => item.value == mediumCategory.MEDIUM.id,
          )
        ) {
          initialMediumCategory.push({
            label: mediumCategory.MEDIUM.name,
            value: mediumCategory.MEDIUM.id,
          });
        }
      });
    }
    setDataOptionsCategoryMedium(initialMediumCategory);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataOrganizationCategories, largeCategoryValue, watch]);

  useMemo(() => {
    if (!dataOrganizationCategories || !watch('mediumCategory.value')) {
      setDataOptionsCategorySmall([
        {
          label: NO_OPTION_CATEGORY,
          value: NO_OPTION_CATEGORY,
        },
      ]);
      return;
    }

    const selectedLargeCategoryOption = dataOrganizationCategories.find(
      (category) => category.LARGE.id == watch('largeCategory.value'),
    );

    const selectedMediumCategoryOption =
      selectedLargeCategoryOption?.MEDIUM.find(
        (category) => category.MEDIUM.id == watch('mediumCategory.value'),
      );

    const initialSmallCategory: OptionDropdownType[] = [
      {
        label: NO_OPTION_CATEGORY,
        value: NO_OPTION_CATEGORY,
      },
    ];
    if (selectedMediumCategoryOption) {
      selectedMediumCategoryOption.SMALL && selectedMediumCategoryOption.SMALL.map((smallCategory) => {
        if (
          !initialSmallCategory.find((item) => item.value == smallCategory.id)
        ) {
          initialSmallCategory.push({
            label: smallCategory.name,
            value: smallCategory.id,
          });
        }
      });
    }

    setDataOptionsCategorySmall(initialSmallCategory);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    dataOrganizationCategories,
    largeCategoryValue,
    mediumCategoryValue,
    watch,
  ]);

  useEffect(() => {
    if (defaultTaskScheduleData) {
      if (defaultTaskScheduleData.tagIds) {
        defaultTaskScheduleData.tagIds.map((element) => {
          return appendProject({
            label: element.name,
            value: element.id,
          });
        });
      } else {
        appendProject({
          label: '',
          value: '',
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appendProject, defaultTaskScheduleData]);

  useEffect(() => {
    if (defaultTaskScheduleData && defaultTaskScheduleData.tagIds) {
      setSelectedTagIdsOptions(
        defaultTaskScheduleData.tagIds.map((org) => ({
          label: org.name,
          value: String(org.id),
        })),
      );
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultTaskScheduleData, defaultTaskScheduleData?.tagIds]);

  const handleSelectedTagIds = useCallback(
    (index: number, option: OptionDropdownType) => {
      setSelectedTagIdsOptions((prevState) => {
        const existingElement = prevState?.[index];
        if (existingElement) {
          prevState.splice(index, 1);
        }
        return [...prevState, option];
      });
    },
    [],
  );

  const handleRemoveSelectedTagId = useCallback(
    (option: OptionDropdownType, index: number) => {
      setSelectedTagIdsOptions((prevState) =>
        prevState.filter((item) => item.value !== option.value),
      );
      removeProject(index);
    },
    [removeProject],
  );

  const handleChange = (
    e: ChangeEvent<HTMLInputElement>,
    field: keyof CreateActualDurationFormData,
  ): void => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 4) {
      value = value.substring(0, 4);
    }
    setTime(value);
    setValue(field, value);
  };

  const handleCreateActualDuration = async (data: ActualDurationRequest) => {
    const { data: response } = await api.post(
      apiRouters.ACTUAL_DURATIONS_LIST,
      data,
    );
    return response;
  };

  const { mutate: createActualDuration } = useMutation(
    'postCreateActualDuration',
    handleCreateActualDuration,
    {
      onSuccess: () => {
        showToast({
          description: SUCCESS_CREATE_MESSAGE,
        });
        router.push(pageRouters.ACTUAL_DURATIONS_MANAGEMENT.href);
      },
      onError: () => {
        setError('startedAtDate', {
          message: ERROR_MESSAGE_TIME_TASK,
        });
        setIsSubmit(false);
      },
      onSettled: () => {
        setIsLoading(false);
      },
    },
  );

  const handleSubmitCreateActualDuration = (
    data: CreateActualDurationFormData,
  ) => {
    if (isSubmit) return;
    setIsSubmit(true);
    const categoryList: { categoryId: number; type: string }[] = [];
    if (data.largeCategory.value) {
      categoryList.push({
        type: EventWorkCategory.LARGE,
        categoryId: Number(data.largeCategory.value),
      });
    }
    if (data.mediumCategory.value) {
      categoryList.push({
        type: EventWorkCategory.MEDIUM,
        categoryId: Number(data.mediumCategory.value),
      });
    }
    if (data.smallCategory.value) {
      categoryList.push({
        type: EventWorkCategory.SMALL,
        categoryId: Number(data.smallCategory.value),
      });
    }
    const actualDurationPayload = {
      tagIds: data.tagIds.filter((tag) => tag.value).map((tag) => {
        return Number(tag.value);
      }),
      categoryIds: categoryList,
      startedAt: addTimeToDate(data.startedAtDate as Date, data.startedAtTime),
      pausedAt: addTimeToDate(data.pausedAtDate as Date, data.pausedAtTime),
    };
    if (searchParams.get('type') == EventCalendarType.TASK) {
      createActualDuration({
        taskId: Number(params.id),
        isImportant: data.isImportant || false,
        ...actualDurationPayload,
      });
    } else {
      createActualDuration({
        scheduleId: Number(params.id),
        ...actualDurationPayload,
        scheduleType: data.scheduleType?.value
          ? String(data.scheduleType.value)
          : null,
      });
    }
  };

  const handleCalculateActualDuration = (
    startedAtDate: Date,
    startedAtTime: string,
    pausedAtDate: Date,
    pausedAtTime: string,
  ) => {
    if (!startedAtDate || !startedAtTime || !pausedAtDate || !pausedAtTime)
      setCalculatedActualDuration('0時間 0分');
    else {
      setCalculatedActualDuration(
        `${calculateActualDuration(
          addTimeToDate(startedAtDate as Date, startedAtTime),
          addTimeToDate(pausedAtDate as Date, pausedAtTime)
            ? String(addTimeToDate(pausedAtDate as Date, pausedAtTime))
            : '',
        )}`,
      );
    }
  };

  return (
    <div className="flex flex-col justify-between h-full">
      <div>
        <div>
          <p className="font-semibold mb-2">{defaultTaskScheduleData?.title}</p>
        </div>
        <div>
          {searchParams.get('type') == EventCalendarType.SCHEDULE && (
            <div className="flex flex-col gap-2 mb-5">
              <div className="w-full max-w-[120px]">予定の種類</div>
              <div className="w-1/2">
                <Controller
                  control={control}
                  name={'scheduleType'}
                  render={({ field: { value, onChange } }) => {
                    const selectedOption = dataOptionsEventTypes?.find(
                      (element) =>
                        element.value === (value as OptionDropdownType)?.value,
                    ) as OptionDropdownType | undefined;

                    return (
                      <Dropdown
                        className="h-[46px] !py-1 text-sm"
                        classNameTextData="!text-sm"
                        classNameOption="!text-sm"
                        options={dataOptionsEventTypes}
                        placeholder="打ち合わせ"
                        selectedOption={selectedOption}
                        onChange={onChange}
                      />
                    );
                  }}
                />
              </div>
            </div>
          )}
          <div className="flex flex-col gap-2 mb-5">
            <div className="w-full">業務の種類</div>
            <div className="w-1/2 flex flex-col gap-4">
              {/* Category large */}
              <Controller
                control={control}
                name={'largeCategory'}
                render={({ field: { value, onChange } }) => {
                  return (
                    <Dropdown
                      placeholder="大カテゴリ"
                      className="!py-1 !h-[46px] text-sm border-[#77858F] rounded-md"
                      classNameTextData="!text-sm"
                      classNameOption="!text-sm"
                      classNameError="!text-sm"
                      options={dataOptionsCategoryLarge}
                      selectedOption={
                        dataOptionsCategoryLarge?.find(
                          (element) =>
                            element.value ==
                            (value as OptionDropdownType)?.value,
                        ) as OptionDropdownType | undefined
                      }
                      onChange={(e) => {
                        if (e.value != watch('largeCategory.value')) {
                          setValue('mediumCategory', { label: '', value: '' });
                          setValue('smallCategory', { label: '', value: '' });
                        }
                        onChange(e);
                      }}
                    />
                  );
                }}
              />
              {/* Category medium */}
              <Controller
                control={control}
                name={'mediumCategory'}
                render={({ field: { value, onChange } }) => {
                  return (
                    <Dropdown
                      placeholder="中カテゴリ"
                      className="!h-[46px] !py-1 text-sm"
                      classNameTextData="!text-sm"
                      classNameOption="!text-sm"
                      classNameError="!text-sm"
                      selectedOption={
                        dataOptionsCategoryMedium?.find(
                          (element) =>
                            element.value ==
                            (value as OptionDropdownType)?.value,
                        ) as OptionDropdownType | undefined
                      }
                      options={dataOptionsCategoryMedium}
                      onChange={(e) => {
                        if (e.value != watch('mediumCategory.value')) {
                          setValue('smallCategory', { label: '', value: '' });
                        }
                        onChange(e);
                      }}
                    />
                  );
                }}
              />

              {/* Category small */}
              <Controller
                control={control}
                name={'smallCategory'}
                render={({ field: { value, onChange } }) => (
                  <Dropdown
                    className="!h-[46px] !py-1 text-sm"
                    classNameTextData="!text-sm"
                    classNameOption="!text-sm"
                    classNameError="!text-sm"
                    selectedOption={
                      dataOptionsCategorySmall?.find(
                        (element) =>
                          element.value == (value as OptionDropdownType)?.value,
                      ) as OptionDropdownType | undefined
                    }
                    options={dataOptionsCategorySmall}
                    placeholder="小カテゴリ"
                    onChange={(e) => {
                      onChange(e);
                    }}
                  />
                )}
              />
            </div>
          </div>
          <div className="grid gap-3 w-1/2">
            <label className="text-sm ">集計タグ</label>
            {projectFields.map((field, index) => (
              <div className="flex gap-2" key={field.id}>
                <Controller
                  control={control}
                  name={`tagIds.${index}`}
                  render={({ field: { value, onChange } }) => {
                    return (
                      <Dropdown
                        placeholder="選択してください"
                        className="!py-1 !h-[46px] text-sm border-[#77858F] rounded-md"
                        classNameOption="!text-sm"
                        classNameTextData="!text-sm"
                        options={unSelectedTagIdsOptions}
                        selectedOption={dataOptionsTagIds.find(
                          (element) => element.value == value?.value,
                        )}
                        onChange={(option: OptionDropdownType) => {
                          onChange(option);
                          handleSelectedTagIds(index, option);
                        }}
                        error={errors.tagIds?.[index]?.value?.message}
                      />
                    );
                  }}
                />
                <div className="mt-[2.5px]">
                  <Button
                    sz="sm"
                    variant="outline"
                    className="w-[99px]"
                    type="button"
                    name="Remove TagId"
                    onClick={() => {
                      handleRemoveSelectedTagId(
                        watch(`tagIds.${index}`),
                        index,
                      );
                    }}>
                    削除
                  </Button>
                </div>
              </div>
            ))}
            <div className="text-right">
              <Button
                sz="sm"
                variant="outline"
                className="w-[99px]"
                type="button"
                onClick={() => appendProject({ label: '', value: '' })}>
                <ImageRound
                  src="/icons/plus.svg"
                  name="Add organization"
                  className="mr-3 h-4 w-4"
                />
                追加
              </Button>
            </div>
          </div>
          {searchParams.get('type') == EventCalendarType.TASK && (
            <div className="flex flex-col gap-2 mb-5">
              <div className="w-full max-w-[100px]">重要</div>
              <div className="w-full max-w-48 ">
                <Controller
                  control={control}
                  name="isImportant"
                  render={({ field: { value, onChange } }) => {
                    return (
                      <Switch
                        customTranslate="!translate-x-[115%]"
                        enable={value}
                        onChange={(e) => {
                          onChange(e);
                        }}
                      />
                    );
                  }}
                />
              </div>
            </div>
          )}
          <div className="flex flex-col gap-2 w-1/2">
            <div className="w-full">計測時間</div>
            <div className="w-full flex flex-col gap-1 items-start">
              <div className="w-full flex gap-2 items-start">
                <div className="w-[calc(50%_-_50px)] !h-[46px]">
                  <div className="flex gap-1">
                    <div className="w-[calc(100%)]">
                      <Controller
                        control={control}
                        name="startedAtDate"
                        rules={{
                          required: DATE_REQUIRED_DURATION,
                        }}
                        render={({ field: { value, onChange } }) => (
                          <DatePickerCustom
                            className="h-[46px] !text-sm !pt-2 !pl-6 text-center"
                            customizedClassName="customized-datepicker"
                            selected={value ? new Date(value) : null}
                            onChange={(e) => {
                              onChange(e);
                              if (e !== null) {
                                const newDate = new Date(e.getTime());
                                setMinDatePlan(newDate);
                              } else {
                                setMinDatePlan(null);
                              }
                              if (!getValues('startedAtTime')) {
                                setValue(
                                  'startedAtTime',
                                  convertToTimeString(`${currentDate}`),
                                );
                              }
                              setValue('pausedAtDate', null);
                              setValue('pausedAtTime', '');
                              handleCalculateActualDuration(
                                watch('startedAtDate') as Date,
                                `${watch('startedAtTime')}`,
                                watch('pausedAtDate') as Date,
                                `${watch('pausedAtTime')}`,
                              );
                            }}
                          />
                        )}
                      />
                    </div>
                    <div className="w-[115px] relative">
                      <Input
                        isShowClockIcon={true}
                        register={register('startedAtTime', {
                          required:
                            watch('startedAtDate') !== null ? true : false,
                          onChange: (e) => {
                            handleChange(e, 'startedAtTime');
                            if (getValues('startedAtDate') === null) {
                              setValue(
                                'startedAtDate',
                                (() => {
                                  const today: Date = new Date();
                                  today.setHours(0, 0, 0, 0);
                                  return today;
                                })(),
                              );
                              setValue('pausedAtDate', null);
                              setValue('startedAtTime', '');
                              setMinDatePlan(new Date());
                            }
                          },
                          onBlur: () => {
                            if (time) {
                              setValue('startedAtTime', formatTimeInput(time));
                            }
                            setTime('');
                            handleCalculateActualDuration(
                              watch('startedAtDate') as Date,
                              `${watch('startedAtTime')}`,
                              watch('pausedAtDate') as Date,
                              `${watch('pausedAtTime')}`,
                            );
                          },
                        })}
                        classNameOption="top-[25px]"
                        options={optionTimeInput}
                        onChangeDropdown={(e) => {
                          setValue('startedAtTime', e.label);
                          handleCalculateActualDuration(
                            watch('startedAtDate') as Date,
                            `${watch('startedAtTime')}`,
                            watch('pausedAtDate') as Date,
                            `${watch('pausedAtTime')}`,
                          );
                        }}
                        autoComplete="off"
                        type="text"
                        className="h-[46px] !text-sm !pl-6 text-center"
                      />
                    </div>
                  </div>
                </div>
                <div className="!h-[46px] flex items-center">〜</div>
                <div className="w-[calc(50%_-_50px)] !h-[46px]">
                  <div className="flex gap-1">
                    <div className="w-[calc(100%)]">
                      <Controller
                        control={control}
                        name="pausedAtDate"
                        rules={{
                          required: watch('startedAtDate')
                            ? DATE_REQUIRED_DURATION
                            : false,
                        }}
                        render={({ field: { value, onChange } }) => (
                          <DatePickerCustom
                            className="h-[46px] !px-2 !text-sm !pt-2 !pl-6 text-center"
                            selected={value ? new Date(value) : null}
                            minDate={minDatePlan}
                            onChange={(e) => {
                              onChange(e);
                              if (!getValues('pausedAtTime')) {
                                setValue(
                                  'pausedAtTime',
                                  convertToTimeString(`${currentDate}`),
                                );
                              }
                              handleCalculateActualDuration(
                                watch('startedAtDate') as Date,
                                `${watch('startedAtTime')}`,
                                watch('pausedAtDate') as Date,
                                `${watch('pausedAtTime')}`,
                              );
                            }}
                          />
                        )}
                      />
                    </div>
                    <div className="w-[115px] relative">
                      <Input
                        isShowClockIcon={true}
                        register={register('pausedAtTime', {
                          required:
                            watch('pausedAtDate') !== null ? true : false,
                          validate: (value) => {
                            if (
                              new Date(
                                `${watch('pausedAtDate')}`,
                              )?.getTime() ===
                                new Date(
                                  `${watch('startedAtDate')}`,
                                )?.getTime() &&
                              watch('pausedAtDate') !== null
                            ) {
                              return (
                                (value &&
                                  convertToMinutes(value) >
                                    convertToMinutes(
                                      watch('startedAtTime') as string,
                                    )) ||
                                END_DATE_WRONG_SELECTED
                              );
                            }
                            return true;
                          },
                          onChange: (e) => {
                            handleChange(e, 'pausedAtTime');
                            if (getValues('pausedAtDate') === null) {
                              if (getValues('startedAtDate') !== null) {
                                setValue(
                                  'pausedAtDate',
                                  getValues('startedAtDate'),
                                );
                              } else {
                                setValue(
                                  'pausedAtDate',
                                  (() => {
                                    const today: Date = new Date();
                                    today.setHours(0, 0, 0, 0);
                                    return today;
                                  })(),
                                );
                              }
                            }
                          },
                          onBlur: (e) => {
                            if (time) {
                              setValue('pausedAtTime', formatTimeInput(time));
                            }

                            if (
                              new Date(
                                `${watch('pausedAtDate')}`,
                              )?.getTime() ===
                                new Date(
                                  `${watch('startedAtDate')}`,
                                )?.getTime() &&
                              watch('pausedAtDate') !== null
                            ) {
                              if (
                                e.target.value &&
                                convertToMinutes(e.target.value) >
                                  convertToMinutes(
                                    watch('startedAtTime') as string,
                                  )
                              ) {
                                setError('pausedAtTime', {
                                  message: '',
                                });
                              }
                            }
                            setTime('');
                            handleCalculateActualDuration(
                              watch('startedAtDate') as Date,
                              `${watch('startedAtTime')}`,
                              watch('pausedAtDate') as Date,
                              `${watch('pausedAtTime')}`,
                            );
                          },
                        })}
                        classNameOption="top-[25px]"
                        options={optionTimeInput}
                        onChangeDropdown={(e) => {
                          setValue('pausedAtTime', e.label);
                          handleCalculateActualDuration(
                            watch('startedAtDate') as Date,
                            `${watch('startedAtTime')}`,
                            watch('pausedAtDate') as Date,
                            `${watch('pausedAtTime')}`,
                          );
                        }}
                        type="text"
                        className="h-[46px] !text-sm !pl-6 text-center"
                      />
                    </div>
                  </div>
                </div>
                <p className="w-[110px] rounded-md bg-[#b3dff5] my-auto text-center py-2.5 font-semibold">
                  {calculatedActualDuration}
                </p>
              </div>
            </div>
            <div className="flex mb-7">
              {errors.startedAtDate ? (
                <div>
                  <ErrorMessage
                    error={errors.startedAtDate?.message}
                    className="mt-[5px] mb-[5px] text-md"
                  />
                </div>
              ) : (
                <div className="w-[calc(50%_-_35px)]"></div>
              )}
              <div>
                <ErrorMessage
                  error={
                    errors.pausedAtDate?.message || errors.pausedAtTime?.message
                  }
                  className="mt-[5px] mb-[5px] text-md"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="w-full flex items-center gap-2 mt-0 flex-col mb-3">
        <Button
          className="w-[426px]"
          onClick={handleSubmit(handleSubmitCreateActualDuration)}>
          保存
        </Button>
        <Button
          className="w-[426px]"
          variant="secondary"
          type="button"
          onClick={() =>
            router.push(pageRouters.ACTUAL_DURATIONS_MANAGEMENT.href)
          }>
          戻る
        </Button>
      </div>
    </div>
  );
};

export default CreateActualDurationsForm;
