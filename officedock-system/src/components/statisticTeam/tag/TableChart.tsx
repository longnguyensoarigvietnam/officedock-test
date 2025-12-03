'use client';

import React, { Fragment, useContext, useEffect, useState } from 'react';
import Image from 'next/image';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { useMutation, useQueryClient } from 'react-query';
import { AxiosError } from 'axios';
import '../styles/task-list-statistic.css';

import { Table, TableBody } from '@components/common/Table';
import ImageRound from '@components/common/ImageRound';
import SingleSelect from '@components/common/SingleSelect';
import TagListInfo from '@components/custom/TagListInfo';

import useCreationDataCommon from '@hooks/common/useCreationDataCommon';
import { useErrorToast } from '@hooks/useErrorToast';

import {
  EventCalendarType,
  EventWorkCategory,
  OrderingDataType,
  OrganizationStatisticType,
  ScreenName,
} from '@constants/enums';
import {
  ALL_TEAM_STATISTIC,
  DEFAULT_EMPTY_CATEGORY,
  NO_SETTING,
} from '@constants';
import { ERROR_UPDATE_MESSAGE } from '@constants/message';
import { apiRouters } from '@constants/routers';

import { OptionDropdownType } from '@interfaces/common';
import {
  CreationStatisticType,
  DataTaskListStatisticListType,
  ListTaskStatistic,
} from '@interfaces/statistic';
import { Task } from '@interfaces/task';
import api from '@base/api';
import { LoadingContext } from '@providers/LoadingProvider';
import { StatisticTeamTagsStateContext } from '@providers/StatisticTeamProviderTag';
import { removeDuplicateOptions } from '@utils';

interface TableChartProps {
  ordering: string;
  totalDuration: string;
  selectedMember: number | null;
  taskList: DataTaskListStatisticListType[];
  listOptionsOrganization: OptionDropdownType[];
  creationDataStatisticData: CreationStatisticType | undefined;
  setOrdering: (ord: string) => void;
  setTaskList: React.Dispatch<
    React.SetStateAction<DataTaskListStatisticListType[]>
  >;
  setTaskListCompare: React.Dispatch<
    React.SetStateAction<DataTaskListStatisticListType[]>
  >;
}

