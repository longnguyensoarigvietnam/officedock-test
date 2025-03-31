import { useSearchParams } from 'next/navigation';
import { Draggable, Droppable } from '@hello-pangea/dnd';
import { Dispatch, SetStateAction, useContext } from 'react';
import { UseMutateFunction, useMutation } from 'react-query';

import ColumnsSkeleton from '@components/skeleton/ColumnSkeleton';
import Column from './Column';

import { ERROR_EXTEND_COLUMN } from '@constants/message';
import { KanbanType } from '@constants/enums';
import { TaskContext } from '@providers/TaskProvider';
import { GlobalStateContext } from '@providers/GlobalStateProvider';
import {
  Columns,
  CreationDataTask,
  Task,
  TaskErrorPerson,
  TaskRequest,
} from '@interfaces/task';
import { ResponseError } from '@interfaces/response';
import { OptionDropdownType } from '@interfaces/common';
import api from '@base/api';
import { apiRouters } from '@constants/routers';
import { useToast } from '@providers/ToastProvider';

interface BoardKanbanProps {
  columnsKanbanData: Columns | undefined;
  isLoadingDataTask: boolean;
  showFrequentlyTasks: boolean;
  numberPagesData: {
    id: string;
    count: number;
    numPages: number;
    hasMores: boolean;
  }[];
  orderTaskSave: Task[];
  creationDataTaskData: CreationDataTask | undefined;
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
  editTaskInline: UseMutateFunction<
    Task,
    ResponseError<{
      detail: TaskErrorPerson;
    }>,
    TaskRequest,
    unknown
  >;
  handleActionEditTask: (id: number, type?: string) => void
  handleConfirmCopyTask: (id: number) => void;
  handleUpdateItemInline: (data: Task) => void;
  pinItemToTop: (itemId: string | number) => void;
  addTask: (id: string) => void;
  selectedOptionZoom: OptionDropdownType;
}

const BoardKanban = ({
  columnsKanbanData,
  isLoadingDataTask,
  showFrequentlyTasks,
  numberPagesData,
  orderTaskSave,
  creationDataTaskData,
  setColumnsKanbanData,
  setNumberPagesData,
  editTaskInline,
  handleActionEditTask,
  handleConfirmCopyTask,
  handleUpdateItemInline,
  pinItemToTop,
  addTask,
  selectedOptionZoom,
}: BoardKanbanProps) => {
  const { showToast } = useToast();

  const searchParams = useSearchParams();

  const userIdTask = searchParams.get('user');

  const {
    columnWidth,
    memberSelected,
    tagSelected,
    orderingRequest,
    searchValue,
  } = useContext(TaskContext);
  const { isExtendCalendar } = useContext(GlobalStateContext);

  const filteredData =
    columnsKanbanData &&
    Object.values(columnsKanbanData) &&
    Object.values(columnsKanbanData).map(
      (_, i, arr) => arr[(i + arr.length - 1) % arr.length],
    );

  const handleExtendColumn = async (tabVisibility: Record<string, boolean>) => {
    return null;
    // TODO: Update save extend
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

  return columnsKanbanData && !isLoadingDataTask ? (
    <Droppable
      droppableId="columns"
      direction="horizontal"
      type={KanbanType.COLUMN}>
      {(provided) => (
        <div
          {...provided.droppableProps}
          ref={provided.innerRef}
          className="w-full">
          <div
            style={{
              gap: `${(columnWidth / 247) * 12}px`,
            }}
            className={`flex w-fit relative ${showFrequentlyTasks ? 'h-[calc(100vh_-_270px)]' : showFrequentlyTasks ? 'h-[calc(100vh_-_330px)]' : `${isExtendCalendar ? 'h-[calc(100vh_-_210px)]' : 'h-[calc(100vh_-_210px)]'}`} overflow-y-hidden`}>
            {filteredData &&
              Object.entries(filteredData).map(([columnId, column], index) => {
                const count = numberPagesData.find(
                  (page) => page.id === `${column.id}`,
                )?.count;
                const hasNext = numberPagesData.find(
                  (page) => page.id === `${column.id}`,
                )?.hasMores;
                const matchingTaskIds = orderTaskSave
                  .filter((task) => task.status?.id === column.id)
                  .map((task) => task.id);
                return (
                  <Draggable
                    draggableId={`${column.id}`}
                    index={index}
                    key={columnId}
                    // Remove below prop to enable drag column
                    isDragDisabled={true}>
                    {(provided, snapshot) => (
                      <div
                        className={` overflow-hidden flex flex-col flex-grow ${snapshot.isDragging && 'opacity-25'}`}>
                        <Column
                          columnId={`${column.id}`}
                          title={column.title}
                          items={column.items}
                          index={index}
                          showFrequentlyTasks={showFrequentlyTasks}
                          totalCount={count || 0}
                          userId={
                            `${memberSelected}` ||
                            `${userIdTask ? userIdTask : ''}`
                          }
                          hasNext={hasNext}
                          tagSelected={tagSelected}
                          orderingRequest={orderingRequest}
                          matchingTaskIds={matchingTaskIds}
                          searchValue={searchValue}
                          columnsKanbanData={columnsKanbanData}
                          creationDataTaskData={creationDataTaskData}
                          editTask={editTaskInline}
                          handleActionEditTask={handleActionEditTask}
                          handleConfirmCopyTask={handleConfirmCopyTask}
                          handleUpdateItemInline={handleUpdateItemInline}
                          setColumnsKanbanData={setColumnsKanbanData}
                          pinItemToTop={pinItemToTop}
                          addTask={addTask}
                          setNumberPagesData={setNumberPagesData}
                          selectedOptionZoom={selectedOptionZoom}
                          saveExtendColumn={(data: Record<string, boolean>) => {
                            saveExtendColumn(data);
                          }}
                        />
                      </div>
                    )}
                  </Draggable>
                );
              })}
          </div>
          {provided.placeholder}
        </div>
      )}
    </Droppable>
  ) : (
    <div className="h-[calc(100vh_-_257px)] w-full">
      <ColumnsSkeleton numberOfColumns={5} />
    </div>
  );
};

export default BoardKanban;
