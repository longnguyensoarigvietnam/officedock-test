'use client';
import React, { useState } from 'react';

import Button from '@components/common/Button';
import Dropdown from '@components/common/Dropdown';
import ImageRound from '@components/common/ImageRound';
import StatisticCalendar from '@components/statistic/StatisticCalendar';
import PercentageCategory from '@components/statistic/category/PercentageCategory';
import AllocationCategory from '@components/statistic/category/AllocationCategory';
import TaskListStatistic from '@components/statistic/category/TaskList';

import useStatisticCategories from '@hooks/useStatisticCategories';

import { OptionDropdownType } from '@interfaces/common';
import { formatDateToYMD, sumDurations } from '@utils/date';
import useCreationDataStatistic from '@hooks/useCreationDataStatistic';

const StatisticBoard = () => {
  const [isMyTask, setIsMyTask] = useState(true);
  // Select organization
  const [listOptionsOrganization, setListOptionsOrganization] = useState<
    OptionDropdownType[]
  >([]);
  const [selectedOrganization, setSelectedOrganization] =
    useState<OptionDropdownType | null>({
      label: '',
      value: '',
    });
  const [selectedLarge, setSelectedLarge] = useState<OptionDropdownType | null>(
    null,
  );
  const [selectedMedium, setSelectedMedium] =
    useState<OptionDropdownType | null>(null);
  const [selectedSmall, setSelectedSmall] = useState<OptionDropdownType | null>(
    null,
  );
  const [smallOptions, setSmallOptions] = useState<OptionDropdownType[]>([]);

  const [largeOptions, setLargeOptions] = useState<OptionDropdownType[]>([]);
  const [mediumOptions, setMediumOptions] = useState<OptionDropdownType[]>([]);

  // Data Date calendar

  const [endDate, setEndDate] = useState<Date | null>(new Date());
  const [startDate, setStartDate] = useState<Date>(
    new Date(new Date().setMonth(new Date().getMonth() - 1)),
  );

  // Total duration
  const [totalDurationLarge, setTotalDurationLarge] = useState<string>('');
  const [totalDurationMedium, setTotalDurationMedium] = useState<string>('');
  const [totalDurationSmall, setTotalDurationSmall] = useState<string>('');

  const { statisticCategoryList } = useStatisticCategories({
    filter: {
      fromDate: formatDateToYMD(startDate) || '',
      endDate: formatDateToYMD(`${endDate}`) || '',
      organizationIds: String(selectedOrganization?.value || ''),
      largeCategoryId: Number(selectedLarge?.value),
      mediumCategoryId: Number(selectedMedium?.value),
    },
    onSuccess: (data) => {
      setTotalDurationLarge(sumDurations(data.largeCategories ?? []));
      setTotalDurationMedium(sumDurations(data.mediumCategories ?? []));
      setTotalDurationSmall(sumDurations(data.smallCategories ?? []));
    },
  });

  const { creationDataStatisticData } = useCreationDataStatistic({
    onSuccess: (data) => {
      const result = (() => {
        if (data.organizations.length === 0) {
          return { label: '', value: '' };
        }

        const mainItem =
          data.organizations.find((item) => item.isMain) ||
          data.organizations[0];
        return {
          label: mainItem.name,
          value: mainItem.id,
        };
      })();
      setSelectedOrganization(result);
      setListOptionsOrganization([
        ...data.organizations.map((org) => ({
          value: org.id || '',
          label: org.name,
        })),
      ]);
    },
  });

  // Handle Choose organization
  const handleSelectOrganization = (data: OptionDropdownType) => {
    setSelectedOrganization(data);
    setSelectedLarge(null);
    setSelectedMedium(null);

    const organization = creationDataStatisticData?.organizations?.find(
      (org) => org.id === data.value,
    );
    if (organization) {
      const largeCategories = organization.statisticCategories.map((stat) => ({
        value: stat.LARGE.id,
        label: stat.LARGE.name,
      }));
      setLargeOptions(largeCategories);
    } else {
      setLargeOptions([]);
    }
    setMediumOptions([]);
  };

  // Handle Choose LARGE
  const handleSelectLarge = (data: OptionDropdownType) => {
    setSelectedLarge(data);
    setSelectedMedium(null);

    const organization = creationDataStatisticData?.organizations.find(
      (org) => org.id === selectedOrganization?.value,
    );
    const largeCategory = organization?.statisticCategories.find(
      (stat) => stat.LARGE.id === data.value,
    );

    if (largeCategory) {
      const mediumCategories = largeCategory.MEDIUM.map((medium) => ({
        value: medium.MEDIUM?.id || '',
        label: medium.MEDIUM?.name || '',
      }));
      setMediumOptions(mediumCategories);
    } else {
      setMediumOptions([]);
    }
  };

  // Handle Choose MEDIUM
  const handleSelectMedium = (data: OptionDropdownType) => {
    setSelectedMedium(data);
    setSelectedSmall(null);

    const organization = creationDataStatisticData?.organizations.find(
      (org) => org.id === selectedOrganization?.value,
    );
    const largeCategory = organization?.statisticCategories.find(
      (stat) => stat.LARGE.id === selectedLarge?.value,
    );
    const mediumCategory = largeCategory?.MEDIUM.find(
      (medium) => medium.MEDIUM?.id === data.value,
    );

    if (mediumCategory) {
      const smallCategories = mediumCategory.SMALL.map((small) => ({
        value: small.id,
        label: small.name,
      }));
      setSmallOptions(smallCategories);
    } else {
      setSmallOptions([]);
    }
  };

  const handleSelectSmall = (data: OptionDropdownType) => {
    setSelectedSmall(data);
  };

  return (
    <div className="pt-[30px] pr-10  font-medium ">
      <div className="flex items-center gap-5 mb-[33px]">
        <span className="text-[26px] font-medium relative top-[-2px]">
          集計
        </span>
        <div className="flex justify-center items-center gap-2 ">
          <Button
            onClick={() => {
              if (!isMyTask) {
                setIsMyTask(true);
              }
            }}
            variant={isMyTask ? 'primary' : 'outline'}
            className={`!py-0 !px-0 font-bold w-[80px] h-7 
              !rounded-[20px] text-xs  ${isMyTask ? '' : '!text-[#A7B7C2] !border-[#A7B7C2]'}`}>
            カテゴリー
          </Button>
          <Button
            onClick={() => {
              if (isMyTask) {
                setIsMyTask(false);
              }
            }}
            variant={!isMyTask ? 'primary' : 'outline'}
            className={`${!isMyTask ? '' : '!text-[#A7B7C2] !border-[#A7B7C2]'} !py-0 !px-0 font-bold w-[80px] h-7 !rounded-[20px] text-xs`}>
            タグ
          </Button>
        </div>{' '}
      </div>
      <div>
        <div className="flex justify-between w-full">
          <div className="flex items-center gap-2">
            <div className="w-[220px]">
              <Dropdown
                options={listOptionsOrganization}
                className="!h-[34px] !py-0 text-sm font-normal !rounded-md"
                selectedOption={selectedOrganization || undefined}
                onChange={(data) => {
                  handleSelectOrganization(data);
                }}
              />
            </div>
            <div className="flex items-center  w-fit h-[30px]">
              <ImageRound
                className={`w-fit h-fit `}
                src="/icons/play-statistic.svg"
                name="icon chevron right"
              />
            </div>
            <div className="w-[220px]">
              <Dropdown
                options={largeOptions}
                className="!h-[34px] !py-0 !rounded-md"
                selectedOption={selectedLarge || undefined}
                onChange={(data) => handleSelectLarge(data)}
                disabled={!selectedOrganization}
              />
            </div>
            <div className="flex items-center  w-fit h-[30px]">
              <ImageRound
                className={`w-fit h-fit `}
                src="/icons/play-statistic.svg"
                name="icon chevron right"
              />
            </div>
            <div className="w-[220px]">
              <Dropdown
                className="!h-[34px] !py-0 !rounded-md"
                options={mediumOptions}
                selectedOption={selectedMedium || undefined}
                onChange={(data) => handleSelectMedium(data)}
                disabled={!selectedLarge}
              />
            </div>
          </div>
          <div>
            <StatisticCalendar
              startDate={startDate}
              endDate={endDate}
              setStartDate={setStartDate}
              setEndDate={setEndDate}
            />
          </div>
        </div>
        <div className="flex items-center mt-8  gap-1 mb-[30px]">
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
      {/* Percentage of categories */}
      <PercentageCategory
        startDate={startDate}
        endDate={endDate}
        totalDurationLarge={totalDurationLarge}
        totalDurationMedium={totalDurationMedium}
        totalDurationSmall={totalDurationSmall}
        statisticCategoryList={statisticCategoryList}
        listOptionsOrganization={listOptionsOrganization}
        selectedOrganization={selectedOrganization}
        largeOptions={largeOptions}
        selectedLarge={selectedLarge}
        mediumOptions={mediumOptions}
        selectedMedium={selectedMedium}
        handleSelectOrganization={handleSelectOrganization}
        handleSelectLarge={handleSelectLarge}
        handleSelectMedium={handleSelectMedium}
      />
      {/* Time allocation for each category */}
      <AllocationCategory
        startDate={startDate}
        endDate={endDate}
        totalDurationLarge={totalDurationLarge}
        totalDurationMedium={totalDurationMedium}
        totalDurationSmall={totalDurationSmall}
        statisticCategoryList={statisticCategoryList}
        listOptionsOrganization={listOptionsOrganization}
        selectedOrganization={selectedOrganization}
        largeOptions={largeOptions}
        selectedLarge={selectedLarge}
        mediumOptions={mediumOptions}
        selectedMedium={selectedMedium}
        handleSelectOrganization={handleSelectOrganization}
        handleSelectLarge={handleSelectLarge}
        handleSelectMedium={handleSelectMedium}
      />
      {/* Task list */}
      <TaskListStatistic
        startDate={startDate}
        endDate={endDate}
        totalDurationLarge={totalDurationLarge}
        totalDurationMedium={totalDurationMedium}
        totalDurationSmall={totalDurationSmall}
        statisticCategoryList={statisticCategoryList}
        listOptionsOrganization={listOptionsOrganization}
        selectedOrganization={selectedOrganization}
        largeOptions={largeOptions}
        selectedLarge={selectedLarge}
        mediumOptions={mediumOptions}
        selectedMedium={selectedMedium}
        selectedSmall={selectedSmall}
        smallOptions={smallOptions}
        handleSelectOrganization={handleSelectOrganization}
        handleSelectLarge={handleSelectLarge}
        handleSelectMedium={handleSelectMedium}
        handleSelectSmall={handleSelectSmall}
        creationDataStatisticData={
          creationDataStatisticData?.organizations || []
        }
      />
    </div>
  );
};

export default StatisticBoard;