const TableChart = ({
  ordering,
  totalDuration,
  taskList,
  selectedMember,
  creationDataStatisticData,
  listOptionsOrganization,
  setOrdering,
  setTaskList,
  setTaskListCompare,
}: TableChartProps) => {
  const { setIsLoading } = useContext(LoadingContext);
  const showErrorToast = useErrorToast();
  const queryClient = useQueryClient();
  const {
    isCheckCompare,
    selectedOrganization,
    setIsLoadingLarge,
    setIsLoadingLargeCompare,
    setIsLoadingMedium,
    setIsLoadingSmall,
    setIsLoadingSmallCompare,
    setIsLoadingMediumCompare,
    setIsLoadingOrganization,
    setIsLoadingOrganizationCompare,
  } = useContext(StatisticTeamTagsStateContext);

  const [statisticTaskList, setStatisticTaskList] = useState<
    ListTaskStatistic[]
  >([]);

  const { creationDataCommonData } = useCreationDataCommon({
    condition: [
      !!selectedMember && selectedOrganization?.label === ALL_TEAM_STATISTIC,
    ],
    userId: String(selectedMember),
    options: {
      get_organizations_for_all_team_statistic: true,
    },
  });

  //  Handle call api edit task
  const handleEditCategoryInline = async (dataTask: {
    id: string;
    categoryIds?: {
      categoryId: number | null;
      type: string;
    }[];
    organizationId?: number | null;
  }) => {
    const { data } = await api.patch<Task>(
      `${apiRouters.TASK_DETAIL(`${dataTask.id}`)}?current_screen=${ScreenName.STATISTIC}`,
      dataTask,
    );
    return data;
  };
  const { mutate: editCategoryInline } = useMutation(
    'postEditCategoryTaskInline',
    handleEditCategoryInline,
    {
      onSuccess: async (data) => {
        setTaskList((prev) =>
          prev.map((task) =>
            task.id === data.id
              ? {
                  ...task,
                  categories:
                    data.categories && data.categories.length > 0
                      ? data.categories
                      : DEFAULT_EMPTY_CATEGORY,
                }
              : task,
          ),
        );
        setTaskListCompare((prev) =>
          prev.map((task) =>
            task.id === data.id
              ? {
                  ...task,
                  categories:
                    data.categories && data.categories.length > 0
                      ? data.categories
                      : DEFAULT_EMPTY_CATEGORY,
                }
              : task,
          ),
        );
        setIsLoadingLarge(true);
        setIsLoadingMedium(true);
        setIsLoadingSmall(true);
        setIsLoadingOrganization(true);
        if (selectedOrganization?.value === ALL_TEAM_STATISTIC) {
          queryClient.invalidateQueries({
            predicate: (query) =>
              query.queryKey[0] === 'getStatisticAllTeamCategoryList',
          });
          queryClient.invalidateQueries({
            predicate: (query) =>
              query.queryKey[0] === 'getStatisticAllTeamTaskDurations',
          });
          queryClient.invalidateQueries({
            predicate: (query) =>
              query.queryKey[0] ===
              'getStatisticTeamDockAllTeamLineChartTaskDurations',
          });
        } else {
          queryClient.invalidateQueries({
            predicate: (query) =>
              query.queryKey[0] === 'getStatisticTagsListTeam',
          });
          queryClient.invalidateQueries({
            predicate: (query) =>
              query.queryKey[0] === 'getStatisticTableInTeamTagLineChart',
          });
        }
        queryClient.invalidateQueries({
          predicate: (query) => query.queryKey[0] === 'getStatisticTaskList',
        });

        if (isCheckCompare) {
          setIsLoadingLargeCompare(true);
          setIsLoadingMediumCompare(true);
          setIsLoadingSmallCompare(true);
          setIsLoadingOrganizationCompare(true);
          if (selectedOrganization?.value === ALL_TEAM_STATISTIC) {
            queryClient.invalidateQueries({
              predicate: (query) =>
                query.queryKey[0] === 'getStatisticAllTeamCategoryCompareList',
            });
            queryClient.invalidateQueries({
              predicate: (query) =>
                query.queryKey[0] === 'getStatisticAllTeamTaskDurationsCompare',
            });
            queryClient.invalidateQueries({
              predicate: (query) =>
                query.queryKey[0] ===
                'getStatisticTeamDockAllTeamLineChartTaskDurationsCompare',
            });
          } else {
            queryClient.invalidateQueries({
              predicate: (query) =>
                query.queryKey[0] === 'getStatisticTagsListTeamCompare',
            });
            queryClient.invalidateQueries({
              predicate: (query) =>
                query.queryKey[0] ===
                'getStatisticTableInTeamTagLineChartCompare',
            });
          }
          queryClient.invalidateQueries({
            predicate: (query) =>
              query.queryKey[0] === 'getStatisticTaskListCompare',
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
    organizationId?: number | null;
  }) => {
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
      onSuccess: async (data) => {
        setTaskList((prev) =>
          prev.map((task) =>
            task.id === data.id
              ? {
                  ...task,
                  categories: data.categories,
                }
              : task,
          ),
        );
        setTaskListCompare((prev) =>
          prev.map((task) =>
            task.id === data.id
              ? {
                  ...task,
                  categories: data.categories,
                }
              : task,
          ),
        );
        setIsLoadingLarge(true);
        setIsLoadingMedium(true);
        setIsLoadingSmall(true);
        setIsLoadingOrganization(true);
        if (selectedOrganization?.value === ALL_TEAM_STATISTIC) {
          queryClient.invalidateQueries({
            predicate: (query) =>
              query.queryKey[0] === 'getStatisticAllTeamCategoryList',
          });
          queryClient.invalidateQueries({
            predicate: (query) =>
              query.queryKey[0] === 'getStatisticAllTeamTaskDurations',
          });
          queryClient.invalidateQueries({
            predicate: (query) =>
              query.queryKey[0] ===
              'getStatisticTeamDockAllTeamLineChartTaskDurations',
          });
        } else {
          queryClient.invalidateQueries({
            predicate: (query) =>
              query.queryKey[0] === 'getStatisticTagsListTeam',
          });
          queryClient.invalidateQueries({
            predicate: (query) =>
              query.queryKey[0] === 'getStatisticTableInTeamTagLineChart',
          });
        }
        queryClient.invalidateQueries({
          predicate: (query) => query.queryKey[0] === 'getStatisticTaskList',
        });

        if (isCheckCompare) {
          setIsLoadingLargeCompare(true);
          setIsLoadingMediumCompare(true);
          setIsLoadingSmallCompare(true);
          setIsLoadingOrganizationCompare(true);
          if (selectedOrganization?.value === ALL_TEAM_STATISTIC) {
            queryClient.invalidateQueries({
              predicate: (query) =>
                query.queryKey[0] === 'getStatisticAllTeamCategoryCompareList',
            });
            queryClient.invalidateQueries({
              predicate: (query) =>
                query.queryKey[0] === 'getStatisticAllTeamTaskDurationsCompare',
            });
            queryClient.invalidateQueries({
              predicate: (query) =>
                query.queryKey[0] ===
                'getStatisticTeamDockAllTeamLineChartTaskDurationsCompare',
            });
          } else {
            queryClient.invalidateQueries({
              predicate: (query) =>
                query.queryKey[0] === 'getStatisticTagsListTeamCompare',
            });
            queryClient.invalidateQueries({
              predicate: (query) =>
                query.queryKey[0] ===
                'getStatisticTableInTeamTagLineChartCompare',
            });
          }
          queryClient.invalidateQueries({
            predicate: (query) =>
              query.queryKey[0] === 'getStatisticTaskListCompare',
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
      enableSorting: false,
      header: () => {
        return (
          <p className="text-[#77858F] px-[18px] font-medium text-xs text-left">
            タスク名
          </p>
        );
      },
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
      accessorKey: 'name',
      enableSorting: false,
      header: () => {
        return (
          <p className="text-[#77858F] px-[18px] font-medium text-xs text-left">
            タスク名
          </p>
        );
      },
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
      enableSorting: false,

      header: () => {
        return (
          <p className="text-[#77858F] pl-[14px] font-medium text-xs text-left">
            カテゴリー
          </p>
        );
      },
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
        const organization =
          selectedOrganization?.value === ALL_TEAM_STATISTIC
            ? creationDataCommonData?.organizationsOfAllTeamStatistic?.find(
                (org) => org.id === rowData.organization,
              )
            : creationDataStatisticData;
        const listOptionAllTeamOrg =
          creationDataCommonData?.organizationsOfAllTeamStatistic?.map(
            (org) => ({
              label: org.name,
              value: org.id,
              type: org.type,
            }),
          );

        let largeCategories: OptionDropdownType[] = [];
        let mediumCategories: OptionDropdownType[] = [];
        let smallCategories: OptionDropdownType[] = [];

        if (organization) {
          // Get the list of Large Categories
          largeCategories = organization.statisticCategories
            .filter((hierarchy) => !hierarchy.LARGE.isHidden)
            .map((stat) => ({
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
              largeCategory.MEDIUM?.filter(
                (hierarchy) => !hierarchy?.MEDIUM?.isHidden,
              )?.map((medium) => ({
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
              smallCategories = mediumCategory.SMALL?.filter(
                (category) => !category?.isHidden,
              ).map((small) => ({
                value: small.id || '',
                label: small.name || '',
              }));
            }
          }
        }

        return (
          <div className="statistic-custom pl-[14px] pr-[18px] flex gap-2 items-center">
            {/* Organization */}
            <div className="flex w-[24%] justify-between h-full relative rounded-md gap-2">
              <SingleSelect
                className="border-none shadow-none w-[100%] h-[30px] !bg-[#EBF1F7] rounded-md"
                defaultValue={
                  selectedOrganization?.value === ALL_TEAM_STATISTIC
                    ? listOptionAllTeamOrg &&
                      listOptionAllTeamOrg.find(
                        (element) => element.value === rowData.organization,
                      )
                    : listOptionsOrganization &&
                      listOptionsOrganization.find(
                        (element) => element.value === rowData.organization,
                      )
                }
                placeholder=""
                showArrow={
                  rowData.organizationType !==
                    OrganizationStatisticType.CALENDAR &&
                  info.row.original.type === EventCalendarType.TASK
                }
                options={
                  (selectedOrganization?.label === ALL_TEAM_STATISTIC
                    ? rowData.organizationType !==
                      OrganizationStatisticType.CALENDAR
                      ? listOptionAllTeamOrg?.filter(
                          (org) =>
                            org.label !== ALL_TEAM_STATISTIC &&
                            org?.type !== OrganizationStatisticType.CALENDAR,
                        )
                      : listOptionAllTeamOrg?.filter(
                          (org) => org.label !== ALL_TEAM_STATISTIC,
                        )
                    : listOptionsOrganization?.filter(
                        (org) =>
                          org.label !== ALL_TEAM_STATISTIC &&
                          org?.type !== OrganizationStatisticType.CALENDAR,
                      )
                  )?.length
                    ? selectedOrganization?.label === ALL_TEAM_STATISTIC
                      ? rowData.organizationType !==
                        OrganizationStatisticType.CALENDAR
                        ? listOptionAllTeamOrg?.filter(
                            (org) =>
                              org.label !== ALL_TEAM_STATISTIC &&
                              org?.type !== OrganizationStatisticType.CALENDAR,
                          )
                        : listOptionAllTeamOrg?.filter(
                            (org) => org.label !== ALL_TEAM_STATISTIC,
                          )
                      : listOptionsOrganization?.filter(
                          (org) =>
                            org.label !== ALL_TEAM_STATISTIC &&
                            org?.type !== OrganizationStatisticType.CALENDAR,
                        )
                    : [
                        {
                          label: rowData.organizationName,
                          value: rowData.organization,
                        },
                      ]
                }
                isDisabled={
                  rowData.organizationType ===
                    OrganizationStatisticType.CALENDAR ||
                  info.row.original.type !== EventCalendarType.TASK
                }
                onChange={(e) => {
                  if (e?.value === rowData.organization) return;

                  if (info.row.original.type === EventCalendarType.TASK) {
                    editCategoryInline({
                      id: String(info.row.original.id),
                      organizationId:
                        e?.value == NO_SETTING ? null : (e?.value as number),
                      categoryIds: [
                        {
                          categoryId: null,
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
                      organizationId:
                        e?.value == NO_SETTING ? null : (e?.value as number),
                      categoryIds: [
                        {
                          categoryId: null,
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
              <div className="flex items-center  relative left-[2px]  w-3 h-[30px]">
                <ImageRound
                  className={`w-fit h-fit `}
                  src="/icons/play-statistic.svg"
                  name="icon chevron right"
                />
              </div>
            </div>
            {/* LARGE */}
            <div className="flex w-[24%] justify-between h-full relative rounded-md gap-2">
              <SingleSelect
                showArrow={info.row.original.type === EventCalendarType.TASK}
                className="border-none shadow-none w-[100%] h-[30px] !bg-[#EBF1F7] rounded-md"
                defaultValue={
                  largeItem?.value
                    ? (largeCategories &&
                        largeCategories.find(
                          (element) => element.value === largeItem?.value,
                        )) ||
                      largeItem
                    : {
                        value: NO_SETTING,
                        label: NO_SETTING,
                      }
                }
                placeholder=""
                options={removeDuplicateOptions(largeCategories)}
                isDisabled={info.row.original.type !== EventCalendarType.TASK}
                onChange={(e) => {
                  if (e?.value == largeItem?.value) return;

                  if (info.row.original.type === EventCalendarType.TASK) {
                    editCategoryInline({
                      id: String(info.row.original.id),
                      categoryIds: [
                        {
                          categoryId:
                            e?.value == NO_SETTING
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
                            e?.value == NO_SETTING
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
              <div className="flex items-center  relative left-[2px]  w-3 h-[30px]">
                <ImageRound
                  className={`w-fit h-fit `}
                  src="/icons/play-statistic.svg"
                  name="icon chevron right"
                />
              </div>
            </div>
            {/* MEDIUM */}
            <div className="flex w-[24%] justify-between h-full relative rounded-md gap-2">
              <SingleSelect
                className="border-none shadow-none w-[100%] h-[30px] !bg-[#EBF1F7] rounded-md"
                defaultValue={
                  mediumItem?.value
                    ? (mediumCategories &&
                        mediumCategories.find(
                          (element) => element.value === mediumItem?.value,
                        )) ||
                      mediumItem
                    : {
                        value: NO_SETTING,
                        label: NO_SETTING,
                      }
                }
                placeholder=""
                showArrow={info.row.original.type === EventCalendarType.TASK}
                options={removeDuplicateOptions(mediumCategories)}
                isDisabled={info.row.original.type !== EventCalendarType.TASK}
                onChange={(e) => {
                  if (e?.value == mediumItem?.value) return;

                  if (info.row.original.type === EventCalendarType.TASK) {
                    editCategoryInline({
                      id: String(info.row.original.id),
                      categoryIds: [
                        {
                          categoryId:
                            e?.value == NO_SETTING
                              ? null
                              : (e?.value as number),
                          type: EventWorkCategory.MEDIUM,
                        },
                        {
                          categoryId:
                            largeItem?.value == NO_SETTING
                              ? null
                              : (largeItem?.value as number),
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
                          categoryId:
                            e?.value == NO_SETTING
                              ? null
                              : (e?.value as number),
                          type: EventWorkCategory.MEDIUM,
                        },
                        {
                          categoryId:
                            largeItem?.value == NO_SETTING
                              ? null
                              : (largeItem?.value as number),
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
              <div className="flex items-center  relative left-[2px] w-3 h-[30px]">
                <ImageRound
                  className={`w-fit h-fit `}
                  src="/icons/play-statistic.svg"
                  name="icon chevron right"
                />
              </div>
            </div>
            {/* SMALL */}
            <div className="flex w-[calc(24%_-_20px)] justify-between h-full relative rounded-md gap-2">
              <SingleSelect
                className="border-none shadow-none w-[100%] h-[30px] !bg-[#EBF1F7] rounded-md"
                defaultValue={
                  smallItem?.value
                    ? (smallCategories &&
                        smallCategories.find(
                          (element) => element.value === smallItem?.value,
                        )) ||
                      smallItem
                    : {
                        value: NO_SETTING,
                        label: NO_SETTING,
                      }
                }
                placeholder=""
                options={removeDuplicateOptions(smallCategories)}
                showArrow={info.row.original.type === EventCalendarType.TASK}
                onChange={(e) => {
                  if (e?.value == smallItem?.value) return;

                  if (info.row.original.type === EventCalendarType.TASK) {
                    editCategoryInline({
                      id: String(info.row.original.id),
                      categoryIds: [
                        {
                          categoryId:
                            e?.value == NO_SETTING
                              ? null
                              : (e?.value as number),
                          type: EventWorkCategory.SMALL,
                        },
                        {
                          categoryId:
                            largeItem?.value == NO_SETTING
                              ? null
                              : (largeItem?.value as number),
                          type: EventWorkCategory.LARGE,
                        },
                        {
                          categoryId:
                            mediumItem?.value == NO_SETTING
                              ? null
                              : (mediumItem?.value as number),
                          type: EventWorkCategory.MEDIUM,
                        },
                      ],
                    });
                  } else {
                    editCategoryEventInline({
                      id: String(info.row.original.id),
                      categoryIds: [
                        {
                          categoryId:
                            e?.value == NO_SETTING
                              ? null
                              : (e?.value as number),
                          type: EventWorkCategory.SMALL,
                        },
                        {
                          categoryId:
                            largeItem?.value == NO_SETTING
                              ? null
                              : (largeItem?.value as number),
                          type: EventWorkCategory.LARGE,
                        },
                        {
                          categoryId:
                            mediumItem?.value == NO_SETTING
                              ? null
                              : (mediumItem?.value as number),
                          type: EventWorkCategory.MEDIUM,
                        },
                      ],
                    });
                  }
                }}
                isDisabled={info.row.original.type !== EventCalendarType.TASK}
              />
            </div>
            <div className="ml-auto">
              <TagListInfo
                tagList={tagList}
                isEvent={info.row.original.type !== EventCalendarType.TASK}
                taskId={info.row.original.id}
                optionsTag={
                  rowData.organization ? creationDataStatisticData : undefined
                }
              />
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
            organization: task.organization?.id,
            organizationName: task.organization?.name,
            organizationType: task.organization?.type,
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

      <Table
        classCustom="!px-0"
        className="border border-[#D2DBE1] !ring-0 bg-white !pt-0 !px-0  py-0 mt-5 rounded-[10px]">
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
                  className={`py-[12px] !px-0 cursor-pointer ${index !== 0 ? 'border-l' : ''}`}
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
                  className={`${index !== 0 ? 'border-l' : ''} !py-2 !px-0`}>
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
