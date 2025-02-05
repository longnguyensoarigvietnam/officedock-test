'use client';
import { Fragment, useContext, useEffect, useState } from 'react';
import lodash from 'lodash';
import { signOut, useSession } from 'next-auth/react';
import Link from 'next/link';
import {
  Popover,
  PopoverButton,
  PopoverPanel,
  Transition,
} from '@headlessui/react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import ImageRound from '@components/common/ImageRound';

import { SETTING_MENU, SYSTEM_PERMISSIONS_MENU } from '@constants/menu';
import { apiRouters, pageRouters } from '@constants/routers';
import {
  ActionsEvent,
  ActionTask,
  EventWorkCategory,
  ItemStartType,
  PermissionsSystem,
  ScreenName,
  ServerStatusCode,
  StatusValueTask,
} from '@constants/enums';
import { MenuItem } from '@interfaces/menu';
import TaskPageDataHeader from './TaskPageDataHeader';
import { useToast } from '@providers/ToastProvider';
import { Task, TaskFormData, TaskRequest } from '@interfaces/task';
import { addTimeToDate } from '@utils/date';
import { EventEditFormData, EventRequest } from '@interfaces/calendar';
import api from '@base/api';
import { useMutation, useQueryClient } from 'react-query';

import ActionsTaskModal from '@components/modals/ActionsTaskModal';
import { LoadingContext } from '@providers/LoadingProvider';
import useDashboardMemberList from '@hooks/useDashBoardMemberList';
import useCreationDataTask from '@hooks/useCreationDataTask';
import {
  ERROR_DELETE_MESSAGE,
  ERROR_NOT_FOUND_EVENT,
  ERROR_UPDATE_MESSAGE,
  SUCCESS_DELETE_MESSAGE,
  SUCCESS_UPDATE_MESSAGE,
} from '@constants/message';
import ActionsEventModal from '@components/modals/ActionsEventModal';
import useCreationDataEventCalendar from '@hooks/useCreationDataEventCalendar';
import ConfirmActionsEventModal from '@components/modals/ConfirmActionsEventModal';
import { OptionDropdownType } from '@interfaces/common';
import { TaskContext } from '@providers/TaskProvider';
import ConfirmDeleteModal from '@components/modals/ConfirmDeleteModal';
import { AxiosError } from 'axios';
import {
  DEFAULT_END_TIME,
  DEFAULT_START_TIME,
  NO_OPTION_CATEGORY,
} from '@constants';
import { useErrorToast } from '@hooks/useErrorToast';
import WarningCloseTaskModal from '@components/modals/WarningCloseTaskModal';
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
  const { setDataEventEdit, setIdEventDelete } = useContext(TaskContext);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const showErrorToast = useErrorToast();

  const queryClient = useQueryClient();

  const taskDetailId = searchParams.get('task');
  const idEvent = searchParams.get('event');

  const actionType = searchParams.get('action');
  const { creationDataEventCalendar } = useCreationDataEventCalendar({});

  const isTaskPage = pathname.startsWith('/task');

  const isCalendarPage = pathname === pageRouters.CALENDAR_MANAGEMENT.href;

  const typeDetail = searchParams.get('type');
  const [dataTaskEdit, setDataTaskEdit] = useState<Task | null>(null);
  const [dataEventEdit, setDataEventEditLocal] = useState<EventEditFormData>();
  const [openConfirmDeleteModal, setOpenConfirmDeleteModal] = useState(false);

  const [backToEditing, setBackToEditing] = useState(false);
  const [confirmEventDataToEdit, setConfirmEventDataToEdit] =
    useState<EventEditFormData>();
  const [openConfirmEditEventModal, setOpenConfirmEditEventModal] =
    useState(false);
  const [openConfirmDeleteEventModal, setOpenConfirmDeleteEventModal] =
    useState(false);

  const router = useRouter();
  const { data: session } = useSession();
  const [isShowModalTask, setShowModalTask] = useState<boolean>(false);
  const [openCreateEventModal, setOpenCreateEventModal] =
    useState<boolean>(false);

  const { setIsLoading } = useContext(LoadingContext);
  const { dashboardMemberList = [] } = useDashboardMemberList();
  const { creationDataTaskData } = useCreationDataTask({});
  const [actionsEventMessage, setActionsEventMessage] = useState<string>('');
  const [openWarningCloseModal, setOpenWarningCloseModal] =
    useState<boolean>(false);
  const [resetFunctions, setResetFunctions] = useState<{
    resetDataCategoryOptions?: () => void;
    reset?: () => void;
  }>({});

  const { showToast } = useToast();

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
        setShowModalTask(true);
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

  useEffect(() => {
    if (
      actionType &&
      typeDetail === ItemStartType.TASK &&
      !isTaskPage &&
      !isCalendarPage
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

  const handleRemoveParam = () => {
    const params = new URLSearchParams(searchParams);
    params.delete('task');
    params.delete('action');
    params.delete('type');

    router.replace(`?${params.toString()}`);
    setShowModalTask(false);
  };
  const handleRemoveEventParam = () => {
    const params = new URLSearchParams(searchParams);
    params.delete('event');
    params.delete('type');
    params.delete('action');
    router.replace(`?${params.toString()}`);
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
      queryClient.refetchQueries(['getTaskHeaderStart']);
      queryClient.refetchQueries(['getDataStatistic']);

      showToast({
        description: SUCCESS_UPDATE_MESSAGE,
      });
      setDataTaskEdit(null);
      setShowModalTask(false);
    },
    onError: (error: AxiosError<any>) => {
      showErrorToast(error, ERROR_UPDATE_MESSAGE);
    },
    onSettled: () => {
      setTimeout(() => {
        setIsLoading(false);
      }, 500);
    },
  });
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
      queryClient.refetchQueries(['getTaskHeaderStart']);
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
    setIsLoading(true);
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
          `${data.largeCategory.value}` == NO_OPTION_CATEGORY
            ? null
            : `${data.largeCategory.value}`,
        type: EventWorkCategory.LARGE,
      });
    }
    if (data.mediumCategory && data.mediumCategory?.value !== 'undefined') {
      newWorkCategories.push({
        categoryId:
          `${data.mediumCategory.value}` == NO_OPTION_CATEGORY
            ? null
            : `${data.mediumCategory.value}`,
        type: EventWorkCategory.MEDIUM,
      });
    }
    if (data.smallCategory && data.smallCategory?.value !== 'undefined') {
      newWorkCategories.push({
        categoryId:
          `${data.smallCategory.value}` == NO_OPTION_CATEGORY
            ? null
            : `${data.smallCategory.value}`,
        type: EventWorkCategory.SMALL,
      });
    }
    if (data.type) {
      newType = (data.type as OptionDropdownType).value as string;
    }
    if (data.startDate) {
      if (data.isAllDay) {
        newStartDate = addTimeToDate(
          data.startDate as Date,
          DEFAULT_START_TIME,
        );
      } else {
        if (data.startTime) {
          newStartDate = addTimeToDate(data.startDate as Date, data.startTime);
        }
      }
    }
    if (data.endDate) {
      if (data.isAllDay) {
        newEndDate = addTimeToDate(data.endDate as Date, DEFAULT_END_TIME);
      } else {
        if (data.endTime) {
          newEndDate = addTimeToDate(data.endDate as Date, data.endTime);
        }
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
      address: data.address || '',
      memo: data.memo || '',
      type: newType,
      sendToChat,
      message: actionsEventMessage,
      categoryIds: newWorkCategories,
      organizationId: data.organization
        ? Number((data.organization as OptionDropdownType).value)
        : null,
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
        queryClient.refetchQueries(['getTaskHeaderStart']);

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
      `${apiRouters.SCHEDULE_DETAIL(newId)}?message=${actionsEventMessage}${data.sendToChat ? '&send_to_chat=true' : ''}`,
    );
  };
  const { mutate: deleteEventCalendar } = useMutation(
    'deleteEventCalendar',
    handleDeleteEventCalendar,
    {
      onSuccess: (data, task) => {
        queryClient.refetchQueries(['getTaskHeaderStart']);

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
      },
    },
  );

  return (
    <>
      <header
        className={`sticky 2xl:fixed top-0 z-[22] bg-white shadow-lg w-full h-[76px]  p-3 flex justify-between item-center ${className}`}>
        <div className="flex gap-8 justify-between w-full">
          <div className="flex flex-grow items-center gap-8">
            <ImageRound
              className="h-[50px] w-48 object-fill"
              src="/images/logo-full.svg"
              name="Logo full"
            />
            <TaskPageDataHeader />
          </div>
          <div className="flex items-center w-fit">
            <Popover className="relative">
              {({ open }) => (
                <>
                  <div className="flex gap-2 items-center">
                    <PopoverButton
                      className={`flex w-full px-3 py-2 items-center rounded-full focus:outline-none
                ${open ? 'text-primary ' : ''}
                `}>
                      <ImageRound
                        className="w-10 h-10 hover:opacity-70"
                        src="/images/avatar-default.svg"
                        border="full"
                        name="Avatar user"
                      />
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
                              <Link
                                key={item.name}
                                href={item.href}
                                className={`flex px-4 py-2 hover:bg-[#7D8A94] ${pathname == item.href && 'bg-[#7D8A94]'}`}>
                                <p>{item.name}</p>
                              </Link>
                            ) : (
                              <div
                                key={item.name}
                                onClick={() =>
                                  queryClient.isFetching() == 0 && signOut()
                                }
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
              {({ open }) => (
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
                      <PopoverPanel className="absolute right-0 z-10 w-fit transform">
                        <div className="overflow-hidden bg-[#5B6770] rounded-lg shadow-common py-1 w-[180px]">
                          <div className="relative flex flex-col gap-1 text-white text-[14px] font-medium">
                            {companyItems
                              .filter((item) => item.companyMenu == true)
                              .map((item) =>
                                item.href ? (
                                  <Link
                                    key={item.name}
                                    href={item.href}
                                    className={`flex px-4 py-2 hover:bg-[#7D8A94] ${pathname == item.href && 'bg-[#7D8A94]'}`}>
                                    <p>{item.name}</p>
                                  </Link>
                                ) : (
                                  <div
                                    key={item.name}
                                    onClick={async () => {
                                      queryClient.cancelQueries();
                                      await signOut({
                                        redirect: false,
                                      });
                                      window.location.href =
                                        pageRouters.LOGIN.href;
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
                  )}
                </>
              )}
            </Popover>
          </div>
        </div>
      </header>
      {isShowModalTask && (
        <ActionsTaskModal
          open={isShowModalTask}
          dataTask={dataTaskEdit}
          columnId={`${StatusValueTask.NOT_STARTED}`}
          action={actionType || ActionTask.CREATE}
          peopleDefaultId={`${session?.user.id}`}
          onClose={() => {
            handleRemoveParam();
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
          onEdit={handleConfirmEditTask}
          dashboardMemberList={dashboardMemberList}
          creationDataTaskData={creationDataTaskData}
          onDelete={() => {
            setOpenConfirmDeleteModal(true);
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
            setShowModalTask(false);
            setOpenWarningCloseModal(false);
            setDataTaskEdit(null);
            handleRemoveParam();
            setIsLoading(false);
            resetFunctions.resetDataCategoryOptions?.();
            resetFunctions.reset?.();
          }}
        />
      )}
      {openCreateEventModal && (
        <ActionsEventModal
          open={openCreateEventModal}
          dataEvent={dataEventEdit}
          action={ActionsEvent.EDIT}
          onClose={() => {
            handleRemoveEventParam();
            setDataEventEditLocal(undefined);
            setOpenCreateEventModal(false);
            setBackToEditing(false);
          }}
          onEdit={(data) => {
            setConfirmEventDataToEdit(data);
            setOpenCreateEventModal(false);
            setOpenConfirmEditEventModal(true);
          }}
          onDelete={(data) => {
            setConfirmEventDataToEdit(data);
            setOpenCreateEventModal(false);
            setOpenConfirmDeleteEventModal(true);
          }}
          creationDataEventCalendar={creationDataEventCalendar}
          backToEditing={backToEditing}
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
    </>
  );
};
export default Header;
