'use client';
import { UseMutateFunction, useMutation } from 'react-query';
import {
  Dispatch,
  SetStateAction,
  useContext,
  useEffect,
  useState,
} from 'react';
import { Droppable } from '@hello-pangea/dnd';
import { useInView } from 'react-intersection-observer';
import Tippy from '@tippyjs/react';
import 'tippy.js/dist/tippy.css';

import ListViewItem from './ListViewItem';

import ImageRound from '@components/common/ImageRound';
import Spinner from '@components/common/Spinner';

import {
  Columns,
  CreationDataTask,
  KanbanDataResponse,
  Task,
  TaskErrorPerson,
  TaskRequest,
} from '@interfaces/task';
import { ResponseError } from '@interfaces/response';

import { apiRouters } from '@constants/routers';
import { PAGINATION_PAGE_SIZE_KANBAN } from '@constants';
import { StatusTask, StatusValueTask } from '@constants/enums';

import { encodeFormatDateISO } from '@utils/date';
import api from '@base/api';
import { TaskContext } from '@providers/TaskProvider';

interface ListViewByStatusProps {
  listItems: Task[];
  listId: string | number;
  listTitle: string;
  hasNext: boolean | undefined;
  totalCount: number;
  userId: string;
  searchValue: string;
  orderingRequest: string;
  matchingTaskIds: number[];
  handlePinItem: (id: string) => void;
  handleActionEditTask: (id: number) => void;
  handleConfirmCopyTask: (id: number) => void;
  handleUpdateItemInline: (data: Task) => void;
  editTask: UseMutateFunction<
    Task,
    ResponseError<{
      detail: TaskErrorPerson;
    }>,
    TaskRequest,
    unknown
  >;
  creationDataTaskData?: CreationDataTask;
  columnsKanbanData: Columns;
  addTask: (columnId: string) => void;
  setColumnsKanbanData: Dispatch<SetStateAction<Columns | undefined>>;
  setNumberPagesData: Dispatch<
    SetStateAction<
      {
        id: string;
        count: number;
        numPages: number;
        hasMores: boolean;
      }[]
    >
  >;
  saveExtendColumn: (data: Record<string, boolean>) => void;
}
const ListViewByStatus = ({
  listItems,
  listId,
  listTitle,
  hasNext,
  totalCount,
  userId,
  searchValue,
  matchingTaskIds,
  orderingRequest,
  handlePinItem,
  handleActionEditTask,
  handleConfirmCopyTask,
  handleUpdateItemInline,
  editTask,
  addTask,
  creationDataTaskData,
  columnsKanbanData,
  setColumnsKanbanData,
  setNumberPagesData,
  saveExtendColumn
}: ListViewByStatusProps) => {
  const [hasMore, setHasMore] = useState(true);
  const [lastIndex, setLastIndex] = useState<number | null>(null);
  const [initialLoad, setInitialLoad] = useState<boolean>(false);
  const [page, setPage] = useState<number>(1);
  const [taskLast, setTaskLast] = useState<number | null>(null);
  const [deadlineLast, setDeadlineLast] = useState<string | null>(null);
  const [pinAtLast, setPinAtLast] = useState<string | null>(null);
  const [isChange, setChange] = useState(false);
  const { ref: listTaskRef, inView: inViewListTask } = useInView({
    threshold: 0.2,
  });
  const { extendByStatus, setExtendByStatus } = useContext(TaskContext);
  const colorByStatus = [
    {
      name: StatusTask.NOT_STARTED,
      color: '#A3EBF0',
    },
    {
      name: StatusTask.IN_PROGRESS,
      color: '#92E9AF',
    },
    {
      name: StatusTask.CONFIRMING,
      color: '#FCCF79',
    },
    {
      name: StatusTask.COMPLETED,
      color: '#F58383',
    },
  ];

  const handleGetDataTaskMore = async (pageNumber: number) => {
    setInitialLoad(true);

    const idTasks = matchingTaskIds.join(',');
    let apiUrl = `${apiRouters.TASK_BOARD_LIST}?status_id=${listId}&page=${pageNumber}&page_size=${PAGINATION_PAGE_SIZE_KANBAN}`;

    if (pinAtLast) {
      apiUrl += `&pin_at=${pinAtLast}`;
    }
    if (orderingRequest) {
      if (orderingRequest === 'deadline') {
        apiUrl += `&ordering=${orderingRequest}${idTasks ? `&ids=${idTasks}` : ''}&task_id=${taskLast}${deadlineLast ? `&deadline=${encodeFormatDateISO(new Date(deadlineLast))}` : ''}`;
      } else {
        apiUrl += `&ordering=${orderingRequest}${idTasks ? `&ids=${idTasks}` : ''}&task_id=${taskLast}`;
      }
    } else if (lastIndex) {
      apiUrl += `&index=${lastIndex}`;
    }

    if (userId) {
      apiUrl += `&user_id=${userId}`;
    }

    if (searchValue) {
      apiUrl += `&search=${searchValue}${idTasks ? `&ids=${idTasks}` : ''}`;
    }

    return await api.get<KanbanDataResponse>(apiUrl);
  };

  useEffect(() => {
    if (hasNext) {
      setHasMore(true);
    } else {
      setHasMore(false);
    }
  }, [hasNext]);

  const [count, setCount] = useState<number>(totalCount);
  useEffect(() => {
    let remainingCount = totalCount - page * PAGINATION_PAGE_SIZE_KANBAN;
    if (remainingCount < 0) {
      remainingCount = 0;
    }

    setCount(remainingCount + listItems.length);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalCount, listItems, listItems.length, columnsKanbanData]);

  useEffect(() => {
    if (listItems) {
      listItems.length && setLastIndex(listItems[listItems.length - 1].index);
      if (listItems.length > 0 && listItems[listItems.length - 1]?.pinAt) {
        setPinAtLast(listItems[listItems.length - 1].pinAt ?? null);
      } else {
        setPinAtLast(null);
      }
      if (listItems.length > PAGINATION_PAGE_SIZE_KANBAN - 1) {
        setChange(true);
      }
      if (orderingRequest) {
        if (listItems.length) {
          setDeadlineLast(listItems[listItems.length - 1].deadline);
          setTaskLast(parseInt(`${listItems[listItems.length - 1].id}`));
        } else {
          setDeadlineLast(null);
          setTaskLast(null);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listItems]);

  const { mutate: getDataListTaskMore } = useMutation(
    'getDataListTaskMore',
    handleGetDataTaskMore,
    {
      onSuccess: ({ data }) => {
        const newState = { ...columnsKanbanData };
        const columnKey = String(listId);
        const column = newState[columnKey];
        if (column) {
          column.items = [...column.items, ...data.results];
        } else {
          newState[columnKey] = {
            id: listId,
            title: `Column ${listId}`,
            items: listItems,
          };
        }
        setColumnsKanbanData(newState);

        if (data.hasNext) {
          setHasMore(true);
        } else {
          setHasMore(false);
          setNumberPagesData((prevData) =>
            prevData.map((item) =>
              `${item.id}` === `${listId}`
                ? { ...item, hasMores: false }
                : item,
            ),
          );
        }
      },
      onError: () => {},
      onSettled: () => {
        setInitialLoad(false);
      },
    },
  );

  useEffect(() => {
    if (inViewListTask && hasMore && isChange) {
      getDataListTaskMore(1);
      setPage(page + 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inViewListTask, hasMore]);

  return (
    <>
      <div className="flex items-center gap-3 mb-3">
        <Tippy
          content={
            extendByStatus.find((list) => list.id == listId)?.status
              ? '閉じる'
              : '開く'
          }
          arrow={false}
          delay={1000}
          placement="top"
          offset={[3, 0]}>
          <div
            className="flex items-center justify-center cursor-pointer hover:bg-[#E3EAED] rounded-full w-[22px] h-[22px]"
            onClick={async () => {
              const newList = extendByStatus.map((item) =>
                String(item.id) == String(listId)
                  ? { ...item, status: !item.status }
                  : item,
              );
              const dataExtend: Record<string, boolean> = newList.reduce(
                (acc, item) => {
                  acc[item.id] = item.status;
                  return acc;
                },
                {} as Record<string, boolean>,
              );
              setExtendByStatus(newList);
              saveExtendColumn && saveExtendColumn(dataExtend);
            }}>
            <ImageRound
              src="/icons/extend-column.svg"
              name="Extend column"
              className={`!w-3 !h-3 hover:cursor-pointer ${
                extendByStatus.find((list) => list.id == listId)?.status ?
                '-rotate-90' : 'rotate-180'
              }`}
              style={{
                width: `8px`,
                height: `12px`,
              }}
            />
          </div>
        </Tippy>

        {listId != StatusValueTask.MY_ROUTINE && (
          <div
            className={`bg-[${colorByStatus.find((status) => status.name == listTitle)?.color}] w-3 h-3 rounded-full right-1.5 top-2`}
          />
        )}
        <p className="font-medium text-[14px]">{listTitle}</p>
        {listId != StatusValueTask.MY_ROUTINE && (
          <p className="text-[#77858F] text-[14px]">{count}</p>
        )}

        <Tippy
          content="タスクを新規作成"
          arrow={false}
          delay={1000}
          placement="top"
          offset={[0, 5]}>
          <div
            className={`rounded-full cursor-pointer p-1.5 w-fit bg-[#E3EAED]`}
            onClick={() => addTask(String(listId))}
            style={{
              padding: '6.5px',
            }}>
            <ImageRound
              src={`/icons/add.svg`}
              name="Add"
              className="w-[9px] h-[9px]"
            />
          </div>
        </Tippy>
      </div>
      {extendByStatus.find((list) => list.id == listId)?.status &&
        listId == StatusValueTask.MY_ROUTINE && (
          <div className="flex text-[#77858F] text-[12px] mb-4">
            <p className="w-[59%] border-r-2">タスク名</p>
            <p className="w-[20%] border-r-2 text-center">予定日時</p>
          </div>
        )}
      <Droppable droppableId={String(listId)}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex-grow overflow-y-auto rounded-md max-h-[500px] mb-3 overflow-x-hidden scrollbar-gutter-stable ${
              snapshot.isDraggingOver ? 'bg-gray-200' : ''
            }`}>
            {extendByStatus.find((list) => list.id == listId)?.status &&
              listItems.map((item, index) => (
                <ListViewItem
                  key={item.id}
                  id={String(item.id)}
                  index={index}
                  content={item}
                  editTask={editTask}
                  handlePinItem={handlePinItem}
                  creationDataTaskData={creationDataTaskData}
                  handleActionEditTask={handleActionEditTask}
                  handleConfirmCopyTask={handleConfirmCopyTask}
                  handleUpdateItemInline={handleUpdateItemInline}
                />
              ))}
            {provided.placeholder}
            {extendByStatus.find((list) => list.id == listId)?.status &&
            listItems.length &&
            isChange ? (
              <div ref={listTaskRef} className="h-7">
                {initialLoad ? (
                  <Spinner className="!h-fit py-3" iconClassName="h-6 w-6" />
                ) : (
                  <div className="w-full h-6"></div>
                )}
              </div>
            ) : (
              <div></div>
            )}
          </div>
        )}
      </Droppable>
    </>
  );
};

export default ListViewByStatus;
