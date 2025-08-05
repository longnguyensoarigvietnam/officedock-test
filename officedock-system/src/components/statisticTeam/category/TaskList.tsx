import React, { useContext, useEffect, useState } from 'react';

import Dropdown from '@components/common/Dropdown';
import ImageRound from '@components/common/ImageRound';
import Pagination from '@components/common/Pagination';
import Checkbox from '@components/common/Checkbox';
import FormSkeleton from '@components/common/SkeletonLoading/FormSkeleton';
import CustomUserAvatar from '@components/common/AvatarIcon/CustomUserAvatar';
import TableChart from './TableChart';

import useStatisticTask from '@hooks/useStatisticTask';
import useStatisticTaskCompare from '@hooks/useStatisticTaskCompare';

import { DEFAULT_TIME_TEXT, PAGINATION_PAGE_SIZE_KANBAN } from '@constants';
import { OrganizationStatisticType } from '@constants/enums';

import {
  CreationStatisticType,
  DataTaskListStatisticListType,
  StatisticsCategories,
} from '@interfaces/statistic';
import { OptionDropdownType } from '@interfaces/common';
import { formatDateToYMD, formatShowDateJapanese } from '@utils/date';
import { StatisticTeamStateContext } from '@providers/StatisticTeamProvider';
import FilterTeamStatistic from './filter/FilterTeamStatistic';
import { removeDuplicateOptions } from '@utils';

type Props = {
  isCheckCompare: boolean;
  startDate: Date;
  endDate: Date | null;
  startDateCompare: Date;
  endDateCompare: Date | null;
  creationDataStatisticData: CreationStatisticType | undefined;
  statisticCategoryListTeam: StatisticsCategories | undefined;
  handleSelectOrganization: (data: OptionDropdownType) => void;
  handleSelectLarge: (data: OptionDropdownType) => void;
  handleSelectMedium: (data: OptionDropdownType) => void;
  handleSelectSmall: (data: OptionDropdownType) => void;
};

