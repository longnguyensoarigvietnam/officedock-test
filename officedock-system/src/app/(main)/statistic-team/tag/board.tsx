'use client';
import React, { useContext } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import Button from '@components/common/Button';
import StatisticTeamCalendar from '@components/statisticTeam/tag/StatisticTeamCalendar';
import PercentageTeamTags from '@components/statisticTeam/tag/PercentageTeamTags';
import PercentageTeamTagsCompare from '@components/statisticTeam/tag/compare/PercentageTeamTagsCompare';
import TaskListStatisticTeamTags from '@components/statisticTeam/tag/TaskList';
import LineChartByTeamTags from '@components/statisticTeam/tag/LineChartByTeamTags';
import LineChartByTeamTagsCompare from '@components/statisticTeam/tag/compare/LineChartByTeamTagsCompare';
import AllocationTagTeamCompare from '@components/statisticTeam/tag/compare/AllocationTagTeamCompare';
import AllocationTeamTag from '@components/statisticTeam/tag/AllocationTeamTag';
import StackedAreaTeamTagChart from '@components/statisticTeam/tag/StackedAreaTeamTagChart';
import FilterTagUserTeam from '@components/statisticTeam/tag/filter/FilterTagUserTeam';
import FilterTagTeam from '@components/statisticTeam/tag/filter/FilterTagTeam';

import { pageRouters } from '@constants/routers';
import { ERROR_COMMON_MESSAGE } from '@constants/message';
import { ALL_TEAM_STATISTIC, DEFAULT_TIME_TEXT, NO_SETTING } from '@constants';
import { OrganizationStatisticType } from '@constants/enums';

import useStatisticTagsTeam from '@hooks/useStatisticTagsTeam';
import useStatisticTagsTeamCompare from '@hooks/useStatisticTagsTeamCompare';
import useStatisticAllTeamCategories from '@hooks/useStatisticAllTeamCategories';
import useStatisticAllTeamCategoriesCompare from '@hooks/useStatisticAllTeamCategoriesCompare';
import useCreationDataCommon from '@hooks/common/useCreationDataCommon';

import { StatisticTeamTagsStateContext } from '@providers/StatisticTeamProviderTag';
import { useToast } from '@providers/ToastProvider';
import { GlobalStateContext } from '@providers/GlobalStateProvider';

import { OptionDropdownType } from '@interfaces/common';

import { formatDateToYMD, sumDurations } from '@utils/date';

import { removeDuplicateOptions } from '@utils';

