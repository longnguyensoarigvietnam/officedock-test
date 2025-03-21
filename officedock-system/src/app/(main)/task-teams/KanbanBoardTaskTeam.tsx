'use client';
import {
  Popover,
  PopoverButton,
  PopoverPanel,
  Transition,
} from '@headlessui/react';
import React, { Fragment, useContext, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { DragDropContext, DropResult } from '@hello-pangea/dnd';

import Button from '@components/common/Button';
import ImageRound from '@components/common/ImageRound';
import AvatarIconWithDynamicColor from '@components/common/AvatarIcon';
import InputSearch from '@components/common/InputSearch';
import ActionFilterTaskTeam from '@components/modals/ActionFilterTeamTask';
import UserColumnTeam from '@components/kanbanTeam/UserColumnTeam';

import useCreationDataTask from '@hooks/useCreationDataTask';
import useCreationDataStatisticTeam from '@hooks/useCreationDataStatisticTeam';
import useTaskBoardTeam from '@hooks/useTaskBoardTeam';

import { FilterTypeKanban } from '@constants/enums';
import { getRandomColor, transformDataTeamTask } from '@utils';
import { OptionDropdownType } from '@interfaces/common';
import { TransformedStatuses, TransformedUser } from '@interfaces/task';
import { TaskTeamStateContext } from '@providers/TaskTeamProvider';
import Dropdown from '@components/common/Dropdown';
import ColumnsSkeleton from '@components/skeleton/ColumnSkeleton';

const KanbanBoardTaskTeam = () => {
  // Context
  const {
    isLoadingDataTask,
    selectedOptionZoom,
    setSelectedOptionZoom,
    setColumnWidth,
    setCreationDataTaskData,
    orderingOptions,
    setOrderingOptions,
  } = useContext(TaskTeamStateContext);

  // State
  const searchParams = useSearchParams();
  const organizationId = searchParams.get('organization');
  const [isOpenModalFilter, setIsOpenModalFilter] = useState(false);

  // Team task list

  const [listDataKanbanTeam, setListDataKanbanTeam] = useState<
    TransformedUser[]
  >([]);

  const [dataOrderRing, setDataOrderRing] = useState<string>('');

  // State
  // Member
  const [listMemberTeam, setListMemberTeam] = useState<
    {
      id: number;
      fullName: string;
      color: string;
    }[]
  >([]);
  const [selectedOrganization, setSelectedOrganization] =
    useState<OptionDropdownType | null>({
      label: '',
      value: '',
    });

  useCreationDataStatisticTeam({
    organization_id: organizationId || '',
    isTeam: true,
    onSuccess: (data) => {
      if (!data) return;
      if (data.organization) {
        setSelectedOrganization({
          label: data.organization.name,
          value: data.organization.id,
        });
      }

      setListMemberTeam(
        data.members.map((member) => ({
          id: member.id,
          fullName: member.fullName,
          color: getRandomColor(),
        })),
      );
    },
  });

  const { creationDataTaskData } = useCreationDataTask({
    onSuccess: (data) => {
      setCreationDataTaskData(data);
    },
  });

  // get list data team
  useTaskBoardTeam({
    organization_id: organizationId as string,
    onSuccess: (data) => {
      if (data.results) {
        const newData = transformDataTeamTask(data.results);

        setListDataKanbanTeam(newData);
      }
    },
  });

  // Show data filter
  const allLabels = orderingOptions
    ? [
        ...orderingOptions.organization_ids.map((item) => ({
          ...item,
          category: 'organization_ids',
        })),
        ...orderingOptions.tag_ids.map((item) => ({
          ...item,
          category: 'tag_ids',
        })),
        ...orderingOptions.category_ids.map((item) => ({
          ...item,
          category: 'category_ids',
        })),
      ]
    : [];

  const firstThree = allLabels.slice(0, 3);

  const remainingCount = allLabels.length - firstThree.length;

  // Handle remove option filter

  const handleRemoveItem = (
    category: 'organization_ids' | 'tag_ids' | 'category_ids',
    value: string | number,
  ) => {
    setOrderingOptions((prevData) => {
      if (!prevData) return prevData;

      return {
        ...prevData,
        [category]:
          prevData[category]?.filter((item) => item.value !== value) || [],
      };
    });
  };

  // Handle Show avatar user
  const getParticipantAvatars = (
    participants: {
      id: number;
      fullName: string;
      color: string;
    }[],
  ) => {
    const slicedParticipants = participants.slice(0, 6);
    const remainingCount =
      participants.length > 3 ? participants.length - 6 : 0;

    return (
      <>
        {slicedParticipants.map((item) => {
          return (
            <div
              className="ml-[-10px] border-[1px] border-white rounded-full h-[32px] w-[32px]"
              key={item.id}>
              {AvatarIconWithDynamicColor({
                color: item.color,
                size: 33,
                customClassName: '!mt-0',
              })}
            </div>
          );
        })}
        {remainingCount > 0 && (
          <div className="ml-[-10px] flex items-center justify-center bg-[#97A9B2] border-[1px] border-white rounded-full text-sm text-white w-[32px] h-[32px]">
            +{remainingCount}
          </div>
        )}
      </>
    );
  };

  // Handle Drag & drop
  const onDragEnd = (result: DropResult) => {
    const { source, destination } = result;
    if (!destination) return;

    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) {
      return;
    }

    const [sourceUserId, sourceStatus] = source.droppableId.split('-');
    const [destUserId, destStatus] = destination.droppableId.split('-');

    if (!sourceUserId || !sourceStatus || !destUserId || !destStatus) return;

    setListDataKanbanTeam((prevUsers) => {
      const newUsers = prevUsers.map((user) => ({
        ...user,
        statuses: { ...user.statuses },
      }));

      const sourceUser = newUsers.find((user) => user.id === sourceUserId);
      const destUser = newUsers.find((user) => user.id === destUserId);

      if (!sourceUser || !destUser) return prevUsers;

      // If dragging in the same state -> reorder the array only
      if (sourceUser === destUser && sourceStatus === destStatus) {
        const tasks = [
          ...sourceUser.statuses[sourceStatus as keyof TransformedStatuses],
        ];
        const [movedTask] = tasks.splice(source.index, 1);
        tasks.splice(destination.index, 0, movedTask);
        sourceUser.statuses[sourceStatus as keyof TransformedStatuses] = tasks;
        return newUsers;
      }

      // If you drag to another status or to another user
      const sourceTasks = [
        ...sourceUser.statuses[sourceStatus as keyof TransformedStatuses],
      ];
      const destTasks = [
        ...destUser.statuses[destStatus as keyof TransformedStatuses],
      ];

      // Get the task to move
      const [movedTask] = sourceTasks.splice(source.index, 1);

      // Check if the task already exists in destTasks (avoid duplicate errors)
      if (!destTasks.some((task) => task.id === movedTask.id)) {
        destTasks.splice(destination.index, 0, movedTask);
      }

      // Update status list
      sourceUser.statuses[sourceStatus as keyof TransformedStatuses] =
        sourceTasks;
      destUser.statuses[destStatus as keyof TransformedStatuses] = destTasks;

      return newUsers;
    });
  };

  // Calculate width kanban
  const calculateWidth = (baseWidth: number, percentage: number): number => {
    return (baseWidth * percentage) / 100;
  };

  return (
    <>
      <div className="pt-[30px] pr-10  font-medium  w-full">
        <div className="mb-[30px] flex items-center justify-between">
          <div className="flex items-center gap-5 ">
            <div className="rounded-full w-[34px] h-[34px]  flex items-center justify-center overflow-hidden">
              <ImageRound
                className="w-[34px] h-[34px] rounded-full"
                src="/icons/statistic-team.svg"
                border="full"
                name="Multi users"
              />
            </div>
            <span className="text-[26px] font-medium relative top-[-2px] max-w-[350px] truncate">
              {selectedOrganization?.label}
            </span>
            <span className="text-[26px] font-medium relative top-[-2px]">
              チーム集計
            </span>
            <div className="flex justify-center items-center gap-2 ">
              <Button
                variant={'primary'}
                className={`!py-0 !px-0 font-bold w-[80px] h-7 
              !rounded-[20px] text-xs  `}>
                カテゴリー
              </Button>
              <Button
                onClick={() => {}}
                variant={'outline'}
                className={`!text-[#77858F] !bg-transparent !border-[#77858F] !py-0 !px-0 font-bold w-[80px] h-7 !rounded-[20px] text-xs`}>
                タグ
              </Button>
            </div>{' '}
          </div>
          <div className="flex items-center">
            {listMemberTeam.length > 0 && getParticipantAvatars(listMemberTeam)}
          </div>
        </div>
        <div className={`flex gap-7 mb-6 w-fit min-w-[300px]`}>
          <div className="flex items-center gap-2">
            <ImageRound
              src="/icons/sort-task.svg"
              name="Sort icon"
              className="w-[18px] h-[14px]"
            />
            <>
              <Button
                disabled={isLoadingDataTask}
                onClick={() => {
                  if (dataOrderRing !== FilterTypeKanban.DEADLINE) {
                    setDataOrderRing(FilterTypeKanban.DEADLINE);
                  }
                }}
                variant={
                  isLoadingDataTask
                    ? 'outline'
                    : dataOrderRing === FilterTypeKanban.DEADLINE
                      ? 'primary'
                      : 'outline'
                }
                className={`${dataOrderRing === FilterTypeKanban.DEADLINE && !isLoadingDataTask ? '' : '!border-[#A7B7C2] !text-[#A7B7C2] !bg-[#EBF1F7]  '}  h-6 w-[70px] !px-0 !py-0 text-xs font-bold rounded-[20px]`}>
                締切期間
              </Button>
              <Button
                disabled={isLoadingDataTask}
                onClick={() => {
                  if (dataOrderRing !== FilterTypeKanban.IMPORTANT) {
                    setDataOrderRing(FilterTypeKanban.IMPORTANT);
                  }
                }}
                variant={
                  isLoadingDataTask
                    ? 'outline'
                    : dataOrderRing === FilterTypeKanban.IMPORTANT
                      ? 'primary'
                      : 'outline'
                }
                className={`${dataOrderRing === FilterTypeKanban.IMPORTANT && !isLoadingDataTask ? '' : '!border-[#A7B7C2] !text-[#A7B7C2]  !bg-[#EBF1F7] '} h-6 w-[70px] !px-0 !py-0 text-xs font-bold rounded-[20px]   `}>
                重要
              </Button>
            </>

            {/* Filter option modal */}
            <Popover className="relative">
              {() => (
                <>
                  <div className="flex items-center gap-2">
                    <PopoverButton
                      onClick={() => setIsOpenModalFilter(!isOpenModalFilter)}
                      className="flex items-center gap-2 text-xs font-medium text-[#77858F] focus-visible:outline-none">
                      <ImageRound
                        src="/icons/filter.svg"
                        name="Filter icon"
                        className="w-[14px] h-[14px] ml-2"
                      />
                    </PopoverButton>
                    {allLabels.length > 3 ? (
                      <>
                        {firstThree.slice(0, 3).map((item, index) => (
                          <div
                            key={index}
                            onClick={() =>
                              handleRemoveItem(
                                item.category as
                                  | 'organization_ids'
                                  | 'tag_ids'
                                  | 'category_ids',
                                item.value,
                              )
                            }
                            className="w-[105px] h-6 px-[10px] justify-between gap-[6px] text-xs text-black font-medium flex items-center truncate rounded-[20px] bg-[#EBF1F7]">
                            <span className="w-[71px] truncate">
                              {item.label}
                            </span>
                            <ImageRound
                              src={`/icons/close.svg`}
                              name="close"
                              className="w-fit h-fit cursor-pointer"
                            />
                          </div>
                        ))}
                        <p className="px-[10px] h-6 flex items-center justify-center rounded-[20px] bg-[#EBF1F7] text-black text-xs font-medium">
                          +{remainingCount}
                        </p>
                      </>
                    ) : (
                      <>
                        {allLabels.map((item, index) => (
                          <div
                            key={index}
                            onClick={() => {
                              handleRemoveItem(
                                item.category as
                                  | 'organization_ids'
                                  | 'tag_ids'
                                  | 'category_ids',
                                item.value,
                              );
                            }}
                            className="w-[105px] h-6 px-[10px] justify-between gap-[6px] text-xs text-black font-medium flex items-center truncate rounded-[20px] bg-[#EBF1F7]">
                            <span className="w-[71px] truncate">
                              {item.label}
                            </span>
                            <ImageRound
                              src={`/icons/close.svg`}
                              name="close"
                              className="w-fit h-fit cursor-pointer"
                            />
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                  <Transition
                    as={Fragment}
                    show={isOpenModalFilter}
                    enter="transition ease-out duration-200"
                    enterFrom="opacity-0 translate-y-1"
                    enterTo="opacity-100 translate-y-0"
                    leave="transition ease-in duration-150"
                    leaveFrom="opacity-100 translate-y-0"
                    leaveTo="opacity-0 translate-y-1">
                    <PopoverPanel className="absolute left-0 top-5 z-[1] w-[400px] transform">
                      <ActionFilterTaskTeam
                        creationDataTaskData={creationDataTaskData}
                        handleClose={() => setIsOpenModalFilter(false)}
                      />
                    </PopoverPanel>
                  </Transition>
                </>
              )}
            </Popover>

            <InputSearch
              className="w-[300px] h-[34px] py-0 bg-white !rounded-[20px]"
              inputClassName="h-[34px] bg-white border-none !rounded-[20px] text-sm"
              iconClassName="w-[14px] h-[14px]"
              placeholder="タスク、キーワードを検索"
            />
          </div>
        </div>

        {/* BOARD DATA */}
        <div className="h-fit overflow-y-auto mt-6 w-full overflow-x-auto">
          {!isLoadingDataTask ? (
            <DragDropContext onDragEnd={onDragEnd}>
              <div className="flex gap-4 overflow-x-auto w-[calc(100vw_-_270px)]">
                {listDataKanbanTeam.map((user) => (
                  <UserColumnTeam key={user.id} user={user} />
                ))}
              </div>
            </DragDropContext>
          ) : (
            <div className="h-[calc(100vh_-_257px)] w-full">
              <ColumnsSkeleton numberOfColumns={4} />
            </div>
          )}
        </div>
      </div>

      {/* Option select value zoom */}
      <div className="fixed flex items-center gap-2 bottom-5 right-20 z-20 ">
        <div className="w-[80px] !h-[30px]">
          <Dropdown
            labelOptionClass="!ml-0 !pr-0 !pl-0 flex justify-center w-full "
            className="text-sm h-8 !py-0 !pl-0 !pr-0 !px-[14px] !rounded-lg"
            classActive="!pr-[10px] !ml-0 w-full text-center left-[52px]"
            classNameOption="top-[-150px] !px-0 text-sm"
            selectedOption={selectedOptionZoom}
            options={[
              {
                label: '100%',
                value: 100,
              },
              {
                label: '90%',
                value: 90,
              },
              {
                label: '75%',
                value: 75,
              },
              {
                label: '50%',
                value: 50,
              },
              {
                label: '25%',
                value: 25,
              },
            ]}
            onChange={(selectedOption) => {
              setSelectedOptionZoom(selectedOption);
              if (selectedOption.value === 25) {
                setColumnWidth(calculateWidth(247, 50));
              } else {
                setColumnWidth(
                  calculateWidth(247, selectedOption.value as number),
                );
              }
            }}
          />
        </div>
      </div>
    </>
  );
};

export default KanbanBoardTaskTeam;
