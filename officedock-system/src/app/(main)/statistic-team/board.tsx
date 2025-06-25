'use client';
import React, { Fragment, useContext, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Popover,
  PopoverButton,
  PopoverPanel,
  Transition,
} from '@headlessui/react';

import Button from '@components/common/Button';
import Dropdown from '@components/common/Dropdown';
import ImageRound from '@components/common/ImageRound';
import StatisticTeamCalendar from '@components/statisticTeam/category/StatisticTeamCalendar';
import PercentageTeamCategory from '@components/statisticTeam/category/PercentageTeamCategory';
import PercentageTeamCategoryCompare from '@components/statisticTeam/category/compare/PercentageCategoryCompare';
import TaskListTeamStatistic from '@components/statisticTeam/category/TaskList';
import CustomUserAvatar from '@components/common/AvatarIcon/CustomUserAvatar';
import ActionFilterStatisticTeam from '@components/modals/ActionFilterTeamStatistic';
import LineChartByTeam from '@components/statisticTeam/category/LineChartByTeam';
import LineChartByTeamCompare from '@components/statisticTeam/category/compare/LineChartByTeamCompare';
import AllocationTeamCategoryCompare from '@components/statisticTeam/category/compare/AllocationTeamCategoryCompare';
import AllocationTeamCategory from '@components/statisticTeam/category/AllocationTeamCategory';
import StackedAreaTeamChart from '@components/statisticTeam/category/StackedAreaTeamChart';

import { ERROR_COMMON_MESSAGE } from '@constants/message';
import { pageRouters } from '@constants/routers';
import { ALL_TEAM_STATISTIC, TEAM_CALENDAR_ORGANIZATION } from '@constants';

import useStatisticCategoriesTeam from '@hooks/useStatisticCategoriesTeam';
import useStatisticCategoriesTeamCompare from '@hooks/useStatisticCategoriesTeamCompare';
import useCreationDataStatisticTeam from '@hooks/useCreationDataStatisticTeam';

import { OptionDropdownType } from '@interfaces/common';

import { formatDateToYMD, sumDurations } from '@utils/date';

import { StatisticTeamStateContext } from '@providers/StatisticTeamProvider';
import { useToast } from '@providers/ToastProvider';
import { GlobalStateContext } from '@providers/GlobalStateProvider';

