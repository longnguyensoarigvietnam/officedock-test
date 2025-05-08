import { Row } from '@tanstack/react-table';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useMutation } from 'react-query';
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
import { PermissionsSystem } from '@constants/enums';

import { dataTaskDailyTable } from '@interfaces/statistic';
import { TodoItem } from '@interfaces/task';
import { OptionDropdownType } from '@interfaces/common';
import { TagId } from '@interfaces/tag';

import api from '@base/api';
import { hasPermissionInArray } from '@utils';

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

  // Display tag options list
  const tagIconRef = useRef<HTMLDivElement | null>(null);
  const tagOptionListRef = useRef<HTMLDivElement | null>(null);
  const [tagOptionsPosition, setTagOptionsPosition] = useState<{
    top: number;
    left: number;
  }>({
    top: -9999,
    left: -9999,
  });
  const [isTagOptionsReady, setIsTagOptionsReady] = useState(false);

  // Display todo options list
  const todoIconRef = useRef<HTMLDivElement | null>(null);
  const todoOptionListRef = useRef<HTMLDivElement | null>(null);
  const [todoOptionsPosition, setTodoOptionsPosition] = useState<{
    top: number;
    left: number;
  }>({
    top: -9999,
    left: -9999,
  });
  const [isTodoOptionsReady, setIsTodoOptionsReady] = useState(false);

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

  const handleToggleTag = () => {
    if (!tagIconRef.current) return;

    const buttonRect = tagIconRef.current.getBoundingClientRect();
    setIsOpenTodoTag((prev) => !prev);
    setIsTagOptionsReady(false);

    requestAnimationFrame(() => {
      if (tagOptionListRef.current) {
        const dropdownHeight = tagOptionListRef.current.offsetHeight;
        const viewportHeight = window.innerHeight;

        const shouldShowAbove =
          buttonRect.bottom + dropdownHeight + 10 > viewportHeight;

        setTagOptionsPosition({
          top: shouldShowAbove
            ? buttonRect.top - dropdownHeight - 10 + window.scrollY
            : buttonRect.bottom + 10 + window.scrollY,
          left: buttonRect.left + window.scrollX,
        });

        setIsTagOptionsReady(true);
      }
    });
  };

  const handleToggleTodo = () => {
    if (!todoIconRef.current || !todoList.length) return;

    const buttonRect = todoIconRef.current.getBoundingClientRect();
    setIsOpenTodo((prev) => !prev);
    setIsTodoOptionsReady(false);

    requestAnimationFrame(() => {
      if (todoOptionListRef.current) {
        const dropdownHeight = todoOptionListRef.current.offsetHeight;
        const viewportHeight = window.innerHeight;

        const shouldShowAbove =
          buttonRect.bottom + dropdownHeight + 10 > viewportHeight;

        setTodoOptionsPosition({
          top: shouldShowAbove
            ? buttonRect.top - dropdownHeight - 10 + window.scrollY
            : buttonRect.bottom + 10 + window.scrollY,
          left: buttonRect.left + window.scrollX,
        });

        setIsTodoOptionsReady(true);
      }
    });
  };

  const renderTagPopoverPanel = () => {
    return (
      <div
        ref={tagOptionListRef}
        className="w-[144px] transform fixed z-50 bg-white rounded-lg shadow-common"
        style={{
          top: tagOptionsPosition.top,
          left: tagOptionsPosition.left,
          opacity: isTagOptionsReady ? 1 : 0,
          visibility: isTagOptionsReady ? 'visible' : 'hidden',
        }}>
        <div className="relative flex w-[144px] rounded-md overflow-y-auto min-h-[144px] max-h-[144px] flex-col p-[14px]  gap-[10px] text-gray-700">
          <p className="text-xs font-medium text-[#77858F]">タグ</p>
          <div className="flex flex-col gap-4 max-h-[200px] overflow-y-auto">
            {dataTagsList.map((item) => (
              <div key={item.value} className="flex gap-2 items-start">
                <div className="break-all text-left w-fit px-[10px] py-2 bg-[#EBF2F7] rounded-[20px]">
                  {item.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderTodoPopoverPanel = () => {
    return (
      <div
        ref={todoOptionListRef}
        className="w-[144px] transform fixed z-50 bg-white rounded-lg shadow-common"
        style={{
          top: todoOptionsPosition.top,
          left: todoOptionsPosition.left,
          opacity: isTodoOptionsReady ? 1 : 0,
          visibility: isTodoOptionsReady ? 'visible' : 'hidden',
        }}>
        <div className="relative flex w-[144px] rounded-md overflow-y-auto min-h-[144px] max-h-[144px] flex-col p-[14px]  gap-[10px] text-gray-700">
          <DragDropContext onDragEnd={handleOnDragEnd}>
            <Droppable droppableId="todo-list">
              {(provided) => (
                <div>
                  <p className="text-xs font-medium text-[#77858F] mb-2">
                    To Do リスト
                  </p>
                  <ul
                    className="flex flex-col gap-4 max-h-[200px] overflow-y-auto"
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
                                  onChange={() => handleCheck(index)}
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
                            ? createPortal(draggableElement, document.body)
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
    );
  };

  return (
    <div className="flex gap-[10px] w-[52px] ">
      {/* Todo icon */}
      <div>
        <div
          ref={todoIconRef}
          onClick={handleToggleTodo}
          className={`flex w-full  items-center rounded-full focus:outline-none
                ${isOpenTodo ? 'text-primary ' : ''} ${!todoList.length && 'hover:cursor-not-allowed'}
                `}>
          <ImageRound
            className={`w-4 h-4   ${todoList.length > 0 ? (isAnyChecked(todoList) ? ' cursor-pointer' : '') : ' cursor-not-allowed'} `}
            src={`/icons/${todoList.length > 0 ? (isAnyChecked(todoList) ? 'checked-active.svg' : 'checked-no-active.svg') : 'checked-no-active.svg'}`}
            name="icon tag"
          />
        </div>

        {isOpenTodo &&
          createPortal(
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setIsOpenTodo(false)}
              />
              {renderTodoPopoverPanel()}
            </>,
            document.body,
          )}
      </div>

      {/* Tag icon */}
      <div>
        <div
          ref={tagIconRef}
          onClick={handleToggleTag}
          className={`flex w-full items-center rounded-full focus:outline-none
            ${isOpenTag ? 'text-primary ' : ''}
          `}>
          <ImageRound
            className="w-4 h-4"
            src={`/icons/${row.original.tags.length > 0 ? 'ticket-active.svg' : 'ticket-no-active.svg'}`}
            name="icon tag"
          />
        </div>

        {isOpenTag &&
          createPortal(
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setIsOpenTodoTag(false)}
              />
              {renderTagPopoverPanel()}
            </>,
            document.body,
          )}
      </div>
    </div>
  );
};

export default ActionDetailDaily;
