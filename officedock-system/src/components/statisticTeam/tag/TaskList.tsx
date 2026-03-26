import React, {
  Fragment,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  Popover,
  PopoverButton,
  PopoverPanel,
  Transition,
} from '@headlessui/react';

import Dropdown from '@components/common/Dropdown';
import ImageRound from '@components/common/ImageRound';
import Pagination from '@components/common/Pagination';
import Checkbox from '@components/common/Checkbox';
import FormSkeleton from '@components/common/SkeletonLoading/FormSkeleton';
import CustomUserAvatar from '@components/common/AvatarIcon/CustomUserAvatar';
import { DynamicTooltip } from '@components/tooltip/DynamicTooltip';
import TableChart from './TableChart';
import FilterTagTeam from './filter/FilterTagTeam';

import useStatisticTaskCompare from '@hooks/useStatisticTaskCompare';
import {
  ALL_TEAMS_OPTION,
  DEFAULT_TIME_TEXT,
  PAGINATION_PAGE_SIZE_KANBAN,
} from '@constants';
import useStatisticTask from '@hooks/useStatisticTask';
import { useTaskListDownload } from '@hooks/useTaskListDownload';

import { ExportType, OrganizationStatisticType } from '@constants/enums';

import {
  CreationStatisticType,
  DataTaskListStatisticListType,
  StatisticsCategories,
} from '@interfaces/statistic';
import { OptionDropdownType } from '@interfaces/common';

import { formatDateToYMD, formatShowDateJapanese } from '@utils/date';
import { removeDuplicateOptions } from '@utils';

import { StatisticTeamTagsStateContext } from '@providers/StatisticTeamProviderTag';
import { GlobalStateContext } from '@providers/GlobalStateProvider';

type Props = {
  isCheckCompare: boolean;
  startDate: Date;
  endDate: Date | null;
  startDateCompare: Date;
  endDateCompare: Date | null;
  statisticTagsListTeam: StatisticsCategories | undefined;
  creationDataStatisticData: CreationStatisticType | undefined;
  handleSelectOrganization: (data: OptionDropdownType) => void;
  handleSelectLarge: (data: OptionDropdownType) => void;
  handleSelectMedium: (data: OptionDropdownType) => void;
  handleSelectSmall: (data: OptionDropdownType) => void;
};

