'use client';

import { createPortal } from 'react-dom';
import React, {
  Fragment,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Popover, PopoverButton } from '@headlessui/react';
import Image from 'next/image';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { useMutation, useQueryClient } from 'react-query';
import { AxiosError } from 'axios';
import '../styles/task-list-statistic.css';

import { Table, TableBody } from '@components/common/Table';
import ImageRound from '@components/common/ImageRound';
import SingleSelect from '@components/common/SingleSelect';

import {
  EventCalendarType,
  EventWorkCategory,
  OrderingDataType,
  ScreenName,
} from '@constants/enums';
import { NO_OPTION_CATEGORY } from '@constants';
import { ERROR_UPDATE_MESSAGE } from '@constants/message';
import { apiRouters } from '@constants/routers';

import { OptionDropdownType } from '@interfaces/common';
import {
  CreationStatisticType,
  DataTaskListStatisticListType,
} from '@interfaces/statistic';
import api from '@base/api';
import { LoadingContext } from '@providers/LoadingProvider';
import { useErrorToast } from '@hooks/useErrorToast';
import { StatisticTeamStateContext } from '@providers/StatisticTeamProvider';

interface ListTaskStatistic {
  id: number;
  name: string;
  duration: string;
  ratio: string;
  categories: OptionDropdownType[];
  tags: OptionDropdownType[];
  organization: number;
  type: string;
}

interface TableChartProps {
  ordering: string;
  totalDuration: string;
  taskList: DataTaskListStatisticListType[];
  listOptionsOrganization: OptionDropdownType[];
  creationDataStatisticData: CreationStatisticType;
  setOrdering: (ord: string) => void;
}

