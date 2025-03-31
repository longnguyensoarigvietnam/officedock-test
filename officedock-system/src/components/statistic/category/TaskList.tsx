import React, { useContext, useState } from 'react';

import Dropdown from '@components/common/Dropdown';
import ImageRound from '@components/common/ImageRound';
import Pagination from '@components/common/Pagination';
import Checkbox from '@components/common/Checkbox';
import MultiSelectDropdown from '@components/common/MultiSelectDropdown';
import FormSkeleton from '@components/common/SkeletonLoading/FormSkeleton';
import TableChart from './TableChart';

import { PAGINATION_PAGE_SIZE_KANBAN } from '@constants';
import {
  CreationStatisticType,
  DataTaskListStatisticListType,
  StatisticsCategories,
} from '@interfaces/statistic';
import { OptionDropdownType } from '@interfaces/common';

import useStatisticTask from '@hooks/useStatisticTask';
import useStatisticTaskCompare from '@hooks/useStatisticTaskCompare';

import { formatDateToYMD, formatShowDateJapanese } from '@utils/date';
import { StatisticStateContext } from '@providers/StatisticProvider';

type Props = {
  isCheckCompare: boolean;
  startDate: Date;
  endDate: Date | null;
  startDateCompare: Date;
  endDateCompare: Date | null;
  statisticCategoryList: StatisticsCategories | undefined;
  creationDataStatisticData: CreationStatisticType[];
  handleSelectOrganization: (data: OptionDropdownType) => void;
  handleSelectLarge: (data: OptionDropdownType) => void;
  handleSelectMedium: (data: OptionDropdownType) => void;
  handleSelectSmall: (data: OptionDropdownType) => void;
  removeTag: (selected: OptionDropdownType) => void;
};

