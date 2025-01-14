'use client';
import React, {
  ChangeEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useSession } from 'next-auth/react';
import {
  Controller,
  SubmitHandler,
  useFieldArray,
  useForm,
  useWatch,
} from 'react-hook-form';

import CustomDatePicker from '@components/common/CustomDatePicker';
import Button from '@components/common/Button';
import Dropdown from '@components/common/Dropdown';
import DatePicker from '@components/common/DatePicker';
import Input from '@components/common/Input';
import TextArea from '@components/common/TextArea';
import ImageRound from '@components/common/ImageRound';
import ErrorMessage from '@components/common/ErrorMessage';
import InputSearch from '@components/common/InputSearch';
import Checkbox from '@components/common/Checkbox';
import Drawer from '@components/common/Drawers';

import { OptionDropdownType } from '@interfaces/common';
import {
  CreationDataEventCalendar,
  EventEditFormData,
  EventFormData,
  EventParticipant,
} from '@interfaces/calendar';

import {
  ActionsEvent,
  EventWorkCategory,
  PermissionsSystem,
  ScreenName,
  ViewOptions,
} from '@constants/enums';
import {
  END_DATE_REQUIRED_SELECTED,
  END_DATE_WRONG_SELECTED,
  ORGANIZATION_REQUIRED_MESSAGE,
  START_DATE_WRONG_SELECTED,
} from '@constants/message';
import { NO_OPTION_CATEGORY } from '@constants';
import {
  addHoursToDate,
  convertDateToStartDate,
  convertToMinutes,
  convertToTimeString,
  formatTimeInput,
} from '@utils/date';
import { hasPermissionInArray } from '@utils';
import useOrganizationStatisticCategories from '@hooks/useOrganizationStatisticCategories';
import { CategoryStructure } from '@interfaces/skills';
import { Organizations } from '@interfaces/organization';

export type ActionsEventModalProps = {
  open: boolean;
  dataEvent?: EventEditFormData;
  creationDataEventCalendar: CreationDataEventCalendar | undefined;
  action?: string;
  onDelete?: (values: EventEditFormData) => void;
  onClose: () => void;
  onSubmit?: (values: EventFormData) => void;
  onEdit?: (values: EventEditFormData) => void;
  defaultStartDate?: Date | undefined;
  calendarView?: string | null;
  backToEditing?: boolean;
};

