'use client';
import React, { useContext } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import Button from '@components/common/Button';
import StatisticTeamCalendar from '@components/statisticTeam/tag/StatisticTeamCalendar';
import ImageRound from '@components/common/ImageRound';
import PercentageTeamTags from '@components/statisticTeam/tag/PercentageTeamTags';
import PercentageTeamTagsCompare from '@components/statisticTeam/tag/compare/PercentageTeamTagsCompare';
import TaskListStatisticTeamTags from '@components/statisticTeam/tag/TaskList';
import CustomUserAvatar from '@components/common/AvatarIcon/CustomUserAvatar';
import LineChartByTeamTags from '@components/statisticTeam/tag/LineChartByTeamTags';
import LineChartByTeamTagsCompare from '@components/statisticTeam/tag/compare/LineChartByTeamTagsCompare';
import AllocationTagTeamCompare from '@components/statisticTeam/tag/compare/AllocationTagTeamCompare';
import AllocationTeamTag from '@components/statisticTeam/tag/AllocationTeamTag';
import StackedAreaTeamTagChart from '@components/statisticTeam/tag/StackedAreaTeamTagChart';
import FilterTagTeam from '@components/statisticTeam/tag/filter/FilterTagTeam';

import { pageRouters } from '@constants/routers';
import { ERROR_COMMON_MESSAGE } from '@constants/message';
import { ALL_TEAM_STATISTIC, DEFAULT_TIME_TEXT } from '@constants';
import { OrganizationStatisticType } from '@constants/enums';

