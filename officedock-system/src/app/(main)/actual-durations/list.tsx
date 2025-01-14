'use client';
import { useMutation } from 'react-query';
import Link from 'next/link';
import React, { Fragment, useContext, useEffect, useState } from 'react';
import { Controller, SubmitHandler, useForm } from 'react-hook-form';
import { Transition } from '@headlessui/react';
import { useSession } from 'next-auth/react';

import Button from '@components/common/Button';
import ImageRound from '@components/common/ImageRound';
import Input from '@components/common/Input';
import Pagination from '@components/common/Pagination';
import ConfirmDeleteModal from '@components/modals/ConfirmDeleteModal';
import Dropdown from '@components/common/Dropdown';

import { apiRouters, pageRouters } from '@constants/routers';
import {
  NO_DATA_AVAILABLE,
  NO_OPTION_CATEGORY,
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
import { OptionDropdownType } from '@interfaces/common';
import {
  ActualDurationDetail,
  TaskScheduleDetail,
} from '@interfaces/durations';
import useActualDurationList from '@hooks/useActualDurationList';
import {
  calculateActualDuration,
  getSubmitLevelFormattedDate,
} from '@utils/date';
import { hasPermissionInArray } from '@utils';
import useDashboardMemberList from '@hooks/useDashBoardMemberList';
import useCreationDataTag from '@hooks/useCreationDataTag';
import useCreationDataStatisticOrganization from '@hooks/useCreationDataStatisticOrganization';
import api from '@base/api';

const ListActualDurations = () => {
  const { setIsLoading } = useContext(LoadingContext);
  const { creationDataTagData } = useCreationDataTag({});
  const { creationDataCategoryData } = useCreationDataStatisticOrganization({});
  const { setIdEventDelete, setIdTaskDelete } = useContext(TaskContext);

  const { showToast } = useToast();

  const { data: session } = useSession();
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
  const { register, control, handleSubmit } = useForm<{
    type: OptionDropdownType;
    title: string;
    tag: OptionDropdownType;
    staff: OptionDropdownType;
    largeCategory: OptionDropdownType;
    mediumCategory: OptionDropdownType;
    smallCategory: OptionDropdownType;
  }>({
    mode: 'onSubmit',
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

  const { dashboardMemberList } = useDashboardMemberList();

  useEffect(() => {
    if (dashboardMemberList?.length) {
      const memberList = dashboardMemberList.map((member) => {
        return {
          label: member.fullName,
          value: member.id,
        };
      });
      setDataOptionsStaff(memberList);
    }
  }, [dashboardMemberList]);

  useEffect(() => {
    if (creationDataTagData) {
      setDataOptionsTags(
        creationDataTagData.map((org) => ({
          label: org.name,
          value: org.id,
        })),
      );
    }
  }, [creationDataTagData]);

  useEffect(() => {
    if (creationDataCategoryData) {
      setDataOptionsLargeCategories(
        creationDataCategoryData.map((org) => ({
          label: org.name,
          value: org.name,
        })),
      );
      setDataOptionsMediumCategories(
        creationDataCategoryData.map((org) => ({
          label: org.name,
          value: org.name,
        })),
      );
      setDataOptionsSmallCategories(
        creationDataCategoryData.map((org) => ({
          label: org.name,
          value: org.name,
        })),
      );
    }
  }, [creationDataCategoryData]);

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

  const handleGetActualDurationsByStaff = async (selectedStaffId: number) => {
    const apiUrl = `${apiRouters.TASKS_SCHEDULES_LIST}?user_id=${selectedStaffId}`;
    const { data: response } = await api.get(apiUrl);
    return response;
  };

  const { mutate: getActualDurationsByStaff } = useMutation(
    handleGetActualDurationsByStaff,
    {
      onSuccess: async (data: TaskScheduleDetail[]) => {
        setActualDurationsByStaff(
          data.map((actualDuration: TaskScheduleDetail) => {
            return {
              value: actualDuration.id,
              label: actualDuration.title,
              type: actualDuration.type,
            };
          }),
        );
      },
      onSettled: () => {
        setIsActualDurationsByStaffLoading(false);
      },
    },
  );

  useEffect(() => {
    if (selectedStaff.value) {
      setSelectedActualDurationId(undefined);
      getActualDurationsByStaff(Number(selectedStaff.value));
    } else {
      setSelectedActualDurationId(undefined);
      setActualDurationsByStaff([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStaff]);

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
  return (
    <Fragment>
      <div className="flex flex-col border rounded-lg">
        <div
          className={`flex justify-between px-3 py-4 rounded-t-lg ${showFilter && 'border-b'} bg-gray-100`}>
          <span className="text-gray-700 text-base font-medium">検索</span>
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
            className={`flex flex-col gap-4 p-4 bg-white`}
            onSubmit={handleSubmit(onSubmit)}>
            <div className="flex gap-4">
              <div className="w-1/4">
                <div className="w-full flex items-end gap-4">
                  <div className="w-full">
                    <Controller
                      control={control}
                      name={'type'}
                      render={({ field: { onChange } }) => (
                        <Dropdown
                          label="タスク/予定"
                          options={[
                            { label: '選択', value: '' },
                            ...TASK_AND_EVENT_OPTIONS,
                          ]}
                          placeholder="選択してください"
                          className=""
                          onChange={onChange}
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
                      render={({ field: { onChange } }) => (
                        <Dropdown
                          label="集計タグ"
                          options={[
                            { label: '選択', value: '' },
                            ...dataOptionsTags,
                          ]}
                          placeholder="選択してください"
                          className=""
                          onChange={onChange}
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
                      render={({ field: { onChange } }) => (
                        <Dropdown
                          label="従業員"
                          options={[
                            { label: '選択', value: '' },
                            ...dataOptionsStaff,
                          ]}
                          placeholder="選択してください"
                          className=""
                          onChange={onChange}
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
                      render={({ field: { onChange } }) => (
                        <Dropdown
                          label="大カテゴリ"
                          options={[
                            { label: '未選択', value: 'null' },
                            ...dataOptionsLargeCategories,
                          ]}
                          placeholder="選択してください"
                          className=""
                          onChange={onChange}
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
                      render={({ field: { onChange } }) => (
                        <Dropdown
                          label="中カテゴリ"
                          options={[
                            { label: '未選択', value: 'null' },
                            ...dataOptionsMediumCategories,
                          ]}
                          placeholder="選択してください"
                          className=""
                          onChange={onChange}
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
                      render={({ field: { onChange } }) => (
                        <Dropdown
                          label="小カテゴリ"
                          options={[
                            { label: '未選択', value: 'null' },
                            ...dataOptionsSmallCategories,
                          ]}
                          placeholder="選択してください"
                          className=""
                          onChange={onChange}
                        />
                      )}
                    />
                  </div>
                </div>
              </div>
              <div className="w-1/4"></div>
            </div>
            <div className="flex justify-end">
              <Button
                variant="secondary"
                type="submit"
                className="w-28 !text-primary !bg-[#eaeeff] !rounded-lg !border-transparent">
                絞り込み
              </Button>
            </div>
          </form>
        </Transition>
      </div>
      {session?.user.permissions &&
        hasPermissionInArray(
          session?.user.permissions,
          PermissionsSystem.VIEW_ALL,
        ) && (
          <div className="flex justify-end gap-10">
            <div className="w-60">
              <Dropdown
                placeholder="従業員"
                classNameTextData=" !px-2 [&>div]:justify-center "
                classNameOption=""
                className=""
                options={dataOptionsStaff}
                selectedOption={{
                  label: selectedStaff.label,
                  value: selectedStaff.value,
                }}
                onChange={(e: OptionDropdownType) => {
                  setSelectedStaff(e);
                }}
              />
            </div>
            <div className="w-60">
              <Dropdown
                placeholder="タスク/予定を選択"
                classNameTextData="!px-2 [&>div]:justify-center "
                classNameOption=""
                className="h-[45px]"
                options={actualDurationsByStaff}
                disabled={!actualDurationsByStaff.length}
                selectedOption={
                  selectedActualDurationId
                    ? actualDurationsByStaff.find(
                        (opt) => opt.value === selectedActualDurationId,
                      )
                    : undefined
                }
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
                    )
                  : ''
              }
              className={'flex'}>
              <Button disabled={!selectedActualDurationId} className="w-44">
                新規登録
              </Button>
            </Link>
          </div>
        )}
      <div className="w-full">
        <div
          className={`max-h-[calc(100vh_-_290px)] ${expanded ? 'max-w-[calc(100vw_-_250px)]' : 'max-w-[calc(100vw_-_120px)]'} overflow-x-auto ring-1 ring-gray-200 rounded-tl-lg rounded-tr-lg bg-white`}>
          <div className="sticky top-0 z-10 grid grid-cols-[100px_150px_250px_400px_400px_120px_150px_400px_150px] [&>div]:bg-[#F3F4F6] text-[#374151]">
            <div className="px-5 py-3 w-[100px] font-medium flex items-center justify-center">
              ID
            </div>
            <div className="px-5 py-3 w-[150px] font-medium">タスク/予定</div>
            <div className="px-5 py-3 w-[250px] font-medium">タイトル</div>
            <div className="px-5 py-3 w-[400px] font-medium">カテゴリ</div>
            <div className="px-5 py-3 w-[400px] font-medium">集計タグ</div>
            <div className="px-5 py-3 w-[120px] font-medium">作成日時</div>
            <div className="px-5 py-3 w-[150px] font-medium">計測時間</div>
            <div className="px-5 py-3 w-[400px] font-medium">従業員</div>
            <div className="px-5 py-3 w-[150px] font-medium flex items-center justify-center">
              操作
            </div>
          </div>
          <div className="!bg-white relative">
            {dataActualDurations && dataActualDurations.length ? (
              dataActualDurations.map((element, index) => (
                <div className="flex relative text-[#4B5563]" key={index}>
                  <div className="w-[100px] border-b-[1px]">
                    <p className="w-[100px] py-3 flex justify-center items-center">
                      {element.id}
                    </p>
                  </div>
                  <div className="text-left w-[150px] border-b-[1px]">
                    <p className=" w-[150px] px-5 py-3 flex justify-start items-center">
                      {element.type == ItemStartType.TASK
                        ? WorkItemType.Task
                        : WorkItemType.Event}
                    </p>
                  </div>
                  <div className="text-left w-[250px] border-b-[1px]">
                    <p className="w-[250px] px-5 py-3 truncate">
                      {element.title}
                    </p>
                  </div>
                  <div className="text-left w-[400px] border-b-[1px]">
                    <p className="w-[400px] px-5 py-3 break-words">
                      {[
                        element?.categories.find(
                          (category) =>
                            category.type == EventWorkCategory.LARGE,
                        ),
                        element?.categories.find(
                          (category) =>
                            category.type == EventWorkCategory.MEDIUM,
                        ),
                        element?.categories.find(
                          (category) =>
                            category.type == EventWorkCategory.SMALL,
                        ),
                      ].some(Boolean)
                        ? [
                            element?.categories.find(
                              (category) =>
                                category.type == EventWorkCategory.LARGE,
                            )?.name || NO_OPTION_CATEGORY,
                            element?.categories.find(
                              (category) =>
                                category.type == EventWorkCategory.MEDIUM,
                            )?.name || NO_OPTION_CATEGORY,
                            element?.categories.find(
                              (category) =>
                                category.type == EventWorkCategory.SMALL,
                            )?.name || NO_OPTION_CATEGORY,
                          ]
                            .filter(Boolean)
                            .join('＞')
                        : '未設定'}
                    </p>
                  </div>
                  <div className="text-left w-[400px] border-b-[1px]">
                    <p className="w-[400px] px-5 py-3 break-words">
                      {element.tags.map((tag, index) => {
                        return (
                          <span key={index}>
                            {tag.name}{' '}
                            {index != element.tags.length - 1 && '／'}
                          </span>
                        );
                      })}
                    </p>
                  </div>
                  <div className="text-left w-[120px] border-b-[1px]">
                    <p className="w-[120px] px-5 py-3 flex justify-start items-center">
                      {getSubmitLevelFormattedDate(
                        new Date(element.createdAt as Date),
                      )}
                    </p>
                  </div>
                  <div className="text-left w-[150px] border-b-[1px]">
                    <p className="w-[150px] px-5 py-3 flex justify-start items-center">
                      {element.pausedAt
                        ? calculateActualDuration(
                            String(element.startedAt),
                            element.pausedAt ? String(element.pausedAt) : '',
                          )
                        : '計測中'}
                    </p>
                  </div>
                  <div className="text-left w-[400px] border-b-[1px]">
                    <p className="w-[400px] break-words px-5 py-3">
                      {element.staffs?.map((staff, index) => {
                        return (
                          <span key={index}>
                            {staff}{' '}
                            {index !== element?.staffs?.length - 1 && '／'}
                          </span>
                        );
                      })}
                    </p>
                  </div>
                  <div className="w-[150px] border-b-[1px]">
                    <div className="flex w-[150px] px-5 py-3 gap-2 justify-center items-center">
                      <Link
                        href={pageRouters.DETAIL_ACTUAL_DURATIONS.href(
                          `${element.id}`,
                        )}>
                        <ImageRound
                          name="Detail"
                          src={'/icons/detail.svg'}
                          className="w-6 h-6 hover:cursor-pointer"
                        />
                      </Link>
                      {element.pausedAt ? (
                        <Link
                          href={pageRouters.EDIT_ACTUAL_DURATIONS.href(
                            `${element.id}`,
                            `${element.type}`,
                          )}>
                          <ImageRound
                            name="Edit"
                            src={'/icons/edit.svg'}
                            className={`w-6 h-6 hover:cursor-pointer`}
                          />
                        </Link>
                      ) : (
                        <div className="w-6 h-6"></div>
                      )}
                      <ImageRound
                        name="Delete"
                        src={'/icons/delete.svg'}
                        className={`w-6 h-6 hover:cursor-pointer`}
                        onClick={() =>
                          handleOpenDeleteActualDurationModal(element)
                        }
                      />
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-5 text-sm leading-6 h-14 relative">
                <div
                  className={`flex justify-center items-center text-[#4B5563]`}>
                  {NO_DATA_AVAILABLE}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
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
    </Fragment>
  );
};

export default ListActualDurations;
