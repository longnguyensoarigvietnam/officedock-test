'use client';
import { ChangeEvent, useContext, useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Controller, SubmitHandler, useForm, useWatch } from 'react-hook-form';

import DatePickerCustom from '@components/common/DatePicker/DatePickerCustom';
import MultiSelectDropdown from '@components/common/MultiSelectDropdown';
import Button from '@components/common/Button';
import Dropdown from '@components/common/Dropdown';
import Input from '@components/common/Input';
import TextArea from '@components/common/TextArea';
import ImageRound from '@components/common/ImageRound';
import ErrorMessage from '@components/common/ErrorMessage';
import InputSearch from '@components/common/InputSearch';
import Checkbox from '@components/common/Checkbox';
import Drawer from '@components/common/Drawers';
import AvatarIconWithDynamicColor from '@components/common/AvatarIcon';

import { OptionDropdownType } from '@interfaces/common';
import {
  CreationDataEventCalendar,
  EventEditFormData,
  EventFormData,
  EventParticipant,
} from '@interfaces/calendar';
import { CategoryStructure } from '@interfaces/skills';
import { Organizations } from '@interfaces/organization';

import {
  ActionsEvent,
  EventWorkCategory,
  PermissionsSystem,
  ViewOptions,
} from '@constants/enums';
import {
  END_DATE_REQUIRED_SELECTED,
  END_DATE_WRONG_SELECTED,
  ORGANIZATION_REQUIRED_MESSAGE,
  START_DATE_WRONG_SELECTED,
} from '@constants/message';
import { NO_OPTION_CATEGORY, NO_OPTIONS, UNREGISTERED } from '@constants';

import {
  addHoursToDate,
  convertDateToStartDate,
  convertToMinutes,
  convertToTimeString,
  formatShowDateJapanese,
  formatTimeInput,
  generateTimeOptionsAsObjects,
} from '@utils/date';
import {
  hasPermissionInArray,
  showModalHeaderBackgroundColorByTime,
} from '@utils';