const StatisticTeamTagBoard = () => {
  const {
    startDate,
    endDate,
    listMemberTeam,
    isCheckCompare,
    startDateCompare,
    endDateCompare,
    selectedLarge,
    selectedMedium,
    selectedOrganization,
    selectedSmall,
    orderingOptions,
    isHasLoading,
    setOrderingOptions,
    setTagsOptions,
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
    setListMemberTeam,
    setTotalDurationCategory,
    setTotalDurationCategoryCompare,
    setIsLoadingLarge,
    setIsLoadingMedium,
    setIsLoadingSmall,
    setIsLoadingOrganization,
    setIsLoadingOrganizationCompare,
    setIsLoadingLargeCompare,
    setIsLoadingMediumCompare,
    setIsLoadingSmallCompare,
    setCurrentPage,
    setIsSkeletonTagTeamTask,
    handleResetTableData,
    setDataMediumCalendar,
    setTotalDurationTask,
    setTotalDurationTaskCompare,
  } = useContext(StatisticTeamTagsStateContext);
  const {
    organizationTeamList,
    selectedOrganization: selectedOrganizationSideBar,
  } = useContext(GlobalStateContext);

  const router = useRouter();
  const { showToast } = useToast();

  const searchParams = useSearchParams();
  const params = new URLSearchParams(searchParams);

  const handleSetParam = (id: string) => {
    params.set('organization', id);
    router.push(`?${params.toString()}`);
  };

  const organizationId = searchParams.get('organization');

  const { creationDataCommonData } = useCreationDataCommon({
    organizationId: selectedOrganizationSideBar
      ? selectedOrganizationSideBar?.value
        ? (selectedOrganizationSideBar?.value as string)
        : undefined
      : organizationId == 'null'
        ? undefined
        : organizationId || undefined,
    options: {
      get_organization_for_team_statistic: true,
    },
    onSuccess: (data) => {
      if (data.organizationStatistics) {
        const result = (() => {
          if (data.organizationStatistics.length === 0) {
            return { label: '', value: '' };
          }

          const mainItem =
            data.organizationStatistics.find((item) => item.isMain) ||
            data.organizationStatistics[1];
          const optionsTagList = mainItem.tags.map((item) => ({
            label: item.name,
            value: item.id,
          }));

          setTagsOptions(optionsTagList);

          setListMemberTeam(
            mainItem.members.map((member) => ({
              id: member.id,
              fullName: member.fullName,
              color: member?.avatarColor || '',
              avatarUrl: member?.avatar || '',
            })),
          );
          setOrderingOptions({
            tag_ids: optionsTagList,
            user_ids: [],
          });

          return {
            label: mainItem.name,
            value: mainItem.id,
          };
        })();
        handleSelectOrganization(result);
        setListOptionsOrganization([
          ...data.organizationStatistics.map((org) => ({
            value: org.id || '',
            label: org.name,
            type: org.type,
          })),
        ]);
      }
    },
  });

  const { statisticTagsListTeam } = useStatisticTagsTeam({
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
      orderingOptions: orderingOptions,
      organizationMemberId:
        selectedOrganization?.type === OrganizationStatisticType.CALENDAR
          ? String(selectedOrganizationSideBar?.value || '')
          : undefined,
    },
    condition: [selectedOrganization?.value != ALL_TEAM_STATISTIC],
    onSuccess: (data) => {
      if (selectedOrganization?.value !== ALL_TEAM_STATISTIC) {
        setIsSkeletonTagTeamTask(false);
      }
      if (
        !creationDataCommonData?.organizationStatistics ||
        creationDataCommonData?.organizationStatistics?.length === 0
      ) {
        return;
      }

      const organization =
        selectedOrganization && selectedOrganization.value
          ? creationDataCommonData?.organizationStatistics?.find(
              (item) => item.id === selectedOrganization?.value,
            )
          : creationDataCommonData?.organizationStatistics?.find(
              (item) => item.isMain === true,
            ) || creationDataCommonData?.organizationStatistics[0];

      if (organization) {
        const largeCategories = organization.statisticCategories.map(
          (stat) => ({
            value: stat.LARGE.id,
            label: stat.LARGE.name,
          }),
        );
        // If organization is all team then return here
        if (selectedOrganization?.value === ALL_TEAM_STATISTIC) {
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
    onError: () => {
      showToast({
        variant: 'error',
        description: ERROR_COMMON_MESSAGE,
      });
      if (organizationTeamList.length) {
        handleSetParam(String(organizationTeamList[0].value));
      }
    },
  });
  const { statisticTagsListTeamCompare } = useStatisticTagsTeamCompare({
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
      orderingOptions: orderingOptions,
      isCompare: isCheckCompare,
      organizationMemberId:
        selectedOrganization?.type === OrganizationStatisticType.CALENDAR
          ? String(selectedOrganizationSideBar?.value || '')
          : undefined,
    },
    condition: [selectedOrganization?.value != ALL_TEAM_STATISTIC],
    onSuccess: (data) => {
      if (selectedOrganization?.value !== ALL_TEAM_STATISTIC) {
        setIsSkeletonTagTeamTask(false);
      }
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
              selectedMedium.value != '' &&
              selectedOrganization?.type === OrganizationStatisticType.CALENDAR
            ) {
              setTotalDurationTaskCompare(DEFAULT_TIME_TEXT);
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
    onError: () => {
      showToast({
        variant: 'error',
        description: ERROR_COMMON_MESSAGE,
      });
      if (organizationTeamList.length) {
        handleSetParam(String(organizationTeamList[0].value));
      }
    },
  });
  //  Get statistic categories for ALL TEAM option
  const { statisticAllTeamCategoryList } = useStatisticAllTeamCategories({
    isTeam: true,
    filter: {
      fromDate: formatDateToYMD(startDate) || '',
      endDate: formatDateToYMD(`${endDate}`) || '',
      tagIds: orderingOptions?.tag_ids,
      mainOrganizationId: selectedOrganizationSideBar?.value as number,
      isTagPage: true,
      userIds:
        orderingOptions?.user_ids && orderingOptions.user_ids.length > 0
          ? orderingOptions.user_ids
          : listMemberTeam.map((user) => ({
              label: user.fullName,
              value: user.id,
            })),
    },
    condition: [selectedOrganization?.value == ALL_TEAM_STATISTIC],
    onSuccess: (data) => {
      setLargeOptions([]);
      setTotalDurationLarge(data.largeTotalDuration || DEFAULT_TIME_TEXT);
      setTotalDurationTask(data.largeTotalDuration || DEFAULT_TIME_TEXT);
      setIsLoadingOrganization(false);
      setIsLoadingLarge(false);
      setIsLoadingMedium(false);
      setIsLoadingSmall(false);
    },
  });

  // Get statistic compared categories for ALL TEAM option
  const { statisticAllTeamCategoryCompareList } =
    useStatisticAllTeamCategoriesCompare({
      isTeam: true,
      filter: {
        fromDate: formatDateToYMD(startDateCompare) || '',
        endDate: formatDateToYMD(`${endDateCompare}`) || '',
        tagIds: orderingOptions?.tag_ids,
        mainOrganizationId: selectedOrganizationSideBar?.value as number,
        isCompare: isCheckCompare,
        isTagPage: true,
        userIds:
          orderingOptions?.user_ids && orderingOptions.user_ids.length > 0
            ? orderingOptions.user_ids
            : listMemberTeam.map((user) => ({
                label: user.fullName,
                value: user.id,
              })),
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
        setIsLoadingSmallCompare(false);
      },
    });

  // Handle Choose organization
  const handleSelectOrganization = (data: OptionDropdownType) => {
    handleResetTableData();
    if (data.value !== selectedOrganization?.value) {
      setIsLoadingOrganization(true);
      if (isCheckCompare) {
        setIsLoadingOrganizationCompare(true);
      }
    }
    setCurrentPage(1);
    if (data?.type === OrganizationStatisticType.CALENDAR) {
      setDataMediumCalendar(undefined);
    }
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

    const organization = creationDataCommonData?.organizationStatistics?.find(
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
      setTagsOptions(optionsTagList);
      setListMemberTeam(
        organization.members.map((member) => ({
          id: member.id,
          fullName: member.fullName,
          color: member?.avatarColor || '',
          avatarUrl: member?.avatar || '',
        })),
      );
      setOrderingOptions({
        tag_ids: optionsTagList,
        user_ids: [],
      });

      setCurrentPage(1);
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
    if (data.value !== selectedLarge?.value) {
      setIsLoadingLarge(true);
      if (isCheckCompare) {
        setIsLoadingLargeCompare(true);
      }
    }
    handleResetTableData();
    setCurrentPage(1);
    if (selectedOrganization?.type === OrganizationStatisticType.CALENDAR) {
      setDataMediumCalendar(undefined);
    }
    setSelectedLarge(data);
    setSelectedMedium({
      label: '-',
      value: '',
    });
    setSelectedSmall({
      label: '-',
      value: '',
    });

    const organization = creationDataCommonData?.organizationStatistics?.find(
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
    handleResetTableData();
    setCurrentPage(1);

    setSelectedMedium(data);
    setSelectedSmall({
      label: '-',
      value: '',
    });

    const organization = creationDataCommonData?.organizationStatistics?.find(
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
    if (data.value !== selectedSmall?.value) {
      setIsLoadingSmall(true);
      if (isCheckCompare) {
        setIsLoadingSmallCompare(true);
      }
    }
    setCurrentPage(1);
    handleResetTableData();

    setSelectedSmall(data);
  };

  return (
    <div className="font-medium ">
      <div className="sticky z-[21] top-[0px] px-10 py-[27px] bg-[#E6F3FB] flex items-start justify-between">
        <div className="flex items-start">
          {selectedOrganizationSideBar?.imgComponent && (
            <div className="rounded-full w-[34px] h-[34px] scale-[1.4167] min-w-[34px] flex items-center justify-center overflow-hidden">
              {selectedOrganizationSideBar?.imgComponent}
            </div>
          )}
          <span className="text-[26px] font-medium relative top-[-2px] max-w-[450px] line-clamp-3 break-all ml-[10px]">
            {selectedOrganizationSideBar?.label}チーム集計
          </span>
          <div className="flex justify-center bg-white p-[6px] rounded-[20px] items-center gap-2 ml-5">
            <Button
              variant={'outline'}
              onClick={() => {
                router.push(
                  `${pageRouters.STATISTIC_TEAM_MANAGEMENT.href}?organization=${(selectedOrganizationSideBar?.value as string) || organizationId}&tabId=1`,
                );
              }}
              disabled={isHasLoading}
              className={`!py-0 !px-0 font-bold w-[90px] h-7
              !rounded-[20px] text-xs !text-[#77858F] !bg-[#EBF1F7] !border-none`}>
              カテゴリー
            </Button>
            <Button
              variant={'primary'}
              className={`!py-0 !px-0 font-bold w-[90px] h-7 !rounded-[20px] text-xs`}>
              タグ
            </Button>
          </div>{' '}
        </div>
        <div className="flex-shrink-0">
          <StatisticTeamCalendar />
        </div>
      </div>
      <div className="w-full mb-[30px] border-t border-[#D2DBE1]"></div>

      <div className="px-10">
        <div className="flex justify-between w-full mb-[30px]">
          {/* Filter tag */}
          <div>
            <FilterTagTeam />
          </div>
        </div>
        <div className="my-[30px]">
          <FilterTagUserTeam />
        </div>
        {isCheckCompare ? (
          <>
            {/* Percentage of categories */}
            <PercentageTeamTagsCompare
              startDate={startDate}
              startDateCompare={startDateCompare}
              statisticTagsListTeamCompare={statisticTagsListTeamCompare}
              statisticAllTeamCategoryList={statisticAllTeamCategoryList}
              statisticAllTeamCategoryCompareList={
                statisticAllTeamCategoryCompareList
              }
              handleSelectOrganization={handleSelectOrganization}
              handleSelectLarge={handleSelectLarge}
              handleSelectMedium={handleSelectMedium}
              handleSelectSmall={handleSelectSmall}
              endDate={endDate}
              statisticTagsListTeam={statisticTagsListTeam}
              endDateCompare={endDateCompare}
            />
            {/* Progress bar */}
            <AllocationTagTeamCompare
              startDate={startDate}
              endDate={endDate}
              startDateCompare={startDateCompare}
              endDateCompare={endDateCompare}
              statisticTagsList={statisticTagsListTeam}
              statisticTagsCompareList={statisticTagsListTeamCompare}
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
            <LineChartByTeamTagsCompare
              startDate={startDate}
              endDate={endDate}
              startDateCompare={startDateCompare}
              endDateCompare={endDateCompare}
              statisticTagsList={statisticTagsListTeam}
              statisticTagsCompareList={statisticTagsListTeamCompare}
              handleSelectOrganization={handleSelectOrganization}
              handleSelectLarge={handleSelectLarge}
              handleSelectMedium={handleSelectMedium}
              handleSelectSmall={handleSelectSmall}
            />
          </>
        ) : (
          <>
            {/* Percentage of category */}
            <PercentageTeamTags
              startDate={startDate}
              endDate={endDate}
              statisticTagsListTeam={statisticTagsListTeam}
              statisticAllTeamCategoryList={statisticAllTeamCategoryList}
              handleSelectOrganization={handleSelectOrganization}
              handleSelectLarge={handleSelectLarge}
              handleSelectMedium={handleSelectMedium}
              handleSelectSmall={handleSelectSmall}
            />
            {/* Progress bar */}
            <AllocationTeamTag
              startDate={startDate}
              endDate={endDate}
              statisticTagsList={statisticTagsListTeam}
              statisticAllTeamCategoryList={statisticAllTeamCategoryList}
              handleSelectOrganization={handleSelectOrganization}
              handleSelectLarge={handleSelectLarge}
              handleSelectMedium={handleSelectMedium}
              handleSelectSmall={handleSelectSmall}
            />
            {/* Line chart */}
            <LineChartByTeamTags
              startDate={startDate}
              endDate={endDate}
              statisticTagsListTeam={statisticTagsListTeam}
              handleSelectOrganization={handleSelectOrganization}
              handleSelectLarge={handleSelectLarge}
              handleSelectMedium={handleSelectMedium}
              handleSelectSmall={handleSelectSmall}
            />
            <StackedAreaTeamTagChart
              startDate={startDate}
              endDate={endDate}
              statisticTagsListTeam={statisticTagsListTeam}
              handleSelectOrganization={handleSelectOrganization}
              handleSelectLarge={handleSelectLarge}
              handleSelectMedium={handleSelectMedium}
              handleSelectSmall={handleSelectSmall}
            />
          </>
        )}

        {/* Task list */}
        {creationDataCommonData?.organizationStatistics && (
          <TaskListStatisticTeamTags
            startDate={startDate}
            endDate={endDate}
            startDateCompare={startDateCompare}
            endDateCompare={endDateCompare}
            isCheckCompare={isCheckCompare}
            statisticTagsListTeam={statisticTagsListTeam}
            handleSelectOrganization={handleSelectOrganization}
            handleSelectLarge={handleSelectLarge}
            handleSelectMedium={handleSelectMedium}
            handleSelectSmall={handleSelectSmall}
            creationDataStatisticData={creationDataCommonData?.organizationStatistics?.find(
              (org) => org.id === selectedOrganization?.value,
            )}
          />
        )}
      </div>
    </div>
  );
};

export default StatisticTeamTagBoard;
