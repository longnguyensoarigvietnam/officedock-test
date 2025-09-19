'use client';
import { Fragment, useContext, useEffect, useState } from 'react';
import lodash from 'lodash';
import { signOut } from 'next-auth/react';
import {
  Popover,
  PopoverButton,
  PopoverPanel,
  Transition,
} from '@headlessui/react';
import {
  useParams,
  usePathname,
  useRouter,
  useSearchParams,
} from 'next/navigation';
import { useMutation, useQueryClient } from 'react-query';
import { AxiosError } from 'axios';

import ImageRound from '@components/common/ImageRound';
import ActionsEventModal from '@components/modals/ActionsEventModal';
import ConfirmActionsEventModal from '@components/modals/ConfirmActionsEventModal';
import ConfirmDeleteModal from '@components/modals/ConfirmDeleteModal';
import WarningDeadlineTaskModal from '@components/modals/WarningDeadlineTaskModal';
import socketEventEmitter from '@components/socket/socketEventEmitter';
import ActionsTaskModal from '@components/modals/ActionsTaskModal';
import WarningCloseTaskModal from '@components/modals/WarningCloseTaskModal';
import ChatWarningUploadingFilesModal from '@components/modals/ChatWarningUploadingFilesModal';
import ViewProfileModal from '@components/modals/ViewProfileModal';
import EditProfileModal from '@components/modals/EditProfileModal';
import CustomUserAvatar from '@components/common/AvatarIcon/CustomUserAvatar';
import ErrorUploadFileValidationModal from '@components/modals/ErrorUploadFileValidationModal';
import ConfirmDragModalTask from '@components/modals/ConfirmDropModalTask';
import CompletionRewardModal from '@components/modals/CompletionRewardModal';
import EventActionTypeModal from '@components/modals/EventActionTypeModal';

import { useErrorToast } from '@hooks/useErrorToast';
import useAuthenticatedUser from '@hooks/useAuthenticatedUser';

import {
  ActionsEvent,
  ActionTask,
  EventActionType,
  EventWorkCategory,
  ItemStartType,
  PermissionsSystem,
  ScreenName,
  ServerStatusCode,
  SocketActions,
  StatusValueTask,
  TaskRepetitiveValue,
  TimeType,
} from '@constants/enums';
import { SETTING_MENU, SYSTEM_PERMISSIONS_MENU } from '@constants/menu';
import { apiRouters, pageRouters } from '@constants/routers';
import {
  ERROR_DELETE_MESSAGE,
  ERROR_MESSAGE_OVERLAP_TASK,
  ERROR_NOT_FOUND_EVENT,
  ERROR_NOT_FOUND_TASK,
  ERROR_SAVE_MESSAGE,
  ERROR_UPDATE_MESSAGE,
  SUCCESS_DELETE_MESSAGE,
  SUCCESS_UPDATE_MESSAGE,
  UPLOAD_AVATAR_FILE_MAXIMUM_SIZE,
} from '@constants/message';
import { DEFAULT_END_TIME, DEFAULT_START_TIME, NO_SETTING } from '@constants';

import { Task, TaskFormData, TaskRequest } from '@interfaces/task';
import { EventEditFormData, EventRequest } from '@interfaces/calendar';
import { OptionDropdownType } from '@interfaces/common';
import { WebSocketMessageData } from '@interfaces/chat';
import { UserProfileFormData, UserProfileFormRequest } from '@interfaces/user';
import { MenuItem } from '@interfaces/menu';

import { LoadingContext } from '@providers/LoadingProvider';
import { GlobalStateContext } from '@providers/GlobalStateProvider';
import { TaskContext } from '@providers/TaskProvider';
import { useToast } from '@providers/ToastProvider';
import { useSessionCache } from '@providers/SessionCacheProvider';

import TaskPageDataHeader from './TaskPageDataHeader';
import { addTimeToDate, formatDateServer } from '@utils/date';
import api from '@base/api';

type HeaderProps = {
  className?: string;
};

const updateCurrent = (menuItems: MenuItem[], pathname: string): MenuItem[] => {
  return menuItems.map((item) => {
    const updatedItem = { ...item };

    if (updatedItem.href && pathname.startsWith(updatedItem.href)) {
      updatedItem.current = true;
    } else if (updatedItem.children) {
      const childWithMatchingHref = updatedItem.children.find((child) =>
        child.href.startsWith(pathname),
      );
      if (childWithMatchingHref) {
        updatedItem.current = true;
        childWithMatchingHref.current = true;
      }
      updatedItem.children = updateCurrent(updatedItem.children, pathname);
    }

    return updatedItem;
  });
};

