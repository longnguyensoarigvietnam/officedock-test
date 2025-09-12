'use client';
import React, { useContext } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import Button from '@components/common/Button';
import Dropdown from '@components/common/Dropdown';
import ImageRound from '@components/common/ImageRound';
import StatisticTeamCalendar from '@components/statisticTeam/category/StatisticTeamCalendar';
import PercentageTeamCategory from '@components/statisticTeam/category/PercentageTeamCategory';
import PercentageTeamCategoryCompare from '@components/statisticTeam/category/compare/PercentageCategoryCompare';
import TaskListTeamStatistic from '@components/statisticTeam/category/TaskList';
import LineChartByTeam from '@components/statisticTeam/category/LineChartByTeam';
import LineChartByTeamCompare from '@components/statisticTeam/category/compare/LineChartByTeamCompare';
import AllocationTeamCategoryCompare from '@components/statisticTeam/category/compare/AllocationTeamCategoryCompare';
import AllocationTeamCategory from '@components/statisticTeam/category/AllocationTeamCategory';
import StackedAreaTeamChart from '@components/statisticTeam/category/StackedAreaTeamChart';
import FilterTeamStatistic from '@components/statisticTeam/category/filter/FilterTeamStatistic';

import { ERROR_COMMON_MESSAGE } from '@constants/message';
import { pageRouters } from '@constants/routers';
import { ALL_TEAM_STATISTIC, DEFAULT_TIME_TEXT, NO_SETTING } from '@constants';
import { OrganizationStatisticType } from '@constants/enums';

import useStatisticAllTeamCategories from '@hooks/useStatisticAllTeamCategories';
import useStatisticAllTeamCategoriesCompare from '@hooks/useStatisticAllTeamCategoriesCompare';
import useStatisticCategoriesTeam from '@hooks/useStatisticCategoriesTeam';
import useStatisticCategoriesTeamCompare from '@hooks/useStatisticCategoriesTeamCompare';
import useCreationDataStatisticTeam from '@hooks/useCreationDataStatisticTeam';

import { OptionDropdownType } from '@interfaces/common';

import { formatDateToYMD, sumDurations } from '@utils/date';
import { removeDuplicateOptions } from '@utils';

import { StatisticTeamStateContext } from '@providers/StatisticTeamProvider';
import { useToast } from '@providers/ToastProvider';
import { GlobalStateContext } from '@providers/GlobalStateProvider';