import { GlobalStateContext } from '@providers/GlobalStateProvider';
import useCreationDataStatisticTeam from '@hooks/useCreationDataStatisticTeam';

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
  const [searchName, setSearchName] = useState<string>('');
  const [time, setTime] = useState<string>('');
  const [minDatePlan, setMinDatePlan] = useState<Date | null>();
  const { data: session } = useSession();
  const { dashboardMembersWithAvatars } = useContext(GlobalStateContext);
  const currentDate = new Date();
  const optionTimeInput = generateTimeOptionsAsObjects();

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

  const organizationValue = useWatch({
    control,
    name: 'organization.value',
  });

  const { refetchCreationDataStatistic } = useCreationDataStatisticTeam({
      organization_id: organizationValue ? String(organizationValue) : '',
      isTeam: true,
      onSuccess: (data) => {
        if (!data) return;
  
        const organizationCategories = data.organization.statisticCategories.map((category) => {
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
          data.organization.statisticCategories.map((category) => {
            if (category.LARGE) {
              largeCategories.push({
                label: category.LARGE.name,
                value: category.LARGE.id,
              });
            }
          });
          return largeCategories;
        });
        setDataOptionsTagIds(
          data.tags.map((org) => ({
            label: String(org.name),
            value: String(org.id),
          })),
        );
      },
    });

  useEffect(() => {
    if (organizationValue) {
      refetchCreationDataStatistic();
    }
  }, [organizationValue, refetchCreationDataStatistic]);

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
        value.tagIds = dataEvent.tagIds
          ? dataEvent.tagIds.map((tag) => {
              return {
                value: tag.value,
                label: tag.label,
              };
            })
          : [];
      } else {
        if (dataEvent.participants) {
          dataEvent.participants
            .filter((item) => item.id !== '')
            .map((item) => newParticipantIds.push(item.id as number));
        }
        value.tagIds = dataEvent.tags
          ? dataEvent.tags.map((tag) => {
              return {
                value: String(tag.id),
                label: String(tag.name),
              };
            })
          : [];
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
    setDataOptionsTagIds([]);
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
      className="font-primary bg-white w-[700px] !px-0 !rounded-tl-xl"
      onClose={handleCloseModal}>
      <header
        className="px-8 rounded-tl-xl h-[50px] flex items-center justify-between"
        style={{
          background: showModalHeaderBackgroundColorByTime(),
        }}>
        <div className="flex text-sm items-center gap-4 text-white">
          <p className="">
            登録日{' '}
            {action === ActionsEvent.EDIT && dataEvent?.createdAt
              ? formatShowDateJapanese(dataEvent.createdAt)
              : formatShowDateJapanese(new Date())}
          </p>
        </div>
        <div className="flex gap-5 items-center ">
          <ImageRound
            className="scale-[0.5] rotate-90 mt-1 text-xs mr-[-10px] hover:cursor-pointer"
            src="/icons/three-dots-white.svg"
            border="full"
            name="Three dots white"
          />
          {action === ActionsEvent.EDIT &&
            session?.user.permissions &&
            hasPermissionInArray(
              session?.user.permissions,
              PermissionsSystem.CALENDAR_DELETE,
            ) && (
              <ImageRound
                className="mt-1 w-[14px] h-[17px] hover:cursor-pointer"
                src="/icons/delete-event.svg"
                name="Delete icon"
                onClick={handleDeleteEvent}
              />
            )}

          <ImageRound
            className="mt-1 w-3 h-[14px] hover:cursor-pointer"
            src="/icons/drawer-close-white.svg"
            name="Close icon"
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
              className="shadow-none text-2xl  leading-[56px] font-bold !pl-3 flex items-center !py-0 h-[46px] focus:!shadow-none focus:border !border-[#77858F] !border-[1px] rounded-md"
              register={register('title', {
                required: watch('title') !== null ? true : false,
              })}
              placeholder="新規スケジュール"
              error={errors.title?.message}
              disabled={isDisabled}
            />
          </div>
          <div className="flex gap-2 items-center">
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
                  className="w-[82px] h-[36px] !text-[12px] !px-2">
                  {action === ActionsEvent.EDIT ? '予定を編集' : '予定を作成'}
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
        </header>
        <div className="text-xs font-normal flex flex-col gap-4 !overflow-y-auto">
          {/* Plan date */}
          <div className="flex items-start">
            <div className="w-full max-w-[116px] font-medium text-[14px] mt-2">
              実施予定日時
            </div>
            <div className="flex flex-col">
              <div className="w-full max-w-[424px] flex gap-1 items-start">
                <div
                  className={`${watch('isAllDay') ? 'w-[140px]' : 'max-w-[220px]'}`}>
                  <div className="flex gap-1">
                    <div className="w-[140px]">
                      <Controller
                        control={control}
                        name="startDate"
                        rules={{
                          required: START_DATE_WRONG_SELECTED,
                        }}
                        render={({ field: { value, onChange } }) => (
                          <DatePickerCustom
                            className="h-[34px] !px-2 !pl-[30px] !border-[1px] !border-[#77858F] rounded-md !text-xs !pt-2 text-center"
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
                      <div className="w-[72px] z-20">
                        <Input
                          isShowClockIcon={true}
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
                          className="h-[34px] !text-xs !pr-1 !pl-7 !border-[1px] !border-[#77858F] rounded-md"
                          disabled={isDisabled}
                          options={optionTimeInput}
                          onChangeDropdown={(e) => {
                            setValue('startTime', e.label);
                            if (getValues('startDate') === null) {
                              setValue(
                                'startDate',
                                (() => {
                                  const today: Date = new Date();
                                  today.setHours(0, 0, 0, 0);
                                  return today;
                                })(),
                              );
                            }
                          }}
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
                  className={`${watch('isAllDay') ? 'min-w-[140px]' : 'max-w-[220px]'}`}>
                  <div className="flex gap-1">
                    <div className="w-[140px]">
                      <Controller
                        control={control}
                        name="endDate"
                        rules={{
                          required: watch('startDate')
                            ? END_DATE_REQUIRED_SELECTED
                            : false,
                        }}
                        render={({ field: { value, onChange } }) => (
                          <DatePickerCustom
                            className="h-[34px] !border-[1px] !border-[#77858F] rounded-md !px-2  !pl-[30px] !text-xs !pt-2 text-center"
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
                      <div className="w-[72px] z-20">
                        <Input
                          isShowClockIcon={true}
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
                          className="h-[34px] !text-xs !pr-1 !pl-7 !border-[1px] !border-[#77858F] rounded-md"
                          disabled={isDisabled}
                          options={optionTimeInput}
                          onChangeDropdown={(e) => {
                            setValue('endTime', e.label);
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
                          }}
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
            <Button
              sz="sm"
              variant="outline"
              className="w-[48px] h-[34px] ml-auto hover:opacity-70 !border-none !px-0 !rounded-md text-[13px] !bg-[#EBF1F7]"
              type="button"
              name="Remove plan"
              onClick={() => {
                setValue('endDate', null);
                setValue('endTime', '');
                setValue('startDate', null);
                setValue('startTime', '');
              }}>
              削除
            </Button>
          </div>
          {/* Event type */}
          <div className="flex justify-between items-center">
            <p className="w-fit font-medium text-[14px]">予定カテゴリ</p>
            <div className="w-[513px]">
              <Controller
                control={control}
                name={'type'}
                render={({ field: { value, onChange } }) => (
                  <Dropdown
                    className="h-8 !py-1 text-xs !border-[1px] !border-[#77858F]"
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
          <div className="flex justify-between items-center">
            <p className="w-fit font-medium text-[14px]">組織</p>
            <div className="w-[513px]">
              <Controller
                control={control}
                name={'organization'}
                render={({ field: { value, onChange } }) => (
                  <Dropdown
                    className="h-8 !py-1 text-xs max-w-[513px] !border-[1px] !border-[#77858F] rounded-md"
                    classNameTextData="!text-xs"
                    classNameOption="!text-xs w-[513px]"
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
                      setValue('tagIds', []);

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
          <div className="flex justify-between items-start">
            <p className="w-fit font-medium text-[14px]">業務の種類</p>
            <div className="w-[513px]">
              <div className="mb-2">
                <Controller
                  control={control}
                  name={'largeCategory'}
                  render={({ field: { value, onChange } }) => (
                    <Dropdown
                      className="h-8 !py-1 text-xs !border-[1px] !border-[#77858F]"
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
                      placeholder={'大カテゴリー'}
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
                        className="h-8 !py-1 text-xs !border-[1px] !border-[#77858F]"
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
                      className="h-8 !py-1 text-xs !border-[1px] !border-[#77858F]"
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
            <div className="w-full max-w-32 font-medium text-[14px]">タグ</div>
            <div className="w-full max-w-[518px]">
              <div className="flex gap-2 max-w-[518px]">
                <div className="w-[461px]">
                  <MultiSelectDropdown
                    className="!h-[34px]"
                    disabled={isDisabled}
                    valueClassName="!border-[1px] !border-[#77858F]"
                    options={dataOptionsTagIds}
                    optionClassName="!border-[1px] !border-[#77858F] max-w-[513px]"
                    customLabel={
                      (watch('tagIds') ?? []).filter((tag) => tag.value)
                        .length > 0
                        ? `${(watch('tagIds') ?? []).filter((tag) => tag.value).length}件選択中`
                        : UNREGISTERED
                    }
                    labelOptionClass="break-words w-[410px]"
                    selectedOptions={watch('tagIds') ?? []}
                    onChange={(selected) => {
                      let updatedTagIds = [];
                      const currentTagIds = getValues('tagIds') || [];
                      const foundItemIndex = currentTagIds.findIndex(
                        (tag) => tag.value == selected.value,
                      );
                      if (foundItemIndex == -1) {
                        updatedTagIds = [...currentTagIds, selected];
                      } else {
                        updatedTagIds = currentTagIds.filter(
                          (tag) => tag.value != selected.value,
                        );
                      }
                      setValue('tagIds', updatedTagIds);
                    }}
                  />
                  <div className="flex flex-wrap  gap-2 mt-2">
                    {watch('tagIds')?.filter((tag) => tag.value) &&
                      watch('tagIds')
                        ?.filter((tag) => !!tag.value)
                        ?.map((tag) => {
                          return (
                            <div
                              key={tag.value}
                              className="rounded-xl bg-[#EBF2F7] px-2.5 py-1.5 flex gap-2">
                              <p>{tag.label}</p>
                              <button
                                type="button"
                                className="text-gray-700 hover:text-gray-900"
                                onClick={() => {
                                  const currentTagIds =
                                    getValues('tagIds') || [];

                                  const updatedTagIds = [
                                    ...currentTagIds,
                                  ].filter(
                                    (item) =>
                                      Number(item.value) != Number(tag.value),
                                  );

                                  setValue('tagIds', updatedTagIds);
                                }}>
                                ✕
                              </button>
                            </div>
                          );
                        })}
                  </div>
                </div>
                <div className="mb-[2.5px] w-12">
                  <Button
                    sz="sm"
                    variant="outline"
                    className="w-12 h-[34px] hover:opacity-70 !border-none !px-0 !rounded-md text-[13px] !bg-[#EBF1F7]"
                    type="button"
                    name="Remove TagId"
                    disabled={isDisabled}
                    onClick={() => {
                      setValue('tagIds', []);
                    }}>
                    削除
                  </Button>
                </div>
              </div>
            </div>
          </div>
          {/* Address */}
          <div className="flex justify-between items-center">
            <p className="w-fit font-medium text-[14px]">場所</p>
            <div>
              <TextArea
                register={register('address')}
                className="h-[50px] !w-[513px] text-xs !border-[1px] !border-[#77858F]"
                disabled={isDisabled}
              />
            </div>
          </div>
          {/* Participants */}
          <div className="flex flex-col">
            <div className="flex justify-between items-start mb-3">
              <p className="w-fit font-medium text-[14px] mt-3">
                メンバーを追加
              </p>
              <div>
                <InputSearch
                  placeholder="名前を検索"
                  className="!w-[513px]"
                  inputClassName="!py-2 !border-[1px] !border-[#77858F]"
                  onChange={(e) => setSearchName(e.target.value)}
                  disabled={isDisabled}
                />
                <div className="flex justify-between items-center my-3">
                  <p
                    className="text-[#77858F] font-medium text-[12px] hover:cursor-pointer"
                    onClick={() => {
                      const updatedParticipantList =
                        dataOptionsParticipants?.filter((member) =>
                          member.fullName
                            .toLowerCase()
                            .includes(searchName.toLowerCase()),
                        );
                      let newParticipantList: number[] = [];
                      if (updatedParticipantList) {
                        newParticipantList = updatedParticipantList.map(
                          (participant) => Number(participant.id),
                        );
                      }
                      setValue('participantIds', newParticipantList);
                    }}>
                    全てをチェック
                  </p>
                  <p
                    className="text-[#77858F] font-medium text-[12px] hover:cursor-pointer"
                    onClick={() => {
                      setValue('participantIds', []);
                    }}>
                    全てのチェックをクリア
                  </p>
                </div>
                <div className="max-h-[300px] overflow-y-auto overflow-x-hidden scrollbar-gutter-stable">
                  {dataOptionsParticipants?.filter((member) =>
                    member.fullName
                      .toLowerCase()
                      .includes(searchName.toLowerCase()),
                  ).length === 0 && (
                    <p className="text-gray-500 text-center text-sm">
                      {NO_OPTIONS}
                    </p>
                  )}
                  {dataOptionsParticipants
                    ?.filter((member) =>
                      member.fullName
                        .toLowerCase()
                        .includes(searchName.toLowerCase()),
                    )
                    .map((member) => {
                      return (
                        <div
                          className={`flex gap-2 items-center px-3 py-2.5 hover:cursor-pointer ${
                            watch('participantIds') &&
                            watch('participantIds')?.find(
                              (participant) => participant == member.id,
                            ) &&
                            'bg-[#EBF1F7]'
                          }`}
                          key={member.id}>
                          <div>
                            <Controller
                              control={control}
                              name="participantIds"
                              render={() => (
                                <Checkbox
                                  isChecked={
                                    watch('participantIds') &&
                                    watch('participantIds')?.find(
                                      (participant) => participant == member.id,
                                    )
                                      ? true
                                      : false
                                  }
                                  disable={isDisabled}
                                  onChange={() => {
                                    const currentParticipantList =
                                      watch('participantIds') || [];
                                    const foundParticipantIndex =
                                      currentParticipantList.findIndex(
                                        (participant) =>
                                          participant == member.id,
                                      );
                                    let updatedParticipantList = [];
                                    if (foundParticipantIndex == -1) {
                                      updatedParticipantList = [
                                        ...currentParticipantList,
                                        Number(member.id),
                                      ];
                                    } else {
                                      updatedParticipantList = [
                                        ...currentParticipantList,
                                      ].filter(
                                        (participant) =>
                                          participant != member.id,
                                      );
                                    }

                                    setValue(
                                      'participantIds',
                                      updatedParticipantList,
                                    );
                                  }}
                                />
                              )}
                            />
                          </div>
                          {dashboardMembersWithAvatars &&
                          dashboardMembersWithAvatars.find(
                            (memberWithAvatar) =>
                              memberWithAvatar.id == member.id,
                          ) ? (
                            <>
                              {AvatarIconWithDynamicColor({
                                color:
                                  dashboardMembersWithAvatars?.find(
                                    (memberWithAvatar) =>
                                      memberWithAvatar.id == member.id,
                                  )?.avatarColor || '#0068B6',
                                size: 34,
                              })}
                            </>
                          ) : (
                            <ImageRound
                              className="w-8 h-8"
                              src="/images/avatar-default.svg"
                              border="full"
                              name="Avatar user"
                            />
                          )}
                          <p className="text-[15px] truncate max-w-[350px] text-black leading-normal">
                            {member.fullName}
                          </p>
                        </div>
                      );
                    })}
                </div>
                <Checkbox
                  label="自分をメンバーから外す"
                  className="px-3 mt-5"
                  onChange={(state) => {
                    if (state) {
                      const currentParticipantList =
                        watch('participantIds') || [];
                      const filterParticipantList =
                        currentParticipantList.filter(
                          (participant) => participant !== session?.user.id,
                        );
                      setValue('participantIds', filterParticipantList);
                    }
                  }}
                />
              </div>
            </div>
          </div>

          <div>
            <TextArea
              register={register('memo')}
              label="予定についてのメモ"
              labelClassName="text-black text-[14px] font-medium mb-2"
              disabled={isDisabled}
              className="resize-none !border-1 !border-[#77858F] !h-[160px]"
            />
          </div>
        </div>
        <div className="flex justify-center mt-8">
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
              <Button type="submit" className="w-[200px] h-[46px] !text-[15px]">
                {action === ActionsEvent.EDIT ? '予定を編集' : '予定を作成'}
              </Button>
            )}
        </div>
      </form>
    </Drawer>
  );
};

export default ActionsEventModal;
