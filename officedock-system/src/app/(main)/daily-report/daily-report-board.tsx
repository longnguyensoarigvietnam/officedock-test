'use client';
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
import html2canvas from 'html2canvas-pro';
import Link from 'next/link';

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
import { useMutation, useQueryClient } from 'react-query';
import { useSessionCache } from '@providers/SessionCacheProvider';

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
import ResizeTextArea from '@components/custom/ResizeTextArea';
import DetailActualItemDailyModal from '@components/daily/DetailActualItemDailyModal';
import TaskDailyCard from '../../../components/daily/taskDailyCard';

import {
  EventCalendarType,
  EventWorkCategory,
  PermissionsSystem,
  ScreenName,
  SocketActions,
  StatusValueTask,
} from '@constants/enums';
import { apiRouters, pageRouters } from '@constants/routers';
import {
  ERROR_DELETE_TASK_RUNNING,
  ERROR_UPDATE_MESSAGE,
  SUCCESS_DELETE_MESSAGE,
} from '@constants/message';
import { DATE_TEXT_FORMAT, NO_SETTING } from '@constants';

import './styles/daily-report.css';
import useDataStatistic from '@hooks/useDataStatistic';
import { useErrorToast } from '@hooks/useErrorToast';
import useDataStatisticPDF from '@hooks/useDataStatisticPdf';

import {
  ChildTask,
  DataActualDetail,
  dataTaskDaily,
  dataTaskDailyTable,
  dataTotalCategory,
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
  convertToTimeString,
  formatCurrentDay,
  formatDateServer,
  formatShowDateJapanese,
  formatTimeInput,
  getDateInfoFull,
  getTimeDifference,
  isCheckPermissionWithCloseDate,
  isEndTimeLater,
  isTimeEarlier,
  isTodaySchedule,
  isYesterdaySchedule,
} from '@utils/date';
import {
  adjustPositionForViewportSchedule,
  calculateTotalMinutes,
  hasPermissionInArray,
  removeDuplicateOptions,
  secondsToTimeString,
  timeStringToSeconds,
  transformDataTaskDailyToTable,
} from '@utils';
import { useWebSocket } from '@providers/WebSocketProvider';
import { LoadingContext } from '@providers/LoadingProvider';
import { useToast } from '@providers/ToastProvider';
import api from '@base/api';
import { TaskContext } from '@providers/TaskProvider';
import useCreationDataCommon from '@hooks/common/useCreationDataCommon';