const StatisticTeamBoard = () => {
  const {
    startDate,
    endDate,
    listMemberTeam,
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
    tagsOptions,
    orderingOptions,
    remainingCountUser,
    remainingCountTag,
    firstThreeUser,
    allLabelUser,
    allLabelTag,
    firstThreeTag,
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
    setAreaTableData,
  } = useContext(StatisticTeamStateContext);
  const {
    organizationTeamList,
    selectedOrganization: selectedOrganizationSideBar,
  } = useContext(GlobalStateContext);

  const router = useRouter();
  const searchParams = useSearchParams();

  const params = new URLSearchParams(searchParams);

  const [isOpenModalFilter, setIsOpenModalFilter] = useState(false);

  const { showToast } = useToast();

  const handleSetParam = (id: string) => {
    params.set('organization', id);
    router.push(`?${params.toString()}`);
  };

  const organizationId = searchParams.get('organization');

  const { statisticCategoryListTeam } = useStatisticCategoriesTeam({
    filter: {
      fromDate: formatDateToYMD(startDate) || '',
      endDate: formatDateToYMD(`${endDate}`) || '',
      organizationIds: String(selectedOrganization?.value || ''),
      largeCategoryId: selectedLarge?.value as number,
      mediumCategoryId: selectedMedium?.value as number,
      smallCategoryId: selectedSmall?.value as number,
      orderingOptions: orderingOptions,
      organizationMemberId:
        selectedOrganization?.label === TEAM_CALENDAR_ORGANIZATION
          ? String(selectedOrganizationSideBar?.value || '')
          : undefined,
    },
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
      if (data.largeTotalDuration) {
        if (data.mediumTotalDuration) {
          if (data.smallTotalDuration) {
            if (selectedSmall && selectedSmall.value && data.smallCategories) {
              const itemMap = data.smallCategories.find(
                (item) =>
                  String(item.categoryId) === String(selectedSmall.value),
              );
              if (itemMap) {
                setTotalDurationTask(itemMap.duration);
              } else {
                setTotalDurationTask('00:00:00');
              }
            } else {
              setTotalDurationTask(data.smallTotalDuration);
            }
          } else {
            if (selectedSmall && selectedSmall.value) return;

            setTotalDurationTask(data.mediumTotalDuration);
          }
        } else {
          if (selectedLarge && selectedLarge.value) return;
          setTotalDurationTask(data.largeTotalDuration);
        }
      } else {
        setTotalDurationTask('00:00:00');
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

  const { statisticCategoryListTeamCompare } =
    useStatisticCategoriesTeamCompare({
      filter: {
        fromDate: formatDateToYMD(startDateCompare) || '',
        endDate: formatDateToYMD(`${endDateCompare}`) || '',
        organizationIds: String(selectedOrganization?.value || ''),
        largeCategoryId: selectedLarge?.value as number,
        mediumCategoryId: selectedMedium?.value as number,
        smallCategoryId: selectedSmall?.value as number,
        isCompare: isCheckCompare,
        orderingOptions: orderingOptions,
        organizationMemberId:
          selectedOrganization?.label === TEAM_CALENDAR_ORGANIZATION
            ? String(selectedOrganizationSideBar?.value || '')
            : undefined,
      },
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
                selectedSmall.value &&
                data.smallCategories
              ) {
                const itemMap = data.smallCategories.find(
                  (item) =>
                    String(item.categoryId) === String(selectedSmall.value),
                );
                if (itemMap) {
                  setTotalDurationTaskCompare(itemMap.duration);
                } else {
                  setTotalDurationTaskCompare('00:00:00');
                }
              } else {
                setTotalDurationTaskCompare(data.smallTotalDuration);
              }
            } else {
              if (selectedSmall && selectedSmall.value) return;

              setTotalDurationTaskCompare(data.mediumTotalDuration);
            }
          } else {
            if (selectedLarge && selectedLarge.value) return;
            setTotalDurationTaskCompare(data.largeTotalDuration);
          }
        } else {
          setTotalDurationTaskCompare('00:00:00');
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
    organization_id: organizationId || '',
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
          data.organizations[0];
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
        })),
      ]);
    },
  });

  // Handle Choose organization
  const handleSelectOrganization = (data: OptionDropdownType) => {
    setAreaTableData([]);
    if (data.value !== selectedOrganization?.value) {
      setIsLoadingOrganization(true);
      if (isCheckCompare) {
        setIsLoadingOrganizationCompare(true);
      }
    }
    setCurrentPage(1);
    setSelectedOrganization(data);
    setSelectedLarge(null);
    setSelectedMedium(null);
    setSelectedSmall(null);

    const organization = creationDataStatisticData?.organizations?.find(
      (org) => org.id === data.value,
    );

    const organizationMember = creationDataStatisticData?.organizations?.find(
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
      if (
        selectedOrganization?.label === TEAM_CALENDAR_ORGANIZATION &&
        organizationMember
      ) {
        setListMemberTeam(
          organizationMember.members.map((member) => ({
            id: member.id,
            fullName: member.fullName,
            color: member?.avatarColor || '',
            avatarUrl: member?.avatar || '',
          })),
        );
        setOrderingOptions({
          tag_ids: [],
          user_ids: organizationMember.members.map((member) => ({
            value: member.id,
            label: member.fullName,
            color: member?.avatarColor || '',
            avatarUrl: member?.avatar || '',
          })),
        });
      } else {
        setListMemberTeam(
          organization.members.map((member) => ({
            id: member.id,
            fullName: member.fullName,
            color: member?.avatarColor || '',
            avatarUrl: member?.avatar || '',
          })),
        );
        setOrderingOptions({
          tag_ids: [],
          user_ids: organization.members.map((member) => ({
            value: member.id,
            label: member.fullName,
            color: member?.avatarColor || '',
            avatarUrl: member?.avatar || '',
          })),
        });
      }

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

  // Handle Choose organization with option large
  const handleSelectOrganizationCustom = (data: OptionDropdownType) => {
    setCurrentPage(1);
    setAreaTableData([]);
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
        setLargeOptions(largeCategories);
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
    setAreaTableData([]);
    setCurrentPage(1);

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

      setMediumOptions(mediumCategories);
    } else {
      setMediumOptions([]);
    }
  };

  // Handle Choose MEDIUM
  const handleSelectMedium = (data: OptionDropdownType) => {
    if (selectedOrganization?.label === ALL_TEAM_STATISTIC) return;
    if (data.value !== selectedMedium?.value) {
      setIsLoadingMedium(true);
      if (isCheckCompare) {
        setIsLoadingMediumCompare(true);
      }
    }
    setAreaTableData([]);
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
      setSmallOptions(smallCategories);
    } else {
      setSmallOptions([]);
    }
  };
  // Handle choose small

  const handleSelectSmall = (data: OptionDropdownType) => {
    setCurrentPage(1);
    setAreaTableData([]);

    setSelectedSmall(data);
  };

  // Remove tags
  const removeTag = (selected: OptionDropdownType) => {
    const currentTagIds = orderingOptions?.tag_ids || [];
    const updatedTagIds = currentTagIds.filter(
      (tag) => tag.value !== selected.value,
    );
    setCurrentPage(1);
    setIsLoadingLarge(true);
    setIsLoadingMedium(true);
    setIsLoadingOrganization(true);
    if (isCheckCompare) {
      setIsLoadingLargeCompare(true);
      setIsLoadingMediumCompare(true);
      setIsLoadingOrganizationCompare(true);
    }
    setOrderingOptions((prev) => ({
      tag_ids: updatedTagIds,
      user_ids: prev?.user_ids || [],
    }));
  };
  // Remove user
  const removeUser = (selected: OptionDropdownType) => {
    const currentUserIds = orderingOptions?.user_ids || [];
    const updatedUserIds = currentUserIds.filter(
      (tag) => tag.value !== selected.value,
    );
    setCurrentPage(1);
    setIsLoadingLarge(true);
    setIsLoadingMedium(true);
    setIsLoadingOrganization(true);
    if (isCheckCompare) {
      setIsLoadingLargeCompare(true);
      setIsLoadingMediumCompare(true);
      setIsLoadingOrganizationCompare(true);
    }
    setOrderingOptions((prev) => ({
      tag_ids: prev?.tag_ids || [],
      user_ids: updatedUserIds,
    }));
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
          <span className="text-[26px] font-medium relative top-[-2px] max-w-[450px] line-clamp-3 break-all">
            {selectedOrganization?.label}
          </span>
          <span className="text-[26px] font-medium relative top-[-2px]">
            チーム集計
          </span>
          <div className="flex justify-center items-center gap-2 mt-[6px] ">
            <Button
              variant={'primary'}
              className={`!py-0 !px-0 font-bold w-[80px] h-7 
              !rounded-[20px] text-xs  `}>
              カテゴリー
            </Button>
            <Button
              onClick={() => {
                router.push(
                  `${pageRouters.STATISTIC_TEAM_TAG_MANAGEMENT.href}?organization=${organizationId}&tabId=1`,
                );
              }}
              variant={'outline'}
              className={`!text-[#77858F] !bg-transparent !border-[#77858F] !py-0 !px-0 font-bold w-[80px] h-7 !rounded-[20px] text-xs`}>
              タグ
            </Button>
          </div>{' '}
        </div>
        <div className="flex items-center mt-[6px]">
          {listMemberTeam.length > 0 && getParticipantAvatars(listMemberTeam)}
        </div>
      </div>
      <div>
        <div className="flex justify-between w-full">
          <div className="flex items-center gap-2">
            <div className="w-[220px]">
              <Dropdown
                options={listOptionsOrganization}
                placeholder="-"
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
          <div>
            <StatisticTeamCalendar />
          </div>
        </div>
        <div className="flex items-center gap-2 mb-[14px] mt-6">
          <div className="flex-shrink-0 h-6 relative">
            {/* Filter option modal */}
            <Popover className="relative">
              {() => (
                <>
                  <div className="flex items-center gap-2 relative top-[5px]">
                    <PopoverButton
                      onClick={() => setIsOpenModalFilter(!isOpenModalFilter)}
                      className="flex items-center gap-2 text-xs font-medium text-[#77858F] focus-visible:outline-none">
                      <ImageRound
                        src="/icons/filter.svg"
                        name="Filter icon"
                        className="w-[14px] h-[14px] ml-2"
                      />
                    </PopoverButton>
                  </div>
                  <Transition
                    as={Fragment}
                    show={isOpenModalFilter}
                    enter="transition ease-out duration-200"
                    enterFrom="opacity-0 translate-y-1"
                    enterTo="opacity-100 translate-y-0"
                    leave="transition ease-in duration-150"
                    leaveFrom="opacity-100 translate-y-0"
                    leaveTo="opacity-0 translate-y-1">
                    <PopoverPanel className="absolute left-[30px] top-[-5px] z-[1] w-[400px] transform">
                      <ActionFilterStatisticTeam
                        tagsOptions={tagsOptions}
                        handleClose={() => setIsOpenModalFilter(false)}
                        listMemberTeam={listMemberTeam}
                      />
                    </PopoverPanel>
                  </Transition>
                </>
              )}
            </Popover>
          </div>
          <div className=" flex-grow flex-shrink-0">
            <div className="flex gap-2 flex-wrap w-[80%] flex-shrink-0 ">
              <>
                {firstThreeUser.map((item, index) => {
                  return (
                    <div
                      key={item.value}
                      className="flex gap-[6px] items-center">
                      {index === 0 && (
                        <ImageRound
                          src={`/icons/user-white.svg`}
                          name="close"
                          className="w-fit h-fit cursor-pointer"
                        />
                      )}
                      <div className="min-w-[66px] w-fit  h-6 px-[10px] bg-[#77858F] justify-between gap-[6px] text-xs text-white font-medium flex items-center truncate rounded-[20px] ">
                        <span className="min-w-[32px] max-w-[118px]  truncate">
                          {item.label}
                        </span>
                        <ImageRound
                          onClick={() => {
                            removeUser(item);
                          }}
                          src={`/icons/close-white.svg`}
                          name="close"
                          className="w-fit h-fit cursor-pointer"
                        />
                      </div>
                    </div>
                  );
                })}
                {allLabelUser.length > 3 && (
                  <p className=" h-6 flex items-center justify-center rounded-[20px] bg-[#EBF1F7] text-black text-xs font-medium">
                    +{remainingCountUser}
                  </p>
                )}
              </>
              <>
                {firstThreeTag.map((item, index) => {
                  return (
                    <div
                      key={item.value}
                      className="flex gap-[6px] items-center">
                      {index === 0 && (
                        <ImageRound
                          src={`/icons/tag-white.svg`}
                          name="close"
                          className="w-fit h-fit cursor-pointer"
                        />
                      )}
                      <div className="min-w-[66px] w-fit  h-6 px-[10px] bg-[#77858F] justify-between gap-[6px] text-xs text-white font-medium flex items-center truncate rounded-[20px] ">
                        <span className="min-w-[32px] max-w-[118px]  truncate">
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
                    </div>
                  );
                })}
                {allLabelTag.length > 3 && (
                  <p className="pr-[10px] h-6 flex items-center justify-center rounded-[20px] bg-[#EBF1F7] text-black text-xs font-medium">
                    +{remainingCountTag}
                  </p>
                )}
              </>
            </div>
          </div>
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
            handleSelectOrganization={handleSelectOrganization}
            handleSelectOrganizationCustom={handleSelectOrganizationCustom}
            handleSelectLarge={handleSelectLarge}
            handleSelectMedium={handleSelectMedium}
            removeTag={removeTag}
            removeUser={removeUser}
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
            removeTag={removeTag}
            removeUser={removeUser}
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
            handleSelectOrganization={handleSelectOrganization}
            handleSelectLarge={handleSelectLarge}
            handleSelectMedium={handleSelectMedium}
            removeTag={removeTag}
            removeUser={removeUser}
          />
        </>
      ) : (
        <>
          {/* Percentage of category */}
          <PercentageTeamCategory
            startDate={startDate}
            endDate={endDate}
            statisticTeamCategoryList={statisticCategoryListTeam}
            handleSelectOrganization={handleSelectOrganization}
            handleSelectOrganizationCustom={handleSelectOrganizationCustom}
            handleSelectLarge={handleSelectLarge}
            handleSelectMedium={handleSelectMedium}
            removeTag={removeTag}
            removeUser={removeUser}
          />
          {/* Progress bar */}
          <AllocationTeamCategory
            startDate={startDate}
            endDate={endDate}
            statisticTeamCategoryList={statisticCategoryListTeam}
            removeTag={removeTag}
            removeUser={removeUser}
            handleSelectOrganization={handleSelectOrganization}
            handleSelectLarge={handleSelectLarge}
            handleSelectMedium={handleSelectMedium}
            handleSelectSmall={handleSelectSmall}
          />
          {/* Line chart */}
          <LineChartByTeam
            startDate={startDate}
            endDate={endDate}
            handleSelectOrganization={handleSelectOrganization}
            handleSelectLarge={handleSelectLarge}
            handleSelectMedium={handleSelectMedium}
            removeTag={removeTag}
            removeUser={removeUser}
          />
          <StackedAreaTeamChart
            startDate={startDate}
            endDate={endDate}
            statisticTeamCategoryList={statisticCategoryListTeam}
            handleSelectOrganization={handleSelectOrganization}
            handleSelectLarge={handleSelectLarge}
            handleSelectMedium={handleSelectMedium}
            removeTag={removeTag}
            removeUser={removeUser}
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
          removeTag={removeTag}
          removeUser={removeUser}
          creationDataStatisticData={creationDataStatisticData?.organizations?.find(
            (org) => org.id === selectedOrganization?.value,
          )}
        />
      )}
    </div>
  );
};

export default StatisticTeamBoard;
