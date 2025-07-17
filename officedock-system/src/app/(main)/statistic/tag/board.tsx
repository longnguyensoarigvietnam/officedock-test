'use client';
import { useRouter } from 'next/navigation';
import React, { useContext, useState } from 'react';

import Button from '@components/common/Button';
import TaskListStatisticTags from '@components/statistic/tag/TaskList';
import PercentageTags from '@components/statistic/tag/PercentageTags';
import StatisticTagCalendar from '@components/statistic/tag/StatisticCalendar';
import PercentageTagsCompare from '@components/statistic/tag/compare/PercentageTagsCompare';
import AllocationTag from '@components/statistic/tag/AllocationTag';
import AllocationTagCompare from '@components/statistic/tag/compare/AllocationTagCompare';
import LineChart from '@components/statistic/tag/LineChart';
import LineChartCompare from '@components/statistic/tag/compare/LineChartCompare';
import FilterTag from '@components/statistic/tag/filter/FilterTag';
import StackedAreaChart from '@components/statistic/tag/StackedAreaChart';

import useCreationDataStatistic from '@hooks/useCreationDataStatistic';
import useStatisticTagsCompare from '@hooks/useStatisticTagsCompare';
import useStatisticsTags from '@hooks/useStatisticTags';

import { ALL_TEAM_STATISTIC, DEFAULT_TIME_TEXT } from '@constants';
import { pageRouters } from '@constants/routers';

import { OptionDropdownType } from '@interfaces/common';
import { formatDateToYMD, sumDurations } from '@utils/date';
import { StatisticTagStateContext } from '@providers/StatisticProviderTag';
import { OrganizationStatisticType } from '@constants/enums';
import useStatisticAllTeamCategories from '@hooks/useStatisticAllTeamCategories';
import { removeDuplicateOptions } from '@utils';
import useStatisticAllTeamCategoriesCompare from '@hooks/useStatisticAllTeamCategoriesCompare';
import useStatisticAllTeamTaskDurations from '@hooks/useStatisticAllTeamTaskDurations';
import useStatisticTaskDurationsTag from '@hooks/useStatisticTaskDurationsTag';
import useStatisticAllTeamTaskDurationsCompare from '@hooks/useStatisticAllTeamTaskDurationsCompare';
import useStatisticTagTaskDurationsCompare from '@hooks/useStatisticTagTaskDurationsCompare';