const StatisticTeamBoard = () => {
  const {
    isDisableCalendar,
    isHasLoading,
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
    selectedSmall,
    selectedOrganization,
    orderingOptions,
    listMemberTeam,
    setOrderingOptions,
    setTotalDurationTask,
    setTotalDurationTaskCompare,
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
    setIsLoadingOrganization,
    setIsLoadingLarge,
    setIsLoadingMedium,
    setIsLoadingOrganizationCompare,
    setIsLoadingLargeCompare,
    setIsLoadingMediumCompare,
    setCurrentPage,
    handleResetTableData,
    setDataMediumCalendar,
  } = useContext(StatisticTeamStateContext);
  const {
    organizationTeamList,
    selectedOrganization: selectedOrganizationSideBar,
  } = useContext(GlobalStateContext);

  const router = useRouter();
  const searchParams = useSearchParams();

  const params = new URLSearchParams(searchParams);

  const { showToast } = useToast();

  const handleSetParam = (id: string) => {
    params.set('organization', id);
    router.push(`?${params.toString()}`);
  };

  const organizationId = searchParams.get('organization');

  // Get statistic categories for options that except ALL TEAM option
  const { statisticCategoryListTeam } = useStatisticCategoriesTeam({
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
        const largeCategories = organization.statisticCategories?.map(
          (stat) => ({
            value: stat.LARGE?.id,
            label: stat.LARGE?.name,
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
    onError: () => {
      showToast({
        variant: 'error',
        description: ERROR_COMMON_MESSAGE,
      });
      if (organizationTeamList.length > 0) {
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
      userIds:
        orderingOptions?.user_ids?.length != 0
          ? orderingOptions?.user_ids
          : listMemberTeam.map((user) => ({
              label: user.fullName,
              value: user.id,
            })),
      mainOrganizationId: selectedOrganizationSideBar?.value as number,
    },
    condition: [selectedOrganization?.value == ALL_TEAM_STATISTIC],
    onSuccess: (data) => {
      setLargeOptions([]);
      setTotalDurationLarge(data.largeTotalDuration || DEFAULT_TIME_TEXT);
      setTotalDurationTask(data.largeTotalDuration || DEFAULT_TIME_TEXT);
      setTotalDurationMedium(DEFAULT_TIME_TEXT);
      setTotalDurationSmall(DEFAULT_TIME_TEXT);
      setIsLoadingOrganization(false);
      setIsLoadingLarge(false);
      setIsLoadingMedium(false);
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
        userIds:
          orderingOptions?.user_ids?.length != 0
            ? orderingOptions?.user_ids
            : listMemberTeam.map((user) => ({
                label: user.fullName,
                value: user.id,
              })),
        mainOrganizationId: selectedOrganizationSideBar?.value as number,
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

  // Get statistic categories compare for options that except ALL TEAM option
  const { statisticCategoryListTeamCompare } =
    useStatisticCategoriesTeamCompare({
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
        orderingOptions: orderingOptions,
        organizationMemberId:
          selectedOrganization?.type === OrganizationStatisticType.CALENDAR
            ? String(selectedOrganizationSideBar?.value || '')
            : undefined,
      },
      condition: [selectedOrganization?.value != ALL_TEAM_STATISTIC],
      onSuccess: (data) => {
        setTotalDurationLargeCompare(sumDurations(data.largeCategories ?? []));
        setTotalDurationMediumCompare(
          sumDurations(data.mediumCategories ?? []),
        );
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
                selectedOrganization?.type ===
                  OrganizationStatisticType.CALENDAR
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
      onError: () => {
        showToast({
          variant: 'error',
          description: ERROR_COMMON_MESSAGE,
        });
        if (organizationTeamList.length > 0) {
          handleSetParam(String(organizationTeamList[0].value));
        }
      },
    });

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
        setListMemberTeam(
          mainItem.members.map((member) => ({
            id: member.id,
            fullName: member.fullName,
            color: member?.avatarColor || '',
            avatarUrl: member?.avatar || '',
          })),
        );
        setOrderingOptions({
          tag_ids: [],
          user_ids: [],
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

    const organization = creationDataStatisticData?.organizations?.find(
      (org) => org.id === selectedOrganizationSideBar?.value,
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
      setOrderingOptions({
        tag_ids: [],
        user_ids: organization.members.map((member) => ({
          value: member.id,
          label: member.fullName,
          color: member?.avatarColor || '',
          avatarUrl: member?.avatar || '',
        })),
      });
      setListMemberTeam(
        organization.members.map((member) => ({
          id: member.id,
          fullName: member.fullName,
          color: member?.avatarColor || '',
          avatarUrl: member?.avatar || '',
        })),
      );

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

  // Handle Choose organization with option large
  const handleSelectOrganizationCustom = (data: OptionDropdownType) => {
    if (selectedOrganization?.value == ALL_TEAM_STATISTIC) return;
    setCurrentPage(1);
    handleResetTableData();
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
    if (data?.type === OrganizationStatisticType.CALENDAR) {
      setDataMediumCalendar(undefined);
    }

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
      setListMemberTeam(
        organization.members.map((member) => ({
          id: member.id,
          fullName: member.fullName,
          color: member?.avatarColor || '',
          avatarUrl: member?.avatar || '',
        })),
      );
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
    if (selectedOrganization?.label === ALL_TEAM_STATISTIC) return;
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
    handleResetTableData();
    setCurrentPage(1);

    setSelectedMedium(data);
    setSelectedSmall({
      label: '-',
      value: '',
    });

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
    handleResetTableData();

    setSelectedSmall(data);
  };

  return (
    <div className="pt-[30px] pr-10  font-medium ">
      <div className=" flex items-start justify-between">
        <div className="flex items-center justify-between">
          <div className="flex items-start gap-5 ">
            <div className="rounded-full w-[34px] h-[34px] min-w-[34px] flex items-center justify-center overflow-hidden">
              <ImageRound
                className="w-[34px] h-[34px] rounded-full"
                src="/icons/statistic-team.svg"
                border="full"
                name="Multi users"
              />
            </div>
            <span className="text-[26px] font-medium relative top-[-2px] max-w-[450px] line-clamp-3 break-all">
              {selectedOrganization?.label}チーム集計
            </span>
            <div className="flex justify-center bg-white p-[6px] rounded-[20px] items-center gap-2 ">
              <Button
                variant={'primary'}
                className={`!py-0 !px-0 font-bold w-[90px] h-7 
              !rounded-[20px] text-xs  `}>
                カテゴリー
              </Button>
              <Button
                onClick={() => {
                  router.push(
                    `${pageRouters.STATISTIC_TEAM_TAG_MANAGEMENT.href}?organization=${(selectedOrganizationSideBar?.value as string) || organizationId}&tabId=1`,
                  );
                }}
                variant={'outline'}
                disabled={isHasLoading}
                className={`!text-[#77858F] !bg-[#EBF1F7] !border-none !py-0 !px-0 font-bold w-[90px] h-7 !rounded-[20px] text-xs`}>
                タグ
              </Button>
            </div>{' '}
          </div>
        </div>
        <div>
          <StatisticTeamCalendar />
        </div>
      </div>
      <div className="w-full my-[30px] border-t border-[#D2DBE1]"></div>
      <div>
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
        <div>
          {/* Filter modal */}
          <FilterTeamStatistic className="my-[30px]" classNameData=" w-[80%]" />
        </div>
      </div>

      {isCheckCompare ? (
        <>
          {/* Compare percentage of categories */}
          <PercentageTeamCategoryCompare
            startDate={startDate}
            endDate={endDate}
            startDateCompare={startDateCompare}
            endDateCompare={endDateCompare}
            statisticTeamCategoryList={statisticCategoryListTeam}
            statisticCategoryListTeamCompare={statisticCategoryListTeamCompare}
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
          <AllocationTeamCategoryCompare
            startDate={startDate}
            endDate={endDate}
            startDateCompare={startDateCompare}
            endDateCompare={endDateCompare}
            statisticTeamCategoryList={statisticCategoryListTeam}
            statisticCategoryListTeamCompare={statisticCategoryListTeamCompare}
            statisticAllTeamCategoryList={statisticAllTeamCategoryList}
            statisticAllTeamCategoryCompareList={
              statisticAllTeamCategoryCompareList
            }
            handleSelectOrganization={handleSelectOrganization}
            handleSelectLarge={handleSelectLarge}
            handleSelectMedium={handleSelectMedium}
            handleSelectSmall={handleSelectSmall}
          />
          {/* Compare line chart */}
          <LineChartByTeamCompare
            startDate={startDate}
            endDate={endDate}
            startDateCompare={startDateCompare}
            endDateCompare={endDateCompare}
            statisticTeamCategoryList={statisticCategoryListTeam}
            statisticCategoryListTeamCompare={statisticCategoryListTeamCompare}
            handleSelectOrganization={handleSelectOrganization}
            handleSelectLarge={handleSelectLarge}
            handleSelectMedium={handleSelectMedium}
          />
        </>
      ) : (
        <>
          {/* Percentage of category */}
          <PercentageTeamCategory
            startDate={startDate}
            endDate={endDate}
            statisticTeamCategoryList={statisticCategoryListTeam}
            statisticAllTeamCategoryList={statisticAllTeamCategoryList}
            handleSelectOrganization={handleSelectOrganization}
            handleSelectOrganizationCustom={handleSelectOrganizationCustom}
            handleSelectLarge={handleSelectLarge}
            handleSelectMedium={handleSelectMedium}
          />
          {/* Progress bar */}
          <AllocationTeamCategory
            startDate={startDate}
            endDate={endDate}
            statisticTeamCategoryList={statisticCategoryListTeam}
            statisticAllTeamCategoryList={statisticAllTeamCategoryList}
            handleSelectOrganization={handleSelectOrganization}
            handleSelectLarge={handleSelectLarge}
            handleSelectMedium={handleSelectMedium}
            handleSelectSmall={handleSelectSmall}
          />
          {/* Line chart */}
          <LineChartByTeam
            startDate={startDate}
            endDate={endDate}
            statisticTeamCategoryList={statisticCategoryListTeam}
            handleSelectOrganization={handleSelectOrganization}
            handleSelectLarge={handleSelectLarge}
            handleSelectMedium={handleSelectMedium}
          />
          <StackedAreaTeamChart
            startDate={startDate}
            endDate={endDate}
            statisticTeamCategoryList={statisticCategoryListTeam}
            handleSelectOrganization={handleSelectOrganization}
            handleSelectLarge={handleSelectLarge}
            handleSelectMedium={handleSelectMedium}
          />
        </>
      )}
      {/* Task list */}
      {creationDataStatisticData && (
        <TaskListTeamStatistic
          startDate={startDate}
          endDate={endDate}
          startDateCompare={startDateCompare}
          endDateCompare={endDateCompare}
          isCheckCompare={isCheckCompare}
          statisticCategoryListTeam={statisticCategoryListTeam}
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

export default StatisticTeamBoard;
