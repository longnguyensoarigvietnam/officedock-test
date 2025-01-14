'use client';
import { UseMutateFunction, useMutation } from 'react-query';
import { Droppable } from '@hello-pangea/dnd';
import {
  Dispatch,
  SetStateAction,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useInView } from 'react-intersection-observer';
import { useSession } from 'next-auth/react';

import Item from './Item';
import ImageRound from '@components/common/ImageRound';
import Spinner from '@components/common/Spinner';
import { KanbanType, PermissionsSystem } from '@constants/enums';
import { apiRouters } from '@constants/routers';
import { PAGINATION_PAGE_SIZE_KANBAN } from '@constants';
import {
  Columns,
  CreationDataTask,
  KanbanDataResponse,
  Task,
  TaskErrorPerson,
  TaskRequest,
} from '@interfaces/task';
import { ResponseError } from '@interfaces/response';
import api from '@base/api';
import { encodeFormatDateISO } from '@utils/date';
import { hasPermissionInArray } from '@utils';
import { TaskContext } from '@providers/TaskProvider';
interface ColumnProps {
  columnId: string;
  title: string;
  items: Task[];
  index: number;
  userId: string;
  searchValue: string;
  tagSelected: string | number;
  hasNext: boolean | undefined;
  totalCount: number;
  matchingTaskIds: number[];
  orderingRequest: string;
  columnsKanbanData: Columns;
  addTask: (columnId: string) => void;
  creationDataTaskData?: CreationDataTask;
  showFrequentlyTasks: boolean;
  handleActionEditTask: (id: number) => void;
  handleConfirmCopyTask: (id: number) => void;
  handleUpdateItemInline: (data: Task) => void;
  setColumnsKanbanData: Dispatch<SetStateAction<Columns | undefined>>;
  editTask: UseMutateFunction<
    Task,
    ResponseError<{
      detail: TaskErrorPerson;
    }>,
    TaskRequest,
    unknown
  >;
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
  pinItemToTop: (itemId: string | number) => void;
}
const Column = ({
  columnId,
  title,
  items,
  hasNext,
  searchValue,
  userId,
  totalCount,
  matchingTaskIds,
  orderingRequest,
  columnsKanbanData,
  creationDataTaskData,
  showFrequentlyTasks,
  pinItemToTop,
  addTask,
  editTask,
  setColumnsKanbanData,
  handleActionEditTask,
  handleConfirmCopyTask,
  handleUpdateItemInline,
  setNumberPagesData,
}: ColumnProps) => {
  const { data: session } = useSession();

  const { columnWidth } = useContext(TaskContext);

  const [hasMore, setHasMore] = useState(true);
  const [lastIndex, setLastIndex] = useState<number | null>(null);
  const [taskLast, setTaskLast] = useState<number | null>(null);
  const [deadlineLast, setDeadlineLast] = useState<string | null>(null);
  const [pinAtLast, setPinAtLast] = useState<string | null>(null);

  const [page, setPage] = useState<number>(1);
  const { ref: listTaskRef, inView: inViewListTask } = useInView({
    threshold: 0.2,
  });
  const [initialLoad, setInitialLoad] = useState<boolean>(false);
  // Handle get list and more data task
  const handleGetDataTaskMore = async (pageNumber: number) => {
    setInitialLoad(true);

    const idTasks = matchingTaskIds.join(',');
    let apiUrl = `${apiRouters.TASK_BOARD_LIST}?status_id=${columnId}&page=${pageNumber}&page_size=${PAGINATION_PAGE_SIZE_KANBAN}`;

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

  const { mutate: getDataListTaskMore } = useMutation(
    'getDataListTaskMore',
    handleGetDataTaskMore,
    {
      onSuccess: ({ data }) => {
        const newState = { ...columnsKanbanData };
        const columnKey = String(columnId);
        const column = newState[columnKey];
        if (column) {
          column.items = [...column.items, ...data.results];
        } else {
          newState[columnKey] = {
            id: columnId,
            title: `Column ${columnId}`,
            items: items,
          };
        }
        setColumnsKanbanData(newState);

        if (data.hasNext) {
          setHasMore(true);
        } else {
          setHasMore(false);
          setNumberPagesData((prevData) =>
            prevData.map((item) =>
              `${item.id}` === `${columnId}`
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
  const [isChange, setChange] = useState(false);
  useEffect(() => {
    if (inViewListTask && hasMore && isChange) {
      getDataListTaskMore(1);
      setPage(page + 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inViewListTask, hasMore]);
  const [count, setCount] = useState<number>(totalCount);
  useEffect(() => {
    let remainingCount = totalCount - page * PAGINATION_PAGE_SIZE_KANBAN;
    if (remainingCount < 0) {
      remainingCount = 0;
    }

    setCount(remainingCount + items.length);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalCount, items, items.length, columnsKanbanData]);

  useEffect(() => {
    if (items) {
      items.length && setLastIndex(items[items.length - 1].index);
      if (items.length > 0 && items[items.length - 1]?.pinAt) {
        setPinAtLast(items[items.length - 1].pinAt ?? null);
      } else {
        setPinAtLast(null);
      }
      if (items.length > PAGINATION_PAGE_SIZE_KANBAN - 1) {
        setChange(true);
      }
      if (orderingRequest) {
        if (items.length) {
          setDeadlineLast(items[items.length - 1].deadline);
          setTaskLast(parseInt(`${items[items.length - 1].id}`));
        } else {
          setDeadlineLast(null);
          setTaskLast(null);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  const columnRef = useRef(null);
  const [visibleColumns, setVisibleColumns] = useState(true);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setVisibleColumns(entry.isIntersecting);
      },
      { root: document.querySelector('.scroll-container'), threshold: 0.1 },
    );

    if (columnRef.current) {
      observer.observe(columnRef.current);
    }

    return () => {
      if (columnRef.current) {
        observer.unobserve(columnRef.current);
      }
    };
  }, [columnId]);

  // Action pin item to top
  const handlePinItem = (id: string) => {
    pinItemToTop(id);
  };

  return (
    <div ref={columnRef} className="h-full">
      <div
        style={{
          height: `${(columnWidth / 247) * 32}px`,
        }}
        className="flex justify-between ">
        <div
          style={{
            fontSize: `${(columnWidth / 247) * 14}px`,
            gap: `${(columnWidth / 247) * 8}px`,
          }}
          className="flex items-center font-medium ">
          <span>{title}</span>
          <span className="text-[#77858F]">{count}</span>
        </div>
        <div className="flex items-center gap-3">
          {session?.user.permissions &&
            hasPermissionInArray(
              session?.user.permissions,
              PermissionsSystem.MY_TASK_ADD,
            ) && (
              <div
                style={{
                  padding: `${(columnWidth / 247) * 6}px`,
                }}
                className={`rounded-full  cursor-pointer w-fit bg-gray-200`}
                onClick={() => addTask(columnId)}>
                <ImageRound
                  src={`/icons/add.svg`}
                  name="Add"
                  style={{
                    width: `${(columnWidth / 247) * 12}px`,
                    height: `${(columnWidth / 247) * 12}px`,
                  }}
                />
              </div>
            )}
        </div>
      </div>
      <Droppable
        isDropDisabled={!visibleColumns}
        droppableId={columnId}
        type={KanbanType.CARD}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            style={{
              paddingLeft: `${(columnWidth / 247) * 8}px`,
              marginTop: `${(columnWidth / 247) * 14}px`,
              minHeight: showFrequentlyTasks
                ? 'calc(100vh - 350px)'
                : 'calc(100vh - 260px)',
            }}
            className={`flex-grow overflow-y-auto  rounded-md overflow-x-hidden scrollbar-gutter-stable ${
              snapshot.isDraggingOver ? 'bg-gray-200' : ''
            }`}>
            <div
              className={`flex flex-col ${
                showFrequentlyTasks === true
                  ? 'h-[calc(100vh_-_350px)]'
                  : 'h-[calc(100vh_-_350px)]'
              }`}>
              {items.map((item, index) => (
                <Item
                  key={item.id}
                  id={`${item.id}`}
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
              {/* Make sure the placeholder is rendered here */}
              {provided.placeholder}
              {/* Loading spinner logic */}
              {items.length && isChange ? (
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
          </div>
        )}
      </Droppable>
    </div>
  );
};
export default Column;