const Header = ({ className }: HeaderProps) => {
  const { setDataEventEdit, setIdEventDelete, setOrderingOptions } =
    useContext(TaskContext);
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const params = useParams();

  const paramsURL = new URLSearchParams(searchParams);

  const showErrorToast = useErrorToast();

  const queryClient = useQueryClient();

  const taskDetailId = searchParams.get('task');
  const idEvent = searchParams.get('event');

  const actionType = searchParams.get('action');

  const isDailyReportPage = pathname.startsWith('/daily-report');
  const teamId = params.id;

  const isDailyReportTeamPage = pathname.startsWith('/daily-report-team');

  const isTaskPage = pathname.startsWith('/task');

  const isTaskTeamPage = pathname.startsWith('/task-teams');
  const isScheduleTeamPage =
    pathname === pageRouters.SCHEDULE_TEAM_MANAGEMENT.href;

  const isCalendarPage = pathname === pageRouters.CALENDAR_MANAGEMENT.href;

  const typeDetail = searchParams.get('type');
  const [dataTaskEdit, setDataTaskEdit] = useState<Task | null>(null);
  const [openConfirmDeleteModal, setOpenConfirmDeleteModal] = useState(false);
  const [openWarningDeadlineModal, setOpenWarningDeadlineModal] =
    useState(false);
  const [dataRemind, setDataRemind] = useState<{
    count: number;
    type: string;
    id: number;
    title: string;
  }>();

  // Event
  const [dataEventEdit, setDataEventEditLocal] = useState<EventEditFormData>();
  const [backToEditing, setBackToEditing] = useState(false);
  const [confirmEventDataToEdit, setConfirmEventDataToEdit] =
    useState<EventEditFormData>();
  const [openConfirmEditEventModal, setOpenConfirmEditEventModal] =
    useState(false);
  const [openConfirmDeleteEventModal, setOpenConfirmDeleteEventModal] =
    useState(false);
  const [openEventActionTypeModal, setOpenEventActionTypeModal] = useState<{
    status: boolean;
    type: ActionsEvent | null;
    showThisEventOption?: boolean;
  }>({
    status: false,
    type: ActionsEvent.EDIT,
    showThisEventOption: true,
  });
  const [eventActionType, setEventActionType] =
    useState<EventActionType | null>(null);
  const [isEditingRepetitiveFields, setIsEditingRepetitiveFields] =
    useState<boolean>(false);

  const router = useRouter();
  const { data: session } = useSessionCache();
  const [isShowModalTask, setShowModalTask] = useState<boolean>(false);
  const [openCreateEventModal, setOpenCreateEventModal] =
    useState<boolean>(false);

  const { setIsLoading } = useContext(LoadingContext);
  const { isChatFilesUploading, cancelUploadChatFiles } =
    useContext(GlobalStateContext);
  const [pendingPageChange, setPendingPageChange] = useState<string | null>(
    null,
  );
  const [showWarningChatUploadingModal, setShowWarningChatUploadingModal] =
    useState(false);
  const [actionsEventMessage, setActionsEventMessage] = useState<string>('');
  const [openWarningCloseModal, setOpenWarningCloseModal] =
    useState<boolean>(false);
  const [resetFunctions, setResetFunctions] = useState<{
    resetDataCategoryOptions?: () => void;
    reset?: () => void;
  }>({});
  const [pendingTaskData, setPendingTaskData] = useState<TaskFormData | null>();
  const [closeAction, setCloseAction] = useState<ActionTask | null>();
  const [openViewProfileModal, setOpenViewProfileModal] =
    useState<boolean>(false);
  const [openEditProfileModal, setOpenEditProfileModal] =
    useState<boolean>(false);
  const [openErrorUploadFileModal, setOpenErrorUploadFileModal] =
    useState(false);
  const [openConfirmDragModalForm, setOpenConfirmDragModalForm] =
    useState(false);
  const [dataConfirmRewardForm, setDataConfirmRewardForm] =
    useState<TaskFormData | null>(null);
  const [openRewardModal, setOpenRewardModal] = useState(false);
  const [dataRewardSkill, setDataRewardSkill] =
    useState<WebSocketMessageData>();

  // Error messages
  const [editProfileErrorMessages, setEditProfileErrorMessages] = useState<{
    password?: string;
    fullName?: string;
  }>({
    password: '',
    fullName: '',
  });

  const { showToast } = useToast();
  const { authenticatedUser } = useAuthenticatedUser({});

  const COMPANY_SETTING_ITEMS = SYSTEM_PERMISSIONS_MENU.filter((menu) => {
    if (menu.requiredPermission === PermissionsSystem.VIEW_ALL) {
      return true;
    }
    return session?.user.permissions.includes(menu.requiredPermission);
  });
  const companySettingItemsClone: MenuItem[] = lodash.cloneDeep(
    COMPANY_SETTING_ITEMS,
  );
  const companyItems = updateCurrent(companySettingItemsClone, pathname);

  // Socket
  useEffect(() => {
    const handleSocketMessage = (data: WebSocketMessageData) => {
      switch (data.action) {
        case SocketActions.REMIND_TASK:
          setOpenWarningDeadlineModal(true);
          setDataRemind({
            count: data.remindCountdown as number,
            type: data.remindType as string,
            id: data.id as number,
            title: data.title as string,
          });
          break;
        case SocketActions.SKILL_LEVEL_UP_COMPLETED:
          setDataRewardSkill(data);
          setOpenRewardModal(true);
      }
    };

    socketEventEmitter.on('message', handleSocketMessage);

    return () => {
      socketEventEmitter.off('message', handleSocketMessage);
    };
  }, []);

  // Edit task
  const handleGetDataDetailTask = async (id: number) => {
    const { data: response } = await api.get(apiRouters.TASK_DETAIL(`${id}`));
    return response;
  };

  const { mutate: getDataDetailTask } = useMutation(
    'getDetailTask',
    handleGetDataDetailTask,
    {
      onSuccess: async (data) => {
        setDataTaskEdit(data);
        setShowModalTask(true);
      },
      onError: () => {
        handleRemoveParam();
        showToast({
          variant: 'error',
          description: ERROR_NOT_FOUND_TASK,
        });
      },
    },
  );

  useEffect(() => {
    if (
      isScheduleTeamPage &&
      actionType &&
      (typeDetail === ItemStartType.TASK ||
        typeDetail === ItemStartType.FIXED_TASK)
    ) {
      if (taskDetailId) {
        getDataDetailTask(parseInt(taskDetailId));
      } else {
        setShowModalTask(true);
      }
    } else if (
      actionType &&
      typeDetail === ItemStartType.FIXED_TASK &&
      isTaskTeamPage
    ) {
      if (taskDetailId) {
        getDataDetailTask(parseInt(taskDetailId));
      } else {
        setShowModalTask(true);
      }
    } else if (
      actionType &&
      (typeDetail === ItemStartType.TASK ||
        typeDetail === ItemStartType.FIXED_TASK) &&
      !isTaskPage
    ) {
      if (taskDetailId) {
        getDataDetailTask(parseInt(taskDetailId));
      } else {
        setShowModalTask(true);
      }
    } else {
      setShowModalTask(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    getDataDetailTask,
    setShowModalTask,
    taskDetailId,
    actionType,
    typeDetail,
  ]);
  useEffect(() => {
    if (pathname !== pageRouters.TASKS_MANAGEMENT.href) {
      setOrderingOptions({
        category_ids: [],
        tag_ids: [],
        organization_ids: [],
      });
    }
  }, [pathname]);

  const handleSetParam = ({
    id,
    action,
  }: {
    id: string | null;
    action: string;
  }) => {
    if (id) {
      paramsURL.set('task', id);
    }
    paramsURL.delete('event');
    paramsURL.delete('action');
    paramsURL.delete('type');
    paramsURL.set('action', action);
    paramsURL.set('type', ItemStartType.TASK);
    router.push(`?${paramsURL.toString()}`);
  };

  const handleRemoveParam = () => {
    paramsURL.delete('task');
    paramsURL.delete('action');
    paramsURL.delete('type');

    router.replace(`?${paramsURL.toString()}`);
    setShowModalTask(false);
  };
  const handleRemoveEventParam = () => {
    paramsURL.delete('event');
    paramsURL.delete('type');
    paramsURL.delete('action');
    router.replace(`?${paramsURL.toString()}`);
  };

  // Task
  //  Handle call api edit task
  const handleEditTask = async (data: TaskRequest) => {
    setIsLoading(true);
    return await api.patch(apiRouters.TASK_DETAIL(`${data.id}`), data);
  };
  const { mutate: editTask } = useMutation('postEditTask', handleEditTask, {
    onSuccess: async () => {
      handleRemoveParam();
      queryClient.refetchQueries(['getDataTaskHeaderList']);
      queryClient.refetchQueries(['getTaskHeaderStart']);
      if (isDailyReportPage) {
        queryClient.refetchQueries(['getDataStatistic']);
        queryClient.refetchQueries(['getDataStatisticPDF']);
      }
      if (
        isDailyReportTeamPage &&
        (teamId as string) == String(session?.user.id)
      ) {
        queryClient.refetchQueries(['getDataStatistic']);
        queryClient.refetchQueries(['getDataStatisticPDF']);
      }
      queryClient.refetchQueries(['getTaskDurationDetail']);

      showToast({
        description: SUCCESS_UPDATE_MESSAGE,
      });
      setDataTaskEdit(null);
      setShowModalTask(false);
      setPendingTaskData(null);
      setCloseAction(null);
      setOpenWarningDeadlineModal(false);
      setOpenConfirmDragModalForm(false);
      setDataConfirmRewardForm(null);
    },
    onError: (error: AxiosError<any>) => {
      if (error.response?.data.taskSchedules) {
        showErrorToast(error, ERROR_MESSAGE_OVERLAP_TASK);
      } else showErrorToast(error, ERROR_UPDATE_MESSAGE);
    },
    onSettled: () => {
      setTimeout(() => {
        setIsLoading(false);
      }, 500);
    },
  });
  //
  const handleEditTaskRemind = async (data: TaskRequest) => {
    return await api.patch(apiRouters.TASK_DETAIL(`${data.id}`), data);
  };

  const { mutate: editTaskRemind } = useMutation(
    'postEditTaskRemind',
    handleEditTaskRemind,
    {
      onSuccess: async () => {
        queryClient.refetchQueries(['getDataTaskHeaderList']);
        queryClient.refetchQueries(['getTaskHeaderStart']);
        if (isDailyReportPage) {
          queryClient.refetchQueries(['getDataStatistic']);
          queryClient.refetchQueries(['getDataStatisticPDF']);
        }
        if (
          isDailyReportTeamPage &&
          (teamId as string) == String(session?.user.id)
        ) {
          queryClient.refetchQueries(['getDataStatistic']);
          queryClient.refetchQueries(['getDataStatisticPDF']);
        }

        queryClient.refetchQueries(['getTaskDurationDetail']);
        setOpenWarningDeadlineModal(false);
      },
      onError: (error: AxiosError<any>) => {
        if (error.response?.data.taskSchedules) {
          showErrorToast(error, ERROR_MESSAGE_OVERLAP_TASK);
        } else showErrorToast(error, ERROR_UPDATE_MESSAGE);
      },
      onSettled: () => {},
    },
  );
  // Action call api edit task
  const handleConfirmEditTask = (data: TaskFormData) => {
    const tagIds = data.tagIds
      ? data.tagIds
          .filter((item) => item.value !== '')
          .map((item) => ({ tagId: item.value }))
      : [];

    const planList =
      data.plans &&
      data.plans.filter((item) => item.planStartDate !== null).length > 0
        ? data.plans
            .filter((item) => item.planStartDate !== null)
            .map((item) => {
              return {
                scheduleId: item.scheduleId || null,
                planStartDate:
                  item.planStartDate && item.planStartTime
                    ? addTimeToDate(
                        item.planStartDate as Date,
                        item.planStartTime,
                      )
                    : null,
                planEndDate:
                  item.planEndDate && item.planEndTime
                    ? addTimeToDate(item.planEndDate as Date, item.planEndTime)
                    : null,
              };
            })
        : null;
    const todoListData =
      data.todoList && data.todoList.filter((item) => item.content !== '');

    const newWorkCategories = [];
    if (data.categories.LARGE?.value) {
      newWorkCategories.push({
        categoryId:
          `${data.categories.LARGE.value}` == NO_SETTING
            ? null
            : `${data.categories.LARGE.value}`,
        type: EventWorkCategory.LARGE,
      });
    }
    if (data.categories.MEDIUM.value) {
      newWorkCategories.push({
        categoryId:
          `${data.categories.MEDIUM.value}` == NO_SETTING
            ? null
            : `${data.categories.MEDIUM.value}`,
        type: EventWorkCategory.MEDIUM,
      });
    }
    if (data.categories.SMALL.value) {
      newWorkCategories.push({
        categoryId:
          `${data.categories.SMALL.value}` == NO_SETTING
            ? null
            : `${data.categories.SMALL.value}`,
        type: EventWorkCategory.SMALL,
      });
    }
    editTask({
      id: data.id,
      title: data.title,
      statusId: data.statusId ? (data.statusId.value as number) : null,
      priority: data.priority ? data.priority.value.toString() : '',
      deadline:
        data.deadlineDate && data.deadlineTime
          ? addTimeToDate(data.deadlineDate as Date, data.deadlineTime)
          : data.deadlineDate && !data.deadlineTime
            ? formatDateServer(data.deadlineDate)
            : null,
      description: data.description,
      tagIds: tagIds,
      categoryIds: newWorkCategories,
      isImportant: data.isImportant,
      todoList: todoListData,
      taskSchedules: planList && planList.length ? planList : null,
      oldIdStatus: data.oldIdStatus,
      sendToChat: false,
      organizationId: data.organization
        ? Number(data.organization.value)
        : null,
      remindCountdown: data.deadlineRemindCountdown?.value
        ? `${data.deadlineRemindCountdown?.value}`
        : null,
      remindType: data.deadlineRemindType?.value
        ? `${data.deadlineRemindType?.value}`
        : null,
      repeatType:
        data.statusId?.value == StatusValueTask.MY_ROUTINE
          ? data.repeatType && data.repeatType.value
            ? String(data.repeatType.value)
            : null
          : null,
      repeatInterval:
        data.statusId?.value == StatusValueTask.MY_ROUTINE
          ? data.repeatInterval && data.repeatInterval.value
            ? Number(data.repeatInterval.value)
            : null
          : null,
      weekDay:
        data.statusId?.value == StatusValueTask.MY_ROUTINE
          ? data.weekDay != undefined && data.weekDay.label != ''
            ? Number(data.weekDay.value)
            : null
          : null,
      monthDay:
        data.statusId?.value == StatusValueTask.MY_ROUTINE
          ? data.monthDay && data.monthDay.value != ''
            ? Number(data.monthDay.value)
            : null
          : null,
      month:
        data.statusId?.value == StatusValueTask.MY_ROUTINE
          ? data.month && data.month.value != ''
            ? Number(data.month.value)
            : null
          : null,
      planStartDate:
        data.statusId?.value == StatusValueTask.MY_ROUTINE
          ? data.repeatStartTime
            ? addTimeToDate(new Date(), data.repeatStartTime)
            : null
          : null,
      planEndDate:
        data.statusId?.value == StatusValueTask.MY_ROUTINE
          ? data.repeatEndTime
            ? addTimeToDate(new Date(), data.repeatEndTime)
            : null
          : null,
      showDeadlineTime: data.showDeadlineTime,
    });
  };

  // Action delete
  const handleConfirmDeleteTask = () => {
    if (taskDetailId) {
      setIsLoading(true);
      deleteTask(taskDetailId);
      setDataTaskEdit(null);

      return;
    }
  };

  // Handle delete task
  const handleDeleteTask = async (id: string) => {
    const { data: response } = await api.delete(
      apiRouters.TASK_DETAIL(`${id}`),
    );
    return response;
  };

  const { mutate: deleteTask } = useMutation('deleteTask', handleDeleteTask, {
    onSuccess: async () => {
      setShowModalTask(false);
      handleRemoveParam();
      setDataTaskEdit(null);
      setIdEventDelete(taskDetailId as string);

      queryClient.refetchQueries(['getDataTaskHeaderList']);
      queryClient.refetchQueries(['getTaskHeaderStart']);
      if (isDailyReportPage) {
        queryClient.refetchQueries(['getDataStatistic']);
        queryClient.refetchQueries(['getDataStatisticPDF']);
      }
      if (
        isDailyReportTeamPage &&
        (teamId as string) == String(session?.user.id)
      ) {
        queryClient.refetchQueries(['getDataStatistic']);
        queryClient.refetchQueries(['getDataStatisticPDF']);
      }

      queryClient.refetchQueries(['getTaskDurationDetail']);
      showToast({
        description: SUCCESS_DELETE_MESSAGE,
      });
      setOpenConfirmDeleteModal(false);
    },
    onError: (error: AxiosError<any>) => {
      showErrorToast(error, ERROR_DELETE_MESSAGE);
      setIsLoading(false);
    },
    onSettled: () => {
      setTimeout(() => {
        setIsLoading(false);
      }, 500);
    },
  });

  //Event
  const handleGetDataDetailEvent = async (id: string) => {
    const { data: response } = await api.get(
      `${apiRouters.SCHEDULE_DETAIL(id)}?current_screen=${ScreenName.MY_TASK}`,
    );
    return response;
  };

  const { mutate: getDataDetailEvent } = useMutation(
    'getDetailEventCalendar',
    handleGetDataDetailEvent,
    {
      onSuccess: async (data) => {
        setOpenCreateEventModal(true);
        setDataEventEditLocal(data);
      },
      onError: (error: AxiosError) => {
        if (error.response?.status === ServerStatusCode.NOT_FOUND) {
          showToast({
            variant: 'error',
            description: ERROR_NOT_FOUND_EVENT,
          });
          handleRemoveEventParam();
        }
      },
      onSettled: () => {
        setIsLoading(false);
      },
    },
  );
  useEffect(() => {
    if (
      idEvent &&
      actionType &&
      typeDetail === ItemStartType.SCHEDULE &&
      (isTaskTeamPage || isScheduleTeamPage)
    ) {
      getDataDetailEvent(idEvent.replace('event', ''));
    } else if (
      idEvent &&
      actionType &&
      typeDetail === ItemStartType.SCHEDULE &&
      !isTaskPage &&
      !isCalendarPage
    ) {
      getDataDetailEvent(idEvent.replace('event', ''));
    } else {
      setOpenCreateEventModal(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getDataDetailEvent, idEvent, actionType]);

  const handleConfirmEditEventCalendar = (
    data: EventEditFormData,
    sendToChat: boolean,
  ) => {
    const newWorkCategories = [];
    const newTagIds: number[] = [];
    let newType = '';
    let newStartDate = null;
    let newEndDate = null;

    if (data.tagIds) {
      data.tagIds
        .filter((item) => `${item.value}` !== '')
        .map((item) => newTagIds.push(item.value as number));
    }
    if (data.largeCategory && data.largeCategory?.value !== 'undefined') {
      newWorkCategories.push({
        categoryId:
          `${data.largeCategory.value}` == NO_SETTING
            ? null
            : `${data.largeCategory.value}`,
        type: EventWorkCategory.LARGE,
      });
    }
    if (data.mediumCategory && data.mediumCategory?.value !== 'undefined') {
      newWorkCategories.push({
        categoryId:
          `${data.mediumCategory.value}` == NO_SETTING
            ? null
            : `${data.mediumCategory.value}`,
        type: EventWorkCategory.MEDIUM,
      });
    }
    if (data.type) {
      newType = (data.type as OptionDropdownType).value as string;
    }
    if (data.isAllDay) {
      newStartDate = addTimeToDate(
        (data.startDate as Date) || new Date(),
        DEFAULT_START_TIME,
      );
      newEndDate = addTimeToDate(
        (data.endDate as Date) || new Date(),
        DEFAULT_END_TIME,
      );
    } else {
      if (data.startTime) {
        newStartDate = addTimeToDate(
          (data.startDate as Date) || new Date(),
          data.startTime,
        );
      }
      if (data.endTime) {
        newEndDate = addTimeToDate(
          (data.endDate as Date) || new Date(),
          data.endTime,
        );
      }
    }

    setDataEventEdit({
      label: data.title || '',
      value: `${data.id}`,
    });
    editEventCalendar({
      id: data.id,
      title: data.title || '',
      startDate: newStartDate,
      endDate: newEndDate,
      isAllDay: data.isAllDay || false,
      tagIds: newTagIds,
      participantIds: data.participantIds || [],
      selectOrganizations: data.selectOrganizations || [],
      locationId: data.location
        ? String((data.location as OptionDropdownType).value)
        : '',
      memo: data.memo || '',
      type: newType,
      sendToChat,
      message: actionsEventMessage,
      categoryIds: newWorkCategories,
      repeatType:
        data.repeatType && (data.repeatType as OptionDropdownType).value
          ? String((data.repeatType as OptionDropdownType).value)
          : null,
      repeatInterval:
        data.repeatInterval && (data.repeatInterval as OptionDropdownType).value
          ? Number((data.repeatInterval as OptionDropdownType).value)
          : null,
      weekDay:
        data.weekDay && (data.weekDay as OptionDropdownType).label != ''
          ? Number((data.weekDay as OptionDropdownType).value)
          : null,
      monthDay:
        data.monthDay && (data.monthDay as OptionDropdownType).value != ''
          ? Number((data.monthDay as OptionDropdownType).value)
          : null,
      month:
        data.month && (data.month as OptionDropdownType).value != ''
          ? Number((data.month as OptionDropdownType).value)
          : null,
      recurringEventOption: eventActionType || EventActionType.THIS_EVENT,
    });
  };
  const handleEditEventCalendar = async (data: EventRequest) => {
    return await api.patch(
      apiRouters.SCHEDULE_DETAIL(`${`${data.id}`.replace('event', '')}`),
      data,
    );
  };

  const { mutate: editEventCalendar } = useMutation(
    'editEventCalendar',
    handleEditEventCalendar,
    {
      onSuccess: async () => {
        queryClient.refetchQueries(['getDataTaskHeaderList']);
        queryClient.refetchQueries(['getTaskHeaderStart']);
        if (isDailyReportPage) {
          queryClient.refetchQueries(['getDataStatistic']);
          queryClient.refetchQueries(['getDataStatisticPDF']);
        }
        if (
          isDailyReportTeamPage &&
          (teamId as string) == String(session?.user.id)
        ) {
          queryClient.refetchQueries(['getDataStatistic']);
          queryClient.refetchQueries(['getDataStatisticPDF']);
        }

        queryClient.refetchQueries(['getTaskDurationDetail']);

        handleRemoveEventParam();
        setOpenConfirmEditEventModal(false);
        setBackToEditing(false);
        setConfirmEventDataToEdit(undefined);
        setActionsEventMessage('');
        showToast({
          description: SUCCESS_UPDATE_MESSAGE,
        });
      },
      onError: (error: AxiosError<any>) => {
        showErrorToast(error, ERROR_UPDATE_MESSAGE);
      },
      onSettled: () => {
        setIsLoading(false);
        setDataEventEditLocal(undefined);
        setEventActionType(null);
      },
    },
  );

  const handleConfirmDeleteEventCalendar = (sendToChat: boolean) => {
    if (dataEventEdit) {
      deleteEventCalendar({ id: `${dataEventEdit.id}`, sendToChat });
      return;
    }
  };

  const handleDeleteEventCalendar = async (data: {
    id: string;
    sendToChat: boolean;
  }) => {
    const newId = data.id.replace('event', '');
    return await api.delete(
      `${apiRouters.SCHEDULE_DETAIL(newId)}?message=${actionsEventMessage}${eventActionType ? `&recurring_event_option=${eventActionType}` : ''}${data.sendToChat ? '&send_to_chat=true' : ''}`,
    );
  };
  const { mutate: deleteEventCalendar } = useMutation(
    'deleteEventCalendar',
    handleDeleteEventCalendar,
    {
      onSuccess: (data, task) => {
        queryClient.refetchQueries(['getDataTaskHeaderList']);
        queryClient.refetchQueries(['getTaskHeaderStart']);
        if (isDailyReportPage) {
          queryClient.refetchQueries(['getDataStatistic']);
          queryClient.refetchQueries(['getDataStatisticPDF']);
        }
        if (
          isDailyReportTeamPage &&
          (teamId as string) == String(session?.user.id)
        ) {
          queryClient.refetchQueries(['getDataStatistic']);
          queryClient.refetchQueries(['getDataStatisticPDF']);
        }

        queryClient.refetchQueries(['getTaskDurationDetail']);

        handleRemoveEventParam();
        setOpenConfirmDeleteEventModal(false);
        setConfirmEventDataToEdit(undefined);
        setBackToEditing(false);
        setActionsEventMessage('');

        setIdEventDelete(`${task.id}event`);
        showToast({
          description: SUCCESS_DELETE_MESSAGE,
        });
      },
      onError: (error: AxiosError<any>) => {
        showErrorToast(error, ERROR_DELETE_MESSAGE);
      },
      onSettled: () => {
        setIsLoading(false);
        setDataEventEditLocal(undefined);
        setEventActionType(null);
      },
    },
  );

  // Handle confirm remind
  const handleConfirmRemind = () => {
    editTaskRemind({
      remind_at: null,
      id: dataRemind?.id,
    });
  };

  const handleNavigateToNewPage = (href: string) => {
    if (href) {
      router.push(href);
    } else {
      queryClient.isFetching() == 0 && signOut();
    }
    setPendingPageChange(null);
  };

  // Handle edit profile
  const handleConfirmEditProfile = (data: UserProfileFormData) => {
    editProfile({
      profile: {
        fullName: data.fullName,
      },
      password: data.password !== '' ? data.password : null,
      id: data.id,
      avatar: data.avatar,
    });
  };

  const handleEditProfile = async (data: UserProfileFormRequest) => {
    setIsLoading(true);
    const formData = new FormData();
    if (data.password) formData.append('password', data.password);
    if (data.avatar) formData.append('avatar', data.avatar);
    formData.append('profile.fullName', data.profile.fullName);
    return await api.patch(
      `${apiRouters.USER_DETAIL(String(data.id))}?current_screen=my_profile`,
      formData,
    );
  };

  const { mutate: editProfile } = useMutation(
    'postEditProfile',
    handleEditProfile,
    {
      onSuccess: async () => {
        showToast({
          description: SUCCESS_UPDATE_MESSAGE,
        });
        setOpenEditProfileModal(false);
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['getAuthenticatedUser'] }),
          queryClient.invalidateQueries({ queryKey: ['getUserList'] }),
          queryClient.invalidateQueries({
            queryKey: ['getDashboardMemberList'],
          }),
          queryClient.invalidateQueries({
            queryKey: ['getCreationDataStatistic'],
          }),
          queryClient.invalidateQueries({
            queryKey: ['getCreationDataStatisticTeam'],
          }),
          queryClient.invalidateQueries({ queryKey: ['getTaskTeamList'] }),
        ]);
        setEditProfileErrorMessages({
          fullName: '',
          password: '',
        });
      },
      onError: (error: AxiosError<any>) => {
        if (Object.keys(error.response?.data || {}).length) {
          setEditProfileErrorMessages({
            fullName: error.response?.data?.profile?.fullName?.[0] || '',
            password: error.response?.data?.password?.[0] || '',
          });
        } else {
          showErrorToast(error, ERROR_UPDATE_MESSAGE);
        }
      },
      onSettled: () => {
        setIsLoading(false);
      },
    },
  );

  // Handle cancel reward popup
  const handleCancelReward = async () => {
    const { data: response } = await api.post(
      `${apiRouters.SAVE_SKILL_MAPS_LEVEL_UP_DRAFT(
        String(dataRewardSkill?.skill.id),
      )}?skill_map_level_id=${String(dataRewardSkill?.skillMapLevel)}`,
      {
        popup: false,
      },
    );
    return response;
  };

  const { mutate: cancelReward } = useMutation(
    'handleCancelRewardPopup',
    handleCancelReward,
    {
      onSuccess: () => {
        setOpenRewardModal(false);
      },
      onError: (error: AxiosError) => {
        showErrorToast(error, ERROR_SAVE_MESSAGE);
      },
      onSettled: () => {},
    },
  );

  return (
    <>
      <header
        className={`sticky 2xl:fixed top-0 z-30 bg-white w-full h-[76px]  p-3 flex justify-between item-center ${className}`}
        style={{ boxShadow: '0px 4px 8px 0px #1D2D3F0A' }}>
        <div className="flex gap-8 justify-between w-full">
          <div className="flex flex-grow items-center gap-8">
            <ImageRound
              onClick={() => router.push(pageRouters.MY_PAGE.href)}
              className="h-[50px] w-48 object-fill hover:cursor-pointer"
              src="/images/logo-full.svg"
              name="Logo full"
            />
            <TaskPageDataHeader />
          </div>
          <div className="flex items-center w-fit">
            <Popover className="relative">
              {({ open, close }) => (
                <>
                  <div className="flex gap-2 items-center">
                    <PopoverButton
                      className={`flex w-full px-3 py-2 items-center rounded-full focus:outline-none
                ${open ? 'text-primary ' : ''}
                `}>
                      {authenticatedUser && (
                        <CustomUserAvatar
                          avatarUrl={authenticatedUser?.avatar || ''}
                          avatarColor={authenticatedUser?.avatarColor || ''}
                          size={40}
                        />
                      )}
                    </PopoverButton>
                  </div>

                  <Transition
                    as={Fragment}
                    enter="transition ease-out duration-200"
                    enterFrom="opacity-0 translate-y-1"
                    enterTo="opacity-100 translate-y-0"
                    leave="transition ease-in duration-150"
                    leaveFrom="opacity-100 translate-y-0"
                    leaveTo="opacity-0 translate-y-1">
                    <PopoverPanel className="absolute right-0 z-10 w-fit transform">
                      <div className="overflow-hidden bg-[#5B6770] rounded-lg shadow-common py-1 w-[180px]">
                        <div className="relative flex flex-col gap-1 text-white text-[14px] font-medium">
                          {SETTING_MENU.map((item) =>
                            item.href ? (
                              <div
                                key={item.name}
                                className={`flex px-4 py-2 hover:bg-[#7D8A94] ${pathname == item.href && 'bg-[#7D8A94]'}`}
                                onClick={() => {
                                  if (item.disable) return;
                                  if (isChatFilesUploading) {
                                    setPendingPageChange(item.href as string);
                                    setShowWarningChatUploadingModal(true);
                                    close();
                                    return;
                                  }
                                  handleNavigateToNewPage(item.href as string);
                                  close();
                                }}>
                                <p>{item.name}</p>
                              </div>
                            ) : item.showModal ? (
                              <div
                                key={item.name}
                                onClick={() => {
                                  setOpenViewProfileModal(true);
                                  close();
                                }}
                                className="flex items-center justify-between px-4 py-2 hover:bg-[#7D8A94] hover:cursor-pointer">
                                <p>{item.name}</p>
                              </div>
                            ) : (
                              <div
                                key={item.name}
                                onClick={() => {
                                  if (isChatFilesUploading) {
                                    setPendingPageChange('');
                                    setShowWarningChatUploadingModal(true);
                                    close();
                                    return;
                                  }
                                  handleNavigateToNewPage('');
                                  close();
                                }}
                                className="flex items-center justify-between px-4 py-2 hover:bg-[#7D8A94] hover:cursor-pointer">
                                <p>{item.name}</p>
                              </div>
                            ),
                          )}
                        </div>
                      </div>
                    </PopoverPanel>
                  </Transition>
                </>
              )}
            </Popover>
            <Popover className="relative">
              {({ open, close }) => (
                <>
                  <div className="flex gap-2 items-center">
                    <PopoverButton
                      className={`flex w-full px-3 py-2 items-center rounded-full focus:outline-none
                ${open ? 'text-primary ' : ''}
                `}>
                      <ImageRound
                        className="w-10 h-10 hover:opacity-70"
                        src="/icons/company.svg"
                        border="full"
                        name="Company"
                      />
                    </PopoverButton>
                  </div>

                  {companyItems.filter((item) => item.companyMenu == true)
                    .length > 0 && (
                    <Transition
                      as={Fragment}
                      enter="transition ease-out duration-200"
                      enterFrom="opacity-0 translate-y-1"
                      enterTo="opacity-100 translate-y-0"
                      leave="transition ease-in duration-150"
                      leaveFrom="opacity-100 translate-y-0"
                      leaveTo="opacity-0 translate-y-1">
                      <PopoverPanel className="absolute right-[20px] z-10 w-fit transform">
                        <div className="overflow-hidden bg-[#5B6770] rounded-lg shadow-common py-1 w-[200px] px-[6px]">
                          <div className="relative flex flex-col gap-1 text-white text-[14px] font-medium">
                            {companyItems
                              .filter((item) => item.companyMenu == true)
                              .map((item) => (
                                <div
                                  key={item.name}
                                  className={`flex px-4 py-2 hover:bg-[#7D8A94] cursor-pointer rounded-md ${pathname == item.href && 'bg-[#7D8A94]'}`}
                                  onClick={() => {
                                    if (isChatFilesUploading) {
                                      setPendingPageChange(item.href as string);
                                      setShowWarningChatUploadingModal(true);
                                      close();
                                      return;
                                    }
                                    handleNavigateToNewPage(
                                      item.href as string,
                                    );
                                    close();
                                  }}>
                                  <p>{item.name}</p>
                                </div>
                              ))}
                          </div>
                        </div>
                      </PopoverPanel>
                    </Transition>
                  )}
                </>
              )}
            </Popover>
          </div>
        </div>
      </header>
      {openViewProfileModal && (
        <ViewProfileModal
          open={openViewProfileModal}
          onClose={() => {
            setOpenViewProfileModal(false);
          }}
          openEditModal={() => {
            setOpenViewProfileModal(false);
            setOpenEditProfileModal(true);
          }}
        />
      )}
      {openEditProfileModal && (
        <EditProfileModal
          open={openEditProfileModal}
          onClose={() => {
            setOpenEditProfileModal(false);
            setEditProfileErrorMessages({
              fullName: '',
              password: '',
            });
          }}
          onEdit={handleConfirmEditProfile}
          setOpenErrorUploadFileModal={setOpenErrorUploadFileModal}
          setEditProfileErrorMessages={setEditProfileErrorMessages}
          editProfileErrorMessages={editProfileErrorMessages}
          authenticatedUser={authenticatedUser}
        />
      )}
      {openErrorUploadFileModal && (
        <ErrorUploadFileValidationModal
          open={true}
          message={UPLOAD_AVATAR_FILE_MAXIMUM_SIZE}
          onClose={() => {
            setOpenErrorUploadFileModal(false);
          }}
        />
      )}
      {isShowModalTask && (
        <ActionsTaskModal
          open={isShowModalTask}
          type={typeDetail || ItemStartType.TASK}
          dataTask={dataTaskEdit}
          columnId={`${StatusValueTask.NOT_STARTED}`}
          action={actionType || ActionTask.CREATE}
          onClose={() => {
            handleRemoveParam();
          }}
          onWarning={({
            reset,
            resetDataCategoryOptions,
            taskData,
            action,
          }: {
            reset: () => void;
            resetDataCategoryOptions: () => void;
            taskData: TaskFormData;
            action: ActionTask;
          }) => {
            setResetFunctions({
              resetDataCategoryOptions,
              reset,
            });
            setPendingTaskData(taskData);
            setCloseAction(action);
            setOpenWarningCloseModal(true);
          }}
          onEdit={(values: TaskFormData) => {
            if (
              dataTaskEdit?.status?.id === StatusValueTask.COMPLETED &&
              values.statusId?.value !== StatusValueTask.COMPLETED
            ) {
              setDataConfirmRewardForm(values);
              setOpenConfirmDragModalForm(true);
            } else {
              handleConfirmEditTask(values);
            }
          }}
          onDelete={() => {
            setOpenConfirmDeleteModal(true);
          }}
        />
      )}
      {openWarningCloseModal && (
        <WarningCloseTaskModal
          open={openWarningCloseModal}
          onCloseByIcon={() => {
            setOpenWarningCloseModal(false);
          }}
          onClose={() => {
            setShowModalTask(false);
            setOpenWarningCloseModal(false);
            handleRemoveParam();
            setDataTaskEdit(null);
            setIsLoading(false);
            resetFunctions.resetDataCategoryOptions?.();
            resetFunctions.reset?.();
          }}
          onConfirm={() => {
            setOpenWarningCloseModal(false);
            if (closeAction == ActionTask.EDIT) {
              handleConfirmEditTask(pendingTaskData as TaskFormData);
            }
          }}
        />
      )}
      {openCreateEventModal && (
        <ActionsEventModal
          open={openCreateEventModal}
          dataEvent={dataEventEdit}
          action={ActionsEvent.EDIT}
          setIsEditingRepetitiveFields={setIsEditingRepetitiveFields}
          isEditDisabled={true}
          onClose={() => {
            handleRemoveEventParam();
            setDataEventEditLocal(undefined);
            setOpenCreateEventModal(false);
            setBackToEditing(false);
          }}
          onEdit={(data) => {
            setConfirmEventDataToEdit(data);
            setOpenCreateEventModal(false);
            if (
              String((data.repeatType as OptionDropdownType).value) !=
              TaskRepetitiveValue.ONCE
            ) {
              isEditingRepetitiveFields
                ? setEventActionType(EventActionType.THIS_AND_FOLLOWING_EVENTS)
                : setEventActionType(EventActionType.THIS_EVENT);
              setOpenEventActionTypeModal({
                status: true,
                type: ActionsEvent.EDIT,
                showThisEventOption: !isEditingRepetitiveFields,
              });
            } else {
              setOpenConfirmEditEventModal(true);
            }
          }}
          onDelete={(data) => {
            setConfirmEventDataToEdit(data);
            setOpenCreateEventModal(false);
            if (
              String((data.repeatType as OptionDropdownType).value) !=
              TaskRepetitiveValue.ONCE
            ) {
              setEventActionType(EventActionType.THIS_EVENT);
              setOpenEventActionTypeModal({
                status: true,
                type: ActionsEvent.DELETE,
                showThisEventOption: true,
              });
            } else {
              setOpenConfirmDeleteEventModal(true);
            }
          }}
          backToEditing={backToEditing}
        />
      )}
      {openEventActionTypeModal.status && openEventActionTypeModal.type && (
        <EventActionTypeModal
          open={openEventActionTypeModal.status}
          openEventActionTypeModal={openEventActionTypeModal}
          eventActionType={eventActionType}
          setEventActionType={setEventActionType}
          onCancel={() => {
            setOpenCreateEventModal(true);
            setOpenConfirmEditEventModal(false);
            setDataEventEditLocal(confirmEventDataToEdit);
            setBackToEditing(true);
            setActionsEventMessage('');
            setEventActionType(EventActionType.THIS_EVENT);
            setOpenEventActionTypeModal({
              status: false,
              type: null,
            });
          }}
          onConfirm={() => {
            setOpenEventActionTypeModal({
              status: false,
              type: null,
            });
            if (openEventActionTypeModal.type == ActionsEvent.EDIT) {
              setOpenConfirmEditEventModal(true);
            } else {
              setOpenConfirmDeleteEventModal(true);
            }
          }}
        />
      )}
      {openConfirmEditEventModal && (
        <ConfirmActionsEventModal
          open={openConfirmEditEventModal}
          type={ActionsEvent.EDIT}
          setActionsEventMessage={setActionsEventMessage}
          onSend={() => {
            setIsLoading(true);
            handleConfirmEditEventCalendar(
              confirmEventDataToEdit as EventEditFormData,
              true,
            );
          }}
          onRejectSend={() => {
            setIsLoading(true);
            handleConfirmEditEventCalendar(
              confirmEventDataToEdit as EventEditFormData,
              false,
            );
          }}
          onClose={() => {
            handleRemoveEventParam();
            setDataEventEditLocal(undefined);
            setConfirmEventDataToEdit(undefined);
            setOpenConfirmEditEventModal(false);
            setBackToEditing(false);
            setActionsEventMessage('');
          }}
          onBackToEditModal={() => {
            setOpenCreateEventModal(true);
            setOpenConfirmEditEventModal(false);
            setDataEventEditLocal(confirmEventDataToEdit);
            setBackToEditing(true);
            setActionsEventMessage('');
          }}
        />
      )}
      {openConfirmDeleteEventModal && (
        <ConfirmActionsEventModal
          open={openConfirmDeleteEventModal}
          type={ActionsEvent.DELETE}
          setActionsEventMessage={setActionsEventMessage}
          onSend={() => {
            setIsLoading(true);
            handleConfirmDeleteEventCalendar(true);
          }}
          onRejectSend={() => {
            setIsLoading(true);
            handleConfirmDeleteEventCalendar(false);
          }}
          onClose={() => {
            handleRemoveEventParam();
            setDataEventEditLocal(undefined);
            setConfirmEventDataToEdit(undefined);
            setOpenConfirmDeleteEventModal(false);
            setBackToEditing(false);
            setActionsEventMessage('');
          }}
          onBackToEditModal={() => {
            setOpenCreateEventModal(true);
            setOpenConfirmDeleteEventModal(false);
            setDataEventEditLocal(confirmEventDataToEdit);
            setBackToEditing(true);
            setActionsEventMessage('');
          }}
        />
      )}
      {openConfirmDeleteModal && (
        <ConfirmDeleteModal
          open={openConfirmDeleteModal}
          type="タスク"
          onConfirm={handleConfirmDeleteTask}
          onClose={() => {
            setOpenConfirmDeleteModal(false);
          }}
        />
      )}
      {openWarningDeadlineModal && (
        <WarningDeadlineTaskModal
          open={openWarningDeadlineModal}
          title={`${dataRemind?.title}`}
          remindCountdown={dataRemind?.count}
          remindType={
            dataRemind?.type
              ? TimeType[dataRemind?.type as keyof typeof TimeType]
              : ''
          }
          onConfirm={() => {
            handleConfirmRemind();
            handleSetParam({
              id: `${dataRemind?.id}`,
              action: ActionTask.EDIT,
            });
          }}
          onClose={handleConfirmRemind}
        />
      )}
      {showWarningChatUploadingModal && pendingPageChange != null && (
        <ChatWarningUploadingFilesModal
          open={showWarningChatUploadingModal}
          onClose={() => {
            setShowWarningChatUploadingModal(false);
          }}
          onConfirm={() => {
            setShowWarningChatUploadingModal(false);
            cancelUploadChatFiles();
            handleNavigateToNewPage(pendingPageChange);
          }}
        />
      )}
      {openConfirmDragModalForm && (
        <ConfirmDragModalTask
          open={openConfirmDragModalForm}
          onConfirm={() =>
            handleConfirmEditTask(dataConfirmRewardForm as TaskFormData)
          }
          onClose={() => {
            setOpenConfirmDragModalForm(false);
            setDataConfirmRewardForm(null);
          }}
        />
      )}
      {openRewardModal && (
        <CompletionRewardModal
          open={openRewardModal}
          dataRewardSkill={dataRewardSkill}
          onConfirm={() => {
            cancelReward();
            router.push(pageRouters.SKILL_MAP.href);
          }}
          onClose={cancelReward}
        />
      )}
    </>
  );
};
export default Header;
