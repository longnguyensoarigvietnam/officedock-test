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
import Tippy from '@tippyjs/react';
import 'tippy.js/dist/tippy.css';

import Item from './Item';
import ImageRound from '@components/common/ImageRound';
import Spinner from '@components/common/Spinner';
import {
  KanbanType,
  PermissionsSystem,
  StatusValueTask,
} from '@constants/enums';
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
import { OptionDropdownType } from '@interfaces/common';
import ItemRoutine from './ItemRoutine';
interface ColumnProps {
  columnId: string;
  title: string;
  items: Task[];
  index: number;
  userId: string;
  searchValue: string;
  selectedOptionZoom: OptionDropdownType;
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
  selectedOptionZoom,
  setColumnsKanbanData,
  handleActionEditTask,
  handleConfirmCopyTask,
  handleUpdateItemInline,
  setNumberPagesData,
}: ColumnProps) => {
  const { data: session } = useSession();
  const isMyRoutine = columnId === `${StatusValueTask.MY_ROUTINE}`;

  const { columnWidth } = useContext(TaskContext);
  const { extendByStatus, setExtendByStatus } = useContext(TaskContext);

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

  let statusStyle = '';

  // TODO: Because the number of states can change.
  // So, determining the color code from the enum is unreasonable.
  // This is a temporary solution as there is no defined color code, this will be changed and updated
  switch (columnId && parseInt(columnId)) {
    case StatusValueTask.NOT_STARTED:
      statusStyle = '!bg-[#A3EBF0]';
      break;
    case StatusValueTask.IN_PROGRESS:
      statusStyle = '!bg-[#92E9AF]';
      break;
    case StatusValueTask.CONFIRMING:
      statusStyle = '!bg-[#FCCF79]';
      break;
    case StatusValueTask.COMPLETED:
      statusStyle = '!bg-[#F58383]';
      break;
    case StatusValueTask.MY_ROUTINE:
      statusStyle = '!bg-[#EBF1F7]';
      break;
    default:
      break;
  }

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

  let paddingRight;
  switch (selectedOptionZoom.value) {
    case 25:
    case 50:
      paddingRight = `${(columnWidth / 247) * 17}px`;
      break;
    case 75:
      paddingRight = `${(columnWidth / 247) * 19}px`;
      break;
    case 90:
      paddingRight = `${(columnWidth / 247) * 20}px`;
      break;
    case 100:
      paddingRight = `${(columnWidth / 247) * 22}px`;
      break;
    default:
      paddingRight = `${(columnWidth / 247) * 17}px`;
  }

  return extendByStatus.find((item) => String(item.id) == String(columnId))
    ?.status ? (
    <div
      style={{
        width: `${(columnWidth / 247) * 271}px`,
        maxWidth: `${(columnWidth / 247) * 271}px`,
        paddingLeft: isMyRoutine ? 0 : `${(columnWidth / 247) * 8}px`,
        paddingRight: isMyRoutine ? 0 : `${(columnWidth / 247) * 8}px`,
      }}
      ref={columnRef}
      className={`h-full ${isMyRoutine && 'mt-1'} `}>
      <div
        style={{
          width: `${(columnWidth / 247) * 271}px`,
          maxWidth: `${(columnWidth / 247) * 271}px`,
          paddingLeft: `${(columnWidth / 247) * 8}px`,
          paddingRight: `${(columnWidth / 247) * 8}px`,
        }}>
        <div
          style={{
            height: `${(columnWidth / 247) * 36}px`,
            paddingLeft: isMyRoutine
              ? `${(columnWidth / 247) * 14}px`
              : `${(columnWidth / 247) * 6}px`,
            paddingRight: isMyRoutine
              ? `${(columnWidth / 247) * 14}px`
              : `${(columnWidth / 247) * 16}px`,
          }}
          className={`flex justify-between ${isMyRoutine && 'bg-[#DAE2EB] rounded-tl-lg rounded-tr-lg'} `}>
          <div
            style={{
              fontSize: `${(columnWidth / 247) * 14}px`,
              gap: `${(columnWidth / 247) * 8}px`,
            }}
            className="flex items-center font-medium ">
            {!isMyRoutine && (
              <span
                className={`w-[10px] h-[10px] rounded-full ${statusStyle}`}></span>
            )}
            <span>{title}</span>
            <span className="text-[#77858F]">
              {Number(columnId) != StatusValueTask.MY_ROUTINE && count}
            </span>
          </div>
          <div className="flex items-center gap-3">
            {session?.user.permissions &&
              hasPermissionInArray(
                session?.user.permissions,
                PermissionsSystem.MY_TASK_ADD,
              ) && (
                <Tippy
                  content="タスクを新規作成"
                  arrow={false}
                  delay={1000}
                  placement="top"
                  offset={[0, 5]}>
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
                </Tippy>
              )}
            <Tippy
              content="タブを縮小"
              arrow={false}
              delay={1000}
              placement="top"
              offset={[0, 5]}>
              <div
                style={{
                  padding: `${(columnWidth / 247) * 5}px`,
                }}>
                <ImageRound
                  src={`/icons/extend-column.svg`}
                  className={`${
                    extendByStatus.find(
                      (list) => String(list.id) == String(columnId),
                    )?.status && 'rotate-180'
                  }`}
                  name="extend"
                  onClick={() => {
                    setExtendByStatus((prev) =>
                      prev.map((item) =>
                        String(item.id) == String(columnId)
                          ? { ...item, status: !item.status }
                          : item,
                      ),
                    );
                  }}
                  style={{
                    width: `${(columnWidth / 247) * 8}px`,
                    height: `${(columnWidth / 247) * 12}px`,
                  }}
                />
              </div>
            </Tippy>
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
                paddingLeft: isMyRoutine
                  ? `${(columnWidth / 247) * 14}px`
                  : `${(columnWidth / 247) * 8}px`,
                paddingTop: `${(columnWidth / 247) * 14}px`,
                marginRight: isMyRoutine ? `-${(columnWidth / 247) * 16}px` : 0,
                paddingRight: isMyRoutine ? paddingRight : '10px',
                boxShadow: `inset -${(columnWidth / 247) * 16}px 0 0 #f8fafc`,
                minHeight: showFrequentlyTasks
                  ? 'calc(100vh - 350px)'
                  : 'calc(100vh - 240px)',
              }}
              className={`flex-grow overflow-y-auto
                ${isMyRoutine && 'bg-[#EBF1F7] '}
                 overflow-x-hidden scrollbar-gutter-stable ${
                   snapshot.isDraggingOver ? 'bg-gray-200' : ''
                 }`}>
              <div
                className={`flex flex-col ${
                  showFrequentlyTasks === true
                    ? 'h-[calc(100vh_-_350px)]'
                    : 'h-[calc(100vh_-_350px)]'
                }`}>
                {items.map((item, index) => (
                  <>
                    {isMyRoutine ? (
                      <ItemRoutine
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
                    ) : (
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
                    )}
                  </>
                ))}
                {/* Make sure the placeholder is rendered here */}
                {provided.placeholder}
                {/* Loading spinner logic */}
                {items.length && isChange ? (
                  <div ref={listTaskRef} className="h-7">
                    {initialLoad ? (
                      <Spinner
                        className="!h-fit py-3"
                        iconClassName="h-6 w-6"
                      />
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
    </div>
  ) : (
    <div className="w-[40px] pt-[6px]">
      <div className="flex gap-[6px] items-center justify-center">
        <div className={`w-[10px] h-[10px] rounded-full ${statusStyle}`}></div>
        <Tippy
          content="タブを縮小"
          arrow={false}
          delay={1000}
          placement="top"
          offset={[0, 5]}>
          <div
            style={{
              padding: `${(columnWidth / 247) * 5}px`,
            }}>
            <ImageRound
              src={`/icons/extend-column.svg`}
              className={`${
                extendByStatus.find(
                  (list) => String(list.id) == String(columnId),
                )?.status && 'rotate-180'
              } cursor-pointer`}
              name="extend"
              onClick={() => {
                setExtendByStatus((prev) =>
                  prev.map((item) =>
                    String(item.id) == String(columnId)
                      ? { ...item, status: !item.status }
                      : item,
                  ),
                );
              }}
              style={{
                width: `${(columnWidth / 247) * 8}px`,
                height: `${(columnWidth / 247) * 12}px`,
              }}
            />
          </div>
        </Tippy>
      </div>
      <div
        style={{
          marginBottom: `${(columnWidth / 247) * 14}px`,
          marginTop: `${(columnWidth / 247) * 14}px`,
        }}>
        {Number(columnId) != StatusValueTask.MY_ROUTINE ? (
          <p
            style={{
              fontSize: `${(columnWidth / 247) * 14}px`,
            }}
            className="text-[#77858F] w-full text-center text-sm">
            {count}
          </p>
        ) : (
          <p
            style={{
              fontSize: `${(columnWidth / 247) * 14}px`,
            }}
            className="text-[#77858F] w-full text-center text-sm h-5"></p>
        )}
      </div>
      <div className="w-full flex justify-center">
        <div className={`w-2 ${showFrequentlyTasks ? 'h-[calc(100vh_-_400px)]' : 'h-[calc(100vh_-_280px)]'} bg-[#EBF1F7]`}></div>
      </div>
    </div>
  );
};
export default Column;
