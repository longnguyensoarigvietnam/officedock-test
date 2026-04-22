'use client';
import { useMutation } from 'react-query';
import Link from 'next/link';
import React, {
  Fragment,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Controller, SubmitHandler, useForm } from 'react-hook-form';
import { Transition } from '@headlessui/react';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';

import Button from '@components/common/Button';
import ImageRound from '@components/common/ImageRound';
import Input from '@components/common/Input';
import Pagination from '@components/common/Pagination';
import ConfirmDeleteModal from '@components/modals/ConfirmDeleteModal';
import Dropdown from '@components/common/Dropdown';
import { Table } from '@components/common/Table';

import { apiRouters, pageRouters } from '@constants/routers';
import {
  DESIGN_WIDTH,
  NO_DATA_AVAILABLE,
  NO_OPTION_CATEGORY,
  NO_SETTING,
  TASK_AND_EVENT_OPTIONS,
} from '@constants';
import {
  ERROR_DELETE_MESSAGE,
  SUCCESS_DELETE_MESSAGE,
} from '@constants/message';
import {
  EventCalendarType,
  EventWorkCategory,
  ItemStartType,
  PermissionsSystem,
  WorkItemType,
} from '@constants/enums';

import { LoadingContext } from '@providers/LoadingProvider';
import { TaskContext } from '@providers/TaskProvider';
import { GlobalStateContext } from '@providers/GlobalStateProvider';
import { useToast } from '@providers/ToastProvider';
import { useSessionCache } from '@providers/SessionCacheProvider';

import { BasePagination, OptionDropdownType } from '@interfaces/common';
import {
  ActualDurationDetail,
  TaskScheduleDetail,
} from '@interfaces/durations';

import useActualDurationList from '@hooks/useActualDurationList';
import useActualDurationListByStaff from '@hooks/useActualDurationListByStaff';
import useCreationDataCommon from '@hooks/common/useCreationDataCommon';
import {
  calculateActualDuration,
  getSubmitLevelFormattedDate,
} from '@utils/date';
import { hasPermissionInArray } from '@utils';

import api from '@base/api';

