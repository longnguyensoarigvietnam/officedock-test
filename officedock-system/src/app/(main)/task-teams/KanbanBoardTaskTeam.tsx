'use client';
import {
  Popover,
  PopoverButton,
  PopoverPanel,
  Transition,
} from '@headlessui/react';
import React, {
  Fragment,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useSessionCache } from '@providers/SessionCacheProvider';

import { useRouter, useSearchParams } from 'next/navigation';
import { DragDropContext, DropResult } from '@hello-pangea/dnd';
import { useMutation, useQueryClient } from 'react-query';
import { AxiosError } from 'axios';

import Button from '@components/common/Button';
import ImageRound from '@components/common/ImageRound';
import InputSearch from '@components/common/InputSearch';
import ActionFilterTaskTeam from '@components/modals/ActionFilterTeamTask';
import UserColumnTeam from '@components/kanbanTeam/UserColumnTeam';
import CustomUserAvatar from '@components/common/AvatarIcon/CustomUserAvatar';
import Dropdown from '@components/common/Dropdown';
import ColumnsSkeleton from '@components/skeleton/ColumnSkeleton';
import ActionsTaskModalTeam from '@components/modals/ActionsTaskModalTeam';
import ConfirmDeleteModal from '@components/modals/ConfirmDeleteModal';
import WarningCloseTaskModal from '@components/modals/WarningCloseTaskModal';
import NoSettingColumn from '@components/kanbanTeam/NoSettingColumn';
import Checkbox from '@components/common/Checkbox';
import { DynamicTooltip } from '@components/tooltip/DynamicTooltip';

import { useErrorToast } from '@hooks/useErrorToast';
import useTaskNoSettingTeam from '@hooks/useTaskNoSettingTeam';
import useTaskBoardTeam from '@hooks/useTaskBoardTeam';

import { pageRouters, apiRouters } from '@constants/routers';
import {
  ActionTask,
  EventWorkCategory,
  FilterTypeKanban,
  ItemStartType,
  ScreenName,
  ServerStatusCode,
  StatusTask,
  StatusValueTask,
  TaskRepetitiveType,
} from '@constants/enums';
import {
  COLUMN_ID_TASK,
  INITIAL_INDEX_VALUE,
  INITIAL_INDEX_VALUE_STEP,
  NO_SETTING,
  TASK_REPETITIVE_OPTIONS,
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
  compareItems,
  transformDataTeamTask,
  transformDataTotalStatus,
} from '@utils';
import {
  addTimeToDate,
  convertDateStringFull,
  formatDateServer,
  getRandomDateTimeBetween,
} from '@utils/date';
import {
  KanbanDataTeamResponse,
  NoSettingTotalType,
  Task,
  TaskErrorPerson,
  TaskFormData,
  TaskPinResponse,
  TaskRequest,
  TransformedStatuses,
  UpdateTaskKanbanRequest,
} from '@interfaces/task';
import { ResponseError } from '@interfaces/response';

import { LoadingContext } from '@providers/LoadingProvider';
import { useToast } from '@providers/ToastProvider';
import { TaskTeamStateContext } from '@providers/TaskTeamProvider';
import { TaskContext } from '@providers/TaskProvider';
import { GlobalStateContext } from '@providers/GlobalStateProvider';
import api from '@base/api';
import useCreationDataCommon from '@hooks/common/useCreationDataCommon';
import useDebounceText from '@hooks/useDebounceText';

