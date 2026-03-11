'use client';
import { useRouter } from 'next/navigation';
import React, { useContext, useState } from 'react';

import Button from '@components/common/Button';
import Dropdown from '@components/common/Dropdown';
import ImageRound from '@components/common/ImageRound';
import StatisticCalendar from '@components/statistic/category/StatisticCalendar';
import PercentageCategory from '@components/statistic/category/PercentageCategory';
import TaskListStatistic from '@components/statistic/category/TaskList';
import AllocationCategory from '@components/statistic/category/AllocationCategory';
import PercentageCategoryCompare from '@components/statistic/category/compare/PercentageCategoryCompare';
import AllocationCategoryCompare from '@components/statistic/category/compare/AllocationCategoryCompare';
import StackedAreaChart from '@components/statistic/category/StackedAreaChart';
import LineChartCompare from '@components/statistic/category/compare/LineChartCompare';
import FilterStatistic from '@components/statistic/category/filter/FilterStatistic';
import LineChart from '@components/statistic/category/LineChart';

import { OrganizationStatisticType } from '@constants/enums';
import { ALL_TEAM_STATISTIC, DEFAULT_TIME_TEXT, NO_SETTING } from '@constants';
import { pageRouters } from '@constants/routers';

import useStatisticCategoriesCompare from '@hooks/useStatisticCategoriesCompare';
import useStatisticCategories from '@hooks/useStatisticCategories';
import useStatisticAllTeamCategories from '@hooks/useStatisticAllTeamCategories';
import useStatisticAllTeamCategoriesCompare from '@hooks/useStatisticAllTeamCategoriesCompare';
import useStatisticTaskDurations from '@hooks/useStatisticTaskDurations';
import useStatisticAllTeamTaskDurations from '@hooks/useStatisticAllTeamTaskDurations';
import useStatisticTaskDurationsCompare from '@hooks/useStatisticTaskDurationsCompare';
import useStatisticAllTeamTaskDurationsCompare from '@hooks/useStatisticAllTeamTaskDurationsCompare';
import useCreationDataCommon from '@hooks/common/useCreationDataCommon';

import { formatDateToYMD, sumDurations } from '@utils/date';
import { removeDuplicateOptions } from '@utils';

import { OptionDropdownType } from '@interfaces/common';

import { StatisticStateContext } from '@providers/StatisticProvider';

