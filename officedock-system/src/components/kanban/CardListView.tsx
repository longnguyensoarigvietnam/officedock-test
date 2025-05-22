'use client';
import { useMutation } from 'react-query';
import { Dispatch, SetStateAction, useContext } from 'react';
import { useSearchParams } from 'next/navigation';

import ListViewByStatus from './ListViewByStatus';

import {
  Columns,
  ColumnType,
  CreationDataTask,
  DataStatusChangeInline,
  Task,
} from '@interfaces/task';

import { GlobalStateContext } from '@providers/GlobalStateProvider';
import { TaskContext } from '@providers/TaskProvider';

import { StatusTask } from '@constants/enums';
import { apiRouters } from '@constants/routers';
import { ERROR_EXTEND_COLUMN } from '@constants/message';

import api from '@base/api';
import { useToast } from '@providers/ToastProvider';

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
  editTaskInline: (data: DataStatusChangeInline) => void;
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
  editTaskInline,
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
  const { showToast } = useToast();

  const handlePinItem = (id: string) => {
    pinItemToTop(id);
  };

  const handleExtendColumn = async (tabVisibility: Record<string, boolean>) => {
    const { data: response } = await api.post(apiRouters.USER_SETTING, {
      tabVisibility,
    });
    return response;
  };

  const { mutate: saveExtendColumn } = useMutation(
    'saveExtendColumn',
    handleExtendColumn,
    {
      onSuccess: () => {},
      onError: () => {
        showToast({
          variant: 'error',
          description: ERROR_EXTEND_COLUMN,
        });
      },
      onSettled: () => {},
    },
  );

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
                  editTaskInline={editTaskInline}
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
                  saveExtendColumn={(data: Record<string, boolean>) => {
                    saveExtendColumn(data);
                  }}
                />
              </div>
            );
          })}
    </>
  );
};

export default CardListView;
