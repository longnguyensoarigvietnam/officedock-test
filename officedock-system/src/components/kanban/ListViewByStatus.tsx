'use client';
import { useMutation } from 'react-query';
import {
  Dispatch,
  SetStateAction,
  useContext,
  useEffect,
  useState,
} from 'react';
import { Droppable } from '@hello-pangea/dnd';
import { useInView } from 'react-intersection-observer';

import ImageRound from '@components/common/ImageRound';
import { DynamicTooltip } from '@components/tooltip/DynamicTooltip';
import Spinner from '@components/common/Spinner';
import ListViewItem from './ListViewItem';

import {
  Columns,
  DataStatusChangeInline,
  KanbanDataResponse,
  Task,
} from '@interfaces/task';
import { CreationDataCommon } from '@interfaces/common';

import { TaskContext } from '@providers/TaskProvider';

import { apiRouters } from '@constants/routers';
import { COLOR_BY_TASK_STATUS, PAGINATION_PAGE_SIZE_KANBAN } from '@constants';
import { StatusValueTask } from '@constants/enums';

import api from '@base/api';

interface ListViewByStatusProps {
  listItems: Task[];
  listId: string | number;
  listTitle: string;
  hasNext: boolean | undefined;
  totalCount: number;
  userId: string;
  searchValue: string;
  handlePinItem: (id: string) => void;
  handleActionEditTask: (id: number) => void;
  handleConfirmCopyTask: (id: number) => void;
  handleUpdateItemInline: (data: Task) => void;
  editTaskInline: (data: DataStatusChangeInline) => void;
  creationDataCommonData: CreationDataCommon | undefined;
  columnsKanbanData: Columns;
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
  handleViewArchive: () => void;
}
const ListViewByStatus = ({
  listItems,
  listId,
  listTitle,
  hasNext,
  totalCount,
  userId,
  searchValue,
  handlePinItem,
  handleActionEditTask,
  handleConfirmCopyTask,
  handleUpdateItemInline,
  editTaskInline,
  creationDataCommonData,
  columnsKanbanData,
  setColumnsKanbanData,
  setNumberPagesData,
  saveExtendColumn,
  handleViewArchive,
}: ListViewByStatusProps) => {
  const [hasMore, setHasMore] = useState(true);
  const [lastIndex, setLastIndex] = useState<number | null>(null);
  const [initialLoad, setInitialLoad] = useState<boolean>(false);
  const [page, setPage] = useState<number>(1);
  const [pinAtLast, setPinAtLast] = useState<string | null>(null);
  const [isChange, setChange] = useState(false);
  const { ref: listTaskRef, inView: inViewListTask } = useInView({
    threshold: 0.2,
  });
  const {
    extendByStatus,
    isLoadingDataTask,
    orderingOptions,
    setExtendByStatus,
  } = useContext(TaskContext);
  const [count, setCount] = useState<number>(totalCount);

  const handleGetDataTaskMore = async (pageNumber: number) => {
    setInitialLoad(true);

    let apiUrl = `${apiRouters.TASK_BOARD_LIST}?status_id=${listId}&page=${pageNumber}&page_size=${PAGINATION_PAGE_SIZE_KANBAN}`;

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
      apiUrl += `&search=${searchValue}`;
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
      listItems.length > 10 &&
      listId &&
      listId == `${StatusValueTask.COMPLETED}`
    ) {
      removeOldestTask(listId);
    }
  }, [listId, listItems.length, totalCount]);

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

  useEffect(() => {
    let remainingCount = totalCount - page * PAGINATION_PAGE_SIZE_KANBAN;
    if (remainingCount < 0) {
      remainingCount = 0;
    }

    setCount(remainingCount + listItems.length);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalCount, listItems, listItems.length, columnsKanbanData]);

  return (
    <>
      <div className="flex items-center gap-[10px] mb-[14px]">
        <DynamicTooltip
          content={
            extendByStatus.find((list) => list.id == listId)?.status
              ? '閉じる'
              : '開く'
          }
          placement="top">
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
                extendByStatus.find((list) => list.id == listId)?.status
                  ? '-rotate-90'
                  : 'rotate-180'
              }`}
              style={{
                width: `8px`,
                height: `12px`,
              }}
            />
          </div>
        </DynamicTooltip>

        <div
          className={`bg-[${COLOR_BY_TASK_STATUS.find((status) => status.name == listTitle)?.color}] w-[2px] h-[20px] right-1.5 top-2`}
        />

        <p className="font-medium text-[14px]">{listTitle}</p>
        {!isLoadingDataTask && (
          <p className="text-[#77858F] text-[14px]">{count}</p>
        )}
        {listId == `${StatusValueTask.COMPLETED}` && (
          <DynamicTooltip content="アーカイブタスクを見る" placement="top">
            <ImageRound
              src={`/icons/archive-treasure.svg`}
              name="archive-treasure"
              className="w-fit h-fit cursor-pointer"
              onClick={() => {
                handleViewArchive && handleViewArchive();
              }}
            />
          </DynamicTooltip>
        )}
      </div>
      {extendByStatus.find((list) => list.id == listId)?.status &&
        (listId == StatusValueTask.MY_ROUTINE ? (
          <div className="flex items-center text-[#77858F] text-[12px] mb-[10px] px-1 font-medium">
            <p className="w-[59%]">タスク名</p>
            <div className="w-[1px] h-[9px] bg-[#D2DBE1]"></div>
            <p className="w-[20%] text-left pl-[14px]">締切</p>
          </div>
        ) : (
          <div className="w-[calc(100%_-_14px)] flex items-center text-[#77858F] text-[12px] mb-[10px] px-1 font-medium">
            <p className="w-3/5">タスク名</p>
            <div className="w-[1px] h-[9px] bg-[#D2DBE1]"></div>
            <p className="w-[calc(16%-2px)] text-left pl-[14px]">締切</p>
            <div className="w-[1px] h-[9px] bg-[#D2DBE1]"></div>
            <p className="w-[calc(8%)] text-center">重要</p>
            <div className="w-[1px] h-[9px] bg-[#D2DBE1]"></div>
            <p className="px-5">ステータス</p>
          </div>
        ))}

      <Droppable droppableId={String(listId)}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex-grow overflow-y-auto rounded-md p-1 max-h-[500px] mb-[22px] overflow-x-hidden scrollbar-gutter-stable ${
              snapshot.isDraggingOver ? 'bg-gray-200' : ''
            }`}>
            {extendByStatus.find((list) => list.id == listId)?.status &&
              listItems.map((item, index) => (
                <ListViewItem
                  key={item.id}
                  id={String(item.id)}
                  index={index}
                  content={item}
                  editTaskInline={editTaskInline}
                  handlePinItem={handlePinItem}
                  creationDataCommonData={creationDataCommonData}
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
