'use client';
import {
  ChangeEvent,
  Dispatch,
  SetStateAction,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useSessionCache } from '@providers/SessionCacheProvider';

import { Controller, SubmitHandler, useForm, useWatch } from 'react-hook-form';
import { useMutation } from 'react-query';

import DatePickerCustom from '@components/common/DatePicker/DatePickerCustom';
import MultiSelectDropdown from '@components/common/MultiSelectDropdown';
import CustomUserAvatar from '@components/common/AvatarIcon/CustomUserAvatar';
import Button from '@components/common/Button';
import Dropdown from '@components/common/Dropdown';
import Input from '@components/common/Input';
import GroupIconWithDynamicColor from '@components/common/GroupIcon';
import TextArea from '@components/common/TextArea';
import ImageRound from '@components/common/ImageRound';
import ErrorMessage from '@components/common/ErrorMessage';
import Checkbox from '@components/common/Checkbox';
import Drawer from '@components/common/Drawers';

import { OptionDropdownType } from '@interfaces/common';
import {
  CreationDataEventCalendar,
  EventEditFormData,
  EventFormData,
  EventParticipant,
} from '@interfaces/calendar';
import { CategoryStructure } from '@interfaces/skills';
import { LocationEventType } from '@interfaces/location';
import { User } from '@interfaces/user';

import {
  ActionsEvent,
  EventParticipantType,
  EventWorkCategory,
  PermissionsSystem,
  TaskRepetitiveType,
  TaskRepetitiveValue,
  ViewOptions,
} from '@constants/enums';
import {
  END_DATE_REQUIRED_SELECTED,
  END_DATE_WRONG_SELECTED,
  ERROR_LONG_FIELD_MESSAGE,
  ORGANIZATION_REQUIRED_MESSAGE,
  START_DATE_WRONG_SELECTED,
} from '@constants/message';
import {
  DAY_OPTIONS,
  DEFAULT_END_TIME,
  DEFAULT_START_TIME,
  MONTH_OPTIONS,
  NO_OPTIONS,
  NO_SETTING,
  REPEAT_INTERVAL_OPTIONS,
  TASK_REPETITIVE_OPTIONS,
  UNREGISTERED,
  WEEKDAY_OPTIONS,
} from '@constants';
import { apiRouters } from '@constants/routers';

