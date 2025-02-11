import { Row } from '@tanstack/react-table';
import React, { Fragment, useCallback, useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import { useMutation } from 'react-query';
import {
  Popover,
  PopoverButton,
  PopoverPanel,
  Transition,
} from '@headlessui/react';
import {
  DragDropContext,
  Draggable,
  Droppable,
  DropResult,
} from '@hello-pangea/dnd';
import { useSession } from 'next-auth/react';

import Checkbox from '@components/common/Checkbox';
import ImageRound from '@components/common/ImageRound';

import { apiRouters } from '@constants/routers';

import { dataTaskDailyTable } from '@interfaces/statistic';
import { TodoItem } from '@interfaces/task';
import { OptionDropdownType } from '@interfaces/common';
import api from '@base/api';
import { TagId } from '@interfaces/tag';
import { hasPermissionInArray } from '@utils';
import { PermissionsSystem } from '@constants/enums';

interface DataActionType {
  row: Row<dataTaskDailyTable>;
  dataTagsList: OptionDropdownType[];
  setDataTaskDailyList: React.Dispatch<
    React.SetStateAction<dataTaskDailyTable[]>
  >;
}

const ActionDetailDaily = ({
  row,
  dataTagsList,
  setDataTaskDailyList,
}: DataActionType) => {
  const { data: session } = useSession();

  const [todoList, setTodoList] = useState<TodoItem[]>([]);

  const [selectedItemsTag, setSelectedItemsTag] = useState<
    {
      id: number;
      name: string;
    }[]
  >([]);

  useEffect(() => {
    if (row) {
      if (row.original.todoList) {
        const newTodoList = row.original.todoList.map((item) => {
          return {
            ...item,
            isChecked: item.checkedAt ? true : false,
          };
        });
        setTodoList(newTodoList);
      }
      if (row.original.tags) {
        setSelectedItemsTag(row.original.tags);
      }
    }
  }, [row]);

  // Check item todo list has checked
  const isAnyChecked = (todoList?: TodoItem[]): boolean => {
    return todoList?.some((item) => item.checkedAt || item.isChecked) ?? false;
  };

  // API edit data task in daily
  const handleEditTaskInline = async (dataTask: {
    id: string;
    todoList?: TodoItem[];
    tagIds?: TagId[];
  }) => {
    const { data } = await api.patch(
      apiRouters.TASK_DETAIL(`${dataTask.id}`),
      dataTask,
    );
    return data;
  };
  const { mutate: editTaskDailyInline } = useMutation(
    'postEditDailyTaskInline',
    handleEditTaskInline,
    {
      onSuccess: async () => {},
      onError: () => {},
      onSettled: () => {},
    },
  );

  // Drag & drop item todo list
  const handleOnDragEnd = (result: DropResult): void => {
    if (!result.destination) return;

    const items = Array.from(todoList);

    const [reorderedItem] = items.splice(result.source.index, 1);

    items.splice(result.destination.index, 0, reorderedItem);
    const updatedTodos = items.map((task, idx) => ({
      ...task,
      index: idx + 1,
    }));

    setTodoList(updatedTodos);
    editTaskDailyInline({
      id: row.original.id,
      todoList: updatedTodos,
    });
  };

  // Handle checked item todo
  const handleCheck = (index: number) => {
    const updatedTodos = todoList.map((todo, i) =>
      i === index
        ? {
            ...todo,
            isChecked: !todo.isChecked,
            checkedAt: !todo.isChecked === true ? `${new Date()}` : null,
          }
        : todo,
    );
    setTodoList(updatedTodos);
    editTaskDailyInline({
      id: row.original.id,
      todoList: updatedTodos,
    });
  };

  const [isOpenTodo, setIsOpenTodo] = useState(false);
  const [prevOpenState, setPrevOpenState] = useState(false);

  const [isOpenTag, setIsOpenTodoTag] = useState(false);
  const [prevOpenStateTag, setPrevOpenStateTag] = useState(false);

  // Update data in daily
  const handleUpdateDataTodoList = useCallback(() => {
    setDataTaskDailyList((prevData) =>
      prevData.map((task) => {
        if (task.id === row.original.id) {
          return {
            ...task,
            todoList: todoList,
            children: task.children?.map((child) => ({
              ...child,
              todoList: todoList,
            })),
          };
        }
        return task;
      }),
    );
  }, [row.original.id, setDataTaskDailyList, todoList]);

  const handleUpdateDataTags = useCallback(() => {
    setDataTaskDailyList((prevData) =>
      prevData.map((task) => {
        if (task.id === row.original.id) {
          return {
            ...task,
            tags: selectedItemsTag,
            children: task.children?.map((child) => ({
              ...child,
              tags: selectedItemsTag,
            })),
          };
        }
        return task;
      }),
    );
  }, [row.original.id, selectedItemsTag, setDataTaskDailyList]);

  useEffect(() => {
    if (prevOpenState && !isOpenTodo) {
      handleUpdateDataTodoList();
    }
    setPrevOpenState(isOpenTodo);
  }, [isOpenTodo, prevOpenState, handleUpdateDataTodoList]);

  useEffect(() => {
    if (prevOpenStateTag && !isOpenTag) {
      handleUpdateDataTags();
    }
    setPrevOpenStateTag(isOpenTag);
  }, [handleUpdateDataTags, isOpenTag, prevOpenStateTag]);

  return (
    <div className="flex gap-[10px] w-[52px] ">
      <div>
        <Popover className="relative">
          {({ open }) => {
            setIsOpenTodo(open);
            return (
              <>
                <div className="flex gap-2 items-center">
                  <PopoverButton
                    disabled={todoList.length > 0 ? false : true}
                    className={`flex w-full  items-center rounded-full focus:outline-none
                ${open ? 'text-primary ' : ''}
                `}>
                    <ImageRound
                      className={`w-4 h-4   ${todoList.length > 0 ? (isAnyChecked(todoList) ? ' cursor-pointer' : '') : ' cursor-not-allowed'} `}
                      src={`/icons/${todoList.length > 0 ? (isAnyChecked(todoList) ? 'checked-active.svg' : 'checked-no-active.svg') : 'checked-no-active.svg'}`}
                      name="icon tag"
                    />
                  </PopoverButton>
                </div>
                <Transition
                  as={Fragment}
                  enter="transition ease-out duration-200"
                  enterFrom="opacity-0 translate-y-1"
                  enterTo="opacity-100 translate-y-0"
                  leave="transition ease-in duration-150"
                  leaveFrom="opacity-100 translate-y-0"
                  leaveTo="opacity-0 translate-y-1">
                  <PopoverPanel className="absolute left-0 z-10 min-w-[120px] max-w-120px] transform">
                    <div className="overflow-hidden bg-white  rounded-md  shadow-common">
                      <div className="relative flex min-w-[120px]   flex-col p-[14px]  gap-[10px] text-gray-700">
                        <DragDropContext onDragEnd={handleOnDragEnd}>
                          <Droppable droppableId="todo-list">
                            {(provided) => (
                              <div>
                                <p className="text-xs font-medium text-[#77858F] mb-2">
                                  To Do リスト
                                </p>
                                <ul
                                  className="flex flex-col gap-4"
                                  {...provided.droppableProps}
                                  ref={provided.innerRef}>
                                  {todoList.map((todo, index) => (
                                    <Draggable
                                      key={todo.id || todo.customId}
                                      draggableId={`${todo.id || todo.customId}`}
                                      index={index}>
                                      {(provided, snapshot) => {
                                        const draggableElement = (
                                          <div
                                            {...provided.draggableProps}
                                            {...provided.dragHandleProps}
                                            ref={provided.innerRef}
                                            className="flex gap-[6px] items-start">
                                            <div className="w-4 h-6">
                                              <Checkbox
                                                disable={
                                                  session?.user.permissions &&
                                                  !hasPermissionInArray(
                                                    session?.user.permissions,
                                                    PermissionsSystem.STATISTIC_UPDATE,
                                                  )
                                                }
                                                isChecked={todo.isChecked}
                                                onChange={() =>
                                                  handleCheck(index)
                                                }
                                                className="!rounded-full"
                                                classSize="!rounded-full"
                                              />
                                            </div>
                                            <div className="break-all text-left w-fit max-w-[100px]">
                                              {todo.content}
                                            </div>
                                          </div>
                                        );
                                        return snapshot.isDragging
                                          ? ReactDOM.createPortal(
                                              draggableElement,
                                              document.body,
                                            )
                                          : draggableElement;
                                      }}
                                    </Draggable>
                                  ))}
                                  {provided.placeholder}
                                </ul>
                              </div>
                            )}
                          </Droppable>
                        </DragDropContext>
                      </div>
                    </div>
                  </PopoverPanel>
                </Transition>
              </>
            );
          }}
        </Popover>
      </div>
      <div>
        <Popover className="relative">
          {({ open }) => {
            setIsOpenTodoTag(open);
            return (
              <>
                <div className="flex gap-2 items-center">
                  <PopoverButton
                    className={`flex w-full  items-center rounded-full focus:outline-none
                ${open ? 'text-primary ' : ''}
                `}>
                    <ImageRound
                      className={`w-4 h-4    `}
                      src={`/icons/${row.original.tags.length > 0 ? 'ticket-active.svg' : 'ticket-no-active.svg'}`}
                      name="icon tag"
                    />
                  </PopoverButton>
                </div>
                <Transition
                  as={Fragment}
                  enter="transition ease-out duration-200"
                  enterFrom="opacity-0 translate-y-1"
                  enterTo="opacity-100 translate-y-0"
                  leave="transition ease-in duration-150"
                  leaveFrom="opacity-100 translate-y-0"
                  leaveTo="opacity-0 translate-y-1">
                  <PopoverPanel className="absolute left-0 z-10 w-[144px] transform shadow-common">
                    <div className="overflow-hidden bg-white rounded-lg shadow-common">
                      <div className="relative flex w-[144px] rounded-md overflow-y-auto min-h-[144px] max-h-[144px] flex-col p-[14px]  gap-[10px] text-gray-700">
                        <p className="text-xs font-medium text-[#77858F]">
                          タグ
                        </p>
                        {dataTagsList.map((item) => {
                          return (
                            <div
                              key={item.value}
                              className="flex gap-2 items-start">
                              <div className="break-all text-left w-fit px-[10px] py-2 bg-[#EBF2F7] rounded-[20px]">
                                {item.label}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </PopoverPanel>
                </Transition>
              </>
            );
          }}
        </Popover>
      </div>
    </div>
  );
};

export default ActionDetailDaily;