const KanbanBoardTaskTeam = () => {
  // Context
  const {
    oldUserAction,
    isLoadingDataTask,
    selectedOptionZoom,
    setSelectedOptionZoom,
    setColumnWidth,
    orderingOptions,
    setOrderingOptions,
    setDataTotalStatus,
    listDataKanbanTeam,
    setListDataKanbanTeam,
    listTaskNoSetting,
    setListTaskNoSetting,
    isConcurrently,
    setIsConcurrently,
    setDataOptionsStatus,
    valueSearch,
    setValueSearch,
  } = useContext(TaskTeamStateContext);

  const { setIsLoading } = useContext(LoadingContext);
  const {
    expanded,
    organizationTeamList,
    selectedOrganization: selectedOrganizationSideBar,
  } = useContext(GlobalStateContext);
  const { taskSelected, statusTaskSelected, taskAddEmpty } =
    useContext(TaskContext);

  const { showToast } = useToast();
  const showErrorToast = useErrorToast();

  const { data: session } = useSessionCache();

  const queryClient = useQueryClient();

  // Param
  const searchParams = useSearchParams();
  const params = new URLSearchParams(searchParams);

  const router = useRouter();
  const organizationId = searchParams.get('organization');
  const actionType = searchParams.get('action');
  const taskDetailId = searchParams.get('task');
  const typeDetail = searchParams.get('type');
  const listContainerRef = useRef<HTMLDivElement | null>(null);

  // State
  const [isOpenModalFilter, setIsOpenModalFilter] = useState(false);
  const [isShowModalEditTeam, setIsShowModalEditTeam] = useState(false);
  const [dataTaskEdit, setDataTaskEdit] = useState<Task | null>(null);
  const [dataErrorTask, setDataErrorTask] = useState<TaskErrorPerson>();
  const [peopleDefaultId, setPeopleDefaultId] = useState<string>('');
  const [isDragging, setDragging] = useState(false);
  const [openConfirmDeleteTaskModal, setOpenConfirmDeleteTaskModal] =
    useState(false);
  const [isReadyToFetch, setIsReadyToFetch] = useState(true);
  const [dataOrderRing, setDataOrderRing] = useState<string>('');
  const [openWarningCloseModal, setOpenWarningCloseModal] =
    useState<boolean>(false);
  const [resetFunctions, setResetFunctions] = useState<{
    resetDataCategoryOptions?: () => void;
    reset?: () => void;
  }>({});
  const [pendingTaskData, setPendingTaskData] = useState<TaskFormData | null>();
  const [closeAction, setCloseAction] = useState<ActionTask | null>();
  const [totalNoSetting, setTotalNoSetting] = useState<NoSettingTotalType>();
  const [isHasNext, setIsHasNext] = useState(false);
  const [page, setPage] = useState(1);
  const [initialLoad, setInitialLoad] = useState<boolean>(false);

  // State
  // Member
  const [listMemberTeam, setListMemberTeam] = useState<
    {
      id: number;
      fullName: string;
      color: string;
      avatarUrl: string;
    }[]
  >([]);

  const { selectedOrganization } = useContext(GlobalStateContext);

  useCreationDataCommon({
    condition: [!!organizationId],
    organizationId: selectedOrganizationSideBar?.value
      ? String(selectedOrganizationSideBar?.value)
      : organizationId || '',
    options: {
      get_organization_with_users: true,
      get_organization_members: true,
      get_task_status: true,
    },
    onSuccess: (data) => {
      if (data.organizationMembers) {
        setListMemberTeam(
          data.organizationMembers.map((member) => ({
            id: member.id,
            fullName: member.fullName,
            color: member.avatarColor,
            avatarUrl: member?.avatar || '',
          })),
        );
      }
      if (data.taskStatus) {
        setDataOptionsStatus(
          data.taskStatus.map((status) => ({
            label: status.name || '',
            value: status.id as number,
          })),
        );
      }
    },
  });

  const handleSetParamTeam = (id: string) => {
    params.set('organization', id);
    router.push(`?${params.toString()}`);
  };

  useEffect(() => {
    if (organizationId) {
      setIsReadyToFetch(true);
    }
  }, [organizationId]);

  const debouncedTaskSearch = useDebounceText(valueSearch, 800);

  // get list data team
  const { refetchTaskBoardListTeam } = useTaskBoardTeam({
    current_screen: ScreenName.TEAM_DOCK,
    organization_id: selectedOrganizationSideBar
      ? (selectedOrganizationSideBar?.value as string)
      : organizationId || '',

    filter: {
      userId: orderingOptions?.user_ids,
      is_cross_team_task: isConcurrently,
      search: debouncedTaskSearch,
    },
    isReadyToFetch: isReadyToFetch,
    ordering: dataOrderRing,
    onSuccess: (data) => {
      if (data.results) {
        const newData = transformDataTeamTask(data.results);

        setListDataKanbanTeam(newData);

        const newTotalStatus = transformDataTotalStatus(data.results);

        setDataTotalStatus(newTotalStatus);
        setIsHasNext(data.hasNext);
        setPage(1);
      }
    },
    onError: () => {
      if (organizationTeamList.length > 0) {
        handleSetParamTeam(String(organizationTeamList[0].value));
      }
    },
  });
  const isCreatingRef = useRef(false);
  // Handle get list and more data task
  const getTaskBoardListTeamMore = async (pageNumber: number) => {
    setInitialLoad(true);

    const params = new URLSearchParams({
      organization_id: String(
        selectedOrganizationSideBar
          ? (selectedOrganizationSideBar?.value as string)
          : organizationId || '',
      ),
      search: valueSearch,
      page: String(pageNumber),
      page_size: '10',
      ...(dataOrderRing && { dataOrderRing }),
      ...(orderingOptions?.user_ids && {
        user_ids: orderingOptions?.user_ids.map((item) => item.value).join(','),
      }),
      ...(isConcurrently && {
        is_cross_team_task: String(isConcurrently),
      }),
      ...{ current_screen: ScreenName.TEAM_DOCK },
    });

    const apiUrl = `${apiRouters.TASK_TEAM_LIST}?${params.toString()}`;

    const { data } = await api.get<KanbanDataTeamResponse>(apiUrl);
    return data;
  };
  const { mutate: getDataListTaskTeamMore } = useMutation(
    'getDataListTaskTeamMore',
    getTaskBoardListTeamMore,
    {
      onMutate: () => {
        isCreatingRef.current = true;
      },
      onSuccess: (data) => {
        if (data.results) {
          const newData = transformDataTeamTask(data.results);

          setListDataKanbanTeam((prev) => [...prev, ...newData]);

          const newTotalStatus = transformDataTotalStatus(data.results);

          setDataTotalStatus((prev) => [...prev, ...newTotalStatus]);
          setIsHasNext(data.hasNext);
          setIsHasNext(data.hasNext);
        }
        setPage(page + 1);
      },
      onError: () => {},
      onSettled: () => {
        isCreatingRef.current = false;
        setInitialLoad(false);
      },
    },
  );
  useEffect(() => {
    const handleScroll = () => {
      const chatContainer = listContainerRef.current;
      if (
        chatContainer &&
        isHasNext &&
        chatContainer.clientWidth + Math.abs(chatContainer.scrollLeft) >=
          chatContainer.scrollWidth - 10 &&
        !initialLoad &&
        !isLoadingDataTask &&
        !isCreatingRef.current
      ) {
        getDataListTaskTeamMore(page + 1);
      }
    };

    const chatContainer = listContainerRef.current;

    if (chatContainer) {
      chatContainer.addEventListener('scroll', handleScroll);
    }

    return () => {
      if (chatContainer) {
        chatContainer.removeEventListener('scroll', handleScroll);
      }
    };
  }, [
    getDataListTaskTeamMore,
    initialLoad,
    isHasNext,
    isLoadingDataTask,
    page,
  ]);

  useEffect(() => {
    if (!isReadyToFetch) {
      refetchTaskBoardListTeam();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConcurrently, refetchTaskBoardListTeam]);

  useTaskNoSettingTeam({
    organization_id:
      (selectedOrganizationSideBar?.value as string) ||
      (organizationId as string),
    filter: {
      userId: orderingOptions?.user_ids,
      search: debouncedTaskSearch,
    },
    isReadyToFetch: isReadyToFetch,
    ordering: dataOrderRing,
    onSuccess: (data) => {
      setListTaskNoSetting(data.results);
      setTotalNoSetting({
        count: data.count,
        hasNext: data.hasNext,
      });
    },
  });
  // Handle remove option filter

  const handleRemoveItem = (
    category: 'organization_ids' | 'tag_ids' | 'category_ids' | 'user_ids',
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

  // Handle Show avatar user
  const getParticipantAvatars = (
    participants: {
      id: number;
      fullName: string;
      color: string;
      avatarUrl: string;
    }[],
  ) => {
    const slicedParticipants = participants.slice(0, 6);
    const remainingCount =
      participants.length > 3 ? participants.length - 6 : 0;

    return (
      <>
        <p className="mr-8 text-[#77858F] font-medium text-[13px]">
          メンバー{participants.length}人
        </p>
        <div className="flex items-center">
          {slicedParticipants.map((item) => {
            return (
              <div
                className="ml-[-10px] relative border-[1px] border-white rounded-full h-[32px] w-[32px]"
                key={item.id}>
                <CustomUserAvatar
                  avatarUrl={item?.avatarUrl || ''}
                  avatarColor={item?.color || ''}
                  size={32}
                  customClassName={`${!item?.avatarUrl && '!mt-0'}`}
                />
              </div>
            );
          })}
          {remainingCount > 0 && (
            <div className="ml-[-10px] relative flex items-center justify-center bg-[#97A9B2] border-[1px] border-white rounded-full text-sm text-white w-[36px] h-[36px]">
              +{remainingCount}
            </div>
          )}
        </div>
      </>
    );
  };
  //  Handle call api update index task when drag and drop
  const handleUpdateTaskIndex = async (data: {
    tasks: UpdateTaskKanbanRequest[];
  }) => {
    return await api.put(
      `${apiRouters.UPDATE_TASK_INDEX}?current_screen=teamdock`,
      {
        ...data,
        sendToChat: true,
      },
    );
  };

  // Handle update index task and response
  const { mutate: updateTaskIndex } = useMutation(
    'postUpdateTaskIndex',
    handleUpdateTaskIndex,
    {
      onSuccess: async () => {
        setIsReadyToFetch(false);
        setDataOrderRing('');
      },
      onError: () => {},
      onSettled: () => {},
    },
  );

  const handleUpdatePeopleIndex = async (data: {
    task: number;
    peopleInCharge?: string;
    statusId?: string;
    oldIdStatus: string;
    oldNameStatus: string;
  }) => {
    return await api.patch(
      `${apiRouters.TASK_DETAIL(`${data.task}`)}?current_screen=teamdock`,
      {
        peopleInChargeIds: data.peopleInCharge
          ? [{ peopleInChargeId: data.peopleInCharge }]
          : null,
        statusId: data.statusId,
        isTeamTask: true,
      },
    );
  };

  // Handle update people index task and response
  const { mutate: updatePeopleIndex } = useMutation(
    'postUpdatePeopleIndex',
    handleUpdatePeopleIndex,
    {
      onSuccess: async ({ data }, variant) => {
        const userTask =
          data.peopleInCharge.length > 0
            ? `user_${data.peopleInCharge[0].id}`
            : '';
        editTaskInKanban({
          taskData: data,
          oldIdStatus: parseInt(`${variant.oldIdStatus}`),
          oldUserId: userTask,
        });
        updateTaskStatusTotal({
          taskData: data,
          oldUserId: userTask,
          oldStatusName: variant.oldNameStatus || '',
        });
        setIsReadyToFetch(false);
        setDataOrderRing('');
      },
      onError: () => {},
      onSettled: () => {},
    },
  );

  // Handle Drag & drop
  const onDragEnd = (result: DropResult) => {
    setDragging(false);
    const { source, destination } = result;
    if (!destination) return;

    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) {
      return;
    }

    const [sourceUserId, sourceStatus] = source.droppableId.split('-');
    const [destUserId, destStatus] = destination.droppableId.split('-');

    if (
      StatusTask[sourceStatus as keyof typeof StatusTask] ===
        StatusTask.COMPLETED &&
      sourceUserId !== destUserId
    ) {
      return;
    }

    if (
      StatusTask[sourceStatus as keyof typeof StatusTask] ===
        StatusTask.COMPLETED &&
      StatusTask[destStatus as keyof typeof StatusTask] !==
        StatusTask.COMPLETED &&
      sourceUserId === destUserId
    ) {
      return;
    }

    if (
      StatusTask[destStatus as keyof typeof StatusTask] ===
        StatusTask.COMPLETED &&
      sourceUserId !== destUserId
    ) {
      return;
    }

    if (
      StatusTask[sourceStatus as keyof typeof StatusTask] !==
        StatusTask.COMPLETED &&
      StatusTask[destStatus as keyof typeof StatusTask] ===
        StatusTask.COMPLETED &&
      sourceUserId === destUserId
    ) {
      return;
    }

    // Move concurrent task to another status then return
    if (
      sourceUserId === destUserId &&
      destStatus !== sourceStatus &&
      sourceUserId !== COLUMN_ID_TASK
    ) {
      const newUsers = listDataKanbanTeam.map((user) => ({
        ...user,
        statuses: { ...user.statuses },
      }));
      const sourceUser = newUsers.find((user) => user.id === sourceUserId);
      if (!sourceUser) return;

      const sourceTasks = [
        ...sourceUser.statuses[sourceStatus as keyof TransformedStatuses],
      ];

      const [movedTask] = sourceTasks.splice(source.index, 1);
      if (movedTask.isCrossTeamTask) {
        return;
      }
    }

    // Move concurrent task to another user then return
    if (sourceUserId !== destUserId && sourceUserId !== COLUMN_ID_TASK) {
      const newUsers = listDataKanbanTeam.map((user) => ({
        ...user,
        statuses: { ...user.statuses },
      }));
      const sourceUser = newUsers.find((user) => user.id === sourceUserId);
      if (!sourceUser) return;

      const sourceTasks = [
        ...sourceUser.statuses[sourceStatus as keyof TransformedStatuses],
      ];

      const [movedTask] = sourceTasks.splice(source.index, 1);
      if (movedTask.isCrossTeamTask) {
        return;
      }
    }

    if (sourceUserId === COLUMN_ID_TASK && destUserId === COLUMN_ID_TASK) {
      // Drag no setting --> drop no setting
      if (source.index === destination.index) return;

      const movedItem = listTaskNoSetting[source.index];

      const newItems = Array.from(listTaskNoSetting).filter(
        (item) => item.id !== movedItem.id,
      );
      const prevItem = newItems[destination.index - 1];
      const nextItem = newItems[destination.index];

      const listPinAt = newItems.filter(
        (item) => item.pinAt && item.id !== movedItem.id,
      );
      const listNoPin = newItems.filter(
        (item) => !item.pinAt && item.id !== movedItem.id,
      );

      let newIndex = movedItem.index;
      setIsReadyToFetch(false);
      setDataOrderRing('');

      if (movedItem.pinAt) {
        const isPrevItemNotPinned = !prevItem || !prevItem.pinAt;
        const isNextItemNotPinned = !nextItem || !nextItem.pinAt;

        // If both previous and next items are not pinned, move the item to the top of the column
        if (isPrevItemNotPinned && isNextItemNotPinned) {
          movedItem.pinAt = convertDateStringFull(new Date());

          setListTaskNoSetting([movedItem, ...listPinAt, ...listNoPin]);

          updateTaskIndex({
            tasks: [
              {
                task: movedItem.id as number,
                index: newIndex,
                status:
                  StatusValueTask[destStatus as keyof typeof StatusValueTask],
                pinAt: movedItem.pinAt,
                team: organizationId as string,
              },
            ],
          });
        } else {
          // If not dropped at the top, calculate the `index` as before
          const dateAtPrev = prevItem ? prevItem.pinAt : null;
          const dateAtNext = nextItem ? nextItem.pinAt : null;

          const newPinAt = getRandomDateTimeBetween(dateAtNext, dateAtPrev);
          movedItem.pinAt = newPinAt;

          const sortedPinned = [...listPinAt, movedItem].sort(compareItems);

          setListTaskNoSetting([...sortedPinned, ...listNoPin]);
          updateTaskIndex({
            tasks: [
              {
                task: movedItem.id as number,
                index: movedItem.index,
                status:
                  StatusValueTask[destStatus as keyof typeof StatusValueTask],
                pinAt: movedItem.pinAt,
                team: organizationId as string,
              },
            ],
          });
        }
      } else {
        if (nextItem?.pinAt) {
          const firstNormalItem = listNoPin[0];

          newIndex =
            listNoPin.length > 0
              ? firstNormalItem.index + INITIAL_INDEX_VALUE
              : INITIAL_INDEX_VALUE_STEP;
        } else {
          let prevItemIndex = prevItem ? prevItem.index : INITIAL_INDEX_VALUE;
          if (prevItem && prevItem.pinAt) {
            prevItemIndex = INITIAL_INDEX_VALUE;
          }
          const nextItemIndex = nextItem ? nextItem.index : INITIAL_INDEX_VALUE;

          if (!prevItem && !nextItem) {
            newIndex = INITIAL_INDEX_VALUE_STEP;
          } else if (!prevItem || prevItem.pinAt) {
            newIndex = nextItemIndex + INITIAL_INDEX_VALUE;
          } else if (!nextItem) {
            newIndex = prevItemIndex - INITIAL_INDEX_VALUE;
          } else {
            newIndex = (prevItemIndex + nextItemIndex) / 2;
          }
        }
        movedItem.index = newIndex;

        const sortedPinned = [...listPinAt].sort(compareItems);
        const sortedNormal = [movedItem, ...listNoPin].sort(compareItems);

        setListTaskNoSetting([...sortedPinned, ...sortedNormal]);
        updateTaskIndex({
          tasks: [
            {
              task: movedItem.id as number,
              index: movedItem.index,
              status:
                StatusValueTask[destStatus as keyof typeof StatusValueTask],
              pinAt: movedItem.pinAt,
              team: organizationId as string,
            },
          ],
        });
      }
    }

    // Drag user --> drop no setting
    if (sourceUserId !== COLUMN_ID_TASK && destUserId === COLUMN_ID_TASK) {
      const newUsers = listDataKanbanTeam.map((user) => ({
        ...user,
        statuses: { ...user.statuses },
      }));
      const sourceUser = newUsers.find((user) => user.id === sourceUserId);
      if (!sourceUser) return;

      const sourceTasks = [
        ...sourceUser.statuses[sourceStatus as keyof TransformedStatuses],
      ];

      const [movedTask] = sourceTasks.splice(source.index, 1);
      if (!movedTask) return;
      // Return if task is running
      if (sourceUserId !== destUserId && movedTask.isStart) {
        return;
      }

      const newItems = Array.from(listTaskNoSetting);
      const prevItem = newItems[destination.index - 1];
      const nextItem = newItems[destination.index];

      const listPinAt = newItems.filter((item) => item.pinAt);
      const listNoPin = newItems.filter((item) => !item.pinAt);

      let newIndex = movedTask.index;

      updateTotalStatusSubtract({
        userId: sourceUserId,
        statusName: movedTask?.status?.name || '',
      });
      setTotalNoSetting({
        count: totalNoSetting ? totalNoSetting.count + 1 : 0,
        hasNext: totalNoSetting ? totalNoSetting.hasNext : false,
      });
      removeTaskById({
        statusId: movedTask?.status?.id as number,
        taskId: movedTask?.id as number,
        userId: sourceUserId,
      });
      setIsReadyToFetch(false);
      setDataOrderRing('');
      movedTask.isMyTask = false;
      if (movedTask.pinAt) {
        const isPrevItemNotPinned = !prevItem || !prevItem.pinAt;
        const isNextItemNotPinned = !nextItem || !nextItem.pinAt;

        // If both previous and next items are not pinned, move the item to the top of the column
        if (isPrevItemNotPinned && isNextItemNotPinned) {
          movedTask.pinAt = convertDateStringFull(new Date());

          setListTaskNoSetting([movedTask, ...listPinAt, ...listNoPin]);
          updateTaskIndex({
            tasks: [
              {
                task: movedTask.id as number,
                index: movedTask.index,
                peopleInCharge: null,
                status:
                  StatusValueTask[destStatus as keyof typeof StatusValueTask],
                pinAt: movedTask.pinAt,
                team: organizationId as string,
              },
            ],
          });
        } else {
          // If not dropped at the top, calculate the `index` as before
          const dateAtPrev = prevItem ? prevItem.pinAt : null;
          const dateAtNext = nextItem ? nextItem.pinAt : null;

          const newPinAt = getRandomDateTimeBetween(dateAtNext, dateAtPrev);
          movedTask.pinAt = newPinAt;

          const sortedPinned = [...listPinAt, movedTask].sort(compareItems);

          setListTaskNoSetting([...sortedPinned, ...listNoPin]);
          updateTaskIndex({
            tasks: [
              {
                task: movedTask.id as number,
                index: movedTask.index,
                peopleInCharge: null,
                status:
                  StatusValueTask[destStatus as keyof typeof StatusValueTask],
                pinAt: movedTask.pinAt,
                team: organizationId as string,
              },
            ],
          });
        }
      } else {
        if (nextItem?.pinAt) {
          const firstNormalItem = listNoPin[0];

          newIndex =
            listNoPin.length > 0
              ? firstNormalItem.index + INITIAL_INDEX_VALUE
              : INITIAL_INDEX_VALUE_STEP;
        } else {
          let prevItemIndex = prevItem ? prevItem.index : INITIAL_INDEX_VALUE;
          if (prevItem && prevItem.pinAt) {
            prevItemIndex = INITIAL_INDEX_VALUE;
          }
          const nextItemIndex = nextItem ? nextItem.index : INITIAL_INDEX_VALUE;

          if (!prevItem && !nextItem) {
            newIndex = INITIAL_INDEX_VALUE_STEP;
          } else if (!prevItem || prevItem.pinAt) {
            newIndex = nextItemIndex + INITIAL_INDEX_VALUE;
          } else if (!nextItem) {
            newIndex = prevItemIndex - INITIAL_INDEX_VALUE;
          } else {
            newIndex = (prevItemIndex + nextItemIndex) / 2;
          }
        }
        movedTask.index = newIndex;

        const sortedPinned = [...listPinAt].sort(compareItems);
        const sortedNormal = [movedTask, ...listNoPin].sort(compareItems);

        setListTaskNoSetting([...sortedPinned, ...sortedNormal]);
        updateTaskIndex({
          tasks: [
            {
              task: movedTask.id as number,
              index: movedTask.index,
              peopleInCharge: null,
              status:
                StatusValueTask[destStatus as keyof typeof StatusValueTask],
              pinAt: movedTask.pinAt,
              team: organizationId as string,
            },
          ],
        });
      }
    }

    // Drag no setting --> drop user
    if (sourceUserId === COLUMN_ID_TASK && destUserId !== COLUMN_ID_TASK) {
      const newUsers = listDataKanbanTeam.map((user) => ({
        ...user,
        statuses: { ...user.statuses },
      }));
      const destUser = newUsers.find((user) => user.id === destUserId);
      if (!destUser) return;

      const destTasks = [
        ...destUser.statuses[destStatus as keyof TransformedStatuses],
      ];
      const movedItem = listTaskNoSetting[source.index];

      // Item
      const belowItem = destTasks[destination.index];
      const aboveItem = destTasks[destination.index - 1]; // Item above drop position

      let newPinAt = movedItem.pinAt;
      let newIndex = movedItem.index;
      setListTaskNoSetting(
        listTaskNoSetting.filter((item) => item.id !== movedItem.id),
      );

      updateTotalStatusAdd({
        userId: destUserId,
        statusName: StatusTask[destStatus as keyof typeof StatusTask],
      });
      setIsReadyToFetch(false);
      setDataOrderRing('');
      setTotalNoSetting({
        count: totalNoSetting ? totalNoSetting.count - 1 : 0,
        hasNext: totalNoSetting ? totalNoSetting.hasNext : false,
      });
      if (movedItem.pinAt) {
        if (!belowItem?.pinAt && !aboveItem?.pinAt) {
          // If neither top nor bottom has pinAt -> Move item to top of list
          newPinAt = convertDateStringFull(new Date());
          destTasks.unshift({
            ...movedItem,
            isMyTask:
              String(session?.user.id) === destUserId.replace('user_', ''),
            pinAt: newPinAt,
            status: {
              id: StatusValueTask[destStatus as keyof typeof StatusValueTask],
              name: StatusTask[destStatus as keyof typeof StatusTask],
            },
          });
        } else {
          const dateAtPrev = aboveItem ? aboveItem.pinAt : null;
          const dateAtNext = belowItem ? belowItem.pinAt : null;
          newPinAt = getRandomDateTimeBetween(dateAtNext, dateAtPrev);
          destTasks.splice(destination.index, 0, {
            ...movedItem,
            isMyTask:
              String(session?.user.id) === destUserId.replace('user_', ''),
            pinAt: newPinAt,
            status: {
              id: StatusValueTask[destStatus as keyof typeof StatusValueTask],
              name: StatusTask[destStatus as keyof typeof StatusTask],
            },
          });
        }
      } else {
        if (belowItem?.pinAt) {
          // If the item behind has pinAt -> Move all items with pinAt down
          const indexBelowPinnedItems = destTasks.findIndex(
            (task) => !task.pinAt,
          );

          if (indexBelowPinnedItems !== -1) {
            const firstNonPinnedItem = destTasks[indexBelowPinnedItems];
            newIndex = firstNonPinnedItem.index + INITIAL_INDEX_VALUE;
            destTasks.splice(indexBelowPinnedItems, 0, {
              ...movedItem,
              isMyTask:
                String(session?.user.id) === destUserId.replace('user_', ''),
              index: newIndex,
              status: {
                id: StatusValueTask[destStatus as keyof typeof StatusValueTask],
                name: StatusTask[destStatus as keyof typeof StatusTask],
              },
            });
          } else {
            newIndex = INITIAL_INDEX_VALUE * 1000;
            destTasks.push({
              ...movedItem,
              isMyTask:
                String(session?.user.id) === destUserId.replace('user_', ''),
              index: newIndex,
              status: {
                id: StatusValueTask[destStatus as keyof typeof StatusValueTask],
                name: StatusTask[destStatus as keyof typeof StatusTask],
              },
            });
          }
        } else {
          // If there is no pinAt behind -> Insert into the correct drop position
          let prevItemIndex = belowItem ? belowItem.index : INITIAL_INDEX_VALUE;
          if (belowItem && belowItem.pinAt) {
            prevItemIndex = INITIAL_INDEX_VALUE;
          }
          const nextItemIndex = aboveItem
            ? aboveItem.index
            : INITIAL_INDEX_VALUE;
          if (!aboveItem && !belowItem) {
            newIndex = INITIAL_INDEX_VALUE_STEP;
          } else if (!aboveItem || aboveItem.pinAt) {
            newIndex = prevItemIndex + INITIAL_INDEX_VALUE;
          } else if (!belowItem) {
            newIndex = nextItemIndex - INITIAL_INDEX_VALUE;
          } else {
            newIndex = (prevItemIndex + nextItemIndex) / 2;
          }

          destTasks.splice(destination.index, 0, {
            ...movedItem,
            isMyTask:
              String(session?.user.id) === destUserId.replace('user_', ''),
            index: newIndex,
            status: {
              id: StatusValueTask[destStatus as keyof typeof StatusValueTask],
              name: StatusTask[destStatus as keyof typeof StatusTask],
            },
          });
        }
      }
      destUser.statuses[destStatus as keyof TransformedStatuses] = destTasks;
      setListDataKanbanTeam(newUsers);
      updateTaskIndex({
        tasks: [
          {
            task: movedItem.id as number,
            peopleInCharge: destUserId.replace('user_', ''),
            index: newIndex,
            status: StatusValueTask[destStatus as keyof typeof StatusValueTask],
            pinAt: newPinAt,
            team: organizationId as string,
          },
        ],
      });
    }
    // Drag user --> drop user
    if (sourceUserId !== COLUMN_ID_TASK && destUserId !== COLUMN_ID_TASK) {
      if (!sourceUserId || !sourceStatus || !destUserId || !destStatus) return;

      const newUsers = listDataKanbanTeam.map((user) => ({
        ...user,
        statuses: { ...user.statuses },
      }));

      const sourceUser = newUsers.find((user) => user.id === sourceUserId);
      const destUser = newUsers.find((user) => user.id === destUserId);
      if (!sourceUser || !destUser) return;
      const sourceTasks = [
        ...sourceUser.statuses[sourceStatus as keyof TransformedStatuses],
      ];
      const destTasks = [
        ...destUser.statuses[destStatus as keyof TransformedStatuses],
      ];

      const [movedTask] = sourceTasks.splice(source.index, 1);
      if (!movedTask) return;

      if (sourceUserId !== destUserId || sourceStatus !== destStatus) {
        setIsReadyToFetch(false);
        setDataOrderRing('');
      }
      const existingTaskIndex = destTasks.findIndex(
        (task) => task.id === movedTask.id,
      );
      if (existingTaskIndex !== -1) {
        destTasks.splice(existingTaskIndex, 1);
      }

      // Return if task is running
      if (sourceUserId !== destUserId && movedTask.isStart) {
        return;
      }
      // Update total
      if (destUserId === sourceUserId && destStatus === sourceStatus) {
        // handle logic
      } else {
        updateTaskStatusTotalWhenDrop({
          newUserId: destUserId,
          oldUserId: sourceUserId,
          newStatusName: StatusTask[destStatus as keyof typeof StatusTask],
          oldStatusName: StatusTask[sourceStatus as keyof typeof StatusTask],
        });
      }

      // Item
      const belowItem = destTasks[destination.index];
      const aboveItem = destTasks[destination.index - 1]; // Item above drop position

      let newPinAt = movedTask.pinAt;
      let newIndex = movedTask.index;

      if (movedTask.pinAt) {
        if (!belowItem?.pinAt && !aboveItem?.pinAt) {
          // If neither top nor bottom has pinAt -> Move item to top of list
          newPinAt = convertDateStringFull(new Date());
          destTasks.unshift({
            ...movedTask,
            isMyTask:
              String(session?.user.id) === destUserId.replace('user_', ''),
            pinAt: newPinAt,
            status: {
              id: StatusValueTask[destStatus as keyof typeof StatusValueTask],
              name: StatusTask[destStatus as keyof typeof StatusTask],
            },
            repeatType:
              StatusValueTask[sourceStatus as keyof typeof StatusValueTask] !=
                StatusValueTask.MY_ROUTINE &&
              StatusValueTask[destStatus as keyof typeof StatusValueTask] ==
                StatusValueTask.MY_ROUTINE
                ? TASK_REPETITIVE_OPTIONS.find(
                    (option) => option.label == TaskRepetitiveType.ONCE,
                  )?.value
                : movedTask.repeatType,
          });
        } else {
          const dateAtPrev = aboveItem ? aboveItem.pinAt : null;
          const dateAtNext = belowItem ? belowItem.pinAt : null;
          newPinAt = getRandomDateTimeBetween(dateAtNext, dateAtPrev);
          destTasks.splice(destination.index, 0, {
            ...movedTask,
            isMyTask:
              String(session?.user.id) === destUserId.replace('user_', ''),
            pinAt: newPinAt,
            status: {
              id: StatusValueTask[destStatus as keyof typeof StatusValueTask],
              name: StatusTask[destStatus as keyof typeof StatusTask],
            },
            repeatType:
              StatusValueTask[sourceStatus as keyof typeof StatusValueTask] !=
                StatusValueTask.MY_ROUTINE &&
              StatusValueTask[destStatus as keyof typeof StatusValueTask] ==
                StatusValueTask.MY_ROUTINE
                ? TASK_REPETITIVE_OPTIONS.find(
                    (option) => option.label == TaskRepetitiveType.ONCE,
                  )?.value
                : movedTask.repeatType,
          });
        }
      } else {
        if (belowItem?.pinAt) {
          // If the item behind has pinAt -> Move all items with pinAt down
          const indexBelowPinnedItems = destTasks.findIndex(
            (task) => !task.pinAt,
          );

          if (indexBelowPinnedItems !== -1) {
            const firstNonPinnedItem = destTasks[indexBelowPinnedItems];
            newIndex = firstNonPinnedItem.index + INITIAL_INDEX_VALUE;
            destTasks.splice(indexBelowPinnedItems, 0, {
              ...movedTask,
              isMyTask:
                String(session?.user.id) === destUserId.replace('user_', ''),
              index: newIndex,
              status: {
                id: StatusValueTask[destStatus as keyof typeof StatusValueTask],
                name: StatusTask[destStatus as keyof typeof StatusTask],
              },
              repeatType:
                StatusValueTask[sourceStatus as keyof typeof StatusValueTask] !=
                  StatusValueTask.MY_ROUTINE &&
                StatusValueTask[destStatus as keyof typeof StatusValueTask] ==
                  StatusValueTask.MY_ROUTINE
                  ? TASK_REPETITIVE_OPTIONS.find(
                      (option) => option.label == TaskRepetitiveType.ONCE,
                    )?.value
                  : movedTask.repeatType,
            });
          } else {
            newIndex = INITIAL_INDEX_VALUE * 1000;
            destTasks.push({
              ...movedTask,
              isMyTask:
                String(session?.user.id) === destUserId.replace('user_', ''),
              index: newIndex,
              status: {
                id: StatusValueTask[destStatus as keyof typeof StatusValueTask],
                name: StatusTask[destStatus as keyof typeof StatusTask],
              },
              repeatType:
                StatusValueTask[sourceStatus as keyof typeof StatusValueTask] !=
                  StatusValueTask.MY_ROUTINE &&
                StatusValueTask[destStatus as keyof typeof StatusValueTask] ==
                  StatusValueTask.MY_ROUTINE
                  ? TASK_REPETITIVE_OPTIONS.find(
                      (option) => option.label == TaskRepetitiveType.ONCE,
                    )?.value
                  : movedTask.repeatType,
            });
          }
        } else {
          // If there is no pinAt behind -> Insert into the correct drop position
          let prevItemIndex = belowItem ? belowItem.index : INITIAL_INDEX_VALUE;
          if (belowItem && belowItem.pinAt) {
            prevItemIndex = INITIAL_INDEX_VALUE;
          }
          const nextItemIndex = aboveItem
            ? aboveItem.index
            : INITIAL_INDEX_VALUE;
          if (!aboveItem && !belowItem) {
            newIndex = INITIAL_INDEX_VALUE_STEP;
          } else if (!aboveItem || aboveItem.pinAt) {
            newIndex = prevItemIndex + INITIAL_INDEX_VALUE;
          } else if (!belowItem) {
            newIndex = nextItemIndex - INITIAL_INDEX_VALUE;
          } else {
            newIndex = (prevItemIndex + nextItemIndex) / 2;
          }

          destTasks.splice(destination.index, 0, {
            ...movedTask,
            isMyTask:
              String(session?.user.id) === destUserId.replace('user_', ''),
            index: newIndex,
            status: {
              id: StatusValueTask[destStatus as keyof typeof StatusValueTask],
              name: StatusTask[destStatus as keyof typeof StatusTask],
            },
            repeatType:
              StatusValueTask[sourceStatus as keyof typeof StatusValueTask] !=
                StatusValueTask.MY_ROUTINE &&
              StatusValueTask[destStatus as keyof typeof StatusValueTask] ==
                StatusValueTask.MY_ROUTINE
                ? TASK_REPETITIVE_OPTIONS.find(
                    (option) => option.label == TaskRepetitiveType.ONCE,
                  )?.value
                : movedTask.repeatType,
          });
        }
      }

      sourceUser.statuses[sourceStatus as keyof TransformedStatuses] =
        sourceTasks;
      destUser.statuses[destStatus as keyof TransformedStatuses] = destTasks;
      setListDataKanbanTeam(newUsers);

      updateTaskIndex({
        tasks: [
          {
            task: movedTask.id as number,
            peopleInCharge: destUserId.replace('user_', ''),
            index: newIndex,
            status: StatusValueTask[destStatus as keyof typeof StatusValueTask],
            pinAt: newPinAt,
            team: organizationId as string,
          },
        ],
      });
    }
  };

  // Calculate width kanban
  const calculateWidth = (baseWidth: number, percentage: number): number => {
    return (baseWidth * percentage) / 100;
  };

  // Remove params
  const handleRemoveParam = () => {
    const params = new URLSearchParams(searchParams);
    params.delete('task');
    params.delete('action');
    params.delete('type');

    router.replace(`?${params.toString()}`);
    setIsShowModalEditTeam(false);
  };

  useEffect(() => {
    if (actionType && typeDetail === ItemStartType.TASK) {
      if (taskDetailId) {
        setIsShowModalEditTeam(true);

        setTimeout(() => {
          getDataDetailTask(parseInt(taskDetailId));
        }, 500);
      } else {
        setIsShowModalEditTeam(true);
      }
    } else {
      setIsShowModalEditTeam(false);
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskDetailId, actionType, typeDetail]);

  // API

  // Get detail task
  const handleGetDataDetailTask = async (id: number) => {
    const { data: response } = await api.get(
      `${apiRouters.TASK_DETAIL(`${id}`)}?current_screen=teamdock
`,
    );
    return response;
  };
  // Handle Call API get detail task
  const { mutate: getDataDetailTask } = useMutation(
    'getDetailTask',
    handleGetDataDetailTask,
    {
      onSuccess: async (data) => {
        setDataTaskEdit(data);
        setIsShowModalEditTeam(true);
      },
      onError: () => {
        handleRemoveParam();
      },
    },
  );

  // Action create
  // Function create  tasks
  const handleConfirmCreateTask = (data: TaskFormData) => {
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

    createTask({
      title: data.title || '',
      statusId: data.statusId ? (data.statusId.value as number) : null,
      priority: data.priority ? data.priority.value.toString() : '',
      deadline:
        data.deadlineDate && data.deadlineTime
          ? addTimeToDate(data.deadlineDate as Date, data.deadlineTime)
          : data.deadlineDate && !data.deadlineTime
            ? formatDateServer(data.deadlineDate)
            : null,
      description: data.description || '',
      tagIds: tagIds,
      isImportant: data.isImportant,
      todoList: todoListData,
      taskSchedules: planList && planList.length ? planList : null,
      sendToChat: true,
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
      remind_at:
        !data.deadlineRemindCountdown?.value && !data.deadlineRemindType?.value
          ? null
          : undefined,
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
          ? data.weekDay && data.weekDay.label != ''
            ? Number(data.weekDay.value)
            : null
          : null,
      monthDay:
        data.statusId?.value == StatusValueTask.MY_ROUTINE
          ? data.monthDay && data.monthDay.value
            ? Number(data.monthDay.value)
            : null
          : null,
      month:
        data.statusId?.value == StatusValueTask.MY_ROUTINE
          ? data.month && data.month.value
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
      // DATA PEOPLE CHOOSE
      peopleInChargeIds:
        data.peopleInChart && data.peopleInChart.value !== ''
          ? [{ peopleInChargeId: data.peopleInChart.value }]
          : [],
      isTeamTask: true,
      showDeadlineTime: data.showDeadlineTime,
    });
  };
  //  Handle call api create task
  const handleCreateTask = async (data: TaskRequest) => {
    setIsLoading(true);
    return await api.post(
      `${apiRouters.CREATE_TASK}?current_screen=teamdock`,
      data,
    );
  };
  // Handle create task and response
  const { mutate: createTask } = useMutation(
    'postCreateUser',
    handleCreateTask,
    {
      onSuccess: async ({ data }: { data: Task }) => {
        if (data.peopleInCharge.length > 0) {
          if (actionType && actionType === ActionTask.COPY) {
            copyTaskInKanban({
              dataTask: data,
              taskCopyId: `${taskDetailId}`,
            });
          } else {
            addTaskToKanban(data);
          }
          updateTotalStatusAdd({
            userId:
              data.peopleInCharge && data.peopleInCharge.length > 0
                ? `user_${data.peopleInCharge[0].id}`
                : '',
            statusName: data.status?.name || '',
          });
        } else {
          const listPinAt = listTaskNoSetting.filter(
            (item) => item.pinAt && item.id !== data.id,
          );
          const listNoPin = listTaskNoSetting.filter(
            (item) => !item.pinAt && item.id !== data.id,
          );
          setListTaskNoSetting([...listPinAt, data, ...listNoPin]);
          setTotalNoSetting({
            count: totalNoSetting ? totalNoSetting.count + 1 : 0,
            hasNext: totalNoSetting ? totalNoSetting.hasNext : false,
          });
        }
        showToast({
          description: SUCCESS_CREATE_MESSAGE,
        });
        setPendingTaskData(null);
        setCloseAction(null);
        handleRemoveParam();
        setDataTaskEdit(null);
        setIsReadyToFetch(false);
        setDataOrderRing('');
        setIsShowModalEditTeam(false);
      },
      onError: (error: AxiosError<any>) => {
        if (error.response?.data.taskSchedules) {
          showErrorToast(error, ERROR_MESSAGE_OVERLAP_TASK);
        } else {
          showErrorToast(error, ERROR_CREATE_MESSAGE);
        }
      },
      onSettled: () => {
        setIsLoading(false);
      },
    },
  );

  //Action edit
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
      oldNameStatus: data.oldNameStatus,
      oldIdPeople: data.oldIdPeople,
      sendToChat: true,
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
      // DATA PEOPLE CHOOSE
      peopleInChargeIds:
        data.peopleInChart && data.peopleInChart.value !== ''
          ? [{ peopleInChargeId: data.peopleInChart.value }]
          : [],
      isTeamTask: true,
      showDeadlineTime: data.showDeadlineTime,
    });
  };
  //  Handle call api edit task
  const handleEditTask = async (data: TaskRequest) => {
    setIsLoading(true);
    return await api.patch(
      `${apiRouters.TASK_DETAIL(`${data.id}`)}?current_screen=teamdock`,
      data,
    );
  };
  const { mutate: editTask } = useMutation('postEditTask', handleEditTask, {
    onSuccess: async ({ data }: { data: Task }, variant) => {
      if (data.peopleInCharge.length > 0) {
        editTaskInKanban({
          taskData: data,
          oldIdStatus: oldUserAction
            ? oldUserAction.statusId
            : parseInt(`${variant.oldIdStatus}`),
          oldUserId: oldUserAction
            ? oldUserAction.id
            : `user_${variant.oldIdPeople}`,
        });
        updateTaskStatusTotal({
          taskData: data,
          oldUserId: oldUserAction
            ? oldUserAction.id
            : `user_${variant.oldIdPeople}`,
          oldStatusName: oldUserAction
            ? oldUserAction.statusName
            : variant.oldNameStatus || '',
        });
        const itemChange = listTaskNoSetting.find(
          (item) => item.id === data.id,
        );
        if (itemChange) {
          setListTaskNoSetting(
            listTaskNoSetting.filter((item) => item.id !== data.id),
          );
          setTotalNoSetting({
            count: (totalNoSetting?.count || 0) - 1,
            hasNext: totalNoSetting?.hasNext || false,
          });
        }
      } else {
        updateTotalStatusSubtract({
          userId: oldUserAction
            ? oldUserAction.id
            : dataTaskEdit?.peopleInCharge &&
                dataTaskEdit.peopleInCharge.length > 0
              ? `user_${dataTaskEdit?.peopleInCharge[0].id}`
              : '',
          statusName: oldUserAction
            ? oldUserAction.statusName
            : dataTaskEdit?.status?.name || '',
        });
        removeTaskById({
          statusId: oldUserAction
            ? oldUserAction.statusId
            : (dataTaskEdit?.status?.id as number),
          taskId: dataTaskEdit?.id as number,
          userId: oldUserAction
            ? oldUserAction.id
            : dataTaskEdit?.peopleInCharge &&
                dataTaskEdit.peopleInCharge.length > 0
              ? `user_${dataTaskEdit?.peopleInCharge[0].id}`
              : '',
        });
        if (dataTaskEdit?.peopleInCharge.length !== 0) {
          setTotalNoSetting({
            count: (totalNoSetting?.count || 0) + 1,
            hasNext: totalNoSetting?.hasNext || false,
          });
        }
        const itemFind = listTaskNoSetting.find((item) => item.id === data.id);
        if (itemFind) {
          const newList = listTaskNoSetting.map((item) => {
            if (item.id === data.id) {
              return data;
            }
            return item;
          });
          setListTaskNoSetting(newList);
        } else {
          setListTaskNoSetting([data, ...listTaskNoSetting].sort(compareItems));
        }
      }
      const isSameDeadline =
        data.deadline == null && dataTaskEdit?.deadline == null
          ? true
          : data.deadline != null &&
            dataTaskEdit?.deadline != null &&
            new Date(data.deadline).getTime() ===
              new Date(dataTaskEdit.deadline).getTime();
      const firstId =
        data.peopleInCharge && data.peopleInCharge.length
          ? data.peopleInCharge?.[0]?.id
          : null;
      const editFirstId =
        dataTaskEdit &&
        dataTaskEdit.peopleInCharge &&
        dataTaskEdit.peopleInCharge.length
          ? dataTaskEdit?.peopleInCharge?.[0]?.id
          : null;

      const isPeopleChanged = firstId !== editFirstId;
      if (
        isSameDeadline &&
        data.isImportant === dataTaskEdit?.isImportant &&
        data.peopleInCharge.length === 0 &&
        dataTaskEdit?.peopleInCharge.length === 0 &&
        data.status?.id !== dataTaskEdit?.status?.id
      ) {
        // handle data
      } else {
        if (dataOrderRing !== FilterTypeKanban.DEADLINE) {
          if (
            !isSameDeadline ||
            data.isImportant !== dataTaskEdit?.isImportant ||
            data.peopleInCharge.length !==
              dataTaskEdit?.peopleInCharge.length ||
            isPeopleChanged ||
            data.status?.id !== dataTaskEdit.status?.id
          ) {
            setIsReadyToFetch(false);
            setDataOrderRing('');
          }
        } else {
          if (
            !isSameDeadline ||
            data.peopleInCharge.length !==
              dataTaskEdit?.peopleInCharge.length ||
            isPeopleChanged ||
            data.status?.id !== dataTaskEdit?.status?.id
          ) {
            setIsReadyToFetch(false);
            setDataOrderRing('');
          }
        }
      }

      handleRemoveParam();
      if (
        data.peopleInCharge &&
        data.peopleInCharge.length &&
        session?.user.id === data.peopleInCharge?.[0]?.id
      ) {
        queryClient.refetchQueries(['getDataTaskHeaderList']);
      }
      queryClient.refetchQueries(['getTaskDurationDetail']);
      setPendingTaskData(null);
      setCloseAction(null);
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
      if (response?.status === ServerStatusCode.NOT_FOUND) {
        showToast({
          variant: 'error',
          description: ERROR_UPDATE_MESSAGE,
        });
      } else {
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
      }
    },
    onSettled: () => {
      setTimeout(() => {
        setIsLoading(false);
      }, 500);
    },
  });

  // Handle delete task
  const handleDeleteTask = async (id: string) => {
    const { data: response } = await api.delete(
      `${apiRouters.TASK_DETAIL(`${id}`)}?current_screen=teamdock`,
    );
    return response;
  };

  const { mutate: deleteTask } = useMutation('deleteTask', handleDeleteTask, {
    onSuccess: async () => {
      setIsShowModalEditTeam(false);
      handleRemoveParam();

      if (
        dataTaskEdit?.peopleInCharge &&
        dataTaskEdit.peopleInCharge.length > 0
      ) {
        updateTotalStatusSubtract({
          userId:
            dataTaskEdit?.peopleInCharge &&
            dataTaskEdit.peopleInCharge.length > 0
              ? `user_${dataTaskEdit.peopleInCharge[0].id}`
              : '',
          statusName: dataTaskEdit?.status?.name || '',
        });
        removeTaskById({
          statusId: dataTaskEdit?.status?.id as number,
          taskId: dataTaskEdit?.id as number,
          userId:
            dataTaskEdit?.peopleInCharge &&
            dataTaskEdit.peopleInCharge.length > 0
              ? `user_${dataTaskEdit.peopleInCharge[0].id}`
              : '',
        });
      } else {
        setListTaskNoSetting(
          listTaskNoSetting.filter((item) => item.id !== dataTaskEdit?.id),
        );
        setTotalNoSetting({
          count: totalNoSetting ? totalNoSetting.count - 1 : 0,
          hasNext: totalNoSetting ? totalNoSetting.hasNext : false,
        });
      }
      queryClient.refetchQueries(['getTaskDurationDetail']);
      showToast({
        description: SUCCESS_DELETE_MESSAGE,
      });
      setOpenConfirmDeleteTaskModal(false);
    },
    onError: (error: AxiosError<any>) => {
      showErrorToast(error, ERROR_DELETE_MESSAGE);
      setIsLoading(false);
    },
    onSettled: () => {
      setIsLoading(false);
    },
  });

  // Action add new task into kanban
  const addTaskToKanban = (task: Task) => {
    const userTask =
      task.peopleInCharge.length > 0 ? `user_${task.peopleInCharge[0].id}` : '';
    setListDataKanbanTeam((prevList) => {
      return prevList.map((user) => {
        if (user.id !== userTask) return user;

        const statusKey = Object.entries(StatusValueTask).find(
          ([, value]) => value === task.status?.id,
        )?.[0] as keyof TransformedStatuses;

        if (!statusKey || !user.statuses[statusKey]) return user;

        const updatedTasks = [...user.statuses[statusKey], task].sort(
          compareItems,
        );

        return {
          ...user,
          statuses: {
            ...user.statuses,
            [statusKey]: updatedTasks,
          },
        };
      });
    });
  };

  // Action edit task into kanban
  const editTaskInKanban = ({
    taskData,
    oldIdStatus,
    oldUserId,
  }: {
    taskData: Task;
    oldIdStatus: number;
    oldUserId: string;
  }) => {
    setListDataKanbanTeam((prevList) => {
      return prevList.map((user) => {
        const updatedStatuses: TransformedStatuses = { ...user.statuses };
        const userTask =
          taskData.peopleInCharge.length > 0
            ? `user_${taskData.peopleInCharge[0].id}`
            : '';
        if (oldUserId !== userTask) {
          // If user changes, delete task from old user
          if (user.id === oldUserId) {
            (
              Object.keys(updatedStatuses) as (keyof TransformedStatuses)[]
            ).forEach((status) => {
              updatedStatuses[status] = updatedStatuses[status].filter(
                (task) => task.id !== taskData.id,
              );
            });
          }

          // Add task to new user
          if (user.id === userTask) {
            const statusKey = Object.entries(StatusValueTask).find(
              ([, value]) => value === taskData.status?.id,
            )?.[0] as keyof TransformedStatuses;

            if (statusKey) {
              const existingTasks = updatedStatuses[statusKey] || [];
              const updatedTaskList = [...existingTasks, taskData].sort(
                compareItems,
              );

              // Check if the last task has pinAt or not, if not add it
              if (
                !existingTasks.length ||
                !existingTasks[existingTasks.length - 1].pinAt
              ) {
                updatedStatuses[statusKey] = updatedTaskList;
              }
            }
          }
        } else if (oldIdStatus !== taskData.status?.id) {
          // If only changing state in the same user

          if (user.id === oldUserId) {
            const oldStatusKey = Object.entries(StatusValueTask).find(
              ([, value]) => value === oldIdStatus,
            )?.[0] as keyof TransformedStatuses;

            const newStatusKey = Object.entries(StatusValueTask).find(
              ([, value]) => value === taskData.status?.id,
            )?.[0] as keyof TransformedStatuses;

            if (oldStatusKey && newStatusKey) {
              // Remove task from old state
              updatedStatuses[oldStatusKey] = updatedStatuses[
                oldStatusKey
              ].filter((task) => task.id !== taskData.id);

              // Add task to new state
              const updatedTaskList = [
                ...(updatedStatuses[newStatusKey] || []),
                taskData,
              ].sort(compareItems);

              // Check if the last task does not have `pinAt`, then keep the list as is
              if (
                !updatedStatuses[newStatusKey].length ||
                !updatedStatuses[newStatusKey][
                  updatedStatuses[newStatusKey].length - 1
                ].pinAt
              ) {
                updatedStatuses[newStatusKey] = updatedTaskList;
              }
            }
          }
        } else {
          // If user is not changed and state is not changed, check if task exists
          const statusKey = Object.entries(StatusValueTask).find(
            ([, value]) => value === taskData.status?.id,
          )?.[0] as keyof TransformedStatuses;

          if (
            statusKey &&
            updatedStatuses[statusKey].some((task) => task.id === taskData.id)
          ) {
            // If the task exists, update it
            updatedStatuses[statusKey] = updatedStatuses[statusKey].map(
              (task) => (task.id === taskData.id ? taskData : task),
            );
          }
        }

        return { ...user, statuses: updatedStatuses };
      });
    });
  };

  // Action copy task
  // Action Copy task into kanban
  const copyTaskInKanban = ({
    taskCopyId,
    dataTask,
  }: {
    taskCopyId: string;
    dataTask: Task;
  }) => {
    setListDataKanbanTeam((prevList) => {
      return prevList.map((user) => {
        const updatedStatuses: TransformedStatuses = { ...user.statuses };

        (Object.keys(updatedStatuses) as (keyof TransformedStatuses)[]).forEach(
          (status) => {
            const tasks = updatedStatuses[status];
            const taskIndex = tasks.findIndex(
              (task) => String(task.id) === taskCopyId,
            );

            if (taskIndex !== -1) {
              const updatedTasks = [
                ...tasks.slice(0, taskIndex + 1),
                dataTask,
                ...tasks.slice(taskIndex + 1),
              ].sort(compareItems);

              updatedStatuses[status] = updatedTasks;
            }
          },
        );

        return { ...user, statuses: updatedStatuses };
      });
    });
  };
  // Action delete task
  // Action delete
  const handleConfirmDeleteTask = () => {
    if (taskDetailId) {
      setIsLoading(true);
      deleteTask(taskDetailId);
      setDataTaskEdit(null);

      return;
    }
  };

  // Action PIN / UNPIN
  // API pin task
  const handlePinTask = async (data: {
    id: string;
    pinAt?: string;
    userId?: string;
  }) => {
    const { data: response } = await api.put(
      `${apiRouters.TASK_PIN(`${data.id}`)}?current_screen=teamdock`,
      {
        pinAt: data.pinAt,
        team: organizationId,
      },
    );
    return response;
  };

  const { mutate: pinTask } = useMutation('pinTask', handlePinTask, {
    onSuccess: async (data: TaskPinResponse, variant) => {
      if (variant.userId) {
        const newData = {
          ...data,
          user: parseInt(variant.userId),
        };

        if (data.pinAt !== null) {
          pinTaskInKanban(newData);
        } else {
          unpinTaskInKanban(newData);
        }
      } else {
        if (data.pinAt !== null) {
          pinTaskNoSetting(data);
        } else {
          unPinTaskNoSetting(data);
        }
      }
    },
    onError: (error: AxiosError<any>) => {
      showErrorToast(error, ERROR_SAVE_MESSAGE);
    },
    onSettled: () => {},
  });
  const pinTaskInKanban = (taskPinData: TaskPinResponse) => {
    setListDataKanbanTeam((prevList) => {
      return prevList.map((user) => {
        if (user.id !== `user_${taskPinData.user}`) return user;

        const updatedStatuses: TransformedStatuses = { ...user.statuses };

        (Object.keys(updatedStatuses) as (keyof TransformedStatuses)[]).forEach(
          (status) => {
            let tasks = updatedStatuses[status];

            const taskIndex = tasks.findIndex(
              (task) => task.id === taskPinData.task,
            );
            if (taskIndex !== -1) {
              const taskToUpdate = {
                ...tasks[taskIndex],
                pinAt: taskPinData.pinAt,
              };
              tasks = [
                taskToUpdate,
                ...tasks.filter((task) => task.id !== taskPinData.task),
              ].sort(compareItems);
              updatedStatuses[status] = tasks;
            }
          },
        );

        return { ...user, statuses: updatedStatuses };
      });
    });
  };
  const unpinTaskInKanban = (taskPinData: TaskPinResponse) => {
    setListDataKanbanTeam((prevList) => {
      return prevList.map((user) => {
        const updatedStatuses: TransformedStatuses = { ...user.statuses };
        (Object.keys(updatedStatuses) as (keyof TransformedStatuses)[]).forEach(
          (status) => {
            const tasks = updatedStatuses[status];
            const taskIndex = tasks.findIndex(
              (task) => task.id === taskPinData.task,
            );

            if (taskIndex !== -1) {
              const updatedTasks = tasks
                .map((task) =>
                  task.id === taskPinData.task
                    ? { ...task, pinAt: null, index: taskPinData.index }
                    : task,
                )
                .sort(compareItems);

              updatedStatuses[status] = updatedTasks;
            }
          },
        );

        return { ...user, statuses: updatedStatuses };
      });
    });
  };
  const pinTaskNoSetting = (task: TaskPinResponse) => {
    const listFilter = listTaskNoSetting.filter(
      (item) => item.id !== task.task,
    );
    const itemPin = listTaskNoSetting.find((item) => item.id === task.task);
    if (itemPin) {
      setListTaskNoSetting([{ ...itemPin, pinAt: task.pinAt }, ...listFilter]);
    }
  };
  const unPinTaskNoSetting = (task: TaskPinResponse) => {
    const listFilter = listTaskNoSetting.filter(
      (item) => item.id !== task.task,
    );
    const itemPin = listTaskNoSetting.find((item) => item.id === task.task);
    if (itemPin) {
      setListTaskNoSetting(
        [{ ...itemPin, pinAt: null }, ...listFilter].sort(compareItems),
      );
    }
  };

  // Handle call api pin / unpin
  const pinItemToTop = (itemId: string | number, userId: string) => {
    pinTask({
      id: `${itemId}`,
      pinAt: convertDateStringFull(new Date()),
      userId: userId,
    });
    setIsReadyToFetch(false);
    setDataOrderRing('');
  };
  const pinItemToTopNoSetting = (itemId: string | number) => {
    pinTask({
      id: `${itemId}`,
      pinAt: convertDateStringFull(new Date()),
    });
    setIsReadyToFetch(false);
    setDataOrderRing('');
  };

  // Action update total
  const updateTotalStatusAdd = ({
    userId,
    statusName,
  }: {
    userId: string;
    statusName: string;
  }) => {
    setDataTotalStatus((prevData) => {
      return prevData.map((user) => {
        if (user.id === userId) {
          return {
            ...user,
            statuses: user.statuses.map((status) =>
              status.name === statusName
                ? { ...status, total: status.total + 1 }
                : status,
            ),
          };
        }
        return user;
      });
    });
  };
  const updateTotalStatusSubtract = ({
    userId,
    statusName,
  }: {
    userId: string;
    statusName: string;
  }) => {
    setDataTotalStatus((prevData) =>
      prevData.map((user) =>
        user.id === userId
          ? {
              ...user,
              statuses: user.statuses.map((status) =>
                status.name === statusName && status.total > 0
                  ? { ...status, total: status.total - 1 }
                  : status,
              ),
            }
          : user,
      ),
    );
  };

  const updateTaskStatusTotal = ({
    taskData,
    oldStatusName,
    oldUserId,
  }: {
    taskData: Task;
    oldStatusName: string;
    oldUserId: string;
  }) => {
    setDataTotalStatus((prevData) => {
      return prevData.map((user) => {
        if (user.id === oldUserId) {
          if (
            oldStatusName === taskData.status?.name &&
            user.id === `user_${taskData.peopleInCharge[0]?.id}`
          ) {
            return {
              ...user,
            };
          }
          return {
            ...user,
            statuses: user.statuses.map((status) => {
              if (status.name === oldStatusName) {
                return { ...status, total: status.total - 1 };
              }
              if (status.name === taskData.status?.name) {
                return { ...status, total: status.total + 1 };
              }
              return status;
            }),
          };
        }
        if (user.id === `user_${taskData.peopleInCharge[0]?.id}`) {
          return {
            ...user,
            statuses: user.statuses.map((status) =>
              status.name === taskData.status?.name
                ? { ...status, total: status.total + 1 }
                : status,
            ),
          };
        }
        return user;
      });
    });
  };
  const updateTaskStatusTotalWhenDrop = ({
    oldStatusName,
    oldUserId,
    newStatusName,
    newUserId,
  }: {
    oldStatusName: string;
    oldUserId: string;
    newStatusName: string;
    newUserId: string;
  }) => {
    setDataTotalStatus((prevData) => {
      return prevData.map((user) => {
        if (user.id === oldUserId && user.id === newUserId) {
          return {
            ...user,
            statuses: user.statuses.map((status) => {
              if (status.name === oldStatusName) {
                return { ...status, total: Math.max(0, status.total - 1) };
              }
              if (status.name === newStatusName) {
                return { ...status, total: status.total + 1 };
              }
              return status;
            }),
          };
        }
        if (user.id === oldUserId) {
          return {
            ...user,
            statuses: user.statuses.map((status) =>
              status.name === oldStatusName
                ? { ...status, total: Math.max(0, status.total - 1) }
                : status,
            ),
          };
        }
        if (user.id === newUserId) {
          return {
            ...user,
            statuses: user.statuses.map((status) =>
              status.name === newStatusName
                ? { ...status, total: status.total + 1 }
                : status,
            ),
          };
        }
        return user;
      });
    });
  };

  const removeTaskById = ({
    userId,
    statusId,
    taskId,
  }: {
    userId: string;
    statusId: number;
    taskId: number;
  }) => {
    setListDataKanbanTeam((prevList) =>
      prevList.map((user) => {
        if (user.id !== userId) return user;

        const statusKey = Object.keys(StatusValueTask).find(
          (key) =>
            StatusValueTask[key as keyof typeof StatusValueTask] === statusId,
        ) as keyof TransformedStatuses;
        if (!statusKey) return user;
        return {
          ...user,
          statuses: {
            ...user.statuses,
            [statusKey]: user.statuses[statusKey].filter(
              (task) => task.id !== taskId,
            ),
          },
        };
      }),
    );
    setDataTaskEdit(null);
  };

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
        ...orderingOptions.user_ids.map((item) => ({
          ...item,
          category: 'user_ids',
        })),
      ]
    : [];

  const firstThree = allLabels.slice(0, 2);

  const remainingCount = allLabels.length - firstThree.length;

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

  // Handle start and stop task

  const updateTaskIsStart = (taskId: number, isPause: boolean = false) => {
    setListDataKanbanTeam((prevData) =>
      prevData.map((user) => ({
        ...user,
        statuses: Object.fromEntries(
          Object.entries(user.statuses).map(([statusKey, tasks]) => [
            statusKey,
            tasks.map((task: Task) => ({
              ...task,
              isStart: isPause ? false : task.id === taskId,
            })),
          ]),
        ) as TransformedStatuses,
      })),
    );
  };
  useEffect(() => {
    if (statusTaskSelected && taskSelected.value) {
      if (!statusTaskSelected.isStart) {
        updateTaskIsStart(0, true);
      } else {
        updateTaskIsStart(taskSelected.value as number);
      }
    }
  }, [statusTaskSelected, taskSelected]);

  // Add task empty when start empty task
  useEffect(() => {
    if (
      taskAddEmpty &&
      taskAddEmpty.organization?.id == selectedOrganizationSideBar?.value &&
      !isConcurrently
    ) {
      addTaskToKanban(taskAddEmpty);
      updateTotalStatusAdd({
        userId:
          taskAddEmpty.peopleInCharge && taskAddEmpty.peopleInCharge.length > 0
            ? `user_${taskAddEmpty.peopleInCharge[0].id}`
            : '',
        statusName: taskAddEmpty.status?.name || '',
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskAddEmpty, selectedOrganizationSideBar, isConcurrently]);
  return (
    <>
      <div
        className={`pt-[30px] pr-10 h-[calc(100vh_-_70px)] !overflow-hidden ${isDragging ? 'overflow-hidden' : 'overflow-y-auto'}   font-medium  w-full pb-10`}>
        <div className="mb-[30px] flex items-center justify-between">
          <div className="flex items-center">
            <div className="flex gap-1 items-center">
              {selectedOrganization?.imgComponent && (
                <div className="w-[34px] h-[34px] scale-[1.4167] flex justify-center items-center">
                  {selectedOrganization.imgComponent}
                </div>
              )}
              <p className="text-[26px] font-medium relative top-[0px] line-clamp-3 max-w-[350px] break-all ml-[10px] ">
                {selectedOrganization?.label}
              </p>
            </div>
            <div className="flex justify-center bg-white p-[6px] rounded-[20px] items-center gap-2 ml-5 ">
              <Button
                disabled={isLoadingDataTask}
                variant={'primary'}
                className={`!py-0 !px-0 font-bold w-[90px] h-7
              !rounded-[20px] text-xs`}>
                タスク
              </Button>
              <Button
                disabled={isLoadingDataTask}
                onClick={() => {
                  router.push(
                    `${pageRouters.SCHEDULE_TEAM_MANAGEMENT.href}?organization=${organizationId}&tabId=1`,
                  );
                }}
                variant={'outline'}
                className={`!text-[#77858F] !bg-[#EBF1F7] !border-none !py-0 !px-0 font-bold w-[90px] h-7 !rounded-[20px] text-xs`}>
                スケジュール
              </Button>
            </div>{' '}
          </div>
          <div className="flex items-center mr-3">
            {listMemberTeam.length > 0 && getParticipantAvatars(listMemberTeam)}
          </div>
        </div>
        <div className={`flex gap-7 mb-6 w-full min-w-[300px] relative`}>
          <div className="flex items-center gap-2">
            {/* Filter option modal */}
            <Popover className="relative mr-2">
              {() => (
                <>
                  <div className="flex items-center gap-2">
                    <PopoverButton
                      onClick={() => setIsOpenModalFilter(!isOpenModalFilter)}
                      className="flex items-center gap-2 text-xs font-medium text-[#77858F] focus-visible:outline-none">
                      <ImageRound
                        src="/icons/filter.svg"
                        name="Filter icon"
                        className="w-[14px] h-[14px] ml-2"
                      />
                    </PopoverButton>
                    {allLabels.length > 2 ? (
                      <>
                        {firstThree.slice(0, 2).map((item, index) => (
                          <div
                            key={index}
                            className="w-[105px] h-6 px-[10px] justify-between gap-[6px] text-xs text-black font-medium flex items-center truncate rounded-[20px] bg-[#DAE2EB]">
                            <span className="w-[71px] truncate">
                              {item.label}
                            </span>
                            {!isLoadingDataTask && (
                              <ImageRound
                                src={`/icons/close.svg`}
                                name="close"
                                className="w-fit h-fit cursor-pointer"
                                onClick={() => {
                                  setIsReadyToFetch(true);
                                  handleRemoveItem(
                                    item.category as
                                      | 'organization_ids'
                                      | 'tag_ids'
                                      | 'user_ids'
                                      | 'category_ids',
                                    item.value,
                                  );
                                }}
                              />
                            )}
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
                            className="w-[105px] h-6 px-[10px] justify-between gap-[6px] text-xs text-black font-medium flex items-center truncate rounded-[20px] bg-[#DAE2EB]">
                            <span className="w-[71px] truncate">
                              {item.label}
                            </span>
                            {!isLoadingDataTask && (
                              <ImageRound
                                src={`/icons/close.svg`}
                                name="close"
                                className="w-fit h-fit cursor-pointer"
                                onClick={() => {
                                  setIsReadyToFetch(true);
                                  handleRemoveItem(
                                    item.category as
                                      | 'organization_ids'
                                      | 'tag_ids'
                                      | 'category_ids',
                                    item.value,
                                  );
                                }}
                              />
                            )}
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
                      <ActionFilterTaskTeam
                        listMemberTeam={listMemberTeam}
                        isLoadingDataTask={isLoadingDataTask}
                        handleClose={() => setIsOpenModalFilter(false)}
                        handleReadyToFetch={() => setIsReadyToFetch(true)}
                      />
                    </PopoverPanel>
                  </Transition>
                </>
              )}
            </Popover>
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
                  }
                }}
                variant={
                  isLoadingDataTask
                    ? 'outline'
                    : dataOrderRing === FilterTypeKanban.DEADLINE
                      ? 'primary'
                      : 'outline'
                }
                className={`${dataOrderRing === FilterTypeKanban.DEADLINE && !isLoadingDataTask ? '' : '!border-[#A7B7C2] !text-[#A7B7C2] !bg-[#EBF1F7]  '}  h-6 w-20 !px-0 !py-0 text-xs font-bold !rounded-[20px]`}>
                締切期間
              </Button>
              <Button
                disabled={isLoadingDataTask}
                onClick={() => {
                  if (dataOrderRing !== FilterTypeKanban.IMPORTANT) {
                    setIsReadyToFetch(true);

                    setDataOrderRing(FilterTypeKanban.IMPORTANT);
                  }
                }}
                variant={
                  isLoadingDataTask
                    ? 'outline'
                    : dataOrderRing === FilterTypeKanban.IMPORTANT
                      ? 'primary'
                      : 'outline'
                }
                className={`${dataOrderRing === FilterTypeKanban.IMPORTANT && !isLoadingDataTask ? '' : '!border-[#A7B7C2] !text-[#A7B7C2]  !bg-[#EBF1F7] '} h-6 w-20 !px-0 !py-0 text-xs font-bold !rounded-[20px]   `}>
                重要
              </Button>
            </>

            <InputSearch
              className="w-[300px] h-[34px] py-0 bg-white !rounded-[20px]"
              inputClassName="h-[34px] bg-white border-none !rounded-[20px] text-sm placeholder-[#77858F]"
              iconClassName="w-[14px] h-[14px]"
              placeholder="タスク、キーワードを検索"
              onChange={(e) => {
                setValueSearch(e.target.value);
              }}
            />

            <div className="ml-3">
              <Checkbox
                label="他チームを表示"
                isChecked={isConcurrently}
                disable={isLoadingDataTask}
                onChange={(data) => {
                  setIsConcurrently(data);
                }}
              />
            </div>
          </div>
          <div className="absolute right-0 top-0">
            <DynamicTooltip content="タスクを新規作成" placement="top">
              <Button
                onClick={() => {
                  setPeopleDefaultId(COLUMN_ID_TASK);
                  handleSetParam({
                    id: null,
                    action: ActionTask.CREATE,
                  });
                }}
                style={{ boxShadow: '0px 1px 5px 0px #00000033' }}
                className="flex gap-2 !p-[10px] !border-none">
                <div
                  style={{
                    padding: '6.5px',
                  }}
                  className={`rounded-full cursor-pointer w-fit  bg-white `}>
                  <ImageRound
                    src={`/icons/add.svg`}
                    name="Add"
                    style={{
                      width: `${(247 / 247) * 9}px`,
                      height: `${(247 / 247) * 9}px`,
                    }}
                  />
                </div>
                <p> 新規作成</p>
              </Button>
            </DynamicTooltip>
          </div>
        </div>

        {/* BOARD DATA */}
        <div className="h-fit overflow-y-auto mt-6 w-full overflow-x-auto">
          {!isLoadingDataTask ? (
            <DragDropContext
              onDragStart={() => {
                setDragging(true);
              }}
              onDragEnd={onDragEnd}>
              <div
                ref={listContainerRef}
                className={`flex gap-4  h-[calc(100vh_-_250px)] overflow-x-auto items-stretch  ${expanded ? 'w-[calc(100vw_-_270px)]' : 'w-[calc(100vw_-_120px)]'}`}>
                <NoSettingColumn
                  totalNoSetting={totalNoSetting}
                  setTotalNoSetting={setTotalNoSetting}
                  onAdd={(id: string) => {
                    setPeopleDefaultId(id);
                  }}
                  pinItemToTopNoSetting={pinItemToTopNoSetting}
                />
                {listDataKanbanTeam.map((user) => (
                  <UserColumnTeam
                    key={user.id}
                    user={user}
                    onAdd={(id: string) => {
                      setPeopleDefaultId(id);
                    }}
                    updateTaskIsStart={updateTaskIsStart}
                    pinItemToTop={pinItemToTop}
                    onUpdateInline={(data: {
                      status: string;
                      task: number;
                      oldIdStatus: string;
                      oldNameStatus: string;
                    }) => {
                      updatePeopleIndex({
                        task: data.task,
                        statusId: data.status,
                        oldIdStatus: data.oldIdStatus,
                        oldNameStatus: data.oldNameStatus,
                      });
                    }}
                  />
                ))}
                {isHasNext && (
                  <div>
                    <ColumnsSkeleton numberOfColumns={2} />.
                  </div>
                )}
              </div>
            </DragDropContext>
          ) : (
            <div className="h-[calc(100vh_-_257px)] w-full">
              <ColumnsSkeleton numberOfColumns={4} />
            </div>
          )}
        </div>
      </div>

      {/* Option select value zoom */}
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
      {isShowModalEditTeam && (
        <ActionsTaskModalTeam
          open={isShowModalEditTeam}
          dataTask={dataTaskEdit}
          organizationId={organizationId}
          action={actionType || ActionTask.CREATE}
          peopleDefaultId={
            actionType === ActionTask.CREATE
              ? peopleDefaultId || `${session?.user.id}`
              : dataTaskEdit?.peopleInCharge.length
                ? String(dataTaskEdit?.peopleInCharge[0].id)
                : ''
          }
          setDataErrorTask={setDataErrorTask}
          errorPerson={dataErrorTask}
          listMemberTeam={listMemberTeam}
          organizationTeamList={organizationTeamList}
          onClose={() => {
            setIsShowModalEditTeam(false);
            handleRemoveParam();
            setDataTaskEdit(null);
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
      {openWarningCloseModal && (
        <WarningCloseTaskModal
          open={openWarningCloseModal}
          onCloseByIcon={() => {
            setOpenWarningCloseModal(false);
          }}
          onClose={() => {
            setIsShowModalEditTeam(false);
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
            } else if (
              closeAction == ActionTask.CREATE ||
              closeAction == ActionTask.COPY
            ) {
              handleConfirmCreateTask(pendingTaskData as TaskFormData);
            }
          }}
        />
      )}
    </>
  );
};

export default KanbanBoardTaskTeam;