import {
  addHoursToDate,
  addTimeToDate,
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

import useCreationDataStatistic from '@hooks/useCreationDataStatistic';

import api from '@base/api';

export type ActionsEventModalProps = {
  open: boolean;
  dataEvent?: EventEditFormData;
  creationDataEventCalendar: CreationDataEventCalendar | undefined;
  action?: string;
  authenticatedUser?: User | undefined;
  defaultStartDate?: Date | undefined;
  calendarView?: string | null;
  backToEditing?: boolean;
  isEditDisabled?: boolean;
  setIsEditingRepetitiveFields: Dispatch<SetStateAction<boolean>>;
  onDelete?: (values: EventEditFormData) => void;
  onClose: () => void;
  onSubmit?: (values: EventFormData) => void;
  onEdit?: (values: EventEditFormData) => void;
};

const ActionsEventModal = ({
  open,
  dataEvent,
  action = ActionsEvent.CREATE,
  authenticatedUser,
  creationDataEventCalendar,
  defaultStartDate,
  calendarView,
  backToEditing,
  isEditDisabled = false,
  setIsEditingRepetitiveFields,
  onClose,
  onEdit,
  onDelete,
  onSubmit,
}: ActionsEventModalProps) => {
  // Creation data
  const [dataOptionsOrganizations, setDataOptionsOrganizations] = useState<
    OptionDropdownType[]
  >([]);
  const [dataOrganizationCategories, setDataOrganizationCategories] = useState<
    CategoryStructure[]
  >([]);
  const [dataOptionsCategoryMedium, setDataOptionsCategoryMedium] = useState<
    OptionDropdownType[]
  >([]);
  const [dataOptionsCategoryLarge, setDataOptionsCategoryLarge] = useState<
    OptionDropdownType[]
  >([]);
  const [dataOptionsTags, setDataOptionsTags] = useState<OptionDropdownType[]>(
    [],
  );
  const [dataOptionsParticipants, setDataOptionsParticipants] = useState<
    EventParticipant[]
  >([]);
  const [dataOptionsEventLocation, setDataOptionsEventLocation] = useState<
    OptionDropdownType[]
  >([]);

  // Search and filter
  const [searchName, setSearchName] = useState<string>('');
  const [removeMyselfOption, setRemoveMyselfOption] = useState(false);

  // Date
  const [time, setTime] = useState<string>('');
  const [minDatePlan, setMinDatePlan] = useState<Date | null>();
  const currentDate = new Date();
  const optionTimeInput = generateTimeOptionsAsObjects();

  // Session
  const { data: session } = useSessionCache();

  // Context
  const { dashboardMembersWithAvatars } = useContext(GlobalStateContext);

  // React hook form
  const {
    register,
    control,
    watch,
    setValue,
    setError,
    getValues,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<EventFormData | EventEditFormData>({
    mode: 'onSubmit',
    defaultValues: {
      startDate: defaultStartDate,
      endDate: defaultStartDate,
    },
  });

  // Get creation data for organizations, tags, locations, categories
  const { isFetchedCreationDataStatistic } = useCreationDataStatistic({
    is_calendar_page: true,
    onSuccess: (data) => {
      if (!data) return;

      setDataOptionsOrganizations([
        ...data.organizations.map((org) => ({
          value: org.id || '',
          label: org.name,
          userIds: org.users ? org.users.map((user) => user.id) : [],
          iconColor: org.iconColor || '#0068B6',
        })),
      ]);

      setDataOptionsTags(
        data.calendarOrganization?.tags.map((org) => ({
          label: org.name as string,
          value: org.id || '',
        })),
      );

      setDataOptionsEventLocation(
        data?.locations?.map((org) => ({
          label: org.name,
          value: org.id || '',
        })),
      );

      const organizationCategories =
        data.calendarOrganization?.statisticCategories.map((category) => {
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
        const largeCategories: OptionDropdownType[] = [];
        data.calendarOrganization.statisticCategories.map((category) => {
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

  // Set default values
  const defaultValues = useMemo<EventEditFormData>(() => {
    const value: EventEditFormData = {
      participantIds: [session?.user.id as number],
      selectOrganizations: [],
      largeCategory: { label: '', value: '' },
      mediumCategory: { label: '', value: '' },
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
      location: { label: '', value: '' },
      isAllDay: false,
      tagIds: dataEvent ? [] : [{ label: '', value: '' }],
      repeatType: {
        label: TaskRepetitiveType.ONCE,
        value: TaskRepetitiveValue.ONCE,
      },
      repeatInterval: undefined,
      month: undefined,
      monthDay: undefined,
      weekDay: undefined,
      isEventOverlapping: false,
    };
    if (dataEvent) {
      let newParticipantIds: number[] = [];
      let newSelectedOrganizations: number[] = [];
      if (backToEditing) {
        newParticipantIds = dataEvent.participantIds || [];
        newSelectedOrganizations = dataEvent.selectOrganizations || [];
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
          newParticipantIds = dataEvent.participants
            .filter((item) => item.id !== '')
            .map((item) => item.id as number);
          newSelectedOrganizations = dataEvent.selectOrganizations || [];
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

      if (dataEvent.categories) {
        const largeCat = dataEvent.categories.find(
          (category) => category.type === EventWorkCategory.LARGE,
        );
        newLargeCategory = {
          value: largeCat ? `${largeCat?.id}` : NO_SETTING,
          label: largeCat ? `${largeCat?.name}` : NO_SETTING,
        };
        const mediumCat = dataEvent.categories.find(
          (category) => category.type === EventWorkCategory.MEDIUM,
        );
        newMediumCategory = {
          value: mediumCat ? `${mediumCat?.id}` : NO_SETTING,
          label: mediumCat ? `${mediumCat?.name}` : NO_SETTING,
        };
      }

      (value.id = `${dataEvent.id}`),
        (value.title = dataEvent.title),
        (value.participantIds = newParticipantIds),
        (value.selectOrganizations = newSelectedOrganizations),
        (value.largeCategory = backToEditing
          ? dataEvent.largeCategory
          : newLargeCategory),
        (value.mediumCategory = backToEditing
          ? dataEvent.mediumCategory
          : newMediumCategory),
        (value.memo = dataEvent.memo),
        (value.isAllDay = dataEvent.isAllDay),
        (value.isEventOverlapping = dataEvent.isEventOverlapping),
        (value.location = dataEvent.location
          ? backToEditing
            ? dataEvent.location
            : {
                label: (dataEvent.location as LocationEventType).name,
                value: (dataEvent.location as LocationEventType).id as number,
              }
          : { label: '', value: '' }),
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
      value.repeatInterval = dataEvent.repeatInterval
        ? typeof dataEvent.repeatInterval == 'object'
          ? {
              label: `${dataEvent.repeatInterval.label}`,
              value: dataEvent.repeatInterval.value,
            }
          : {
              label: `${dataEvent.repeatInterval}`,
              value: dataEvent.repeatInterval as number,
            }
        : undefined;
      value.repeatType = dataEvent.repeatType
        ? typeof dataEvent.repeatType == 'object'
          ? {
              label:
                TASK_REPETITIVE_OPTIONS.find(
                  (option) =>
                    option.value ==
                    (dataEvent.repeatType as OptionDropdownType).value,
                )?.label || '',
              value: dataEvent.repeatType.value,
            }
          : {
              label:
                TASK_REPETITIVE_OPTIONS.find(
                  (option) =>
                    option.value == (dataEvent.repeatType as unknown as string),
                )?.label || '',
              value: dataEvent.repeatType,
            }
        : undefined;
      value.month = dataEvent.month
        ? typeof dataEvent.month == 'object'
          ? {
              label: `${dataEvent.month.label}`,
              value: dataEvent.month.value,
            }
          : {
              label: `${dataEvent.month}`,
              value: dataEvent.month,
            }
        : undefined;

      value.monthDay = dataEvent.monthDay
        ? typeof dataEvent.monthDay == 'object'
          ? {
              label: `${dataEvent.monthDay.label}`,
              value: dataEvent.monthDay.value,
            }
          : {
              label: `${dataEvent.monthDay}`,
              value: dataEvent.monthDay,
            }
        : undefined;
      value.weekDay =
        typeof dataEvent.weekDay == 'object'
          ? dataEvent.weekDay?.value != undefined &&
            dataEvent.weekDay?.value != null
            ? {
                label: `${dataEvent.weekDay.label}`,
                value: dataEvent.weekDay.value,
              }
            : undefined
          : dataEvent.weekDay != undefined && dataEvent.weekDay != null
            ? {
                label: `${dataEvent.weekDay}`,
                value: dataEvent.weekDay,
              }
            : undefined;

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
  }, [dataEvent, authenticatedUser]);

  useEffect(() => {
    reset(defaultValues);
  }, [defaultValues, reset]);

  // Get option list for event types, participants
  useEffect(() => {
    if (creationDataEventCalendar) {
      const eventMembers = creationDataEventCalendar.members.map((org) => ({
        id: `${EventParticipantType.USER}-${org.id}`,
        fullName: org.fullName,
        type: EventParticipantType.USER,
      }));
      if (isFetchedCreationDataStatistic) {
        const eventOrganizations = dataOptionsOrganizations
          ? dataOptionsOrganizations.map((org) => ({
              id: `${EventParticipantType.ORGANIZATION}-${org.value}`,
              fullName: org.label,
              type: EventParticipantType.ORGANIZATION,
              userIds: org.userIds,
              color: org.iconColor,
            }))
          : [];
        setDataOptionsParticipants([...eventOrganizations, ...eventMembers]);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    creationDataEventCalendar,
    dataOptionsOrganizations,
    isFetchedCreationDataStatistic,
  ]);

  // Check overlapping location
  const handleConfirmCheckOverlappingLocation = () => {
    const isMissingRequiredFields = watch('isAllDay')
      ? !watch('startDate') || !watch('endDate') || !watch('location.value')
      : !watch('startDate') ||
        !watch('endDate') ||
        !watch('startTime') ||
        !watch('endTime') ||
        !watch('location.value');
    if (isMissingRequiredFields) return;
    let planStartDate = '';
    let planEndDate = '';
    if (watch('isAllDay')) {
      planStartDate = addTimeToDate(
        (watch('startDate') as Date) || new Date(),
        DEFAULT_START_TIME,
      );
      planEndDate = addTimeToDate(
        (watch('endDate') as Date) || new Date(),
        DEFAULT_END_TIME,
      );
    } else {
      planStartDate = addTimeToDate(
        (watch('startDate') as Date) || new Date(),
        watch('startTime') as string,
      );
      planEndDate = addTimeToDate(
        (watch('endDate') as Date) || new Date(),
        watch('endTime') as string,
      );
    }
    checkDeleteHierarchyCategory({
      scheduleId: Number(dataEvent?.id),
      locationId: Number(watch('location.value')),
      planStartDate,
      planEndDate,
    });
  };

  // Call API to check overlapping location
  const handleCheckOverlappingLocation = async (data: {
    scheduleId: number;
    locationId: number;
    planStartDate: string;
    planEndDate: string;
  }) => {
    return await api.post(apiRouters.CHECK_OVERLAPPING_LOCATION, data);
  };

  const { mutateAsync: checkDeleteHierarchyCategory } = useMutation(
    'checkDeleteHierarchyCategory',
    handleCheckOverlappingLocation,
    {
      onSuccess: ({ data }) => {
        setValue('isEventOverlapping', data.isEventOverlapping, {
          shouldDirty: true,
        });
      },
    },
  );

  // Watch the form fields dynamically
  const largeCategoryValue = useWatch({
    control,
    name: 'largeCategory.value',
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

  const [isCall, setIsCall] = useState<boolean>(false);

  const onSubmitData: SubmitHandler<EventFormData | EventEditFormData> = async (
    data,
  ) => {
    if (isCall) return;
    setIsCall(true);
    if (action === ActionsEvent.CREATE || action === ActionsEvent.COPY) {
      onSubmit && onSubmit(data as EventFormData);
    }
    if (action === ActionsEvent.EDIT) {
      !backToEditing && !isDirty
        ? onClose()
        : onEdit && onEdit(data as EventEditFormData);
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
    setDataOptionsTags([]);
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

  const checkIsParticipantSelected = (member: EventParticipant) => {
    const memberId = Number(String(member.id).split('-')[1]);
    if (member.type === EventParticipantType.USER) {
      const selectedUserIds = watch('participantIds') ?? [];
      return selectedUserIds.includes(memberId);
    } else {
      const selectedOrgIds = watch('selectOrganizations') ?? [];
      return selectedOrgIds.includes(memberId);
    }
  };

  const handleSelectEventParticipant = (member: EventParticipant) => {
    const isUser = member.type === EventParticipantType.USER;
    const isOrganization = member.type === EventParticipantType.ORGANIZATION;
    const currentParticipantList = watch('participantIds') || [];
    const currentOrganizationList = watch('selectOrganizations') || [];
    const memberId = Number(String(member.id).split('-')[1]);

    let updatedParticipantList = [...currentParticipantList];
    let updatedOrganizationList = [...currentOrganizationList];

    if (isUser) {
      const isAlreadySelected = currentParticipantList.includes(memberId);

      if (isAlreadySelected) {
        // Remove the user
        updatedParticipantList = updatedParticipantList.filter(
          (id) => id !== memberId,
        );

        // Remove any org that includes the removed user
        const belongedOrganizations = dataOptionsParticipants
          .filter(
            (participant) =>
              participant.type == EventParticipantType.ORGANIZATION &&
              participant.userIds?.includes(memberId),
          )
          .map((org) => Number(String(org.id).split('-')[1]));

        updatedOrganizationList = updatedOrganizationList.filter(
          (org) => !belongedOrganizations.includes(org),
        );
      } else {
        updatedParticipantList.push(memberId);
      }

      setValue('participantIds', updatedParticipantList, { shouldDirty: true });
      setValue('selectOrganizations', updatedOrganizationList, {
        shouldDirty: true,
      });
    } else if (isOrganization) {
      const isAlreadySelected = currentOrganizationList.includes(memberId);
      const organizationMembers = member.userIds || [];

      if (isAlreadySelected) {
        updatedOrganizationList = updatedOrganizationList.filter(
          (id) => id !== memberId,
        );
        // Collect member IDs that should be removed (if not in any other selected org)
        const removeMemberIds = organizationMembers.filter((memberId) => {
          return !updatedOrganizationList.some((orgId) => {
            const org = dataOptionsParticipants.find(
              (item) =>
                Number(item.id) === orgId &&
                item.type === EventParticipantType.ORGANIZATION,
            );
            return org?.userIds?.includes(memberId);
          });
        });

        // Remove the filtered member IDs from selected users
        updatedParticipantList = updatedParticipantList.filter(
          (id) => !removeMemberIds.includes(id),
        );
      } else {
        updatedOrganizationList.push(memberId);
        if (
          removeMyselfOption &&
          organizationMembers.includes(Number(session?.user.id))
        ) {
          updatedParticipantList = Array.from(
            new Set([
              ...updatedParticipantList,
              ...organizationMembers.filter(
                (memberId) => memberId != Number(session?.user.id),
              ),
            ]),
          );
        } else {
          updatedParticipantList = Array.from(
            new Set([...updatedParticipantList, ...organizationMembers]),
          );
        }
      }

      setValue('selectOrganizations', updatedOrganizationList, {
        shouldDirty: true,
      });
      setValue('participantIds', updatedParticipantList, { shouldDirty: true });
    }
  };

  // Render avatar for users and organizations
  const renderAvatar = (memberId: string) => {
    const actualMemberId = Number(memberId.split('-')[1]);
    const memberInfo = dashboardMembersWithAvatars.find(
      (memberWithAvatar) => memberWithAvatar.id == actualMemberId,
    );

    return (
      <div className="h-6 min-w-[33px] min-h-[33px]">
        <CustomUserAvatar
          avatarUrl={memberInfo?.avatar || ''}
          avatarColor={memberInfo?.avatarColor || ''}
          size={33}
        />
      </div>
    );
  };

  return (
    <Drawer
      open={open}
      className="font-primary bg-white w-[700px] !px-0 !rounded-l-[30px]"
      onClose={handleCloseModal}>
      <header
        className="px-8 rounded-tl-[30px] h-[50px] flex items-center justify-between"
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
            !isEditDisabled &&
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
            onClick={handleCloseModal}
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
                maxLength: {
                  value: 255,
                  message: ERROR_LONG_FIELD_MESSAGE,
                },
              })}
              placeholder="新規スケジュール"
              error={errors.title?.message}
              disabled={isDisabled}
            />
          </div>
          <div className="flex gap-2 items-center">
            {session?.user.permissions &&
              !isEditDisabled &&
              action === ActionsEvent.EDIT &&
              hasPermissionInArray(
                session?.user.permissions,
                PermissionsSystem.CALENDAR_UPDATE,
              ) && (
                <Button
                  type="submit"
                  className="w-[82px] h-[36px] !text-[12px] !px-2">
                  予定を編集
                </Button>
              )}
            {session?.user.permissions &&
              (action === ActionsEvent.CREATE ||
                action === ActionsEvent.COPY) &&
              hasPermissionInArray(
                session?.user.permissions,
                PermissionsSystem.CALENDAR_ADD,
              ) && (
                <Button
                  type="submit"
                  className="w-[82px] h-[36px] !text-[12px] !px-2">
                  {action == ActionsEvent.CREATE ? '予定を作成' : '予定を複製'}
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
            <div className="flex flex-col w-full">
              {watch('repeatType') &&
                (watch('repeatType') as OptionDropdownType)?.label ==
                  TaskRepetitiveType.ONCE && (
                  <div className="flex">
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
                                        {
                                          shouldDirty: true,
                                        },
                                      );
                                    }
                                    setValue('endDate', null, {
                                      shouldDirty: true,
                                    });
                                    setValue('endTime', '', {
                                      shouldDirty: true,
                                    });
                                    handleConfirmCheckOverlappingLocation();
                                  }}
                                />
                              )}
                            />
                          </div>
                          {watch('isAllDay') === false && (
                            <div className="w-[72px] z-40">
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
                                        { shouldDirty: true },
                                      );
                                      setValue('endDate', null, {
                                        shouldDirty: true,
                                      });
                                      setValue('endTime', '', {
                                        shouldDirty: true,
                                      });
                                      setMinDatePlan(new Date());
                                    }
                                  },
                                  onBlur: () => {
                                    if (time) {
                                      setValue(
                                        'startTime',
                                        formatTimeInput(time),
                                        { shouldDirty: true },
                                      );
                                    }
                                    setTime('');
                                    handleConfirmCheckOverlappingLocation();
                                  },
                                })}
                                autoComplete="off"
                                type="text"
                                className="h-[34px] !text-xs !pr-1 !pl-7 !border-[1px] !border-[#77858F] rounded-md"
                                disabled={isDisabled}
                                options={optionTimeInput}
                                onChangeDropdown={(e) => {
                                  setValue('startTime', e.label, {
                                    shouldDirty: true,
                                  });
                                  if (getValues('startDate') === null) {
                                    setValue(
                                      'startDate',
                                      (() => {
                                        const today: Date = new Date();
                                        today.setHours(0, 0, 0, 0);
                                        return today;
                                      })(),
                                      { shouldDirty: true },
                                    );
                                  }
                                  handleConfirmCheckOverlappingLocation();
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
                                        { shouldDirty: true },
                                      );
                                    }
                                    handleConfirmCheckOverlappingLocation();
                                  }}
                                />
                              )}
                            />
                          </div>
                          {watch('isAllDay') === false && (
                            <div className="w-[72px] z-40">
                              <Input
                                isShowClockIcon={true}
                                register={register('endTime', {
                                  required:
                                    watch('endDate') !== null ? true : false,
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
                                        setValue(
                                          'endDate',
                                          getValues('startDate'),
                                          { shouldDirty: true },
                                        );
                                      } else {
                                        setValue(
                                          'endDate',
                                          (() => {
                                            const today: Date = new Date();
                                            today.setHours(0, 0, 0, 0);
                                            return today;
                                          })(),
                                          { shouldDirty: true },
                                        );
                                      }
                                    }
                                  },
                                  onBlur: (e) => {
                                    if (time) {
                                      setValue(
                                        'endTime',
                                        formatTimeInput(time),
                                        { shouldDirty: true },
                                      );
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
                                    handleConfirmCheckOverlappingLocation();
                                  },
                                })}
                                type="text"
                                className="h-[34px] !text-xs !pr-1 !pl-7 !border-[1px] !border-[#77858F] rounded-md"
                                disabled={isDisabled}
                                options={optionTimeInput}
                                onChangeDropdown={(e) => {
                                  setValue('endTime', e.label, {
                                    shouldDirty: true,
                                  });
                                  if (getValues('endDate') === null) {
                                    if (getValues('startDate') !== null) {
                                      setValue(
                                        'endDate',
                                        getValues('startDate'),
                                        { shouldDirty: true },
                                      );
                                    } else {
                                      setValue(
                                        'endDate',
                                        (() => {
                                          const today: Date = new Date();
                                          today.setHours(0, 0, 0, 0);
                                          return today;
                                        })(),
                                        { shouldDirty: true },
                                      );
                                    }
                                  }
                                  handleConfirmCheckOverlappingLocation();
                                }}
                              />
                            </div>
                          )}
                        </div>
                        <ErrorMessage
                          error={
                            errors.endDate?.message || errors.endTime?.message
                          }
                          className="mt-[5px] mb-[5px] text-xs"
                        />
                      </div>
                    </div>
                    <Button
                      sz="sm"
                      variant="outline"
                      className="w-[48px] h-[34px] ml-auto hover:opacity-70 !border-none !px-0 !rounded-md text-[13px] !bg-[#EBF1F7]"
                      type="button"
                      name="Remove plan"
                      onClick={() => {
                        setValue('endDate', null, { shouldDirty: true });
                        setValue('endTime', '', { shouldDirty: true });
                        setValue('startDate', null, { shouldDirty: true });
                        setValue('startTime', '', { shouldDirty: true });
                      }}>
                      削除
                    </Button>
                  </div>
                )}

              <div className="flex gap-2 items-center !w-full mt-2">
                {watch('repeatType') &&
                  (watch('repeatType') as OptionDropdownType)?.label ==
                    TaskRepetitiveType.ONCE && (
                    <div className="!w-[68px] mr-5">
                      <Checkbox
                        label="終日"
                        onChange={(state) => {
                          setValue('isAllDay', state, { shouldDirty: true });
                          handleConfirmCheckOverlappingLocation();
                        }}
                        isChecked={defaultValues.isAllDay}
                        disable={isDisabled}
                      />
                    </div>
                  )}

                <div className="w-full flex flex-col gap-3 items-start mb-[2.5px]">
                  <div className="!w-full flex justify-between">
                    <div className="flex gap-3">
                      <div className="w-[140px] z-[30]">
                        <Controller
                          control={control}
                          name={'repeatType'}
                          render={({ field: { onChange } }) => {
                            return (
                              <Dropdown
                                className="h-[34px] !py-1 text-xs !border-[#77858F]"
                                classNameTextData="!text-xs"
                                classNameOption="!text-xs"
                                classNameError="!text-xs"
                                labelOptionClass="!pr-0"
                                disabled={isDisabled}
                                options={TASK_REPETITIVE_OPTIONS}
                                selectedOption={TASK_REPETITIVE_OPTIONS.find(
                                  (element) =>
                                    element.value ===
                                    (watch('repeatType') as OptionDropdownType)
                                      ?.value,
                                )}
                                onChange={(e) => {
                                  onChange(e);
                                  if (
                                    e.value != TaskRepetitiveValue.ONCE &&
                                    action == ActionsEvent.EDIT
                                  ) {
                                    setIsEditingRepetitiveFields(true);
                                  }
                                  setValue('isAllDay', false, {
                                    shouldDirty: true,
                                  });
                                  setValue('repeatInterval', undefined, {
                                    shouldDirty: true,
                                  });
                                  setValue('weekDay', undefined, {
                                    shouldDirty: true,
                                  });
                                  setValue('monthDay', undefined, {
                                    shouldDirty: true,
                                  });
                                  setValue('month', undefined, {
                                    shouldDirty: true,
                                  });
                                }}
                              />
                            );
                          }}
                        />
                      </div>
                      {watch('repeatType') &&
                        (watch('repeatType') as OptionDropdownType)?.label ==
                          TaskRepetitiveType.DAILY && (
                          <div className="flex gap-2 z-[30] items-center">
                            <Controller
                              control={control}
                              name={'repeatInterval'}
                              rules={{
                                required: true,
                              }}
                              render={({ field: { onChange } }) => (
                                <Dropdown
                                  className={`h-[34px] !w-[56px] !py-1 !pr-0 text-xs ${!errors?.repeatInterval ? '!border-[#77858F]' : '!border-error'}`}
                                  classNameTextData="!text-xs"
                                  classNameOption="!text-xs"
                                  classNameError="!text-xs"
                                  labelOptionClass="!pr-0"
                                  disabled={isDisabled}
                                  options={REPEAT_INTERVAL_OPTIONS}
                                  selectedOption={REPEAT_INTERVAL_OPTIONS.find(
                                    (element) =>
                                      element.value ===
                                      (
                                        watch(
                                          'repeatInterval',
                                        ) as OptionDropdownType
                                      )?.value,
                                  )}
                                  onChange={(e) => {
                                    onChange(e);
                                    action == ActionsEvent.EDIT &&
                                      setIsEditingRepetitiveFields(true);
                                  }}
                                />
                              )}
                            />
                            <p className="text-sm font-normal whitespace-nowrap">
                              日ごと
                            </p>
                            <ErrorMessage
                              error={errors?.repeatInterval?.message}
                              className="mt-[-10px] text-xs"
                            />
                          </div>
                        )}
                      {watch('repeatType') &&
                        (watch('repeatType') as OptionDropdownType)?.label ==
                          TaskRepetitiveType.WEEKLY && (
                          <div className="flex gap-2 z-[30] items-center">
                            <Controller
                              control={control}
                              name={'weekDay'}
                              rules={{
                                required: true,
                              }}
                              render={({ field: { onChange } }) => (
                                <Dropdown
                                  className={`h-[34px] !w-[56px] !py-1 !pr-0 text-xs ${!errors?.weekDay ? '!border-[#77858F]' : '!border-error'}`}
                                  classNameTextData="!text-xs"
                                  classNameOption="!text-xs"
                                  classNameError="!text-xs"
                                  labelOptionClass="!pr-0"
                                  disabled={isDisabled}
                                  options={WEEKDAY_OPTIONS}
                                  selectedOption={
                                    (watch('weekDay') as OptionDropdownType)
                                      ?.value != null &&
                                    (watch('weekDay') as OptionDropdownType)
                                      ?.value != undefined
                                      ? WEEKDAY_OPTIONS.find(
                                          (element) =>
                                            element.value ===
                                            (
                                              watch(
                                                'weekDay',
                                              ) as OptionDropdownType
                                            )?.value,
                                        )
                                      : undefined
                                  }
                                  onChange={(e) => {
                                    onChange(e);
                                    action == ActionsEvent.EDIT &&
                                      setIsEditingRepetitiveFields(true);
                                  }}
                                />
                              )}
                            />
                            <p className="text-sm font-normal whitespace-nowrap">
                              曜日
                            </p>
                            <Controller
                              control={control}
                              name={'repeatInterval'}
                              rules={{
                                required: true,
                              }}
                              render={({ field: { onChange } }) => (
                                <Dropdown
                                  className={`h-[34px] !w-[56px] !py-1 !pr-0 text-xs ${!errors?.repeatInterval ? '!border-[#77858F]' : '!border-error'}`}
                                  classNameTextData="!text-xs"
                                  classNameOption="!text-xs"
                                  classNameError="!text-xs"
                                  labelOptionClass="!pr-0"
                                  disabled={isDisabled}
                                  options={REPEAT_INTERVAL_OPTIONS}
                                  selectedOption={REPEAT_INTERVAL_OPTIONS.find(
                                    (element) =>
                                      element.value ===
                                      (
                                        watch(
                                          'repeatInterval',
                                        ) as OptionDropdownType
                                      )?.value,
                                  )}
                                  onChange={(e) => {
                                    onChange(e);
                                    action == ActionsEvent.EDIT &&
                                      setIsEditingRepetitiveFields(true);
                                  }}
                                />
                              )}
                            />
                            <p className="text-sm font-normal whitespace-nowrap">
                              週間ごと
                            </p>
                          </div>
                        )}
                      {watch('repeatType') &&
                        (watch('repeatType') as OptionDropdownType)?.label ==
                          TaskRepetitiveType.MONTHLY && (
                          <div className="flex gap-2 z-[30] items-center">
                            <Controller
                              control={control}
                              name={'monthDay'}
                              rules={{
                                required: true,
                              }}
                              render={({ field: { onChange } }) => (
                                <Dropdown
                                  className={`h-[34px] !w-[56px] !py-1 !pr-0 text-xs ${!errors?.monthDay ? '!border-[#77858F]' : '!border-error'}`}
                                  classNameTextData="!text-xs"
                                  classNameOption="!text-xs"
                                  classNameError="!text-xs"
                                  labelOptionClass="!pr-0"
                                  disabled={isDisabled}
                                  options={DAY_OPTIONS}
                                  selectedOption={DAY_OPTIONS.find(
                                    (element) =>
                                      element.value ===
                                      (watch('monthDay') as OptionDropdownType)
                                        ?.value,
                                  )}
                                  onChange={(e) => {
                                    onChange(e);
                                    action == ActionsEvent.EDIT &&
                                      setIsEditingRepetitiveFields(true);
                                  }}
                                />
                              )}
                            />
                            <p className="text-sm font-normal whitespace-nowrap">
                              日
                            </p>
                            <Controller
                              control={control}
                              name={'repeatInterval'}
                              rules={{
                                required: true,
                              }}
                              render={({ field: { onChange } }) => (
                                <Dropdown
                                  className={`h-[34px] !w-[56px] !py-1 !pr-0 text-xs ${!errors?.repeatInterval ? '!border-[#77858F]' : '!border-error'}`}
                                  classNameTextData="!text-xs"
                                  classNameOption="!text-xs"
                                  classNameError="!text-xs"
                                  labelOptionClass="!pr-0"
                                  disabled={isDisabled}
                                  options={REPEAT_INTERVAL_OPTIONS}
                                  selectedOption={REPEAT_INTERVAL_OPTIONS.find(
                                    (element) =>
                                      element.value ===
                                      (
                                        watch(
                                          'repeatInterval',
                                        ) as OptionDropdownType
                                      )?.value,
                                  )}
                                  onChange={(e) => {
                                    onChange(e);
                                    action == ActionsEvent.EDIT &&
                                      setIsEditingRepetitiveFields(true);
                                  }}
                                />
                              )}
                            />
                            <p className="text-sm font-normal whitespace-nowrap">
                              ヶ月ごと
                            </p>
                          </div>
                        )}
                      {watch('repeatType') &&
                        (watch('repeatType') as OptionDropdownType)?.label ==
                          TaskRepetitiveType.YEARLY && (
                          <div className="flex gap-2 z-[30] items-center">
                            <Controller
                              control={control}
                              name={'month'}
                              rules={{
                                required: true,
                              }}
                              render={({ field: { onChange } }) => (
                                <Dropdown
                                  className={`h-[34px] !w-[56px] !py-1 !pr-0 text-xs ${!errors?.month ? '!border-[#77858F]' : '!border-error'}`}
                                  classNameTextData="!text-xs"
                                  classNameOption="!text-xs"
                                  classNameError="!text-xs"
                                  labelOptionClass="!pr-0"
                                  disabled={isDisabled}
                                  options={MONTH_OPTIONS}
                                  selectedOption={MONTH_OPTIONS.find(
                                    (element) =>
                                      element.value ===
                                      (watch('month') as OptionDropdownType)
                                        ?.value,
                                  )}
                                  onChange={(e) => {
                                    onChange(e);
                                    action == ActionsEvent.EDIT &&
                                      setIsEditingRepetitiveFields(true);
                                  }}
                                />
                              )}
                            />
                            <p className="text-sm font-normal whitespace-nowrap">
                              月
                            </p>
                            <Controller
                              control={control}
                              name={'monthDay'}
                              rules={{
                                required: true,
                              }}
                              render={({ field: { onChange } }) => (
                                <Dropdown
                                  className={`h-[34px] !w-[56px] !py-1 !pr-0 text-xs ${!errors?.monthDay ? '!border-[#77858F]' : '!border-error'}`}
                                  classNameTextData="!text-xs"
                                  classNameOption="!text-xs"
                                  classNameError="!text-xs"
                                  labelOptionClass="!pr-0"
                                  disabled={isDisabled}
                                  options={DAY_OPTIONS}
                                  selectedOption={DAY_OPTIONS.find(
                                    (element) =>
                                      element.value ===
                                      (watch('monthDay') as OptionDropdownType)
                                        ?.value,
                                  )}
                                  onChange={(e) => {
                                    onChange(e);
                                    action == ActionsEvent.EDIT &&
                                      setIsEditingRepetitiveFields(true);
                                  }}
                                />
                              )}
                            />
                            <p className="text-sm font-normal whitespace-nowrap">
                              日
                            </p>
                            <Controller
                              control={control}
                              name={'repeatInterval'}
                              rules={{
                                required: true,
                              }}
                              render={({ field: { onChange } }) => (
                                <Dropdown
                                  className={`h-[34px] !w-[56px] !py-1 !pr-0 text-xs ${!errors?.repeatInterval ? '!border-[#77858F]' : '!border-error'}`}
                                  classNameTextData="!text-xs"
                                  classNameOption="!text-xs"
                                  classNameError="!text-xs"
                                  labelOptionClass="!pr-0"
                                  disabled={isDisabled}
                                  options={REPEAT_INTERVAL_OPTIONS}
                                  selectedOption={REPEAT_INTERVAL_OPTIONS.find(
                                    (element) =>
                                      element.value ===
                                      (
                                        watch(
                                          'repeatInterval',
                                        ) as OptionDropdownType
                                      )?.value,
                                  )}
                                  onChange={(e) => {
                                    onChange(e);
                                    action == ActionsEvent.EDIT &&
                                      setIsEditingRepetitiveFields(true);
                                  }}
                                />
                              )}
                            />
                            <p className="text-sm font-normal whitespace-nowrap">
                              年ごと
                            </p>
                          </div>
                        )}
                    </div>

                    <div className="w-12">
                      {!isDisabled &&
                        watch('repeatType') &&
                        (watch('repeatType') as OptionDropdownType)?.label !=
                          TaskRepetitiveType.ONCE && (
                          <Button
                            sz="sm"
                            variant="outline"
                            className="w-12 h-[34px] hover:opacity-70 !border-none !px-0 !rounded-md text-[13px] !bg-[#EBF1F7]"
                            type="button"
                            name="Remove TagId"
                            onClick={() => {
                              setValue('repeatType', undefined, {
                                shouldDirty: true,
                              });
                              setValue('repeatInterval', undefined, {
                                shouldDirty: true,
                              });
                              setValue('weekDay', undefined, {
                                shouldDirty: true,
                              });
                              setValue('monthDay', undefined, {
                                shouldDirty: true,
                              });
                              setValue('month', undefined, {
                                shouldDirty: true,
                              });
                            }}>
                            削除
                          </Button>
                        )}
                    </div>
                  </div>
                </div>
              </div>
              {!(
                watch('repeatType') &&
                (watch('repeatType') as OptionDropdownType)?.label ==
                  TaskRepetitiveType.ONCE
              ) && (
                <div className="!w-full flex justify-between mt-2">
                  <div className="flex gap-2">
                    <div className="w-[72px] z-[20] relative">
                      <Input
                        isShowClockIcon={true}
                        autoFocus={false}
                        disabled={isDisabled}
                        type="text"
                        options={optionTimeInput}
                        register={register('startTime', {
                          onChange: (e) => {
                            handleChange(e, 'startTime');
                          },
                          onBlur: () => {
                            if (time) {
                              setValue('startTime', formatTimeInput(time), {
                                shouldDirty: true,
                              });
                            }
                            setTime('');
                          },
                        })}
                        className="h-[34px] !text-xs !pr-1 !pl-7 !border-[1px] !border-[#77858F] rounded-md"
                        onChangeDropdown={(e) => {
                          setValue('startTime', e.label, { shouldDirty: true });
                        }}
                      />
                    </div>
                    <div className="h-[34px] flex items-center">〜</div>
                    <div className="w-[72px] z-[20] relative">
                      <Input
                        isShowClockIcon={true}
                        autoFocus={false}
                        disabled={isDisabled}
                        type="text"
                        options={optionTimeInput}
                        register={register('endTime', {
                          onChange: (e) => {
                            handleChange(e, 'endTime');
                          },
                          onBlur: () => {
                            if (time) {
                              setValue('endTime', formatTimeInput(time), {
                                shouldDirty: true,
                              });
                            }
                            setTime('');
                          },
                          validate: (value) => {
                            if (!watch('repeatType')) return true;
                            return (
                              convertToMinutes(String(value)) >
                                convertToMinutes(`${watch('startTime')}`) ||
                              END_DATE_WRONG_SELECTED
                            );
                          },
                        })}
                        className="h-[34px] !text-xs !pr-1 !pl-7 !border-[1px] !border-[#77858F] rounded-md"
                        onChangeDropdown={(e) => {
                          setValue('endTime', e.label, { shouldDirty: true });
                        }}
                      />
                    </div>
                  </div>

                  <div className="mb-[2.5px] w-12">
                    {!isDisabled && (
                      <Button
                        sz="sm"
                        variant="outline"
                        className="w-12 h-[34px] hover:opacity-70 !border-none !px-0 !rounded-md text-[13px] !bg-[#EBF1F7]"
                        type="button"
                        name="Remove TagId"
                        onClick={() => {
                          setValue('startTime', '', { shouldDirty: true });
                          setValue('endTime', '', { shouldDirty: true });
                        }}>
                        削除
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
          {/* Event category */}
          <div className="flex justify-between items-center">
            <p className="w-fit font-medium text-[14px]">予定カテゴリー</p>
            <div className="w-[513px] space-y-2">
              <p className="text-[#7F8991] font-medium text-sm h-[32px] flex items-end leading-none">
                カレンダー
              </p>
              <Controller
                control={control}
                name={'largeCategory'}
                render={({ field: { value, onChange } }) => (
                  <Dropdown
                    className="h-8 !py-1 text-xs !border-[1px] !border-[#77858F]"
                    classNameTextData="!text-xs"
                    classNameOption="!text-xs"
                    options={[...dataOptionsCategoryLarge]}
                    selectedOption={[...dataOptionsCategoryLarge].find(
                      (element) =>
                        element.value == (value as OptionDropdownType)?.value,
                    )}
                    placeholder={'大カテゴリー'}
                    onChange={(e) => {
                      if (e.value != watch('largeCategory.value')) {
                        setValue(
                          'mediumCategory',
                          { label: '', value: '' },
                          { shouldDirty: true },
                        );
                      }
                      onChange(e);
                    }}
                    disabled={isDisabled}
                  />
                )}
              />
              {watch('largeCategory')?.value && (
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
                          options={[...dataOptionsCategoryMedium]}
                          selectedOption={[...dataOptionsCategoryMedium].find(
                            (element) =>
                              element.value ==
                              (value as OptionDropdownType)?.value,
                          )}
                          placeholder={'中カテゴリ'}
                          onChange={(e) => {
                            onChange(e);
                          }}
                          disabled={isDisabled}
                        />
                      );
                    }}
                  />
                </div>
              )}
            </div>
          </div>
          {/* Tag */}
          <div className="flex gap-6 items-start">
            <div className="w-full max-w-32 font-medium text-[14px]">タグ</div>
            <div className="w-full max-w-[518px]">
              <div className="flex gap-2 max-w-[518px]">
                <div className="w-[457px]">
                  <MultiSelectDropdown
                    className="!h-[34px]"
                    disabled={isDisabled}
                    valueClassName="!border-[1px] !border-[#77858F]"
                    options={dataOptionsTags}
                    optionClassName="!border-[1px] !border-[#77858F] max-w-[513px]"
                    customLabel={
                      (watch('tagIds') ?? []).filter((tag) => tag.value)
                        .length > 0
                        ? `${(watch('tagIds') ?? []).filter((tag) => tag.value).length}件選択中`
                        : UNREGISTERED
                    }
                    noDataClass="w-[461px]"
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
                      setValue('tagIds', updatedTagIds, { shouldDirty: true });
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

                                  setValue('tagIds', updatedTagIds, {
                                    shouldDirty: true,
                                  });
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
                      setValue('tagIds', [], { shouldDirty: true });
                    }}>
                    削除
                  </Button>
                </div>
              </div>
            </div>
          </div>
          {/* Location */}
          <div className="flex justify-between items-center">
            <p className="w-fit font-medium text-[14px]">場所</p>
            <div className="w-[513px]">
              <Controller
                control={control}
                name={'location'}
                render={({ field: { value, onChange } }) => (
                  <Dropdown
                    className="h-8 !py-1 text-xs max-w-[513px] !border-[1px] !border-[#77858F] !rounded-md"
                    classNameTextData="!text-xs"
                    classNameOption="!text-xs w-[513px]"
                    classNameError="!text-xs"
                    placeholder="選択してください"
                    disabled={isDisabled}
                    options={dataOptionsEventLocation}
                    selectedOption={dataOptionsEventLocation.find(
                      (element) =>
                        element.value == (value as OptionDropdownType)?.value,
                    )}
                    onChange={(e) => {
                      onChange(e);
                      handleConfirmCheckOverlappingLocation();
                    }}
                  />
                )}
                rules={{ required: ORGANIZATION_REQUIRED_MESSAGE }}
              />
              <ErrorMessage
                error={errors.location?.message}
                className="text-xs"
              />
              {watch('isEventOverlapping') && (
                <div className="flex gap-1 items-center mt-2">
                  <ImageRound
                    src={`/icons/overlap-task.svg`}
                    name="icon warning"
                    className="w-3 h-3"
                  />
                  <p className="text-xs font-normal text-error">
                    この場所はすでに予約されています。
                  </p>
                </div>
              )}
            </div>
          </div>
          {/* Participants */}
          <div className="flex flex-col">
            <div className="flex justify-between items-start mb-3">
              <p className="w-fit font-medium text-[14px] mt-3">
                メンバーを追加
              </p>
              <div>
                <div className="relative">
                  <Input
                    placeholder="名前を検索"
                    className={`!w-[513px] h-[34px] pl-9 focus:!shadow-none !border-[1px] !border-[#77858F] !rounded-md`}
                    onChange={(e) => setSearchName(e.target.value)}
                    disabled={isDisabled}
                  />
                  <ImageRound
                    src="/icons/search.svg"
                    name="Search input icon"
                    className={`absolute w-4 h-4 ml-3 top-[11px]`}
                  />
                </div>

                <div className="flex justify-between items-center my-3">
                  <p
                    className="text-[#77858F] font-medium text-[11px] hover:cursor-pointer"
                    onClick={() => {
                      const updatedParticipantList =
                        dataOptionsParticipants?.filter((member) =>
                          member.fullName
                            .toLowerCase()
                            .includes(searchName.toLowerCase()),
                        );
                      setValue(
                        'participantIds',
                        [
                          ...(watch('participantIds') || []),
                          ...updatedParticipantList
                            .filter(
                              (participant) =>
                                participant.type === EventParticipantType.USER,
                            )
                            .map((participant) =>
                              Number(String(participant.id).split('-')[1]),
                            ),
                        ],
                        { shouldDirty: true },
                      );

                      setValue(
                        'selectOrganizations',
                        [
                          ...(watch('selectOrganizations') || []),
                          ...updatedParticipantList
                            .filter(
                              (participant) =>
                                participant.type ==
                                EventParticipantType.ORGANIZATION,
                            )
                            .map((participant) =>
                              Number(String(participant.id).split('-')[1]),
                            ),
                        ],
                        { shouldDirty: true },
                      );
                    }}>
                    全てをチェック
                  </p>
                  <p
                    className="text-[#77858F] font-medium text-[12px] hover:cursor-pointer"
                    onClick={() => {
                      const matchingParticipantList =
                        dataOptionsParticipants?.filter((member) =>
                          member.fullName
                            .toLowerCase()
                            .includes(searchName.toLowerCase()),
                        );
                      const currentParticipantIds =
                        watch('participantIds') || [];
                      const currentOrganizationIds =
                        watch('selectOrganizations') || [];

                      const filteredParticipantIds =
                        currentParticipantIds.filter(
                          (participantId) =>
                            !matchingParticipantList.find(
                              (matchingParticipant) =>
                                String(matchingParticipant.id).split('-')[1] ===
                                  String(participantId) &&
                                matchingParticipant.type ==
                                  EventParticipantType.USER,
                            ),
                        );
                      const filteredOrganizationIds =
                        currentOrganizationIds.filter(
                          (participantId) =>
                            !matchingParticipantList.find(
                              (matchingParticipant) =>
                                String(matchingParticipant.id).split('-')[1] ===
                                  String(participantId) &&
                                matchingParticipant.type ==
                                  EventParticipantType.ORGANIZATION,
                            ),
                        );

                      setValue('participantIds', filteredParticipantIds, {
                        shouldDirty: true,
                      });

                      setValue('selectOrganizations', filteredOrganizationIds, {
                        shouldDirty: true,
                      });
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
                    .sort((prev: EventParticipant, next: EventParticipant) => {
                      const prevSelected = checkIsParticipantSelected(prev);
                      const nextSelected = checkIsParticipantSelected(next);

                      // 1. Checked participants first
                      if (prevSelected !== nextSelected) {
                        return prevSelected ? -1 : 1;
                      }

                      // 2. Current user (only if user, not org)
                      if (
                        prev.id === session?.user.id &&
                        prev.type === EventParticipantType.USER
                      )
                        return -1;
                      if (
                        next.id === session?.user.id &&
                        next.type === EventParticipantType.USER
                      )
                        return 1;

                      // 3. Organizations before users
                      if (
                        prev.type === EventParticipantType.ORGANIZATION &&
                        next.type === EventParticipantType.USER
                      )
                        return -1;
                      if (
                        prev.type === EventParticipantType.USER &&
                        next.type === EventParticipantType.ORGANIZATION
                      )
                        return 1;

                      // 4. Alphabetical
                      return prev.fullName.localeCompare(next.fullName);
                    })
                    .map((member) => {
                      return (
                        <div
                          className={`flex gap-2 items-center px-3 py-2.5 hover:cursor-pointer ${
                            checkIsParticipantSelected(member) && 'bg-[#EBF1F7]'
                          }`}
                          key={member.id}>
                          <div>
                            <Checkbox
                              isChecked={checkIsParticipantSelected(member)}
                              disable={isDisabled}
                              onChange={() => {
                                handleSelectEventParticipant(member);
                              }}
                            />
                          </div>
                          {member.type == EventParticipantType.USER && (
                            <>{renderAvatar(String(member.id))}</>
                          )}
                          {member.type == EventParticipantType.ORGANIZATION && (
                            <div className="scale-110">
                              <GroupIconWithDynamicColor
                                color={member.color || '#0068B6'}
                              />
                            </div>
                          )}
                          <p
                            className={`text-[15px] truncate max-w-[350px] text-black leading-normal ${member.type == EventParticipantType.ORGANIZATION && 'ml-1'}`}>
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
                    setRemoveMyselfOption(state);
                    const currentParticipantList =
                      watch('participantIds') || [];
                    if (state) {
                      // Remove user from currentParticipantList
                      const filterParticipantList =
                        currentParticipantList.filter(
                          (participant) => participant != session?.user.id,
                        );
                      setValue('participantIds', filterParticipantList, {
                        shouldDirty: true,
                      });

                      // Remove any org that includes the removed user
                      const currentOrganizationList =
                        watch('selectOrganizations') || [];
                      let updatedOrganizationList = [
                        ...currentOrganizationList,
                      ];
                      const belongedOrganizations = dataOptionsParticipants
                        .filter(
                          (participant) =>
                            participant.type ==
                              EventParticipantType.ORGANIZATION &&
                            participant.userIds?.includes(
                              Number(session?.user.id),
                            ),
                        )
                        .map((org) => Number(String(org.id).split('-')[1]));

                      updatedOrganizationList = updatedOrganizationList.filter(
                        (org) => !belongedOrganizations.includes(org),
                      );
                      setValue('selectOrganizations', updatedOrganizationList, {
                        shouldDirty: true,
                      });
                    } else {
                      // Add user to currentParticipantList if user belongs to currentOrganizationList
                      const currentOrganizationList =
                        watch('selectOrganizations') || [];
                      for (const orgId of currentOrganizationList) {
                        const org = dataOptionsOrganizations.find(
                          (organization) => organization.value == orgId,
                        );
                        if (org) {
                          const orgMembers = org.userIds || [];
                          if (orgMembers.includes(Number(session?.user.id))) {
                            setValue(
                              'participantIds',
                              [
                                ...currentParticipantList,
                                Number(session?.user.id),
                              ],
                              { shouldDirty: true },
                            );
                            break;
                          }
                        }
                      }
                    }
                  }}
                />
              </div>
            </div>
          </div>
          {/* Memo */}
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
              !isEditDisabled &&
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
