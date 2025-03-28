import React, { useContext, useEffect, useState } from 'react';
import { Draggable, Droppable } from '@hello-pangea/dnd';
import Image from 'next/image';

import ItemTeam from './ItemTeam';
import ImageRound from '@components/common/ImageRound';

import { StatusTask, StatusValueTask } from '@constants/enums';
import {
  KanbanDataResponse,
  Task,
  TransformedStatuses,
  TransformedUser,
} from '@interfaces/task';
import { TaskTeamStateContext } from '@providers/TaskTeamProvider';
import { findStatusTeamByUser } from '@utils';
import api from '@base/api';
import { apiRouters } from '@constants/routers';
import { useMutation } from 'react-query';
import Spinner from '@components/common/Spinner';
import { useSearchParams } from 'next/navigation';
import { useInView } from 'react-intersection-observer';

type Props = {
  user: TransformedUser;
  status: keyof TransformedStatuses;
  handleSetParamEditTask: (id: number) => void;
  handleSetParamCopyTask: (id: number) => void;
  pinItemToTop: (itemId: string | number) => void;
  onUpdateInline: (data: {
    status: string;
    task: number;
    oldIdStatus: string;
    oldNameStatus: string;
  }) => void;
};

const StatusColumn = ({
  user,
  status,
  pinItemToTop,
  onUpdateInline,
  handleSetParamEditTask,
  handleSetParamCopyTask,
}: Props) => {
  // Context
  const { dataTotalStatus, setListDataKanbanTeam, setDataTotalStatus } =
    useContext(TaskTeamStateContext);

  // State
  const [isExtendData, setIsExtendData] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [lastIndex, setLastIndex] = useState<number | null>(null);
  const [pinAtLast, setPinAtLast] = useState<string | null>(null);
  const [isShowMore, setShowMore] = useState(false);
  const [hasShowMore, setHasShowMore] = useState(false);
  const searchParams = useSearchParams();

  const organizationId = searchParams.get('organization');

  const { ref: listTaskRef, inView: inViewListTask } = useInView({
    threshold: 0.2,
  });

  function getStatusColor(statusKey: string): string {
    const status = StatusTask[statusKey as keyof typeof StatusTask];

    switch (status) {
      case StatusTask.NOT_STARTED:
        return '!bg-[#A3EBF0]';
      case StatusTask.IN_PROGRESS:
        return '!bg-[#92E9AF]';
      case StatusTask.CONFIRMING:
        return '!bg-[#FCCF79]';
      case StatusTask.COMPLETED:
        return '!bg-[#F58383]';
      case StatusTask.MY_ROUTINE:
        return '!bg-[#EBF1F7]';
      default:
        return '';
    }
  }

  const statusValue = StatusValueTask[status as keyof typeof StatusValueTask];

  // Update total with has next
  const updateUserStatusHasNext = ({
    userId,
    statusKey,
    hasNext,
  }: {
    userId: string;
    statusKey: string;
    hasNext: boolean;
  }) => {
    setDataTotalStatus((prevState) =>
      prevState.map((user) =>
        user.id === userId
          ? {
              ...user,
              statuses: user.statuses.map((status) =>
                status.name === StatusTask[statusKey as keyof typeof StatusTask]
                  ? { ...status, hasNext: hasNext }
                  : status,
              ),
            }
          : user,
      ),
    );
  };

  // Update more data into list
  const updateKanbanData = ({
    newTasks,
    userId,
    statusValue,
  }: {
    newTasks: Task[];
    userId: string;
    statusValue: StatusValueTask;
  }) => {
    setListDataKanbanTeam((prevState) =>
      prevState.map((user) =>
        user.id === userId
          ? {
              ...user,
              statuses: {
                ...user.statuses,
                [StatusValueTask[statusValue]]: [
                  ...user.statuses[
                    StatusValueTask[statusValue] as keyof TransformedStatuses
                  ],
                  ...newTasks,
                ],
              },
            }
          : user,
      ),
    );
  };

  // API  get more task team
  const handleGetDataTaskMore = async () => {
    setIsLoadingMore(true);
    let apiUrl = `${apiRouters.TASK_BOARD_LIST}?status_id=${statusValue}&is_team_task=true&user_id=${user.id.replace('user_', '')}`;

    if (pinAtLast) {
      apiUrl += `&pin_at=${pinAtLast}`;
    }
    if (organizationId) {
      apiUrl += `&organization_id=${organizationId}`;
    }
    if (lastIndex) {
      apiUrl += `&index=${lastIndex}`;
    }
    // if (searchValue) {
    //   apiUrl += `&search=${searchValue}${idTasks ? `&ids=${idTasks}` : ''}`;
    // }
    // if (orderingOptions?.organization_ids?.length) {
    //   apiUrl += `&organization_ids=${orderingOptions.organization_ids.map((item) => item.value).join(',')}`;
    // }

    // if (orderingOptions?.category_ids?.length) {
    //   apiUrl += `&category_ids=${orderingOptions.category_ids.map((item) => item.value).join(',')}`;
    // }

    // if (orderingOptions?.tag_ids?.length) {
    //   apiUrl += `&tag_ids=${orderingOptions.tag_ids.map((item) => item.value).join(',')}`;
    // }

    return await api.get<KanbanDataResponse>(apiUrl);
  };
  // Handle call API get more team
  const { mutate: getDataListTaskMore } = useMutation(
    'getDataListTaskMore',
    handleGetDataTaskMore,
    {
      onSuccess: ({ data }) => {
        updateKanbanData({
          newTasks: data.results,
          userId: user.id,
          statusValue: statusValue,
        });
        updateUserStatusHasNext({
          userId: user.id,
          hasNext: data.hasNext,
          statusKey: status,
        });
      },
      onError: () => {},
      onSettled: () => {
        setIsLoadingMore(false);
      },
    },
  );

  useEffect(() => {
    if (user.statuses && user.statuses[status]) {
      const items = user.statuses[status];
      items.length && setLastIndex(items[items.length - 1].index);
      if (items.length > 0 && items[items.length - 1]?.pinAt) {
        setPinAtLast(items[items.length - 1].pinAt ?? null);
      } else {
        setPinAtLast(null);
      }
      if (user.statuses[status].length > 2) {
        setHasShowMore(true);
      } else {
        setHasShowMore(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);
  const result = findStatusTeamByUser(
    dataTotalStatus,
    user.id,
    status as keyof typeof StatusTask,
  );

  useEffect(() => {
    if (
      user.statuses &&
      user.statuses[status].length < 5 &&
      result &&
      result.hasNext
    ) {
      getDataListTaskMore();
    }
  }, [result, status, user]);

  useEffect(() => {
    if (inViewListTask && result && result.hasNext && isShowMore) {
      getDataListTaskMore();
    }
  }, [inViewListTask, result, isShowMore, getDataListTaskMore]);

  const items = isShowMore
    ? user.statuses[status]
    : user.statuses[status].slice(0, 3);

  return (
    <div>
      <div className="flex items-center justify-between pr-[10px]">
        <div
          style={{
            gap: `6px`,
          }}
          className="flex items-center text-sm break-all font-medium mb-[14px] ">
          <span
            className={`w-[10px] h-[10px] rounded-full ${status && getStatusColor(status)}`}></span>
          <span>{status && StatusTask[status as keyof typeof StatusTask]}</span>
          <span className="font-medium text-sm text-[#77858F]">
            {result && result.total}
          </span>
        </div>
        <div onClick={() => setIsExtendData(!isExtendData)}>
          <ImageRound
            src={`/icons/extend-column.svg`}
            className={`${isExtendData ? 'rotate-90' : '-rotate-90'} cursor-pointer`}
            name="extend"
            style={{
              width: `8px`,
              height: `12px`,
            }}
          />
        </div>
      </div>
      <div className="min-h-[130px] max-h-[420px] overflow-y-auto">
        <Droppable droppableId={`${user.id}-${status}`}>
          {(provided, snapshot) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className={`${snapshot.isDraggingOver ? 'bg-gray-200' : ''}`}>
              {isExtendData && (
                <div
                  style={{
                    paddingRight: '10px',
                    boxShadow: `inset -${(247 / 247) * 16}px 0 0 #EBF1F7`,
                    minHeight: '130px',
                  }}>
                  {items.map((task, index) => (
                    <Draggable
                      key={task.id}
                      draggableId={String(task.id)}
                      index={index}>
                      {(provided) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className="">
                          <ItemTeam
                            id={String(task.id)}
                            index={index}
                            content={task}
                            handleActionEditTask={handleSetParamEditTask}
                            handleConfirmCopyTask={handleSetParamCopyTask}
                            handleUpdateItemInline={() => {}}
                            editTask={onUpdateInline}
                            handlePinItem={pinItemToTop}
                            handleUnPinItem={(id: string) => {
                              if (
                                user.statuses[status] &&
                                user.statuses[status].length > 4 &&
                                result &&
                                result.hasNext &&
                                user.statuses[status][
                                  user.statuses[status].length - 1
                                ].pinAt
                              ) {
                                getDataListTaskMore();
                                pinItemToTop(id);
                              } else {
                                pinItemToTop(id);
                              }
                            }}
                          />
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                  {items.length > 5 && (
                    <div ref={listTaskRef}>
                      {isLoadingMore && (
                        <div className="h-7">
                          <Spinner
                            className="!h-fit py-3"
                            iconClassName="h-6 w-6"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
              {isExtendData && hasShowMore && (
                <>
                  {isShowMore ? (
                    <div className="flex justify-center">
                      <button
                        onClick={() => setShowMore(false)}
                        className="text-center font-medium flex items-center gap-[6px] w-fit justify-center text-xs text-[#77858F]">
                        さらに表示
                        <Image
                          alt="Arrow dropdown icon"
                          src={'/icons/arrow-down.svg'}
                          className="rotate-180"
                          width={16}
                          height={16}
                        />
                      </button>
                    </div>
                  ) : (
                    <div className="flex justify-center">
                      <button
                        onClick={() => setShowMore(true)}
                        className="text-center font-medium flex items-center gap-[6px] w-fit justify-center text-xs text-[#77858F]">
                        表示を減らす
                        <Image
                          alt="Arrow dropdown icon"
                          src={'/icons/arrow-down.svg'}
                          width={16}
                          height={16}
                        />
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </Droppable>
      </div>
    </div>
  );
};

export default StatusColumn;