const TaskListTeamStatistic = ({
  startDate,
  endDate,
  startDateCompare,
  endDateCompare,
  isCheckCompare,
  creationDataStatisticData,
  handleSelectLarge,
  handleSelectMedium,
  handleSelectSmall,
  handleSelectOrganization,
}: Props) => {
  const {
    isHasLoading,
    smallOptions,
    largeOptions,
    mediumOptions,
    listOptionsOrganization,
    selectedLarge,
    selectedMedium,
    selectedOrganization,
    selectedSmall,
    isSkeletonCategoryTeamTask,
    isSkeletonCategoryTeamTaskCompare,
    currentPage,
    listMemberTeam,
    orderingOptions,
    dataMediumCalendar,
    setDataMediumCalendar,
    setCurrentPage,
  } = useContext(StatisticTeamStateContext);

  const [isExtendData, setIsExtendData] = useState(true);
  const [isOpenModalFilter, setIsOpenModalFilter] = useState(false);

  // Value
  const [totalPages, setTotalPages] = useState<number>(1);
  const [taskList, setTaskList] = useState<DataTaskListStatisticListType[]>([]);

  // Value Compare
  const [totalPagesCompare, setTotalPagesCompare] = useState<number>(1);
  const [taskListCompare, setTaskListCompare] = useState<
    DataTaskListStatisticListType[]
  >([]);

  const [ordering, setOrdering] = useState<string>('');
  const [pageSize, setPageSize] = useState<number>(PAGINATION_PAGE_SIZE_KANBAN);
  const [isShowCompare, setIsShowCompare] = useState(false);
  const [selectedMember, setSelectedMember] = useState<number | null>(null);

  // Total
  const [totalDuration, setTotalDuration] = useState<string>(DEFAULT_TIME_TEXT);
  const [totalDurationCompare, setTotalDurationCompare] =
    useState<string>(DEFAULT_TIME_TEXT);

  useStatisticTask({
    isTeam: true,
    filter: {
      fromDate: formatDateToYMD(startDate) || '',
      endDate: formatDateToYMD(`${endDate}`) || '',
      organizationIds: String(selectedOrganization?.value || ''),
      largeCategoryId: selectedLarge?.value as number,
      mediumCategoryId:
        selectedOrganization?.type == OrganizationStatisticType.CALENDAR &&
        dataMediumCalendar
          ? (dataMediumCalendar?.value as number)
          : (selectedMedium?.value as number),
      smallCategoryId: selectedSmall?.value as number,

      page: currentPage,
      ordering: ordering,
      pageSize: pageSize,
      user_id: selectedMember as number,
      user_ids: orderingOptions?.user_ids,
      tagIds: orderingOptions?.tag_ids,
    },
    conditions: [listMemberTeam.length !== 0],
    onSuccess: (data) => {
      if (data) {
        setTotalDuration(data.totalDuration || DEFAULT_TIME_TEXT);
        setTotalPages(data.numPages);
        if (data.results) {
          setTaskList(data.results);
        }
      }
    },
  });
  useStatisticTaskCompare({
    isTeam: true,
    filter: {
      fromDate: formatDateToYMD(startDateCompare) || '',
      endDate: formatDateToYMD(`${endDateCompare}`) || '',
      organizationIds: String(selectedOrganization?.value || ''),
      largeCategoryId: selectedLarge?.value as number,
      mediumCategoryId:
        selectedOrganization?.type == OrganizationStatisticType.CALENDAR &&
        dataMediumCalendar
          ? (dataMediumCalendar?.value as number)
          : (selectedMedium?.value as number),
      smallCategoryId: selectedSmall?.value as number,

      page: currentPage,
      ordering: ordering,
      pageSize: pageSize,
      tagIds: orderingOptions?.tag_ids,
      isCompare: isCheckCompare && isShowCompare,
      user_id: selectedMember as number,
    },
    conditions: [listMemberTeam.length !== 0],

    onSuccess: (data) => {
      if (data) {
        setTotalDurationCompare(data.totalDuration || DEFAULT_TIME_TEXT);
        setTotalPagesCompare(data.numPages);
        if (data.results) {
          setTaskListCompare(data.results);
        }
      }
    },
  });

  useEffect(() => {
    if (orderingOptions?.user_ids && orderingOptions.user_ids.length > 0) {
      setSelectedMember(orderingOptions.user_ids[0].value as number);
    } else {
      if (listMemberTeam && listMemberTeam.length > 0) {
        setSelectedMember(listMemberTeam[0].id);
      }
    }
  }, [listMemberTeam, orderingOptions]);

  const optionList = [
    {
      label: '30',
      value: 30,
    },
    {
      label: '50',
      value: 50,
    },
    {
      label: '70',
      value: 70,
    },
  ];

  return (
    <div
      id="task-list-statistic"
      style={{
        boxShadow: '0px 4px 10px 0px #0000000D',
      }}
      className="p-[30px] bg-[#F8FAFC] my-5 rounded-[30px] mb-10">
      {/* Header & sort */}
      <div className="flex justify-between">
        <div className="flex items-center gap-x-2">
          <div className="flex items-center gap-[10px] ">
            <ImageRound
              className={`w-5 h-5  hover:cursor-pointer relative top-[2px]`}
              name="period icon"
              src={`/icons/task-active.svg`}
            />
            <span className="text-[18px] w-[90px] flex-shrink-0 text-black font-semibold relative top-[2px]">
              タスク一覧
            </span>
          </div>
          {/* Filter modal */}
          <FilterTeamStatistic
            open={isOpenModalFilter}
            onOpen={() => setIsOpenModalFilter(!isOpenModalFilter)}
          />
        </div>
        <ImageRound
          src="/icons/extend-calendar.svg"
          name="Extend calendar"
          className={`!w-3 !h-3 hover:cursor-pointer ${
            isExtendData ? '-rotate-90' : 'rotate-90'
          }`}
          onClick={() => {
            setIsExtendData(!isExtendData);
          }}
        />
      </div>
      {isExtendData && (
        <>
          {/* Line */}
          <div className="w-full border-t border-[#D2DBE1] my-[30px]"></div>
          <div className="">
            <p className="px-8 text-xs font-medium text-[#77858F] mb-[14px]">
              表示させるメンバー
            </p>
            <div className="flex items-center flex-wrap gap-x-[30px] gap-y-[10px] px-8 mb-[10px]">
              {orderingOptions?.user_ids && orderingOptions?.user_ids.length > 0
                ? orderingOptions?.user_ids.map((member) => (
                    <div
                      key={member.value}
                      className="flex items-center gap-2 cursor-pointer">
                      <div className="w-4">
                        <Checkbox
                          isChecked={selectedMember === member.value}
                          disable={selectedMember === member.value}
                          onChange={() => {
                            setCurrentPage(1);

                            setSelectedMember(member.value as number);
                          }}
                          classSize="!rounded-full"
                        />
                      </div>
                      <div className="relative top-[2px]">
                        <CustomUserAvatar
                          avatarUrl={member?.avatarUrl || ''}
                          avatarColor={member?.color || ''}
                          size={30}
                        />
                      </div>
                      <span className="break-all max-w-[800px] w-full truncate text-sm">
                        {member.label}
                      </span>
                    </div>
                  ))
                : listMemberTeam.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center gap-2 cursor-pointer">
                      <div className="w-4">
                        <Checkbox
                          isChecked={selectedMember === member.id}
                          disable={selectedMember === member.id}
                          onChange={() => {
                            setCurrentPage(1);

                            setSelectedMember(member.id);
                          }}
                          classSize="!rounded-full"
                        />
                      </div>
                      <div className="relative top-[2px]">
                        <CustomUserAvatar
                          avatarUrl={member?.avatarUrl || ''}
                          avatarColor={member?.color || ''}
                          size={30}
                        />
                      </div>
                      <span className="break-all max-w-[800px] w-full truncate text-sm">
                        {member.fullName}
                      </span>
                    </div>
                  ))}
            </div>
            <div className="flex items-end justify-between px-[30px] text-sm font-medium">
              <div className="w-[220px]">
                <div className="mt-4">
                  <Dropdown
                    label="チーム選択"
                    placeholder="-"
                    disabled={isHasLoading}
                    placeholderClass="!text-black text-sm font-normal"
                    className="!h-[34px] !py-0 text-sm font-normal !rounded-md !border !border-[#77858F] "
                    labelTextClass="!text-[#77858F] !text-xs !font-medium"
                    classNameOption="!text-sm"
                    options={listOptionsOrganization}
                    selectedOption={selectedOrganization || undefined}
                    onChange={(data) => handleSelectOrganization(data)}
                  />
                </div>
              </div>
              <div className="">
                {isCheckCompare ? (
                  <ImageRound
                    className={`w-[14px] h-fit pb-[6px] `}
                    src="/icons/statistic-compare.svg"
                    name="icon chevron right"
                  />
                ) : (
                  <ImageRound
                    className={`w-fit h-fit pb-[2px]`}
                    src="/icons/drawer-blue.svg"
                    name="icon chevron right"
                  />
                )}
              </div>
              {/* Large category */}
              <div className="w-[220px]">
                <div className="mt-4">
                  <Dropdown
                    label="大カテゴリー選択"
                    placeholder="-"
                    placeholderClass="!text-black text-sm font-normal"
                    className="!h-[34px] !py-0 !rounded-md text-sm !border !border-[#77858F]"
                    labelTextClass="!text-[#77858F] !text-xs !font-medium"
                    classNameOption="!text-sm"
                    options={largeOptions}
                    selectedOption={selectedLarge || undefined}
                    onChange={(data) => handleSelectLarge(data)}
                    disabled={!selectedOrganization || isHasLoading}
                  />
                </div>
              </div>
              <div className="">
                {isCheckCompare ? (
                  <ImageRound
                    className={`w-[14px] h-fit pb-[6px] `}
                    src="/icons/statistic-compare.svg"
                    name="icon chevron right"
                  />
                ) : (
                  <ImageRound
                    className={`w-fit h-fit pb-[2px]`}
                    src="/icons/drawer-blue.svg"
                    name="icon chevron right"
                  />
                )}
              </div>
              {/* Medium category */}
              <div className="w-[220px]">
                <div className="mt-4">
                  <Dropdown
                    label="中カテゴリー選択"
                    placeholder="-"
                    placeholderClass="!text-black text-sm font-normal"
                    className="!h-[34px] !py-0 !rounded-md text-sm !border !border-[#77858F]"
                    labelTextClass="!text-[#77858F] !text-xs !font-medium"
                    classNameOption="!text-sm"
                    options={removeDuplicateOptions(mediumOptions)}
                    selectedOption={
                      selectedOrganization?.type ===
                      OrganizationStatisticType.CALENDAR
                        ? dataMediumCalendar
                        : selectedMedium || undefined
                    }
                    onChange={(data) => {
                      if (
                        selectedOrganization?.type ===
                        OrganizationStatisticType.CALENDAR
                      ) {
                        setDataMediumCalendar(data);
                      } else {
                        handleSelectMedium(data);
                      }
                    }}
                    disabled={!selectedLarge || isHasLoading}
                  />
                </div>
              </div>
              <div className="">
                {isCheckCompare ? (
                  <ImageRound
                    className={`w-[14px] h-fit pb-[6px] `}
                    src="/icons/statistic-compare.svg"
                    name="icon chevron right"
                  />
                ) : (
                  <ImageRound
                    className={`w-fit h-fit pb-[2px]`}
                    src="/icons/drawer-blue.svg"
                    name="icon chevron right"
                  />
                )}
              </div>
              {/* Small category */}
              <div className="w-[220px]">
                <div className="mt-4">
                  <Dropdown
                    label="小カテゴリー選択"
                    placeholder="-"
                    placeholderClass="!text-black text-sm font-normal"
                    className="!h-[34px] !py-0 !rounded-md text-sm !border !border-[#77858F]"
                    labelTextClass="!text-[#77858F] !text-xs !font-medium"
                    classNameOption="!text-sm"
                    options={smallOptions}
                    selectedOption={selectedSmall || undefined}
                    onChange={(data) => handleSelectSmall(data)}
                    disabled={!selectedMedium || isHasLoading}
                  />
                </div>
              </div>
            </div>
          </div>
          {isCheckCompare && (
            <div className="px-[30px] mt-[30px] mb-[10px] flex flex-col gap-[10px]">
              <div className="flex items-center gap-2">
                <div className="w-4">
                  <Checkbox
                    isChecked={!isShowCompare}
                    disable={!isShowCompare}
                    onChange={() => {
                      setCurrentPage(1);
                      setIsShowCompare(false);
                    }}
                    className="!rounded-full"
                    classSize="!rounded-full"
                  />
                </div>
                <p className="h-[18px] w-[58px] rounded-sm bg-[#EBF1F7] font-medium text-xs text-primary flex items-center justify-center">
                  基準期間
                </p>
                <div className="flex ml-[2px] text-sm font-normal text-black gap-[6px]">
                  <span>{startDate && formatShowDateJapanese(startDate)}</span>~
                  <span>{endDate && formatShowDateJapanese(endDate)}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4">
                  <Checkbox
                    isChecked={isShowCompare}
                    disable={isShowCompare}
                    onChange={() => {
                      setCurrentPage(1);
                      setIsShowCompare(true);
                    }}
                    className="!rounded-full"
                    classSize="!rounded-full"
                  />
                </div>
                <p className="h-[18px] w-[58px] rounded-sm bg-[#F9EAEA] font-medium text-xs text-[#E95062] flex items-center justify-center">
                  比較期間
                </p>
                <div className="flex ml-[2px] text-sm font-normal text-black gap-[6px]">
                  <span>
                    {startDateCompare &&
                      formatShowDateJapanese(startDateCompare)}
                  </span>
                  ~
                  <span>
                    {endDateCompare && formatShowDateJapanese(endDateCompare)}
                  </span>
                </div>
              </div>
            </div>
          )}
          <div className="mt-5 px-[30px]">
            {isSkeletonCategoryTeamTask ||
            (isShowCompare && isSkeletonCategoryTeamTaskCompare) ? (
              <FormSkeleton />
            ) : (
              <TableChart
                ordering={ordering}
                taskList={
                  isCheckCompare && isShowCompare ? taskListCompare : taskList
                }
                totalDuration={
                  isCheckCompare && isShowCompare
                    ? totalDurationCompare
                    : totalDuration
                }
                selectedMember={selectedMember}
                listOptionsOrganization={listOptionsOrganization}
                creationDataStatisticData={creationDataStatisticData}
                setOrdering={(ord: string) => {
                  setOrdering(ord);
                }}
                setTaskList={setTaskList}
                setTaskListCompare={setTaskListCompare}
              />
            )}
          </div>
          <div className="flex justify-center top-[10px] relative min-h-16">
            {isShowCompare ? (
              taskListCompare && taskListCompare.length ? (
                <Pagination
                  onChange={(pageNumber) => setCurrentPage(pageNumber)}
                  currentPage={currentPage}
                  totalPages={totalPagesCompare}
                />
              ) : null
            ) : taskList && taskList.length ? (
              <Pagination
                onChange={(pageNumber) => setCurrentPage(pageNumber)}
                currentPage={currentPage}
                totalPages={totalPages}
              />
            ) : null}

            <div className="absolute top-[5px] right-0 w-fit  flex gap-[6px] items-center">
              <div className="min-w-[66px] flex items-center">
                <Dropdown
                  selectedOption={optionList.find(
                    (item) => item.value === pageSize,
                  )}
                  options={optionList}
                  onChange={(e) => {
                    if (e.value !== pageSize) {
                      setCurrentPage(1);
                      setPageSize(e.value as number);
                    }
                  }}
                  className="h-[34px]  
                  !text-sm !py-0 !pl-[7px] !pr-0 !text-[#6B7280] mt-1 !bg-white !border-[#77858F]"
                  classNameOption="[&>li]:!pl-0 [&>li]:!pr-0 [&>li]:!text-sm text-sm [&>li]:!text-black top-[-115px]"
                />
              </div>
              <span className="font-normal text-sm text-black">件ずつ表示</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default TaskListTeamStatistic;
