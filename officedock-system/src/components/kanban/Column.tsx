'use client';
import { useMutation } from 'react-query';
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
import { useSessionCache } from '@providers/SessionCacheProvider';

import Item from './Item';
import ItemRoutine from './ItemRoutine';
import ImageRound from '@components/common/ImageRound';
import { DynamicTooltip } from '@components/tooltip/DynamicTooltip';
import Spinner from '@components/common/Spinner';
import Button from '@components/common/Button';

import {
  KanbanType,
  PermissionsSystem,
  StatusValueTask,
} from '@constants/enums';
import { apiRouters } from '@constants/routers';
import { PAGINATION_PAGE_SIZE_KANBAN } from '@constants';

import {
  Columns,
  DataStatusChangeInline,
  KanbanDataResponse,
  Task,
} from '@interfaces/task';
import { CreationDataCommon, OptionDropdownType } from '@interfaces/common';

import api from '@base/api';
import { hasPermissionInArray } from '@utils';
import { TaskContext } from '@providers/TaskProvider';
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
  creationDataCommonData: CreationDataCommon | undefined;
  showFrequentlyTasks: boolean;
  handleActionEditTask: (id: number, type?: string) => void;
  handleConfirmCopyTask: (id: number) => void;
  handleUpdateItemInline: (data: Task) => void;
  setColumnsKanbanData: Dispatch<SetStateAction<Columns | undefined>>;
  editTask: (data: DataStatusChangeInline) => void;

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
  saveExtendColumn: (data: Record<string, boolean>) => void;
  handleViewArchive?: () => void;
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
  columnsKanbanData,
  creationDataCommonData,
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
  saveExtendColumn,
  handleViewArchive,
}: ColumnProps) => {
  const { data: session } = useSessionCache();
  const isMyRoutine = columnId === `${StatusValueTask.MY_ROUTINE}`;

  const { columnWidth, extendByStatus, orderingOptions, setExtendByStatus } =
    useContext(TaskContext);

  const [hasMore, setHasMore] = useState(true);
  const [lastIndex, setLastIndex] = useState<number | null>(null);
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
    if (lastIndex) {
      apiUrl += `&index=${lastIndex}`;
    }

    if (userId) {
      apiUrl += `&user_id=${userId}`;
    }

    if (searchValue) {
      apiUrl += `&search=${searchValue}${idTasks ? `&ids=${idTasks}` : ''}`;
    }
    if (orderingOptions?.organization_ids?.length) {
      apiUrl += `&organization_ids=${orderingOptions.organization_ids.map((item) => item.value).join(',')}`;
    }

    if (orderingOptions?.category_ids?.length) {
      apiUrl += `&category_ids=${orderingOptions.category_ids.map((item) => item.value).join(',')}`;
    }

    if (orderingOptions?.tag_ids?.length) {
      apiUrl += `&tag_ids=${orderingOptions.tag_ids.map((item) => item.value).join(',')}`;
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

  // Remove oldest task complete for column COMPLETE
  function removeOldestTask(columnId: string | number) {
    setColumnsKanbanData((prev) => {
      if (!prev || !prev[columnId]) return prev; // check column existence

      const column = prev[columnId];
      const items = column.items;

      if (items.length === 0) return prev;

      // Find the item with the oldest completedAt
      const oldestItem = items.reduce((oldest, current) => {
        if (!oldest.completedAt) return current;
        if (!current.completedAt) return oldest;
        return new Date(current.completedAt) < new Date(oldest.completedAt)
          ? current
          : oldest;
      });

      // Create a new list, remove the oldest item
      const newItems = items.filter((item) => item.id !== oldestItem.id);

      // Return new state
      return {
        ...prev,
        [columnId]: {
          ...column,
          items: newItems,
        },
      };
    });
  }

  useEffect(() => {
    if (
      count >= 10 &&
      items.length > 10 &&
      columnId &&
      columnId == `${StatusValueTask.COMPLETED}`
    ) {
      removeOldestTask(columnId);
    }
  }, [columnId, items.length, totalCount]);

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
      paddingRight = `${(columnWidth / 247) * 4}px`;
      break;
    case 75:
    case 90:
    case 100:
      paddingRight = `${(columnWidth / 247) * 12}px`;
      break;
    default:
      paddingRight = `${(columnWidth / 247) * 15}px`;
  }

  const isHasOrdering =
    (orderingOptions && orderingOptions.tag_ids.length > 0) ||
    (orderingOptions && orderingOptions.category_ids.length > 0) ||
    (orderingOptions && orderingOptions.organization_ids.length > 0);

  return extendByStatus.find((item) => String(item.id) == String(columnId))
    ?.status ? (
    <div
      style={{
        width: `${(columnWidth / 247) * 271}px`,
        minWidth: isMyRoutine ? '154px' : '151px',
        maxWidth: `${(columnWidth / 247) * 271}px`,
        paddingLeft: isMyRoutine ? 0 : `${(columnWidth / 247) * 8}px`,
        paddingRight: isMyRoutine ? 0 : `${(columnWidth / 247) * 8}px`,
      }}
      ref={columnRef}
      className={`h-full ${isMyRoutine && 'mt-1'} `}>
      <div
        style={{
          width: `${(columnWidth / 247) * 271}px`,
          minWidth: isMyRoutine ? '154px' : '151px',
          maxWidth: `${(columnWidth / 247) * 271}px`,
          paddingLeft: `${(columnWidth / 247) * 8}px`,
          paddingRight: `${(columnWidth / 247) * 8}px`,
        }}>
        <div
          style={{
            height: `36px`,
            paddingLeft: isMyRoutine
              ? `${(columnWidth / 247) * 14}px`
              : `${(columnWidth / 247) * 6}px`,
            paddingRight: isMyRoutine
              ? `${(columnWidth / 247) * 14}px`
              : (selectedOptionZoom.value as number) > 50
                ? `${(columnWidth / 247) * 16}px`
                : '17px',
          }}
          className={`flex justify-between ${isMyRoutine && 'bg-[#DAE2EB] rounded-tl-[14px] rounded-tr-[14px]'} `}>
          <div
            style={{
              gap: `6px`,
            }}
            className="flex items-center text-sm break-all font-medium ">
            {!isMyRoutine && (
              <span className={`w-[2px] h-[20px] ${statusStyle}`}></span>
            )}
            <span>{title}</span>
            {!isMyRoutine && (
              <span
                className={`text-[#77858F] ${count > 99 && (selectedOptionZoom.value as number) < 75 && '!text-[10px]'}`}>
                {count}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {session?.user.permissions &&
              hasPermissionInArray(
                session?.user.permissions,
                PermissionsSystem.MY_TASK_ADD,
              ) && (
                <DynamicTooltip content="タスクを新規作成" placement="top">
                  <div
                    style={{
                      padding: '6.5px',
                    }}
                    className={`rounded-full cursor-pointer w-fit ${Number(columnId) != StatusValueTask.MY_ROUTINE ? 'bg-[#E3EAED]' : 'bg-[#EBF2F7]'}`}
                    onClick={() => {
                      addTask(columnId);
                    }}>
                    <ImageRound
                      src={`/icons/add.svg`}
                      name="Add"
                      style={{
                        width: `9px`,
                        height: `9px`,
                      }}
                    />
                  </div>
                </DynamicTooltip>
              )}
            <DynamicTooltip content="タブを縮小" placement="top">
              <div
                onClick={async () => {
                  const newList = extendByStatus.map((item) =>
                    String(item.id) == String(columnId)
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
                }}
                className={`flex items-center justify-center cursor-pointer ${Number(columnId) != StatusValueTask.MY_ROUTINE ? 'hover:bg-[#E3EAED]' : 'hover:bg-[#EBF2F7]'} rounded-full w-[22px] h-[22px]`}>
                <ImageRound
                  src={`/icons/extend-column.svg`}
                  className={` ${
                    extendByStatus.find(
                      (list) => String(list.id) == String(columnId),
                    )?.status
                      ? 'rotate-0'
                      : 'rotate-180'
                  }`}
                  name="extend"
                  style={{
                    width: `8px`,
                    height: `12px`,
                  }}
                />
              </div>
            </DynamicTooltip>
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
                minHeight: showFrequentlyTasks
                  ? isHasOrdering
                    ? 'calc(100vh - 402px)'
                    : 'calc(100vh - 372px)'
                  : isHasOrdering
                    ? 'calc(100vh - 320px)'
                    : 'calc(100vh - 280px)',
              }}
              className={`flex-grow overflow-y-auto w-[100%]
                ${isMyRoutine && 'bg-[#EBF1F7] rounded-bl-[14px] rounded-br-[14px] '}
                 overflow-x-hidden scrollbar-gutter-stable ${
                   snapshot.isDraggingOver ? 'bg-gray-200' : ''
                 }`}>
              <div
                className={`flex flex-col ${
                  showFrequentlyTasks === true
                    ? isHasOrdering
                      ? 'h-[calc(100vh_-_410px)]'
                      : 'h-[calc(100vh_-_370px)]'
                    : isHasOrdering
                      ? 'h-[calc(100vh_-_380px)]'
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
                        creationDataCommonData={creationDataCommonData}
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
                {columnId == `${StatusValueTask.COMPLETED}` && (
                  <Button
                    onClick={() => {
                      handleViewArchive && handleViewArchive();
                    }}
                    variant="secondary"
                    className="w-full !px-0 !bg-[#EBF1F7] !text-[#77858F] font-medium text-sm !border-none">
                    アーカイブタスクを見る
                  </Button>
                )}
              </div>
            </div>
          )}
        </Droppable>
      </div>
    </div>
  ) : (
    <div className="w-[40px] pt-[6px]">
      <div className="flex  items-center justify-center">
        <div className={`w-[2px] h-[20px] ${statusStyle}`}></div>
        <DynamicTooltip content="タブを拡大" placement="top">
          <div
            className={`flex items-center justify-center cursor-pointer ${Number(columnId) != StatusValueTask.MY_ROUTINE ? 'hover:bg-[#E3EAED]' : 'hover:bg-[#EBF2F7]'} rounded-full w-[22px] h-[22px]`}
            onClick={async () => {
              const newList = extendByStatus.map((item) =>
                String(item.id) == String(columnId)
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
              saveExtendColumn(dataExtend);
            }}>
            <ImageRound
              src={`/icons/extend-column.svg`}
              className={` ${
                extendByStatus.find(
                  (list) => String(list.id) == String(columnId),
                )?.status
                  ? 'rotate-0'
                  : 'rotate-180'
              } cursor-pointer`}
              name="extend"
              style={{
                width: `8px`,
                height: `12px`,
              }}
            />
          </div>
        </DynamicTooltip>
      </div>
      <div
        style={{
          marginBottom: `${(columnWidth / 247) * 14}px`,
          marginTop: `${(columnWidth / 247) * 14}px`,
        }}>
        {Number(columnId) != StatusValueTask.MY_ROUTINE ? (
          <p
            style={{
              fontSize: `14px`,
            }}
            className="text-[#77858F] w-full text-center text-sm">
            {count}
          </p>
        ) : (
          <p
            style={{
              fontSize: `14px`,
            }}
            className="text-[#77858F] w-full text-center text-sm h-5"></p>
        )}
      </div>
      <div className="w-full flex justify-center">
        <div
          className={`w-2 ${showFrequentlyTasks ? (isHasOrdering ? 'h-[calc(100vh_-_430px)]' : 'h-[calc(100vh_-_400px)]') : isHasOrdering ? 'h-[calc(100vh_-_310px)]' : 'h-[calc(100vh_-_280px)]'} bg-[#EBF1F7]`}></div>
      </div>
    </div>
  );
};
export default Column;