const DailyReportBoard = () => {
  const { statusTaskSelected, setStatusTaskSelected } = useContext(TaskContext);
  const calendarRef = useRef<FullCalendar | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  const calendarDownloadRef = useRef<FullCalendar | null>(null);

  const socket = useWebSocket();
  const queryClient = useQueryClient();

  const { data: session } = useSessionCache();

  const { showToast } = useToast();

  const { setIsLoading } = useContext(LoadingContext);
  const showErrorToast = useErrorToast();

  const [currentDate, setCurrentDate] = useState<Date>(new Date());

  const [remarkData, setRemarkData] = useState<string>('');

  const { dataStatistic, refetchDataStatistic } = useDataStatistic({
    date: formatDateServer(currentDate),
    current_screen: 'daily_report',
  });
  const [isLoadingDownload, setIsLoadingDownload] = useState(false);

  const { creationDataCommonData } = useCreationDataCommon({
    options: {
      get_organization_for_my_statistic: true,
    },
  });

  const { dataStatisticPDF, refetchDataStatisticPDF } = useDataStatisticPDF({
    date: formatDateServer(currentDate),
    current_screen: 'daily_report',

    onSettled: () => {
      setTimeout(() => {
        setIsLoading(false);
        setIsLoadingDownload(true);
      }, 1000);
    },
  });

  const [taskTimeStatisticList, setTaskTimeStatisticList] = useState<
    TaskTimeStatistic[]
  >([]);

  const [dataOrganizationCategories, setDataOrganizationCategories] = useState<
    OrganizationCategories | undefined
  >(undefined);

  const [popoverInfo, setPopoverInfo] = useState<DataActualDetail | null>(null);

  const [chartData, setChartData] = useState<{
    colors: string[];
    labels: string[];
    data: number[];
    actualValue: string[];
  }>();
  const [dataCategory, setDataCategory] = useState<dataTotalCategory[]>([]);

  const [dataTaskDailyList, setDataTaskDailyList] = useState<
    dataTaskDailyTable[]
  >([]);

  // PDF
  const [dataCategoryPDF, setDataCategoryPDF] = useState<dataTotalCategory[]>(
    [],
  );
  const [chartDataPDF, setChartDataPDF] = useState<{
    colors: string[];
    labels: string[];
    data: number[];
    actualValue: string[];
  }>();

  const handleShowEventsInModal = (data: {
    largeColor?: string;
    start: string;
    end: string;
    title: string;
    eventList: any[];
    clientX: number;
    clientY: number;
    uuid: string;
    isCalculate: boolean;
  }) => {
    setPopoverInfo({
      largeColor: data.largeColor ? data.largeColor : '',
      title: data.title,
      uuid: data.uuid,
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
      isCalculate: data.isCalculate,
    });
  };
  const handleEventClick = (clickInfo?: any) => {
    handleShowEventsInModal({
      title: clickInfo.event.title,
      largeColor: clickInfo.event.extendedProps.largeColor
        ? clickInfo.event.extendedProps.largeColor
        : '',
      start: clickInfo.event.start,
      end: clickInfo.event.extendedProps.pausedAt,
      eventList: taskTimeStatisticList,
      clientX: clickInfo.jsEvent.clientX,
      clientY: clickInfo.jsEvent.clientY,
      uuid: clickInfo.event.extendedProps.uuid
        ? clickInfo.event.extendedProps.uuid
        : '',
      isCalculate: clickInfo.event?.extendedProps.isCalculate,
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
        pausedAt: duration.pausedAt ? new Date(duration.pausedAt) : currentDate,
        isCalculate: duration.pausedAt ? false : true,
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
    if (dataStatistic) {
      // Add color for item
      const dataAddColor = dataStatistic.categories.map((item) => ({
        color: item.categoryColor,
        categoryName: item.categoryName ? item.categoryName : NO_SETTING,
        duration: item.duration,
        percent: item.percent,
      }));

      // Color chart
      const listColor = dataStatistic.categories
        .filter((data) => data.categoryColor)
        .map((item) => item.categoryColor);

      // Get list label
      const listLabelChart = dataStatistic.categories.map(
        (item) => item.categoryName || NO_SETTING,
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

      setChartData({
        colors: listColor,
        labels: listLabelChart,
        data: listValueChart,
        actualValue: listValueActualChart,
      });

      setTaskTimeStatisticList(taskDurationItems);
    }
  }, [dataStatistic]);

  useEffect(() => {
    if (dataStatisticPDF) {
      // Sort categories by percentage descending
      const sortedCategories = [...dataStatisticPDF.categories].sort(
        (a, b) => b.percent - a.percent,
      );

      // Get the 4 largest ones
      const top4Items = sortedCategories.slice(0, 4);
      const otherItems = sortedCategories.slice(4);

      // Calculate total time and percentage of remaining items
      const totalDurationOther = otherItems.reduce(
        (sum, item) => sum + timeStringToSeconds(item.duration),
        0,
      );
      const totalPercentOther = otherItems.reduce(
        (sum, item) => sum + item.percent,
        0,
      );

      // Create "その他" item if there is remaining data
      const otherItem =
        otherItems.length > 0
          ? {
              categoryColor: '#D1D7DC',
              categoryName: 'その他',
              duration: secondsToTimeString(totalDurationOther),
              percent: totalPercentOther,
              id: 'その他',
              isOfMainOrganization: false,
            }
          : null;

      // Combine
      const mergedCategories = [
        ...top4Items,
        ...(otherItem ? [otherItem] : []),
      ];

      // Prepare colored data
      const dataAddColor = mergedCategories.map((item) => ({
        color: item.isOfMainOrganization ? 'white' : '#83919E',
        categoryName: item.categoryName || NO_SETTING,
        duration: item.duration,
        percent: item.percent,
        id: item.id,
      }));

      // Prepare chart data
      const listColor = mergedCategories.map((item) =>
        item.isOfMainOrganization
          ? 'white'
          : item.id === 'その他'
            ? '#D1D7DC'
            : '#83919E',
      );
      const listLabelChart = mergedCategories.map(
        (item) => item.categoryName || NO_SETTING,
      );
      const listValueChart = mergedCategories.map((item) => item.percent);
      const listValueActualChart = mergedCategories.map((item) =>
        convertToJapaneseTime(item.duration),
      );
      setDataCategoryPDF(dataAddColor);
      setChartDataPDF({
        colors: listColor,
        labels: listLabelChart,
        data: listValueChart,
        actualValue: listValueActualChart,
      });
    }
  }, [dataStatisticPDF]);

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
    setIsLoadingDownload(false);

    return await api.patch(
      `${apiRouters.ACTUAL_DURATION_DETAIL(parseInt(data.id))}?current_screen=daily_report`,
      data,
    );
  };
  const { mutate: editDurationTask } = useMutation(
    'postEditDurationTask',
    handleEditDuration,
    {
      onSuccess: async ({ data }, task) => {
        refetchDataStatistic();
        refetchDataStatisticPDF();
        queryClient.refetchQueries(['getDataTaskHeaderList']);
        if (
          (!task.pausedAt || task.pausedAt == null) &&
          statusTaskSelected.isStart
        ) {
          queryClient.refetchQueries(['getTaskHeaderStart']);
        }
        if (data && statusTaskSelected.taskDurationRunningUuid) {
          if (statusTaskSelected.taskDurationRunningUuid === data.uuid) {
            setStatusTaskSelected({
              ...statusTaskSelected,
              taskDuration: getTimeDifference(data.startedAt, data.pausedAt),
            });
          }
        }
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
        refetchDataStatisticPDF();
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
    setIsLoadingDownload(false);

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
        refetchDataStatisticPDF();
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
    setIsLoadingDownload(false);

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
        refetchDataStatisticPDF();
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
    setIsLoadingDownload(false);

    const { data: response } = await api.delete(
      `${apiRouters.UPDATE_TASK_ACTUAL(uuid)}?current_screen=daily_report`,
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
        refetchDataStatisticPDF();
      },
      onError: (error: AxiosError<any>) => {
        showErrorToast(error, ERROR_DELETE_TASK_RUNNING);
      },
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
          if (data.task) {
            handleUpdateStatus({
              id: data.task?.id as number,
              status: data.task?.status,
            });
          }
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
    const value = e.target.value;
    const updatedTasks = dataTaskDailyList.map((task) => {
      let updatedTask =
        `${task.idEdit}` === `${id}`
          ? {
              ...task,
              startedAt: formatTimeInput(
                `${convertToMinutesNumber(value)}`,
                true,
              ),
            }
          : task;

      const updatedChildren = updatedTask.children?.map((child) =>
        `${child.idEdit}` === `${id}`
          ? {
              ...child,
              startedAt: formatTimeInput(
                `${convertToMinutesNumber(value)}`,
                true,
              ),
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
          currentDate,
          `${formatTimeInput(`${convertToMinutesNumber(value)}`)}`,
        ),
        oldStartAt: `${startedAt}`,
      });
    } else {
      editDurationTask({
        id: id,
        scheduleId: taskId,
        startedAt: combineDateAndTime(
          currentDate,
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
    const value = e.target.value;

    const updatedTasks = dataTaskDailyList.map((task) => {
      let updatedTask =
        `${task.idEdit}` === `${id}`
          ? {
              ...task,
              pausedAt: formatTimeInput(
                `${convertToMinutesNumber(value)}`,
                true,
              ),
            }
          : task;

      const updatedChildren = updatedTask.children?.map((child) =>
        `${child.idEdit}` === `${id}`
          ? {
              ...child,
              pausedAt: formatTimeInput(
                `${convertToMinutesNumber(value)}`,
                true,
              ),
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
          currentDate,
          `${formatTimeInput(`${convertToMinutesNumber(value)}`)}`,
        ),
        taskId: taskId,
        oldEndAt: endTimeAt,
      });
    } else {
      editDurationTask({
        id: id,
        pausedAt: combineDateAndTime(
          currentDate,
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
        PermissionsSystem.DAILY_REPORT_UPDATE,
      )) ||
    (session?.user.permissions &&
      hasPermissionInArray(
        session?.user.permissions,
        PermissionsSystem.DAILY_REPORT_ADD,
      ));
  const isPermissionDailyTeam =
    session?.user.permissions &&
    hasPermissionInArray(
      session?.user.permissions,
      PermissionsSystem.TEAM_DAILY_REPORT_VIEW,
    );

  const handleExpandChange = (row: Row<dataTaskDailyTable>) => {
    const newExpandedState: any = {
      ...expandedState,
      [row.id]: !row.getIsExpanded(),
    };
    setExpandedState(newExpandedState);
  };

  function getLargeCategories(data: LargeCategory[]): OptionDropdownType[] {
    const largeCategories: OptionDropdownType[] = data
      .filter((category) => category.LARGE && !category.LARGE.isHidden)
      .map((category) => ({
        label: category.LARGE.name,
        value: category.LARGE.id,
      }));

    return largeCategories;
  }
  function getMediumCategories(data: MediumCategory[]): OptionDropdownType[] {
    const mediumCategories: OptionDropdownType[] = data
      .filter((category) => category.MEDIUM && !category.MEDIUM.isHidden)
      .map((category) => ({
        label: category.MEDIUM ? category.MEDIUM.name : '',
        value: category.MEDIUM ? category.MEDIUM.id : '',
      }));

    return mediumCategories;
  }
  function getSmallCategories(data: SmallCategory[]): OptionDropdownType[] {
    const smallCategories: OptionDropdownType[] = data
      .filter((category) => !category.isHidden)
      .map((category) => ({
        label: category.name,
        value: category.id,
      }));

    return smallCategories;
  }

  const columns: ColumnDef<dataTaskDailyTable>[] = [
    {
      id: 'expand',
      size: 20,
      accessorKey: 'name',
      enableSorting: false,
      header: () => {
        return (
          <p className="text-[#77858F] px-[18px] font-medium text-xs text-left">
            タスク名
          </p>
        );
      },
      cell: (info) => {
        const value = info.getValue() as string;
        return (
          <div className="font-medium px-[18px] text-[16px] break-all line-clamp-3 text-left text-black">
            {value}
          </div>
        );
      },
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
        const optionData = [...getLargeCategories(organizationCategory ?? [])];
        const isParent = info.row.depth === 0;
        if (!isParent) return;

        const isHasChild =
          info.row.original.children && info.row.original.children?.length > 1;

        return (
          <div
            className={`daily-custom text-left custom-statistic  h-[30px] mt-[12px] ${isHasChild && '!mt-[19px]  mb-[18px]'}`}>
            <div className="flex justify-between h-full relative rounded-md gap-1">
              <SingleSelect
                className="border-none shadow-none min-w-[159px] h-[30px] bg-[#EBF1F7] rounded-md"
                defaultValue={
                  info.row.original.LARGE.id
                    ? optionData.find(
                        (element) =>
                          element.value ===
                          (info.row.original.LARGE.id ?? NO_SETTING),
                      ) || {
                        label: info.row.original.LARGE.name,
                        value: info.row.original.LARGE.id,
                      }
                    : {
                        label: NO_SETTING,
                        value: NO_SETTING,
                      }
                }
                isDisabled={
                  !isPermissionAction ||
                  info.row.original.type !== EventCalendarType.TASK
                }
                placeholder=""
                showArrow
                options={removeDuplicateOptions(optionData)}
                onChange={(e) => {
                  if (info.row.original.type === EventCalendarType.TASK) {
                    editCategoryInline({
                      id: info.row.original.id,
                      categoryIds: [
                        {
                          categoryId:
                            e?.value == NO_SETTING
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
                            e?.value == NO_SETTING
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
                forceMenuPlacementBottom
              />
              <div className="flex items-center  mx-2 w-3 h-[30px]">
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
                  label: NO_SETTING,
                  value: NO_SETTING,
                },
                ...getMediumCategories(result),
              ]
            : info.row.original.MEDIUM.id !== ''
              ? [
                  {
                    label: NO_SETTING,
                    value: NO_SETTING,
                  },
                  {
                    value: info.row.original.MEDIUM.id,
                    label: info.row.original.MEDIUM.name,
                  },
                ]
              : [
                  {
                    label: NO_SETTING,
                    value: NO_SETTING,
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
              <div className="w-full">
                <SingleSelect
                  className="border-none h-6 text-xs min-w-[159px]  rounded-md  !py-0  !pl-0 !shadow-none !text-left bg-[#EBF1F7]"
                  defaultValue={
                    info.row.original.MEDIUM.id
                      ? optionMedium.find(
                          (element) =>
                            element.value ===
                            (info.row.original.MEDIUM.id ?? NO_SETTING),
                        ) || {
                          label: info.row.original.MEDIUM.name,
                          value: info.row.original.MEDIUM.id,
                        }
                      : {
                          label: NO_SETTING,
                          value: NO_SETTING,
                        }
                  }
                  showArrow
                  isDisabled={
                    !isPermissionAction ||
                    info.row.original.type !== EventCalendarType.TASK
                  }
                  placeholder=""
                  options={removeDuplicateOptions(optionMedium)}
                  forceMenuPlacementBottom
                  onChange={(e) => {
                    if (info.row.original.type === EventCalendarType.TASK) {
                      editCategoryInline({
                        id: info.row.original.id,
                        categoryIds: [
                          {
                            categoryId:
                              e?.value == NO_SETTING
                                ? null
                                : (e?.value as number),
                            type: EventWorkCategory.MEDIUM,
                          },
                          {
                            categoryId:
                              info.row.original.LARGE.id == NO_SETTING
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
                              e?.value == NO_SETTING
                                ? null
                                : (e?.value as number),
                            type: EventWorkCategory.MEDIUM,
                          },
                          {
                            categoryId:
                              info.row.original.LARGE.id == NO_SETTING
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
              <div className="flex items-center  w-3 mx-2 h-[30px]">
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
                  label: NO_SETTING,
                  value: NO_SETTING,
                },
                ...getSmallCategories(smallResult),
              ]
            : info.row.original.SMALL.id !== ''
              ? [
                  {
                    label: NO_SETTING,
                    value: NO_SETTING,
                  },
                  ...getSmallCategories(smallResult),
                ]
              : [
                  {
                    label: NO_SETTING,
                    value: NO_SETTING,
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
              className="border-none h-[30px] text-xs min-w-[159px]  rounded-md  !py-0  !pl-0 !shadow-none !text-left bg-[#EBF1F7]"
              defaultValue={
                info.row.original.type !== EventCalendarType.TASK
                  ? undefined
                  : info.row.original.SMALL.id
                    ? optionSmall.find(
                        (element) =>
                          element.value ===
                            (info.row.original.SMALL.id
                              ? info.row.original.SMALL.id
                              : NO_SETTING) || {
                            label: info.row.original.SMALL.name,
                            value: info.row.original.SMALL.id,
                          },
                      )
                    : {
                        label: NO_SETTING,
                        value: NO_SETTING,
                      }
              }
              isDisabled={
                !isPermissionAction ||
                info.row.original.type !== EventCalendarType.TASK
              }
              placeholder=""
              showArrow
              options={removeDuplicateOptions(optionSmall)}
              onChange={(e) => {
                if (info.row.original.type === EventCalendarType.TASK) {
                  editCategoryInline({
                    id: info.row.original.id,
                    categoryIds: [
                      {
                        categoryId:
                          e?.value == NO_SETTING ? null : (e?.value as number),
                        type: EventWorkCategory.SMALL,
                      },
                      {
                        categoryId:
                          info.row.original.LARGE.id == NO_SETTING
                            ? null
                            : (info.row.original.LARGE.id as number),
                        type: EventWorkCategory.LARGE,
                      },
                      {
                        categoryId:
                          info.row.original.MEDIUM.id == NO_SETTING
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
                          e?.value == NO_SETTING ? null : (e?.value as number),
                        type: EventWorkCategory.SMALL,
                      },
                      {
                        categoryId:
                          info.row.original.LARGE.id == NO_SETTING
                            ? null
                            : (info.row.original.LARGE.id as number),
                        type: EventWorkCategory.LARGE,
                      },
                      {
                        categoryId:
                          info.row.original.MEDIUM.id == NO_SETTING
                            ? null
                            : (info.row.original.MEDIUM.id as number),
                        type: EventWorkCategory.MEDIUM,
                      },
                    ],
                  });
                }
              }}
              forceMenuPlacementBottom
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
        // Check permission with close date
        const isPermissionCloseDate = isCheckPermissionWithCloseDate({
          dateA: rowData.createdAt,
          dateB: session?.user.company.startEditableDate || '',
        });
        return (
          <div
            className={`font-bold text-xs mt-2 relative ${isHasChild ? 'top-[-12px]' : 'top-[-3px]'}  min-w-[150px]`}>
            {isRowParent && isAnyRunning ? (
              <p>計測中</p>
            ) : (
              <div className="flex text-[10px] w-full justify-center items-center px-[14px]">
                <div className="bg-transparent pr-1 w-full">
                  <div className="w-full">
                    <Input
                      defaultValue={
                        isRowParent
                          ? resultParentDuration?.startedAt
                          : `${rowData.startedAt}`
                      }
                      type="text"
                      disabled={
                        !isPermissionAction ||
                        isRowParent ||
                        !isPermissionCloseDate
                      }
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
                      className="! !h-[30px] !py-0 bg-[#EBF1F7] text-black !text-sm !pb-[2px] font-normal rounded-[3px] !px-0 text-center !border-none  !opacity-100"
                    />
                  </div>
                </div>
                <div className="h-full flex-shrink-0 flex items-center text-base font-normal text-[#77858F]">
                  ~
                </div>
                <div className="bg-transparent pl-1 w-full">
                  <div className="w-full">
                    <Input
                      disabled={
                        !isPermissionAction ||
                        isRowParent ||
                        row.original.isRunning ||
                        !isPermissionCloseDate
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
                        const data = isEndTimeLater(
                          row.original.startedAt as string,
                          formatTimeInput(
                            `${convertToMinutesNumber(e.target.value)}`,
                          ),
                        );

                        if (data) {
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
                      className={`${row.original.isRunning && 'cursor-not-allowed'} !w-full rounded-[3px] !h-[30px] !py-0 bg-[#EBF1F7] text-black !pb-[2px] !text-sm font-normal text-center  !px-0 !border-none  !opacity-100`}
                    />
                  </div>
                </div>
              </div>
            )}
            {isParent && (
              <div className="text-base font-medium text-blacks mt-3 text-end mr-[19px]">
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
            className="flex gap-1 items-center justify-center cursor-pointer min-w-[110px]"
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

  const { hoursConvert, minutesConvert } = convertToJapaneseValue(
    `${dataStatistic?.totalDuration}`,
  );
  const {
    hoursConvert: hoursConvertDifferent,
    minutesConvert: minutesConvertDifferent,
  } = convertToJapaneseValue(`${dataStatisticPDF?.subOrganization.duration}`);
  let mainHours = hoursConvert - hoursConvertDifferent;
  let mainMinute = minutesConvert - minutesConvertDifferent;

  if (mainMinute < 0) {
    mainMinute += 60;
    mainHours -= 1;
  }
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
    if (!isSameDate(newDate, currentDate)) {
      setIsLoading(true);
    }
    setCurrentDate(newDate);
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

    if (!isSameDate(newDate, currentDate)) {
      setIsLoading(true);
    }
    setCurrentDate(newDate);

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
      if (!isSameDate(newDate, currentDate)) {
        setIsLoading(true);
      }
      setCurrentDate(newDate);

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

    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() - 1);
    setCurrentDate(newDate);

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
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + 1);
    if (!isSameDate(newDate, currentDate)) {
      setIsLoading(true);
    }
    setCurrentDate(newDate);

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
  const rowRefs = useRef<(HTMLTableRowElement | null)[]>([]);

  const divRef = useRef<HTMLDivElement | null>(null);

  const handleDownloadPDF = async () => {
    if (!divRef.current) return;

    // --- show DOM offscreen so html2canvas can render ---
    divRef.current.style.visibility = 'visible';
    divRef.current.style.position = 'absolute';
    divRef.current.style.left = '-9999px';
    divRef.current.style.top = '0';

    await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 150)));

    // --- snapshot chart if exists ---
    const chartElem = document.getElementById('chart-to-pdf');
    const dpr = window.devicePixelRatio || 1;

    let chartImgData = '';
    if (chartElem) {
      const chartCanvas = await html2canvas(chartElem, {
        scale: 2 * dpr,
        useCORS: true,
      });
      chartImgData = chartCanvas.toDataURL('image/png');
    }

    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfW = pdf.internal.pageSize.getWidth();
    const pdfH = pdf.internal.pageSize.getHeight();

    // margins (mm)
    const marginTop = 10;
    const marginBottom = 10;
    const marginLeft = 10; // <-- left/right margin in mm
    const marginRight = marginLeft;

    // helpers convert
    const mmToPx = (mm: number) => mm / 0.264583;
    const usableHeightMm = pdfH - marginTop - marginBottom;
    const usableHeightPx = mmToPx(usableHeightMm); // px available per page content area

    // content width in mm (inside horizontal margins)
    const contentWidthMm = pdfW - marginLeft - marginRight;

    // --- compute table pagination (your original logic) ---
    const headerElem = divRef.current.querySelector(
      '.pdf-header',
    ) as HTMLElement;
    const headerHpx = headerElem?.getBoundingClientRect().height || 0;
    const theadHpx = 50; // kept from your logic
    const headerHeightPx = headerHpx + theadHpx;

    let curHeight = headerHeightPx;
    const currentRows: number[][] = [[]];

    for (let i = 0; i < rowRefs.current.length; i++) {
      const row = rowRefs.current[i];
      if (!row) continue;
      const rowH = row.getBoundingClientRect().height;
      if (curHeight + rowH > usableHeightPx) {
        currentRows.push([i]);
        curHeight = headerHeightPx + rowH;
      } else {
        currentRows[currentRows.length - 1].push(i);
        curHeight += rowH;
      }
    }

    // --- render table pages (exactly once) ---
    let pdfPageIndex = 0;
    for (let p = 0; p < currentRows.length; p++) {
      const clone = divRef.current.cloneNode(true) as HTMLElement;
      clone.style.position = 'static';
      clone.style.left = '0';

      // remove rows not on this page
      const allTrs = clone.querySelectorAll('tr.custom-tr');
      allTrs.forEach((tr, idx) => {
        if (!currentRows[p].includes(idx)) tr.remove();
      });

      // remove header for pages > 0
      if (p > 0) clone.querySelector('.pdf-header')?.remove();

      // replace chart with snapshot image (if any)
      if (chartImgData) {
        const chartContainer = clone.querySelector('#chart-to-pdf');
        if (chartContainer) {
          const img = document.createElement('img');
          img.src = chartImgData;
          img.style.width = '180px';
          img.style.height = '180px';
          chartContainer.innerHTML = '';
          chartContainer.appendChild(img);
        }
      }

      // remove remark while rendering table pages
      clone.querySelector('.pdf-remark')?.remove();

      // attach to DOM and capture
      document.body.appendChild(clone);
      await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 50)));
      const canvas = await html2canvas(clone, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
      });
      document.body.removeChild(clone);

      const imgData = canvas.toDataURL('image/jpeg', 1.0);
      // compute image height (mm) to fit contentWidthMm
      const imgHeightMm = (canvas.height * contentWidthMm) / canvas.width;

      // first page: no addPage(), subsequent pages: addPage()
      if (pdfPageIndex > 0) pdf.addPage();
      // place image with left margin
      pdf.addImage(
        imgData,
        'JPEG',
        marginLeft,
        marginTop,
        contentWidthMm,
        imgHeightMm,
      );
      pdfPageIndex++;
    }

    // --- Now render remark: ALWAYS START FROM A NEW PAGE ---
    const remarkRoot = divRef.current.querySelector(
      '.pdf-remark',
    ) as HTMLElement | null;
    if (remarkRoot) {
      const remarkTitle = remarkRoot.querySelector(
        '.remark-title',
      ) as HTMLElement | null;
      const remarkContent = remarkRoot.querySelector(
        '.remark-content',
      ) as HTMLElement | null;

      if (remarkContent) {
        // total content height in px
        const totalPx = remarkContent.scrollHeight;
        let offsetPx = 0;

        // padding inside each slice (px)
        const slicePaddingPx = 12;

        // measure title height in px (if present)
        const titleHpx = remarkTitle
          ? remarkTitle.getBoundingClientRect().height
          : 0;

        let isFirstRemarkPage = true;

        // We'll always start remark on a new PDF page
        // Make sure we are not on an empty fresh PDF (we already have pages from table). Add page to start remark.
        pdf.addPage();
        // pdfPageIndex++; // not strictly necessary

        while (offsetPx < totalPx) {
          // reserved px for title only on first remark page
          const reservedForTitle = isFirstRemarkPage ? titleHpx : 0;

          // available px for content area (px) inside the box (we reserve slicePadding top/bottom)
          const availablePx = Math.max(
            20,
            Math.floor(usableHeightPx - reservedForTitle - slicePaddingPx * 2),
          );

          // determine how many px of actual content we will show this slice
          const sliceContentPx = Math.min(availablePx, totalPx - offsetPx);

          // build wrapper sized to content width in px
          const wrapper = document.createElement('div');
          // convert content width mm -> px to set wrapper width
          const contentWidthPx = Math.max(
            100,
            divRef.current.clientWidth -
              mmToPx(marginLeft) -
              mmToPx(marginRight),
          );
          wrapper.style.width = `${contentWidthPx}px`;
          wrapper.style.boxSizing = 'border-box';
          wrapper.style.background = '#ffffff';
          wrapper.style.padding = '0';
          wrapper.style.margin = '0 auto';

          // outer box with left/right border and optional top/bottom border
          const box = document.createElement('div');
          box.style.boxSizing = 'border-box';
          box.style.width = '100%';
          // left/right border
          box.style.borderLeft = '1px solid #77858F';
          box.style.borderRight = '1px solid #77858F';
          // top border only for first slice
          box.style.borderTop = isFirstRemarkPage
            ? '1px solid #77858F'
            : 'none';

          // add title in first slice if exists
          if (isFirstRemarkPage && remarkTitle) {
            const t = remarkTitle.cloneNode(true) as HTMLElement;
            t.style.transform = 'none';
            box.appendChild(t);
          }

          // viewport holds the moved fullContent
          const viewport = document.createElement('div');
          viewport.style.overflow = 'hidden';
          viewport.style.position = 'relative';
          viewport.style.width = '100%';
          // padding inside viewport (left/right to simulate spacing)
          viewport.style.padding = `${slicePaddingPx}px 12px`;
          viewport.style.boxSizing = 'border-box';

          // moving contains the whole remark content moved up by offsetPx
          const moving = remarkContent.cloneNode(true) as HTMLElement;
          moving.style.position = 'relative';
          moving.style.top = `-${offsetPx}px`;
          moving.style.margin = '0';
          // keep width consistent
          moving.style.width = '100%';

          viewport.appendChild(moving);
          box.appendChild(viewport);
          wrapper.appendChild(box);

          document.body.appendChild(wrapper);
          await new Promise((r) =>
            requestAnimationFrame(() => setTimeout(r, 30)),
          );

          // set exact viewport height in px
          const viewportPx = Math.max(20, availablePx + slicePaddingPx * 2);
          viewport.style.height = `${viewportPx}px`;

          await new Promise((r) =>
            requestAnimationFrame(() => setTimeout(r, 30)),
          );

          // if this slice is the last chunk, add bottom border
          const isLastSlice = offsetPx + sliceContentPx >= totalPx - 1;
          if (isLastSlice) box.style.borderBottom = '1px solid #77858F';
          else box.style.borderBottom = 'none';

          // capture wrapper
          const sliceCanvas = await html2canvas(wrapper, {
            scale: 2,
            useCORS: true,
            backgroundColor: '#ffffff',
          });
          document.body.removeChild(wrapper);

          const imgData = sliceCanvas.toDataURL('image/jpeg', 1.0);
          const imgHeightMm =
            (sliceCanvas.height * contentWidthMm) / sliceCanvas.width;

          // place slice image into PDF (we already added a new page before loop; for subsequent slices addPage())
          // For the first iteration we already called pdf.addPage() above; if this is not the first loop, add a new page
          if (!isFirstRemarkPage) {
            pdf.addPage();
          }
          pdf.addImage(
            imgData,
            'JPEG',
            marginLeft,
            marginTop,
            contentWidthMm,
            imgHeightMm,
          );

          // advance
          offsetPx += sliceContentPx;
          isFirstRemarkPage = false;
        } // end while
      }
    }

    // save pdf
    pdf.save(
      `${formatShowDateJapanese(currentDate)}_${session?.user.profile.fullName}_日報.pdf`,
    );

    // cleanup
    divRef.current.style.visibility = 'hidden';
    divRef.current.style.position = 'absolute';
    divRef.current.style.left = '-9999px';
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
  const detailDateInfo = getDateInfoFull(currentDate);

  return (
    <div className="flex  flex-col ">
      <div className="h-[calc(100vh_-_83px)] overflow-y-auto">
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
                  selected={currentDate}
                  maxDate={new Date()}
                  dateFormat={DATE_TEXT_FORMAT}
                  minDate={getMinDateOfYear(2023)}
                  onChange={(e) => {
                    handleChooseDay(e as Date);
                  }}
                />
              </div>
              {!isTodaySchedule(currentDate) && (
                <ImageRound
                  onClick={() => handleNextDay()}
                  className=" h-fit w-fit cursor-pointer"
                  src="/icons/right-statistic.svg"
                  name="right"
                />
              )}
            </div>
            <div className="flex gap-[10px]">
              <Button
                variant="outline"
                className="border-none h-[34px] w-[48px] !px-0 !py-0"
                onClick={() => {
                  if (!isYesterdaySchedule(currentDate)) {
                    handleYesterDay();
                  }
                }}>
                昨日
              </Button>
              <Button
                variant="outline"
                className="border-none h-[34px] w-[48px] !px-0 !py-0"
                onClick={() => {
                  if (!isTodaySchedule(currentDate)) {
                    handleCurrentDay();
                  }
                }}>
                今日
              </Button>
              {isPermissionDailyTeam && (
                <Link
                  href={`${pageRouters.DAILY_REPORT_TEAM.href}?tabId=1`}
                  className="bg-white flex items-center ml-[10px] justify-center gap-2 text-sm text-[#77858F] font-medium w-[158px] h-[34px] rounded-md">
                  <span>チームの日報一覧</span>
                  <div className="flex items-center justify-center w-[18px] h-[18px] bg-[#EBF1F7] rounded-full">
                    <ImageRound
                      className=" h-[8px] w-fit cursor-pointer relative left-[0.5px]"
                      src="/icons/right-statistic.svg"
                      name="right"
                    />
                  </div>
                </Link>
              )}
            </div>
          </div>

          <div className="flex gap-4 items-center">
            <div className="flex items-center gap-3">
              {isPermissionAction && (
                <Button
                  className="flex gap-2 px-0 py-0 w-[138px] h-[34px]"
                  onClick={() => {
                    if (!isLoadingDownload) return;
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
        </header>
        <div className="mt-4 flex gap-3">
          <div
            style={{
              boxShadow: '0px 4px 10px 0px #0000000D',
            }}
            className="w-[262px] flex-shrink-0 px-5 bg-[#F8FAFC] h-[calc(100vh_-_177px)] rounded-[30px] daily-custom  overflow-y-auto">
            <p className=" pt-[30px] text-[#77858F] mb-2">スケジュール実績</p>
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
              initialDate={currentDate}
              eventOverlap={true}
              slotEventOverlap={true}
              selectMirror={true}
              locales={[jaLocale]}
              locale="ja"
            />
          </div>
          <div
            style={{
              boxShadow: '0px 4px 10px 0px #0000000D',
            }}
            className="w-[calc(100%_-_260px)] h-[calc(100vh_-_177px)] font-medium overflow-y-auto mr-5 bg-[#F8FAFC] p-[30px] rounded-[30px]">
            <div className="overflow-y-auto">
              <p className="text-base text-[#77858F]">カテゴリーの割合</p>
              <div className="flex pt-5">
                <section className="flex-1 max-w-[360px]">
                  {chartData?.data && (
                    <PieChart
                      colors={chartData.colors}
                      data={chartData?.data}
                      labels={chartData?.labels}
                      actualValues={chartData?.actualValue}
                      className="w-[280px] h-[280px] ml-5 "
                      colorLabel="white"
                    />
                  )}
                </section>

                <section className="flex-1 flex flex-col items-start gap-4 justify-start">
                  <div className="w-fit  h-14 flex items-center font-medium justify-center gap-1 text-[34px]">
                    <span className="text-sm font-medium pt-4 mr-2">
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

                  {dataCategory
                    .filter((item) => item.percent > 0)
                    .map((item, index) => {
                      return (
                        <div
                          key={index}
                          className="flex items-start justify-start gap-5 text-base font-medium">
                          <div className="flex items-start justify-center gap-1  ">
                            <div
                              style={{
                                backgroundColor: item.color,
                              }}
                              className={`w-3 h-3 mt-[7px] rounded-full `}></div>
                            <span className="w-[200px] break-all">
                              {item.categoryName}
                            </span>
                          </div>
                          <div className="flex items-center gap-5">
                            <div className="ml-[30px] w-[100px] flex items-start">
                              {convertToJapaneseTime(item.duration)}
                            </div>
                            <div>{item.percent}%</div>
                          </div>
                        </div>
                      );
                    })}
                </section>
              </div>
            </div>
            <div className="mt-5 h-[548px]">
              <p className="text-base font-medium text-[#77858F] mb-3">
                タスク一覧
              </p>
              <Table
                classCustom="!py-0"
                className="border border-[#D2DBE1] !ring-0 bg-white h-[496px] !pt-0 overflow-y-auto py-0 rounded-[10px]">
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
                            className=" py-2 !px-0 text-left !text-xs font-medium !text-[#77858F]">
                            {flexRender(
                              header.column.columnDef.header,
                              header.getContext(),
                            )}
                          </th>
                        ) : (
                          index > 1 && (
                            <th
                              key={header.id}
                              style={{ width: '150px' }}
                              className={`${
                                index === 3 || index === 4
                                  ? 'border-r border-[#D2DBE1] w-[150px]'
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
                            <div className="w-[18px]"></div>
                          </td>
                          {row
                            .getVisibleCells()
                            .slice(1, 4)
                            .map((cell, cellIndex) => (
                              <td
                                key={cell.id}
                                style={{ width: '20%' }}
                                className={`!pt-0 !pb-1 !pl-0 ${cellIndex !== 2 ? '!pr-0' : '!pr-[18px]'}`}>
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
                                className={`py-2 !px-0 border-l  ${!isParent && cellIndex === 1 && 'border-l-0'} bg-transparent border-b !pr-0 border-[#D2DBE1]`}>
                                {flexRender(
                                  cell.column.columnDef.cell,
                                  cell.getContext(),
                                )}
                              </td>
                            ))}
                        </tr>
                        {/* The sub row with the title cell takes up 4 columns */}
                        <tr
                          className={`${row.depth > 0 ? 'bg-[#F8FAFC] ' : 'bg-white'}  !border-none !pr-0`}>
                          <td
                            colSpan={3}
                            className={`text-left !pt-0 !pl-0 overflow-hidden  !pr-[18px]  border-b border-[#D2DBE1]`}>
                            <div
                              className={`flex items-center justify-between  ${isHasChild && 'pb-[19px]'} ${!isParent && 'relative top-[-4px]'}`}>
                              <div className=" w-full break-all text-base font-medium text-black flex items-start gap-[6px]">
                                {row.getCanExpand() && row.depth === 0 && (
                                  <button
                                    className="bg-[#EBF1F7] rounded-full w-6 h-6 text-sm text-primary font-normal"
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
                                  <div className=" rounded-full w-6 h-6 text-sm text-primary font-normal"></div>
                                )}
                                <p
                                  className={`flex-1 ${row.depth > 0 && 'bg-transparent pt-2'} line-clamp-2`}>
                                  {row.original.title || '-'}
                                </p>
                              </div>
                              <div className="text-left !pt-0 !pl-2">
                                <ActionDetailDaily
                                  row={row}
                                  optionsTag={
                                    row.original.organization
                                      ? creationDataCommonData?.myStatistics?.find(
                                          (item) =>
                                            String(item.id) ==
                                            String(row.original.organization),
                                        )
                                      : undefined
                                  }
                                  dataTagsList={row.original.tags.map(
                                    (org) => ({
                                      label: String(org.name),
                                      value: String(org.id),
                                    }),
                                  )}
                                  isEvent={
                                    row.original.type ===
                                    EventCalendarType.SCHEDULE
                                  }
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
              <p className="text-[#77858F]">備考</p>
              <ResizeTextArea
                currentDate={currentDate}
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
          className="w-[794px]"
          style={{
            visibility: 'hidden',
            position: 'absolute',
            left: '-9999px',
          }}>
          <div className="w-full overflow-y-auto px-5">
            <div className="pdf-header">
              <div className="flex items-center py-1 justify-between text-lg border-b border-b-gray-400 border-l-[2px] border-l-black pl-[2px]">
                <div className="w-full  flex items-end gap-3 -translate-y-[25%]">
                  <span className="text-[30px] ml-3 font-medium -translate-y-[10%]">
                    日報
                  </span>
                  <div className="flex items-end gap-2 font-medium   relative top-[2px]">
                    <span>{detailDateInfo.year}</span>
                    <span className="">年</span>
                    <span>{detailDateInfo.month}</span>
                    <span className="">月</span>
                    <span>{detailDateInfo.day}</span>
                    <span className="">日</span>
                    <span className="">({detailDateInfo.weekday})</span>
                  </div>
                </div>
                <div className="flex text-lg items-center gap-1 h-full basis-1/2 py-1 justify-end">
                  <p className=" max-w-[170px] flex-shrink-0 w-fit font-medium break-all py-1 min-h-5">
                    {dataStatisticPDF?.remark?.user?.organizations?.name}
                  </p>
                  <span className=" max-w-[170px] flex-shrink-0 w-fit min-h-5 break-all ">
                    {session?.user.profile.fullName}
                  </span>
                </div>
              </div>

              <div className="mt-5">
                <div className="flex gap-2">
                  <section className="w-[180px]">
                    {chartDataPDF?.data && (
                      <PieChart
                        id="chart-to-pdf"
                        colors={chartDataPDF.colors}
                        data={chartDataPDF?.data}
                        labels={chartDataPDF?.labels}
                        actualValues={chartDataPDF?.actualValue}
                        colorLabel="black"
                        className="w-[180px] h-[180px] rounded-full "
                      />
                    )}
                  </section>
                  <section className="flex-1 flex flex-col  gap-1 pt-1 ml-4">
                    <div className="w-full max-w-[95%]  bg-white h-fit pb-2 font-normal border-b border-black flex gap-1 items-center  text-sm ">
                      <span className="mr-2 text-base">合計時間</span>
                      <span className="text-lg font-medium -translate-y-[5%]">
                        {hoursConvert}
                      </span>
                      <span className=" ">時間</span>
                      <span className="text-lg font-medium -translate-y-[5%]">
                        {minutesConvert}
                      </span>
                      <span className="mr-4">分</span>
                      <div>
                        <div className="flex items-center gap-1 text-xs">
                          <span className="">メインチーム</span>
                          <span className="">
                            {dataStatisticPDF?.subOrganization?.percent
                              ? 100 - dataStatisticPDF?.subOrganization?.percent
                              : 100}
                            %
                          </span>
                          <div className="flex items-center gap-1">
                            (<span className="">{mainHours}</span>
                            <span>時間</span>
                            <span className="">{mainMinute}</span>
                            <span>分</span>)
                          </div>
                        </div>
                        <div className="flex items-center gap-1 text-xs">
                          <span className="">サブチーム</span>
                          <span className="">
                            {dataStatisticPDF?.subOrganization?.percent}%
                          </span>
                          <div className="flex items-center gap-1">
                            (<span className="">{hoursConvertDifferent}</span>
                            <span>時間</span>
                            <span className="">{minutesConvertDifferent}</span>
                            <span>分</span>)
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex">
                      <div className="basis-1/2 px-[2px]">
                        {dataCategoryPDF
                          .filter((cate) => cate.id !== 'その他')
                          .map((item, index) => {
                            return (
                              <div
                                key={index}
                                className="flex items-center gap-[6px] mt-1 w-full text-xs">
                                <div
                                  style={{
                                    backgroundColor: item.color,
                                  }}
                                  className={`w-3 h-3 border border-black  relative top-[-1px] `}></div>
                                <p className=" break-all h-5 max-w-[150px] w-fit line-clamp-3">
                                  {item.categoryName}
                                </p>
                                <p className=" w-fit h-5 mr-1">
                                  {item.percent}%
                                </p>

                                <p className=" w-fit h-5">
                                  {convertToJapaneseTime(item.duration)}
                                </p>
                              </div>
                            );
                          })}
                      </div>
                      <div className="basis-1/2 ">
                        {dataCategoryPDF
                          .filter((cate) => cate.id === 'その他')
                          .map((item, index) => {
                            return (
                              <div
                                key={index}
                                className="flex items-center gap-[2px] mt-1 w-full text-xs">
                                <div
                                  style={{
                                    backgroundColor: '#D1D7DC',
                                  }}
                                  className={`w-3 h-3 border border-black relative top-[-1px] `}></div>
                                <p className=" break-all h-5 max-w-[150px] w-fit line-clamp-3">
                                  {item.categoryName}
                                </p>
                                <p className=" w-fit h-5 mr-1">
                                  {item.percent}%
                                </p>

                                <p className=" w-fit h-5">
                                  {convertToJapaneseTime(item.duration)}
                                </p>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  </section>
                </div>
              </div>
            </div>
            <div className="mt-5">
              <table className="bg-white rounded-none w-full">
                <colgroup>
                  <col style={{ width: '10%' }} />
                  <col style={{ width: '10%' }} />
                  <col style={{ width: '10%' }} />
                  <col style={{ width: '10%' }} />
                  <col style={{ width: '10%' }} />
                  <col style={{ width: '10%' }} />
                  <col style={{ width: '10%' }} />
                  <col style={{ width: '10%' }} />
                  <col style={{ width: '10%' }} />
                  <col style={{ width: '10%' }} />
                </colgroup>
                <thead className="bg-gray-100">
                  <tr className="[&>th]:font-medium border border-black">
                    <th
                      className="!py-2 !px-2 border-r border-b border-b-black border-r-black"
                      colSpan={2}>
                      <div className="flex -translate-y-[10%]  text-xs items-center justify-center gap-2 ">
                        <span>実</span>
                        <span>施</span>
                        <span>時</span>
                        <span>間</span>
                      </div>
                    </th>
                    <th
                      className="!py-2 text-xs  !px-2 border-r border-b border-b-black border-r-black"
                      colSpan={1}>
                      <div className="flex -translate-y-[10%]  text-xs items-center justify-center gap-2 ">
                        <span>時</span>
                        <span>間</span>
                      </div>
                    </th>
                    <th
                      className="!py-2 !px-2 border-b border-b-black"
                      colSpan={7}>
                      <div className="flex text-xs -translate-y-[10%] items-center justify-center gap-2">
                        <span>タ</span>
                        <span>ス</span>
                        <span>ク</span>
                        <span>カ</span>
                        <span>ー</span>
                        <span>ド</span>
                        <span>名</span>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {dataStatisticPDF?.taskDurations.map((item, index) => (
                    <tr
                      ref={(el) => {
                        rowRefs.current[index] = el;
                      }}
                      className={`border-b border-l border-r border-black custom-tr`}
                      key={index}>
                      <td
                        colSpan={2}
                        className="border-r border-black text-center text-xs py-2">
                        <div className="-translate-y-[10%] flex gap-2 justify-center">
                          <span>
                            {' '}
                            {item.startedAt &&
                              convertToTimeString(item.startedAt)}
                          </span>
                          ~
                          <span>
                            {item.pausedAt
                              ? convertToTimeString(item.pausedAt)
                              : '計測中'}
                          </span>
                        </div>
                      </td>

                      <td className="border-r border-black text-center text-xs">
                        <div className="-translate-y-[10%]">
                          {item.startedAt &&
                            calculateTotalMinutes(
                              item.startedAt,
                              item.pausedAt || String(new Date()),
                            )}
                          分
                        </div>
                      </td>
                      <td className=" text-xs px-1" colSpan={7}>
                        <div className="break-all -translate-y-[10%] w-full max-w-[450px] py-2">
                          {item.title}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="pdf-remark">
              <div className="my-[60px] min-h-[200px] border border-gray-500">
                <p className="remark-title text-center py-2 border-b border-gray-500 -translate-y-[25%]">
                  備考
                </p>
                <div className="remark-content  py-1 px-3">
                  <div
                    className="rounded-sm break-all p-1"
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

export default DailyReportBoard;
