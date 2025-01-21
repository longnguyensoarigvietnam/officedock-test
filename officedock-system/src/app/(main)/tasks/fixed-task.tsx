import { Dispatch, SetStateAction, useEffect, useState } from 'react';
import { UseMutateFunction } from 'react-query';
import { useSession } from 'next-auth/react';
import { DragDropContext, DropResult } from '@hello-pangea/dnd';

import Column from '@components/kanban/Column';

import { INITIAL_INDEX_VALUE } from '@constants';

import { convertDateStringFull, getRandomDateTimeBetween } from '@utils/date';
import { ResponseError } from '@interfaces/response';
import {
  Columns,
  ColumnType,
  CreationDataTask,
  Task,
  TaskErrorPerson,
  TaskRequest,
} from '@interfaces/task';
import { OptionDropdownType } from '@interfaces/common';

interface PropsDataFixedTask {
  data: ColumnType;
  numberPagesData: {
    id: string;
    count: number;
    numPages: number;
    hasMores: boolean;
  }[];
  searchValue: string;
  orderTaskSave: Task[];
  tagSelected: string | number;
  orderingRequest: string;
  columnsKanbanData: Columns;
  showFrequentlyTasks: boolean;
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
  setColumnsKanbanData: Dispatch<SetStateAction<Columns | undefined>>;
  pinItemToTop: (itemId: string | number) => void;
  addTask: (id: string) => void;
  handleActionEditTask: (id: number) => void;
  handleConfirmCopyTask: (id: number) => void;
  handleUpdateItemInline: (data: Task) => void;
  editTaskInline: UseMutateFunction<
    Task,
    ResponseError<{
      detail: TaskErrorPerson;
    }>,
    TaskRequest,
    unknown
  >;
  creationDataTaskData: CreationDataTask | undefined;
  handleConfirmDrop: (result: DropResult) => void;
  selectedOptionZoom: OptionDropdownType;
}

const FixedTaskData = ({
  data,
  numberPagesData,
  searchValue,
  orderTaskSave,
  tagSelected,
  orderingRequest,
  columnsKanbanData,
  showFrequentlyTasks,
  selectedOptionZoom,
  setNumberPagesData,
  setColumnsKanbanData,
  pinItemToTop,
  addTask,
  handleActionEditTask,
  handleConfirmCopyTask,
  handleUpdateItemInline,
  editTaskInline,
  creationDataTaskData,
  handleConfirmDrop,
}: PropsDataFixedTask) => {
  const { data: session } = useSession();

  const [column, setColumn] = useState<ColumnType>(data);

  useEffect(() => {
    if (data) {
      setColumn(data);
    }
  }, [data]);

  const count =
    data && numberPagesData.find((page) => page.id === `${data.id}`)?.count;
  const hasNext = numberPagesData.find(
    (page) => page.id === `${data.id}`,
  )?.hasMores;
  const matchingTaskIds = orderTaskSave
    .filter((task) => task.status?.id === data.id)
    .map((task) => task.id);

  const onDragEnd = (result: DropResult): void => {
    const { source, destination } = result;

    if (!destination || source.index === destination.index) return;

    const items = Array.from(column.items);
    const [movedItem] = items.splice(source.index, 1);

    if (!movedItem.pinAt) {
      const prevMovedItem = items[destination.index - 1];
      const nextMovedItem = items[destination.index];

      if (nextMovedItem && nextMovedItem.pinAt) {
        const pinnedItems = items.filter((item) => item.pinAt);
        const nonPinnedItems = items.filter((item) => !item.pinAt);

        pinnedItems.push({
          ...movedItem,
          index: nonPinnedItems.length
            ? nonPinnedItems[0].index + INITIAL_INDEX_VALUE
            : INITIAL_INDEX_VALUE * 1000,
        });

        setColumnsKanbanData({
          ...columnsKanbanData,
          [column.id]: {
            ...column,
            items: [...pinnedItems, ...nonPinnedItems],
          },
        });
      } else {
        let prevItemIndex = prevMovedItem?.index || INITIAL_INDEX_VALUE;

        if (prevMovedItem && prevMovedItem.pinAt) {
          prevItemIndex = INITIAL_INDEX_VALUE;
        }
        const nextItemIndex = nextMovedItem
          ? nextMovedItem.index
          : -INITIAL_INDEX_VALUE;
        movedItem.index =
          prevItemIndex === Math.abs(INITIAL_INDEX_VALUE) ||
          nextItemIndex === Math.abs(INITIAL_INDEX_VALUE)
            ? prevItemIndex + nextItemIndex
            : (prevItemIndex + nextItemIndex) / 2;

        const pinnedItems = items.filter((item) => item.pinAt);
        const nonPinnedItems = items.filter((item) => !item.pinAt);

        nonPinnedItems.splice(
          destination.index - pinnedItems.length,
          0,
          movedItem,
        );
        setColumnsKanbanData({
          ...columnsKanbanData,
          [column.id]: {
            ...column,
            items: [...pinnedItems, ...nonPinnedItems],
          },
        });
      }
    } else {
      const prevItem = items[destination.index - 1];
      const nextItem = items[destination.index];

      const isPrevItemNotPinned = !prevItem || !prevItem.pinAt;
      const isNextItemNotPinned = !nextItem || !nextItem.pinAt;

      if (isPrevItemNotPinned && isNextItemNotPinned) {
        const pinnedItems = items.filter((item) => item.pinAt);
        const nonPinnedItems = items.filter((item) => !item.pinAt);

        const updatedPinnedItems = [
          {
            ...movedItem,
            pinAt: convertDateStringFull(new Date()),
          },
          ...pinnedItems,
        ];

        setColumnsKanbanData({
          ...columnsKanbanData,
          [column.id]: {
            ...column,
            items: [...updatedPinnedItems, ...nonPinnedItems],
          },
        });
      } else {
        const dateAtPrev = prevItem?.pinAt || null;
        const dateAtNext = nextItem?.pinAt || null;

        const newPinAt = getRandomDateTimeBetween(dateAtNext, dateAtPrev);

        movedItem.pinAt = newPinAt;

        items.splice(destination.index, 0, movedItem);

        setColumnsKanbanData({
          ...columnsKanbanData,
          [column.id]: {
            ...column,
            items,
          },
        });
      }
    }
    handleConfirmDrop(result);
  };

  return (
    <div>
      {column && (
        <DragDropContext onDragEnd={onDragEnd}>
          <div>
            <Column
              columnId={`${column?.id}`}
              title={column.title}
              items={column.items}
              totalCount={count || 0}
              hasNext={hasNext}
              searchValue={searchValue}
              matchingTaskIds={matchingTaskIds}
              index={0}
              userId={`${session?.user.id}`}
              tagSelected={tagSelected}
              orderingRequest={orderingRequest}
              columnsKanbanData={columnsKanbanData}
              addTask={addTask}
              showFrequentlyTasks={showFrequentlyTasks}
              handleActionEditTask={handleActionEditTask}
              handleConfirmCopyTask={handleConfirmCopyTask}
              handleUpdateItemInline={handleUpdateItemInline}
              setColumnsKanbanData={setColumnsKanbanData}
              editTask={editTaskInline}
              setNumberPagesData={setNumberPagesData}
              pinItemToTop={pinItemToTop}
              creationDataTaskData={creationDataTaskData}
              selectedOptionZoom={selectedOptionZoom}
            />
          </div>
        </DragDropContext>
      )}
    </div>
  );
};

export default FixedTaskData;
