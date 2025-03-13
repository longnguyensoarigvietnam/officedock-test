import React, { useState } from 'react';
import Dropdown from '@components/common/Dropdown';
import ImageRound from '@components/common/ImageRound';
import Pagination from '@components/common/Pagination';
import TableChart from '../TableChart';
import {
  CreationStatisticType,
  DataTaskListStatisticListType,
  StatisticsCategories,
} from '@interfaces/statistic';
import { OptionDropdownType } from '@interfaces/common';
import useStatisticTask from '@hooks/useStatisticTask';
import { formatDateToYMD } from '@utils/date';

type Props = {
  selectedSmall: OptionDropdownType | null;
  startDate: Date;
  endDate: Date | null;
  totalDurationLarge: string;
  totalDurationMedium: string;
  totalDurationSmall: string;
  statisticCategoryList: StatisticsCategories | undefined;
  listOptionsOrganization: OptionDropdownType[];
  largeOptions: OptionDropdownType[];
  selectedOrganization: OptionDropdownType | null;
  selectedLarge: OptionDropdownType | null;
  mediumOptions: OptionDropdownType[];
  selectedMedium: OptionDropdownType | null;
  smallOptions: OptionDropdownType[];
  handleSelectOrganization: (data: OptionDropdownType) => void;
  handleSelectLarge: (data: OptionDropdownType) => void;
  handleSelectMedium: (data: OptionDropdownType) => void;
  handleSelectSmall: (data: OptionDropdownType) => void;
  creationDataStatisticData: CreationStatisticType[];
};

const TaskListStatistic = ({
  startDate,
  endDate,
  smallOptions,
  listOptionsOrganization,
  selectedSmall,
  selectedOrganization,
  selectedLarge,
  selectedMedium,
  largeOptions,
  mediumOptions,
  totalDurationLarge,
  totalDurationMedium,
  totalDurationSmall,
  creationDataStatisticData,
  handleSelectLarge,
  handleSelectMedium,
  handleSelectSmall,
  handleSelectOrganization,
}: Props) => {
  const [isExtendData, setIsExtendData] = useState(true);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [ordering, setOrdering] = useState<string>('');

  const [taskList, setTaskList] = useState<DataTaskListStatisticListType[]>([]);
  const getTotalDuration = () => {
    if (selectedOrganization?.value) {
      if (selectedLarge?.value) {
        if (selectedMedium?.value) {
          return totalDurationSmall;
        }
        return totalDurationMedium;
      }
      return totalDurationLarge;
    }
    return '00:00:00';
  };

  useStatisticTask({
    filter: {
      fromDate: formatDateToYMD(startDate) || '',
      endDate: formatDateToYMD(`${endDate}`) || '',
      organizationIds: String(selectedOrganization?.value || ''),
      largeCategoryId: Number(selectedLarge?.value),
      mediumCategoryId: Number(selectedMedium?.value),
      page: currentPage,
      totalDuration: getTotalDuration(),
      ordering: ordering,
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
          <div className="flex items-center gap-1 ">
            <ImageRound
              className={`w-[14px] h-[14px]  hover:cursor-pointer relative top-[2px]`}
              name="Sort icon"
              src={`/icons/sort.svg`}
            />
            <span className="text-xs text-[#77858F] relative top-[2px]">
              タグの絞り込み
            </span>
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
            <div className="flex items-end gap-[20px] justify-center px-[30px] text-sm font-medium">
              <div className="w-1/4 ">
                <div className="mt-4">
                  <Dropdown
                    label="チーム選択"
                    className="!h-[34px] !py-0 text-sm font-normal !rounded-md !border !border-[#77858F] "
                    labelTextClass="!text-[#77858F] !text-xs !font-medium"
                    options={listOptionsOrganization}
                    selectedOption={selectedOrganization || undefined}
                    onChange={(data) => handleSelectOrganization(data)}
                  />
                </div>
              </div>
              <div className="pb-1.5">
                <ImageRound
                  className={`w-fit h-fit `}
                  src="/icons/drawer-blue.svg"
                  name="icon chevron right"
                />
              </div>
              {/* Large category */}
              <div className="w-1/4 ">
                <div className="mt-4">
                  <Dropdown
                    label="大カテゴリー選択"
                    className="!h-[34px] !py-0 !rounded-md !border !border-[#77858F]"
                    labelTextClass="!text-[#77858F] !text-xs !font-medium"
                    options={largeOptions}
                    selectedOption={selectedLarge || undefined}
                    onChange={(data) => handleSelectLarge(data)}
                    disabled={!selectedOrganization}
                  />
                </div>
              </div>
              <div className="pb-1.5">
                <ImageRound
                  className={`w-fit h-fit `}
                  src="/icons/drawer-blue.svg"
                  name="icon chevron right"
                />
              </div>
              {/* Medium category */}
              <div className="w-1/4">
                <div className="mt-4">
                  <Dropdown
                    label="中カテゴリー選択"
                    className="!h-[34px] !py-0 !rounded-md !border !border-[#77858F]"
                    labelTextClass="!text-[#77858F] !text-xs !font-medium"
                    options={mediumOptions}
                    selectedOption={selectedMedium || undefined}
                    onChange={(data) => handleSelectMedium(data)}
                    disabled={!selectedLarge}
                  />
                </div>
              </div>
              <div className="pb-1.5">
                <ImageRound
                  className={`w-fit h-fit `}
                  src="/icons/drawer-blue.svg"
                  name="icon chevron right"
                />
              </div>
              {/* Small category */}
              <div className="w-1/4">
                <div className="mt-4">
                  <Dropdown
                    label="小カテゴリー選択"
                    className="!h-[34px] !py-0 !rounded-md !border !border-[#77858F]"
                    labelTextClass="!text-[#77858F] !text-xs !font-medium"
                    options={smallOptions}
                    selectedOption={selectedSmall || undefined}
                    onChange={(data) => handleSelectSmall(data)}
                    disabled={!selectedMedium}
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="mt-5 px-[30px]">
            <TableChart
              ordering={ordering}
              taskList={taskList}
              totalDuration={getTotalDuration()}
              listOptionsOrganization={listOptionsOrganization}
              creationDataStatisticData={creationDataStatisticData}
              setOrdering={(ord: string) => {
                setOrdering(ord);
              }}
            />
          </div>
          <div className="flex justify-center">
            {taskList && taskList.length ? (
              <Pagination
                onChange={(pageNumber) => setCurrentPage(pageNumber)}
                currentPage={currentPage}
                totalPages={totalPages}
              />
            ) : null}
          </div>
        </>
      )}
    </div>
  );
};

export default TaskListStatistic;