const StatisticBoard = () => {
  const {
    isDisableCalendar,
    startDate,
    endDate,
    isCheckCompare,
    startDateCompare,
    endDateCompare,
    largeOptions,
    mediumOptions,
    listOptionsOrganization,
    selectedLarge,
    selectedMedium,
    selectedOrganization,
    selectedTags,
    selectedSmall,
    isHasLoading,
    lineChartViewBy,
    setSelectedTags,
    setSelectedLarge,
    setSelectedMedium,
    setSelectedOrganization,
    setSelectedSmall,
    setLargeOptions,
    setMediumOptions,
    setSmallOptions,
    setListOptionsOrganization,
    setTotalDurationSmall,
    setTotalDurationLarge,
    setTotalDurationMedium,
    setTotalDurationLargeCompare,
    setTotalDurationMediumCompare,
    setTotalDurationSmallCompare,
    setTotalDurationTask,
    setTotalDurationTaskCompare,
    setIsLoadingOrganization,
    setIsLoadingLarge,
    setIsLoadingMedium,
    setIsLoadingOrganizationCompare,
    setIsLoadingLargeCompare,
    setIsLoadingMediumCompare,
    setTagsOptions,
    setCurrentPage,
    setDataMediumCalendar,
  } = useContext(StatisticStateContext);

  const [isMyTask, setIsMyTask] = useState(true);
  const router = useRouter();

  // Get statistic categories for options that except ALL TEAM option
  const { statisticCategoryList } = useStatisticCategories({
    filter: {
      fromDate: formatDateToYMD(startDate) || '',
      endDate: formatDateToYMD(`${endDate}`) || '',
      organizationIds: String(selectedOrganization?.value || ''),
      largeCategoryId:
        selectedLarge?.value == null
          ? NO_SETTING
          : (selectedLarge?.value as number),
      mediumCategoryId:
        selectedMedium?.value == null
          ? NO_SETTING
          : (selectedMedium?.value as number),
      smallCategoryId:
        selectedSmall?.value == null
          ? NO_SETTING
          : (selectedSmall?.value as number),
      tagIds: selectedTags,
    },
    condition: [selectedOrganization?.value != ALL_TEAM_STATISTIC],
    onSuccess: (data) => {
      const organization = creationDataCommonData?.myStatistics?.find(
        (org) => org.id === selectedOrganization?.value,
      );
      if (organization && organization.statisticCategories) {
        const largeCategories = organization.statisticCategories.map(
          (stat) => ({
            value: stat.LARGE.id,
            label: stat.LARGE.name,
          }),
        );
        setLargeOptions([
          {
            label: '-',
            value: '',
          },
          ...largeCategories,
        ]);
      } else {
        setLargeOptions([]);
      }
      setTotalDurationLarge(sumDurations(data.largeCategories ?? []));
      setTotalDurationMedium(sumDurations(data.mediumCategories ?? []));
      setTotalDurationSmall(sumDurations(data.smallCategories ?? []));
      if (data.largeTotalDuration) {
        if (data.mediumTotalDuration) {
          if (data.smallTotalDuration) {
            if (
              selectedSmall &&
              selectedSmall.value != '' &&
              data.smallCategories
            ) {
              const itemMap = data.smallCategories.find(
                (item) =>
                  String(item.categoryId) === String(selectedSmall.value),
              );
              if (itemMap) {
                setTotalDurationTask(itemMap.duration);
              } else {
                setTotalDurationTask(DEFAULT_TIME_TEXT);
              }
            } else {
              setTotalDurationTask(data.smallTotalDuration);
            }
          } else {
            if (
              selectedMedium &&
              selectedMedium.value != '' &&
              selectedOrganization?.type === OrganizationStatisticType.CALENDAR
            ) {
              setTotalDurationTask(DEFAULT_TIME_TEXT);
              return;
            }
            if (selectedSmall && selectedSmall.value != '') return;

            setTotalDurationTask(data.mediumTotalDuration);
          }
        } else {
          if (selectedLarge && selectedLarge.value != '') return;
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
    },
    condition: [selectedOrganization?.value == ALL_TEAM_STATISTIC],
    onSuccess: (data) => {
      setLargeOptions([]);
      setTotalDurationLarge(data.largeTotalDuration || DEFAULT_TIME_TEXT);
      setTotalDurationMedium(DEFAULT_TIME_TEXT);
      setTotalDurationSmall(DEFAULT_TIME_TEXT);
      setTotalDurationTask(data.largeTotalDuration || DEFAULT_TIME_TEXT);
      setIsLoadingOrganization(false);
      setIsLoadingLarge(false);
      setIsLoadingMedium(false);
    },
  });

  // Get statistic compared categories for options that except ALL TEAM option
  const { statisticCategoryCompareList } = useStatisticCategoriesCompare({
    filter: {
      fromDate: formatDateToYMD(startDateCompare) || '',
      endDate: formatDateToYMD(`${endDateCompare}`) || '',
      organizationIds: String(selectedOrganization?.value || ''),
      largeCategoryId:
        selectedLarge?.value == null
          ? NO_SETTING
          : (selectedLarge?.value as number),
      mediumCategoryId:
        selectedMedium?.value == null
          ? NO_SETTING
          : (selectedMedium?.value as number),
      smallCategoryId:
        selectedSmall?.value == null
          ? NO_SETTING
          : (selectedSmall?.value as number),
      isCompare: isCheckCompare,
      tagIds: selectedTags,
    },
    condition: [selectedOrganization?.value != ALL_TEAM_STATISTIC],
    onSuccess: (data) => {
      setTotalDurationLargeCompare(sumDurations(data.largeCategories ?? []));
      setTotalDurationMediumCompare(sumDurations(data.mediumCategories ?? []));
      setTotalDurationSmallCompare(sumDurations(data.smallCategories ?? []));
      if (data.largeTotalDuration) {
        if (data.mediumTotalDuration) {
          if (data.smallTotalDuration) {
            if (
              selectedSmall &&
              selectedSmall.value != '' &&
              data.smallCategories
            ) {
              const itemMap = data.smallCategories.find(
                (item) =>
                  String(item.categoryId) === String(selectedSmall.value),
              );
              if (itemMap) {
                setTotalDurationTaskCompare(itemMap.duration);
              } else {
                setTotalDurationTaskCompare(DEFAULT_TIME_TEXT);
              }
            } else {
              setTotalDurationTaskCompare(data.smallTotalDuration);
            }
          } else {
            if (
              selectedMedium &&
              selectedMedium.value != '' &&
              selectedOrganization?.type === OrganizationStatisticType.CALENDAR
            ) {
              setTotalDurationTask(DEFAULT_TIME_TEXT);
              return;
            }

            if (selectedSmall && selectedSmall.value != '') return;

            setTotalDurationTaskCompare(data.mediumTotalDuration);
          }
        } else {
          if (selectedLarge && selectedLarge.value != '') return;
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
      },
      condition: [selectedOrganization?.value == ALL_TEAM_STATISTIC],
      onSuccess: (data) => {
        setLargeOptions([]);
        setTotalDurationLargeCompare(
          data.largeTotalDuration || DEFAULT_TIME_TEXT,
        );
        setTotalDurationTaskCompare(
          data.largeTotalDuration || DEFAULT_TIME_TEXT,
        );
        setIsLoadingOrganizationCompare(false);
        setIsLoadingLargeCompare(false);
        setIsLoadingMediumCompare(false);
      },
    });

  // Get task durations for options that except ALL TEAM option
  const { statisticTaskDurationsList, isFetchingStatisticTaskDurationsList } =
    useStatisticTaskDurations({
      filter: {
        fromDate: formatDateToYMD(startDate) || '',
        endDate: formatDateToYMD(`${endDate}`) || '',
        organizationIds: String(selectedOrganization?.value || ''),
        largeCategoryId:
          selectedLarge?.value == null
            ? NO_SETTING
            : (selectedLarge?.value as number),
        mediumCategoryId:
          selectedMedium?.value == null
            ? NO_SETTING
            : (selectedMedium?.value as number),
        tagIds: selectedTags,
        statisticBy: lineChartViewBy ? String(lineChartViewBy.value) : '',
      },
      condition: [selectedOrganization?.value != ALL_TEAM_STATISTIC],
    });

  // Get task durations for ALL TEAM option
  const {
    statisticAllTeamTaskDurationsList,
    isFetchingStatisticAllTeamTaskDurationsList,
  } = useStatisticAllTeamTaskDurations({
    filter: {
      fromDate: formatDateToYMD(startDate) || '',
      endDate: formatDateToYMD(`${endDate}`) || '',
      tagIds: selectedTags,
      statisticBy: lineChartViewBy ? String(lineChartViewBy.value) : '',
    },
    condition: [selectedOrganization?.value == ALL_TEAM_STATISTIC],
  });

  // Get compared task durations for options that except ALL TEAM option
  const {
    statisticTaskDurationsCompareList,
    isFetchingStatisticTaskDurationsCompareList,
  } = useStatisticTaskDurationsCompare({
    filter: {
      fromDate: formatDateToYMD(startDateCompare) || '',
      endDate: formatDateToYMD(`${endDateCompare}`) || '',
      organizationIds: String(selectedOrganization?.value || ''),
      largeCategoryId:
        selectedLarge?.value == null
          ? NO_SETTING
          : (selectedLarge?.value as number),
      mediumCategoryId:
        selectedMedium?.value == null
          ? NO_SETTING
          : (selectedMedium?.value as number),
      tagIds: selectedTags,
      statisticBy: lineChartViewBy ? String(lineChartViewBy.value) : '',
      isCompare: isCheckCompare,
    },
    condition: [selectedOrganization?.value != ALL_TEAM_STATISTIC],
  });

  // Get compared task durations for ALL TEAM option
  const {
    statisticAllTeamTaskDurationsCompareList,
    isFetchingStatisticAllTeamTaskDurationsCompareList,
  } = useStatisticAllTeamTaskDurationsCompare({
    filter: {
      fromDate: formatDateToYMD(startDateCompare) || '',
      endDate: formatDateToYMD(`${endDateCompare}`) || '',
      tagIds: selectedTags,
      statisticBy: lineChartViewBy ? String(lineChartViewBy.value) : '',
      isCompare: isCheckCompare,
    },
    condition: [selectedOrganization?.value == ALL_TEAM_STATISTIC],
  });

  const { creationDataCommonData } = useCreationDataCommon({
    options: {
      get_organization_for_my_statistic: true,
    },
    onSuccess: (data) => {
      if (data.myStatistics) {
        const result = (() => {
          if (data.myStatistics.length === 0) {
            return { label: '', value: '' };
          }

          const mainItem =
            data.myStatistics.find((item) => item.isMain) ||
            data.myStatistics[0];
          const optionsTagList = mainItem.tags.map((item) => ({
            label: item.name,
            value: item.id,
          }));
          setTagsOptions(optionsTagList);
          return {
            label: mainItem.name,
            value: mainItem.id,
          };
        })();

        setSelectedOrganization(result);

        setListOptionsOrganization([
          ...data.myStatistics.map((org) => ({
            value: org.id || '',
            label: org.name,
            type: org.type,
            isHidden: org.isDeleted,
          })),
        ]);
      }
    },
    onSettled: () => {
      setIsLoadingLarge(true);
      setIsLoadingMedium(true);
      setIsLoadingOrganization(true);
      if (isCheckCompare) {
        setIsLoadingLargeCompare(true);
        setIsLoadingMediumCompare(true);
        setIsLoadingOrganizationCompare(true);
      }
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
    setTotalDurationTask('');
    setCurrentPage(1);
    setSelectedOrganization(data);
    setSelectedLarge({
      label: '-',
      value: '',
    });
    setSelectedMedium({
      label: '-',
      value: '',
    });
    setSelectedSmall({
      label: '-',
      value: '',
    });

    const organization = creationDataCommonData?.myStatistics?.find(
      (org) => org.id === data.value,
    );
    if (data.type === OrganizationStatisticType.CALENDAR) {
      setDataMediumCalendar(undefined);
    }

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
      // If organization is all team then return here
      if (data?.value === ALL_TEAM_STATISTIC) {
        setLargeOptions([]);
      } else {
        setLargeOptions([
          {
            label: '-',
            value: '',
          },
          ...largeCategories,
        ]);
      }
    } else {
      setLargeOptions([]);
    }
  };
  // Handle Choose organization with setup options medium
  const handleSelectOrganizationCustom = (data: OptionDropdownType) => {
    setSelectedOrganization(data);
    setSelectedLarge({
      label: '-',
      value: '',
    });
    setSelectedMedium({
      label: '-',
      value: '',
    });
    setSelectedSmall({
      label: '-',
      value: '',
    });
    if (data.type === OrganizationStatisticType.CALENDAR) {
      setDataMediumCalendar(undefined);
    }

    const organization = creationDataCommonData?.myStatistics?.find(
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

      // setSelectedTags([]);
      setTagsOptions(optionsTagList);
      // If organization is all team then return here
      if (data?.value === ALL_TEAM_STATISTIC) {
        setLargeOptions([]);
      } else {
        setLargeOptions([
          {
            label: '-',
            value: '',
          },
          ...removeDuplicateOptions(largeCategories),
        ]);
      }
    } else {
      setLargeOptions([]);
    }
    setMediumOptions([]);
  };

  // Handle Choose LARGE
  const handleSelectLarge = (data: OptionDropdownType) => {
    if (selectedOrganization?.label === ALL_TEAM_STATISTIC) return;
    if (data.value !== selectedLarge?.value) {
      setIsLoadingLarge(true);

      if (isCheckCompare) {
        setIsLoadingLargeCompare(true);
      }
    }
    setCurrentPage(1);

    setSelectedLarge(data);

    setSelectedMedium({
      label: '-',
      value: '',
    });
    setSelectedSmall({
      label: '-',
      value: '',
    });
    if (selectedOrganization?.type === OrganizationStatisticType.CALENDAR) {
      setDataMediumCalendar(undefined);
    }

    const organization = creationDataCommonData?.myStatistics?.find(
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
      setMediumOptions([
        {
          label: '-',
          value: '',
        },
        ...removeDuplicateOptions(mediumCategories),
      ]);
    } else {
      setMediumOptions([]);
    }
  };

  // Handle Choose MEDIUM
  const handleSelectMedium = (data: OptionDropdownType) => {
    if (selectedOrganization?.label === ALL_TEAM_STATISTIC) return;
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
    setCurrentPage(1);

    setSelectedMedium(data);
    setSelectedSmall({
      label: '-',
      value: '',
    });

    const organization = creationDataCommonData?.myStatistics?.find(
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
      setSmallOptions([
        {
          label: '-',
          value: '',
        },
        ...removeDuplicateOptions(smallCategories),
      ]);
    } else {
      setSmallOptions([]);
    }
  };
  // Handle choose small

  const handleSelectSmall = (data: OptionDropdownType) => {
    setCurrentPage(1);

    setSelectedSmall(data);
  };

  return (
    <div className="font-medium">
      <div className="sticky z-[30] top-[0px] px-10 py-[27px] bg-[#E6F3FB] flex justify-between items-center ">
        <div className="flex items-center gap-5 ">
          <span className="text-[26px] font-medium relative top-[-2px]">
            集計
          </span>
          <div className="flex justify-center bg-white p-[6px] rounded-[20px] items-center gap-2 ">
            <Button
              onClick={() => {
                if (!isMyTask) {
                  setIsMyTask(true);
                }
              }}
              variant={isMyTask ? 'primary' : 'outline'}
              className={`!py-0 !px-0 font-bold w-[90px] h-7 
              !rounded-[20px] text-xs  ${isMyTask ? '' : '!text-[#77858F] !bg-[#EBF1F7] !border-none'}`}>
              カテゴリー
            </Button>
            <Button
              onClick={() => {
                router.push(pageRouters.STATISTIC_TAG_MANAGEMENT.href);
              }}
              variant={!isMyTask ? 'primary' : 'outline'}
              disabled={isHasLoading}
              className={`${!isMyTask ? '' : '!text-[#77858F] !bg-[#EBF1F7] !border-none '} !py-0 !px-0 font-bold w-[90px] h-7 !rounded-[20px] text-xs`}>
              タグ
            </Button>
          </div>{' '}
        </div>
        <div className="">
          <StatisticCalendar />
        </div>
      </div>
      <div className="w-full mb-[30px] border-t border-[#D2DBE1]"></div>
      <div className="px-10">
        <div className="flex justify-between w-full">
          <div className="flex items-center gap-2">
            <div className="w-[220px]">
              <Dropdown
                options={listOptionsOrganization}
                placeholder="-"
                disabled={isHasLoading}
                placeholderClass="!text-black text-sm font-normal"
                className="!h-[34px] !rounded-md !border text-sm font-normal !py-0 !border-[#77858F]"
                labelTextClass="!text-[#77858F] !text-xs !font-medium"
                classNameOption="!text-sm"
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
                placeholder="-"
                placeholderClass="!text-black text-sm font-normal"
                className="!h-[34px] !rounded-md !border text-sm font-normal !py-0 !border-[#77858F]"
                labelTextClass="!text-[#77858F] !text-xs !font-medium"
                classNameOption="!text-sm"
                selectedOption={selectedLarge || undefined}
                onChange={(data) => handleSelectLarge(data)}
                disabled={!selectedOrganization || isHasLoading}
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
                placeholder="-"
                placeholderClass="!text-black text-sm font-normal"
                className="!h-[34px] !rounded-md !border text-sm font-normal !py-0 !border-[#77858F]"
                labelTextClass="!text-[#77858F] !text-xs !font-medium"
                classNameOption="!text-sm"
                options={mediumOptions}
                selectedOption={selectedMedium || undefined}
                onChange={(data) => handleSelectMedium(data)}
                disabled={
                  selectedLarge?.value == '' ||
                  isHasLoading ||
                  isDisableCalendar
                }
              />
            </div>
          </div>
        </div>
        <div className="flex items-center mt-8  gap-1 mb-[30px]">
          {/* Filter */}
          <FilterStatistic />
        </div>
        {isCheckCompare ? (
          <>
            {/* Percentage of categories */}
            <PercentageCategoryCompare
              startDate={startDate}
              endDate={endDate}
              startDateCompare={startDateCompare}
              endDateCompare={endDateCompare}
              statisticCategoryList={statisticCategoryList}
              statisticCategoryCompareList={statisticCategoryCompareList}
              statisticAllTeamCategoryList={statisticAllTeamCategoryList}
              statisticAllTeamCategoryCompareList={
                statisticAllTeamCategoryCompareList
              }
              handleSelectOrganization={handleSelectOrganization}
              handleSelectOrganizationCustom={handleSelectOrganizationCustom}
              handleSelectLarge={handleSelectLarge}
              handleSelectMedium={handleSelectMedium}
              handleSelectSmall={handleSelectSmall}
            />
            {/* Progress bar */}
            <AllocationCategoryCompare
              startDate={startDate}
              endDate={endDate}
              startDateCompare={startDateCompare}
              endDateCompare={endDateCompare}
              statisticCategoryList={statisticCategoryList}
              statisticCategoryCompareList={statisticCategoryCompareList}
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
              statisticCategoryList={statisticCategoryList}
              statisticTaskDurationsCompareList={
                statisticTaskDurationsCompareList
              }
              statisticTaskDurationsList={statisticTaskDurationsList}
              statisticAllTeamTaskDurationsList={
                statisticAllTeamTaskDurationsList
              }
              statisticAllTeamTaskDurationsCompareList={
                statisticAllTeamTaskDurationsCompareList
              }
              isFetchingStatisticAllTeamTaskDurationsList={
                isFetchingStatisticAllTeamTaskDurationsList
              }
              isFetchingStatisticAllTeamTaskDurationsCompareList={
                isFetchingStatisticAllTeamTaskDurationsCompareList
              }
              isFetchingStatisticTaskDurationsCompareList={
                isFetchingStatisticTaskDurationsCompareList
              }
              isFetchingStatisticTaskDurationsList={
                isFetchingStatisticTaskDurationsList
              }
              handleSelectOrganization={handleSelectOrganization}
              handleSelectLarge={handleSelectLarge}
              handleSelectMedium={handleSelectMedium}
            />
          </>
        ) : (
          <>
            {/* Percentage of categories */}
            <PercentageCategory
              startDate={startDate}
              endDate={endDate}
              statisticCategoryList={statisticCategoryList}
              statisticAllTeamCategoryList={statisticAllTeamCategoryList}
              handleSelectOrganization={handleSelectOrganization}
              handleSelectOrganizationCustom={handleSelectOrganizationCustom}
              handleSelectSmall={handleSelectSmall}
              handleSelectLarge={handleSelectLarge}
              handleSelectMedium={handleSelectMedium}
            />
            {/* Progress bar */}
            <AllocationCategory
              startDate={startDate}
              endDate={endDate}
              statisticCategoryList={statisticCategoryList}
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
              statisticCategoryList={statisticCategoryList}
              statisticTaskDurationsList={statisticTaskDurationsList}
              statisticAllTeamTaskDurationsList={
                statisticAllTeamTaskDurationsList
              }
              isFetchingStatisticTaskDurationsList={
                isFetchingStatisticTaskDurationsList
              }
              isFetchingStatisticAllTeamTaskDurationsList={
                isFetchingStatisticAllTeamTaskDurationsList
              }
              handleSelectOrganization={handleSelectOrganization}
              handleSelectLarge={handleSelectLarge}
              handleSelectMedium={handleSelectMedium}
            />
            {/* Stack area chart */}
            <StackedAreaChart
              startDate={startDate}
              endDate={endDate}
              statisticCategoryList={statisticCategoryList}
              statisticTaskDurationsList={statisticTaskDurationsList}
              statisticAllTeamTaskDurationsList={
                statisticAllTeamTaskDurationsList
              }
              isFetchingStatisticTaskDurationsList={
                isFetchingStatisticTaskDurationsList
              }
              isFetchingStatisticAllTeamTaskDurationsList={
                isFetchingStatisticAllTeamTaskDurationsList
              }
              handleSelectOrganization={handleSelectOrganization}
              handleSelectLarge={handleSelectLarge}
              handleSelectMedium={handleSelectMedium}
            />
          </>
        )}

        {/* Task list */}
        <TaskListStatistic
          startDate={startDate}
          endDate={endDate}
          startDateCompare={startDateCompare}
          endDateCompare={endDateCompare}
          isCheckCompare={isCheckCompare}
          handleSelectOrganization={handleSelectOrganization}
          handleSelectLarge={handleSelectLarge}
          handleSelectMedium={handleSelectMedium}
          handleSelectSmall={handleSelectSmall}
          creationDataStatisticData={creationDataCommonData?.myStatistics || []}
        />
      </div>
    </div>
  );
};

export default StatisticBoard;
