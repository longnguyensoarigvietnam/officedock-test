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
import { useMutation, useQueryClient } from 'react-query';
import { AxiosError } from 'axios';
import { Controller, useFieldArray, useForm, useWatch } from 'react-hook-form';

import ErrorMessage from '@components/common/ErrorMessage';
import Button from '@components/common/Button';
import Switch from '@components/common/Switch';
import Input from '@components/common/Input';
import ImageRound from '@components/common/ImageRound';
import DatePickerCustom from '@components/common/DatePicker/DatePickerCustom';
import Dropdown from '@components/common/Dropdown';

import useOrganizationStatisticCategories from '@hooks/useOrganizationStatisticCategories';
import useActualDurationDetail from '@hooks/useActualDurationDetail';

import { OptionDropdownType } from '@interfaces/common';
import { CategoryStructure } from '@interfaces/skills';
import {
  ActualDurationDefaultData,
  ActualDurationRequest,
  CreateActualDurationFormData,
} from '@interfaces/durations';

import { apiRouters, pageRouters } from '@constants/routers';
import {
  DATE_REQUIRED_DURATION,
  END_DATE_WRONG_SELECTED,
  ERROR_COMMON_MESSAGE,
  ERROR_MESSAGE_TIME_TASK,
  SUCCESS_UPDATE_MESSAGE,
} from '@constants/message';
import {
  EventCalendarType,
  EventWorkCategory,
  ServerStatusCode,
} from '@constants/enums';
import { DEFAULT_TASK_SCHEDULE_DURATION, NO_SETTING } from '@constants';

import { useToast } from '@providers/ToastProvider';
import { LoadingContext } from '@providers/LoadingProvider';
import { TaskContext } from '@providers/TaskProvider';
import { useSessionCache } from '@providers/SessionCacheProvider';

import {
  addTimeToDate,
  calculateActualDuration,
  convertDateToStartDate,
  convertToMinutes,
  convertToTimeString,
  formatTimeInput,
  generateTimeOptionsAsObjects,
  getTimeDifference,
  isCheckPermissionWithCloseDate,
} from '@utils/date';
import { removeDuplicateOptions } from '@utils';

import api from '@base/api';
import useCreationDataCommon from '@hooks/common/useCreationDataCommon';

