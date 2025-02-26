'use client';
import {
  Fragment,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

import { parseInt } from 'lodash';
import { AxiosError } from 'axios';
import {
  Popover,
  PopoverButton,
  PopoverPanel,
  Transition,
} from '@headlessui/react';

import { useMutation, useQueryClient } from 'react-query';
import { useSession } from 'next-auth/react';
import { DragDropContext, DropResult } from '@hello-pangea/dnd';
import { useRouter, useSearchParams } from 'next/navigation';
import Tippy from '@tippyjs/react';
import 'tippy.js/dist/tippy.css';

import ImageRound from '@components/common/ImageRound';
import ActionsTaskModal from '@components/modals/ActionsTaskModal';
import FrequentlyTask from './frequently-task';
import WarningStartTaskModal from '@components/modals/WarningStartTaskModal';
import TimeSchedule from '@components/layouts/TimeSchedule';
import ConfirmDeleteModal from '@components/modals/ConfirmDeleteModal';
import Dropdown from '@components/common/Dropdown';
import ActionsTemplateModal from '@components/modals/ActionsTemplateModal';
import CardListView from '@components/kanban/CardListView';
import WarningCloseTaskModal from '@components/modals/WarningCloseTaskModal';
import Button from '@components/common/Button';
import InputSearch from '@components/common/InputSearch';
import socketEventEmitter from '@components/socket/socketEventEmitter';
import BoardKanban from '@components/kanban/Board';
import ActionFilterTask from '@components/modals/ActionFilterTask';
import FixedTaskData from './fixed-task';

import useCreationDataTask from '@hooks/useCreationDataTask';
import useTaskBoardList from '@hooks/useTaskBoardList';
import useCalculateDurationTask from '@hooks/useCalculateDurationTask';
import useFrequentlyTasks from '@hooks/useFrequentlyTasks';
import useTemplateList from '@hooks/useTemplateList';
import useDashboardMemberList from '@hooks/useDashBoardMemberList';
import { useErrorToast } from '@hooks/useErrorToast';
import useAuthenticatedUser from '@hooks/useAuthenticatedUser';

import { apiRouters } from '@constants/routers';
import {
  ActionTask,
  EventWorkCategory,
  FilterTypeKanban,
  ItemScheduleType,
  ItemStartType,
  KanbanType,
  SocketActions,
  StatusValueTask,
  TemplateAction,
} from '@constants/enums';
import {
  INITIAL_INDEX_VALUE,
  MY_TEMPLATE,
  NO_OPTION_CATEGORY,
} from '@constants';
import {
  ERROR_CREATE_MESSAGE,
  ERROR_DELETE_MESSAGE,
  ERROR_MESSAGE_OVERLAP_TASK,
  ERROR_SAVE_MESSAGE,
  ERROR_UPDATE_MESSAGE,
  SUCCESS_CREATE_MESSAGE,
  SUCCESS_DELETE_MESSAGE,
  SUCCESS_UPDATE_MESSAGE,
} from '@constants/message';

import {
  Columns,
  StatusTask,
  Task,
  TaskErrorPerson,
  TaskFormData,
  TaskPinResponse,
  TaskRequest,
  UpdateTaskKanbanRequest,
} from '@interfaces/task';
import { ResponseError } from '@interfaces/response';
import { WebSocketMessageSortKanban } from '@interfaces/chat';
import {
  Template,
  TemplateFormData,
  TemplateRequest,
} from '@interfaces/template';
import { User } from '@interfaces/user';

import { TaskContext } from '@providers/TaskProvider';
import { GlobalStateContext } from '@providers/GlobalStateProvider';
import { LoadingContext } from '@providers/LoadingProvider';
import { useToast } from '@providers/ToastProvider';

import {
  addTimeToDate,
  convertDateStringFull,
  convertToCurrentTimezone,
  getRandomDateTimeBetween,
} from '@utils/date';
import { compareItems } from '@utils';
import api from '@base/api';

const createStatusTaskObjectFromArray = (
  array: StatusTask[],
): {
  [key: string]: { id: string | number; title: string; items: Task[] };
} => {
  const result: {
    [key: string]: { id: string | number; title: string; items: Task[] };
  } = {};

  array.forEach((status) => {
    result[`${status.id}`] = {
      id: status.id || '',
      title: status.name,
      items: [],
    };
  });

  return result;
};

const createArrayTaskFromObject = (
  data: Columns,
  columnId: number,
  movedItemId: number,
): UpdateTaskKanbanRequest[] => {
  const newArray: UpdateTaskKanbanRequest[] = [];
  const statusGroup = data[columnId];
  statusGroup.items.forEach((item) => {
    if (item.id == movedItemId)
      newArray.push({
        index: item.index,
        task: item.id,
        status: statusGroup.id,
        pinAt: item.pinAt || null,
      });
    return;
  });

  return newArray;
};

const KanbanBoardTask = () => {
  const queryClient = useQueryClient();

  const { setIsLoading } = useContext(LoadingContext);

  const { data: session } = useSession();
  const {
    searchValue,
    orderingOptions,
    taskSelectedAction,
    memberSelected,
    tagSelected,
    idTaskStarting,
    taskSelected,
    orderingRequest,
    taskSelectedToStart,
    showWarningStartTaskModal,
    showEditTaskModal,
    isLoadingDataTask,
    widthCalendar,
    columnWidth,
    selectedOptionZoom,
    setSelectedOptionZoom,
    setStatusTaskSelected,
    setDataRunning,
    setIdTaskEditSelected,
    setShowEditTaskModal,
    setTaskSelected,
    setShowWarningStartTaskModal,
    setMemberSelected,
    setTagSelected,
    setSearchValue,
    setOrderingRequest,
    setDataActualAddSchedule,
    setIdTaskDelete,
    setColumnWidth,
    setOrderingOptions,
    setDataTaskEditKanban,
  } = useContext(TaskContext);
  const { isExtendCalendar, expanded } = useContext(GlobalStateContext);

  const searchParams = useSearchParams();
  const params = new URLSearchParams(searchParams);

  const exEvents = useRef<HTMLDivElement | null>(null);

  const userIdTask = searchParams.get('user');

  const taskDetailId = searchParams.get('task');

  const templateDetailId = searchParams.get('template');

  const actionType = searchParams.get('action');

  const typeDetail = searchParams.get('type');

  const router = useRouter();

  const { showToast } = useToast();
  const showErrorToast = useErrorToast();

  const isItemDropToDone = useRef(false);

  const [openConfirmDeleteTaskModal, setOpenConfirmDeleteTaskModal] =
    useState(false);
  const [openConfirmDeleteTemplateModal, setOpenConfirmDeleteTemplateModal] =
    useState(false);

  const [isListView, setIsListView] = useState<boolean>(false);

  // Data kanban board
  const [dataItemDrop, setDataItemDrop] = useState<DropResult>();
  const isDragEndExecuteRef = useRef(false);

  const [dataErrorTask, setDataErrorTask] = useState<TaskErrorPerson>();

  const [dataItemAddSchedule, setDataItemAddSchedule] = useState<Task>();

  const [dataItemResizeSchedule, setDataItemResizeSchedule] =
    useState<TaskRequest>();

  const [dataItemChangeInline, setDataItemChangeInline] = useState<Task>();
  const [dataItemUpdateSchedule, setDataItemUpdateSchedule] = useState<Task>();
  const [columnId, setColumnId] = useState<string>('');
  const [peopleDefaultId, setPeopleDefaultId] = useState<string>('');

  const [idTaskDeleteKanban, setIdTaskDeleteKanban] = useState<string>('');
  const [statusTask, setStatusTask] = useState<StatusTask[]>([]);
  const [columnsKanbanData, setColumnsKanbanData] = useState<Columns>();

  const [dataTaskEdit, setDataTaskEdit] = useState<Task | null>(null);
  const [dataTemplateEdit, setDataTemplateEdit] = useState<Template | null>(
    null,
  );
  const [showFrequentlyTasks, setShowFrequentlyTasks] = useState(false);
  const [frequentlyTasks, setFrequentlyTasks] = useState<Task[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [orderTaskSave, setOrderTaskSave] = useState<Task[]>([]);
  const [showTemplateModal, setShowTemplateModal] = useState<boolean>(false);

  const [isReadyToFetch, setIsReadyToFetch] = useState(false);

  const { dashboardMemberList } = useDashboardMemberList();
  const { frequentlyTasks: frequentlyTasksList } = useFrequentlyTasks();
  const { templates: templateList } = useTemplateList();
  const { authenticatedUser } = useAuthenticatedUser();
  const [loggedInUser, setLoggedInUser] = useState<User>();
  const [openWarningCloseModal, setOpenWarningCloseModal] =
    useState<boolean>(false);

  const [dataOrderRing, setDataOrderRing] = useState<string>('');

  const [resetFunctions, setResetFunctions] = useState<{
    resetDataCategoryOptions?: () => void;
    reset?: () => void;
  }>({});

  const [numberPagesData, setNumberPagesData] = useState<
    { id: string; count: number; numPages: number; hasMores: boolean }[]
  >([]);

  // This state below controls whether the position of the dragged and dropped task should be reset after a failed update API call.
  // Every time the call fails, the state will be reversed to the previous state so that the kanban board can be re-rendered.
  const [resetInitialColumnsData, setResetInitialColumnsData] =
    useState<boolean>(true);

  // Call API get task board list
  const { taskBoardList, numberPages } = useTaskBoardList(
    {
      search: searchValue,
      tagId: `${tagSelected}`,
      userId: `${memberSelected}` || `${userIdTask ? userIdTask : ''}`,
    },
    orderingRequest,
    statusTask,
    isReadyToFetch,
    orderingOptions,
  );
  useEffect(() => {
    if (numberPages) {
      setNumberPagesData(numberPages);
    }
  }, [numberPages]);

  useEffect(() => {
    if (authenticatedUser) {
      setLoggedInUser(authenticatedUser);
    }
  }, [authenticatedUser]);

  // Call api (hook) get creation data task. Data such as: tags, status, types, priorities
  const { creationDataTaskData } = useCreationDataTask({});

  useEffect(() => {
    if (dataItemResizeSchedule) {
      setColumnsKanbanData((prevData) => {
        if (!prevData) return prevData;

        const newData = { ...prevData };

        for (const [key, column] of Object.entries(newData)) {
          const itemIndex = column.items.findIndex(
            (item) => item.id === parseInt(`${dataItemResizeSchedule.id}`),
          );

          if (itemIndex !== -1) {
            const currentTaskSchedules = column.items[itemIndex]?.taskSchedules;

            const newTaskSchedules =
              currentTaskSchedules?.length &&
              dataItemResizeSchedule.taskSchedules?.[0]
                ? [
                    {
                      planStartDate:
                        dataItemResizeSchedule.taskSchedules?.[0]
                          ?.planStartDate ||
                        currentTaskSchedules?.[0]?.planStartDate,
                      planEndDate:
                        dataItemResizeSchedule.taskSchedules?.[0]
                          ?.planEndDate ||
                        currentTaskSchedules?.[0]?.planEndDate,
                    },
                    ...currentTaskSchedules.slice(1),
                  ]
                : [];

            const updatedItem = {
              ...column.items[itemIndex],
              taskSchedules: newTaskSchedules,
            };

            newData[key] = {
              ...column,
              items: [
                ...column.items.slice(0, itemIndex),
                updatedItem,
                ...column.items.slice(itemIndex + 1),
              ],
            };
            break;
          }
        }

        return newData;
      });

      setDataItemResizeSchedule(undefined);
    }
  }, [dataItemResizeSchedule, setDataItemResizeSchedule]);

  useEffect(() => {
    if (frequentlyTasksList) {
      setFrequentlyTasks(frequentlyTasksList.data);
    }
  }, [frequentlyTasksList]);

  useEffect(() => {
    if (templateList) {
      setTemplates(templateList.data);
    }
  }, [templateList]);

  useEffect(() => {
    if (userIdTask) {
      setMemberSelected(userIdTask);
      return;
    }
  }, [setMemberSelected, setTagSelected, userIdTask]);

  // Handle effect when component unmount. If in develop mode. React strict-mode make below code run when component mount too
  useEffect(() => {
    return () => {
      setMemberSelected('');
      setTagSelected('');
      setSearchValue('');
      setOrderingRequest('');
      setOrderTaskSave([]);
    };
  }, [setMemberSelected, setOrderingRequest, setTagSelected, setSearchValue]);

  // If there is a status, the status will be re-set
  useEffect(() => {
    if (creationDataTaskData) {
      setStatusTask(creationDataTaskData.status);
    }
  }, [creationDataTaskData]);

  // If there is dataTask and status, it will map to create data for kanban based on the Columns interface
  useEffect(() => {
    if (taskBoardList && statusTask && statusTask.length) {
      const initialColumn = createStatusTaskObjectFromArray(statusTask);
      taskBoardList.forEach((item) => {
        const statusId = item.status && item.status.id;
        for (const key in initialColumn) {
          if (initialColumn[key].id === statusId) {
            initialColumn[key].items.push(item);
            break;
          }
        }
      });

      setColumnsKanbanData(initialColumn);
    }
  }, [statusTask, taskBoardList]);
  // Update date task
  const updateTaskDates = ({
    taskId,
    newStartDate,
    newEndDate,
  }: {
    taskId: number;
    newStartDate: string;
    newEndDate: string;
  }) => {
    setColumnsKanbanData((prevColumns) => {
      const updatedColumns = { ...prevColumns };
      for (const columnKey in updatedColumns) {
        const column = updatedColumns[columnKey];
        const updatedItems = column.items.map((task) =>
          task.id === taskId
            ? {
                ...task,
                taskSchedules:
                  task.taskSchedules && task.taskSchedules.length
                    ? [
                        {
                          ...task.taskSchedules[0],
                          planStartDate: newStartDate,
                          planEndDate: newEndDate,
                        },
                        ...task.taskSchedules.slice(1),
                      ]
                    : [
                        {
                          planStartDate: newStartDate,
                          planEndDate: newEndDate,
                        },
                      ],
              }
            : task,
        );

        updatedColumns[columnKey] = { ...column, items: updatedItems };
      }

      return updatedColumns;
    });
  };

  // Add  or Update item into kanban
  const handleAddOrUpdateItem = (
    newItem: Task,
    actionType?: string,
    idCopy?: string,
  ) => {
    setDataItemAddSchedule(newItem);
    const comparisonId = userIdTask ? userIdTask : session?.user.id;
    const personExists = newItem.peopleInCharge.some(
      (person) => `${person.id}` === `${comparisonId}`,
    );

    if (!personExists) {
      let found = false;
      const newData = { ...columnsKanbanData };

      Object.keys(newData).forEach((key) => {
        const items = newData[key].items;
        const itemIndex = items.findIndex(
          (item) => `${item.id}` === `${newItem.id}`,
        );

        if (itemIndex !== -1) {
          items.splice(itemIndex, 1);
          found = true;
        }
      });

      if (found) {
        setColumnsKanbanData(newData);
      }
      return;
    }
    if (newItem.status && newItem.status.id) {
      const statusId = newItem.status.id.toString();
      const currentItems = columnsKanbanData
        ? columnsKanbanData[statusId].items
        : [];

      const itemIndex = currentItems.findIndex(
        (item) => `${item.id}` === `${newItem.id}`,
      );
      let currentStatusId = null;
      for (const [key, column] of Object.entries(columnsKanbanData || [])) {
        const itemIndex = column.items.findIndex((item) => {
          return item.id === newItem.id;
        });

        if (itemIndex !== -1) {
          currentStatusId = key;
          break;
        }
      }

      if (itemIndex === -1) {
        if (currentStatusId) {
          setColumnsKanbanData((prevData) => {
            if (!prevData) return prevData;

            const updatedCurrentItems = prevData[currentStatusId].items.filter(
              (item) => item.id !== newItem.id,
            );
            if (searchValue.length > 0) {
              return {
                ...prevData,
                [currentStatusId]: {
                  ...prevData[currentStatusId],
                  items: updatedCurrentItems,
                },
                [statusId]: {
                  ...prevData[statusId],
                  items: [newItem, ...prevData[statusId].items],
                },
              };
            } else {
              return {
                ...prevData,
                [currentStatusId]: {
                  ...prevData[currentStatusId],
                  items: updatedCurrentItems,
                },
                [statusId]: {
                  ...prevData[statusId],
                  items: [...prevData[statusId].items, newItem],
                },
              };
            }
          });
        } else {
          const matchedPageData = numberPagesData.find(
            (pageData) => `${pageData.id}` === `${statusId}`,
          );
          let isLastItemPinned = false;
          const column = columnsKanbanData?.[newItem.status.id];

          if (column && column.items.length > 0) {
            const lastItem = column.items[column.items.length - 1];
            isLastItemPinned = !!lastItem.pinAt;
          }
          if (searchValue.length > 0) {
            if (matchedPageData && matchedPageData.hasMores) {
              setNumberPagesData((prevNumberPages) =>
                prevNumberPages.map((item) =>
                  `${item.id}` === `${statusId}`
                    ? { ...item, count: item.count + 1 }
                    : item,
                ),
              );
            } else {
              setColumnsKanbanData((prevData) => {
                if (!prevData) return prevData;
                return {
                  ...prevData,
                  [statusId]: {
                    ...prevData[statusId],
                    items:
                      matchedPageData && matchedPageData.hasMores
                        ? [...prevData[statusId].items]
                        : [
                            ...prevData[statusId].items.filter(
                              (item) => item.id !== newItem.id,
                            ),
                            newItem,
                          ],
                  },
                };
              });
            }
          } else {
            if (actionType === ActionTask.COPY) {
              const itemCopyIndex = currentItems.findIndex(
                (item) => `${item.id}` === `${idCopy}`,
              );
              if (itemCopyIndex !== -1) {
                setColumnsKanbanData((prevData) => {
                  if (!prevData) return prevData;
                  return {
                    ...prevData,
                    [statusId]: {
                      ...prevData[statusId],
                      items: [newItem, ...prevData[statusId].items].sort(
                        compareItems,
                      ),
                    },
                  };
                });
              } else {
                setColumnsKanbanData((prevData) => {
                  if (!prevData) return prevData;
                  return {
                    ...prevData,
                    [statusId]: {
                      ...prevData[statusId],
                      items: [newItem, ...prevData[statusId].items].sort(
                        compareItems,
                      ),
                    },
                  };
                });
              }
            } else {
              if (
                matchedPageData &&
                matchedPageData.hasMores &&
                isLastItemPinned
              ) {
                return;
              } else {
                setColumnsKanbanData((prevData) => {
                  if (!prevData) return prevData;
                  return {
                    ...prevData,
                    [statusId]: {
                      ...prevData[statusId],
                      items: [newItem, ...prevData[statusId].items].sort(
                        compareItems,
                      ),
                    },
                  };
                });
              }
            }
          }
        }
      } else {
        setColumnsKanbanData((prevData) => {
          if (!prevData) return prevData;
          const updatedItems = prevData[statusId].items.map((item) =>
            `${item.id}` === `${newItem.id}` ? newItem : item,
          );
          return {
            ...prevData,
            [statusId]: {
              ...prevData[statusId],
              items: updatedItems,
            },
          };
        });
      }
    }
  };
  // Update item in kanban in kanban
  const handleUpdateItem = useCallback(
    (newItem: Task, oldColumn?: string) => {
      setFrequentlyTasks((prevFrequentlyTasks) =>
        prevFrequentlyTasks.map((item) => {
          if (`${item.id}` === `${newItem.id}`) {
            return {
              ...newItem,
            };
          }
          return item;
        }),
      );
      setDataItemUpdateSchedule(newItem);

      if (newItem.status && newItem.status.id && columnsKanbanData) {
        const newStatusId = newItem.status.id.toString();
        const matchedPageData = numberPagesData.find(
          (pageData) =>
            `${pageData.id}` === `${newItem.status && newItem.status.id}`,
        );

        // Find the current column where the item resides
        let currentStatusId = null;
        let currentItemIndex = null;
        for (const [key, column] of Object.entries(columnsKanbanData)) {
          const itemIndex = column.items.findIndex(
            (item) => item.id === newItem.id,
          );
          if (itemIndex !== -1) {
            currentStatusId = key;
            currentItemIndex = itemIndex;
            break;
          }
        }

        if (currentStatusId === null) {
          if (newItem.pinAt) {
            setColumnsKanbanData((prevData) => {
              if (!prevData) return prevData;

              setNumberPagesData((prevState) =>
                prevState.map((item) => {
                  if (`${item.id}` === `${oldColumn}`) {
                    return { ...item, count: item.count - 1 };
                  }
                  return item;
                }),
              );
              return {
                ...prevData,
                [newStatusId]: {
                  ...prevData[newStatusId],
                  items: [
                    ...prevData[newStatusId].items.filter(
                      (item) => item.id !== newItem.id,
                    ),
                    newItem,
                  ].sort(compareItems),
                },
              };
            });
          } else {
            setColumnsKanbanData((prevData) => {
              if (!prevData) return prevData;
              if (matchedPageData && matchedPageData.hasMores) {
                setNumberPagesData((prevState) =>
                  prevState.map((item) => {
                    if (item.id === newStatusId) {
                      return { ...item, count: item.count + 1 };
                    } else if (item.id === oldColumn) {
                      return { ...item, count: item.count - 1 };
                    }
                    return item;
                  }),
                );
                if (oldColumn) {
                  return {
                    ...prevData,
                    [oldColumn as string]: {
                      ...prevData[oldColumn],
                      items: prevData[oldColumn].items.filter(
                        (item) => item.id !== newItem.id,
                      ),
                    },
                  };
                }
              } else {
                setNumberPagesData((prevState) =>
                  prevState.map((item) => {
                    if (item.id === oldColumn) {
                      return { ...item, count: item.count - 1 };
                    }
                    return item;
                  }),
                );
                return {
                  ...prevData,

                  [newStatusId]: {
                    ...prevData[newStatusId],
                    items: [
                      ...prevData[newStatusId].items.filter(
                        (item) => item.id !== newItem.id,
                      ),
                      newItem,
                    ].sort(compareItems),
                  },
                };
              }
            });
          }
        } else {
          // Item found, update its column
          setColumnsKanbanData((prevData) => {
            if (!prevData) return prevData;
            // Remove item from the current column
            const updatedCurrentItems = prevData[currentStatusId].items.filter(
              (item) => item.id !== newItem.id,
            );
            // Add item to the new column
            let updatedNewItems;
            if (newStatusId === currentStatusId) {
              // If the item is in the same column, keep its position
              updatedNewItems = [
                ...updatedCurrentItems.slice(0, currentItemIndex as number),
                newItem,
                ...updatedCurrentItems.slice(currentItemIndex as number),
              ];
            } else {
              // If the item is moved to a different column, append to the end of new column
              if (newItem.pinAt) {
                const updatedNewItems = [
                  ...prevData[newStatusId].items.filter(
                    (item) => item.id !== newItem.id,
                  ),
                  newItem,
                ];

                updatedNewItems.sort(compareItems);

                return {
                  ...prevData,
                  [newStatusId]: {
                    ...prevData[newStatusId],
                    items: updatedNewItems,
                  },
                  [currentStatusId]: {
                    ...prevData[currentStatusId],
                    items: prevData[currentStatusId].items.filter(
                      (item) => item.id !== newItem.id,
                    ),
                  },
                };
              } else {
                let isLastItemPinned = false;
                const column = columnsKanbanData?.[newStatusId];

                if (column && column.items.length > 0) {
                  const lastItem = column.items[column.items.length - 1];
                  isLastItemPinned = !!lastItem.pinAt;
                }
                if (
                  matchedPageData &&
                  matchedPageData.hasMores &&
                  isLastItemPinned
                ) {
                  setNumberPagesData((prevState) =>
                    prevState.map((item) => {
                      if (item.id === newStatusId) {
                        return { ...item, count: item.count + 1 };
                      }
                      return item;
                    }),
                  );
                  return {
                    ...prevData,
                    [currentStatusId]: {
                      ...prevData[currentStatusId],
                      items: prevData[currentStatusId].items.filter(
                        (item) => item.id !== newItem.id,
                      ),
                    },
                  };
                } else {
                  const updatedNewItems = [
                    ...prevData[newStatusId].items.filter(
                      (item) => item.id !== newItem.id,
                    ),
                    newItem,
                  ];
                  updatedNewItems.sort(compareItems);
                  return {
                    ...prevData,
                    [currentStatusId]: {
                      ...prevData[currentStatusId],
                      items: prevData[currentStatusId].items.filter(
                        (item) => item.id !== newItem.id,
                      ),
                    },
                    [newStatusId]: {
                      ...prevData[newStatusId],
                      items: updatedNewItems,
                    },
                  };
                }
              }
            }

            return {
              ...prevData,
              [currentStatusId]: {
                ...prevData[currentStatusId],
                items: updatedCurrentItems,
              },
              [newStatusId]: {
                ...prevData[newStatusId],
                items: updatedNewItems,
              },
            };
          });
        }
      }
    },
    [columnsKanbanData, numberPagesData],
  );

  // Update  item inline
  const handleUpdateItemInline = useCallback(
    (data: Task) => {
      setDataItemChangeInline(data);
      setFrequentlyTasks((prevFrequentlyTasks) =>
        prevFrequentlyTasks.map((item) => {
          if (`${item.id}` === `${data.id}`) {
            return {
              ...item,
              isStart: data.isStart !== undefined ? data.isStart : item.isStart,
              status: data.status || item.status,
            };
          }
          return item;
        }),
      );
      setColumnsKanbanData((prevData) => {
        if (!prevData) return prevData;

        const updatedColumns = { ...prevData };
        let currentColumnKey: string | null = null;
        let foundItem = null;
        let itemIndex = -1;

        const matchedPageData = numberPagesData.find(
          (pageData) => `${pageData.id}` === `${data.status && data.status.id}`,
        );

        for (const [key, column] of Object.entries(prevData)) {
          itemIndex = column.items.findIndex(
            (item) => `${item.id}` === `${data.id}`,
          );

          if (itemIndex !== -1) {
            currentColumnKey = key;
            foundItem = { ...column.items[itemIndex] };
            break;
          }
        }

        if (!foundItem || !currentColumnKey) return prevData;
        const updatedItem = {
          ...foundItem,
          id: data.id ? data.id : foundItem.id,
          title: data.title || foundItem.title,
          tags: data.tags,
          deadline: data.deadline ? `${data.deadline}` : foundItem.deadline,
          isStart:
            data.isStart !== undefined ? data.isStart : foundItem.isStart,
          status: data.status,
          index: data.index || foundItem.index,
          pinAt: data.pinAt ? data.pinAt : foundItem.pinAt,
        };

        if (data.title || data.title === '') {
          updatedItem.title = data.title || '';
        }

        if (data.deadline) {
          updatedItem.deadline = `${data.deadline}`;
        }
        if (data.status && data.status.id !== foundItem.status?.id) {
          const newColumnKey = data.status.id as number;

          updatedColumns[currentColumnKey].items.splice(itemIndex, 1);

          if (data.pinAt) {
            setNumberPagesData((prevState) =>
              prevState.map((item) => {
                if (item.id === currentColumnKey) {
                  return { ...item, count: item.count };
                }
                return item;
              }),
            );

            updatedColumns[newColumnKey].items.push(updatedItem);
            updatedColumns[newColumnKey].items.sort(compareItems);
          } else {
            let isLastItemPinned = false;
            const column = columnsKanbanData?.[newColumnKey as number];
            if (column && column.items.length > 0) {
              const lastItem = column.items[column.items.length - 1];
              isLastItemPinned = !!lastItem.pinAt;
            }
            if (
              matchedPageData &&
              matchedPageData.hasMores &&
              isLastItemPinned
            ) {
              setNumberPagesData((prevState) =>
                prevState.map((item) => {
                  if (Number(item.id) === newColumnKey) {
                    return { ...item, count: item.count + 1 };
                  } else if (item.id === currentColumnKey) {
                    return { ...item, count: item.count };
                  }
                  return item;
                }),
              );
            } else {
              if (!updatedColumns[newColumnKey]) {
                updatedColumns[newColumnKey] = {
                  id: newColumnKey,
                  title: '',
                  items: [],
                };
              }

              updatedColumns[newColumnKey].items.push(updatedItem);

              updatedColumns[newColumnKey].items.sort(compareItems);
            }
          }
        } else {
          updatedColumns[currentColumnKey].items[itemIndex] = updatedItem;
          updatedColumns[currentColumnKey].items.sort(compareItems);
        }

        return updatedColumns;
      });
    },

    [columnsKanbanData, numberPagesData],
  );
  // Update Item start
  const handleUpdateItemStart = useCallback(
    (data: { id: string; isStart: boolean; type: string; title?: string }) => {
      if (data.type === ItemStartType.TASK) {
        setFrequentlyTasks((prevFrequentlyTasks) =>
          prevFrequentlyTasks.map((item) => {
            if (`${item.id}` === `${data.id}`) {
              return {
                ...item,
                isStart:
                  data.isStart !== undefined ? data.isStart : item.isStart,
              };
            }
            return item;
          }),
        );
        setColumnsKanbanData((prevData) => {
          if (!prevData) return prevData;

          const updatedColumns = { ...prevData };
          let currentColumnKey: string | null = null;
          let foundItem = null;
          let itemIndex = -1;
          for (const [key, column] of Object.entries(prevData)) {
            itemIndex = column.items.findIndex(
              (item) => `${item.id}` === `${data.id}`,
            );

            if (itemIndex !== -1) {
              currentColumnKey = key;
              foundItem = { ...column.items[itemIndex] };
              break;
            }
          }

          if (!foundItem || !currentColumnKey) return prevData;

          const updatedItem = {
            ...foundItem,
            isStart:
              data.isStart !== undefined ? data.isStart : foundItem.isStart,
          };
          setDataItemChangeInline({
            ...updatedItem,
            type: data.type,
            title: data.title || updatedItem.title,
          });

          updatedColumns[currentColumnKey].items[itemIndex] = updatedItem;

          return updatedColumns;
        });
      } else {
        setDataItemChangeInline({
          id: parseInt(`${data.id}`.replace('event', '')),
          isStart: data.isStart,
          type: data.type,
          title: '',
          deadline: '',
          description: '',
          taskSchedules: [],
          index: 0,
          isMyTask: true,
          createdAt: new Date(),
          peopleInCharge: [],
          tags: [],
          taskDuration: '',
        });
      }
    },
    [],
  );

  const handleEditShowClockItem = (taskId: number, isToday: boolean = true) => {
    setColumnsKanbanData((prevColumns) => {
      const updatedColumns = { ...prevColumns };
      for (const columnKey in updatedColumns) {
        const column = updatedColumns[columnKey];
        const updatedItems = column.items.map((task) =>
          task.id === taskId
            ? {
                ...task,
                isScheduleInToday: isToday,
              }
            : task,
        );

        updatedColumns[columnKey] = { ...column, items: updatedItems };
      }

      return updatedColumns;
    });
  };

  // Delete item in kanban in kanban
  const handleDeleteItem = (id: number) => {
    setIdTaskDelete(`${id}`);
    if (`${id}` === `${taskSelected.value}`) {
      setTaskSelected({
        label: '',
        value: '',
      });
    }
    setColumnsKanbanData((prevData) => {
      if (!prevData) return prevData;

      const updatedData = Object.entries(prevData).reduce(
        (acc, [key, column]) => {
          const updatedItems = column.items.filter((item) => item.id !== id);

          return {
            ...acc,
            [key]: {
              ...column,
              items: updatedItems,
            },
          };
        },
        {} as Columns,
      );

      return updatedData;
    });
  };
  useEffect(() => {
    if (taskSelectedAction) {
      handleUpdateItemStart({
        id: `${taskSelectedAction.id}`,
        isStart: taskSelectedAction.isStart,
        type: taskSelectedAction.type,
        title: taskSelectedAction.title,
      });
    }
  }, [handleUpdateItemStart, taskSelectedAction]);

  //  Handle call api update index task when drag and drop
  const handleUpdateTaskIndex = async (data: {
    tasks: UpdateTaskKanbanRequest[];
  }) => {
    return await api.put(apiRouters.UPDATE_TASK_INDEX, data);
  };

  // Handle update index task and response
  const { mutate: updateTaskIndex } = useMutation(
    'postUpdateTaskIndex',
    handleUpdateTaskIndex,
    {
      onSuccess: async () => {},
      onError: () => {
        // When an error occurs, change the state to re-render the kanban board to its old state
        setResetInitialColumnsData(!resetInitialColumnsData);
      },
      onSettled: () => {
        isItemDropToDone.current = false;
      },
    },
  );

  //  Handle call api update status task when drag and drop
  const handleUpdateTaskStatus = async ({
    id,
    data,
  }: {
    id: string | number;
    data: {
      statusId: number;
    };
  }) => {
    setIsLoading(true);
    return await api.patch(apiRouters.TASK_DETAIL(`${id}`), data);
  };

  // Handle update status task and response
  const { mutate: updateTaskStatus } = useMutation(
    'postUpdateTaskStatus',
    handleUpdateTaskStatus,
    {
      onSuccess: () => {},
      onError: () => {
        setResetInitialColumnsData(!resetInitialColumnsData);
      },
      onSettled: () => {
        isItemDropToDone.current = false;
        setTimeout(() => {
          setIsLoading(false);
        }, 500);
      },
    },
  );

  // Function handle when drag and drop item is end. Instant, execute function (mutation above) update index task
  const handleChangeBoard = useCallback(
    async (data: Columns, dataItemDrop: DropResult) => {
      if (searchValue) {
        updateTaskStatus({
          id: dataItemDrop.draggableId,
          data: { statusId: Number(dataItemDrop.destination?.droppableId) },
        });
      } else {
        let arrayNewTaskIndex = createArrayTaskFromObject(
          data,
          parseInt(dataItemDrop?.destination?.droppableId as string),
          parseInt(dataItemDrop?.draggableId),
        );
        //If the kanban board belongs to a member, the user id will be transmitted, similarly to the kanban board belonging to a tag.
        // If it belongs to the currently logged in user, the user and tag attributes will be null
        if (memberSelected || tagSelected) {
          arrayNewTaskIndex = arrayNewTaskIndex.map((item) => ({
            ...item,
            user: memberSelected || null,
            tag: tagSelected || null,
          }));
        } else {
          arrayNewTaskIndex = arrayNewTaskIndex.map((item) => ({
            ...item,
            user: session?.user.id || null,
            tag: null,
          }));
        }
        // Set default data when delete item unpin drag in local
        if (arrayNewTaskIndex.length === 0) {
          arrayNewTaskIndex = [
            {
              index: INITIAL_INDEX_VALUE * 1000,
              status: dataItemDrop.destination?.droppableId as string,
              task: parseInt(dataItemDrop.draggableId),
              pinAt: null,
              user: session?.user.id,
              isBeginUnpin: true,
            },
          ];
        }
        updateTaskIndex({ tasks: arrayNewTaskIndex });
      }
    },
    [
      memberSelected,
      tagSelected,
      searchValue,
      session?.user.id,
      updateTaskIndex,
      updateTaskStatus,
    ],
  );
  const { calculateDurationTask: handleStartNewTask } =
    useCalculateDurationTask({
      onSuccess: async (response) => {
        const data = response.data;
        taskSelectedToStart &&
          handleUpdateItemStart({
            id:
              taskSelectedToStart.type === ItemStartType.TASK
                ? `${taskSelectedToStart.id}`
                : `${`${taskSelectedToStart.id}`.replace('event', '')}event`,
            isStart: true,
            type: `${taskSelectedToStart.type}`,
          });
        await new Promise<void>((resolve) => {
          taskSelectedToStart &&
            setTaskSelected({
              label: taskSelectedToStart?.title,
              value: taskSelectedToStart.id,
              type: taskSelectedToStart.type,
            });
          resolve();
        });
        queryClient.refetchQueries(['getDataTaskHeaderList']);
        queryClient.refetchQueries(['getTaskHeaderStart']);
        setStatusTaskSelected((prev) => {
          return {
            ...prev,
            isStart: true,
          };
        });
        if (data) {
          const startDateActual = new Date(
            convertToCurrentTimezone(`${data.planStartDate}`),
          );
          const endDateActual = new Date(
            convertToCurrentTimezone(`${data.planEndDate}`),
          );
          setDataActualAddSchedule({
            ...data,
            start: startDateActual,
            end: endDateActual,
            id: data.id.toString(),
            startEditable: false,
            resourceId: ItemScheduleType.ACTUAL,
            type: ItemStartType.TASK,
            isMyTask: false,
          });
        }
      },
    });

  const handleConfirmStartNewTask = async () => {
    handleUpdateItemStart({
      id:
        idTaskStarting.type === ItemStartType.TASK
          ? `${idTaskStarting.id}`
          : `${idTaskStarting.id}event`,
      isStart: false,
      type: idTaskStarting.type,
    });
    taskSelectedToStart &&
      handleStartNewTask({
        id: `${taskSelectedToStart.id}`.replace('event', ''),
        type: `${taskSelectedToStart.type}`,
      });
    setShowWarningStartTaskModal(false);
    taskSelectedToStart &&
      setDataRunning({
        id: `${taskSelectedToStart.id}`,
        type: `${taskSelectedToStart.type}`,
      });
  };
  const onDragEnd = useCallback(
    async (result: DropResult) => {
      const { source, destination, type } = result;
      if (result.reason === 'CANCEL' || !destination || !columnsKanbanData) {
        return;
      }

      const sourceColumn = columnsKanbanData[source.droppableId];
      const itemDataTask = sourceColumn.items[source.index];

      if (!itemDataTask) return;

      try {
        if (type === KanbanType.COLUMN) {
          // Handle column sorting
          const newColumnOrder = Array.from(Object.keys(columnsKanbanData));
          const [removed] = newColumnOrder.splice(source.index, 1);
          newColumnOrder.splice(destination.index, 0, removed);
          const newColumns = newColumnOrder.reduce((acc, columnId) => {
            acc[columnId] = columnsKanbanData[columnId];
            return acc;
          }, {} as Columns);
          setColumnsKanbanData(newColumns);
          return;
        } else {
          if (
            source.droppableId == String(StatusValueTask.MY_ROUTINE) &&
            destination.droppableId != String(StatusValueTask.MY_ROUTINE)
          )
            return;

          if (
            source.droppableId != String(StatusValueTask.MY_ROUTINE) &&
            destination.droppableId == String(StatusValueTask.MY_ROUTINE)
          )
            return;
          const sourceColumn = columnsKanbanData[source.droppableId];
          const destColumn = columnsKanbanData[destination.droppableId];
          let sourceItems = Array.from(sourceColumn.items);
          const destItems =
            source.droppableId === destination.droppableId
              ? sourceItems
              : Array.from(destColumn.items);
          const [movedItem] = sourceItems.splice(source.index, 1); // Remove item from its original position

          // Update the status of the item when dropped into a new column
          movedItem.status = {
            id: parseInt(destination.droppableId),
            name: destColumn.title,
          };

          const prevMovedItem =
            source.droppableId === destination.droppableId
              ? sourceItems[destination.index - 1]
              : destItems[destination.index - 1];
          const nextMovedItem =
            source.droppableId === destination.droppableId
              ? sourceItems[destination.index]
              : destItems[destination.index];

          // Check if the item has `pin`
          if (movedItem.pinAt) {
            // Check if the item is being dropped between non-pinned items
            const prevItem = destItems[destination.index - 1];
            const nextItem = destItems[destination.index];

            const isPrevItemNotPinned = !prevItem || !prevItem.pinAt;
            const isNextItemNotPinned = !nextItem || !nextItem.pinAt;

            // If both previous and next items are not pinned, move the item to the top of the column
            if (isPrevItemNotPinned && isNextItemNotPinned) {
              destItems.unshift({
                ...movedItem,
                pinAt: convertDateStringFull(new Date()), // Update new pin time
              }); // Move the item to the top of the column
            } else {
              // If not dropped at the top, calculate the `index` as before
              const dateAtPrev = prevMovedItem ? prevMovedItem.pinAt : null;
              const dateAtNext = nextMovedItem ? nextMovedItem.pinAt : null;

              const newPinAt = getRandomDateTimeBetween(dateAtNext, dateAtPrev);
              const newSource = sourceItems.map((item) => {
                if (item.id === movedItem.id) {
                  return {
                    ...item,
                    pinAt: newPinAt,
                  };
                }
                return item;
              });

              sourceItems = [...newSource];
              destItems.splice(destination.index, 0, {
                ...movedItem,
                pinAt: `${newPinAt}`,
              });
            }
          } else {
            // If the item after has a pin, move the item to the end of the pinned list and the beginning of the non-pinned list
            if (nextMovedItem && nextMovedItem.pinAt) {
              const pinnedItems = destItems.filter((item) => item.pinAt); // Filter items with pins
              const nonPinnedItems = destItems.filter((item) => !item.pinAt); // Filter items without pins

              // Check to see if the trimmer also has a battery or not
              const column = columnsKanbanData?.[destination.droppableId];

              let isLastItemPinned = false;

              if (column && column.items.length > 0) {
                const lastItem = column.items[column.items.length - 1];
                isLastItemPinned = !!lastItem.pinAt; // Check if `pinAt` exists (true if it does, false if it doesn't)
              }
              // Gets hasMores value if found, otherwise returns null
              const resultHasNext = numberPagesData.find(
                (item) => `${item.id}` === `${destination.droppableId}`,
              );
              const hasMoresValue = resultHasNext
                ? resultHasNext.hasMores
                : null;

              if (hasMoresValue && isLastItemPinned) {
                pinnedItems.push();
                setNumberPagesData((prevState) =>
                  prevState.map((item) => {
                    if (item.id === destination.droppableId) {
                      return { ...item, count: item.count + 1 };
                    }
                    return item;
                  }),
                );
              } else {
                pinnedItems.push({
                  ...movedItem,
                  index: nonPinnedItems.length
                    ? nonPinnedItems[0].index + INITIAL_INDEX_VALUE
                    : INITIAL_INDEX_VALUE * 1000,
                });
              }

              // Update the list of items
              destItems.splice(
                0,
                destItems.length,
                ...pinnedItems,
                ...nonPinnedItems,
              ); // Merge pinned and non-pinned lists
            } else {
              // If there is no pin, drop the item in the correct position in the non-pinned group

              let prevItemIndex = prevMovedItem
                ? prevMovedItem.index
                : INITIAL_INDEX_VALUE;
              if (prevMovedItem && prevMovedItem.pinAt) {
                prevItemIndex = INITIAL_INDEX_VALUE;
              }
              const nextItemIndex = nextMovedItem
                ? nextMovedItem.index
                : -INITIAL_INDEX_VALUE;

              movedItem.index =
                prevItemIndex === INITIAL_INDEX_VALUE ||
                nextItemIndex === INITIAL_INDEX_VALUE
                  ? prevItemIndex + nextItemIndex
                  : (prevItemIndex + nextItemIndex) / 2;

              const pinnedItems = destItems.filter((item) => item.pinAt); // Filter items with pins
              const nonPinnedItems = destItems.filter((item) => !item.pinAt); // Filter items without pins

              nonPinnedItems.splice(
                destination.index - pinnedItems.length,
                0,
                movedItem,
              ); // Drop in the correct position

              // Update the list of items
              destItems.splice(
                0,
                destItems.length,
                ...pinnedItems,
                ...nonPinnedItems,
              ); // Merge pinned and non-pinned lists
            }
          }

          // Update the state of the columns
          if (source.droppableId === destination.droppableId) {
            // When the item is dropped in the same column
            setColumnsKanbanData({
              ...columnsKanbanData,
              [source.droppableId]: {
                ...sourceColumn,
                items: destItems, // Update the items list for the column
              },
            });
          } else {
            // When the item is dropped in a different column
            setColumnsKanbanData({
              ...columnsKanbanData,
              [source.droppableId]: {
                ...sourceColumn,
                items: sourceItems, // Update the items list for the source column
              },
              [destination.droppableId]: {
                ...destColumn,
                items: destItems, // Update the items list for the destination column
              },
            });
          }
          setFrequentlyTasks((prevFrequentlyTasks) =>
            prevFrequentlyTasks.map((item) => {
              if (`${item.id}` === `${movedItem.id}`) {
                return {
                  ...item,
                  status: {
                    id: parseInt(destination.droppableId),
                    name: destColumn.title,
                  },
                };
              }
              return item;
            }),
          );

          setDataItemDrop(result);
          isDragEndExecuteRef.current = true;
          return;
        }
      } catch (error) {
        // TODO: Handle error
      }
    },
    [columnsKanbanData],
  );

  // Only call onChange when columns data updated and handleDragEnd executed
  useEffect(() => {
    if (columnsKanbanData && dataItemDrop && isDragEndExecuteRef.current) {
      handleChangeBoard(columnsKanbanData, dataItemDrop);
      isDragEndExecuteRef.current = false;
    }
  }, [columnsKanbanData, dataItemDrop, handleChangeBoard]);

  const handleSetParam = ({
    id,
    action,
  }: {
    id: string | null;
    action: string;
  }) => {
    if (id) {
      params.set('task', id);
    }
    params.set('action', action);
    params.set('type', ItemStartType.TASK);
    router.push(`?${params.toString()}`);
  };
  const handleRemoveParam = () => {
    const params = new URLSearchParams(searchParams);
    params.delete('task');
    params.delete('action');
    params.delete('type');

    router.replace(`?${params.toString()}`);
    setShowEditTaskModal(false);
  };
  const handleSetTemplateParam = ({
    id,
    action,
    type,
  }: {
    id: string | null;
    action: string;
    type: string;
  }) => {
    if (id) {
      params.set('template', id);
    }
    params.set('action', action);
    params.set('type', type);
    router.push(`?${params.toString()}`);
  };
  const handleRemoveTemplateParam = () => {
    const params = new URLSearchParams(searchParams);
    params.delete('template');
    params.delete('action');
    params.delete('type');

    router.replace(`?${params.toString()}`);
    setShowTemplateModal(false);
  };
  const handleActionEditTemplate = (id: number) => {
    handleSetTemplateParam({
      id: `${id}`,
      action: TemplateAction.EDIT,
      type: 'TEMPLATE',
    });
  };

  const handleCreateTaskFromTemplate = (id?: number) => {
    if (id) {
      getDataDetailTemplate({ id, action: TemplateAction.CREATE });
    }
  };

  // Edit task
  const handleGetDataDetailTask = async (id: number) => {
    setIsLoading(true);
    const { data: response } = await api.get(apiRouters.TASK_DETAIL(`${id}`));
    return response;
  };

  const { mutate: getDataDetailTask } = useMutation(
    'getDetailTask',
    handleGetDataDetailTask,
    {
      onSuccess: async (data) => {
        setDataTaskEdit(data);
        setIdTaskEditSelected('');
        setShowEditTaskModal(true);
      },
      onError: () => {
        handleRemoveParam();
      },
      onSettled: () => {
        setTimeout(() => {
          setIsLoading(false);
        }, 200);
      },
    },
  );

  const handleGetDataDetailTemplate = async ({
    id,
  }: {
    id: number;
    action?: TemplateAction;
  }) => {
    setIsLoading(true);
    const { data: response } = await api.get(apiRouters.TASK_DETAIL(`${id}`));
    return response;
  };

  const { mutate: getDataDetailTemplate } = useMutation(
    'getDetailTemplate',
    handleGetDataDetailTemplate,
    {
      onSuccess: async (data, variables) => {
        setIdTaskEditSelected('');
        if (variables.action == TemplateAction.DETAIL) {
          setDataTemplateEdit(data);
          setShowTemplateModal(true);
        } else {
          handleSetParam({
            id: null,
            action: ActionTask.CREATE,
          });
          setDataTaskEdit(data);
          setShowEditTaskModal(true);
        }
      },
      onError: () => {
        handleRemoveTemplateParam();
      },
      onSettled: () => {
        setTimeout(() => {
          setIsLoading(false);
        }, 200);
      },
    },
  );
  const handleActionEditTask = (id: number) => {
    handleSetParam({
      id: `${id}`,
      action: ActionTask.EDIT,
    });
  };
  //  Handle call api edit task
  const handleEditTask = async (data: TaskRequest) => {
    setIsLoading(true);
    return await api.patch(apiRouters.TASK_DETAIL(`${data.id}`), data);
  };
  const { mutate: editTask } = useMutation('postEditTask', handleEditTask, {
    onSuccess: async ({ data }, variant) => {
      if (variant && variant.oldIdStatus) {
        handleUpdateItem(
          {
            ...data,
            type: ItemStartType.TASK,
          },
          `${variant.oldIdStatus}`,
        );
      } else {
        handleUpdateItem({
          ...data,
          type: ItemStartType.TASK,
        });
      }
      setDataTaskEditKanban({
        label: variant.title || '',
        value: variant.id || '',
        type: ItemStartType.TASK,
      });
      queryClient.refetchQueries(['getDataTaskHeaderList']);

      handleRemoveParam();
      showToast({
        description: SUCCESS_UPDATE_MESSAGE,
      });
      setDataTaskEdit(null);
    },
    onError: ({
      response,
    }: ResponseError<{
      detail: TaskErrorPerson;
      taskSchedules: TaskErrorPerson;
    }>) => {
      if (response?.data.detail) {
        setDataErrorTask(response?.data.detail);
      } else if (response?.data.taskSchedules) {
        showToast({
          variant: 'error',
          description: ERROR_MESSAGE_OVERLAP_TASK,
        });
      } else {
        showToast({
          variant: 'error',
          description: ERROR_UPDATE_MESSAGE,
        });
      }
    },
    onSettled: () => {
      setTimeout(() => {
        setIsLoading(false);
      }, 500);
    },
  });
  //  Handle call api edit task
  const handleEditTaskInline = async (dataTask: TaskRequest) => {
    const { data } = await api.patch<Task>(
      apiRouters.TASK_DETAIL(`${dataTask.id}`),
      dataTask,
    );
    return data;
  };
  const { mutate: editTaskInline } = useMutation(
    'postEditTaskInline',
    handleEditTaskInline,
    {
      onSuccess: async (data: Task) => {
        handleUpdateItemInline({
          ...data,
          pinAt: data.pinAt ? data.pinAt : null,
          id: data.id,
          status: data.status,
          index: data.index,
          categories: [],
        });
      },
      onError: ({ response }: ResponseError<{ detail: TaskErrorPerson }>) => {
        if (response?.data.detail) {
          setDataErrorTask(response?.data.detail);
        }
        showToast({
          variant: 'error',
          description: ERROR_UPDATE_MESSAGE,
        });
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

    const peopleInChargeIds =
      data.peopleInChargeIds &&
      data.peopleInChargeIds
        .filter((item) => item.value !== '')
        .map((item) => ({ peopleInChargeId: item.value }));

    const planList = data.plans
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
          `${data.categories.LARGE.value}` == NO_OPTION_CATEGORY
            ? null
            : `${data.categories.LARGE.value}`,
        type: EventWorkCategory.LARGE,
      });
    }
    if (data.categories.MEDIUM.value) {
      newWorkCategories.push({
        categoryId:
          `${data.categories.MEDIUM.value}` == NO_OPTION_CATEGORY
            ? null
            : `${data.categories.MEDIUM.value}`,
        type: EventWorkCategory.MEDIUM,
      });
    }
    if (data.categories.SMALL.value) {
      newWorkCategories.push({
        categoryId:
          `${data.categories.SMALL.value}` == NO_OPTION_CATEGORY
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
          : null,
      description: data.description,
      tagIds: tagIds,
      categoryIds: newWorkCategories,
      isImportant: data.isImportant,
      todoList: todoListData,
      taskSchedules: planList && planList.length ? planList : [],
      oldIdStatus: data.oldIdStatus,
      sendToChat: true,
      peopleInChargeIds: peopleInChargeIds,
      organizationId: data.organization
        ? Number(data.organization.value)
        : null,
      remindCountdown: data.deadlineRemindCountdown?.value
        ? `${data.deadlineRemindCountdown?.value}`
        : null,
      remindType: data.deadlineRemindType?.value
        ? `${data.deadlineRemindType?.value}`
        : null,
    });
    const isCheckPeopleInCharge =
      data.peopleInChargeIds &&
      data.peopleInChargeIds.some((item) => item.value === session?.user.id);
    if (!isCheckPeopleInCharge) {
      handleDeleteItem(parseInt(`${data.id}`));
    }
  };

  useEffect(() => {
    if (actionType && typeDetail === ItemStartType.TASK) {
      if (taskDetailId) {
        setShowEditTaskModal(true);
        getDataDetailTask(parseInt(taskDetailId));
      } else {
        setShowEditTaskModal(true);
      }
    } else {
      setShowEditTaskModal(false);
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getDataDetailTask, taskDetailId, actionType, typeDetail]);

  useEffect(() => {
    if (actionType && typeDetail === ItemStartType.TEMPLATE) {
      if (templateDetailId) {
        getDataDetailTemplate({
          id: parseInt(templateDetailId),
          action: TemplateAction.DETAIL,
        });
      } else {
        setShowTemplateModal(true);
      }
    } else {
      setShowTemplateModal(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    getDataDetailTemplate,
    setShowTemplateModal,
    templateDetailId,
    actionType,
    typeDetail,
  ]);

  // Handle create template
  const handleConfirmCreateTemplate = (data: TemplateFormData) => {
    const tagIds = data.tagIds
      ? data.tagIds
          .filter((item) => item.value !== '')
          .map((item) => ({ tagId: item.value }))
      : [];
    const peopleInChargeIds =
      data.peopleInChargeIds &&
      data.peopleInChargeIds
        .filter((item) => item.value !== '')
        .map((item) => ({ peopleInChargeId: item.value }));
    const todoListData =
      data.todoList && data.todoList.filter((item) => item.content !== '');

    const newWorkCategories = [];
    if (data.categories.LARGE?.value) {
      newWorkCategories.push({
        categoryId:
          `${data.categories.LARGE.value}` == NO_OPTION_CATEGORY
            ? null
            : `${data.categories.LARGE.value}`,
        type: EventWorkCategory.LARGE,
      });
    }
    if (data.categories.MEDIUM.value) {
      newWorkCategories.push({
        categoryId:
          `${data.categories.MEDIUM.value}` == NO_OPTION_CATEGORY
            ? null
            : `${data.categories.MEDIUM.value}`,
        type: EventWorkCategory.MEDIUM,
      });
    }
    if (data.categories.SMALL.value) {
      newWorkCategories.push({
        categoryId:
          `${data.categories.SMALL.value}` == NO_OPTION_CATEGORY
            ? null
            : `${data.categories.SMALL.value}`,
        type: EventWorkCategory.SMALL,
      });
    }

    createTemplate({
      title: data.title || '',
      description: data.description || '',
      tagIds: tagIds,
      isImportant: data.isImportant,
      todoList: todoListData,
      categoryIds: newWorkCategories,
      peopleInChargeIds: peopleInChargeIds,
      type: MY_TEMPLATE,
      organizationId: data.organization
        ? Number(data.organization.value)
        : null,
    });
  };

  //  Handle call api create task
  const handleCreateTemplate = async (data: TemplateRequest) => {
    setIsLoading(true);
    return await api.post(apiRouters.CREATE_TASK, data);
  };
  // Handle create task and response
  const { mutate: createTemplate } = useMutation(
    'postCreateTemplate',
    handleCreateTemplate,
    {
      onSuccess: async ({ data }: { data: Template }) => {
        showToast({
          description: SUCCESS_CREATE_MESSAGE,
        });
        setTemplates((prevTemplates) => {
          const updatedTemplates = [
            ...prevTemplates,
            {
              id: data.id,
              title: data.title,
            },
          ];
          return updatedTemplates;
        });
        handleRemoveTemplateParam();
        setDataTemplateEdit(null);
        setShowEditTaskModal(false);
      },
      onError: (error: AxiosError<any>) => {
        showErrorToast(error, ERROR_CREATE_MESSAGE);
      },
      onSettled: () => {
        setTimeout(() => {
          setIsLoading(false);
        }, 500);
      },
    },
  );

  const handleConfirmEditTemplate = (data: TemplateFormData) => {
    const tagIds = data.tagIds
      ? data.tagIds
          .filter((item) => item.value !== '')
          .map((item) => ({ tagId: item.value }))
      : [];

    const peopleInChargeIds =
      data.peopleInChargeIds &&
      data.peopleInChargeIds
        .filter((item) => item.value !== '')
        .map((item) => ({ peopleInChargeId: item.value }));

    const todoListData =
      data.todoList && data.todoList.filter((item) => item.content !== '');

    const newWorkCategories = [];
    if (data.categories.LARGE?.value) {
      newWorkCategories.push({
        categoryId:
          `${data.categories.LARGE.value}` == NO_OPTION_CATEGORY
            ? null
            : `${data.categories.LARGE.value}`,
        type: EventWorkCategory.LARGE,
      });
    }
    if (data.categories.MEDIUM.value) {
      newWorkCategories.push({
        categoryId:
          `${data.categories.MEDIUM.value}` == NO_OPTION_CATEGORY
            ? null
            : `${data.categories.MEDIUM.value}`,
        type: EventWorkCategory.MEDIUM,
      });
    }
    if (data.categories.SMALL.value) {
      newWorkCategories.push({
        categoryId:
          `${data.categories.SMALL.value}` == NO_OPTION_CATEGORY
            ? null
            : `${data.categories.SMALL.value}`,
        type: EventWorkCategory.SMALL,
      });
    }

    editTemplate({
      id: data.id,
      title: data.title,
      description: data.description,
      tagIds: tagIds,
      categoryIds: newWorkCategories,
      isImportant: data.isImportant,
      todoList: todoListData,
      peopleInChargeIds: peopleInChargeIds,
      organizationId: data.organization
        ? Number(data.organization.value)
        : null,
      type: MY_TEMPLATE,
    });
  };

  const { mutate: editTemplate } = useMutation(
    'postEditTemplate',
    handleEditTask,
    {
      onSuccess: async ({ data }) => {
        setTemplates((prevTemplates) => {
          const updatedTemplates = [...prevTemplates];
          const foundTemplateIndex = updatedTemplates.findIndex(
            (template) => template.id == data.id,
          );
          if (foundTemplateIndex != -1) {
            updatedTemplates[foundTemplateIndex].title = data.title;
          }
          return updatedTemplates;
        });
        handleRemoveTemplateParam();
        showToast({
          description: SUCCESS_UPDATE_MESSAGE,
        });
        setDataTemplateEdit(null);
        setShowEditTaskModal(false);
      },
      onError: (error: AxiosError<any>) => {
        showErrorToast(error, ERROR_UPDATE_MESSAGE);
      },
      onSettled: () => {
        setTimeout(() => {
          setIsLoading(false);
        }, 500);
      },
    },
  );

  // Action create
  // Function create  tasks
  const handleConfirmCreateTask = (data: TaskFormData) => {
    const peopleInChargeIds =
      data.peopleInChargeIds &&
      data.peopleInChargeIds
        .filter((item) => item.value !== '')
        .map((item) => ({ peopleInChargeId: item.value }));
    const tagIds = data.tagIds
      ? data.tagIds
          .filter((item) => item.value !== '')
          .map((item) => ({ tagId: item.value }))
      : [];

    const planList = data.plans
      ? data.plans
          .filter((item) => item.planStartDate !== null)
          .map((item) => {
            return {
              scheduleId:
                actionType && actionType === ActionTask.CREATE
                  ? item.scheduleId || null
                  : null,
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
          `${data.categories.LARGE.value}` == NO_OPTION_CATEGORY
            ? null
            : `${data.categories.LARGE.value}`,
        type: EventWorkCategory.LARGE,
      });
    }
    if (data.categories.MEDIUM.value) {
      newWorkCategories.push({
        categoryId:
          `${data.categories.MEDIUM.value}` == NO_OPTION_CATEGORY
            ? null
            : `${data.categories.MEDIUM.value}`,
        type: EventWorkCategory.MEDIUM,
      });
    }
    if (data.categories.SMALL.value) {
      newWorkCategories.push({
        categoryId:
          `${data.categories.SMALL.value}` == NO_OPTION_CATEGORY
            ? null
            : `${data.categories.SMALL.value}`,
        type: EventWorkCategory.SMALL,
      });
    }

    createTask({
      title: data.title || '',
      statusId: data.statusId ? (data.statusId.value as number) : null,
      priority: data.priority ? data.priority.value.toString() : '',
      deadline:
        data.deadlineDate && data.deadlineTime
          ? addTimeToDate(data.deadlineDate as Date, data.deadlineTime)
          : null,
      description: data.description || '',
      tagIds: tagIds,
      peopleInChargeIds: peopleInChargeIds,
      isImportant: data.isImportant,
      todoList: todoListData,
      taskSchedules: planList && planList.length ? planList : null,
      sendToChat: false,
      categoryIds: newWorkCategories,
      copyTaskId: actionType === ActionTask.COPY ? taskDetailId : null,
      organizationId: data.organization
        ? Number(data.organization.value)
        : null,
      remindCountdown: data.deadlineRemindCountdown?.value
        ? `${data.deadlineRemindCountdown?.value}`
        : null,
      remindType: data.deadlineRemindType?.value
        ? `${data.deadlineRemindType?.value}`
        : null,
    });
  };

  //  Handle call api create task
  const handleCreateTask = async (data: TaskRequest) => {
    setIsLoading(true);
    return await api.post(apiRouters.CREATE_TASK, data);
  };
  // Handle create task and response
  const { mutate: createTask } = useMutation(
    'postCreateUser',
    handleCreateTask,
    {
      onSuccess: async ({ data }: { data: Task }) => {
        queryClient.refetchQueries(['getDataTaskHeaderList']);

        showToast({
          description: SUCCESS_CREATE_MESSAGE,
        });

        handleAddOrUpdateItem(
          {
            ...data,
            type: ItemStartType.TASK,
          },
          actionType ? actionType : ActionTask.CREATE,
          actionType && actionType === ActionTask.COPY ? `${taskDetailId}` : '',
        );

        const matchedPageData = numberPagesData.find(
          (pageData) => `${pageData.id}` === `${data.status?.id}`,
        );
        let isLastItemPinned = false;
        const column = columnsKanbanData?.[data.status?.id as number];
        if (column && column.items.length > 0) {
          const lastItem = column.items[column.items.length - 1];
          isLastItemPinned = !!lastItem.pinAt;
        }
        if (actionType !== ActionTask.COPY) {
          if (matchedPageData && matchedPageData.hasMores && isLastItemPinned) {
            setNumberPagesData((prevNumberPages) =>
              prevNumberPages.map((item) =>
                `${item.id}` === `${data.status?.id}`
                  ? { ...item, count: item.count + 1 }
                  : item,
              ),
            );
          }
        }
        handleRemoveParam();
        setDataTaskEdit(null);
        setShowEditTaskModal(false);
      },
      onError: (error: AxiosError<any>) => {
        if (error.response?.data.taskSchedules) {
          showErrorToast(error, ERROR_MESSAGE_OVERLAP_TASK);
        } else {
          showErrorToast(error, ERROR_CREATE_MESSAGE);
        }
      },
      onSettled: () => {
        setPeopleDefaultId(`${session?.user.id}`);
        setTimeout(() => {
          setIsLoading(false);
        }, 500);
        setColumnId(`${StatusValueTask.NOT_STARTED}`);
      },
    },
  );

  // Action copy
  // Handle call api copy task
  const handleActionCopyTask = (id: number) => {
    handleSetParam({
      id: `${id}`,
      action: ActionTask.COPY,
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

  const handleConfirmDeleteTemplate = () => {
    if (templateDetailId) {
      setIsLoading(true);
      deleteTemplate(templateDetailId);
      setDataTemplateEdit(null);
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
    onSuccess: async (data, type) => {
      setColumnId('');
      setShowEditTaskModal(false);
      handleRemoveParam();
      setIdTaskEditSelected('');
      handleDeleteItem(parseInt(type));
      setDataTaskEdit(null);
      setIdTaskDeleteKanban(type);
      showToast({
        description: SUCCESS_DELETE_MESSAGE,
      });
      setOpenConfirmDeleteTaskModal(false);
      const updatedFrequentlyTaskList = frequentlyTasks.filter(
        (item) => `${item.id}` !== type,
      );
      setFrequentlyTasks(updatedFrequentlyTaskList);
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

  const { mutate: deleteTemplate } = useMutation(
    'deleteTemplate',
    handleDeleteTask,
    {
      onSuccess: async (data, type) => {
        setShowTemplateModal(false);
        handleRemoveTemplateParam();
        setDataTemplateEdit(null);
        showToast({
          description: SUCCESS_DELETE_MESSAGE,
        });
        setOpenConfirmDeleteTemplateModal(false);
        const updatedFrequentlyTaskList = templates.filter(
          (item) => `${item.id}` !== type,
        );
        setTemplates(updatedFrequentlyTaskList);
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
    },
  );

  // Action pin task
  const updatePinAtData = (data: { id: number; pinAt: string | null }) => {
    const updatedColumns = { ...columnsKanbanData };

    for (const columnKey in updatedColumns) {
      const column = updatedColumns[columnKey];
      let matchedItem: Task | undefined;
      const remainingItems = column.items.filter((item) => {
        if (item.id === data.id) {
          matchedItem = { ...item, pinAt: data.pinAt };
          return false;
        }
        return true;
      });
      const updatedItems = matchedItem
        ? [matchedItem, ...remainingItems]
        : remainingItems;
      updatedColumns[columnKey] = { ...column, items: updatedItems };
    }

    setColumnsKanbanData(updatedColumns);
  };

  const updateUnPinItemAndSort = (data: { id: number; index: number }) => {
    const updatedColumns = { ...columnsKanbanData };

    for (const columnKey in updatedColumns) {
      const column = updatedColumns[columnKey];

      // Find information of the last item
      const lastItem = column.items[column.items.length - 1];

      // Check if the last item has `pinAt` and if that column has `hasMoresValue`
      const resultHasNext = numberPagesData.find(
        (item) => `${item.id}` === `${column.id}`,
      );
      const hasMoresValue = resultHasNext ? resultHasNext.hasMores : null;

      if (lastItem && lastItem.pinAt && hasMoresValue) {
        // Remove item with `id` equal to `data.id`
        const filteredItems = column.items.filter(
          (item) => item.id !== data.id,
        );

        // Update the list of items after removing the item
        updatedColumns[columnKey] = { ...column, items: filteredItems };
      } else {
        // Update `pinAt` of the item with `id` equal to `data.id`
        const updatedItems = column.items.map((item) => {
          if (item.id === data.id) {
            return { ...item, pinAt: null, index: data.index }; // Set `pinAt` to null and `index` to the new value
          }
          return item;
        });

        // Find the item just updated
        const updatedItem = updatedItems.find((item) => item.id === data.id);

        // If `updatedItem` is `undefined`, skip adding it to `finalItems`
        if (!updatedItem) continue;

        // Filter out the remaining items (excluding the updated item)
        const remainingItems = updatedItems.filter(
          (item) => item.id !== data.id,
        );

        // Re-sort the remaining items
        const sortedRemainingItems = remainingItems.sort(compareItems);

        // Insert the updated item after items with `pinAt != null` and before items with `pinAt == null`
        let finalItems = sortedRemainingItems;

        // Find the position to insert the `updatedItem`
        const firstNullPinAtIndex = finalItems.findIndex(
          (item) => item.pinAt === null,
        );

        if (firstNullPinAtIndex !== -1) {
          finalItems = [
            ...finalItems.slice(0, firstNullPinAtIndex),
            updatedItem,
            ...finalItems.slice(firstNullPinAtIndex),
          ];
        } else {
          // If there are no items with `pinAt == null`, add it to the end
          finalItems.push(updatedItem);
        }

        // Update the items in the column
        updatedColumns[columnKey] = { ...column, items: finalItems };
      }
    }

    // Update the `columnsKanbanData` state after all columns are processed
    setColumnsKanbanData(updatedColumns);
  };

  const handlePinTask = async (data: { id: string; pinAt?: string }) => {
    const { data: response } = await api.put(
      apiRouters.TASK_PIN(`${data.id}`),
      {
        pinAt: data.pinAt,
      },
    );
    return response;
  };

  const { mutate: pinTask } = useMutation('pinTask', handlePinTask, {
    onSuccess: async (data: TaskPinResponse) => {
      if (data.pinAt !== null) {
        updatePinAtData({
          id: data.task,
          pinAt: data.pinAt,
        });
        setFrequentlyTasks((prevTasks) =>
          prevTasks.map((task) => {
            if (task.id === data.task) {
              return { ...task, pinAt: data.pinAt };
            }
            return task;
          }),
        );
      } else {
        updateUnPinItemAndSort({
          id: data.task,
          index: data.index,
        });

        setFrequentlyTasks((prevTasks) =>
          prevTasks.map((task) => {
            if (task.id === data.task) {
              return { ...task, pinAt: null };
            }
            return task;
          }),
        );
      }
    },
    onError: (error: AxiosError<any>) => {
      showErrorToast(error, ERROR_SAVE_MESSAGE);
    },
    onSettled: () => {},
  });
  // Handle call api pin / unpin
  const pinItemToTop = (itemId: string | number) => {
    pinTask({
      id: `${itemId}`,
      pinAt: convertDateStringFull(new Date()),
    });
  };

  // Calculate width kanban
  const calculateWidth = (baseWidth: number, percentage: number): number => {
    return (baseWidth * percentage) / 100;
  };

  const [viewportWidth, setViewportWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => {
      setViewportWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);

    return () => window.removeEventListener('resize', handleResize);
  }, []);
  const [isOpenModalFilter, setIsOpenModalFilter] = useState(false);

  useEffect(() => {
    if (authenticatedUser) {
      if (authenticatedUser.setting?.isSortingTaskByImportant) {
        setDataOrderRing(FilterTypeKanban.IMPORTANT);
      } else if (authenticatedUser.setting?.isSortingTaskByDeadline) {
        setDataOrderRing(FilterTypeKanban.DEADLINE);
      } else {
        setDataOrderRing('');
      }
      setIsReadyToFetch(true);
    }
  }, [authenticatedUser]);

  // Socket
  useEffect(() => {
    const handleSocketMessage = (data: WebSocketMessageSortKanban) => {
      switch (data.action) {
        case SocketActions.RESET_STATUS_SORT_TASK:
          setIsReadyToFetch(false);
          setOrderingRequest('');
          setDataOrderRing('');
          break;
      }
    };

    socketEventEmitter.on('message', handleSocketMessage);

    return () => {
      socketEventEmitter.off('message', handleSocketMessage);
    };
  }, []);

  // Show data filter
  const allLabels = orderingOptions
    ? [
        ...orderingOptions.organization_ids.map((item) => ({
          ...item,
          category: 'organization_ids',
        })),
        ...orderingOptions.tag_ids.map((item) => ({
          ...item,
          category: 'tag_ids',
        })),
        ...orderingOptions.category_ids.map((item) => ({
          ...item,
          category: 'category_ids',
        })),
      ]
    : [];

  const firstThree = allLabels.slice(0, 3);

  const remainingCount = allLabels.length - firstThree.length;

  const handleRemoveItem = (
    category: 'organization_ids' | 'tag_ids' | 'category_ids',
    value: string | number,
  ) => {
    setOrderingOptions((prevData) => {
      if (!prevData) return prevData;

      return {
        ...prevData,
        [category]:
          prevData[category]?.filter((item) => item.value !== value) || [],
      };
    });
  };

  return (
    <>
      <div className="flex flex-row flex-grow h-[calc(100vh_-_76px)] gap-0 bg-[#F8FAFC] ">
        <TimeSchedule
          exEvents={exEvents}
          idTaskDelete={parseInt(idTaskDeleteKanban)}
          dataItemChangeInline={dataItemChangeInline}
          dataItemAddSchedule={dataItemAddSchedule}
          dataItemUpdateSchedule={dataItemUpdateSchedule}
          setFrequentlyTasks={setFrequentlyTasks}
          setIdTaskDelete={setIdTaskDeleteKanban}
          setDataItemResizeSchedule={setDataItemResizeSchedule}
          updateTaskDates={updateTaskDates}
          handleUpdateItemStart={handleUpdateItemStart}
          setDataItemChangeInline={setDataItemChangeInline}
          handleEditShowClockItem={handleEditShowClockItem}
        />
        <div className="w-full pl-10">
          <DragDropContext onDragStart={() => {}} onDragEnd={onDragEnd}>
            <div
              ref={exEvents}
              style={{
                width: expanded
                  ? isExtendCalendar
                    ? `calc(${Math.max(viewportWidth, 1280)}px - ${widthCalendar + 250}px)`
                    : `calc(${Math.max(viewportWidth, 1280)}px - 700px)`
                  : isExtendCalendar
                    ? `calc(${Math.max(viewportWidth, 1280)}px - ${widthCalendar + 120}px)`
                    : `calc(${Math.max(viewportWidth, 1280)}px - 700px)`,
                maxWidth: expanded
                  ? widthCalendar < 100
                    ? '100%'
                    : isExtendCalendar
                      ? ` calc(${Math.max(viewportWidth, 1280)}px - ${500 - (656 - widthCalendar)}px) `
                      : ` calc(${Math.max(viewportWidth, 1280)}px - ${444 + 500 - widthCalendar}px) `
                  : isExtendCalendar
                    ? ` calc(${Math.max(viewportWidth, 1280)}px - ${500 - (656 - widthCalendar)}px)`
                    : `calc(${Math.max(viewportWidth, 1280)}px - 500px) `,
              }}
              className={`h-full overflow-x-auto flex flex-col gap-2 py-7 pr-7 pl-1 ${isListView ? 'overflow-y-auto' : 'overflow-y-hidden'}`}>
              <FrequentlyTask
                setShowModalTask={() => {
                  handleSetParam({
                    id: null,
                    action: ActionTask.CREATE,
                  });
                  setShowEditTaskModal(true);
                  setColumnId(`${StatusValueTask.NOT_STARTED}`);
                }}
                setShowTemplateModal={() => {
                  handleSetTemplateParam({
                    id: null,
                    action: TemplateAction.CREATE,
                    type: 'TEMPLATE',
                  });
                  setShowTemplateModal(true);
                }}
                templates={templates}
                setShowFrequentlyTasks={setShowFrequentlyTasks}
                showFrequentlyTasks={showFrequentlyTasks}
                creationDataTaskData={creationDataTaskData}
                editTask={editTaskInline}
                handleActionEditTemplate={handleActionEditTemplate}
                handleCreateTaskFromTemplate={handleCreateTaskFromTemplate}
                handleActionEditTask={handleActionEditTask}
                handleConfirmCopyTask={handleActionCopyTask}
                handleUpdateItemInline={handleUpdateItemInline}
                frequentlyTasks={frequentlyTasks}
                pinItemToTop={pinItemToTop}
              />
              <div className="flex-grow flex flex-col gap-2 mt-[30px] mb-6">
                <div className={`flex gap-7 mb-6 w-fit min-w-[300px]`}>
                  <div className="flex items-center gap-2">
                    <ImageRound
                      src="/icons/sort-task.svg"
                      name="Sort icon"
                      className="w-[18px] h-[14px]"
                    />
                    <>
                      <Button
                        disabled={isLoadingDataTask}
                        onClick={() => {
                          if (dataOrderRing !== FilterTypeKanban.DEADLINE) {
                            setIsReadyToFetch(true);

                            setDataOrderRing(FilterTypeKanban.DEADLINE);
                            setOrderingRequest(FilterTypeKanban.DEADLINE);
                          }
                        }}
                        variant={
                          isLoadingDataTask
                            ? 'outline'
                            : dataOrderRing === FilterTypeKanban.DEADLINE
                              ? 'primary'
                              : 'outline'
                        }
                        className={`${dataOrderRing === FilterTypeKanban.DEADLINE && !isLoadingDataTask ? '' : '!border-[#A7B7C2] !text-[#A7B7C2] '} h-6 w-[70px] !px-0 !py-0 text-xs font-bold rounded-[20px]`}>
                        締切期間
                      </Button>
                      <Button
                        disabled={isLoadingDataTask}
                        onClick={() => {
                          if (dataOrderRing !== FilterTypeKanban.IMPORTANT) {
                            setIsReadyToFetch(true);

                            setDataOrderRing(FilterTypeKanban.IMPORTANT);
                            setOrderingRequest(FilterTypeKanban.IMPORTANT);
                          }
                        }}
                        variant={
                          isLoadingDataTask
                            ? 'outline'
                            : dataOrderRing === FilterTypeKanban.IMPORTANT
                              ? 'primary'
                              : 'outline'
                        }
                        className={`${dataOrderRing === FilterTypeKanban.IMPORTANT && !isLoadingDataTask ? '' : '!border-[#A7B7C2] !text-[#A7B7C2] '} h-6 w-[70px] !px-0 !py-0 text-xs font-bold rounded-[20px]   `}>
                        重要
                      </Button>
                    </>

                    {/* Filter option modal */}
                    <Popover className="relative">
                      {() => (
                        <>
                          <div className="flex items-center gap-2">
                            <PopoverButton
                              onClick={() =>
                                setIsOpenModalFilter(!isOpenModalFilter)
                              }
                              className="flex items-center gap-2 text-xs font-medium text-[#77858F] focus-visible:outline-none">
                              <ImageRound
                                src="/icons/filter.svg"
                                name="Filter icon"
                                className="w-[14px] h-[14px] ml-2"
                              />
                            </PopoverButton>
                            {allLabels.length > 3 ? (
                              <>
                                {firstThree.slice(0, 3).map((item, index) => (
                                  <div
                                    key={index}
                                    onClick={() =>
                                      handleRemoveItem(
                                        item.category as
                                          | 'organization_ids'
                                          | 'tag_ids'
                                          | 'category_ids',
                                        item.value,
                                      )
                                    }
                                    className="w-[105px] h-6 px-[10px] justify-between gap-[6px] text-xs text-black font-medium flex items-center truncate rounded-[20px] bg-[#EBF1F7]">
                                    <span className="w-[71px] truncate">
                                      {item.label}
                                    </span>
                                    <ImageRound
                                      src={`/icons/close.svg`}
                                      name="close"
                                      className="w-fit h-fit cursor-pointer"
                                    />
                                  </div>
                                ))}
                                <p className="px-[10px] h-6 flex items-center justify-center rounded-[20px] bg-[#EBF1F7] text-black text-xs font-medium">
                                  +{remainingCount}
                                </p>
                              </>
                            ) : (
                              <>
                                {allLabels.map((item, index) => (
                                  <div
                                    key={index}
                                    onClick={() =>
                                      handleRemoveItem(
                                        item.category as
                                          | 'organization_ids'
                                          | 'tag_ids'
                                          | 'category_ids',
                                        item.value,
                                      )
                                    }
                                    className="w-[105px] h-6 px-[10px] justify-between gap-[6px] text-xs text-black font-medium flex items-center truncate rounded-[20px] bg-[#EBF1F7]">
                                    <span className="w-[71px] truncate">
                                      {item.label}
                                    </span>
                                    <ImageRound
                                      src={`/icons/close.svg`}
                                      name="close"
                                      className="w-fit h-fit cursor-pointer"
                                    />
                                  </div>
                                ))}
                              </>
                            )}
                          </div>
                          <Transition
                            as={Fragment}
                            show={isOpenModalFilter}
                            enter="transition ease-out duration-200"
                            enterFrom="opacity-0 translate-y-1"
                            enterTo="opacity-100 translate-y-0"
                            leave="transition ease-in duration-150"
                            leaveFrom="opacity-100 translate-y-0"
                            leaveTo="opacity-0 translate-y-1">
                            <PopoverPanel className="absolute left-0 top-5 z-[1] w-[400px] transform">
                              <ActionFilterTask
                                creationDataTaskData={creationDataTaskData}
                                handleClose={() => setIsOpenModalFilter(false)}
                              />
                            </PopoverPanel>
                          </Transition>
                        </>
                      )}
                    </Popover>

                    <InputSearch
                      className="w-[300px] h-[34px] py-0 bg-[#EBF1F7] !rounded-[20px]"
                      inputClassName="h-[34px] bg-[#EBF1F7] border-none !rounded-[20px] text-sm"
                      iconClassName="w-[14px] h-[14px]"
                      placeholder="タスク、キーワードを検索"
                    />
                  </div>

                  <Tippy
                    content={
                      isListView ? 'タスクを看板表示' : 'タスクをリスト表示'
                    }
                    arrow={false}
                    delay={1000}
                    placement="top"
                    offset={[3, 0]}>
                    <div
                      className={`hover:cursor-pointer fixed ${showFrequentlyTasks ? 'top-[200px]' : 'top-[125px]'} right-5 z-20`}>
                      <ImageRound
                        src={`${!isListView ? '/icons/list-view.svg' : '/icons/card-view.svg'}`}
                        name="List view icon"
                        className="w-12 h-12 hover:cursor-pointer"
                        onClick={() => setIsListView((prev) => !prev)}
                      />
                    </div>
                  </Tippy>
                </div>
                {!isListView ? (
                  <div
                    style={{
                      gap: `${(columnWidth / 247) * 12}px`,
                    }}
                    className="flex ">
                    {columnsKanbanData &&
                      !isLoadingDataTask &&
                      columnsKanbanData[StatusValueTask.MY_ROUTINE] && (
                        <FixedTaskData
                          data={
                            columnsKanbanData &&
                            columnsKanbanData[StatusValueTask.MY_ROUTINE]
                          }
                          showFrequentlyTasks={showFrequentlyTasks}
                          numberPagesData={numberPagesData}
                          searchValue={searchValue}
                          orderTaskSave={orderTaskSave}
                          tagSelected={tagSelected}
                          columnsKanbanData={columnsKanbanData}
                          orderingRequest={orderingRequest}
                          setNumberPagesData={setNumberPagesData}
                          setColumnsKanbanData={setColumnsKanbanData}
                          pinItemToTop={pinItemToTop}
                          addTask={(id: string) => {
                            setColumnId(id);
                            setShowEditTaskModal(true);
                            handleSetParam({
                              id: null,
                              action: ActionTask.CREATE,
                            });
                          }}
                          handleConfirmDrop={(result: DropResult) => {
                            setDataItemDrop(result);
                            isDragEndExecuteRef.current = true;
                          }}
                          editTaskInline={editTaskInline}
                          handleActionEditTask={handleActionEditTask}
                          handleConfirmCopyTask={handleActionCopyTask}
                          handleUpdateItemInline={handleUpdateItemInline}
                          creationDataTaskData={creationDataTaskData}
                          selectedOptionZoom={selectedOptionZoom}
                        />
                      )}
                    <div className="flex-grow">
                      <BoardKanban
                        columnsKanbanData={columnsKanbanData}
                        isLoadingDataTask={isLoadingDataTask}
                        showFrequentlyTasks={showFrequentlyTasks}
                        numberPagesData={numberPagesData}
                        orderTaskSave={orderTaskSave}
                        creationDataTaskData={creationDataTaskData}
                        setColumnsKanbanData={setColumnsKanbanData}
                        setNumberPagesData={setNumberPagesData}
                        editTaskInline={editTaskInline}
                        pinItemToTop={pinItemToTop}
                        handleActionEditTask={handleActionEditTask}
                        handleConfirmCopyTask={handleActionCopyTask}
                        handleUpdateItemInline={handleUpdateItemInline}
                        addTask={(id: string) => {
                          setColumnId(id);
                          setShowEditTaskModal(true);
                          handleSetParam({
                            id: null,
                            action: ActionTask.CREATE,
                          });
                        }}
                        selectedOptionZoom={selectedOptionZoom}
                      />
                    </div>
                  </div>
                ) : (
                  <CardListView
                    columnsKanbanData={columnsKanbanData}
                    setColumnsKanbanData={setColumnsKanbanData}
                    setNumberPagesData={setNumberPagesData}
                    orderTaskSave={orderTaskSave}
                    numberPagesData={numberPagesData}
                    handleActionEditTask={handleActionEditTask}
                    handleConfirmCopyTask={handleActionCopyTask}
                    handleUpdateItemInline={handleUpdateItemInline}
                    creationDataTaskData={creationDataTaskData}
                    pinItemToTop={pinItemToTop}
                    editTask={editTaskInline}
                    addTask={(id: string) => {
                      setColumnId(id);
                      setShowEditTaskModal(true);
                      handleSetParam({
                        id: null,
                        action: ActionTask.CREATE,
                      });
                    }}
                  />
                )}
              </div>

              {showEditTaskModal && (
                <ActionsTaskModal
                  open={showEditTaskModal}
                  dataTask={dataTaskEdit}
                  columnId={columnId}
                  action={actionType || ActionTask.CREATE}
                  peopleDefaultId={peopleDefaultId || `${session?.user.id}`}
                  setDataErrorTask={setDataErrorTask}
                  authenticatedUser={loggedInUser}
                  errorPerson={dataErrorTask}
                  dashboardMemberList={dashboardMemberList}
                  creationDataTaskData={creationDataTaskData}
                  onClose={() => {
                    setShowEditTaskModal(false);
                    setColumnId('');
                    handleRemoveParam();
                    setDataTaskEdit(null);
                    setIsLoading(false);
                  }}
                  onSubmit={handleConfirmCreateTask}
                  onEdit={handleConfirmEditTask}
                  onCopy={handleConfirmCreateTask}
                  onDelete={() => {
                    setOpenConfirmDeleteTaskModal(true);
                  }}
                  onWarning={({
                    reset,
                    resetDataCategoryOptions,
                  }: {
                    reset: () => void;
                    resetDataCategoryOptions: () => void;
                  }) => {
                    setResetFunctions({
                      resetDataCategoryOptions,
                      reset,
                    });
                    setOpenWarningCloseModal(true);
                  }}
                />
              )}

              {openWarningCloseModal && (
                <WarningCloseTaskModal
                  open={openWarningCloseModal}
                  onClose={() => {
                    setOpenWarningCloseModal(false);
                  }}
                  onConfirm={() => {
                    setShowEditTaskModal(false);
                    setOpenWarningCloseModal(false);
                    setColumnId('');
                    handleRemoveParam();
                    setDataTaskEdit(null);
                    setIsLoading(false);
                    resetFunctions.resetDataCategoryOptions?.();
                    resetFunctions.reset?.();
                  }}
                />
              )}

              {showTemplateModal && (
                <ActionsTemplateModal
                  open={showTemplateModal}
                  dataTemplate={dataTemplateEdit}
                  action={actionType || TemplateAction.CREATE}
                  peopleDefaultId={peopleDefaultId || `${session?.user.id}`}
                  setDataErrorTask={setDataErrorTask}
                  creationDataTaskData={creationDataTaskData}
                  onClose={() => {
                    handleRemoveTemplateParam();
                    setShowTemplateModal(false);
                    setDataTemplateEdit(null);
                    setIsLoading(false);
                  }}
                  onSubmit={handleConfirmCreateTemplate}
                  onEdit={handleConfirmEditTemplate}
                  onCopy={handleConfirmCreateTask}
                  onDelete={() => {
                    setOpenConfirmDeleteTemplateModal(true);
                  }}
                />
              )}

              {showWarningStartTaskModal && (
                <WarningStartTaskModal
                  open={showWarningStartTaskModal}
                  type={
                    idTaskStarting.type === ItemStartType.TASK
                      ? 'タスク'
                      : '予定'
                  }
                  onClose={() => {
                    setShowWarningStartTaskModal(false);
                  }}
                  onConfirm={handleConfirmStartNewTask}
                />
              )}
              {openConfirmDeleteTaskModal && (
                <ConfirmDeleteModal
                  open={openConfirmDeleteTaskModal}
                  type="タスク"
                  onConfirm={handleConfirmDeleteTask}
                  onClose={() => {
                    setOpenConfirmDeleteTaskModal(false);
                  }}
                />
              )}
              {openConfirmDeleteTemplateModal && (
                <ConfirmDeleteModal
                  open={openConfirmDeleteTemplateModal}
                  type="テンプレート"
                  onConfirm={handleConfirmDeleteTemplate}
                  onClose={() => {
                    setOpenConfirmDeleteTemplateModal(false);
                  }}
                />
              )}
            </div>
          </DragDropContext>
        </div>
      </div>
      {!isListView && (
        <div className="fixed flex items-center gap-2 bottom-5 right-20 z-20 ">
          <div className="w-[80px] !h-[30px]">
            <Dropdown
              labelOptionClass="!ml-0 !pr-0 !pl-0 flex justify-center w-full "
              className="text-sm h-8 !py-0 !pl-0 !pr-0 !px-[14px] !rounded-lg"
              classActive="!pr-[10px] !ml-0 w-full text-center left-[52px]"
              classNameOption="top-[-150px] !px-0 text-sm"
              selectedOption={selectedOptionZoom}
              options={[
                {
                  label: '100%',
                  value: 100,
                },
                {
                  label: '90%',
                  value: 90,
                },
                {
                  label: '75%',
                  value: 75,
                },
                {
                  label: '50%',
                  value: 50,
                },
                {
                  label: '25%',
                  value: 25,
                },
              ]}
              onChange={(selectedOption) => {
                setSelectedOptionZoom(selectedOption);
                if (selectedOption.value === 25) {
                  setColumnWidth(calculateWidth(247, 50));
                } else {
                  setColumnWidth(
                    calculateWidth(247, selectedOption.value as number),
                  );
                }
              }}
            />
          </div>
        </div>
      )}
    </>
  );
};

export default KanbanBoardTask;