const TaskListStatisticTeamTags = ({
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
    listMemberTeam,
    isSkeletonTagTeamTask,
    isSkeletonTagTeamTaskCompare,
    currentPage,
    dataMediumCalendar,
    orderingOptions,
    setDataMediumCalendar,
    setCurrentPage,
  } = useContext(StatisticTeamTagsStateContext);

  const { selectedOrganization: selectedOrganizationTeamList } =
    useContext(GlobalStateContext);

  const [isExtendData, setIsExtendData] = useState(true);

  // Value
  const [totalPages, setTotalPages] = useState<number>(1);
  const [taskList, setTaskList] = useState<DataTaskListStatisticListType[]>([]);

  const [selectedMembers, setSelectedMembers] = useState<number[]>([]);
  const memberOptions = useMemo(() => {
    if (orderingOptions?.user_ids && orderingOptions.user_ids.length > 0) {
      return orderingOptions.user_ids.map((member) => ({
        id: Number(member.value),
        label: member.label,
        avatarUrl: member?.avatarUrl || '',
        color: member?.color || '',
      }));
    }

    return listMemberTeam.map((member) => ({
      id: Number(member.id),
      label: member.fullName,
      avatarUrl: member?.avatarUrl || '',
      color: member?.color || '',
    }));
  }, [listMemberTeam, orderingOptions]);

  const uids = selectedMembers.join(',');
  const selectedMember = selectedMembers[0] ?? null;
  const isMultipleMembersSelected = selectedMembers.length > 1;
  const isAllMembersChecked =
    memberOptions.length > 0 &&
    memberOptions.every((member) => selectedMembers.includes(member.id));

  // Value Compare
  const [totalPagesCompare, setTotalPagesCompare] = useState<number>(1);
  const [taskListCompare, setTaskListCompare] = useState<
    DataTaskListStatisticListType[]
  >([]);

  const [ordering, setOrdering] = useState<string>('');
  const [pageSize, setPageSize] = useState<number>(PAGINATION_PAGE_SIZE_KANBAN);
  const [isShowCompare, setIsShowCompare] = useState(false);

  // Total
  const [totalDuration, setTotalDuration] = useState<string>(DEFAULT_TIME_TEXT);
  const [totalDurationCompare, setTotalDurationCompare] =
    useState<string>(DEFAULT_TIME_TEXT);

  useEffect(() => {
    setSelectedMembers(memberOptions.map((member) => member.id));
  }, [memberOptions]);

  useStatisticTask({
    isTeam: true,
    is_tag_page: true,
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
      tagIds: orderingOptions?.tag_ids,
      uids: uids,
      user_ids: orderingOptions?.user_ids,
      mainOrganizationId:
        selectedOrganization?.value === ALL_TEAMS_OPTION
          ? (selectedOrganizationTeamList?.value as number)
          : undefined,
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
    is_tag_page: true,

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
      uids: uids,
      user_ids: orderingOptions?.user_ids,
      mainOrganizationId:
        selectedOrganization?.value === ALL_TEAMS_OPTION
          ? (selectedOrganizationTeamList?.value as number)
          : undefined,
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

  const { downloadTaskListFile } = useTaskListDownload({
    isTeam: true,
    is_tag_page: true,
    filter: {
      fromDate:
        isCheckCompare && isShowCompare
          ? formatDateToYMD(startDateCompare) || ''
          : formatDateToYMD(startDate) || '',
      endDate:
        isCheckCompare && isShowCompare
          ? formatDateToYMD(`${endDateCompare}`) || ''
          : formatDateToYMD(`${endDate}`) || '',
      organizationIds: String(selectedOrganization?.value || ''),
      largeCategoryId: selectedLarge?.value as number,
      mediumCategoryId:
        selectedOrganization?.type == OrganizationStatisticType.CALENDAR &&
        dataMediumCalendar
          ? (dataMediumCalendar?.value as number)
          : (selectedMedium?.value as number),
      smallCategoryId: selectedSmall?.value as number,
      ordering: ordering,
      tagIds: orderingOptions?.tag_ids,
      uids: uids,
      user_ids: orderingOptions?.user_ids,
      isCompare: isCheckCompare && isShowCompare,
    },
  });

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
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-x-5">
          <div className="flex items-center gap-[10px] ">
            <ImageRound
              className={`w-5 h-5  hover:cursor-pointer`}
              name="period icon"
              src={`/icons/task-active.svg`}
            />
            <span className="text-[18px] text-black font-semibold">
              タグの中のタスク一覧
            </span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {/* Download button */}
          <Popover className="relative">
            {({ close }) => {
              return (
                <>
                  <PopoverButton className={`focus:outline-none`}>
                    <div className="w-[120px] h-[34px] relative bg-[#77858F] pl-[10px] flex items-center gap-[6px] rounded-[8px]">
                      <p className="text-sm font-medium text-white">
                        ダウンロード
                      </p>
                      <ImageRound
                        name="Arrow down icon"
                        src={'/icons/white-arrow-down.svg'}
                        className="w-[8px] h-[4px] cursor-pointer"
                      />
                    </div>
                  </PopoverButton>
                  <Transition
                    as={Fragment}
                    enter="transition ease-out duration-200"
                    enterFrom="opacity-0 translate-y-1"
                    enterTo="opacity-100 translate-y-0"
                    leave="transition ease-in duration-150"
                    leaveFrom="opacity-100 translate-y-0"
                    leaveTo="opacity-0 translate-y-1">
                    <PopoverPanel className="absolute left-0 z-10 min-w-[120px] max-w-[120px] transform">
                      <div className="bg-white !border-[#77858F] border-[1px] text-black rounded-[6px] mt-[6px] p-1 text-sm font-medium">
                        {isMultipleMembersSelected ? (
                          <DynamicTooltip
                            content="アーカイブタスクを見る"
                            placement="bottom">
                            <p
                              className={`py-[10px] pl-2 border-b-[1px] border-[#EBF1F7] !leading-none ${
                                isMultipleMembersSelected
                                  ? 'cursor-not-allowed text-[#9CA3AF]'
                                  : 'hover:cursor-pointer'
                              }`}
                              onClick={() => {
                                if (isMultipleMembersSelected) return;
                                downloadTaskListFile(ExportType.CSV);
                                close();
                              }}>
                              CSV
                            </p>
                          </DynamicTooltip>
                        ) : (
                          <p
                            className={`py-[10px] pl-2 border-b-[1px] border-[#EBF1F7] !leading-none ${
                              isMultipleMembersSelected
                                ? 'cursor-not-allowed text-[#9CA3AF]'
                                : 'hover:cursor-pointer'
                            }`}
                            onClick={() => {
                              if (isMultipleMembersSelected) return;
                              downloadTaskListFile(ExportType.CSV);
                              close();
                            }}>
                            CSV
                          </p>
                        )}
                        <p
                          className="hover:cursor-pointer py-[10px] pl-2 !leading-none"
                          onClick={() => {
                            downloadTaskListFile(ExportType.XLSX);
                            close();
                          }}>
                          Excel
                        </p>
                      </div>
                    </PopoverPanel>
                  </Transition>
                </>
              );
            }}
          </Popover>
          <ImageRound
            src="/icons/extend-calendar.svg"
            name="Extend calendar"
            className={`!w-[14px] !h-[14px] hover:cursor-pointer ${
              isExtendData ? '-rotate-90' : 'rotate-90'
            }`}
            onClick={() => {
              setIsExtendData(!isExtendData);
            }}
          />
        </div>
      </div>
      {isExtendData && (
        <>
          {/* Line */}
          <div className="w-full border-t border-[#D2DBE1] my-[30px]"></div>
          <div>
            {/* List tags  */}
            <div>
              <div className="flex justify-between w-full mb-[30px] px-[30px]">
                {/* Filter tag */}
                <FilterTagTeam />
              </div>
            </div>
            <p className="px-8 text-xs font-medium text-[#77858F] mb-[14px]">
              表示させるメンバー
            </p>
            <div className="flex items-center flex-wrap gap-x-[30px] gap-y-[10px] px-8 mb-[30px]">
              <div className="flex items-center gap-2">
                <div className="w-4">
                  <Checkbox
                    isChecked={isAllMembersChecked}
                    onChange={() => {
                      setCurrentPage(1);
                      setSelectedMembers(
                        isAllMembersChecked
                          ? []
                          : memberOptions.map((member) => member.id),
                      );
                    }}
                    classSize=" !opacity-100"
                  />
                </div>
                <span className="break-all w-full max-w-[800px] truncate text-sm">
                  全てのメンバー
                </span>
              </div>

              {memberOptions.map((member) => (
                <div key={member.id} className="flex items-center gap-2">
                  <div className="w-4">
                    <Checkbox
                      isChecked={selectedMembers.includes(member.id)}
                      onChange={() => {
                        setCurrentPage(1);
                        setSelectedMembers((prev) =>
                          prev.includes(member.id)
                            ? prev.filter((id) => id !== member.id)
                            : [...prev, member.id],
                        );
                      }}
                      classSize=" !opacity-100"
                    />
                  </div>
                  <div className="relative top-[2px]">
                    <CustomUserAvatar
                      avatarUrl={member.avatarUrl}
                      avatarColor={member.color}
                      size={30}
                    />
                  </div>
                  <span className="break-all w-full max-w-[800px] truncate text-sm">
                    {member.label}
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
                    className="!h-[34px] !py-0 text-sm !rounded-md !border !border-[#77858F]"
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
                    className="!h-[34px] !py-0 text-sm !rounded-md !border !border-[#77858F]"
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
                    className="!h-[34px] !py-0 text-sm !rounded-md !border !border-[#77858F]"
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
                    disabled={selectedLarge?.value == '' || isHasLoading}
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
                    className="!h-[34px] !py-0 text-sm !rounded-md !border !border-[#77858F]"
                    labelTextClass="!text-[#77858F] !text-xs !font-medium"
                    classNameOption="!text-sm"
                    options={smallOptions}
                    selectedOption={selectedSmall || undefined}
                    onChange={(data) => handleSelectSmall(data)}
                    disabled={
                      selectedMedium?.value == '' ||
                      selectedOrganization?.value !==
                        selectedOrganizationTeamList?.value ||
                      isHasLoading
                    }
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
            {isSkeletonTagTeamTask ||
            (isShowCompare && isSkeletonTagTeamTaskCompare) ? (
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
                listOptionsOrganization={listOptionsOrganization.filter(
                  (item) => !item.isHidden,
                )}
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

export default TaskListStatisticTeamTags;