const EditActualDurationsForm = () => {
  const { statusTaskSelected, setStatusTaskSelected } = useContext(TaskContext);
  const { data: session } = useSessionCache();

  // Params
  const params = useParams();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  // Toast
  const { showToast } = useToast();

  // Creation data
  const [dataOrganizationCategories, setDataOrganizationCategories] = useState<
    CategoryStructure[]
  >([]);
  const [dataOptionsCategorySmall, setDataOptionsCategorySmall] = useState<
    OptionDropdownType[]
  >([
    {
      label: NO_SETTING,
      value: NO_SETTING,
    },
  ]);
  const [dataOptionsCategoryMedium, setDataOptionsCategoryMedium] = useState<
    OptionDropdownType[]
  >([
    {
      label: NO_SETTING,
      value: NO_SETTING,
    },
  ]);
  const [dataOptionsCategoryLarge, setDataOptionsCategoryLarge] = useState<
    OptionDropdownType[]
  >([
    {
      label: NO_SETTING,
      value: NO_SETTING,
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

  // Task schedule data
  const [defaultTaskScheduleData, setDefaultTaskScheduleData] =
    useState<ActualDurationDefaultData>();
  const [calculatedActualDuration, setCalculatedActualDuration] = useState(
    DEFAULT_TASK_SCHEDULE_DURATION,
  );
  const [isSubmit, setIsSubmit] = useState(false);

  // Loading state
  const { setIsLoading } = useContext(LoadingContext);

  // Router
  const router = useRouter();

  // Time
  const [time, setTime] = useState<string>('');
  const [minDatePlan, setMinDatePlan] = useState<Date | null>();
  const currentDate = new Date();
  const optionTimeInput = generateTimeOptionsAsObjects();

  const { actualDurationDetail } = useActualDurationDetail({
    actualDurationId: Number(params.id),
    onSuccess: (data) => {
      setDefaultTaskScheduleData({
        title: data.title || '',
        taskId: data.taskId || '',
        scheduleId: data.scheduleId || '',
        isImportant: data.isImportant || false,
        organization: Number(data.organization),
        largeCategory: {
          label:
            data.categories?.find(
              (category) => category.type === EventWorkCategory.LARGE,
            )?.name || NO_SETTING,
          value:
            data.categories?.find(
              (category) => category.type === EventWorkCategory.LARGE,
            )?.id || NO_SETTING,
        },
        mediumCategory: {
          label:
            data.categories?.find(
              (category) => category.type === EventWorkCategory.MEDIUM,
            )?.name || NO_SETTING,
          value:
            data.categories?.find(
              (category) => category.type === EventWorkCategory.MEDIUM,
            )?.id || NO_SETTING,
        },
        smallCategory: {
          label:
            data.categories?.find(
              (category) => category.type === EventWorkCategory.SMALL,
            )?.name || NO_SETTING,
          value:
            data.categories?.find(
              (category) => category.type === EventWorkCategory.SMALL,
            )?.id || NO_SETTING,
        },
        tagIds: data.tags,
        scheduleType: {
          label: data.scheduleType || '',
          value: data.scheduleType || '',
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
          addTimeToDate(
            startedAtDate ? new Date(startedAtDate) : new Date(),
            startedAtTime,
          ),
          addTimeToDate(
            pausedAtDate ? new Date(pausedAtDate) : new Date(),
            pausedAtTime,
          )
            ? String(
                addTimeToDate(
                  pausedAtDate ? new Date(pausedAtDate) : new Date(),
                  pausedAtTime,
                ),
              )
            : '',
        )}`,
      );
    }
  };

  const { refetchOrganizationStatisticCategories } =
    useOrganizationStatisticCategories({
      organizationId: Number(defaultTaskScheduleData?.organization),
      condition: [Boolean(defaultTaskScheduleData?.organization)],
      onSuccess: (data) => {
        const organizationCategories = data.map((category) => {
          const largeCategory = category.LARGE || {
            id: NO_SETTING,
            name: NO_SETTING,
            uuid: '',
          };

          const mediumCategories = (category.MEDIUM || []).map(
            (mediumCategory) => {
              const mediumCategoryField = mediumCategory.MEDIUM || {
                id: NO_SETTING,
                name: NO_SETTING,
                uuid: '',
              };
              const smallCategories = mediumCategory.SMALL || [
                { id: NO_SETTING, name: NO_SETTING, uuid: '' },
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
              label: NO_SETTING,
              value: NO_SETTING,
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
  // Event types and tags - creation data
  useCreationDataCommon({
    organizationId: defaultTaskScheduleData?.organization
      ? String(defaultTaskScheduleData?.organization)
      : '',
    condition: [Boolean(defaultTaskScheduleData?.organization)],

    options: {
      get_event_types: true,
      get_tags: true,
      is_organization_calendar:
        searchParams.get('type') == EventCalendarType.SCHEDULE,
    },
    onSuccess: (data) => {
      if (data?.eventTypes) {
        setDataOptionsEventTypes(
          data?.eventTypes.map((org) => ({
            label: org,
            value: org,
          })),
        );
      }

      if (data?.tags) {
        setDataOptionsTagIds(
          data?.tags.map((org) => ({
            label: org.name as string,
            value: org.id || '',
          })),
        );
      }
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
      startedAtDate: '',
      startedAtTime: '',
      pausedAtTime: '',
      pausedAtDate: '',
    };
    if (defaultTaskScheduleData) {
      value.isImportant = defaultTaskScheduleData.isImportant || false;
      value.largeCategory = {
        value: defaultTaskScheduleData.largeCategory
          ? String(defaultTaskScheduleData.largeCategory?.value)
          : NO_SETTING,
        label: defaultTaskScheduleData.largeCategory
          ? String(defaultTaskScheduleData.largeCategory?.label)
          : NO_SETTING,
      };
      value.mediumCategory = {
        value: defaultTaskScheduleData.mediumCategory
          ? String(defaultTaskScheduleData.mediumCategory?.value)
          : NO_SETTING,
        label: defaultTaskScheduleData.mediumCategory
          ? String(defaultTaskScheduleData.mediumCategory?.label)
          : NO_SETTING,
      };
      value.smallCategory = {
        value: defaultTaskScheduleData.smallCategory
          ? String(defaultTaskScheduleData.smallCategory?.value)
          : NO_SETTING,
        label: defaultTaskScheduleData.smallCategory
          ? String(defaultTaskScheduleData.smallCategory?.label)
          : NO_SETTING,
      };
      value.scheduleType = {
        value: defaultTaskScheduleData.scheduleType
          ? String(defaultTaskScheduleData.scheduleType?.value)
          : '',
        label: defaultTaskScheduleData.scheduleType
          ? String(defaultTaskScheduleData.scheduleType?.label)
          : '',
      };
      if (actualDurationDetail) {
        (value.startedAtDate = actualDurationDetail.startedAt
          ? `${new Date(
              convertDateToStartDate(
                new Date(`${actualDurationDetail.startedAt}`).toISOString(),
              ),
            )}`
          : ''),
          (value.pausedAtDate = actualDurationDetail.pausedAt
            ? `${new Date(
                convertDateToStartDate(
                  new Date(`${actualDurationDetail.startedAt}`).toISOString(),
                ),
              )}`
            : ''),
          (value.startedAtTime = actualDurationDetail.startedAt
            ? convertToTimeString(`${actualDurationDetail.startedAt}`)
            : ''),
          (value.pausedAtTime = actualDurationDetail.pausedAt
            ? convertToTimeString(`${actualDurationDetail.pausedAt}`)
            : '');
        handleCalculateActualDuration(
          new Date(
            convertDateToStartDate(
              new Date(`${actualDurationDetail.startedAt}`).toISOString(),
            ),
          ),
          convertToTimeString(`${actualDurationDetail.startedAt}`),
          new Date(
            convertDateToStartDate(
              new Date(`${actualDurationDetail.startedAt}`).toISOString(),
            ),
          ),
          convertToTimeString(`${actualDurationDetail.pausedAt}`),
        );
      }
    }
    return value;
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
          label: NO_SETTING,
          value: NO_SETTING,
        },
      ]);
      return;
    }

    const selectedLargeCategory = dataOrganizationCategories.find(
      (category) => category.LARGE.id == watch('largeCategory.value'),
    );

    const initialMediumCategory: OptionDropdownType[] = [
      {
        label: NO_SETTING,
        value: NO_SETTING,
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
          label: NO_SETTING,
          value: NO_SETTING,
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
        label: NO_SETTING,
        value: NO_SETTING,
      },
    ];
    if (selectedMediumCategoryOption) {
      selectedMediumCategoryOption.SMALL &&
        selectedMediumCategoryOption.SMALL.map((smallCategory) => {
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
        prevState.filter((item) => item.value != option.value),
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

  const handleEditActualDuration = async (data: ActualDurationRequest) => {
    const { data: response } = await api.patch(
      apiRouters.ACTUAL_DURATION_DETAIL(Number(params.id)),
      data,
    );
    return response;
  };

  const { mutate: editActualDuration } = useMutation(
    'postEditActualDuration',
    handleEditActualDuration,
    {
      onSuccess: (data) => {
        showToast({
          description: SUCCESS_UPDATE_MESSAGE,
        });
        queryClient.refetchQueries(['getDataTaskHeaderList']);
        queryClient.refetchQueries(['getTaskDurationDetail']);

        if (
          data &&
          statusTaskSelected &&
          statusTaskSelected.taskDurationRunningUuid
        ) {
          if (statusTaskSelected.taskDurationRunningUuid === data.uuid) {
            setStatusTaskSelected({
              ...statusTaskSelected,
              taskDuration: getTimeDifference(data.startedAt, data.pausedAt),
            });
          }
        }
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

  const handleSubmitEditActualDuration = (
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
      tagIds: data.tagIds.map((tag) => {
        return Number(tag.value);
      }),
      categoryIds: categoryList,
      startedAt: addTimeToDate(
        data.startedAtDate ? new Date(data.startedAtDate) : new Date(),
        data.startedAtTime,
      ),
      pausedAt: addTimeToDate(
        data.pausedAtDate ? new Date(data.pausedAtDate) : new Date(),
        data.pausedAtTime,
      ),
    };
    if (searchParams.get('type') == EventCalendarType.TASK) {
      editActualDuration({
        taskId: actualDurationDetail?.taskId
          ? Number(actualDurationDetail?.taskId)
          : 0,
        isImportant: data.isImportant || false,
        ...actualDurationPayload,
      });
    } else {
      editActualDuration({
        scheduleId: actualDurationDetail?.scheduleId
          ? Number(actualDurationDetail?.scheduleId)
          : 0,
        ...actualDurationPayload,
        scheduleType: data.scheduleType?.value
          ? String(data.scheduleType.value)
          : null,
      });
    }
  };
  const isPermissionCloseDate = isCheckPermissionWithCloseDate({
    dateA: actualDurationDetail?.startedAt as Date,
    dateB: session?.user.company.startEditableDate || '',
  });

  return (
    <div className="flex flex-col justify-between h-full">
      <div>
        <p className="font-semibold mb-2 break-all max-w-full">
          {defaultTaskScheduleData?.title}
        </p>
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
                render={({ field: { value, onChange } }) => (
                  <Dropdown
                    placeholder="大カテゴリ"
                    className="!py-1 !h-[46px] text-sm border-[#77858F] rounded-md"
                    classNameTextData="!text-sm"
                    classNameOption="!text-sm"
                    classNameError="!text-sm"
                    options={removeDuplicateOptions(dataOptionsCategoryLarge)}
                    selectedOption={
                      (dataOptionsCategoryLarge?.find(
                        (element) =>
                          element.value == (value as OptionDropdownType)?.value,
                      ) as OptionDropdownType | undefined) || value
                    }
                    onChange={(e) => {
                      if (e.value != watch('largeCategory.value')) {
                        setValue('mediumCategory', { label: '', value: '' });
                        setValue('smallCategory', { label: '', value: '' });
                      }
                      onChange(e);
                    }}
                  />
                )}
              />
              {/* Category medium */}
              <Controller
                control={control}
                name={'mediumCategory'}
                render={({ field: { value, onChange } }) => (
                  <Dropdown
                    placeholder="中カテゴリ"
                    className="!h-[46px] !py-1 text-sm"
                    classNameTextData="!text-sm"
                    classNameOption="!text-sm"
                    classNameError="!text-sm"
                    selectedOption={
                      (dataOptionsCategoryMedium?.find(
                        (element) =>
                          element.value == (value as OptionDropdownType)?.value,
                      ) as OptionDropdownType | undefined) || value
                    }
                    options={removeDuplicateOptions(dataOptionsCategoryMedium)}
                    onChange={(e) => {
                      if (e.value != watch('mediumCategory.value')) {
                        setValue('smallCategory', { label: '', value: '' });
                      }
                      onChange(e);
                    }}
                  />
                )}
              />

              {/* Category small */}
              {searchParams.get('type') == EventCalendarType.TASK && (
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
                        (dataOptionsCategorySmall?.find(
                          (element) =>
                            element.value ==
                            (value as OptionDropdownType)?.value,
                        ) as OptionDropdownType | undefined) || value
                      }
                      options={removeDuplicateOptions(dataOptionsCategorySmall)}
                      placeholder="小カテゴリ"
                      onChange={(e) => {
                        onChange(e);
                      }}
                    />
                  )}
                />
              )}
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
            <div className="w-full flex flex-col gap-1 items-start ">
              <div className="w-full flex gap-2 items-start">
                <div className="w-[calc(50%_-_50px)] !h-[46px]">
                  <div className="flex gap-1">
                    <div className="w-[calc(100%)] ">
                      <Controller
                        control={control}
                        name="startedAtDate"
                        rules={{
                          required: DATE_REQUIRED_DURATION,
                        }}
                        render={({ field: { value, onChange } }) => (
                          <DatePickerCustom
                            className="h-[46px] !text-sm !pt-2 !pl-8 !pr-0 text-left"
                            customizedClassName="customized-datepicker"
                            selected={value ? new Date(value) : null}
                            disabled={!isPermissionCloseDate}
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
                        disabled={!isPermissionCloseDate}
                        valueInput={watch(`startedAtTime`)}
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
                        options={optionTimeInput}
                        classNameOption="!top-1/2 -translate-y-1/2 mt-[5px]"
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
                            className="h-[46px] !text-sm !pt-2 !pl-8 !pr-0 text-left"
                            selected={value ? new Date(value) : null}
                            minDate={
                              minDatePlan || (watch('startedAtDate') as Date)
                            }
                            disabled={!isPermissionCloseDate}
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
                        disabled={!isPermissionCloseDate}
                        valueInput={watch(`pausedAtTime`)}
                        register={register('pausedAtTime', {
                          required:
                            watch('pausedAtDate') !== null ? true : false,
                          validate: (value) => {
                            if (
                              new Date(`${watch('pausedAtDate')}`).getTime() ===
                                new Date(
                                  `${watch('startedAtDate')}`,
                                ).getTime() &&
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
                        classNameOption="!top-1/2 -translate-y-1/2 mt-[5px]"
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
                <p className="w-[110px] rounded-md bg-[#b3dff5] my-auto  text-center py-2.5 font-semibold">
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
          onClick={handleSubmit(handleSubmitEditActualDuration)}>
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

export default EditActualDurationsForm;
