'use client';
import React, {
  ChangeEvent,
  useCallback,
  useContext,
  useEffect,
  useMemo,
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
import TaskDailyCard from './taskDailyCard';

import {
  EventWorkCategory,
  PermissionsSystem,
  ScreenName,
  SocketActions,
  StatusValueTask,
} from '@constants/enums';
import { apiRouters } from '@constants/routers';
import { ERROR_UPDATE_MESSAGE } from '@constants/message';

import './styles/statistics.css';
import useDataStatistic from '@hooks/useDataStatistic';
import useCreationDataTask from '@hooks/useCreationDataTask';
import {
  ChildTask,
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
  getColors,
  hasPermissionInArray,
  transformDataTaskDailyToTable,
} from '@utils';
import { useWebSocket } from '@providers/WebSocketProvider';
import { LoadingContext } from '@providers/LoadingProvider';
import { useToast } from '@providers/ToastProvider';
import api from '@base/api';
import SingleSelect from '@components/common/SingleSelect';
import ResizeTextArea from '@components/custom/resizeTextArea';
import Dropdown from '@components/common/Dropdown';
import { NO_OPTION_CATEGORY } from '@constants';
import { useErrorToast } from '@hooks/useErrorToast';

const StatisticBoard = () => {
  const calendarRef = useRef<FullCalendar | null>(null);
  const calendarDownloadRef = useRef<FullCalendar | null>(null);

  const socket = useWebSocket();

  const { data: session } = useSession();

  const { showToast } = useToast();

  const { setIsLoading } = useContext(LoadingContext);
  const showErrorToast = useErrorToast();

  const [currentDate, setCurrentDate] = useState<Date>(new Date());

  const [remarkData, setRemarkData] = useState<string>('');

  const [isSubmitReport, setIsSubmitReport] = useState<boolean | null>(null);

  const { dataStatistic, refetchDataStatistic } = useDataStatistic({
    date: formatDateServer(currentDate),
  });

  const [taskTimeStatisticList, setTaskTimeStatisticList] = useState<
    TaskTimeStatistic[]
  >([]);

  const [dataOrganizationCategories, setDataOrganizationCategories] = useState<
    OrganizationCategories | undefined
  >(undefined);

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

  const createTaskDurationItems = (tasks: dataTaskDaily[]) => {
    return tasks.flatMap((task) =>
      task.taskDurations.map((duration) => ({
        id: `${duration.id}`,
        title: task.title ? task.title : '',
        startedAt: duration.startedAt
          ? new Date(duration.startedAt)
          : new Date(),
        pausedAt: duration.pausedAt ? new Date(duration.pausedAt) : currentDate,
        start: new Date(duration.startedAt),
        end: duration.pausedAt ? new Date(duration.pausedAt) : new Date(),
      })),
    );
  };

  useEffect(() => {
    if (creationDataTaskData) {
      setDataTagsList(
        creationDataTaskData.tags.map((org) => ({
          label: org.name,
          value: org.id,
        })),
      );
    }
  }, [creationDataTaskData]);

  const generatedColors = useMemo(() => {
    if (dataStatistic?.categories?.length) {
      return getColors(dataStatistic.categories.length);
    }
    return [];
  }, [dataStatistic?.categories?.length]);

  useEffect(() => {
    if (dataStatistic) {
      // Generate color

      // Add color for item
      const dataAddColor = dataStatistic.categories.map((item, index) => ({
        color: generatedColors[index],
        categoryName: item.categoryName ? item.categoryName : '未設定',
        duration: item.duration,
        percent: item.percent,
      }));

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
      setIsSubmitReport(dataStatistic?.remark.isSubmit);
      setChartData({
        colors: generatedColors,
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
    taskId: number;
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
          handleResetEndTime(variant.pausedAt.split(' ')[1], variant.id);
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

  //  Handle call api edit remark
  const handleEditRemark = async (data: {
    date: string;
    remark?: string;
    isSubmit?: boolean;
  }) => {
    return await api.post(apiRouters.DATA_REMARK_DAILY, data);
  };
  const { mutate: editRemark } = useMutation(
    'postEditRemark',
    handleEditRemark,
    {
      onSuccess: () => {},
      onError: (error: AxiosError<any>) => {
        setIsLoading(false);
        showErrorToast(error, ERROR_UPDATE_MESSAGE);
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

    editDurationTask({
      id: id,
      taskId: taskId,
      startedAt: combineDateAndTime(
        currentDate,
        `${formatTimeInput(`${convertToMinutesNumber(value)}`)}`,
      ),
    });
    setDataTaskDailyList(updatedTasks);
  };
  const handleChangeEndTime = (
    e: ChangeEvent<HTMLInputElement>,
    id: string,
    taskId: number,
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

    editDurationTask({
      id: id,
      pausedAt: combineDateAndTime(
        currentDate,
        `${formatTimeInput(`${convertToMinutesNumber(value)}`)}`,
      ),
      taskId: taskId,
    });
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
    const statusFirstRow = firstRow.original.status.id;
    const statusSecondRow = secondRow.original.status.id;

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
        PermissionsSystem.STATISTIC_UPDATE,
      )) ||
    (session?.user.permissions &&
      hasPermissionInArray(
        session?.user.permissions,
        PermissionsSystem.STATISTIC_ADD,
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
      header: 'タスクカード名',
      size: 20,
      cell: ({ row }: { row: Row<dataTaskDailyTable> }) =>
        row.getCanExpand() && (
          <button
            className="border border-solid rounded-full w-7 h-7 ml-3 text-xs"
            onClick={() => {
              row.getToggleExpandedHandler(); // Toggle row expanded state
              handleExpandChange(row); // Update expanded state
            }}>
            {row.getIsExpanded()
              ? row.original.children?.length
              : row.original.children?.length}
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
          <div className="text-left custom-statistic">
            <div className="flex justify-between h-full relative">
              <SingleSelect
                className="border-none shadow-none min-w-[140px] h-fit"
                defaultValue={optionData.find(
                  (element) =>
                    element.value ===
                    (info.row.original.LARGE.id
                      ? info.row.original.LARGE.id
                      : NO_OPTION_CATEGORY),
                )}
                isDisabled={!isPermissionAction}
                placeholder=""
                options={optionData}
                onChange={(e) => {
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
                }}
              />
              <div className="flex items-center w-5 h-full absolute -translate-y-1/2 top-1/2 right-0">
                <ImageRound
                  className={`w-5 h-5 `}
                  src="/icons/chevron-right.svg"
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

        return (
          <div className="text-left custom-statistic ">
            <div className="flex justify-between h-full relative">
              <div className="">
                <SingleSelect
                  className="border-none h-6 text-xs min-w-[140px]  !py-0  !pl-0 !shadow-none !text-left !bg-transparent"
                  defaultValue={optionMedium.find(
                    (element) =>
                      element.value ===
                      (info.row.original.MEDIUM.id
                        ? info.row.original.MEDIUM.id
                        : NO_OPTION_CATEGORY),
                  )}
                  isDisabled={!isPermissionAction}
                  placeholder=""
                  options={optionMedium}
                  onChange={(e) => {
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
                  }}
                />
              </div>
              <div className=" flex items-center absolute -translate-y-1/2 top-1/2 right-0">
                <ImageRound
                  className={`w-5 h-5`}
                  src="/icons/chevron-right.svg"
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

        return (
          <div className="text-left  custom-statistic ">
            <SingleSelect
              className="border-none  text-xs !py-0 !pl-0 !shadow-none !text-left !bg-transparent"
              defaultValue={optionSmall.find(
                (element) =>
                  element.value ===
                  (info.row.original.SMALL.id
                    ? info.row.original.SMALL.id
                    : NO_OPTION_CATEGORY),
              )}
              isDisabled={!isPermissionAction}
              placeholder=""
              options={optionSmall}
              onChange={(e) => {
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
              }}
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
          onClick={() => {
            const isAsc = column.getIsSorted() === 'asc';

            const newSortState = isAsc
              ? [{ id: column.id, desc: true }]
              : [{ id: column.id, desc: false }];
            setSortState(newSortState);
            column.toggleSorting();
          }}>
          <p>計測時間</p>
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
                <div className="bg-transparent p-1">
                  <div className="w-12">
                    <Input
                      defaultValue={`${rowData.startedAt}`}
                      type="text"
                      disabled={!isPermissionAction}
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
                          );
                        } else {
                          handleResetStartTime(
                            `${rowData.startedAt}`,
                            row.original.idEdit as string,
                          );
                        }
                      }}
                      className="h-6 !text-xs !px-0 text-center !border-none bg-transparent !opacity-100"
                    />
                  </div>
                </div>
                <div className="h-full flex items-center">
                  <ImageRound
                    className=" w-3 h-3 mt-1 "
                    src="/icons/arrow-right.svg"
                    name="icon arrow right"
                  />
                </div>
                <div className="bg-transparent p-1">
                  <div className="w-12">
                    <Input
                      disabled={!isPermissionAction}
                      defaultValue={`${row.original.isRunning ? '計測中' : rowData.pausedAt}`}
                      type="text"
                      onBlur={(e) => {
                        if (e.target.value === rowData.pausedAt) return;
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
                          );
                        } else {
                          handleResetEndTime(
                            `${rowData.pausedAt}`,
                            row.original.idEdit as string,
                          );
                        }
                      }}
                      className={`${row.original.isRunning && 'cursor-not-allowed'} h-6  !text-xs text-center  !px-0 !border-none bg-transparent !opacity-100`}
                    />
                  </div>
                </div>
              </div>
            )}
            <div className="text-xs">
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
          onClick={() => {
            const isAsc = column.getIsSorted() === 'asc';
            const newSortState = isAsc
              ? [{ id: column.id, desc: true }]
              : [{ id: column.id, desc: false }];
            const defaultState = [{ id: column.id, desc: true }];
            setSortState(sortState.length !== 0 ? newSortState : defaultState);
            column.toggleSorting();
          }}>
          <p>ステータス</p>
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
            className={`text-xs h-[21px] flex items-center justify-center rounded ${info.row.original.status.id === StatusValueTask.MY_ROUTINE ? 'w-[86px]' : 'w-20'}  ${info.row.original.status.name && statusStyles.find((item) => item.value === info.row.original.status.id)?.color}`}>
            {info.row.original.status.name}
          </div>
        </div>
      ),
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
            className={`text-xs -translate-y-[100%] h-[21px] flex items-center justify-center rounded  ${info.row.original.status.id === StatusValueTask.MY_ROUTINE ? 'w-[86px]' : 'w-20'}  ${info.row.original.status.name && statusStyles.find((item) => item.value === info.row.original.status.id)?.color}`}>
            <span className="-translate-y-[30%]">
              {' '}
              {info.row.original.status.name}
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

      if (timeDifference < 60 && start.getHours() < 23) {
        event.end = new Date(end.setTime(start.getTime() + 60 * 60 * 1000));
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

  return (
    <div className="flex  flex-col ">
      <div className="h-[calc(100vh_-_83px)] overflow-y-auto ">
        <header className="flex justify-between   mt-4">
          <div className="flex gap-5 items-center">
            <span className="text-2xl font-medium ">日報</span>
            <div className="w-[260px] z-20 flex gap-0 items-center">
              <Button
                onClick={() => handlePrevDay()}
                className="h-10 bg-white !px-2">
                <ImageRound
                  className=" w-7 h-7 "
                  src="/icons/chevron-left.svg"
                  name="left"
                />
              </Button>
              <DatePicker
                className="h-10"
                selected={currentDate}
                maxDate={new Date()}
                minDate={getMinDateOfYear(2023)}
                onChange={(e) => {
                  handleChooseDay(e as Date);
                }}
              />
              <Button
                disabled={isSameDate(currentDate, new Date())}
                onClick={() => handleNextDay()}
                className="h-10 bg-white !px-2">
                <ImageRound
                  className=" w-7 h-7 "
                  src="/icons/chevron-right.svg"
                  name="right"
                />
              </Button>
            </div>
            <div className="flex gap-4 h-10">
              <Button
                variant="primary"
                onClick={() => {
                  if (!isYesterdaySchedule(currentDate)) {
                    handleYesterDay();
                  }
                }}>
                昨日
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  if (!isTodaySchedule(currentDate)) {
                    handleCurrentDay();
                  }
                }}>
                今日
              </Button>
            </div>
          </div>

          <div className="flex gap-4 h-10 items-center">
            <div className="flex items-center gap-3">
              {isSubmitReport ? (
                <p className="text-primary">提出済</p>
              ) : isSubmitReport !== null ? (
                <p className="text-red-500">未提出</p>
              ) : (
                ''
              )}
              {isPermissionAction && (
                <Button
                  onClick={() => {
                    editRemark({
                      date: formatDateServer(currentDate),
                      isSubmit: !isSubmitReport,
                    });
                    setIsSubmitReport(!isSubmitReport);
                  }}>
                  日報提出
                </Button>
              )}
            </div>
            <div
              onClick={() => {
                if (isSubmitReport) {
                  handleDownloadPDF();
                }
              }}
              className={`border border-solid h-9 w-9 flex items-center justify-center   ${isSubmitReport === true ? 'hover:opacity-70 hover:cursor-pointer ' : 'opacity-60 hover:cursor-not-allowed '}`}>
              <ImageRound
                className=" w-7 h-7 "
                src="/icons/upload.svg"
                name="upload"
              />
            </div>
          </div>
        </header>
        <div className="mt-4 flex gap-3">
          <div className="w-[260px] pl-2 bg-[#ECF0F2] daily-custom h-[calc(100vh_-_155px)] overflow-y-auto">
            <p className="pl-10 pt-3">スケジュール</p>
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
              slotLabelFormat={{
                hour: 'numeric',
                minute: '2-digit',
                omitZeroMinute: false,
                hour12: false,
              }}
              initialDate={currentDate}
              eventOverlap={true}
              slotEventOverlap={true}
              selectMirror={true}
              locales={[jaLocale]}
              locale="ja"
            />
          </div>
          <div className="w-[calc(100%_-_260px)] h-[calc(100vh_-_155px)] overflow-y-auto">
            <div className="h-[371px] overflow-y-auto">
              <p>合計時間</p>
              <div className="flex">
                <section className="flex-1 flex flex-col items-center gap-4 justify-end">
                  <div className="w-fit bg-white px-4 h-14 flex items-center justify-center gap-1 text-[36px] border border-solid rounded-md">
                    {hoursConvert}{' '}
                    <span className="text-sm pt-6 mr-2">時間</span>
                    {minutesConvert} <span className="text-sm pt-6">分</span>
                  </div>
                  <Table>
                    <TableBody>
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
                            <td>{item.categoryName}</td>
                            <td>{convertToJapaneseTime(item.duration)}</td>
                            <td>{item.percent}%</td>
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
            <div className="mt-5 h-[436px]">
              <p className="mb-3">タスクカード</p>
              <Table className=" bg-white h-[384px] !pt-0 overflow-y-auto py-0 mt-2">
                <thead className="bg-gray-100 sticky z-10">
                  {table.getHeaderGroups().map((headerGroup) => (
                    <tr
                      key={headerGroup.id}
                      className="[&>th]:text-gray-700 sticky top-0 bg-gray-100 z-40  [&>th]:font-medium [&>th]:text-base [&>th]:py-3 ">
                      {headerGroup.headers.map((header, index) =>
                        index === 0 ? (
                          <th
                            key={header.id}
                            colSpan={2}
                            className=" p-2 text-left ">
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
                  {table.getRowModel().rows.map((row, index) => (
                    <React.Fragment key={row.id}>
                      <tr
                        className={`${row.depth > 0 ? 'bg-gray-100' : 'bg-white'}`}>
                        <td
                          rowSpan={2}
                          className={`${index === 4 || index === 5 ? '' : ''} border-b`}>
                          {row.original.children &&
                          row.original.children?.length > 1 ? (
                            <button
                              className="border border-solid rounded-full w-7 h-7 text-xs cursor-pointer"
                              onClick={row.getToggleExpandedHandler()}>
                              {row.original.children?.length}
                            </button>
                          ) : (
                            <div className="w-7 h-7"></div>
                          )}
                        </td>
                        {row
                          .getVisibleCells()
                          .slice(1, 5)
                          .map((cell) => (
                            <td key={cell.id} className={`!pt-0 !pb-1 !pl-0`}>
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
                              className="p-2 !pl-2 border-l border-b">
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
                    </React.Fragment>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="mt-5 pb-14">
              <p>備考</p>
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
          className=" max-w-[1440px]"
          style={{
            visibility: 'hidden',
            position: 'absolute',
            left: '-9999px',
          }}>
          <div className="flex gap-3">
            <div className="w-[260px] h-fit pl-2 bg-[#ECF0F2] daily-custom">
              <p className="pl-10 ">スケジュール</p>
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
                initialDate={currentDate}
                slotLabelFormat={{
                  hour: 'numeric',
                  minute: '2-digit',
                  omitZeroMinute: false,
                  hour12: false,
                }}
                eventOverlap={true}
                slotEventOverlap={true}
                selectMirror={true}
                locales={[jaLocale]}
                locale="ja"
              />
            </div>
            <div className="w-[calc(100%_-_260px)]  overflow-y-auto">
              <div className="w-full text-center text-[36px]">
                {formatShowDateJapanese(`${currentDate}`)}
              </div>
              <div className="h-[371px] overflow-y-auto">
                <p>合計時間</p>
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
                        {row.original.todoList.map((item, index) => {
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
    </div>
  );
};

export default StatisticBoard;