const ListActualDurations = () => {
  const { setIsLoading } = useContext(LoadingContext);
  const { setIdEventDelete, setIdTaskDelete } = useContext(TaskContext);

  const { showToast } = useToast();

  const { data: session } = useSessionCache();
  const { expanded } = useContext(GlobalStateContext);

  const [showFilter, setShowFilter] = useState(true);
  const [openConfirmDeleteModal, setOpenConfirmDeleteModal] = useState(false);
  const [idActualDurationChoose, setIdActualDurationChoose] =
    useState<number>();
  const [actualDurationChooseInfo, setActualDurationChooseInfo] = useState<{
    taskScheduleId: number;
    type: string;
    isPaused: boolean;
  }>();

  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [selectedStaff, setSelectedStaff] = useState<OptionDropdownType>({
    label: `${session?.user.profile.fullName}`,
    value: `${session?.user.id}`,
  });

  const [dataActualDurations, setDataActualDurations] = useState<
    ActualDurationDetail[]
  >([]);
  const [dataOptionsStaff, setDataOptionsStaff] = useState<
    OptionDropdownType[]
  >([]);
  const [dataOptionsTags, setDataOptionsTags] = useState<OptionDropdownType[]>(
    [],
  );
  const [dataOptionsLargeCategories, setDataOptionsLargeCategories] = useState<
    OptionDropdownType[]
  >([]);

  const [dataOptionsMediumCategories, setDataOptionsMediumCategories] =
    useState<OptionDropdownType[]>([]);

  const [dataOptionsSmallCategories, setDataOptionsSmallCategories] = useState<
    OptionDropdownType[]
  >([]);

  // TODO: Update logic sort for multi column
  const { register, control, setValue, handleSubmit } = useForm<{
    type: OptionDropdownType;
    title: string;
    tag: OptionDropdownType;
    staff: OptionDropdownType;
    largeCategory: OptionDropdownType;
    mediumCategory: OptionDropdownType;
    smallCategory: OptionDropdownType;
  }>({
    mode: 'onSubmit',
    defaultValues: {
      type: { label: '未選択', value: '' },
      tag: { label: '未選択', value: '' },
      staff: { label: '未選択', value: '' },
      largeCategory: { label: '未選択', value: '' },
      mediumCategory: { label: '未選択', value: '' },
      smallCategory: { label: '未選択', value: '' },
      title: '',
    },
  });
  const [filterRequest, setFilterRequest] = useState({
    type: '',
    title: '',
    tagId: '',
    staffId: '',
    largeCategory: '',
    mediumCategory: '',
    smallCategory: '',
  });
  const [selectedActualDurationId, setSelectedActualDurationId] =
    useState<number>();
  const [actualDurationsByStaff, setActualDurationsByStaff] = useState<
    OptionDropdownType[]
  >([]);
  const [isActualDurationsByStaffLoading, setIsActualDurationsByStaffLoading] =
    useState<boolean>(true);
  const [chosenTaskSchedule, setChosenTaskSchedule] =
    useState<TaskScheduleDetail>();

  // Actual durations by selected member
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [pageNumber, setPageNumber] = useState<number>(1);

  const [viewportWidth, setViewportWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => {
      setViewportWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Get organization options for pulldown
  useCreationDataCommon({
    options: {
      get_all_members: true,
      get_tags: true,
      get_statistic_categories: true,
      has_include_deleted_user: 'false',
    },
    onSuccess: (data) => {
      const memberList =
        data.allMembers?.map((member) => {
          return {
            label: member.fullName,
            value: member.id,
          };
        }) || [];
      setDataOptionsStaff(memberList);
      setDataOptionsTags(
        data.tags?.map((org) => ({
          label: org.name,
          value: org.id,
          furigana: org.furigana,
        })) || [],
      );
      if (data.statisticCategories) {
        setDataOptionsLargeCategories(
          data.statisticCategories.map((org) => ({
            label: org.name,
            value: org.name,
          })),
        );
        setDataOptionsMediumCategories(
          data.statisticCategories.map((org) => ({
            label: org.name,
            value: org.name,
          })),
        );
        setDataOptionsSmallCategories(
          data.statisticCategories.map((org) => ({
            label: org.name,
            value: org.name,
          })),
        );
      }
    },
  });

  const { actualDurationList, refetchActualDurationList } =
    useActualDurationList(
      { page: currentPage },
      {
        title: filterRequest.title,
        type: filterRequest.type,
        tagId: filterRequest.tagId,
        staffId: filterRequest.staffId,
        smallCategory: filterRequest.smallCategory,
        mediumCategory: filterRequest.mediumCategory,
        largeCategory: filterRequest.largeCategory,
      },
    );

  useEffect(() => {
    if (actualDurationList) {
      setDataActualDurations(actualDurationList.results);
      setTotalPages(actualDurationList.numPages);
    }
  }, [actualDurationList]);

  const { isFetchingActualDurationsByStaff } = useActualDurationListByStaff({
    selectedStaffId: Number(selectedStaff.value),
    pagination: {
      page: pageNumber,
    },
    condition: [hasMore],
    onSuccess: async (data: BasePagination<TaskScheduleDetail[]>) => {
      const newActualDurationList = data.results.map(
        (actualDuration: TaskScheduleDetail) => {
          return {
            value: actualDuration.id,
            label: actualDuration.title,
            type: actualDuration.type,
          };
        },
      );
      setActualDurationsByStaff((prevList) => {
        // If pageNumber === 1, overwrite instead of append
        if (pageNumber === 1) return newActualDurationList;
        return [...(prevList || []), ...newActualDurationList];
      });
      setHasMore(data?.hasNext || false);
    },
    onSettled: () => {
      setSelectedActualDurationId(undefined);
      setIsActualDurationsByStaffLoading(false);
    },
  });

  // Delete actual duration
  const handleOpenDeleteActualDurationModal = (
    actualDuration: ActualDurationDetail,
  ) => {
    setOpenConfirmDeleteModal(true);
    setIdActualDurationChoose(actualDuration.id);
    setActualDurationChooseInfo({
      isPaused: actualDuration.pausedAt ? true : false,
      taskScheduleId:
        actualDuration.type == 'TASK'
          ? Number(actualDuration.taskId)
          : Number(actualDuration.scheduleId),
      type: String(actualDuration.type),
    });
  };

  const handleConfirmDeleteOrganization = () => {
    if (idActualDurationChoose) {
      setIsLoading(true);
      deleteActualDuration(idActualDurationChoose);
      return;
    }
  };
  const handleDeleteActualDuration = async (id: number) => {
    const { data: response } = await api.delete(
      apiRouters.ACTUAL_DURATION_DETAIL(id),
    );
    return response;
  };

  const { mutate: deleteActualDuration } = useMutation(
    handleDeleteActualDuration,
    {
      onSuccess: async () => {
        if (actualDurationChooseInfo?.type == EventCalendarType.TASK) {
          setIdTaskDelete(String(idActualDurationChoose));
        } else {
          setIdEventDelete(String(idActualDurationChoose));
        }
        showToast({
          description: SUCCESS_DELETE_MESSAGE,
        });
        if (actualDurationList?.results.length === 1 && currentPage > 1) {
          // If change current page, useOrganizationList auto recall, just don't need using refetchOrganizationList
          setCurrentPage(currentPage - 1);
        } else {
          refetchActualDurationList();
        }
        setOpenConfirmDeleteModal(false);
      },
      onError: () => {
        showToast({
          description: ERROR_DELETE_MESSAGE,
          variant: 'error',
        });
        setOpenConfirmDeleteModal(false);
        setIsLoading(false);
      },
    },
  );

  const onSubmit: SubmitHandler<{
    type: OptionDropdownType;
    title: string;
    tag: OptionDropdownType;
    staff: OptionDropdownType;
    largeCategory: OptionDropdownType;
    mediumCategory: OptionDropdownType;
    smallCategory: OptionDropdownType;
  }> = (data) => {
    setCurrentPage(1);
    setFilterRequest({
      type: data.type ? encodeURIComponent(`${data.type.value}`) : '',
      title: data.title ? encodeURIComponent(`${data.title}`) : '',
      tagId: data.tag ? encodeURIComponent(`${data.tag.value}`) : '',
      staffId: data.staff ? encodeURIComponent(`${data.staff.value}`) : '',
      smallCategory: data.smallCategory
        ? encodeURIComponent(`${data.smallCategory.value}`)
        : '',
      mediumCategory: data.mediumCategory
        ? encodeURIComponent(`${data.mediumCategory.value}`)
        : '',
      largeCategory: data.largeCategory
        ? encodeURIComponent(`${data.largeCategory.value}`)
        : '',
    });
  };

  const handleClearFilterForm = () => {
    setValue('type', { label: '未選択', value: '' });
    setValue('tag', { label: '未選択', value: '' });
    setValue('staff', { label: '未選択', value: '' });
    setValue('largeCategory', { label: '未選択', value: '' });
    setValue('mediumCategory', { label: '未選択', value: '' });
    setValue('smallCategory', { label: '未選択', value: '' });
    setValue('title', '');
  };

  const columns = useMemo(
    (): ColumnDef<ActualDurationDetail, unknown>[] => [
      {
        accessorKey: 'id',
        header: 'ID',
        size: 80,
        cell: (info) => info.getValue(),
      },
      {
        accessorKey: 'type',
        header: 'タスク/予定',
        size: 80,
        cell: ({ getValue }) =>
          getValue() == ItemStartType.TASK
            ? WorkItemType.Task
            : WorkItemType.Event,
      },
      {
        accessorKey: 'title',
        header: 'タイトル',
        size: 250,
        cell: (info) => info.getValue(),
      },
      {
        accessorKey: 'categories',
        header: 'カテゴリ',
        size: 360,
        cell: ({ row }) => {
          const element = row.original;
          const large = element.categories.find(
            (cat: { id?: number; name?: string; type?: string }) =>
              cat.type === EventWorkCategory.LARGE,
          );
          const medium = element.categories.find(
            (cat: { id?: number; name?: string; type?: string }) =>
              cat.type === EventWorkCategory.MEDIUM,
          );
          const small =
            element.type === ItemStartType.TASK
              ? element.categories.find(
                  (cat: { id?: number; name?: string; type?: string }) =>
                    cat.type === EventWorkCategory.SMALL,
                )
              : undefined;

          if (!large && !medium && !small) return NO_SETTING;

          const text = [
            large?.name || NO_OPTION_CATEGORY,
            medium?.name || NO_OPTION_CATEGORY,
            small?.name || '',
          ]
            .filter(Boolean)
            .join('＞');

          return <div className="max-w-full break-words">{text}</div>;
        },
      },
      {
        accessorKey: 'tags',
        header: '集計タグ',
        size: 360,
        cell: ({ row }) => {
          const tags = row.original.tags as
            | { id: number; name: string }[]
            | undefined;

          if (!tags || tags.length === 0) return <></>;

          return (
            <div className="max-w-full break-words">
              {tags
                ?.map(
                  (
                    tag: { id: number; name: string },
                    index: number,
                    arr: { id: number; name: string }[],
                  ) => `${tag.name}${index !== arr.length - 1 ? '／' : ''}`,
                )
                .join('') ?? ''}
            </div>
          );
        },
      },
      {
        accessorKey: 'createdAt',
        header: '作成日時',
        size: 120,
        cell: ({ getValue }) =>
          getSubmitLevelFormattedDate(new Date(getValue() as string)),
      },
      {
        accessorKey: 'pausedAt',
        header: '計測時間',
        size: 120,
        cell: ({ row }) => {
          const e = row.original;
          return e.pausedAt
            ? calculateActualDuration(
                String(e.startedAt),
                e.pausedAt ? String(e.pausedAt) : '',
              )
            : '計測中';
        },
      },
      {
        accessorKey: 'staffs',
        header: '従業員',
        size: 150,
        cell: ({ getValue }) => {
          const staffs = getValue<string[]>();

          if (!staffs || staffs.length === 0) return null;

          return (
            <div className="max-w-full break-words">
              {staffs
                .map(
                  (staff, index, arr) =>
                    `${staff}${index !== arr.length - 1 ? '／' : ''}`,
                )
                .join('')}
            </div>
          );
        },
      },
      {
        id: 'actions',
        header: '操作',
        size: 120,
        enableSorting: false,
        cell: ({ row }) => {
          const element = row.original;
          return (
            <div className="flex gap-2 justify-center items-center">
              <Link
                href={pageRouters.DETAIL_ACTUAL_DURATIONS.href(
                  `${element.id}`,
                )}>
                <ImageRound
                  name="Detail"
                  src="/icons/detail.svg"
                  className="w-[18px] h-[18px] hover:cursor-pointer opacity-65"
                />
              </Link>

              {session?.user.permissions &&
              hasPermissionInArray(
                session.user.permissions,
                PermissionsSystem.ACTUAL_DURATION_UPDATE,
              ) &&
              element.pausedAt ? (
                <Link
                  href={pageRouters.EDIT_ACTUAL_DURATIONS.href(
                    `${element.id}`,
                    `${element.type}`,
                  )}>
                  <ImageRound
                    name="Edit"
                    src="/icons/edit-gray.svg"
                    className="w-[14px] h-[14px] hover:cursor-pointer opacity-65"
                  />
                </Link>
              ) : (
                <div className="w-[14px] h-[14px]"></div>
              )}

              {session?.user.permissions &&
              hasPermissionInArray(
                session.user.permissions,
                PermissionsSystem.ACTUAL_DURATION_DELETE,
              ) &&
              element.pausedAt ? (
                <ImageRound
                  name="Delete"
                  src="/icons/delete-gray.svg"
                  className="w-[12px] h-[14px] hover:cursor-pointer"
                  onClick={() => handleOpenDeleteActualDurationModal(element)}
                />
              ) : (
                <div className="w-[13px] h-[16px]"></div>
              )}
            </div>
          );
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const tableData = useMemo(
    () => actualDurationList?.results ?? [],
    [actualDurationList?.results],
  );

  const table = useReactTable({
    data: tableData,
    columns: columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div
      className={`${expanded ? `${viewportWidth > DESIGN_WIDTH ? 'max-w-[calc(100vw-270px)]' : 'max-w-[calc(100%-200px)]'}` : `${viewportWidth > DESIGN_WIDTH ? 'max-w-[calc(100vw-125px)]' : 'max-w-[calc(100%-70px)]'}`}`}>
      <div className="flex flex-col border border-gray-300 rounded-lg">
        <div
          className={`flex justify-between px-3 py-4 rounded-t-lg ${showFilter && 'border-b'} bg-[#F8FAFC]`}>
          <span className="text-black text-base font-medium">検索</span>
          <ImageRound
            name="Filter extend icon"
            src={'/icons/arrow-down.svg'}
            className={`w-4 h-4 hover:cursor-pointer ${!showFilter && 'rotate-180'}`}
            onClick={() => setShowFilter(!showFilter)}
          />
        </div>
        <Transition
          show={showFilter}
          enter="transition-transform duration-300 ease-out"
          enterFrom="transform -translate-y-[10%]"
          enterTo="transform translate-y-0"
          leave="transition-transform duration-150 ease-in"
          leaveFrom="transform translate-y-0"
          leaveTo="transform -translate-y-[10%]">
          <form
            className={`flex flex-col gap-4 p-4 bg-white rounded-b-lg`}
            onSubmit={handleSubmit(onSubmit)}>
            <div className="flex gap-4">
              <div className="w-1/4">
                <div className="w-full flex items-end gap-4">
                  <div className="w-full">
                    <Controller
                      control={control}
                      name={'type'}
                      render={({ field: { onChange, value } }) => (
                        <Dropdown
                          label="タスク/予定"
                          labelTextClass="text-black font-medium"
                          labelOptionClass="text-sm"
                          labelClass="text-sm"
                          options={[
                            { label: '選択', value: '' },
                            ...TASK_AND_EVENT_OPTIONS,
                          ]}
                          placeholder="選択してください"
                          className=""
                          onChange={onChange}
                          selectedOption={[
                            { label: '選択', value: '' },
                            ...TASK_AND_EVENT_OPTIONS,
                          ].find((element) => element.value == value?.value)}
                        />
                      )}
                    />
                  </div>
                </div>
              </div>
              <div className="w-1/4">
                <div className="w-full flex items-end gap-4">
                  <div className="w-full">
                    <Input
                      label="タイトル"
                      labelClassName="text-sm text-black font-medium"
                      className="text-sm h-[42px] !placeholder-[#BABABA]"
                      placeholder="入力してください"
                      register={register('title')}
                    />
                  </div>
                </div>
              </div>
              <div className="w-1/4">
                <div className="w-full flex items-end gap-4">
                  <div className="w-full">
                    <Controller
                      control={control}
                      name={'tag'}
                      render={({ field: { onChange, value } }) => (
                        <Dropdown
                          label="集計タグ"
                          labelTextClass="text-black font-medium"
                          labelOptionClass="text-sm"
                          labelClass="text-sm"
                          options={[
                            { label: '選択', value: '' },
                            ...dataOptionsTags,
                          ]}
                          searchOption
                          searchFurigana
                          placeholder="選択してください"
                          className=""
                          onChange={onChange}
                          selectedOption={[
                            { label: '選択', value: '' },
                            ...dataOptionsTags,
                          ].find((element) => element.value == value?.value)}
                        />
                      )}
                    />
                  </div>
                </div>
              </div>
              <div className="w-1/4">
                <div className="w-full flex items-end gap-4">
                  <div className="w-full">
                    <Controller
                      control={control}
                      name={'staff'}
                      render={({ field: { onChange, value } }) => (
                        <Dropdown
                          label="従業員"
                          labelTextClass="text-black font-medium"
                          labelOptionClass="text-sm"
                          labelClass="text-sm"
                          options={[
                            { label: '選択', value: '' },
                            ...dataOptionsStaff,
                          ]}
                          placeholder="選択してください"
                          className=""
                          onChange={onChange}
                          selectedOption={[
                            { label: '選択', value: '' },
                            ...dataOptionsStaff,
                          ].find((element) => element.value == value?.value)}
                        />
                      )}
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-1/4">
                <div className="w-full flex items-end gap-4">
                  <div className="w-full">
                    <Controller
                      control={control}
                      name={'largeCategory'}
                      render={({ field: { onChange, value } }) => (
                        <Dropdown
                          label="大カテゴリ"
                          labelTextClass="text-black font-medium"
                          labelOptionClass="text-sm"
                          labelClass="text-sm"
                          options={[
                            { label: '未選択', value: '' },
                            ...dataOptionsLargeCategories,
                          ]}
                          placeholder="選択してください"
                          className=""
                          onChange={onChange}
                          selectedOption={[
                            { label: '選択', value: '' },
                            ...dataOptionsLargeCategories,
                          ].find((element) => element.value == value?.value)}
                        />
                      )}
                    />
                  </div>
                </div>
              </div>
              <div className="w-1/4">
                <div className="w-full flex items-end gap-4">
                  <div className="w-full">
                    <Controller
                      control={control}
                      name={'mediumCategory'}
                      render={({ field: { onChange, value } }) => (
                        <Dropdown
                          label="中カテゴリ"
                          labelTextClass="text-black font-medium"
                          labelOptionClass="text-sm"
                          labelClass="text-sm"
                          options={[
                            { label: '未選択', value: '' },
                            ...dataOptionsMediumCategories,
                          ]}
                          placeholder="選択してください"
                          className=""
                          onChange={onChange}
                          selectedOption={[
                            { label: '選択', value: '' },
                            ...dataOptionsMediumCategories,
                          ].find((element) => element.value == value?.value)}
                        />
                      )}
                    />
                  </div>
                </div>
              </div>
              <div className="w-1/4">
                <div className="w-full flex items-end gap-4">
                  <div className="w-full">
                    <Controller
                      control={control}
                      name={'smallCategory'}
                      render={({ field: { onChange, value } }) => (
                        <Dropdown
                          label="小カテゴリ"
                          labelTextClass="text-black font-medium"
                          labelOptionClass="text-sm"
                          labelClass="text-sm"
                          options={[
                            { label: '未選択', value: '' },
                            ...dataOptionsSmallCategories,
                          ]}
                          placeholder="選択してください"
                          className=""
                          onChange={onChange}
                          selectedOption={[
                            { label: '選択', value: '' },
                            ...dataOptionsSmallCategories,
                          ].find((element) => element.value == value?.value)}
                        />
                      )}
                    />
                  </div>
                </div>
              </div>
              <div className="w-1/4"></div>
            </div>
            <div className="flex justify-end gap-[10px]">
              <Button
                variant="outline"
                type="button"
                className="w-[100px] h-[36px] !text-primary !rounded-lg"
                onClick={handleClearFilterForm}>
                クリア
              </Button>
              <Button
                variant="secondary"
                type="submit"
                className="w-[100px] h-[36px] !text-primary !bg-[#eaeeff] !rounded-lg !border-transparent">
                絞り込み
              </Button>
            </div>
          </form>
        </Transition>
      </div>
      {session?.user.permissions &&
        hasPermissionInArray(
          session?.user.permissions,
          PermissionsSystem.ACTUAL_DURATION_ADD,
        ) && (
          <div className="flex justify-end gap-5 my-8">
            <div className="w-60">
              <Dropdown
                placeholder="従業員"
                classNameTextData="!px-2 [&>div]:justify-center "
                classNameOption=""
                className=""
                labelOptionClass="text-sm"
                labelClass="text-sm"
                options={dataOptionsStaff}
                selectedOption={{
                  label: selectedStaff.label,
                  value: selectedStaff.value,
                }}
                onChange={(e: OptionDropdownType) => {
                  setHasMore(true);
                  setPageNumber(1);
                  setIsActualDurationsByStaffLoading(true);
                  setSelectedStaff(e);
                }}
              />
            </div>
            <div className="w-60">
              <Dropdown
                placeholder="タスク/予定を選択"
                placeholderClass="!text-[#BABABA]"
                classNameTextData="!px-2 [&>div]:justify-center "
                classNameOption=""
                className="h-[42px]"
                labelOptionClass="text-sm"
                labelClass="text-sm"
                options={actualDurationsByStaff}
                disabled={!actualDurationsByStaff.length}
                selectedOption={
                  selectedActualDurationId
                    ? actualDurationsByStaff.find(
                        (opt) => opt.value === selectedActualDurationId,
                      )
                    : undefined
                }
                onScrollEnd={() => {
                  if (hasMore && !isFetchingActualDurationsByStaff) {
                    setPageNumber((prev) => prev + 1);
                  }
                }}
                onChange={(e) => {
                  setSelectedActualDurationId(Number(e.value));
                  setChosenTaskSchedule({
                    id: Number(e.value),
                    title: e.label,
                    type: String(e.type),
                  });
                }}
                isLoading={isActualDurationsByStaffLoading}
              />
            </div>
            <Link
              href={
                selectedActualDurationId && selectedActualDurationId
                  ? pageRouters.CREATE_ACTUAL_DURATIONS.href(
                      `${selectedActualDurationId}`,
                      `${chosenTaskSchedule?.type}`,
                      `${selectedStaff.value}`,
                    )
                  : ''
              }
              className={'flex'}>
              <Button
                disabled={!selectedActualDurationId}
                className="w-44 h-[42px]">
                新規登録
              </Button>
            </Link>
          </div>
        )}
      <Table
        classCustom="!p-0"
        className={`w-full !overflow-x-auto table-auto h-full bg-white !rounded-[10px]`}>
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header, index) => {
                const isSticky = index === 0;
                return (
                  <th
                    key={header.id}
                    style={{
                      width: header.getSize(),
                      minWidth: header.getSize(),
                      maxWidth: header.getSize(),
                    }}
                    className={`
                              text-[#77858F] bg-[#F8FAFC] text-xs font-medium py-3 max-w-[100%] truncate 
                              ${index !== headerGroup.headers.length - 1 ? 'border-r-[1px]' : ''}
                              ${isSticky ? 'sticky left-0 z-10' : ''}
                            `}>
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext(),
                    )}
                  </th>
                );
              })}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.length ? (
            table.getRowModel().rows.map((row, rowIndex) => {
              const isLastRow =
                rowIndex === table.getRowModel().rows.length - 1;
              const cells = row.getVisibleCells();

              return (
                <tr key={row.id}>
                  {cells.map((cell, colIndex) => {
                    const isFirstCol = colIndex === 0;
                    const isLastCol = colIndex === cells.length - 1;

                    const cellClasses = [
                      'px-4',
                      'py-2',
                      'max-w-full break-words',
                      'text-center',
                      'text-sm',
                      'text-black border font-medium',
                      isFirstCol && 'border-l-0',
                      isLastCol && 'border-r-0',
                      isLastRow && 'border-b-0',
                      isFirstCol && 'sticky left-0 z-10 bg-white',
                    ]
                      .filter(Boolean)
                      .join(' ');

                    return (
                      <td
                        key={cell.id}
                        style={{
                          width: cell.column.getSize(),
                          minWidth: cell.column.getSize(),
                          maxWidth: cell.column.getSize(),
                        }}
                        className={cellClasses}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })
          ) : (
            <tr>
              <td
                colSpan={table.getVisibleLeafColumns().length}
                className="text-black text-sm text-center py-4">
                {NO_DATA_AVAILABLE}
              </td>
            </tr>
          )}
        </tbody>
      </Table>
      <div className="flex justify-center">
        {dataActualDurations && dataActualDurations.length ? (
          <Pagination
            onChange={(pageNumber) => setCurrentPage(pageNumber)}
            currentPage={currentPage}
            totalPages={totalPages}
          />
        ) : null}
      </div>
      <ConfirmDeleteModal
        open={openConfirmDeleteModal}
        type="実績"
        onConfirm={handleConfirmDeleteOrganization}
        onClose={() => setOpenConfirmDeleteModal(false)}
      />
    </div>
  );
};

export default ListActualDurations;