const TaskListStatistic = ({
  startDate,
  endDate,
  startDateCompare,
  endDateCompare,
  isCheckCompare,
  creationDataStatisticData,
  statisticCategoryList,
  removeTag,
  handleSelectLarge,
  handleSelectMedium,
  handleSelectSmall,
  handleSelectOrganization,
}: Props) => {
  const {
    smallOptions,
    largeOptions,
    mediumOptions,
    listOptionsOrganization,
    selectedLarge,
    selectedMedium,
    selectedOrganization,
    selectedSmall,
    selectedTags,
    tagsOptions,
    totalDurationTask,
    totalDurationTaskCompare,
    isSkeletonCategoryTask,
    isSkeletonCategoryTaskCompare,
    setSelectedTags,
  } = useContext(StatisticStateContext);

  const [isExtendData, setIsExtendData] = useState(true);

  // Value
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [taskList, setTaskList] = useState<DataTaskListStatisticListType[]>([]);

  // Value Compare
  const [currentPageCompare, setCurrentPageCompare] = useState<number>(1);
  const [totalPagesCompare, setTotalPagesCompare] = useState<number>(1);
  const [taskListCompare, setTaskListCompare] = useState<
    DataTaskListStatisticListType[]
  >([]);

  const [ordering, setOrdering] = useState<string>('');
  const [pageSize, setPageSize] = useState<number>(PAGINATION_PAGE_SIZE_KANBAN);
  const [isShowCompare, setIsShowCompare] = useState(false);

  const getTotalDuration = () => {
    if (totalDurationTask) {
      return totalDurationTask;
    }
    return '';
  };
  // Get total compare
  const getTotalDurationCompare = () => {
    if (totalDurationTaskCompare) {
      return totalDurationTaskCompare;
    }
    return '';
  };

  useStatisticTask({
    parentData: statisticCategoryList,
    filter: {
      fromDate: formatDateToYMD(startDate) || '',
      endDate: formatDateToYMD(`${endDate}`) || '',
      organizationIds: String(selectedOrganization?.value || ''),
      largeCategoryId: selectedLarge?.value as number,
      mediumCategoryId: selectedMedium?.value as number,
      smallCategoryId: selectedSmall?.value as number,
      page: currentPage,
      totalDuration: getTotalDuration(),
      ordering: ordering,
      pageSize: pageSize,
      tagIds: selectedTags,
    },
    onSuccess: (data) => {
      if (data) {
        setTotalPages(data.numPages);
        if (data.results) {
          setTaskList(data.results);
        }
      }
    },
  });
  useStatisticTaskCompare({
    filter: {
      fromDate: formatDateToYMD(startDateCompare) || '',
      endDate: formatDateToYMD(`${endDateCompare}`) || '',
      organizationIds: String(selectedOrganization?.value || ''),
      largeCategoryId: selectedLarge?.value as number,
      mediumCategoryId: selectedMedium?.value as number,
      smallCategoryId: selectedSmall?.value as number,
      page: currentPage,
      totalDuration: getTotalDurationCompare(),
      ordering: ordering,
      pageSize: pageSize,
      isCompare: isCheckCompare && isShowCompare,
      tagIds: selectedTags,
    },
    onSuccess: (data) => {
      if (data) {
        setTotalPagesCompare(data.numPages);
        if (data.results) {
          setTaskListCompare(data.results);
        }
      }
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
      className="p-[30px] bg-[#F8FAFC] my-5 rounded-[14px] mb-10">
      {/* Header & sort */}
      <div className="flex justify-between">
        <div className="flex items-center gap-x-5">
          <div className="flex items-center gap-[10px] ">
            <ImageRound
              className={`w-5 h-5  hover:cursor-pointer relative top-[2px]`}
              name="period icon"
              src={`/icons/task-active.svg`}
            />
            <span className="text-[18px] text-black font-semibold relative top-[2px]">
              タスク一覧
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-[240px]  relative">
              <MultiSelectDropdown
                isShowIconFilter
                options={tagsOptions}
                placeholder="集計対象のタグを選択"
                labelOptionClass="break-all"
                className="!h-[14px] !py-0 text-sm font-normal !rounded-md"
                selectedOptions={selectedTags || []}
                onChange={(selected) => {
                  let updatedTagIds = [];
                  const currentTagIds = selectedTags || [];
                  const foundItemIndex = currentTagIds.findIndex(
                    (tag) => tag.value == selected.value,
                  );
                  if (foundItemIndex == -1) {
                    updatedTagIds = [...currentTagIds, selected];
                  } else {
                    updatedTagIds = currentTagIds.filter(
                      (tag) => tag.value != selected.value,
                    );
                  }
                  setSelectedTags(updatedTagIds);
                }}
              />
              {selectedTags.length === 0 && (
                <span className="text-xs absolute text-[#77858F] top-[2px] right-[135px]">
                  タグの絞り込み
                </span>
              )}
            </div>
            <div className="relative right-[224px] top-0">
              <div className="flex gap-2 ">
                {selectedTags.map((item) => {
                  return (
                    <div
                      key={item.value}
                      className="min-w-[66px] w-fit  h-6 px-[10px] bg-[#77858F] justify-between gap-[6px] text-xs text-white font-medium flex items-center truncate rounded-[20px] ">
                      <span className="min-w-[32px]  truncate">
                        {item.label}
                      </span>
                      <ImageRound
                        onClick={() => {
                          removeTag(item);
                        }}
                        src={`/icons/close-white.svg`}
                        name="close"
                        className="w-fit h-fit cursor-pointer"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
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
          <div>
            <div className="flex items-end  justify-between px-[30px] text-sm font-medium">
              <div className="w-[220px] ">
                <div className="mt-4">
                  <Dropdown
                    label="チーム選択"
                    placeholder="-"
                    placeholderClass="!text-black text-sm font-normal"
                    className="!h-[34px] !rounded-md !border text-sm font-normal !py-0 !border-[#77858F]"
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
              <div className="w-[220px] ">
                <div className="mt-4">
                  <Dropdown
                    label="大カテゴリー選択"
                    placeholder="-"
                    placeholderClass="!text-black text-sm font-normal"
                    className="!h-[34px] !rounded-md !border text-sm font-normal !py-0 !border-[#77858F]"
                    labelTextClass="!text-[#77858F] !text-xs !font-medium"
                    classNameOption="!text-sm"
                    options={largeOptions}
                    selectedOption={selectedLarge || undefined}
                    onChange={(data) => handleSelectLarge(data)}
                    disabled={!selectedOrganization}
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
                    className="!h-[34px] !rounded-md !border text-sm font-normal !py-0 !border-[#77858F]"
                    labelTextClass="!text-[#77858F] !text-xs !font-medium"
                    classNameOption="!text-sm"
                    options={mediumOptions}
                    selectedOption={selectedMedium || undefined}
                    onChange={(data) => handleSelectMedium(data)}
                    disabled={!selectedLarge}
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
                    className="!h-[34px] !rounded-md !border text-sm font-normal !py-0 !border-[#77858F]"
                    labelTextClass="!text-[#77858F] !text-xs !font-medium"
                    classNameOption="!text-sm"
                    options={smallOptions}
                    selectedOption={selectedSmall || undefined}
                    onChange={(data) => handleSelectSmall(data)}
                    disabled={!selectedMedium}
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
                    onChange={() => setIsShowCompare(false)}
                    className="!rounded-full"
                    classSize="!rounded-full"
                  />
                </div>
                <p className="h-[18px] w-[58px] rounded-sm bg-[#EBF1F7] font-medium text-xs text-[#0068B6] flex items-center justify-center">
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
                    onChange={() => setIsShowCompare(true)}
                    className="!rounded-full"
                    classSize="!rounded-full"
                  />
                </div>
                <p className="h-[18px] w-[58px] rounded-sm bg-[#F9EAEA] font-medium text-xs text-[#C32E2E] flex items-center justify-center">
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
            {isSkeletonCategoryTask ||
            (isShowCompare && isSkeletonCategoryTaskCompare) ? (
              <FormSkeleton />
            ) : (
              <TableChart
                ordering={ordering}
                taskList={
                  isCheckCompare && isShowCompare ? taskListCompare : taskList
                }
                totalDuration={
                  isCheckCompare && isShowCompare
                    ? getTotalDurationCompare()
                    : getTotalDuration()
                }
                listOptionsOrganization={listOptionsOrganization}
                creationDataStatisticData={creationDataStatisticData}
                setOrdering={(ord: string) => {
                  setOrdering(ord);
                }}
              />
            )}
          </div>
          <div className="flex justify-center top-[10px] relative min-h-16">
            {isShowCompare ? (
              taskListCompare && taskListCompare.length ? (
                <Pagination
                  onChange={(pageNumber) => setCurrentPageCompare(pageNumber)}
                  currentPage={currentPageCompare}
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
                    setPageSize(e.value as number);
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

export default TaskListStatistic;