const TagListInfo = ({ tagList }: { tagList: OptionDropdownType[] }) => {
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const [position, setPosition] = useState<{ top: number; left: number }>({
    top: 0,
    left: 0,
  });
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Popover className="relative">
        {({ open }) => (
          <>
            <div className="flex gap-2 items-center">
              <PopoverButton
                ref={buttonRef}
                className={`flex w-full items-center rounded-full focus:outline-none ${
                  open ? 'text-primary' : ''
                }`}
                onClick={() => {
                  if (buttonRef.current) {
                    const rect = buttonRef.current.getBoundingClientRect();
                    setPosition({
                      top: rect.bottom + window.scrollY - 172,
                      left: rect.left + window.scrollX - 100,
                    });
                  }
                  setIsOpen(!isOpen);
                }}>
                <ImageRound
                  className="w-4 h-4"
                  src={`/icons/${tagList.length > 0 ? 'ticket-active.svg' : 'ticket-no-active.svg'}`}
                  name="icon tag"
                />
              </PopoverButton>
            </div>
          </>
        )}
      </Popover>

      {isOpen &&
        position.top &&
        position.left &&
        createPortal(
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />

            <div
              className="absolute z-50 w-[144px] overflow-hidden bg-white rounded-lg shadow-common"
              style={{ top: `${position.top}px`, left: `${position.left}px` }}>
              <div className="relative flex w-[144px] rounded-md overflow-y-auto min-h-[144px] max-h-[144px] flex-col p-[14px] gap-[10px] text-gray-700">
                <p className="text-xs font-medium text-[#77858F] text-left">
                  タグ
                </p>
                {tagList.map((tag) => (
                  <div key={tag.value} className="flex gap-2 items-start">
                    <div className="break-all text-left w-fit px-[10px] text-xs py-2 bg-[#EBF2F7] rounded-[20px]">
                      {tag.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>,
          document.body,
        )}
    </>
  );
};

const TableChart = ({
  ordering,
  totalDuration,
  taskList,
  creationDataStatisticData,
  listOptionsOrganization,
  setOrdering,
}: TableChartProps) => {
  const { setIsLoading } = useContext(LoadingContext);
  const showErrorToast = useErrorToast();
  const queryClient = useQueryClient();
  const { isCheckCompare } = useContext(StatisticTeamStateContext);

  const [statisticTaskList, setStatisticTaskList] = useState<
    ListTaskStatistic[]
  >([]);

  //  Handle call api edit task
  const handleEditCategoryInline = async (dataTask: {
    id: string;
    categoryIds?: {
      categoryId: number | null;
      type: string;
    }[];
    organizationId?: number;
  }) => {
    setIsLoading(true);

    const { data } = await api.patch(
      `${apiRouters.TASK_DETAIL(`${dataTask.id}`)}?current_screen=${ScreenName.STATISTIC}`,
      dataTask,
    );
    return data;
  };
  const { mutate: editCategoryInline } = useMutation(
    'postEditCategoryTaskInline',
    handleEditCategoryInline,
    {
      onSuccess: async () => {
        queryClient.invalidateQueries({
          predicate: (query) =>
            query.queryKey[0] === 'getStatisticCategoryListTeam',
        });
        queryClient.invalidateQueries({
          predicate: (query) => query.queryKey[0] === 'getStatisticTagsList',
        });
        if (isCheckCompare) {
          queryClient.invalidateQueries({
            predicate: (query) =>
              query.queryKey[0] === 'getStatisticCategoryListTeamCompare',
          });
          queryClient.invalidateQueries({
            predicate: (query) =>
              query.queryKey[0] === 'getStatisticTagsListCompare',
          });
        }
      },
      onError: (error: AxiosError<any>) => {
        setIsLoading(false);
        showErrorToast(error, ERROR_UPDATE_MESSAGE);
      },
      onSettled: () => {},
    },
  );
  //  Handle call api edit Event
  const handleEditEventCategoryInline = async (dataTask: {
    id: string;
    categoryIds?: {
      categoryId: number | null;
      type: string;
    }[];
    organizationId?: number;
  }) => {
    setIsLoading(true);

    const { data } = await api.patch(
      `${apiRouters.SCHEDULE_DETAIL(`${dataTask.id}`)}?current_screen=${ScreenName.STATISTIC}`,
      dataTask,
    );
    return data;
  };
  const { mutate: editCategoryEventInline } = useMutation(
    'postEditCategoryEventInline',
    handleEditEventCategoryInline,
    {
      onSuccess: async () => {
        queryClient.invalidateQueries({
          predicate: (query) => query.queryKey[0] === 'getStatisticTaskList',
        });
        queryClient.invalidateQueries({
          predicate: (query) => query.queryKey[0] === 'getStatisticTagsList',
        });
        if (isCheckCompare) {
          queryClient.invalidateQueries({
            predicate: (query) =>
              query.queryKey[0] === 'getStatisticTaskListCompare',
          });
          queryClient.invalidateQueries({
            predicate: (query) =>
              query.queryKey[0] === 'getStatisticTagsListCompare',
          });
        }
      },
      onError: (error: AxiosError<any>) => {
        setIsLoading(false);
        showErrorToast(error, ERROR_UPDATE_MESSAGE);
      },
      onSettled: () => {},
    },
  );

  const columns: ColumnDef<ListTaskStatistic>[] = [
    {
      accessorKey: 'name',
      header: 'タスク名',
      size: 70,
      cell: (info) => {
        const value = info.getValue() as string;
        return (
          <div className="font-medium px-[18px] text-[16px] break-all line-clamp-3 text-left text-black">
            {value}
          </div>
        );
      },
    },
    {
      accessorKey: 'duration',
      size: 30,
      header: () => {
        const isAsc = ordering === OrderingDataType.TOTAL_DURATION;

        return (
          <div
            className="flex gap-1 items-center justify-center"
            onClick={() => {
              if (ordering === OrderingDataType.TOTAL_DURATION) {
                setOrdering('');
              } else {
                setOrdering(OrderingDataType.TOTAL_DURATION);
              }
            }}>
            <p className="!text-xs font-medium !text-[#77858F]">計測時間</p>
            <div>
              <Image
                src="/icons/sort-down.svg"
                alt="Sort down"
                width={9}
                height={10}
                className={`cursor-pointer justify-self-end  ${isAsc && 'rotate-180'}`}
              />
            </div>
          </div>
        );
      },
      cell: (info) => {
        const value = info.getValue() as string;
        return (
          <div className="font-medium flex text-[14px] justify-center text-black">
            <p>{value.split(':')[0]}時間</p>
            <p>{value.split(':')[1]}分</p>
          </div>
        );
      },
    },
    {
      accessorKey: 'ratio',
      size: 20,
      header: () => {
        const isAsc = ordering === OrderingDataType.PERCENT;

        return (
          <div
            className="flex gap-1 items-center justify-center cursor-pointer"
            onClick={() => {
              if (ordering === OrderingDataType.PERCENT) {
                setOrdering('');
              } else {
                setOrdering(OrderingDataType.PERCENT);
              }
            }}>
            <p className="!text-xs font-medium !text-[#77858F]">割合</p>
            <div className="ml-1 relative flex flex-col">
              <Image
                src="/icons/sort-down.svg"
                alt="Sort down"
                width={9}
                height={10}
                className={`cursor-pointer justify-self-end  ${isAsc && 'rotate-180'}`}
              />
            </div>
          </div>
        );
      },
      cell: (info) => {
        const value = info.getValue() as string;
        return (
          <div className="font-medium text-[14px] text-center text-black">
            {value}%
          </div>
        );
      },
    },
    {
      accessorKey: 'categories',
      header: 'カテゴリー',
      size: 140,
      cell: (info) => {
        const rowData = info.row.original as ListTaskStatistic;
        const {
          tags: tagList,
          categories,
          organization: _organizationId,
        } = rowData;

        // Find items by type
        const largeItem = categories.find(
          (item) => item.type === EventWorkCategory.LARGE,
        );
        const mediumItem = categories.find(
          (item) => item.type === EventWorkCategory.MEDIUM,
        );
        const smallItem = categories.find(
          (item) => item.type === EventWorkCategory.SMALL,
        );

        // Find organization
        const organization = creationDataStatisticData;

        let largeCategories: OptionDropdownType[] = [];
        let mediumCategories: OptionDropdownType[] = [];
        let smallCategories: OptionDropdownType[] = [];

        if (organization) {
          // Get the list of Large Categories
          largeCategories = organization.statisticCategories.map((stat) => ({
            value: stat.LARGE?.id || '',
            label: stat.LARGE?.name || '',
          }));

          // Get a list of Medium Categories if there is a Large Item
          const largeCategory = largeItem
            ? organization.statisticCategories.find(
                (stat) => stat.LARGE?.id === largeItem.value,
              )
            : null;

          if (largeCategory) {
            mediumCategories =
              largeCategory.MEDIUM?.map((medium) => ({
                value: medium.MEDIUM?.id || '',
                label: medium.MEDIUM?.name || '',
              })) || [];

            // Get a list of Small Categories if there is a Medium Item
            const mediumCategory = mediumItem
              ? largeCategory.MEDIUM?.find(
                  (medium) => medium.MEDIUM?.id === mediumItem.value,
                )
              : null;

            if (mediumCategory?.SMALL) {
              smallCategories = mediumCategory.SMALL.map((small) => ({
                value: small.id || '',
                label: small.name || '',
              }));
            }
          }
        }

        return (
          <div className="statistic-custom flex gap-2 items-center">
            {/* Organization */}
            <div className="flex justify-between h-full relative rounded-md gap-2">
              <SingleSelect
                className="border-none shadow-none w-[98px] h-[30px] !bg-[#EBF1F7] rounded-md"
                defaultValue={
                  listOptionsOrganization &&
                  listOptionsOrganization.find(
                    (element) => element.value === rowData.organization,
                  )
                }
                placeholder=""
                showArrow
                options={listOptionsOrganization}
                onChange={(e) => {
                  if (info.row.original.type === EventCalendarType.TASK) {
                    editCategoryInline({
                      id: String(info.row.original.id),
                      organizationId: e?.value as number,
                    });
                  } else {
                    editCategoryEventInline({
                      id: String(info.row.original.id),
                      organizationId: e?.value as number,
                    });
                  }
                }}
              />
              <div className="flex items-center  w-3 h-[30px]">
                <ImageRound
                  className={`w-fit h-fit `}
                  src="/icons/play-statistic.svg"
                  name="icon chevron right"
                />
              </div>
            </div>
            {/* LARGE */}
            <div className="flex justify-between h-full relative rounded-md gap-2">
              <SingleSelect
                showArrow
                className="border-none shadow-none w-[98px] h-[30px] !bg-[#EBF1F7] rounded-md"
                defaultValue={
                  largeCategories &&
                  largeCategories.find(
                    (element) => element.value === largeItem?.value,
                  )
                }
                placeholder=""
                options={largeCategories}
                onChange={(e) => {
                  if (info.row.original.type === EventCalendarType.TASK) {
                    editCategoryInline({
                      id: String(info.row.original.id),
                      categoryIds: [
                        {
                          categoryId:
                            e?.value == NO_OPTION_CATEGORY
                              ? null
                              : (e?.value as number),
                          type: EventWorkCategory.LARGE,
                        },
                        {
                          categoryId: null,
                          type: EventWorkCategory.MEDIUM,
                        },
                        {
                          categoryId: null,
                          type: EventWorkCategory.SMALL,
                        },
                      ],
                    });
                  } else {
                    editCategoryEventInline({
                      id: String(info.row.original.id),
                      categoryIds: [
                        {
                          categoryId:
                            e?.value == NO_OPTION_CATEGORY
                              ? null
                              : (e?.value as number),
                          type: EventWorkCategory.LARGE,
                        },
                        {
                          categoryId: null,
                          type: EventWorkCategory.MEDIUM,
                        },
                        {
                          categoryId: null,
                          type: EventWorkCategory.SMALL,
                        },
                      ],
                    });
                  }
                }}
              />
              <div className="flex items-center  w-3 h-[30px]">
                <ImageRound
                  className={`w-fit h-fit `}
                  src="/icons/play-statistic.svg"
                  name="icon chevron right"
                />
              </div>
            </div>
            {/* MEDIUM */}
            <div className="flex justify-between h-full relative rounded-md gap-2">
              <SingleSelect
                className="border-none shadow-none w-[98px] h-[30px] !bg-[#EBF1F7] rounded-md"
                defaultValue={
                  mediumCategories &&
                  mediumCategories.find(
                    (element) => element.value === mediumItem?.value,
                  )
                }
                placeholder=""
                showArrow
                options={mediumCategories}
                onChange={(e) => {
                  if (info.row.original.type === EventCalendarType.TASK) {
                    editCategoryInline({
                      id: String(info.row.original.id),
                      categoryIds: [
                        {
                          categoryId: e?.value as number,
                          type: EventWorkCategory.MEDIUM,
                        },
                        {
                          categoryId: largeItem?.value as number,
                          type: EventWorkCategory.LARGE,
                        },
                        {
                          categoryId: null,
                          type: EventWorkCategory.SMALL,
                        },
                      ],
                    });
                  } else {
                    editCategoryEventInline({
                      id: String(info.row.original.id),
                      categoryIds: [
                        {
                          categoryId: e?.value as number,
                          type: EventWorkCategory.MEDIUM,
                        },
                        {
                          categoryId: largeItem?.value as number,
                          type: EventWorkCategory.LARGE,
                        },
                        {
                          categoryId: null,
                          type: EventWorkCategory.SMALL,
                        },
                      ],
                    });
                  }
                }}
              />
              <div className="flex items-center  w-3 h-[30px]">
                <ImageRound
                  className={`w-fit h-fit `}
                  src="/icons/play-statistic.svg"
                  name="icon chevron right"
                />
              </div>
            </div>
            {/* SMALL */}
            <div className="flex justify-between h-full relative rounded-md gap-2">
              <SingleSelect
                className="border-none shadow-none w-[98px] h-[30px] !bg-[#EBF1F7] rounded-md"
                defaultValue={
                  smallCategories &&
                  smallCategories.find(
                    (element) => element.value === smallItem?.value,
                  )
                }
                placeholder=""
                showArrow
                options={smallCategories}
                onChange={(e) => {
                  if (info.row.original.type === EventCalendarType.TASK) {
                    editCategoryInline({
                      id: String(info.row.original.id),
                      categoryIds: [
                        {
                          categoryId: e?.value as number,
                          type: EventWorkCategory.SMALL,
                        },
                        {
                          categoryId: largeItem?.value as number,
                          type: EventWorkCategory.LARGE,
                        },
                        {
                          categoryId: mediumItem?.value as number,
                          type: EventWorkCategory.MEDIUM,
                        },
                      ],
                    });
                  } else {
                    editCategoryEventInline({
                      id: String(info.row.original.id),
                      categoryIds: [
                        {
                          categoryId: e?.value as number,
                          type: EventWorkCategory.SMALL,
                        },
                        {
                          categoryId: largeItem?.value as number,
                          type: EventWorkCategory.LARGE,
                        },
                        {
                          categoryId: mediumItem?.value as number,
                          type: EventWorkCategory.MEDIUM,
                        },
                      ],
                    });
                  }
                }}
              />
            </div>
            <div className="ml-auto">
              <TagListInfo tagList={tagList} />
            </div>
          </div>
        );
      },
    },
  ];

  useEffect(() => {
    if (taskList && totalDuration) {
      setStatisticTaskList(
        taskList.map((task) => {
          return {
            id: Number(task.id),
            categories: task.categories
              ? task.categories.map((category) => {
                  return {
                    label: category.name,
                    value: category.id,
                    type: category.type,
                  };
                })
              : [
                  {
                    label: '',
                    value: '',
                  },
                ],
            duration: task.totalDuration,
            name: task.title,
            type: task.type,
            organization: task.organization,
            ratio: String(task.percent),
            tags: task.tags.map((tag) => {
              return {
                value: tag.id as number,
                label: tag.name as string,
              };
            }),
          };
        }),
      );
    }
  }, [taskList, totalDuration]);

  const table = useReactTable({
    data: statisticTaskList,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return (
    <Fragment>
      <div className="flex gap-2 items-end font-medium">
        <p>合計時間</p>
        <div className="flex gap-1 items-baseline">
          <p className="text-[34px] leading-none">
            {totalDuration?.split(':')[0]}
          </p>
          <p className="text-[25px] leading-none">時間</p>
        </div>
        <div className="flex gap-1 items-baseline">
          <p className="text-[34px] leading-none">
            {totalDuration?.split(':')[1]}
          </p>
          <p className="text-[25px] leading-none">分</p>
        </div>
      </div>

      <Table className="border border-[#D2DBE1] !ring-0 bg-white !pt-0  py-0 mt-5 rounded-md">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr
              key={headerGroup.id}
              className="text-[#77858F] bg-[#F8FAFC] font-medium text-xs text-left">
              {headerGroup.headers.map((header, index) => (
                <th
                  key={header.id}
                  style={{
                    width: header.getSize(),
                    minWidth: header.getSize(),
                    maxWidth: header.getSize(),
                  }}
                  className={`p-[12px] cursor-pointer ${index !== 0 ? 'border-l' : ''}`}
                  onClick={header.column.getToggleSortingHandler()}>
                  {flexRender(
                    header.column.columnDef.header,
                    header.getContext(),
                  )}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <TableBody className="![&>tr>td]:pr-0 ![&>tr>td]:pl-0 ![&>tr>td]:pr-0 [&>tr>td]:py-0">
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id} className="hover:bg-gray-50">
              {row.getVisibleCells().map((cell, index) => (
                <td
                  key={cell.id}
                  style={{
                    width: cell.column.getSize(),
                    minWidth: cell.column.getSize(),
                    maxWidth: cell.column.getSize(),
                  }}
                  className={`${index !== 0 ? 'border-l' : ''} !p-2`}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </TableBody>
      </Table>
    </Fragment>
  );
};

export default TableChart;
