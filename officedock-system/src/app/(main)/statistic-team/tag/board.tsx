'use client';
import React, { useContext } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import Button from '@components/common/Button';
import StatisticTeamCalendar from '@components/statisticTeam/tag/StatisticTeamCalendar';
import ImageRound from '@components/common/ImageRound';
import MultiSelectDropdown from '@components/common/MultiSelectDropdown';
import PercentageTeamTags from '@components/statisticTeam/tag/PercentageTeamTags';
import PercentageTeamTagsCompare from '@components/statisticTeam/tag/compare/PercentageTeamTagsCompare';
import TaskListStatisticTeamTags from '@components/statisticTeam/tag/TaskList';

import { pageRouters } from '@constants/routers';
import { ERROR_COMMON_MESSAGE } from '@constants/message';

import useCreationDataStatisticTeam from '@hooks/useCreationDataStatisticTeam';
import useStatisticTagsTeam from '@hooks/useStatisticTagsTeam';
import useStatisticTagsTeamCompare from '@hooks/useStatisticTagsTeamCompare';

import { StatisticTeamTagsStateContext } from '@providers/StatisticTeamProviderTag';
import { useToast } from '@providers/ToastProvider';
import { GlobalStateContext } from '@providers/GlobalStateProvider';

import { OptionDropdownType } from '@interfaces/common';
import { formatDateToYMD, sumDurations } from '@utils/date';
import CustomUserAvatar from '@components/common/AvatarIcon/CustomUserAvatar';

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
    tagsOptions,
    selectedSmall,
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
  } = useContext(StatisticTeamTagsStateContext);
  const { organizationTeamList } = useContext(GlobalStateContext);

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

  const { statisticTagsListTeam } = useStatisticTagsTeam({
    filter: {
      fromDate: formatDateToYMD(startDate) || '',
      endDate: formatDateToYMD(`${endDate}`) || '',
      organizationIds: String(selectedOrganization?.value || ''),
      largeCategoryId: selectedLarge?.value as number,
      mediumCategoryId: selectedMedium?.value as number,
      smallCategoryId: selectedSmall?.value as number,

      tagIds: selectedTags,
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
        setLargeOptions(largeCategories);
      } else {
        setLargeOptions([]);
      }
      setTotalDurationLarge(sumDurations(data.largeCategories ?? []));
      setTotalDurationMedium(sumDurations(data.mediumCategories ?? []));
      setTotalDurationSmall(sumDurations(data.smallCategories ?? []));
      setTotalDurationCategory(sumDurations(data.category ?? []));
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

      isCompare: isCheckCompare,
    },
    onSuccess: (data) => {
      setTotalDurationLargeCompare(sumDurations(data.largeCategories ?? []));
      setTotalDurationMediumCompare(sumDurations(data.mediumCategories ?? []));
      setTotalDurationSmallCompare(sumDurations(data.smallCategories ?? []));
      setTotalDurationCategoryCompare(sumDurations(data.smallCategories ?? []));
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

  // Remove tags
  const removeTag = (selected: OptionDropdownType) => {
    const currentTagIds = selectedTags || [];
    const updatedTagIds = currentTagIds.filter(
      (tag) => tag.value !== selected.value,
    );
    setCurrentPage(1);
    setSelectedTags(updatedTagIds);
  };

  // Handle Choose organization
  const handleSelectOrganization = (data: OptionDropdownType) => {
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
      setLargeOptions(largeCategories);
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
    setCurrentPage(1);

    setSelectedLarge(data);
    setSelectedMedium(null);
    setSelectedSmall(null);

    const organization = creationDataStatisticData?.organizations?.find(
      (org) => org.id === data.value,
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
    if (data.value !== selectedMedium?.value) {
      setIsLoadingMedium(true);
      if (isCheckCompare) {
        setIsLoadingMediumCompare(true);
      }
    }
    setCurrentPage(1);

    setSelectedMedium(data);
    setSelectedSmall(null);

    const organization = creationDataStatisticData?.organizations?.find(
      (org) => org.id === data.value,
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
    if (data.value !== selectedSmall?.value) {
      setIsLoadingSmall(true);
      if (isCheckCompare) {
        setIsLoadingSmallCompare(true);
      }
    }
    setCurrentPage(1);

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
              className="ml-[-10px] border-[1px] border-white rounded-full h-[32px] w-[32px]"
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
          <div className="ml-[-10px] flex items-center justify-center bg-[#97A9B2] border-[1px] border-white rounded-full text-sm text-white w-[32px] h-[32px]">
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
                  `${pageRouters.STATISTIC_TEAM_MANAGEMENT.href}?organization=${organizationId}&tabId=1`,
                );
              }}
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
          <div className="flex items-center gap-2">
            <div className="w-[240px]">
              <MultiSelectDropdown
                placeholder="集計対象のタグを選択"
                options={tagsOptions}
                className="!h-[34px] !py-0 text-sm font-normal !rounded-md"
                labelOptionClass="break-words w-[190px]"
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
            </div>
            <div>
              <div className="flex gap-2 flex-wrap max-w-[450px]">
                {selectedTags.map((item) => {
                  return (
                    <div
                      key={item.value}
                      className="min-w-[66px] h-6 px-[10px] bg-[#77858F] justify-between gap-[6px] text-xs text-white font-medium flex items-center truncate rounded-[20px] ">
                      <span className="min-w-[32px] truncate">
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
          <div>
            <StatisticTeamCalendar />
          </div>
        </div>
      </div>
      {/* Percentage of categories */}
      {isCheckCompare ? (
        <PercentageTeamTagsCompare
          startDate={startDate}
          endDate={endDate}
          startDateCompare={startDateCompare}
          endDateCompare={endDateCompare}
          statisticTagsListTeam={statisticTagsListTeam}
          statisticTagsListTeamCompare={statisticTagsListTeamCompare}
          removeTag={removeTag}
          handleSelectOrganization={handleSelectOrganization}
          handleSelectLarge={handleSelectLarge}
          handleSelectMedium={handleSelectMedium}
          handleSelectSmall={handleSelectSmall}
        />
      ) : (
        <PercentageTeamTags
          startDate={startDate}
          endDate={endDate}
          statisticTagsListTeam={statisticTagsListTeam}
          removeTag={removeTag}
          handleSelectOrganization={handleSelectOrganization}
          handleSelectLarge={handleSelectLarge}
          handleSelectMedium={handleSelectMedium}
          handleSelectSmall={handleSelectSmall}
        />
      )}

      {/* Task list */}
      {creationDataStatisticData && (
        <TaskListStatisticTeamTags
          startDate={startDate}
          endDate={endDate}
          removeTag={removeTag}
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