const StatisticTagBoard = () => {
  const {
    startDate,
    endDate,
    isCheckCompare,
    startDateCompare,
    endDateCompare,
    selectedLarge,
    selectedMedium,
    selectedOrganization,
    selectedTags,
    selectedSmall,
    lineChartViewBy,
    setSelectedTags,
    setTagsOptions,
    setTotalDurationSmall,
    setTotalDurationLarge,
    setTotalDurationMedium,
    setSelectedOrganization,
    setTotalDurationLargeCompare,
    setTotalDurationMediumCompare,
    setTotalDurationSmallCompare,
    setTotalDurationCategory,
    setTotalDurationCategoryCompare,
    setListOptionsOrganization,
    setSelectedLarge,
    setSelectedMedium,
    setSelectedSmall,
    setLargeOptions,
    setMediumOptions,
    setSmallOptions,
    setIsLoadingLarge,
    setIsLoadingMedium,
    setIsLoadingSmall,
    setIsLoadingOrganization,
    setIsLoadingOrganizationCompare,
    setIsLoadingLargeCompare,
    setIsLoadingMediumCompare,
    setIsLoadingSmallCompare,
    setCurrentPage,
    setDataMediumCalendar,
    setTotalDurationTask,
    setTotalDurationTaskCompare,
  } = useContext(StatisticTagStateContext);
  const [isMyTask, setIsMyTask] = useState(true);
  const router = useRouter();

  const { statisticTagsList } = useStatisticsTags({
    filter: {
      fromDate: formatDateToYMD(startDate) || '',
      endDate: formatDateToYMD(`${endDate}`) || '',
      organizationIds: String(selectedOrganization?.value || ''),
      largeCategoryId: selectedLarge?.value as number,
      mediumCategoryId: selectedMedium?.value as number,
      smallCategoryId: selectedSmall?.value as number,
      tagIds: selectedTags,
    },
    condition: [selectedOrganization?.value != ALL_TEAM_STATISTIC],
    onSuccess: (data) => {
      const organization = creationDataStatisticData?.organizations?.find(
        (org) => org.id === selectedOrganization?.value,
      );
      if (organization) {
        const largeCategories = organization.statisticCategories.map(
          (stat) => ({
            value: stat.LARGE.id,
            label: stat.LARGE.name,
          }),
        );
        setLargeOptions(largeCategories);
      } else {
        setLargeOptions([]);
      }

      setTotalDurationLarge(sumDurations(data.largeCategories ?? []));
      setTotalDurationMedium(sumDurations(data.mediumCategories ?? []));
      setTotalDurationSmall(sumDurations(data.smallCategories ?? []));
      setTotalDurationCategory(sumDurations(data.category ?? []));
      if (data.largeTotalDuration) {
        if (data.mediumTotalDuration) {
          if (data.smallTotalDuration) {
            if (data.categoryTotalDuration) {
              setTotalDurationTask(data.categoryTotalDuration);
            } else {
              setTotalDurationTask(data.smallTotalDuration);
            }
          } else {
            if (
              selectedMedium &&
              selectedMedium.value &&
              selectedOrganization?.type === OrganizationStatisticType.CALENDAR
            ) {
              setTotalDurationTask(DEFAULT_TIME_TEXT);
              return;
            }
            if (selectedSmall && selectedSmall.value) return;

            setTotalDurationTask(data.mediumTotalDuration);
          }
        } else {
          if (selectedLarge && selectedLarge.value) return;
          setTotalDurationTask(data.largeTotalDuration);
        }
      } else {
        setTotalDurationTask(DEFAULT_TIME_TEXT);
      }
    },
  });
  // Get statistic categories for ALL TEAM option
  const { statisticAllTeamCategoryList } = useStatisticAllTeamCategories({
    filter: {
      fromDate: formatDateToYMD(startDate) || '',
      endDate: formatDateToYMD(`${endDate}`) || '',
      tagIds: selectedTags,
      isTagPage: true,
    },
    condition: [selectedOrganization?.value == ALL_TEAM_STATISTIC],
    onSuccess: (data) => {
      setLargeOptions([]);
      setTotalDurationLarge(data.largeTotalDuration);
      setTotalDurationTask(data.largeTotalDuration);
    },
  });

  const { statisticTagsListCompare } = useStatisticTagsCompare({
    filter: {
      fromDate: formatDateToYMD(startDateCompare) || '',
      endDate: formatDateToYMD(`${endDateCompare}`) || '',
      organizationIds: String(selectedOrganization?.value || ''),
      largeCategoryId: selectedLarge?.value as number,
      mediumCategoryId: selectedMedium?.value as number,
      smallCategoryId: selectedSmall?.value as number,
      tagIds: selectedTags,
      isCompare: isCheckCompare,
    },
    condition: [selectedOrganization?.value != ALL_TEAM_STATISTIC],
    onSuccess: (data) => {
      setTotalDurationLargeCompare(sumDurations(data.largeCategories ?? []));
      setTotalDurationMediumCompare(sumDurations(data.mediumCategories ?? []));
      setTotalDurationSmallCompare(sumDurations(data.smallCategories ?? []));
      setTotalDurationCategoryCompare(sumDurations(data.category ?? []));
      if (data.largeTotalDuration) {
        if (data.mediumTotalDuration) {
          if (data.smallTotalDuration) {
            if (data.categoryTotalDuration) {
              setTotalDurationTaskCompare(data.categoryTotalDuration);
            } else {
              setTotalDurationTaskCompare(data.smallTotalDuration);
            }
          } else {
            if (
              selectedMedium &&
              selectedMedium.value &&
              selectedOrganization?.type === OrganizationStatisticType.CALENDAR
            ) {
              setTotalDurationTaskCompare(DEFAULT_TIME_TEXT);
              return;
            }
            if (selectedSmall && selectedSmall.value) return;

            setTotalDurationTaskCompare(data.mediumTotalDuration);
          }
        } else {
          if (selectedLarge && selectedLarge.value) return;
          setTotalDurationTaskCompare(data.largeTotalDuration);
        }
      } else {
        setTotalDurationTaskCompare(DEFAULT_TIME_TEXT);
      }
    },
  });
  // Get statistic compared categories for ALL TEAM option
  const { statisticAllTeamCategoryCompareList } =
    useStatisticAllTeamCategoriesCompare({
      filter: {
        fromDate: formatDateToYMD(startDateCompare) || '',
        endDate: formatDateToYMD(`${endDateCompare}`) || '',
        tagIds: selectedTags,
        isCompare: isCheckCompare,
        isTagPage: true,
      },
      condition: [selectedOrganization?.value == ALL_TEAM_STATISTIC],
      onSuccess: (data) => {
        setLargeOptions([]);
        setTotalDurationLargeCompare(data.largeTotalDuration);
        setTotalDurationTaskCompare(data.largeTotalDuration);
      },
    });

  // Get task durations for options that except ALL TEAM option
  const {
    statisticTaskDurationsListTag,
    isFetchedStatisticTaskDurationsListTag,
  } = useStatisticTaskDurationsTag({
    filter: {
      fromDate: formatDateToYMD(startDate) || '',
      endDate: formatDateToYMD(`${endDate}`) || '',
      organizationIds: String(selectedOrganization?.value || ''),
      largeCategoryId: selectedLarge?.value || '',
      mediumCategoryId: selectedMedium?.value || '',
      smallCategoryId: selectedSmall?.value as number,
      tagIds: selectedTags,
      statisticBy: lineChartViewBy ? String(lineChartViewBy.value) : '',
    },
    condition: [selectedOrganization?.value != ALL_TEAM_STATISTIC],
  });

  // Get compared task durations for options that except ALL TEAM option
  const {
    statisticTagTaskDurationsCompareList,
    isFetchedStatisticTagTaskDurationsCompareList,
  } = useStatisticTagTaskDurationsCompare({
    filter: {
      fromDate: formatDateToYMD(startDateCompare) || '',
      endDate: formatDateToYMD(`${endDateCompare}`) || '',
      organizationIds: String(selectedOrganization?.value || ''),
      largeCategoryId: selectedLarge?.value || '',
      mediumCategoryId: selectedMedium?.value || '',
      smallCategoryId: selectedSmall?.value || '',
      tagIds: selectedTags,
      statisticBy: lineChartViewBy ? String(lineChartViewBy.value) : '',
    },
    condition: [selectedOrganization?.value != ALL_TEAM_STATISTIC],
  });

  // Get task durations for ALL TEAM option
  const {
    statisticAllTeamTaskDurationsList,
    isFetchedStatisticAllTeamTaskDurationsList,
  } = useStatisticAllTeamTaskDurations({
    filter: {
      fromDate: formatDateToYMD(startDate) || '',
      endDate: formatDateToYMD(`${endDate}`) || '',
      tagIds: selectedTags,
      statisticBy: lineChartViewBy ? String(lineChartViewBy.value) : '',
      isTagPage: true,
    },
    condition: [selectedOrganization?.value == ALL_TEAM_STATISTIC],
  });

  // Get compared task durations for ALL TEAM option
  const {
    statisticAllTeamTaskDurationsCompareList,
    isFetchedStatisticAllTeamTaskDurationsCompareList,
  } = useStatisticAllTeamTaskDurationsCompare({
    filter: {
      fromDate: formatDateToYMD(startDateCompare) || '',
      endDate: formatDateToYMD(`${endDateCompare}`) || '',
      tagIds: selectedTags,
      statisticBy: lineChartViewBy ? String(lineChartViewBy.value) : '',
      isTagPage: true,
    },
    condition: [selectedOrganization?.value == ALL_TEAM_STATISTIC],
  });

  // Get data creation
  const { creationDataStatisticData } = useCreationDataStatistic({
    is_statistic: true,

    onSuccess: (data) => {
      const result = (() => {
        if (data.organizations.length === 0) {
          return { label: '', value: '' };
        }

        const mainItem =
          data.organizations.find((item) => item.isMain) ||
          data.organizations[0];
        const optionsTagList = mainItem.tags.map((item) => ({
          label: item.name,
          value: item.id,
        }));
        setTagsOptions(optionsTagList);
        setSelectedTags(optionsTagList);

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
          type: org.type,
        })),
      ]);
    },
  });

  // Handle Choose organization
  const handleSelectOrganization = (data: OptionDropdownType) => {
    if (data.value !== selectedOrganization?.value) {
      setIsLoadingOrganization(true);
      if (isCheckCompare) {
        setIsLoadingOrganizationCompare(true);
      }
    }
    setCurrentPage(1);
    if (data.type === OrganizationStatisticType.CALENDAR) {
      setDataMediumCalendar(undefined);
    }

    setSelectedOrganization(data);
    setSelectedLarge(null);
    setSelectedMedium(null);
    setSelectedSmall(null);

    const organization = creationDataStatisticData?.organizations?.find(
      (org) => org.id === data.value,
    );

    if (organization) {
      const largeCategories = organization.statisticCategories.map((stat) => ({
        value: stat.LARGE.id,
        label: stat.LARGE.name,
      }));
      const optionsTagList = organization.tags.map((item) => ({
        label: item.name,
        value: item.id,
      }));
      setCurrentPage(1);

      setSelectedTags([]);
      setTagsOptions(optionsTagList);
      setSelectedTags(optionsTagList);
      // If organization is all team then return here
      if (data?.value === ALL_TEAM_STATISTIC) {
        setLargeOptions([]);
      } else {
        setLargeOptions(removeDuplicateOptions(largeCategories));
      }
    } else {
      setLargeOptions([]);
    }
    setMediumOptions([]);
  };
  // Handle Choose LARGE
  const handleSelectLarge = (data: OptionDropdownType) => {
    if (selectedOrganization?.type === OrganizationStatisticType.CALENDAR) {
      setDataMediumCalendar(undefined);
    }
    if (data.value !== selectedLarge?.value) {
      setIsLoadingLarge(true);
      if (isCheckCompare) {
        setIsLoadingLargeCompare(true);
      }
    }
    setCurrentPage(1);

    setSelectedLarge(data);
    setSelectedMedium(null);
    setSelectedSmall(null);

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

      setMediumOptions(removeDuplicateOptions(mediumCategories));
    } else {
      setMediumOptions([]);
    }
  };

  // Handle Choose MEDIUM
  const handleSelectMedium = (data: OptionDropdownType) => {
    if (selectedOrganization?.type === OrganizationStatisticType.CALENDAR) {
      setDataMediumCalendar(data);
      return;
    }
    if (data.value !== selectedMedium?.value) {
      setIsLoadingMedium(true);
      if (isCheckCompare) {
        setIsLoadingMediumCompare(true);
      }
    }

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
      const smallCategories =
        mediumCategory.SMALL &&
        mediumCategory.SMALL.map((small) => ({
          value: small.id,
          label: small.name,
        }));
      setSmallOptions(removeDuplicateOptions(smallCategories));
    } else {
      setSmallOptions([]);
    }
  };
  // Handle choose small
  const handleSelectSmall = (data: OptionDropdownType) => {
    if (selectedOrganization?.type === OrganizationStatisticType.CALENDAR) {
      return;
    }
    if (data.value !== selectedSmall?.value) {
      setIsLoadingSmall(true);
      if (isCheckCompare) {
        setIsLoadingSmallCompare(true);
      }
    }
    setCurrentPage(1);
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
              router.push(pageRouters.STATISTIC_MANAGEMENT.href);
            }}
            variant={'outline'}
            className={`!py-0 !px-0 font-bold w-[80px] h-7 
              !rounded-[20px] text-xs !text-[#77858F] !bg-transparent !border-[#77858F]`}>
            カテゴリー
          </Button>
          <Button
            onClick={() => {
              if (isMyTask) {
                setIsMyTask(false);
              }
            }}
            variant={'primary'}
            className={` !py-0 !px-0 font-bold w-[80px] h-7 !rounded-[20px] text-xs`}>
            タグ
          </Button>
        </div>{' '}
      </div>
      <div>
        <div className="flex justify-between w-full">
          {/* Filter tag */}
          <FilterTag />
          <div>
            <StatisticTagCalendar />
          </div>
        </div>
        <div className="my-8"></div>
      </div>

      {isCheckCompare ? (
        <>
          {/* Percentage of categories */}
          <PercentageTagsCompare
            startDate={startDate}
            endDate={endDate}
            startDateCompare={startDateCompare}
            endDateCompare={endDateCompare}
            statisticTagsList={statisticTagsList}
            statisticTagsCompareList={statisticTagsListCompare}
            statisticAllTeamCategoryList={statisticAllTeamCategoryList}
            statisticAllTeamCategoryCompareList={
              statisticAllTeamCategoryCompareList
            }
            handleSelectOrganization={handleSelectOrganization}
            handleSelectLarge={handleSelectLarge}
            handleSelectMedium={handleSelectMedium}
            handleSelectSmall={handleSelectSmall}
          />
          {/* Progress bar */}
          <AllocationTagCompare
            startDate={startDate}
            endDate={endDate}
            startDateCompare={startDateCompare}
            endDateCompare={endDateCompare}
            statisticTagsList={statisticTagsList}
            statisticTagsCompareList={statisticTagsListCompare}
            statisticAllTeamCategoryList={statisticAllTeamCategoryList}
            statisticAllTeamCategoryCompareList={
              statisticAllTeamCategoryCompareList
            }
            handleSelectOrganization={handleSelectOrganization}
            handleSelectLarge={handleSelectLarge}
            handleSelectMedium={handleSelectMedium}
            handleSelectSmall={handleSelectSmall}
          />
          {/* Line chart */}
          <LineChartCompare
            startDate={startDate}
            endDate={endDate}
            startDateCompare={startDateCompare}
            endDateCompare={endDateCompare}
            statisticTaskDurationsListTag={statisticTaskDurationsListTag}
            statisticTagTaskDurationsCompareList={
              statisticTagTaskDurationsCompareList
            }
            statisticAllTeamTaskDurationsList={
              statisticAllTeamTaskDurationsList
            }
            statisticAllTeamTaskDurationsCompareList={
              statisticAllTeamTaskDurationsCompareList
            }
            isFetchedStatisticTaskDurationsListTag={
              isFetchedStatisticTaskDurationsListTag
            }
            isFetchedStatisticTagTaskDurationsCompareList={
              isFetchedStatisticTagTaskDurationsCompareList
            }
            isFetchedStatisticAllTeamTaskDurationsList={
              isFetchedStatisticAllTeamTaskDurationsList
            }
            isFetchedStatisticAllTeamTaskDurationsCompareList={
              isFetchedStatisticAllTeamTaskDurationsCompareList
            }
            handleSelectOrganization={handleSelectOrganization}
            handleSelectLarge={handleSelectLarge}
            handleSelectMedium={handleSelectMedium}
            handleSelectSmall={handleSelectSmall}
          />
        </>
      ) : (
        <>
          {/* Percentage of categories */}
          <PercentageTags
            startDate={startDate}
            endDate={endDate}
            statisticTagsList={statisticTagsList}
            statisticAllTeamCategoryList={statisticAllTeamCategoryList}
            handleSelectOrganization={handleSelectOrganization}
            handleSelectLarge={handleSelectLarge}
            handleSelectSmall={handleSelectSmall}
            handleSelectMedium={handleSelectMedium}
          />
          {/* Progress bar */}
          <AllocationTag
            startDate={startDate}
            endDate={endDate}
            statisticTagsList={statisticTagsList}
            statisticAllTeamCategoryList={statisticAllTeamCategoryList}
            handleSelectOrganization={handleSelectOrganization}
            handleSelectLarge={handleSelectLarge}
            handleSelectMedium={handleSelectMedium}
            handleSelectSmall={handleSelectSmall}
          />
          {/* Line chart */}
          <LineChart
            startDate={startDate}
            endDate={endDate}
            statisticTaskDurationsListTag={statisticTaskDurationsListTag}
            statisticAllTeamTaskDurationsList={
              statisticAllTeamTaskDurationsList
            }
            isFetchedStatisticTaskDurationsListTag={
              isFetchedStatisticTaskDurationsListTag
            }
            isFetchedStatisticAllTeamTaskDurationsList={
              isFetchedStatisticAllTeamTaskDurationsList
            }
            handleSelectOrganization={handleSelectOrganization}
            handleSelectLarge={handleSelectLarge}
            handleSelectMedium={handleSelectMedium}
            handleSelectSmall={handleSelectSmall}
          />
          <StackedAreaChart
            startDate={startDate}
            endDate={endDate}
            statisticTagsList={statisticTagsList}
            statisticTaskDurationsList={statisticTaskDurationsListTag}
            statisticAllTeamTaskDurationsList={
              statisticAllTeamTaskDurationsList
            }
            isFetchedStatisticTaskDurationsListTag={
              isFetchedStatisticTaskDurationsListTag
            }
            isFetchedStatisticAllTeamTaskDurationsList={
              isFetchedStatisticAllTeamTaskDurationsList
            }
            handleSelectOrganization={handleSelectOrganization}
            handleSelectLarge={handleSelectLarge}
            handleSelectMedium={handleSelectMedium}
            handleSelectSmall={handleSelectSmall}
          />
        </>
      )}

      {/* Task list */}
      <TaskListStatisticTags
        startDate={startDate}
        endDate={endDate}
        startDateCompare={startDateCompare}
        endDateCompare={endDateCompare}
        isCheckCompare={isCheckCompare}
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

export default StatisticTagBoard;
