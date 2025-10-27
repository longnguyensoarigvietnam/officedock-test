'use client';

import React, { useContext, useEffect, useRef, useState } from 'react';
import ImageRound from '@components/common/ImageRound';
import Button from '@components/common/Button';
import RowSkeleton from '@components/skeleton/RowSkeleton';

import useTaskArchiveList from '@hooks/useGetListTaskArchive';

import { GlobalStateContext } from '@providers/GlobalStateProvider';
import { TaskContext } from '@providers/TaskProvider';

import { formatCompletedAt } from '@utils/date';
import { EventWorkCategory } from '@constants/enums';

interface Props {
  ordering: boolean;
  handleActionEditTask: (id: number, type?: string) => void;
  handleActionDelete: (id: number) => void;
}

const ArchiveTaskBoard = ({
  ordering,
  handleActionEditTask,
  handleActionDelete,
}: Props) => {
  const { expanded } = useContext(GlobalStateContext);
  const { orderingOptions } = useContext(TaskContext);

  const [isClicked, setIsClicked] = useState(false);
  const [extendTask, setExtendTask] = useState(true);
  const {
    archiveTaskList,
    totalTask,
    fetchNextPage,
    hasNextPage,
    isLoadingList,
    isFetchingNextPage,
  } = useTaskArchiveList({
    orderingOptions,
    ordering: ordering ? '-completed_at' : '-archived_at',
  });
  const resultsContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      const archiveTaskContainer = resultsContainerRef.current;
      if (
        archiveTaskContainer &&
        hasNextPage &&
        !isFetchingNextPage &&
        archiveTaskContainer.clientHeight +
          Math.abs(archiveTaskContainer.scrollTop) >=
          archiveTaskContainer.scrollHeight - 10
      ) {
        fetchNextPage();
      }
    };

    const archiveTaskContainer = resultsContainerRef.current;

    if (archiveTaskContainer) {
      archiveTaskContainer.addEventListener('scroll', handleScroll);
    }

    return () => {
      if (archiveTaskContainer) {
        archiveTaskContainer.removeEventListener('scroll', handleScroll);
      }
    };
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  const handleClick = (id: number) => {
    if (isClicked) return;

    setIsClicked(true);
    handleActionEditTask(id);

    setTimeout(() => setIsClicked(false), 2000);
  };

  return (
    <div className={`${expanded ? 'min-w-[720px]' : 'min-w-[793px]'}`}>
      <div className="flex items-center gap-3 mb-3">
        <div className="flex items-center justify-center cursor-pointer hover:bg-[#E3EAED] rounded-full w-[22px] h-[22px]">
          <ImageRound
            src="/icons/extend-column.svg"
            name="Extend column"
            onClick={() => {
              setExtendTask(!extendTask);
            }}
            className={`!w-3 !h-3 hover:cursor-pointer ${
              extendTask ? '-rotate-90' : 'rotate-180'
            }`}
            style={{
              width: `8px`,
              height: `12px`,
            }}
          />
        </div>

        <div className={`bg-[#A7B7C2] w-[2px] h-[20px] right-1.5 top-2`} />

        <p className="font-medium text-[14px]">アーカイブタスク</p>
        <p className="text-[#77858F] text-[14px]">{totalTask || 0}</p>
      </div>
      <div className="flex ml-1 text-[#77858F] font-medium text-[12px] ">
        <p className="w-[46%] border-r-2">タスク名</p>
        <p className="w-[18%] border-r-2 text-start pl-[14px]">完了日</p>
        <p className="w-[25%] border-r-2 text-start pl-[14px]">大カテゴリー</p>
        <p className="px-5 flex-grow"></p>
      </div>
      {extendTask && (
        <div
          ref={resultsContainerRef}
          className={`flex-grow overflow-y-auto rounded-md h-[calc(100vh_-_280px)] min-h-[300px] mt-[6px] overflow-x-hidden scrollbar-gutter-stable `}>
          {isLoadingList && (
            <div>
              <RowSkeleton numberOfRows={5} className="h-[50px]" />
            </div>
          )}
          {!isLoadingList &&
            archiveTaskList?.map((task) => {
              const largeColor =
                task.categories &&
                task.categories.find(
                  (item) => item.type === EventWorkCategory.LARGE,
                )?.color;
              const largeName =
                task.categories &&
                task.categories.find(
                  (item) => item.type === EventWorkCategory.LARGE,
                )?.name;
              return (
                <div
                  key={task.id}
                  style={{
                    boxShadow: '0px 2px 8px 0px #0000001A',
                  }}
                  onClick={() => {
                    handleClick(task.id);
                  }}
                  className={`relative cursor-pointer ml-1 mt-1 group border border-transparent no-show hover:border hover:border-[#BEC9CE]  hover:border-solid   bg-white rounded-[10px] text-xs flex flex-col gap-2 mb-1`}>
                  <div className="flex items-center py-2.5  w-full">
                    <div className="flex items-center gap-4 w-[46.2%] pl-[18px] flex-shrink-0">
                      <div className="flex items-center w-3/4 gap-2">
                        <div
                          className={`w-4 min-w-4 flex items-center justify-center`}>
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{ background: largeColor }}></div>
                        </div>
                        <p className="font-bold text-sm max-w-[calc(100%_-_16px)] break-all line-clamp-3">
                          {task.title}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center flex-grow">
                      <p
                        className={`hover:cursor-pointer  border-x-2 w-[34.2%] px-[14px]`}>
                        {task.completedAt &&
                          formatCompletedAt(task.completedAt)}
                      </p>
                      <div className="w-[47.2%] min-w-[47.2%] max-w-[47.2%]  border-r-2 px-[14px] flex-none break-all line-clamp-3">
                        {largeName || <span className="invisible">_</span>}
                      </div>

                      <div className="flex-grow max-w-20 h-[30px] rounded flex items-center justify-center flex-shrink-0">
                        <Button
                          variant="outline"
                          onClick={(e) => {
                            e.preventDefault();
                            // Prevent event click
                            e.stopPropagation();
                            handleActionDelete(task.id);
                          }}
                          className="w-[56px] !px-0 !py-0 h-[30px]">
                          削除
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          {isFetchingNextPage && (
            <div className="mt-2">
              <RowSkeleton numberOfRows={2} className="h-[50px]" />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ArchiveTaskBoard;