const ActionsEventModal = ({
  open,
  dataEvent,
  action = 'CREATE',
  onClose,
  onEdit,
  onDelete,
  onSubmit,
  creationDataEventCalendar,
  defaultStartDate,
  calendarView,
  backToEditing,
}: ActionsEventModalProps) => {
  const [dataOptionsEventTypes, setDataOptionsEventTypes] = useState<
    OptionDropdownType[]
  >([]);
  const [dataOptionsOrganizations, setDataOptionsOrganizations] = useState<
    OptionDropdownType[]
  >([]);
  const [dataOrganizationCategories, setDataOrganizationCategories] = useState<
    CategoryStructure[]
  >([]);
  const [dataOptionsCategorySmall, setDataOptionsCategorySmall] = useState<
    OptionDropdownType[]
  >([]);
  const [dataOptionsCategoryMedium, setDataOptionsCategoryMedium] = useState<
    OptionDropdownType[]
  >([]);
  const [dataOptionsCategoryLarge, setDataOptionsCategoryLarge] = useState<
    OptionDropdownType[]
  >([]);
  const [dataOptionsTagIds, setDataOptionsTagIds] = useState<
    OptionDropdownType[]
  >([]);
  const [dataOptionsParticipants, setDataOptionsParticipants] = useState<
    EventParticipant[]
  >([]);
  const [unSelectedTagIdsOptions, setUnSelectedTagIdsOptions] = useState<
    OptionDropdownType[]
  >([]);
  const [selectedTagIdsOptions, setSelectedTagIdsOptions] = useState<
    OptionDropdownType[]
  >([]);
  const [searchName, setSearchName] = useState<string>('');
  const [time, setTime] = useState<string>('');
  const [minDatePlan, setMinDatePlan] = useState<Date | null>();
  const { data: session } = useSession();
  const currentDate = new Date();

  const {
    register,
    control,
    watch,
    setValue,
    setError,
    getValues,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EventFormData | EventEditFormData>({
    mode: 'onSubmit',
    defaultValues: {
      startDate: defaultStartDate,
      endDate: defaultStartDate,
    },
  });

  const {
    fields: projectFields,
    append: appendProject,
    remove: removeProject,
  } = useFieldArray({
    control,
    name: 'tagIds',
  });

  const organizationValue = useWatch({
    control,
    name: 'organization.value',
  });

  const { refetchOrganizationStatisticCategories } =
    useOrganizationStatisticCategories({
      organizationId: Number(organizationValue),
      condition: [Boolean(organizationValue)],
      currentScreen: ScreenName.CALENDAR,
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
          const largeCategories: OptionDropdownType[] = [];
          data.map((category) => {
            if (category.LARGE) {
              largeCategories.push({
                label: category.LARGE.name,
                value: category.LARGE.id,
              });
            } else {
              largeCategories.push({
                label: NO_OPTION_CATEGORY,
                value: NO_OPTION_CATEGORY,
              });
            }
          });
          return largeCategories;
        });
      },
    });

  useEffect(() => {
    if (organizationValue) {
      refetchOrganizationStatisticCategories();
    }
  }, [organizationValue, refetchOrganizationStatisticCategories]);

  const defaultValues = useMemo<EventEditFormData>(() => {
    const value: EventEditFormData = {
      participantIds: [session?.user.id as number],
      largeCategory: { label: '', value: '' },
      mediumCategory: { label: '', value: '' },
      smallCategory: { label: '', value: '' },
      endDate: null,
      startDate: null,
      endTime: '',
      startTime: '',
      title: '',
      type: {
        label: '',
        value: '',
      },
      memo: '',
      address: '',
      isAllDay: false,
      tagIds: dataEvent ? [] : [{ label: '', value: '' }],
    };
    if (dataEvent) {
      let newParticipantIds: number[] = [];
      if (backToEditing) {
        newParticipantIds = dataEvent.participantIds
          ? dataEvent.participantIds
          : [];
      } else {
        if (dataEvent.participants) {
          dataEvent.participants
            .filter((item) => item.id !== '')
            .map((item) => newParticipantIds.push(item.id as number));
        }
      }
      let newLargeCategory: OptionDropdownType = { label: '', value: '' };
      let newMediumCategory: OptionDropdownType = { label: '', value: '' };
      let newSmallCategory: OptionDropdownType = { label: '', value: '' };

      if (dataEvent.categories) {
        const largeCat = dataEvent.categories.find(
          (category) => category.type === EventWorkCategory.LARGE,
        );
        newLargeCategory = {
          value: largeCat ? `${largeCat?.id}` : NO_OPTION_CATEGORY,
          label: largeCat ? `${largeCat?.name}` : NO_OPTION_CATEGORY,
        };
        const mediumCat = dataEvent.categories.find(
          (category) => category.type === EventWorkCategory.MEDIUM,
        );
        newMediumCategory = {
          value: mediumCat ? `${mediumCat?.id}` : NO_OPTION_CATEGORY,
          label: mediumCat ? `${mediumCat?.name}` : NO_OPTION_CATEGORY,
        };
        const smallCat = dataEvent.categories.find(
          (category) => category.type === EventWorkCategory.SMALL,
        );
        newSmallCategory = {
          value: smallCat ? `${smallCat?.id}` : NO_OPTION_CATEGORY,
          label: smallCat ? `${smallCat?.name}` : NO_OPTION_CATEGORY,
        };
      }

      (value.id = `${dataEvent.id}`),
        (value.title = dataEvent.title),
        (value.participantIds = newParticipantIds),
        (value.organization = dataEvent.organization
          ? {
              label: backToEditing
                ? ((dataEvent.organization as OptionDropdownType)
                    .label as string)
                : dataEvent.organization
                  ? (dataEvent.organization as Organizations).name
                  : '',
              value: backToEditing
                ? ((dataEvent.organization as OptionDropdownType)
                    .value as string)
                : dataEvent.organization
                  ? ((dataEvent.organization as Organizations).id as number)
                  : '',
            }
          : undefined),
        (value.largeCategory = backToEditing
          ? dataEvent.largeCategory
          : newLargeCategory),
        (value.mediumCategory = backToEditing
          ? dataEvent.mediumCategory
          : newMediumCategory),
        (value.smallCategory = backToEditing
          ? dataEvent.smallCategory
          : newSmallCategory),
        (value.memo = dataEvent.memo),
        (value.address = dataEvent.address),
        (value.isAllDay = dataEvent.isAllDay),
        (value.type = {
          label: backToEditing
            ? ((dataEvent.type as OptionDropdownType).label as string)
            : (dataEvent.type as string),
          value: backToEditing
            ? ((dataEvent.type as OptionDropdownType).value as string)
            : (dataEvent.type as string),
        }),
        (value.startDate = dataEvent.startDate
          ? new Date(
              convertDateToStartDate(
                new Date(`${dataEvent.startDate}`).toISOString(),
              ),
            )
          : null),
        (value.endDate = dataEvent.endDate
          ? new Date(
              convertDateToStartDate(
                new Date(`${dataEvent.endDate}`).toISOString(),
              ),
            )
          : null),
        (value.startTime = backToEditing
          ? dataEvent.startTime
          : dataEvent.startDate
            ? convertToTimeString(`${dataEvent.startDate}`)
            : null),
        (value.endTime = backToEditing
          ? dataEvent.endTime
          : dataEvent.endDate
            ? convertToTimeString(`${dataEvent.endDate}`)
            : null);
      if (dataEvent.startDate) {
        setMinDatePlan(new Date(dataEvent.startDate));
      }
    } else {
      (value.startDate = defaultStartDate
        ? new Date(
            convertDateToStartDate(new Date(defaultStartDate).toISOString()),
          )
        : null),
        (value.endDate = defaultStartDate
          ? new Date(
              convertDateToStartDate(addHoursToDate(`${defaultStartDate}`)),
            )
          : null),
        (value.startTime =
          (calendarView == ViewOptions.WEEK ||
            calendarView == ViewOptions.DAY) &&
          defaultStartDate
            ? convertToTimeString(`${defaultStartDate}`)
            : null),
        (value.endTime =
          (calendarView == ViewOptions.WEEK ||
            calendarView == ViewOptions.DAY) &&
          defaultStartDate
            ? convertToTimeString(`${addHoursToDate(`${defaultStartDate}`)}`)
            : null);
      setMinDatePlan(defaultStartDate);
    }
    return value;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataEvent]);

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
      setDataOptionsCategoryMedium([]);
      return;
    }

    const selectedLargeCategory = dataOrganizationCategories.find(
      (category) => category.LARGE.id == watch('largeCategory.value'),
    );

    if (!selectedLargeCategory) {
      setDataOptionsCategoryMedium([]);
    } else {
      setDataOptionsCategoryMedium(
        selectedLargeCategory.MEDIUM.map((mediumCategory) => ({
          label: mediumCategory.MEDIUM.name,
          value: mediumCategory.MEDIUM.id,
        })),
      );
    }
  }, [dataOrganizationCategories, largeCategoryValue, watch]);

  useMemo(() => {
    if (!dataOrganizationCategories || !watch('mediumCategory.value')) {
      setDataOptionsCategorySmall([]);
      return;
    }

    const selectedLargeCategoryOption = dataOrganizationCategories.find(
      (category) => category.LARGE.id == watch('largeCategory.value'),
    );

    const selectedMediumCategoryOption =
      selectedLargeCategoryOption?.MEDIUM.find(
        (category) => category.MEDIUM.id == watch('mediumCategory.value'),
      );

    if (!selectedMediumCategoryOption) {
      setDataOptionsCategorySmall([]);
      return;
    }

    setDataOptionsCategorySmall(
      selectedMediumCategoryOption.SMALL.map((smallCategory) => ({
        label: smallCategory.name,
        value: smallCategory.id,
      })),
    );
  }, [dataOrganizationCategories, mediumCategoryValue, watch]);

  useEffect(() => {
    if (dataEvent) {
      if (backToEditing) {
        if (dataEvent.tagIds) {
          dataEvent.tagIds.map((element) =>
            appendProject({
              label: element.label,
              value: element.value,
            }),
          );
        } else {
          appendProject({
            label: '',
            value: '',
          });
        }
      } else {
        if (dataEvent.tags) {
          dataEvent.tags.map((element) =>
            appendProject({
              label: element.name,
              value: element.id,
            }),
          );
        } else {
          appendProject({
            label: '',
            value: '',
          });
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appendProject, dataEvent]);

  useEffect(() => {
    if (backToEditing) {
      if (dataEvent && dataEvent.tagIds) {
        setSelectedTagIdsOptions(
          dataEvent.tagIds.map((org) => ({
            label: org.label,
            value: org.value,
          })),
        );
      }
    } else {
      if (dataEvent && dataEvent.tags) {
        setSelectedTagIdsOptions(
          dataEvent.tags.map((org) => ({
            label: org.name,
            value: org.id,
          })),
        );
      }
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataEvent, dataEvent?.tags]);

  useEffect(() => {
    if (creationDataEventCalendar) {
      setDataOptionsOrganizations(
        creationDataEventCalendar.organizations.map((org) => ({
          label: org.name,
          value: org.id as number,
        })),
      );
      setDataOptionsEventTypes(
        creationDataEventCalendar.types.map((org) => ({
          label: org,
          value: org,
        })),
      );
      setDataOptionsTagIds(
        creationDataEventCalendar.tags.map((org) => ({
          label: org.name,
          value: org.id,
        })),
      );
      setDataOptionsParticipants(
        creationDataEventCalendar.members.map((org) => ({
          id: org.id,
          fullName: org.fullName,
          organizations: org.organizations || [],
        })),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [creationDataEventCalendar]);

  useEffect(() => {
    const selectedValues = selectedTagIdsOptions.map(
      (element) => element.value,
    );
    const unSelectedOptions = dataOptionsTagIds.filter(
      (option) => !selectedValues.includes(option.value),
    );
    setUnSelectedTagIdsOptions(unSelectedOptions);
  }, [dataOptionsTagIds, selectedTagIdsOptions]);

  const [isCall, setIsCall] = useState<boolean>(false);

  const onSubmitData: SubmitHandler<EventFormData | EventEditFormData> = async (
    data,
  ) => {
    if (isCall) return;
    setIsCall(true);
    if (action === ActionsEvent.CREATE) {
      onSubmit && onSubmit(data as EventFormData);
    }
    if (action === ActionsEvent.EDIT) {
      onEdit && onEdit(data as EventEditFormData);
    }
  };

  const handleDeleteEvent = () => {
    const data = getValues();
    onDelete && onDelete(data as EventEditFormData);
  };

  const handleConfirmUpdateMemberList = (type: string, id: number) => {
    let newList: number[] = watch('participantIds') || [];

    if (type === 'remove') {
      newList = newList.filter((memberId) => memberId !== id);
    } else {
      newList = [...newList, id];
    }
    setValue('participantIds', newList);
  };

  const handleRemoveSelectedTagId = useCallback(
    (option: OptionDropdownType, index: number) => {
      setSelectedTagIdsOptions((prevState) =>
        prevState.filter((item) => item.value !== option.value),
      );
      removeProject(index);
    },
    [removeProject],
  );

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

  const handleChange = (
    e: ChangeEvent<HTMLInputElement>,
    field: keyof EventFormData,
  ): void => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 4) {
      value = value.substring(0, 4);
    }
    setTime(value);
    setValue(field, value);
  };

  const handleCloseModal = () => {
    setSelectedTagIdsOptions([]);
    setDataOptionsTagIds([]);
    setUnSelectedTagIdsOptions([]);
    setIsCall(false);
    onClose();
  };

  const isDisabled =
    session?.user.permissions &&
    ((action === ActionsEvent.EDIT &&
      !hasPermissionInArray(
        session?.user.permissions,
        PermissionsSystem.CALENDAR_UPDATE,
      )) ||
      (action === ActionsEvent.CREATE &&
        !hasPermissionInArray(
          session?.user.permissions,
          PermissionsSystem.CALENDAR_ADD,
        )));

  return (
    <Drawer
      open={open}
      className="font-primary bg-white w-[640px] !px-0 !rounded-tl-xl"
      onClose={handleCloseModal}>
      <header className="px-8 rounded-tl-xl h-[50px] bg-[#EBF1F4] flex items-center justify-end">
        <div className="flex gap-5 items-center ">
          <ImageRound
            className="mt-1 w-[13px] h-[15px] hover:cursor-pointer"
            src="/icons/share.svg"
            name="Share icon"
          />
          <ImageRound
            className="mt-1 h-[3px] w-[17px] hover:cursor-pointer"
            src="/icons/more.svg"
            name="More icon"
          />
          <ImageRound
            className="mt-1 w-3 h-[14px] hover:cursor-pointer"
            src="/icons/drawer-close.svg"
            name="Close modal"
            onClick={() => {
              reset();
              onClose();
            }}
          />
        </div>
      </header>
      <form
        onSubmit={handleSubmit(onSubmitData)}
        className="px-8 pb-8 max-h-[calc(100vh_-_150px)] overflow-y-auto">
        <header className="flex sticky z-[100] top-[0px] py-5 items-center gap-2 justify-between bg-white">
          <div className="w-full">
            <Input
              autoCompleteInput
              className="!p-1 !w-full !rounded shadow-none focus:!shadow-none focus:border"
              register={register('title', {
                required: watch('title') !== null ? true : false,
              })}
              placeholder="新規スケジュール"
              error={errors.title?.message}
              disabled={isDisabled}
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button
              variant="secondary"
              type="button"
              onClick={onClose}
              className="w-[82px] !rounded-md  h-[34px] !text-[10px] !px-2">
              キャンセル
            </Button>
            {session?.user.permissions &&
              ((action === ActionsEvent.EDIT &&
                hasPermissionInArray(
                  session?.user.permissions,
                  PermissionsSystem.CALENDAR_UPDATE,
                )) ||
                (action === ActionsEvent.CREATE &&
                  hasPermissionInArray(
                    session?.user.permissions,
                    PermissionsSystem.CALENDAR_ADD,
                  ))) && (
                <Button
                  type="submit"
                  className="w-[82px] h-8 !text-[10px] !px-2">
                  保存
                </Button>
              )}
            {action === ActionsEvent.EDIT &&
              session?.user.permissions &&
              hasPermissionInArray(
                session?.user.permissions,
                PermissionsSystem.CALENDAR_DELETE,
              ) && (
                <Button
                  type="button"
                  onClick={handleDeleteEvent}
                  className="w-[82px] h-8 !text-[10px] !px-2">
                  削除
                </Button>
              )}
          </div>
        </header>
        <div className="text-xs font-normal flex flex-col gap-4 !overflow-y-auto">
          {/* Plan date */}
          <div className="flex gap-6 items-start">
            <div className="w-full max-w-[120px]">実施予定日時</div>
            <div className="flex flex-col">
              <div className="w-full max-w-[424px] flex gap-1 items-start">
                <div
                  className={`${watch('isAllDay') ? 'w-[104px]' : 'max-w-[202px]'}`}>
                  <div className="flex gap-1">
                    <div className="w-[104px]">
                      <Controller
                        control={control}
                        name="startDate"
                        rules={{
                          required: START_DATE_WRONG_SELECTED,
                        }}
                        render={({ field: { value, onChange } }) => (
                          <DatePicker
                            className="h-8 !px-2 !text-xs !pt-2"
                            selected={value ? new Date(value) : null}
                            disabled={isDisabled}
                            onChange={(e) => {
                              onChange(e);
                              if (e !== null) {
                                const newDate = new Date(e.getTime());
                                setMinDatePlan(newDate);
                              } else {
                                setMinDatePlan(null);
                              }
                              if (!getValues('startTime')) {
                                setValue(
                                  'startTime',
                                  convertToTimeString(`${currentDate}`),
                                );
                              }
                              setValue('endDate', null);
                              setValue('endTime', '');
                            }}
                          />
                        )}
                      />
                    </div>
                    {watch('isAllDay') === false && (
                      <div className="w-[72px]">
                        <Input
                          register={register('startTime', {
                            required:
                              watch('startDate') !== null ? true : false,
                            onChange: (e) => {
                              handleChange(e, 'startTime');
                              if (getValues('startDate') === null) {
                                setValue(
                                  'startDate',
                                  (() => {
                                    const today: Date = new Date();
                                    today.setHours(0, 0, 0, 0);
                                    return today;
                                  })(),
                                );
                                setValue('endDate', null);
                                setValue('endTime', '');
                                setMinDatePlan(new Date());
                              }
                            },
                            onBlur: () => {
                              if (time) {
                                setValue('startTime', formatTimeInput(time));
                              }
                              setTime('');
                            },
                          })}
                          autoComplete="off"
                          type="text"
                          className="h-8 !text-xs !px-1 text-center"
                          disabled={isDisabled}
                        />
                      </div>
                    )}
                  </div>
                  <ErrorMessage
                    error={errors.startDate?.message}
                    className="mt-[5px] mb-[5px] text-xs"
                  />
                </div>

                <div className="h-8 flex items-center">〜</div>
                <div
                  className={`${watch('isAllDay') ? 'min-w-[104px]' : 'max-w-[202px]'}`}>
                  <div className="flex gap-1">
                    <div className="w-[104px]">
                      <Controller
                        control={control}
                        name="endDate"
                        rules={{
                          required: watch('startDate')
                            ? END_DATE_REQUIRED_SELECTED
                            : false,
                        }}
                        render={({ field: { value, onChange } }) => (
                          <CustomDatePicker
                            className="h-8 !px-2 !text-xs !pt-2"
                            selected={value ? new Date(value) : null}
                            disabled={isDisabled}
                            minDate={minDatePlan}
                            onChange={(e) => {
                              onChange(e);
                              if (!getValues('endTime')) {
                                setValue(
                                  'endTime',
                                  convertToTimeString(`${currentDate}`),
                                );
                              }
                            }}
                          />
                        )}
                      />
                    </div>
                    {watch('isAllDay') === false && (
                      <div className="w-[72px]">
                        <Input
                          register={register('endTime', {
                            required: watch('endDate') !== null ? true : false,
                            validate: (value) => {
                              if (
                                watch('endDate')?.getTime() ===
                                  watch('startDate')?.getTime() &&
                                watch('endDate') !== null
                              ) {
                                return (
                                  (value &&
                                    convertToMinutes(value) >
                                      convertToMinutes(
                                        watch('startTime') as string,
                                      )) ||
                                  END_DATE_WRONG_SELECTED
                                );
                              }
                              return true;
                            },
                            onChange: (e) => {
                              handleChange(e, 'endTime');
                              if (getValues('endDate') === null) {
                                if (getValues('startDate') !== null) {
                                  setValue('endDate', getValues('startDate'));
                                } else {
                                  setValue(
                                    'endDate',
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
                                setValue('endTime', formatTimeInput(time));
                              }

                              if (
                                watch('endDate')?.getTime() ===
                                  watch('startDate')?.getTime() &&
                                watch('endDate') !== null
                              ) {
                                if (
                                  e.target.value &&
                                  convertToMinutes(e.target.value) >
                                    convertToMinutes(
                                      watch('startTime') as string,
                                    )
                                ) {
                                  setError('endTime', {
                                    message: '',
                                  });
                                }
                              }
                              setTime('');
                            },
                          })}
                          type="text"
                          className="h-8 !text-xs !px-1 text-center"
                          disabled={isDisabled}
                        />
                      </div>
                    )}
                  </div>
                  <ErrorMessage
                    error={errors.endDate?.message || errors.endTime?.message}
                    className="mt-[5px] mb-[5px] text-xs"
                  />
                </div>
              </div>
              <div className="flex w-[150px]">
                <Checkbox
                  label="終日"
                  onChange={(state) => setValue('isAllDay', state)}
                  isChecked={defaultValues.isAllDay}
                  disable={isDisabled}
                />
                <Button
                  sz="sm"
                  variant="outline"
                  className="w-32 h-6 text-xs !px-1 !py-0"
                  disabled={isDisabled}
                  type="button">
                  繰り返す
                </Button>
              </div>
            </div>
          </div>
          {/* Event type */}
          <div className="flex gap-6 items-center">
            <div className="w-full max-w-[120px]">予定の種類</div>
            <div className="w-full max-w-48">
              <Controller
                control={control}
                name={'type'}
                render={({ field: { value, onChange } }) => (
                  <Dropdown
                    className="h-8 !py-1 text-xs"
                    classNameTextData="!text-xs"
                    classNameOption="!text-xs"
                    options={dataOptionsEventTypes}
                    selectedOption={dataOptionsEventTypes.find(
                      (element) =>
                        element.value === (value as OptionDropdownType).value,
                    )}
                    onChange={onChange}
                    disabled={isDisabled}
                  />
                )}
              />
            </div>
          </div>
          {/* Organization */}
          <div className="flex gap-[10px] items-center">
            <div className="w-full max-w-[132px]">組織</div>
            <div className="w-full max-w-[515px]">
              <Controller
                control={control}
                name={'organization'}
                render={({ field: { value, onChange } }) => (
                  <Dropdown
                    className="h-8 !py-1 text-xs border-[#77858F] rounded-md"
                    classNameTextData="!text-xs"
                    classNameOption="!text-xs"
                    classNameError="!text-xs"
                    placeholder="選択してください"
                    disabled={isDisabled}
                    options={dataOptionsOrganizations}
                    selectedOption={dataOptionsOrganizations.find(
                      (element) =>
                        element.value == (value as OptionDropdownType)?.value,
                    )}
                    onChange={(e) => {
                      if (e.value != watch('organization.value')) {
                        setValue('largeCategory', { label: '', value: '' });
                        setValue('mediumCategory', { label: '', value: '' });
                        setValue('smallCategory', { label: '', value: '' });
                        setDataOptionsCategoryLarge([]);
                        setDataOptionsCategorySmall([]);
                        setDataOptionsCategoryMedium([]);
                      }
                      onChange(e);
                    }}
                  />
                )}
                rules={{ required: ORGANIZATION_REQUIRED_MESSAGE }}
              />
              <ErrorMessage
                error={errors.organization?.message}
                className="text-xs"
              />
            </div>
          </div>
          {/* Work type */}
          <div className="flex gap-6 items-start">
            <div className="w-full max-w-[120px]">業務の種類</div>
            <div className="w-full">
              <div className="mb-2">
                <Controller
                  control={control}
                  name={'largeCategory'}
                  render={({ field: { value, onChange } }) => (
                    <Dropdown
                      className="h-8 !py-1 text-xs"
                      classNameTextData="!text-xs"
                      classNameOption="!text-xs"
                      options={[
                        {
                          label: NO_OPTION_CATEGORY,
                          value: NO_OPTION_CATEGORY,
                        },
                        ...dataOptionsCategoryLarge.filter(
                          (category) => category.label !== NO_OPTION_CATEGORY,
                        ),
                      ]}
                      selectedOption={[
                        {
                          label: NO_OPTION_CATEGORY,
                          value: NO_OPTION_CATEGORY,
                        },
                        ...dataOptionsCategoryLarge.filter(
                          (category) => category.label !== NO_OPTION_CATEGORY,
                        ),
                      ].find(
                        (element) =>
                          element.value == (value as OptionDropdownType)?.value,
                      )}
                      placeholder={'大カテゴリ'}
                      onChange={(e) => {
                        if (e.value != watch('largeCategory.value')) {
                          setValue('mediumCategory', { label: '', value: '' });
                          setValue('smallCategory', { label: '', value: '' });
                        }
                        onChange(e);
                      }}
                      disabled={isDisabled}
                    />
                  )}
                />
              </div>
              <div className="mb-2">
                <Controller
                  control={control}
                  name={'mediumCategory'}
                  render={({ field: { value, onChange } }) => {
                    return (
                      <Dropdown
                        className="h-8 !py-1 text-xs"
                        classNameTextData="!text-xs"
                        classNameOption="!text-xs"
                        options={[
                          {
                            label: NO_OPTION_CATEGORY,
                            value: NO_OPTION_CATEGORY,
                          },
                          ...dataOptionsCategoryMedium.filter(
                            (category) => category.label !== NO_OPTION_CATEGORY,
                          ),
                        ]}
                        selectedOption={[
                          {
                            label: NO_OPTION_CATEGORY,
                            value: NO_OPTION_CATEGORY,
                          },
                          ...dataOptionsCategoryMedium.filter(
                            (category) => category.label !== NO_OPTION_CATEGORY,
                          ),
                        ].find(
                          (element) =>
                            element.value ==
                            (value as OptionDropdownType)?.value,
                        )}
                        placeholder={'中カテゴリ'}
                        onChange={(e) => {
                          if (e.value != watch('mediumCategory.value')) {
                            setValue('smallCategory', { label: '', value: '' });
                          }
                          onChange(e);
                        }}
                        disabled={isDisabled}
                      />
                    );
                  }}
                />
              </div>
              <div className="mb-2">
                <Controller
                  control={control}
                  name={'smallCategory'}
                  render={({ field: { value, onChange } }) => (
                    <Dropdown
                      className="h-8 !py-1 text-xs"
                      classNameTextData="!text-xs"
                      classNameOption="!text-xs"
                      options={[
                        {
                          label: NO_OPTION_CATEGORY,
                          value: NO_OPTION_CATEGORY,
                        },
                        ...dataOptionsCategorySmall.filter(
                          (category) => category.label !== NO_OPTION_CATEGORY,
                        ),
                      ]}
                      selectedOption={[
                        {
                          label: NO_OPTION_CATEGORY,
                          value: NO_OPTION_CATEGORY,
                        },
                        ...dataOptionsCategorySmall.filter(
                          (category) => category.label !== NO_OPTION_CATEGORY,
                        ),
                      ].find(
                        (element) =>
                          element.value == (value as OptionDropdownType)?.value,
                      )}
                      placeholder={'小カテゴリ'}
                      onChange={(e) => {
                        onChange(e);
                      }}
                      disabled={isDisabled}
                    />
                  )}
                />
              </div>
            </div>
          </div>
          {/* Tag */}
          <div className="flex gap-6 items-start">
            <div className="w-full max-w-32">集計タグ</div>
            <div className="w-full max-w-[424px]">
              {projectFields.map((field, index) => (
                <div className="flex gap-3 max-w-[424px]" key={field.id}>
                  <div className="w-[333px]">
                    <Controller
                      control={control}
                      name={`tagIds.${index}`}
                      render={({ field: { value, onChange } }) => {
                        return (
                          <Dropdown
                            placeholder="選択してください"
                            className="h-8 !py-1 text-xs"
                            classNameOption="!text-xs"
                            classNameTextData="!text-xs"
                            options={unSelectedTagIdsOptions}
                            selectedOption={dataOptionsTagIds.find(
                              (element) => element.value === value?.value,
                            )}
                            onChange={(option: OptionDropdownType) => {
                              onChange(option);
                              handleSelectedTagIds(index, option);
                            }}
                            error={errors.tagIds?.[index]?.value?.message}
                            disabled={isDisabled}
                          />
                        );
                      }}
                    />
                  </div>
                  <div className="mt-[2.5px] w-20">
                    <Button
                      sz="sm"
                      variant="outline"
                      className="w-20 h-8 text-xs"
                      type="button"
                      name="Remove TagId"
                      disabled={isDisabled}
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
              <div className="text-right mt-4">
                <Button
                  sz="sm"
                  variant="outline"
                  className="w-20 h-8 text-xs"
                  type="button"
                  disabled={isDisabled}
                  onClick={() => appendProject({ label: '', value: '' })}>
                  <ImageRound
                    src="/icons/plus.svg"
                    name="Add organization"
                    className="mr-3 h-2 w-2"
                  />
                  追加
                </Button>
              </div>
            </div>
          </div>
          {/* Address */}
          <div className="flex gap-6 items-center">
            <div className="w-full max-w-[120px]">場所</div>
            <TextArea
              register={register('address')}
              className="h-[50px] text-xs"
              disabled={isDisabled}
            />
          </div>
          <div className="flex flex-col">
            <div className="w-full mb-1">参加者</div>
            <InputSearch
              placeholder="名前で検索"
              className="w-[100%]"
              inputClassName="!py-2 mb-3"
              onChange={(e) => setSearchName(e.target.value)}
              disabled={isDisabled}
            />
            <div className="w-full max-h-[130px] overflow-y-auto overflow-x-hidden scrollbar-gutter-stable">
              {dataOptionsParticipants &&
                dataOptionsParticipants
                  .filter((member) =>
                    member.fullName
                      .toLowerCase()
                      .includes(searchName.toLowerCase()),
                  )
                  .filter(
                    (member) =>
                      !watch('participantIds')?.includes(member.id as number),
                  )
                  .map((member) => {
                    return (
                      <div
                        className={`flex gap-5 items-center p-1.5 hover:cursor-pointer`}
                        key={member.id}>
                        <ImageRound
                          className="w-8 h-8"
                          src="/images/avatar-default.svg"
                          border="full"
                          name="Avatar user"
                        />
                        <div className="flex gap-2 items-center">
                          <p className="font-normal text-sm truncate max-w-[250px] text-black">
                            {member.fullName}
                          </p>
                          <div className="font-normal text-[10px] max-w-[220px] truncate">
                            {member.organizations &&
                              member.organizations.map(
                                (organization, index) => (
                                  <span
                                    key={
                                      organization.id
                                    }>{`${organization.name}${member.organizations && member.organizations.length - 1 !== index ? '、' : ''}`}</span>
                                ),
                              )}
                          </div>
                        </div>

                        <Button
                          sz="sm"
                          variant="outline"
                          className="w-20 h-8 text-xs ml-auto"
                          onClick={() =>
                            handleConfirmUpdateMemberList(
                              'add',
                              member.id as number,
                            )
                          }
                          disabled={isDisabled}
                          type="button">
                          <ImageRound
                            src="/icons/plus.svg"
                            name="Add member"
                            className="mr-3 h-2 w-2"
                          />
                          追加
                        </Button>
                      </div>
                    );
                  })}
            </div>
            {watch('participantIds') !== undefined &&
              watch('participantIds')?.includes(session?.user.id as number) && (
                <div className="mt-5">
                  <div className="w-full mb-1">自分</div>
                  <div className="flex gap-3 items-end">
                    <div className="border-[1px] w-[175px] flex items-center gap-3 p-1">
                      <ImageRound
                        className="w-6 h-6"
                        src="/images/avatar-default.svg"
                        border="full"
                        name="Avatar user"
                      />
                      <div className="flex flex-col">
                        <p className="font-normal text-sm truncate max-w-[120px] text-black">
                          {session?.user.profile.fullName}
                        </p>
                        <div className="font-normal text-[10px] max-w-[100px] truncate">
                          {session?.user.organizations &&
                            session?.user.organizations.map(
                              (organization, index) => (
                                <span
                                  key={
                                    organization.id
                                  }>{`${organization.name}${session?.user.organizations && session?.user.organizations.length - 1 !== index ? '、' : ''}`}</span>
                              ),
                            )}
                        </div>
                      </div>
                    </div>
                    <div>
                      <Checkbox
                        label="自分をメンバーから外す"
                        onChange={() =>
                          handleConfirmUpdateMemberList(
                            'remove',
                            session?.user.id as number,
                          )
                        }
                        disable={isDisabled}
                      />
                    </div>
                  </div>
                </div>
              )}
            {watch('participantIds')?.filter(
              (participant) => participant != session?.user.id,
            ).length !== 0 &&
              dataOptionsParticipants && (
                <div className="mt-5">
                  <div className="w-full mb-1">他のメンバー</div>
                  <div className="grid grid-cols-3 gap-4">
                    {dataOptionsParticipants
                      .filter((member) =>
                        watch('participantIds')?.includes(member.id as number),
                      )
                      .filter((member) => member.id !== session?.user.id)
                      .sort((prev: EventParticipant, next: EventParticipant) =>
                        prev.fullName.localeCompare(next.fullName),
                      )
                      .map((member) => {
                        return (
                          <>
                            <div
                              key={member.id}
                              className="border-[1px] w-[175px] flex relative items-center gap-3 p-1">
                              <ImageRound
                                className="w-6 h-6"
                                src="/images/avatar-default.svg"
                                border="full"
                                name="Avatar user"
                              />
                              {session?.user.permissions &&
                                ((action === ActionsEvent.EDIT &&
                                  hasPermissionInArray(
                                    session?.user.permissions,
                                    PermissionsSystem.CALENDAR_UPDATE,
                                  )) ||
                                  (action === ActionsEvent.CREATE &&
                                    hasPermissionInArray(
                                      session?.user.permissions,
                                      PermissionsSystem.CALENDAR_ADD,
                                    ))) && (
                                  <ImageRound
                                    className="mt-1 absolute top-0 right-1 w-3.5 h-3.5 hover:cursor-pointer"
                                    src="/icons/close.svg"
                                    name="Remove participant"
                                    onClick={() =>
                                      handleConfirmUpdateMemberList(
                                        'remove',
                                        member.id as number,
                                      )
                                    }
                                  />
                                )}
                              <div className="flex flex-col">
                                <p className="font-normal text-sm truncate max-w-[120px] text-black">
                                  {member.fullName}
                                </p>
                                <div className="font-normal text-[10px] max-w-[100px] truncate">
                                  {member.organizations &&
                                    member.organizations.map(
                                      (organization, index) => (
                                        <span
                                          key={
                                            organization.id
                                          }>{`${organization.name}${member.organizations && member.organizations.length - 1 !== index ? '、' : ''}`}</span>
                                      ),
                                    )}
                                </div>
                              </div>
                            </div>
                          </>
                        );
                      })}
                  </div>
                </div>
              )}
          </div>

          <div>
            <TextArea
              register={register('memo')}
              label="予定についてのメモ"
              disabled={isDisabled}
            />
          </div>
        </div>
      </form>
    </Drawer>
  );
};

export default ActionsEventModal;
