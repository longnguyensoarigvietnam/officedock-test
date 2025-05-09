'use client';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import React, {
  ChangeEvent,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import Image from 'next/image';
import jaLocale from '@fullcalendar/core/locales/ja';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

import {
  useReactTable,
  getCoreRowModel,
  getExpandedRowModel,
  flexRender,
  ColumnDef,
  Row,
  getSortedRowModel,
  SortingState,
} from '@tanstack/react-table';
import { EventContentArg } from '@fullcalendar/core/index.js';
import { useMutation } from 'react-query';
import { useSession } from 'next-auth/react';
import { AxiosError } from 'axios';

import Button from '@components/common/Button';
import DatePicker from '@components/common/DatePicker';
import ImageRound from '@components/common/ImageRound';
import PieChart from '@components/common/Chart/PieChart';
import { Table, TableBody } from '@components/common/Table';
import socketEventEmitter from '@components/socket/socketEventEmitter';
import Input from '@components/common/Input';
import ActionDetailDaily from '@components/daily/ActionDetailDaily';
import SingleSelect from '@components/common/SingleSelect';
import ResizeTextArea from '@components/custom/resizeTextArea';
import Dropdown from '@components/common/Dropdown';
import DetailActualItemDailyModal from '@components/daily/DetailActualItemDailyModal';
import TaskDailyCard from '../../../../components/daily/taskDailyCard';

import {
  EventCalendarType,
  EventWorkCategory,
  PermissionsSystem,
  ScreenName,
  SocketActions,
  StatusValueTask,
} from '@constants/enums';
import { DATE_TEXT_FORMAT, NO_OPTION_CATEGORY } from '@constants';

import { apiRouters, pageRouters } from '@constants/routers';
import {
  ERROR_DELETE_MESSAGE,
  ERROR_UPDATE_MESSAGE,
  SUCCESS_DELETE_MESSAGE,
} from '@constants/message';

import './../styles/daily-report.css';
import useDataStatistic from '@hooks/useDataStatistic';
import useCreationDataTask from '@hooks/useCreationDataTask';
import { useErrorToast } from '@hooks/useErrorToast';

import {
  ChildTask,
  DataActualDetail,
  dataTaskDaily,
  dataTaskDailyTable,
  dataTotalCategory,
  DataUserDetailDailyType,
  LargeCategory,
  MediumCategory,
  OrganizationCategories,
  SmallCategory,
  TaskTimeStatistic,
} from '@interfaces/statistic';
import { WebSocketMessageData } from '@interfaces/chat';
import { OptionDropdownType } from '@interfaces/common';
import {
  calculateActualDurationDaily,
  combineDateAndTime,
  convertToJapaneseTime,
  convertToJapaneseValue,
  convertToMinutesNumber,
  formatCurrentDay,
  formatDateServer,
  formatShowDateJapanese,
  formatTimeInput,
  isTimeEarlier,
  isTodaySchedule,
  isYesterdaySchedule,
} from '@utils/date';
import {
  adjustPositionForViewportSchedule,
  hasPermissionInArray,
  transformDataTaskDailyToTable,
} from '@utils';
import { useWebSocket } from '@providers/WebSocketProvider';
import { LoadingContext } from '@providers/LoadingProvider';
import { useToast } from '@providers/ToastProvider';
import api from '@base/api';
import Checkbox from '@components/common/Checkbox';
import { GlobalStateContext } from '@providers/GlobalStateProvider';
import Link from 'next/link';
import CustomUserAvatar from '@components/common/AvatarIcon/CustomUserAvatar';
import { TeamDailyStateContext } from '@providers/TeamDailyReportProvider';

const DailyReportDetailBoard = () => {
  const { dashboardMembersWithAvatars } = useContext(GlobalStateContext);

  const calendarRef = useRef<FullCalendar | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  const params = useParams();
  const userId = params.id;
  const router = useRouter();

  const searchParams = useSearchParams();

  const organization = searchParams.get('organization');

  const calendarDownloadRef = useRef<FullCalendar | null>(null);

  const socket = useWebSocket();

  const { data: session } = useSession();

  const { showToast } = useToast();

  const { setIsLoading } = useContext(LoadingContext);
  const { dataDatePicker, setDataDatePicker } = useContext(
    TeamDailyStateContext,
  );
  const showErrorToast = useErrorToast();

  const [dataDetailUser, setDataDetailUser] =
    useState<DataUserDetailDailyType | null>(null);

  const [remarkData, setRemarkData] = useState<string>('');

  const { dataStatistic, refetchDataStatistic } = useDataStatistic({
    date: formatDateServer(dataDatePicker),
    userId: `${userId}`,
    organizationId: `${organization}`,
    onError: () => {
      router.back();
    },
  });

  const [taskTimeStatisticList, setTaskTimeStatisticList] = useState<
    TaskTimeStatistic[]
  >([]);

  const [dataOrganizationCategories, setDataOrganizationCategories] = useState<
    OrganizationCategories | undefined
  >(undefined);

  const [popoverInfo, setPopoverInfo] = useState<DataActualDetail | null>(null);

  const { creationDataTaskData } = useCreationDataTask({});

  const [chartData, setChartData] = useState<{
    colors: string[];
    labels: string[];
    data: number[];
    actualValue: string[];
  }>();
  const [dataCategory, setDataCategory] = useState<dataTotalCategory[]>([]);

  const [dataTagsList, setDataTagsList] = useState<OptionDropdownType[]>([]);
  const [dataTaskDailyList, setDataTaskDailyList] = useState<
    dataTaskDailyTable[]
  >([]);

  const memberInfo = dashboardMembersWithAvatars.find(
    (member) => member.id == userId,
  );

  const handleShowEventsInModal = (data: {
    uuid: string;
    largeColor?: string;
    start: string;
    end: string;
    title: string;
    eventList: any[];
    clientX: number;
    clientY: number;
  }) => {
    setPopoverInfo({
      uuid: data.uuid,
      largeColor: data.largeColor ? data.largeColor : '',
      title: data.title,
      end: data.end,
      start: data.start,
      left: adjustPositionForViewportSchedule({
        top: Number(data.clientY),
        left: Number(data.clientX),
      }).left,
      top: adjustPositionForViewportSchedule({
        top: Number(data.clientY),
        left: Number(data.clientX),
      }).top,
    });
  };
  const handleEventClick = (clickInfo?: any) => {
    handleShowEventsInModal({
      title: clickInfo.event.title,
      largeColor: clickInfo.event.extendedProps.largeColor
        ? clickInfo.event.extendedProps.largeColor
        : '',
      uuid: clickInfo.event.extendedProps.uuid
        ? clickInfo.event.extendedProps.uuid
        : '',
      start: clickInfo.event.start,
      end: clickInfo.event.end,
      eventList: taskTimeStatisticList,
      clientX: clickInfo.jsEvent.clientX,
      clientY: clickInfo.jsEvent.clientY,
    });
  };

  const createTaskDurationItems = (tasks: dataTaskDaily[]) => {
    return tasks.flatMap((task) =>
      task.taskDurations.map((duration) => ({
        id: `${duration.id}`,
        uuid: duration.uuid,
        title: task.title ? task.title : '',
        startedAt: duration.startedAt
          ? new Date(duration.startedAt)
          : new Date(),
        pausedAt: duration.pausedAt
          ? new Date(duration.pausedAt)
          : dataDatePicker,
        start: new Date(duration.startedAt),
        end: duration.pausedAt ? new Date(duration.pausedAt) : new Date(),
        largeColor:
          task.categories &&
          task.categories.find((item) => item.type === EventWorkCategory.LARGE)
            ?.color
            ? task.categories.find(
                (item) => item.type === EventWorkCategory.LARGE,
              )?.color
            : '#83919E',
      })),
    );
  };

  useEffect(() => {
    if (creationDataTaskData) {
      setDataTagsList(
        creationDataTaskData.tags.map((org) => ({
          label: String(org.name),
          value: String(org.id),
        })),
      );
    }
  }, [creationDataTaskData]);

  useEffect(() => {
    if (dataStatistic) {
      // Generate color

      // Add color for item
      const dataAddColor = dataStatistic.categories.map((item) => ({
        color: item.categoryColor,
        categoryName: item.categoryName ? item.categoryName : '未設定',
        duration: item.duration,
        percent: item.percent,
      }));

      // Color chart
      const listColor = dataStatistic.categories
        .filter((data) => data.categoryColor)
        .map((item) => item.categoryColor);

      // Get list label
      const listLableChart = dataStatistic.categories.map(
        (item) => item.categoryName || '未設定',
      );

      // Get list value
      const listValueChart = dataStatistic.categories.map(
        (item) => item.percent,
      );

      // Get list value
      const listValueActualChart = dataStatistic.categories.map((item) =>
        convertToJapaneseTime(item.duration),
      );

      const dataTaskResult = transformDataTaskDailyToTable(dataStatistic.tasks);

      const taskDurationItems = createTaskDurationItems(dataStatistic.tasks);

      setDataOrganizationCategories(dataStatistic.organizationCategories);

      setDataCategory(dataAddColor);
      setDataTaskDailyList(dataTaskResult);
      setRemarkData(
        dataStatistic?.remark.remark ? dataStatistic?.remark.remark : '',
      );
      setDataDetailUser({
        id: dataStatistic.remark.user.id,
        fullName: dataStatistic.remark.user.profile.fullName,
        isConfirmed: dataStatistic?.remark.isConfirmed,
        totalDuration: dataStatistic.totalDuration,
        organizationName: dataStatistic?.remark.organizationName,
      });

      setChartData({
        colors: listColor,
        labels: listLableChart,
        data: listValueChart,
        actualValue: listValueActualChart,
      });

      setTaskTimeStatisticList(taskDurationItems);
    }
  }, [dataStatistic]);

  //  Handle call api edit duration
  const handleEditDuration = async (data: {
    id: string;
    startedAt?: string;
    pausedAt?: string;
    taskId?: number;
    oldStartAt?: string;
    oldEndAt?: string;
    scheduleId?: number;
  }) => {
    setIsLoading(true);
    return await api.patch(
      apiRouters.ACTUAL_DURATION_DETAIL(parseInt(data.id)),
      data,
    );
  };
  const { mutate: editDurationTask } = useMutation(
    'postEditDurationTask',
    handleEditDuration,
    {
      onSuccess: async () => {
        refetchDataStatistic();
      },
      onError: (data, variant) => {
        if (variant.pausedAt) {
          handleResetEndTime(`${variant.oldEndAt}`, variant.id);
        }
        if (variant.startedAt) {
          handleResetStartTime(variant.startedAt, variant.id);
        }

        setIsLoading(false);
        showToast({
          variant: 'error',
          description: ERROR_UPDATE_MESSAGE,
        });
        refetchDataStatistic();
      },
      onSettled: () => {},
    },
  );

  //  Handle call api edit task
  const handleEditCategoryInline = async (dataTask: {
    id: string;
    categoryIds: {
      categoryId: number | null;
      type: string;
    }[];
  }) => {
    setIsLoading(true);

    const { data } = await api.patch(
      `${apiRouters.TASK_DETAIL(`${dataTask.id}`)}?current_screen=${ScreenName.STATISTIC}`,
      dataTask,
    );
    return data;
  };
  const { mutate: editCategoryInline } = useMutation(
    'postEditCategoryTaskInline',
    handleEditCategoryInline,
    {
      onSuccess: async () => {
        refetchDataStatistic();
      },
      onError: (error: AxiosError<any>) => {
        setIsLoading(false);
        showErrorToast(error, ERROR_UPDATE_MESSAGE);
      },
      onSettled: () => {},
    },
  );

  //  Handle call api edit Event
  const handleEditEventCategoryInline = async (dataTask: {
    id: string;
    categoryIds: {
      categoryId: number | null;
      type: string;
    }[];
  }) => {
    setIsLoading(true);

    const { data } = await api.patch(
      `${apiRouters.SCHEDULE_DETAIL(`${dataTask.id}`)}?current_screen=${ScreenName.STATISTIC}`,
      dataTask,
    );
    return data;
  };
  const { mutate: editCategoryEventInline } = useMutation(
    'postEditCategoryEventInline',
    handleEditEventCategoryInline,
    {
      onSuccess: async () => {
        refetchDataStatistic();
      },
      onError: (error: AxiosError<any>) => {
        setIsLoading(false);
        showErrorToast(error, ERROR_UPDATE_MESSAGE);
      },
      onSettled: () => {},
    },
  );

  // Handle delete Actual task
  const handleDeleteActualTask = async (uuid: string) => {
    const { data: response } = await api.delete(
      apiRouters.UPDATE_TASK_ACTUAL(uuid),
    );
    return response;
  };

  const { mutate: deleteActualTask } = useMutation(
    'deleteActualTask',
    handleDeleteActualTask,
    {
      onSuccess: async () => {
        setPopoverInfo(null);
        showToast({
          description: SUCCESS_DELETE_MESSAGE,
        });
        refetchDataStatistic();
      },
      onError: (error: AxiosError<any>) => {
        showErrorToast(error, ERROR_DELETE_MESSAGE);
      },
      onSettled: () => {},
    },
  );

  //  Handle call api confirm user daily
  const handleActionConfirmUserDaily = async (dataUser: {
    id: number;
    isConfirmed: boolean;
    categoryId: number;
  }) => {
    const { data } = await api.post(
      `${apiRouters.CONFIRM_USER_DAILY(dataUser.id)}`,
      {
        isConfirmed: dataUser.isConfirmed,
        date: formatDateServer(dataDatePicker),
      },
    );
    return data;
  };
  const { mutate: confirmUserDaily } = useMutation(
    'postConfirmUserDaily',
    handleActionConfirmUserDaily,
    {
      onSuccess: async (data, request) => {
        setDataDetailUser((prev) => {
          if (!prev) {
            return null;
          }
          return { ...prev, isConfirmed: request.isConfirmed };
        });
      },
      onError: () => {},
      onSettled: () => {},
    },
  );

  // Update real-time status task
  const handleUpdateStatus = useCallback(
    (data?: { id: number; status: { id: number; name: string } }) => {
      if (data) {
        const updatedTasks = dataTaskDailyList.map((task) => {
          if (`${task.id}` === `${data.id}`) {
            const updatedChildren = task.children?.map((child) => ({
              ...child,
              status: {
                id: data.status.id,
                name: data.status.name,
              },
            }));

            return {
              ...task,
              status: {
                id: data.status.id,
                name: data.status.name,
              },
              children: updatedChildren,
            };
          } else {
            return task;
          }
        });
        setDataTaskDailyList(updatedTasks);
      }
    },
    [dataTaskDailyList],
  );

  // Socket
  useEffect(() => {
    // Create WebSocket
    const handleSocketMessage = (data: WebSocketMessageData) => {
      switch (data.action) {
        case SocketActions.CHANGE_TASK_STATUS:
          handleUpdateStatus(data.task);
          break;

        default:
          break;
      }
    };
    socketEventEmitter.on('message', handleSocketMessage);

    return () => {
      socketEventEmitter.off('message', handleSocketMessage);
    };
  }, [handleUpdateStatus, socket]);

  const handleChangeStartTime = (
    e: ChangeEvent<HTMLInputElement>,
    id: string,
    taskId: number,
    typeAction: string,
    startedAt?: string,
  ): void => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 4) {
      value = value.substring(0, 4);
    }
    const updatedTasks = dataTaskDailyList.map((task) => {
      let updatedTask =
        `${task.idEdit}` === `${id}`
          ? {
              ...task,
              startedAt: formatTimeInput(`${convertToMinutesNumber(value)}`),
            }
          : task;

      const updatedChildren = updatedTask.children?.map((child) =>
        `${child.idEdit}` === `${id}`
          ? {
              ...child,
              startedAt: formatTimeInput(`${convertToMinutesNumber(value)}`),
            }
          : child,
      );
      if (updatedChildren) {
        updatedTask = { ...updatedTask, children: updatedChildren };
      }

      return updatedTask;
    });
    if (typeAction === EventCalendarType.TASK) {
      editDurationTask({
        id: id,
        taskId: taskId,
        startedAt: combineDateAndTime(
          dataDatePicker,
          `${formatTimeInput(`${convertToMinutesNumber(value)}`)}`,
        ),
        oldStartAt: `${startedAt}`,
      });
    } else {
      editDurationTask({
        id: id,
        scheduleId: taskId,
        startedAt: combineDateAndTime(
          dataDatePicker,
          `${formatTimeInput(`${convertToMinutesNumber(value)}`)}`,
        ),
        oldStartAt: `${startedAt}`,
      });
    }
    setDataTaskDailyList(updatedTasks);
  };
  const handleChangeEndTime = (
    e: ChangeEvent<HTMLInputElement>,
    id: string,
    taskId: number,
    type: string,
    endTimeAt: string,
  ): void => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 4) {
      value = value.substring(0, 4);
    }
    const updatedTasks = dataTaskDailyList.map((task) => {
      let updatedTask =
        `${task.idEdit}` === `${id}`
          ? {
              ...task,
              pausedAt: formatTimeInput(`${convertToMinutesNumber(value)}`),
            }
          : task;

      const updatedChildren = updatedTask.children?.map((child) =>
        `${child.idEdit}` === `${id}`
          ? {
              ...child,
              pausedAt: formatTimeInput(`${convertToMinutesNumber(value)}`),
            }
          : child,
      );
      if (updatedChildren) {
        updatedTask = { ...updatedTask, children: updatedChildren };
      }

      return updatedTask;
    });

    if (type === EventCalendarType.TASK) {
      editDurationTask({
        id: id,
        pausedAt: combineDateAndTime(
          dataDatePicker,
          `${formatTimeInput(`${convertToMinutesNumber(value)}`)}`,
        ),
        taskId: taskId,
        oldEndAt: endTimeAt,
      });
    } else {
      editDurationTask({
        id: id,
        pausedAt: combineDateAndTime(
          dataDatePicker,
          `${formatTimeInput(`${convertToMinutesNumber(value)}`)}`,
        ),
        scheduleId: taskId,
        oldEndAt: endTimeAt,
      });
    }
    setDataTaskDailyList(updatedTasks);
  };

  const handleResetStartTime = (date: string, id: string) => {
    const updatedTasks = dataTaskDailyList.map((task) => {
      const updatedTask =
        `${task.idEdit}` === `${id}` ? { ...task, pas: date } : task;

      return updatedTask;
    });
    setDataTaskDailyList(updatedTasks);
  };

  const handleResetEndTime = (date: string, id: string) => {
    const updatedTasks = dataTaskDailyList.map((task) => {
      const updatedTask =
        `${task.idEdit}` === `${id}` ? { ...task, pausedAt: date } : task;

      return updatedTask;
    });
    setDataTaskDailyList(updatedTasks);
  };

  const parseDurationToSeconds = (duration: string) => {
    const [hours, minutes, seconds] = duration.split(':').map(Number);
    return hours * 3600 + minutes * 60 + seconds;
  };

  // Actions sort duration
  const sortDuration = (firstRow: any, secondRow: any) => {
    const durationFirstRow = parseDurationToSeconds(
      firstRow.getValue('totalDuration'),
    );
    const durationSecondRow = parseDurationToSeconds(
      secondRow.getValue('totalDuration'),
    );
    return durationFirstRow - durationSecondRow;
  };
  // Actions sort status
  const sortStatusById = (firstRow: any, secondRow: any) => {
    const statusFirstRow =
      firstRow.original.status && firstRow.original.status.id;
    const statusSecondRow =
      secondRow.original.status && secondRow.original.status.id;

    if (statusFirstRow === StatusValueTask.MY_ROUTINE) return -1;
    if (statusSecondRow === StatusValueTask.MY_ROUTINE) return 1;

    return statusFirstRow - statusSecondRow;
  };
  const [sortState, setSortState] = useState<SortingState>([]);
  const [expandedState, setExpandedState] = useState<any>();

  const isPermissionAction =
    (session?.user.permissions &&
      hasPermissionInArray(
        session?.user.permissions,
        PermissionsSystem.TEAM_DAILY_REPORT_UPDATE,
      )) ||
    (session?.user.permissions &&
      hasPermissionInArray(
        session?.user.permissions,
        PermissionsSystem.TEAM_DAILY_REPORT_ADD,
      ));
  const handleExpandChange = (row: Row<dataTaskDailyTable>) => {
    const newExpandedState: any = {
      ...expandedState,
      [row.id]: !row.getIsExpanded(),
    };
    setExpandedState(newExpandedState);
  };

  function getLargeCategories(data: LargeCategory[]): OptionDropdownType[] {
    const largeCategories: OptionDropdownType[] = data
      .filter((category) => category.LARGE)
      .map((category) => ({
        label: category.LARGE.name,
        value: category.LARGE.id,
      }));

    return largeCategories;
  }
  function getMediumCategories(data: MediumCategory[]): OptionDropdownType[] {
    const mediumCategories: OptionDropdownType[] = data
      .filter((category) => category.MEDIUM)
      .map((category) => ({
        label: category.MEDIUM ? category.MEDIUM.name : '',
        value: category.MEDIUM ? category.MEDIUM.id : '',
      }));

    return mediumCategories;
  }
  function getSmallCategories(data: SmallCategory[]): OptionDropdownType[] {
    const smallCategories: OptionDropdownType[] = data.map((category) => ({
      label: category.name,
      value: category.id,
    }));

    return smallCategories;
  }

  const columns: ColumnDef<dataTaskDailyTable>[] = [
    {
      id: 'expand',
      header: 'タスク名',
      size: 20,
      cell: () => <></>,
    },
    {
      accessorKey: 'LARGE',
      header: '',
      cell: (info) => {
        const organizationKey = info.row.original.organization?.toString();
        const organizationCategory =
          organizationKey && dataOrganizationCategories
            ? dataOrganizationCategories[organizationKey]
            : undefined;
        const optionData = [
          {
            label: NO_OPTION_CATEGORY,
            value: NO_OPTION_CATEGORY,
          },
          ...getLargeCategories(organizationCategory ?? []),
        ];
        const isParent = info.row.depth === 0;
        if (!isParent) return;

        const isHasChild =
          info.row.original.children && info.row.original.children?.length > 1;

        return (
          <div
            className={`daily-custom text-left custom-statistic  h-[30px] mt-[12px] ${isHasChild && '!mt-[19px]  mb-[18px]'}`}>
            <div className="flex justify-between h-full relative rounded-md gap-1">
              <SingleSelect
                className="border-none shadow-none min-w-[162px] h-[30px] bg-[#EBF1F7] rounded-md"
                defaultValue={optionData.find(
                  (element) =>
                    element.value ===
                    (info.row.original.LARGE.id
                      ? info.row.original.LARGE.id
                      : NO_OPTION_CATEGORY),
                )}
                isDisabled={!isPermissionAction}
                placeholder=""
                showArrow
                options={optionData}
                onChange={(e) => {
                  if (info.row.original.type === EventCalendarType.TASK) {
                    editCategoryInline({
                      id: info.row.original.id,
                      categoryIds: [
                        {
                          categoryId:
                            e?.value == NO_OPTION_CATEGORY
                              ? null
                              : (e?.value as number),
                          type: EventWorkCategory.LARGE,
                        },
                        {
                          categoryId: null,
                          type: EventWorkCategory.MEDIUM,
                        },
                        {
                          categoryId: null,
                          type: EventWorkCategory.SMALL,
                        },
                      ],
                    });
                  } else {
                    editCategoryEventInline({
                      id: info.row.original.id,
                      categoryIds: [
                        {
                          categoryId:
                            e?.value == NO_OPTION_CATEGORY
                              ? null
                              : (e?.value as number),
                          type: EventWorkCategory.LARGE,
                        },
                        {
                          categoryId: null,
                          type: EventWorkCategory.MEDIUM,
                        },
                        {
                          categoryId: null,
                          type: EventWorkCategory.SMALL,
                        },
                      ],
                    });
                  }
                }}
              />
              <div className="flex items-center  w-3 h-[30px]">
                <ImageRound
                  className={`w-fit h-fit `}
                  src="/icons/play-statistic.svg"
                  name="icon chevron right"
                />
              </div>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'MEDIUM',
      header: '',
      cell: (info) => {
        const organizationKey = info.row.original.organization?.toString();
        const organizationCategory =
          organizationKey && dataOrganizationCategories
            ? dataOrganizationCategories[organizationKey]
            : undefined;

        const result =
          organizationCategory && info.row.original.LARGE.id !== ''
            ? organizationCategory
                .filter(
                  (largeCategory) =>
                    largeCategory.LARGE &&
                    largeCategory.LARGE.id === info.row.original.LARGE.id,
                )
                .flatMap((largeCategory) => largeCategory.MEDIUM)
            : organizationCategory &&
                info.row.original.LARGE.id === '' &&
                organizationCategory.filter(
                  (largeCategory) => largeCategory.LARGE === null,
                )
              ? organizationCategory
                  .filter((largeCategory) => largeCategory.LARGE == null)
                  .flatMap((largeCategory) => largeCategory.MEDIUM)
              : [];

        const optionMedium =
          info.row.original.LARGE.id !== ''
            ? [
                {
                  label: NO_OPTION_CATEGORY,
                  value: NO_OPTION_CATEGORY,
                },
                ...getMediumCategories(result),
              ]
            : info.row.original.MEDIUM.id !== ''
              ? [
                  {
                    label: NO_OPTION_CATEGORY,
                    value: NO_OPTION_CATEGORY,
                  },
                  {
                    value: info.row.original.MEDIUM.id,
                    label: info.row.original.MEDIUM.name,
                  },
                ]
              : [
                  {
                    label: NO_OPTION_CATEGORY,
                    value: NO_OPTION_CATEGORY,
                  },
                ];
        const isParent = info.row.depth === 0;
        if (!isParent) return;
        const isHasChild =
          info.row.original.children && info.row.original.children?.length > 1;

        return (
          <div
            className={`daily-custom text-left custom-statistic mt-[12px] ${isHasChild && '!mt-[19px] mb-[18px]'}`}>
            <div className="flex justify-between h-full relative  rounded-md gap-1">
              <div className="">
                <SingleSelect
                  className="border-none h-6 text-xs min-w-[162px]  rounded-md  !py-0  !pl-0 !shadow-none !text-left bg-[#EBF1F7]"
                  defaultValue={optionMedium.find(
                    (element) =>
                      element.value ===
                      (info.row.original.MEDIUM.id
                        ? info.row.original.MEDIUM.id
                        : NO_OPTION_CATEGORY),
                  )}
                  showArrow
                  isDisabled={!isPermissionAction}
                  placeholder=""
                  options={optionMedium}
                  onChange={(e) => {
                    if (info.row.original.type === EventCalendarType.TASK) {
                      editCategoryInline({
                        id: info.row.original.id,
                        categoryIds: [
                          {
                            categoryId:
                              e?.value == NO_OPTION_CATEGORY
                                ? null
                                : (e?.value as number),
                            type: EventWorkCategory.MEDIUM,
                          },
                          {
                            categoryId:
                              info.row.original.LARGE.id == NO_OPTION_CATEGORY
                                ? null
                                : (info.row.original.LARGE.id as number),
                            type: EventWorkCategory.LARGE,
                          },
                          {
                            categoryId: null,
                            type: EventWorkCategory.SMALL,
                          },
                        ],
                      });
                    } else {
                      editCategoryEventInline({
                        id: info.row.original.id,
                        categoryIds: [
                          {
                            categoryId:
                              e?.value == NO_OPTION_CATEGORY
                                ? null
                                : (e?.value as number),
                            type: EventWorkCategory.MEDIUM,
                          },
                          {
                            categoryId:
                              info.row.original.LARGE.id == NO_OPTION_CATEGORY
                                ? null
                                : (info.row.original.LARGE.id as number),
                            type: EventWorkCategory.LARGE,
                          },
                          {
                            categoryId: null,
                            type: EventWorkCategory.SMALL,
                          },
                        ],
                      });
                    }
                  }}
                />
              </div>
              <div className="flex items-center  w-3 h-[30px]">
                <ImageRound
                  className={`w-fit h-fit `}
                  src="/icons/play-statistic.svg"
                  name="icon chevron right"
                />
              </div>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'SMALL',
      header: '',
      cell: (info) => {
        const organizationKey = info.row.original.organization?.toString();
        const organizationCategory =
          organizationKey && dataOrganizationCategories
            ? dataOrganizationCategories[organizationKey]
            : undefined;
        const result =
          organizationCategory && info.row.original.LARGE.id !== ''
            ? organizationCategory
                .filter(
                  (largeCategory) =>
                    largeCategory.LARGE &&
                    largeCategory.LARGE.id === info.row.original.LARGE.id,
                )
                .flatMap((largeCategory) => largeCategory.MEDIUM)
            : organizationCategory &&
                info.row.original.LARGE.id === '' &&
                organizationCategory.filter(
                  (largeCategory) => largeCategory.LARGE === null,
                )
              ? organizationCategory
                  .filter((largeCategory) => largeCategory.LARGE == null)
                  .flatMap((largeCategory) => largeCategory.MEDIUM)
              : [];

        const smallResult =
          info.row.original.MEDIUM.id !== '' && Array.isArray(result)
            ? result.flatMap((mediumCategory) =>
                Array.isArray(mediumCategory.SMALL)
                  ? mediumCategory.SMALL.filter(
                      () =>
                        mediumCategory.MEDIUM?.id ===
                        info.row.original.MEDIUM.id,
                    )
                  : [],
              )
            : info.row.original.MEDIUM.id === '' && Array.isArray(result)
              ? result.flatMap((mediumCategory) =>
                  Array.isArray(mediumCategory.SMALL)
                    ? mediumCategory.SMALL.filter(
                        () => mediumCategory.MEDIUM === null,
                      )
                    : [],
                )
              : [];
        const optionSmall =
          info.row.original.MEDIUM.id !== ''
            ? [
                {
                  label: NO_OPTION_CATEGORY,
                  value: NO_OPTION_CATEGORY,
                },
                ...getSmallCategories(smallResult),
              ]
            : info.row.original.SMALL.id !== ''
              ? [
                  {
                    label: NO_OPTION_CATEGORY,
                    value: NO_OPTION_CATEGORY,
                  },
                  ...getSmallCategories(smallResult),
                ]
              : [
                  {
                    label: NO_OPTION_CATEGORY,
                    value: NO_OPTION_CATEGORY,
                  },
                  ...getSmallCategories(smallResult),
                ];
        const isParent = info.row.depth === 0;
        if (!isParent) return;
        const isHasChild =
          info.row.original.children && info.row.original.children?.length > 1;

        return (
          <div
            className={`daily-custom text-left custom-statistic mt-[12px] ${isHasChild && '!mt-[19px]  mb-[18px]'}`}>
            <SingleSelect
              className="border-none h-[30px] text-xs min-w-[162px]  rounded-md  !py-0  !pl-0 !shadow-none !text-left bg-[#EBF1F7]"
              defaultValue={optionSmall.find(
                (element) =>
                  element.value ===
                  (info.row.original.SMALL.id
                    ? info.row.original.SMALL.id
                    : NO_OPTION_CATEGORY),
              )}
              isDisabled={!isPermissionAction}
              placeholder=""
              showArrow
              options={optionSmall}
              onChange={(e) => {
                if (info.row.original.type === EventCalendarType.TASK) {
                  editCategoryInline({
                    id: info.row.original.id,
                    categoryIds: [
                      {
                        categoryId:
                          e?.value == NO_OPTION_CATEGORY
                            ? null
                            : (e?.value as number),
                        type: EventWorkCategory.SMALL,
                      },
                      {
                        categoryId:
                          info.row.original.LARGE.id == NO_OPTION_CATEGORY
                            ? null
                            : (info.row.original.LARGE.id as number),
                        type: EventWorkCategory.LARGE,
                      },
                      {
                        categoryId:
                          info.row.original.MEDIUM.id == NO_OPTION_CATEGORY
                            ? null
                            : (info.row.original.MEDIUM.id as number),
                        type: EventWorkCategory.MEDIUM,
                      },
                    ],
                  });
                } else {
                  editCategoryEventInline({
                    id: info.row.original.id,
                    categoryIds: [
                      {
                        categoryId:
                          e?.value == NO_OPTION_CATEGORY
                            ? null
                            : (e?.value as number),
                        type: EventWorkCategory.SMALL,
                      },
                      {
                        categoryId:
                          info.row.original.LARGE.id == NO_OPTION_CATEGORY
                            ? null
                            : (info.row.original.LARGE.id as number),
                        type: EventWorkCategory.LARGE,
                      },
                      {
                        categoryId:
                          info.row.original.MEDIUM.id == NO_OPTION_CATEGORY
                            ? null
                            : (info.row.original.MEDIUM.id as number),
                        type: EventWorkCategory.MEDIUM,
                      },
                    ],
                  });
                }
              }}
            />
          </div>
        );
      },
    },
    {
      accessorKey: 'totalDuration',
      header: ({ column }) => {
        const isAsc = column.getIsSorted() === 'asc';

        return (
          <div
            className="flex gap-1 items-center justify-center"
            onClick={() => {
              const newSortState = isAsc
                ? [{ id: column.id, desc: true }]
                : [{ id: column.id, desc: false }];
              setSortState(newSortState);
              column.toggleSorting();
            }}>
            <p className="!text-xs font-medium !text-[#77858F]">計測時間</p>
            <div className="ml-[60px] relative flex flex-col">
              <Image
                src="/icons/sort-down.svg"
                alt="Sort down"
                width={9}
                height={10}
                className={`cursor-pointer justify-self-end  ${isAsc && 'rotate-180'}`}
              />
            </div>
          </div>
        );
      },
      cell: ({ row, getValue }) => {
        const rowData = row.original as ChildTask;
        const isParent = row.depth === 0;
        const isHasChild =
          row.original.children && row.original.children?.length > 1;
        const resultParentDuration =
          row.original.children &&
          row.original.children.reduce(
            (acc, item) => {
              const pausedAt = item.pausedAt ? item.pausedAt : '計測中';

              if (item.startedAt < acc.startedAt) {
                acc.startedAt = item.startedAt;
              }

              if (pausedAt > acc.pausedAt) {
                acc.pausedAt = pausedAt;
              }

              return acc;
            },
            { startedAt: '99 : 99', pausedAt: '0000' },
          );
        const isRowParent = isParent && isHasChild;
        const isAnyRunning =
          row.original.children &&
          row.original.children.some((item) => item.isRunning);

        return (
          <div
            className={`font-bold text-xs mt-2 relative ${isHasChild ? 'top-[-12px]' : 'top-[-3px]'} `}>
            {isRowParent && isAnyRunning ? (
              <p>計測中</p>
            ) : (
              <div className="flex text-[10px] w-full justify-center items-center ">
                <div className="bg-transparent p-1">
                  <div className="w-12">
                    <Input
                      defaultValue={
                        isRowParent
                          ? resultParentDuration?.startedAt
                          : `${rowData.startedAt}`
                      }
                      type="text"
                      disabled={!isPermissionAction || isRowParent}
                      onBlur={(e) => {
                        if (e.target.value === rowData.startedAt) return;
                        const data = isTimeEarlier(
                          formatTimeInput(
                            `${convertToMinutesNumber(e.target.value)}`,
                          ),
                          row.original.isRunning
                            ? formatCurrentDay()
                            : (row.original.pausedAt as string),
                        );

                        if (data) {
                          handleChangeStartTime(
                            e,
                            row.original.idEdit as string,
                            parseInt(row.original.id),
                            `${row.original.type}`,
                            `${rowData.startedAt}`,
                          );
                        } else {
                          handleResetStartTime(
                            `${rowData.startedAt}`,
                            row.original.idEdit as string,
                          );
                        }
                      }}
                      className="!w-[50px] !h-[30px] !py-0 bg-[#EBF1F7] text-black !text-xs !pb-[2px] font-normal rounded-[3px] !px-0 text-center !border-none  !opacity-100"
                    />
                  </div>
                </div>
                <div className="h-full flex items-center text-base font-normal text-[#77858F]">
                  ~
                </div>
                <div className="bg-transparent p-1">
                  <div className="w-12">
                    <Input
                      disabled={
                        !isPermissionAction ||
                        isRowParent ||
                        row.original.isRunning
                      }
                      defaultValue={
                        isRowParent
                          ? resultParentDuration?.pausedAt
                          : `${row.original.isRunning ? '計測中' : rowData.pausedAt}`
                      }
                      type="text"
                      onBlur={(e) => {
                        if (e.target.value === rowData.pausedAt) return;
                        if (row.original.isRunning) return;

                        const data = isTimeEarlier(
                          formatTimeInput(
                            `${convertToMinutesNumber(e.target.value)}`,
                          ),
                          row.original.startedAt as string,
                        );

                        if (!data) {
                          handleChangeEndTime(
                            e,
                            row.original.idEdit as string,
                            parseInt(row.original.id),
                            `${row.original.type}`,
                            `${rowData.pausedAt}`,
                          );
                        } else {
                          handleResetEndTime(
                            `${rowData.pausedAt}`,
                            row.original.idEdit as string,
                          );
                        }
                      }}
                      className={`${row.original.isRunning && 'cursor-not-allowed'} !w-[50px] rounded-[3px] !h-[30px] !py-0 bg-[#EBF1F7] text-black !pb-[2px] !text-xs font-normal text-center  !px-0 !border-none  !opacity-100`}
                    />
                  </div>
                </div>
              </div>
            )}
            {isParent && (
              <div className="text-base font-medium text-blacks mt-3 text-end mr-[14px]">
                {convertToJapaneseTime(getValue() as string)}{' '}
              </div>
            )}
          </div>
        );
      },
      sortingFn: sortDuration,
    },
    {
      accessorKey: 'status',
      header: ({ column }) => {
        const isAsc = column.getIsSorted() === 'asc';

        return (
          <div
            className="flex gap-1 items-center justify-center cursor-pointer"
            onClick={() => {
              const newSortState = isAsc
                ? [{ id: column.id, desc: true }]
                : [{ id: column.id, desc: false }];
              const defaultState = [{ id: column.id, desc: true }];
              setSortState(
                sortState.length !== 0 ? newSortState : defaultState,
              );
              column.toggleSorting();
            }}>
            <p className="!text-xs font-medium !text-[#77858F]">ステータス</p>
            <div className="ml-1 relative flex flex-col">
              <Image
                src="/icons/sort-down.svg"
                alt="Sort down"
                width={9}
                height={10}
                className={`cursor-pointer justify-self-end  ${isAsc && 'rotate-180'}`}
              />
            </div>
          </div>
        );
      },
      cell: (info) => {
        const isParent = info.row.depth === 0;
        return isParent ? (
          <div className="w-full flex justify-center items-center gap-[6px] pr-4">
            <div
              className={`w-[10px] h-[10px] rounded-full ${info.row.original.status && info.row.original.status.name && statusStyles.find((item) => item.value === info.row.original.status.id)?.color}`}></div>
            <div
              className={`text-sm font-medium text-black  flex items-center justify-center rounded `}>
              {info.row.original.status && info.row.original.status.name}
            </div>
          </div>
        ) : (
          <div>
            {info.row.original.startedAt &&
              info.row.original.pausedAt &&
              calculateActualDurationDaily(
                info.row.original.startedAt,
                info.row.original.pausedAt,
              )}
          </div>
        );
      },
      sortingFn: sortStatusById,
    },
  ];

  const table = useReactTable<dataTaskDailyTable>({
    data: dataTaskDailyList,
    columns,
    state: {
      expanded: expandedState,
      sorting: sortState,
    },
    onExpandedChange: setExpandedState,
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getSubRows: (row) =>
      row.children && row.children?.length > 1 ? row.children : [],
  });

  const columnsDownload: ColumnDef<dataTaskDailyTable>[] = [
    {
      id: 'expand',
      header: 'タスクカード名',
      size: 20,
      cell: ({ row }: { row: Row<dataTaskDailyTable> }) =>
        row.getCanExpand() && (
          <button
            className="border border-solid rounded-full w-7 h-7 ml-3 text-xs flex justify-center items-center"
            onClick={row.getToggleExpandedHandler()}>
            <p className="-translate-y-[120%]">
              {row.getIsExpanded()
                ? row.original.children?.length
                : row.original.children?.length}
            </p>
          </button>
        ),
    },
    {
      accessorKey: 'LARGE',
      header: '',
      cell: (info) => {
        const organizationKey = info.row.original.organization?.toString();
        const organizationCategory =
          organizationKey && dataOrganizationCategories
            ? dataOrganizationCategories[organizationKey]
            : undefined;
        const optionData = [
          {
            label: NO_OPTION_CATEGORY,
            value: NO_OPTION_CATEGORY,
          },
          ...getLargeCategories(organizationCategory ?? []),
        ];

        return (
          <div className="text-left">
            <div className="flex justify-between ">
              <Dropdown
                isShowIconDrop={false}
                labelClass="h-5 -translate-y-[30%]"
                className="border-none h-5 text-xs !py-0 !pl-0 !shadow-none !text-left !bg-transparent"
                classNameOption="!text-xs"
                selectedOption={optionData.find(
                  (element) =>
                    element.value ===
                    (info.row.original.LARGE.id
                      ? info.row.original.LARGE.id
                      : NO_OPTION_CATEGORY),
                )}
                options={optionData}
              />
              <ImageRound
                className={`w-5 h-5 pt-2`}
                src="/icons/chevron-right.svg"
                name="icon chevron right"
              />
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'MEDIUM',
      header: '',
      cell: (info) => {
        const organizationKey = info.row.original.organization?.toString();
        const organizationCategory =
          organizationKey && dataOrganizationCategories
            ? dataOrganizationCategories[organizationKey]
            : undefined;
        const result =
          organizationCategory && info.row.original.LARGE.id !== ''
            ? organizationCategory
                .filter((largeCategory) =>
                  largeCategory.LARGE && largeCategory.LARGE.id
                    ? largeCategory.LARGE.id === info.row.original.LARGE.id
                    : info.row.original.LARGE.id,
                )
                .flatMap((largeCategory) => largeCategory.MEDIUM)
            : [];

        const optionMedium =
          info.row.original.LARGE.id !== ''
            ? [
                {
                  label: NO_OPTION_CATEGORY,
                  value: NO_OPTION_CATEGORY,
                },
                ...getMediumCategories(result),
              ]
            : info.row.original.MEDIUM.id !== ''
              ? [
                  {
                    label: NO_OPTION_CATEGORY,
                    value: NO_OPTION_CATEGORY,
                  },
                  {
                    value: info.row.original.MEDIUM.id,
                    label: info.row.original.MEDIUM.name,
                  },
                ]
              : [
                  {
                    label: NO_OPTION_CATEGORY,
                    value: NO_OPTION_CATEGORY,
                  },
                ];

        return (
          <div className="text-left">
            <div className="flex justify-between ">
              <Dropdown
                labelClass="h-5 -translate-y-[30%]"
                isShowIconDrop={false}
                className="border-none h-6 text-xs !py-0 !pl-0 !shadow-none !text-left !bg-transparent"
                classNameOption="!text-xs"
                selectedOption={optionMedium.find(
                  (element) =>
                    element.value ===
                    (info.row.original.MEDIUM.id
                      ? info.row.original.MEDIUM.id
                      : NO_OPTION_CATEGORY),
                )}
                options={optionMedium}
              />
              <ImageRound
                className={`w-5 h-5 pt-2`}
                src="/icons/chevron-right.svg"
                name="icon chevron right"
              />
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'SMALL',
      header: '',
      cell: (info) => {
        const organizationKey = info.row.original.organization?.toString();
        const organizationCategory =
          organizationKey && dataOrganizationCategories
            ? dataOrganizationCategories[organizationKey]
            : undefined;
        const result =
          organizationCategory && info.row.original.LARGE
            ? organizationCategory
                .filter((largeCategory) =>
                  largeCategory.LARGE && largeCategory.LARGE.id
                    ? largeCategory.LARGE.id === info.row.original.LARGE.id
                    : info.row.original.LARGE.id,
                )
                .flatMap((largeCategory) => largeCategory.MEDIUM)
            : [];
        const smallResult =
          info.row.original.MEDIUM.id !== '' && Array.isArray(result)
            ? result.flatMap((mediumCategory) =>
                Array.isArray(mediumCategory.SMALL)
                  ? mediumCategory.SMALL.filter(
                      () =>
                        mediumCategory.MEDIUM?.id ===
                        info.row.original.MEDIUM.id,
                    )
                  : [],
              )
            : [];
        const optionSmall =
          info.row.original.MEDIUM.id !== ''
            ? [
                {
                  label: NO_OPTION_CATEGORY,
                  value: NO_OPTION_CATEGORY,
                },
                ...getSmallCategories(smallResult),
              ]
            : info.row.original.SMALL.id !== ''
              ? [
                  {
                    label: NO_OPTION_CATEGORY,
                    value: NO_OPTION_CATEGORY,
                  },
                  {
                    value: info.row.original.SMALL.id,
                    label: info.row.original.SMALL.name,
                  },
                ]
              : [
                  {
                    label: NO_OPTION_CATEGORY,
                    value: NO_OPTION_CATEGORY,
                  },
                ];

        return (
          <div className="text-left h-6">
            <Dropdown
              isShowIconDrop={false}
              labelClass="h-5 -translate-y-[30%]"
              className="border-none h-6 text-xs !py-0 !pl-0 !shadow-none !text-left !bg-transparent"
              classNameOption="!text-xs"
              selectedOption={optionSmall.find(
                (element) =>
                  element.value ===
                  (info.row.original.SMALL.id
                    ? info.row.original.SMALL.id
                    : NO_OPTION_CATEGORY),
              )}
              options={optionSmall}
            />
          </div>
        );
      },
    },
    {
      id: 'actions',
      header: () => null,
      size: 80,
      cell: ({ row }: { row: Row<dataTaskDailyTable> }) => {
        return (
          <ActionDetailDaily
            row={row}
            dataTagsList={dataTagsList}
            setDataTaskDailyList={setDataTaskDailyList}
          />
        );
      },
    },
    {
      accessorKey: 'totalDuration',
      header: ({ column }) => (
        <div
          className="flex gap-1 items-center justify-center"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
          <p className="-translate-y-[20%]">計測時間</p>
          <div className="ml-1 relative flex flex-col">
            <Image
              src="/icons/small-arrow-left.svg"
              alt="Add"
              width={15}
              height={14}
              className="rotate-90 cursor-pointer justify-self-end w-1.5"
            />
            <Image
              src="/icons/small-arrow-left.svg"
              alt="Add"
              width={15}
              height={14}
              className="-rotate-90 cursor-pointer justify-self-start w-1.5"
            />
          </div>
        </div>
      ),
      cell: ({ row, getValue }) => {
        const rowData = row.original as ChildTask;
        return (
          <div className="font-bold text-xs">
            {row.subRows?.length > 1 ? (
              ''
            ) : (
              <div className="flex text-[10px] w-full justify-center items-center">
                <div className=" p-1 h-5 ">
                  <p className="-translate-y-[100%] text-[10px] w-16">
                    {rowData.startedAt}
                  </p>
                </div>
                <p className="w-3">
                  <ImageRound
                    className=" w-3 h-3 -translate-y-[90%] "
                    src="/icons/arrow-right.svg"
                    name="icon arrow right"
                  />
                </p>
                <div className="bg-transparent p-1">
                  <p className="-translate-y-[90%] text-[10px] w-16">
                    {rowData.pausedAt}
                  </p>
                </div>
              </div>
            )}
            <div className="-translate-y-[100%]">
              {convertToJapaneseTime(getValue() as string)}
            </div>
          </div>
        );
      },
      sortingFn: sortDuration,
    },
    {
      accessorKey: 'status',
      header: ({ column }) => (
        <div
          className="flex gap-1 items-center justify-center cursor-pointer"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
          <p className="-translate-y-[30%]">ステータス</p>
          <div className="ml-1 relative flex flex-col">
            <Image
              src="/icons/small-arrow-left.svg"
              alt="Add"
              width={15}
              height={14}
              className="rotate-90 cursor-pointer justify-self-end w-1.5"
            />
            <Image
              src="/icons/small-arrow-left.svg"
              alt="Add"
              width={15}
              height={14}
              className="-rotate-90 cursor-pointer justify-self-start w-1.5"
            />
          </div>
        </div>
      ),
      cell: (info) => (
        <div className="w-full flex justify-center">
          <div
            className={`text-xs -translate-y-[100%] h-[21px] flex items-center justify-center rounded  ${info.row.original.status && info.row.original.status.id === StatusValueTask.MY_ROUTINE ? 'w-[86px]' : 'w-20'}  ${info.row.original.status && info.row.original.status.name && statusStyles.find((item) => item.value === info.row.original.status.id)?.color}`}>
            <span className="-translate-y-[30%]">
              {' '}
              {info.row.original.status && info.row.original.status.name}
            </span>
          </div>
        </div>
      ),
      sortingFn: sortStatusById,
    },
  ];

  const tableDownload = useReactTable<dataTaskDailyTable>({
    data: dataTaskDailyList,
    columns: columnsDownload,
    state: {
      expanded: expandedState,
      sorting: sortState,
    },
    onExpandedChange: setExpandedState,
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getSubRows: (row) =>
      row.children && row.children?.length > 1 ? row.children : [],
  });

  const { hoursConvert, minutesConvert } = convertToJapaneseValue(
    `${dataStatistic?.totalDuration}`,
  );
  const statusStyles = [
    {
      value: StatusValueTask.NOT_STARTED,
      color: 'bg-[#A3EBF0]',
    },
    {
      value: StatusValueTask.IN_PROGRESS,
      color: 'bg-[#92E9AF]',
    },
    {
      value: StatusValueTask.CONFIRMING,
      color: 'bg-[#FCCF79]',
    },
    {
      value: StatusValueTask.COMPLETED,
      color: 'bg-[#F58383]',
    },
    {
      value: StatusValueTask.MY_ROUTINE,
      color: 'bg-[#EBF1F7]',
    },
  ];

  const handleRenderEvent = (eventInfo: EventContentArg) => {
    return (
      <>
        <TaskDailyCard event={eventInfo} />
      </>
    );
  };
  const modifyEvents = (events: TaskTimeStatistic[]) => {
    return events.map((event) => {
      const start = new Date(event.start);
      const end = new Date(event.end);
      const timeDifference = (end.getTime() - start.getTime()) / (1000 * 60);

      if (
        timeDifference < 5 &&
        start.getHours() < 23 &&
        start.getMinutes() <= 50
      ) {
        event.end = new Date(start.getTime() + 5 * 60 * 1000);
      }
      return event;
    });
  };

  // Return yesterday
  const handleYesterDay = () => {
    setIsLoading(true);
    const newDate = new Date();
    newDate.setDate(new Date().getDate() - 1); // Move forward by one day
    if (!isSameDate(newDate, dataDatePicker)) {
      setIsLoading(true);
    }
    setDataDatePicker(newDate);
    // Programmatically navigate the calendar
    if (calendarRef.current) {
      const calendarApi = calendarRef.current.getApi();
      calendarApi.gotoDate(newDate); // Navigate to the new date
    }
    if (calendarDownloadRef.current) {
      const calendarApi = calendarDownloadRef.current.getApi();
      calendarApi.gotoDate(newDate); // Navigate to the new date
    }
  };

  // Return currentDay
  const handleCurrentDay = () => {
    setIsLoading(true);

    const newDate = new Date();
    newDate.setDate(new Date().getDate());

    if (!isSameDate(newDate, dataDatePicker)) {
      setIsLoading(true);
    }
    setDataDatePicker(newDate);

    // Programmatically navigate the calendar
    if (calendarRef.current) {
      const calendarApi = calendarRef.current.getApi();
      calendarApi.gotoDate(newDate); // Navigate to the new date
    }
    if (calendarDownloadRef.current) {
      const calendarApi = calendarDownloadRef.current.getApi();
      calendarApi.gotoDate(newDate); // Navigate to the new date
    }
  };

  // Come to the selected date
  const handleChooseDay = (date?: Date) => {
    if (date) {
      const newDate = new Date(date);
      if (!isSameDate(newDate, dataDatePicker)) {
        setIsLoading(true);
      }
      setDataDatePicker(newDate);

      if (calendarRef.current) {
        const calendarApi = calendarRef.current.getApi();
        calendarApi.gotoDate(newDate);
      }
      if (calendarDownloadRef.current) {
        const calendarApi = calendarDownloadRef.current.getApi();
        calendarApi.gotoDate(newDate);
      }
    }
  };
  // Handle prev day
  const handlePrevDay = () => {
    setIsLoading(true);

    const newDate = new Date(dataDatePicker);
    newDate.setDate(newDate.getDate() - 1);
    setDataDatePicker(newDate);

    if (calendarRef.current) {
      const calendarApi = calendarRef.current.getApi();
      calendarApi.gotoDate(newDate);
    }
    if (calendarDownloadRef.current) {
      const calendarApi = calendarDownloadRef.current.getApi();
      calendarApi.gotoDate(newDate);
    }
  };
  // Handle next day
  const handleNextDay = () => {
    const newDate = new Date(dataDatePicker);
    newDate.setDate(newDate.getDate() + 1);
    if (!isSameDate(newDate, dataDatePicker)) {
      setIsLoading(true);
    }
    setDataDatePicker(newDate);

    if (calendarRef.current) {
      const calendarApi = calendarRef.current.getApi();
      calendarApi.gotoDate(newDate);
    }
    if (calendarDownloadRef.current) {
      const calendarApi = calendarDownloadRef.current.getApi();
      calendarApi.gotoDate(newDate);
    }
  };
  // Check current day with now
  const isSameDate = (current: Date, now: Date) => {
    return (
      current.getFullYear() === now.getFullYear() &&
      current.getMonth() === now.getMonth() &&
      current.getDate() === now.getDate()
    );
  };

  // Handle download UI with PDF
  const divRef = useRef<HTMLDivElement | null>(null);
  const handleDownloadPDF = async () => {
    if (divRef.current) {
      try {
        divRef.current.style.visibility = 'visible';
        divRef.current.style.position = 'absolute';
        divRef.current.style.left = '-9999px';

        const canvas = await html2canvas(divRef.current, {
          scale: 2,
          useCORS: true,
          allowTaint: false,
          windowWidth: divRef.current.scrollWidth,
          windowHeight: divRef.current.scrollHeight,
        });

        const imgData = canvas.toDataURL('image/jpeg', 1.0);
        const pdf = new jsPDF('p', 'mm', 'a4');
        const imgWidth = 210;
        const pageHeight = 297;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        if (dataTaskDailyList && dataTaskDailyList.length > 0) {
          let position = 0;
          while (position < imgHeight) {
            pdf.addImage(imgData, 'JPEG', 0, -position, imgWidth, imgHeight);
            position += pageHeight;
            if (position < imgHeight) pdf.addPage();
          }
        } else {
          pdf.addImage(
            imgData,
            'JPEG',
            0,
            0,
            imgWidth,
            Math.min(imgHeight, pageHeight),
          );
        }

        pdf.save('集計.pdf');

        divRef.current.style.visibility = 'hidden';
        divRef.current.style.position = 'absolute';
        divRef.current.style.left = '-9999px';
      } catch (error) {
        // Handle error
      }
    }
  };

  const handleRenderEventDownLoad = (eventInfo: EventContentArg) => {
    return (
      <>
        <TaskDailyCard event={eventInfo} isDownload={true} />
      </>
    );
  };

  function getMinDateOfYear(year: number): Date {
    return new Date(year, 0, 1);
  }

  const calculateSlotTimes = (events: TaskTimeStatistic[]) => {
    const defaultMinTime = '09:00:00';
    const defaultMaxTime = '19:00:00';

    const times = events.reduce(
      (acc: { min: number | null; max: number | null }, event) => {
        const start = event.start ? new Date(event.start).getHours() : null;
        const end = event.end ? new Date(event.end).getHours() : null;

        if (start !== null)
          acc.min = acc.min !== null ? Math.min(acc.min, start) : start;
        if (end !== null)
          acc.max = acc.max !== null ? Math.max(acc.max, end) : end;

        return acc;
      },
      { min: null, max: null }, // Initial state with null values
    );

    const slotMinTime =
      times.min !== null ? `${Math.min(times.min, 9)}:00:00` : defaultMinTime;

    const adjustedMaxTime =
      times.max !== null && times.max >= 19 ? times.max + 1 : times.max;
    const slotMaxTime =
      adjustedMaxTime !== null
        ? `${Math.max(adjustedMaxTime, 19)}:00:00`
        : defaultMaxTime;

    return { slotMinTime, slotMaxTime };
  };

  const handleNextUser = () => {
    if (dataStatistic?.nextUser && organization) {
      router.push(
        `${pageRouters.DAILY_REPORT_TEAM_DETAIL.href(String(dataStatistic?.nextUser))}?organization=${organization}`,
        { scroll: false },
      );
    }
  };
  const handlePrevUser = () => {
    if (dataStatistic?.prevUser && organization) {
      router.push(
        `${pageRouters.DAILY_REPORT_TEAM_DETAIL.href(String(dataStatistic?.prevUser))}?organization=${organization}`,
        { scroll: false },
      );
    }
  };

  return (
    <div className="flex  flex-col ">
      <div className="h-[calc(100vh_-_83px)] overflow-y-auto ">
        <header className="flex justify-between my-[30px] pr-10 ">
          <div className="flex gap-5 items-center">
            <span className="text-2xl font-medium ">日報</span>
            <div className="w-fit z-20 flex gap-x-3 items-center">
              <ImageRound
                onClick={() => handlePrevDay()}
                className="h-fit w-fit cursor-pointer"
                src="/icons/left-statistic.svg"
                name="left"
              />
              <div className="w-[159px]">
                <DatePicker
                  className="h-[34px] border text-sm font-normal !py-1 !border-[#77858F]"
                  selected={dataDatePicker}
                  maxDate={new Date()}
                  dateFormat={DATE_TEXT_FORMAT}
                  minDate={getMinDateOfYear(2023)}
                  onChange={(e) => {
                    handleChooseDay(e as Date);
                  }}
                />
              </div>
              {!isTodaySchedule(dataDatePicker) && (
                <ImageRound
                  onClick={() => handleNextDay()}
                  className=" h-fit w-fit cursor-pointer"
                  src="/icons/right-statistic.svg"
                  name="right"
                />
              )}
            </div>
            <div className="flex gap-4">
              <Button
                variant="outline"
                className="border-none h-[34px] w-[48px] !px-0 !py-0"
                onClick={() => {
                  if (!isYesterdaySchedule(dataDatePicker)) {
                    handleYesterDay();
                  }
                }}>
                昨日
              </Button>
              <Button
                variant="outline"
                className="border-none h-[34px] w-[48px] !px-0 !py-0"
                onClick={() => {
                  if (!isTodaySchedule(dataDatePicker)) {
                    handleCurrentDay();
                  }
                }}>
                今日
              </Button>
            </div>
          </div>
        </header>
        <div className="mb-[30px] flex items-center justify-between pr-10">
          <div className="flex items-center gap-5">
            <ImageRound
              onClick={handlePrevUser}
              style={{
                opacity: dataStatistic?.prevUser && organization ? 1 : 0,
              }}
              className="h-fit w-fit cursor-pointer relative top-[1px]"
              src="/icons/left-statistic.svg"
              name="left"
            />
            <div className="flex gap-5 items-center">
              <div className="flex flex-col gap-1 items-start w-10 text-xs  text-[#0068B6]">
                {dataDetailUser?.isConfirmed ? (
                  <span>確認済</span>
                ) : (
                  <span className="text-[#77858F]">未確認</span>
                )}
                <Checkbox
                  isChecked={dataDetailUser?.isConfirmed}
                  onChange={(e) => {
                    if (dataDetailUser?.id) {
                      confirmUserDaily({
                        id: dataDetailUser?.id,
                        isConfirmed: e,
                        categoryId: parseInt(`${organization}`),
                      });
                    }
                  }}
                  className="flex justify-center"
                  classSize="w-4 h-4"
                  boxLabelClass="!m-0"
                />
              </div>

              <div className="flex items-center gap-[10px]">
                <CustomUserAvatar
                  avatarUrl={memberInfo?.avatar || ''}
                  avatarColor={memberInfo?.avatarColor || ''}
                  size={33}
                />
                <span className="text-black max-w-[300px] line-clamp-3 break-all">
                  {dataDetailUser && dataDetailUser?.fullName}
                </span>
                <span className="text-[#77858F] text-xs max-w-[300px] truncate relative top-[1px]">
                  {dataDetailUser && dataDetailUser?.organizationName}
                </span>
              </div>
            </div>
            <ImageRound
              onClick={handleNextUser}
              style={{
                opacity: dataStatistic?.nextUser && organization ? 1 : 0,
              }}
              className="h-fit w-fit cursor-pointer relative top-[1px]"
              src="/icons/right-statistic.svg"
              name="right"
            />
            <Link
              href={`${pageRouters.DAILY_REPORT_TEAM.href}?tabId=1`}
              className="bg-white relative top-[1px] flex items-center ml-[10px] justify-center gap-2 text-sm text-[#77858F] font-medium w-[158px] h-[34px] rounded-md">
              <span>チームの日報一覧</span>
              <div className="flex items-center justify-center w-[18px] h-[18px] bg-[#EBF1F7] rounded-full">
                <ImageRound
                  className=" h-[8px] w-fit cursor-pointer relative left-[0.5px]"
                  src="/icons/right-statistic.svg"
                  name="right"
                />
              </div>
            </Link>
          </div>
          <div className="flex gap-4 items-center">
            <div className="flex items-center gap-3">
              {isPermissionAction && (
                <Button
                  className="flex gap-2 px-0 py-0 w-[138px] h-[34px]"
                  onClick={() => {
                    handleDownloadPDF();
                  }}>
                  <span className="break-all">PDF書き出し</span>
                  <ImageRound
                    className=" w-3 h-3"
                    src="/icons/upload.svg"
                    name="upload"
                  />
                </Button>
              )}
            </div>
          </div>
        </div>
        <div className=" flex gap-3">
          <div className="w-[262px] px-5 bg-[#F8FAFC] h-[calc(100vh_-_260px)] rounded-[14px] daily-custom  overflow-y-auto">
            <p className=" pt-[30px] mb-2">スケジュール実績</p>
            <FullCalendar
              ref={calendarRef}
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              height="auto"
              editable={false}
              firstDay={1}
              nowIndicator={true}
              droppable={false}
              eventContent={handleRenderEvent}
              events={modifyEvents(taskTimeStatisticList)}
              headerToolbar={false}
              initialView={'timeGridDay'}
              eventClick={handleEventClick}
              slotLabelFormat={{
                hour: 'numeric',
                minute: '2-digit',
                omitZeroMinute: false,
                hour12: false,
              }}
              slotMinTime={
                calculateSlotTimes(modifyEvents(taskTimeStatisticList))
                  .slotMinTime
              }
              slotMaxTime={
                calculateSlotTimes(modifyEvents(taskTimeStatisticList))
                  .slotMaxTime
              }
              initialDate={dataDatePicker}
              eventOverlap={true}
              slotEventOverlap={true}
              selectMirror={true}
              locales={[jaLocale]}
              locale="ja"
            />
          </div>
          <div className="w-[calc(100%_-_260px)] h-[calc(100vh_-_260px)] font-medium overflow-y-auto mr-5 bg-[#F8FAFC] p-[30px] rounded-[14px]">
            <div className="h-[325px] overflow-y-auto">
              <p className="text-base">カテゴリーの割合</p>
              <div className="flex pt-5">
                <section className="flex-1  max-w-[360px]">
                  {chartData?.data && (
                    <PieChart
                      colors={chartData.colors}
                      data={chartData?.data}
                      labels={chartData?.labels}
                      actualValues={chartData?.actualValue}
                      className="w-[280px] h-[280px] ml-5"
                    />
                  )}
                </section>

                <section className="flex-1 flex flex-col items-start gap-4 justify-start">
                  <div className="w-fit px-4 h-14 flex items-center font-medium justify-center gap-1 text-[34px]">
                    <span className="text-sm font-medium pt-6 mr-2">
                      合計時間
                    </span>
                    {hoursConvert}{' '}
                    <span className="text-[22px] pt-[9px] font-medium mr-2">
                      時間
                    </span>
                    {minutesConvert}{' '}
                    <span className="text-[22px] pt-[9px] ">分</span>
                  </div>
                  <div className="text-xs text-[#77858F] font-medium mt-[30px]">
                    大カテゴリー
                  </div>

                  {dataCategory.map((item, index) => {
                    return (
                      <div
                        key={index}
                        className="flex items-start justify-start gap-5 text-base font-medium">
                        <div className="flex items-start justify-center gap-1  ">
                          <div
                            style={{
                              backgroundColor: item.color,
                            }}
                            className={`w-3 h-3 mt-[7px] `}></div>
                          <span className="w-[200px] break-all">
                            {item.categoryName}
                          </span>
                        </div>
                        <div className="ml-[30px] w-[100px] flex items-start">
                          {convertToJapaneseTime(item.duration)}
                        </div>
                        <div>{item.percent}%</div>
                      </div>
                    );
                  })}
                </section>
              </div>
            </div>
            <div className="mt-5 h-[548px]">
              <p className="text-base font-medium">タスク一覧</p>
              <Table className=" border border-[#D2DBE1] !ring-0 bg-white h-[496px] !pt-0 overflow-y-auto py-0 mt-5 rounded-md">
                <thead className="bg-gray-100 sticky z-10">
                  {table.getHeaderGroups().map((headerGroup) => (
                    <tr
                      key={headerGroup.id}
                      className="[&>th]:text-gray-700 sticky top-0 bg-[#F8FAFC] z-40 border-b border-[#D2DBE1]  [&>th]:font-medium [&>th]:text-base [&>th]:py-3 ">
                      {headerGroup.headers.map((header, index) =>
                        index === 0 ? (
                          <th
                            key={header.id}
                            colSpan={2}
                            className=" p-2 text-left !text-xs font-medium !text-[#77858F]">
                            {flexRender(
                              header.column.columnDef.header,
                              header.getContext(),
                            )}
                          </th>
                        ) : (
                          index > 1 && (
                            <th
                              key={header.id}
                              style={{ width: header.column.getSize() }}
                              className={`${
                                index === 3 || index === 4
                                  ? 'border-r border-[#D2DBE1]'
                                  : ''
                              }`}>
                              {flexRender(
                                header.column.columnDef.header,
                                header.getContext(),
                              )}
                            </th>
                          )
                        ),
                      )}
                    </tr>
                  ))}
                </thead>
                <TableBody className="![&>tr>td]:pr-0 ![&>tr>td]:pl-0 ![&>tr>td]:pr-0 [&>tr>td]:py-0">
                  {table.getRowModel().rows.map((row, index) => {
                    const isHasChild =
                      row.original.children && row.original.children.length > 1;
                    const isParent = row.depth === 0;

                    return (
                      <React.Fragment key={row.id}>
                        <tr
                          className={`${row.depth > 0 ? 'bg-[#F8FAFC]' : 'bg-white'} `}>
                          <td
                            rowSpan={2}
                            className={`${index === 3 || index === 4 ? '' : ''} !pr-0 border-b border-[#D2DBE1] w-[18px] !pl-0`}>
                            <></>
                          </td>
                          {row
                            .getVisibleCells()
                            .slice(1, 4)
                            .map((cell, cellIndex) => (
                              <td
                                key={cell.id}
                                className={`!pt-0 !pb-1 !pl-0 ${cellIndex !== 2 ? '!pr-0' : '!pr-[14px]'}`}>
                                {flexRender(
                                  cell.column.columnDef.cell,
                                  cell.getContext(),
                                )}
                              </td>
                            ))}

                          {row
                            .getVisibleCells()
                            .slice(4)
                            .map((cell, cellIndex) => (
                              <td
                                key={cell.id}
                                rowSpan={2}
                                className={`p-2 !pl-2 border-l  ${!isParent && cellIndex === 1 && 'border-l-0'} border-b !pr-0 border-[#D2DBE1]`}>
                                {flexRender(
                                  cell.column.columnDef.cell,
                                  cell.getContext(),
                                )}
                              </td>
                            ))}
                        </tr>
                        {/* The sub row with the title cell takes up 4 columns */}
                        <tr
                          className={`${row.depth > 0 ? 'bg-[#F8FAFC]' : 'bg-white'}  !border-none !pr-0`}>
                          <td
                            colSpan={3}
                            className={`text-left !pt-0 !pl-0  !pr-0  border-b border-[#D2DBE1]`}>
                            <div
                              className={`flex items-center justify-between  ${isHasChild ? 'pb-[19px]' : 'relative top-[-8px]'} ${!isParent && 'relative top-[-4px]'}`}>
                              <div className=" w-full break-all text-base font-medium text-black flex items-start gap-[6px]">
                                {row.getCanExpand() && row.depth === 0 && (
                                  <button
                                    className="bg-[#EBF1F7] rounded-full w-6 h-6 text-sm text-[#0068B6] font-normal"
                                    onClick={() => {
                                      row.getToggleExpandedHandler(); // Toggle row expanded state
                                      handleExpandChange(row); // Update expanded state
                                    }}>
                                    {row.getIsExpanded()
                                      ? row.original.children?.length
                                      : row.original.children?.length}
                                  </button>
                                )}{' '}
                                {row.depth > 0 && (
                                  <div className=" rounded-full w-6 h-6 text-sm text-[#0068B6] font-normal"></div>
                                )}
                                <p
                                  className={`flex-1 ${row.depth > 0 && 'bg-[#F8FAFC]'}`}>
                                  {row.original.title || '-'}
                                </p>
                              </div>
                              <div className="text-left !pt-0 !pl-2">
                                <ActionDetailDaily
                                  row={row}
                                  dataTagsList={dataTagsList}
                                  setDataTaskDailyList={setDataTaskDailyList}
                                />
                              </div>
                            </div>
                          </td>
                        </tr>
                      </React.Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            <div className="mt-[30px] pb-14">
              <p>備考</p>
              <ResizeTextArea
                currentDate={dataDatePicker}
                defaultData={
                  dataStatistic?.remark.remark
                    ? dataStatistic?.remark.remark
                    : ''
                }
                setDefaultData={setRemarkData}
              />
            </div>
          </div>
        </div>
      </div>
      {/*  Handle download pdf with UI */}
      <div className="max-w-[1440px]">
        <div
          ref={divRef}
          className=" max-w-[1440px]"
          style={{
            visibility: 'hidden',
            position: 'absolute',
            left: '-9999px',
          }}>
          <div className="flex gap-3">
            <div className="w-[262px] h-fit pl-2 bg-[#F8FAFC] rounded-[14px] daily-custom">
              <p className="">スケジュール実績</p>
              <FullCalendar
                ref={calendarDownloadRef}
                plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                height="auto"
                editable={false}
                firstDay={1}
                nowIndicator={true}
                droppable={false}
                initialView={'timeGridDay'}
                eventContent={handleRenderEventDownLoad}
                events={taskTimeStatisticList}
                headerToolbar={false}
                initialDate={dataDatePicker}
                slotLabelFormat={{
                  hour: 'numeric',
                  minute: '2-digit',
                  omitZeroMinute: false,
                  hour12: false,
                }}
                slotMinTime="09:00:00"
                slotMaxTime="19:00:00"
                eventOverlap={true}
                slotEventOverlap={true}
                selectMirror={true}
                locales={[jaLocale]}
                locale="ja"
              />
            </div>
            <div className="w-[calc(100%_-_260px)]  overflow-y-auto ">
              <div className="w-full text-center text-[36px]">
                {formatShowDateJapanese(`${dataDatePicker}`)}
              </div>
              <div className="h-[371px] overflow-y-auto">
                <p>カテゴリーの割合</p>
                <div className="flex">
                  <section className="flex-1 flex flex-col items-center gap-4 justify-end">
                    <div className="w-fit bg-white px-4 h-14 flex items-center justify-center gap-1 text-[36px] border border-solid rounded-md">
                      <span className="-translate-y-[30%]">{hoursConvert}</span>
                      <span className="text-sm pt-6 mr-2 -translate-y-[30%]">
                        時間
                      </span>
                      <span className="-translate-y-[30%]">
                        {minutesConvert}
                      </span>
                      <span className="text-sm pt-6 -translate-y-[30%]">
                        分
                      </span>
                    </div>
                    <Table className=" border-[1px]">
                      <TableBody className="">
                        {dataCategory.map((item, index) => {
                          return (
                            <tr key={index}>
                              <td>
                                <div className="h-full w-full flex items-center justify-center">
                                  <div
                                    style={{
                                      backgroundColor: item.color,
                                    }}
                                    className={`w-3 h-3`}></div>
                                </div>
                              </td>
                              <td className="-translate-y-[20%]">
                                {item.categoryName}
                              </td>
                              <td className="-translate-y-[20%]">
                                {convertToJapaneseTime(item.duration)}
                              </td>
                              <td className="-translate-y-[20%]">
                                {item.percent}%
                              </td>
                            </tr>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </section>
                  <section className="flex-1">
                    {chartData?.data && (
                      <PieChart
                        colors={chartData.colors}
                        data={chartData?.data}
                        labels={chartData?.labels}
                        actualValues={chartData?.actualValue}
                        className="w-[290px] h-[290px]"
                      />
                    )}
                  </section>
                </div>
              </div>
              <div className="mt-5 ">
                <p className="mb-3">タスクカード</p>
                <Table className=" bg-white  border-[1px] !pt-0 overflow-y-auto py-0 mt-2">
                  <thead className="bg-gray-100  z-[2]">
                    {tableDownload.getHeaderGroups().map((headerGroup) => (
                      <tr
                        key={headerGroup.id}
                        className="[&>th]:text-gray-700 sticky top-0 bg-gray-100 z-40 [&>th]:font-medium [&>th]:text-base [&>th]:py-3 ">
                        {headerGroup.headers.map((header, index) =>
                          index === 0 ? (
                            <th
                              key={header.id}
                              colSpan={2}
                              className=" p-2 text-left -translate-y-[20%] ">
                              {flexRender(
                                header.column.columnDef.header,
                                header.getContext(),
                              )}
                            </th>
                          ) : (
                            index > 1 && (
                              <th
                                key={header.id}
                                style={{ width: header.column.getSize() }}
                                className={`${
                                  index === 4 || index === 5
                                    ? 'border-r border-gray-200'
                                    : ''
                                }`}>
                                {flexRender(
                                  header.column.columnDef.header,
                                  header.getContext(),
                                )}
                              </th>
                            )
                          ),
                        )}
                      </tr>
                    ))}
                  </thead>
                  <TableBody className="![&>tr>td]:pr-0 ![&>tr>td]:pl-0 ![&>tr>td]:pl-1 ">
                    {tableDownload.getRowModel().rows.map((row, index) => (
                      <React.Fragment key={row.id}>
                        <tr
                          className={`${row.depth > 0 ? 'bg-gray-100' : 'bg-white'} `}>
                          <td
                            rowSpan={2}
                            className={`${index === 4 || index === 5 ? '' : ''} border-b-[1px] -translate-y-[0.1%]`}>
                            {row.original.children &&
                            row.original.children?.length > 1 ? (
                              <button
                                className="border border-solid rounded-full w-7 h-7 text-xs cursor-pointer"
                                onClick={row.getToggleExpandedHandler()}>
                                <p className="-translate-y-[40%]">
                                  {row.original.children?.length}
                                </p>
                              </button>
                            ) : (
                              <div className="w-7 h-7"></div>
                            )}
                          </td>
                          {row
                            .getVisibleCells()
                            .slice(1, 5)
                            .map((cell) => (
                              <td key={cell.id} className={`pt-2 !pb-1 !pl-0`}>
                                {flexRender(
                                  cell.column.columnDef.cell,
                                  cell.getContext(),
                                )}
                              </td>
                            ))}

                          {row
                            .getVisibleCells()
                            .slice(5)
                            .map((cell) => (
                              <td
                                key={cell.id}
                                rowSpan={2}
                                className="p-2 !pl-2 border-l-[1px] border-b-[1px] border-gray-200 -translate-y-[0.1%]">
                                {flexRender(
                                  cell.column.columnDef.cell,
                                  cell.getContext(),
                                )}
                              </td>
                            ))}
                        </tr>
                        {/* The sub row with the title cell takes up 4 columns */}
                        <tr
                          className={`${row.depth > 0 ? 'bg-gray-100' : 'bg-white'} !border-none`}>
                          <td
                            colSpan={4}
                            className="text-left border-b !pt-0 !pl-0">
                            <div className="text-xl w-full break-all">
                              {row.original.title || '-'}
                            </div>
                          </td>
                        </tr>
                        {row.original.todoList &&
                          row.original.todoList.map((item, index) => {
                            return (
                              <tr
                                key={index}
                                className={`${row.depth > 0 ? 'bg-gray-100' : 'bg-white'} !border-none`}>
                                <td
                                  colSpan={7}
                                  className="text-left border-b !pt-0 !pl-0 ">
                                  <div className="text-xl break-all  px-2">
                                    {item.checkedAt ? '[完了] ' : '[未完了] '}
                                    {item.content}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                      </React.Fragment>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="mt-5">
                <p>備考</p>
                <div className="py-3 pr-3">
                  <div
                    className="rounded-sm border p-3"
                    dangerouslySetInnerHTML={{
                      __html: (remarkData ?? '').replace(/\n/g, '<br/>'),
                    }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {popoverInfo && (
        <DetailActualItemDailyModal
          popoverInfo={popoverInfo}
          popoverRef={popoverRef}
          onClose={() => setPopoverInfo(null)}
          deleteActualTask={(uuid: string) => deleteActualTask(uuid)}
        />
      )}
    </div>
  );
};

export default DailyReportDetailBoard;
