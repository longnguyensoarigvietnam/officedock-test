'use client';
import { UseMutateFunction } from 'react-query';
import { Dispatch, SetStateAction, useContext } from 'react';
import { useSearchParams } from 'next/navigation';

import ListViewByStatus from './ListViewByStatus';

import {
  Columns,
  ColumnType,
  CreationDataTask,
  Task,
  TaskErrorPerson,
  TaskRequest,
} from '@interfaces/task';
import { ResponseError } from '@interfaces/response';

import { GlobalStateContext } from '@providers/GlobalStateProvider';
import { TaskContext } from '@providers/TaskProvider';
import { StatusTask } from '@constants/enums';

interface CardListViewProps {
  creationDataTaskData?: CreationDataTask;
  numberPagesData: {
    id: string;
    count: number;
    numPages: number;
    hasMores: boolean;
  }[];
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
  addTask: (columnId: string) => void;
  disableDraggable?: boolean;
  columnsKanbanData?: Columns;
  setColumnsKanbanData: Dispatch<SetStateAction<Columns | undefined>>;
  pinItemToTop: (itemId: string | number) => void;
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
  orderTaskSave: Task[];
}
const CardListView = ({
  columnsKanbanData,
  setColumnsKanbanData,
  numberPagesData,
  handleActionEditTask,
  handleConfirmCopyTask,
  handleUpdateItemInline,
  editTask,
  addTask,
  pinItemToTop,
  creationDataTaskData,
  setNumberPagesData,
  orderTaskSave,
}: CardListViewProps) => {
  const { expanded } = useContext(GlobalStateContext);
  const searchParams = useSearchParams();
  const { memberSelected, orderingRequest, searchValue } =
    useContext(TaskContext);
  const userIdTask = searchParams.get('user');

  const handlePinItem = (id: string) => {
    pinItemToTop(id);
  };

  return (
    <>
      {columnsKanbanData &&
        Object.values(columnsKanbanData) &&
        Object.values(columnsKanbanData)
          .map((_, i, arr) => arr[(i + arr.length - 1) % arr.length])
          .map((listByStatus: ColumnType, index) => {
            const hasNext = numberPagesData.find(
              (page) => page.id === `${listByStatus.id}`,
            )?.hasMores;
            const matchingTaskIds = orderTaskSave
              .filter((task) => task.status?.id == listByStatus.id)
              .map((task) => task.id);
            const count = numberPagesData.find(
              (page) => page.id === `${listByStatus.id}`,
            )?.count;

            return (
              <div
                className={`${expanded ? 'w-[800px]' : 'w-[950px]'}`}
                key={index}>
                {listByStatus.title == StatusTask.NOT_STARTED && (
                  <div className="flex text-[#77858F] text-[12px] mb-4">
                    <p className="w-[59%] border-r-2">タスク名</p>
                    <p className="w-[15%] border-r-2 text-center">締切</p>
                    <p className="w-[8%] border-r-2 text-center">重要</p>
                    <p className="px-5 border-r-2">ステータス</p>
                  </div>
                )}
                <ListViewByStatus
                  listId={listByStatus.id}
                  listItems={listByStatus.items}
                  listTitle={listByStatus.title}
                  hasNext={hasNext}
                  handlePinItem={handlePinItem}
                  creationDataTaskData={creationDataTaskData}
                  handleActionEditTask={handleActionEditTask}
                  handleConfirmCopyTask={handleConfirmCopyTask}
                  handleUpdateItemInline={handleUpdateItemInline}
                  editTask={editTask}
                  addTask={addTask}
                  totalCount={count || 0}
                  setColumnsKanbanData={setColumnsKanbanData}
                  columnsKanbanData={columnsKanbanData}
                  setNumberPagesData={setNumberPagesData}
                  orderingRequest={orderingRequest}
                  matchingTaskIds={matchingTaskIds}
                  searchValue={searchValue}
                  userId={
                    `${memberSelected}` || `${userIdTask ? userIdTask : ''}`
                  }
                />
              </div>
            );
          })}
    </>
  );
};

export default CardListView;