import useCreationDataStatisticTeam from '@hooks/useCreationDataStatisticTeam';
import useStatisticTagsTeam from '@hooks/useStatisticTagsTeam';
import useStatisticTagsTeamCompare from '@hooks/useStatisticTagsTeamCompare';
import useStatisticAllTeamCategories from '@hooks/useStatisticAllTeamCategories';
import useStatisticAllTeamCategoriesCompare from '@hooks/useStatisticAllTeamCategoriesCompare';

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
    selectedTags,
    selectedSmall,
    orderingOptions,
    isHasLoading,
    setOrderingOptions,
    setTagsOptions,
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
  const { creationDataStatisticData } = useCreationDataStatisticTeam({
    organization_id: selectedOrganizationSideBar
      ? (selectedOrganizationSideBar?.value as string)
      : organizationId || '',

    isTeam: true,
    is_statistic: true,
    onSuccess: (data) => {
      if (!data) return;

      const result = (() => {
        if (data.organizations.length === 0) {
          return { label: '', value: '' };
        }

        const mainItem =
          data.organizations.find((item) => item.isMain) ||
          data.organizations[1];
        const optionsTagList = mainItem.tags.map((item) => ({
          label: item.name,
          value: item.id,
        }));

        setTagsOptions(optionsTagList);
        setSelectedTags(optionsTagList);

        setListMemberTeam(
          mainItem.members.map((member) => ({
            id: member.id,
            fullName: member.fullName,
            color: member?.avatarColor || '',
            avatarUrl: member?.avatar || '',
          })),
        );
        setOrderingOptions({
          user_ids: mainItem.members.map((member) => ({
            value: member.id,
            label: member.fullName,
            color: member?.avatarColor || '',
            avatarUrl: member?.avatar || '',
          })),
        });

        return {
          label: mainItem.name,
          value: mainItem.id,
        };
      })();
      handleSelectOrganization(result);
      setListOptionsOrganization([
        ...data.organizations.map((org) => ({
          value: org.id || '',
          label: org.name,
          type: org.type,
        })),
      ]);
    },
  });

  const { statisticTagsListTeam } = useStatisticTagsTeam({
    filter: {
      fromDate: formatDateToYMD(startDate) || '',
      endDate: formatDateToYMD(`${endDate}`) || '',
      organizationIds: String(selectedOrganization?.value || ''),
      largeCategoryId: selectedLarge?.value as number,
      mediumCategoryId: selectedMedium?.value as number,
      smallCategoryId: selectedSmall?.value as number,
      tagIds: selectedTags,
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
      if (creationDataStatisticData?.organizations.length === 0) {
        return;
      }

      const organization =
        selectedOrganization && selectedOrganization.value
          ? creationDataStatisticData?.organizations.find(
              (item) => item.id === selectedOrganization?.value,
            )
          : creationDataStatisticData?.organizations.find(
              (item) => item.isMain === true,
            ) || creationDataStatisticData?.organizations[0];

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
          setLargeOptions(largeCategories);
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
      largeCategoryId: selectedLarge?.value as number,
      mediumCategoryId: selectedMedium?.value as number,
      smallCategoryId: selectedSmall?.value as number,
      tagIds: selectedTags,
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
      tagIds: selectedTags,
      mainOrganizationId: selectedOrganizationSideBar?.value as number,
      isTagPage: true,
      userIds: listMemberTeam.map((user) => ({
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
        tagIds: selectedTags,
        mainOrganizationId: selectedOrganizationSideBar?.value as number,
        isCompare: isCheckCompare,
        isTagPage: true,
        userIds: listMemberTeam.map((user) => ({
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
      setTagsOptions(optionsTagList);
      setSelectedTags(optionsTagList);
      setListMemberTeam(
        organization.members.map((member) => ({
          id: member.id,
          fullName: member.fullName,
          color: member?.avatarColor || '',
          avatarUrl: member?.avatar || '',
        })),
      );
      setOrderingOptions({
        user_ids: organization.members.map((member) => ({
          value: member.id,
          label: member.fullName,
          color: member?.avatarColor || '',
          avatarUrl: member?.avatar || '',
        })),
      });

      setCurrentPage(1);
      // If organization is all team then return here
      if (data?.value === ALL_TEAM_STATISTIC) {
        setLargeOptions([]);
      } else {
        setLargeOptions(largeCategories);
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
    setSelectedMedium(null);
    setSelectedSmall(null);

    const organization = creationDataStatisticData?.organizations?.find(
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
    handleResetTableData();
    setCurrentPage(1);

    setSelectedMedium(data);
    setSelectedSmall(null);

    const organization = creationDataStatisticData?.organizations?.find(
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
  const getParticipantAvatars = (
    participants: {
      id: number;
      fullName: string;
      color: string;
      avatarUrl: string;
    }[],
  ) => {
    const slicedParticipants = participants.slice(0, 6);
    const remainingCount =
      participants.length > 3 ? participants.length - 6 : 0;

    return (
      <div className="flex items-center">
        {slicedParticipants.map((item) => {
          return (
            <div
              className="ml-[-10px] relative border-[1px] border-white rounded-full h-[32px] w-[32px]"
              key={item.id}>
              <CustomUserAvatar
                avatarUrl={item?.avatarUrl || ''}
                avatarColor={item?.color || ''}
                size={32}
                customClassName={`${!item?.avatarUrl && '!mt-0'}`}
              />
            </div>
          );
        })}
        {remainingCount > 0 && (
          <div className="ml-[-10px] relative flex items-center justify-center bg-[#97A9B2] border-[1px] border-white rounded-full text-sm text-white w-[32px] h-[32px]">
            +{remainingCount}
          </div>
        )}
      </div>
    );
  };

  // Remove user
  const removeUser = (selected: OptionDropdownType) => {
    const currentUserIds = orderingOptions?.user_ids || [];
    const updatedUserIds = currentUserIds.filter(
      (tag) => tag.value !== selected.value,
    );

    setCurrentPage(1);
    setOrderingOptions({
      user_ids: updatedUserIds,
    });
    handleResetTableData();
  };

  return (
    <div className="pt-[30px] pr-10  font-medium ">
      <div className="mb-[33px] flex items-start justify-between">
        <div className="flex items-start gap-5 ">
          <div className="rounded-full w-[34px] h-[34px]  flex items-center justify-center overflow-hidden">
            <ImageRound
              className="w-[34px] h-[34px] rounded-full"
              src="/icons/statistic-team.svg"
              border="full"
              name="Multi users"
            />
          </div>
          <span className="text-[26px] font-medium relative top-[-2px] line-clamp-3 max-w-[450px] break-all">
            {selectedOrganization?.label}
          </span>
          <span className="text-[26px] font-medium relative top-[-2px]">
            チーム集計
          </span>
          <div className="flex justify-center items-center gap-2 mt-[6px]">
            <Button
              variant={'outline'}
              onClick={() => {
                router.push(
                  `${pageRouters.STATISTIC_TEAM_MANAGEMENT.href}?organization=${(selectedOrganizationSideBar?.value as string) || organizationId}&tabId=1`,
                );
              }}
              disabled={isHasLoading}
              className={`!py-0 !px-0 font-bold w-[80px] h-7 
              !rounded-[20px] text-xs !text-[#77858F] !bg-transparent !border-[#77858F]`}>
              カテゴリー
            </Button>
            <Button
              variant={'primary'}
              className={`!py-0 !px-0 font-bold w-[80px] h-7 !rounded-[20px] text-xs`}>
              タグ
            </Button>
          </div>{' '}
        </div>
        <div className="flex items-center mt-[6px]">
          {listMemberTeam.length > 0 && getParticipantAvatars(listMemberTeam)}
        </div>
      </div>
      <div>
        <div className="flex justify-between w-full mb-[30px]">
          {/* Filter tag */}
          <FilterTagTeam />
          <div>
            <StatisticTeamCalendar />
          </div>
        </div>
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
            removeUser={removeUser}
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
            removeUser={removeUser}
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
      {creationDataStatisticData && (
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
          creationDataStatisticData={creationDataStatisticData?.organizations?.find(
            (org) => org.id === selectedOrganization?.value,
          )}
        />
      )}
    </div>
  );
};

export default StatisticTeamTagBoard;
