'use client';
import React, { useContext } from 'react';

import Button from '@components/common/Button';
import ImageRound from '@components/common/ImageRound';

import { OptionDropdownType } from '@interfaces/common';
import { formatDateToYMD, sumDurations } from '@utils/date';
import { useRouter, useSearchParams } from 'next/navigation';
import { pageRouters } from '@constants/routers';

import useCreationDataStatisticTeam from '@hooks/useCreationDataStatisticTeam';
import AvatarIconWithDynamicColor from '@components/common/AvatarIcon';
import { getRandomColor } from '@utils';
import MultiSelectDropdown from '@components/common/MultiSelectDropdown';
import { StatisticTeamTagsStateContext } from '@providers/StatisticTeamProviderTag';
import PercentageTeamTags from '@components/statisticTeam/tag/PercentageTeamTags';
import PercentageTeamTagsCompare from '@components/statisticTeam/tag/compare/PercentageTeamTagsCompare';
import TaskListStatisticTeamTags from '@components/statisticTeam/tag/TaskList';
import useStatisticTagsTeam from '@hooks/useStatisticTagsTeam';
import useStatisticTagsTeamCompare from '@hooks/useStatisticTagsTeamCompare';
import StatisticTeamCalendar from '@components/statisticTeam/tag/StatisticTeamCalendar';

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
  } = useContext(StatisticTeamTagsStateContext);
  const router = useRouter();
  const searchParams = useSearchParams();

  const organizationId = searchParams.get('organization');

  const { statisticTagsListTeam } = useStatisticTagsTeam({
    filter: {
      fromDate: formatDateToYMD(startDate) || '',
      endDate: formatDateToYMD(`${endDate}`) || '',
      organizationIds: String(selectedOrganization?.value || ''),
      largeCategoryId: Number(selectedLarge?.value),
      mediumCategoryId: Number(selectedMedium?.value),
      tagIds: selectedTags,
    },
    onSuccess: (data) => {
      const organization = creationDataStatisticData?.organization;

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
    },
  });
  const { statisticTagsListTeamCompare } = useStatisticTagsTeamCompare({
    filter: {
      fromDate: formatDateToYMD(startDateCompare) || '',
      endDate: formatDateToYMD(`${endDateCompare}`) || '',
      organizationIds: String(selectedOrganization?.value || ''),
      largeCategoryId: Number(selectedLarge?.value),
      mediumCategoryId: Number(selectedMedium?.value),
      isCompare: isCheckCompare,
    },
    onSuccess: (data) => {
      setTotalDurationLargeCompare(sumDurations(data.largeCategories ?? []));
      setTotalDurationMediumCompare(sumDurations(data.mediumCategories ?? []));
      setTotalDurationSmallCompare(sumDurations(data.smallCategories ?? []));
    },
  });

  const { creationDataStatisticData } = useCreationDataStatisticTeam({
    organization_id: organizationId || '',
    isTeam: true,
    onSuccess: (data) => {
      if (!data) return;
      if (data.organization) {
        setListOptionsOrganization([
          {
            label: data.organization.name,
            value: data.organization.id,
          },
        ]);

        handleSelectOrganization({
          label: data.organization.name,
          value: data.organization.id,
        });
      }
      setListMemberTeam(
        data.members.map((member) => ({
          id: member.id,
          fullName: member.fullName,
          color: getRandomColor(),
        })),
      );
      const optionsTagList = data.tags.map((item) => ({
        label: item.name,
        value: item.id,
      }));
      setTagsOptions(optionsTagList);
      setSelectedTags(optionsTagList);
    },
  });

  // Remove tags
  const removeTag = (selected: OptionDropdownType) => {
    const currentTagIds = selectedTags || [];
    const updatedTagIds = currentTagIds.filter(
      (tag) => tag.value !== selected.value,
    );
    setSelectedTags(updatedTagIds);
  };

  // Handle Choose organization
  const handleSelectOrganization = (data: OptionDropdownType) => {
    setSelectedOrganization(data);
    setSelectedLarge(null);
    setSelectedMedium(null);

    const organization = creationDataStatisticData?.organization;
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

    const organization = creationDataStatisticData?.organization;
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

    const organization = creationDataStatisticData?.organization;

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
    setSelectedSmall(data);
  };
  const getParticipantAvatars = (
    participants: {
      id: number;
      fullName: string;
      color: string;
    }[],
  ) => {
    const slicedParticipants = participants.slice(0, 6);
    const remainingCount =
      participants.length > 3 ? participants.length - 6 : 0;

    return (
      <>
        {slicedParticipants.map((item) => {
          return (
            <div
              className="ml-[-10px] border-[1px] border-white rounded-full h-[32px] w-[32px]"
              key={item.id}>
              {AvatarIconWithDynamicColor({
                color: item.color,
                size: 33,
                customClassName: '!mt-0',
              })}
            </div>
          );
        })}
        {remainingCount > 0 && (
          <div className="ml-[-10px] flex items-center justify-center bg-[#97A9B2] border-[1px] border-white rounded-full text-sm text-white w-[32px] h-[32px]">
            +{remainingCount}
          </div>
        )}
      </>
    );
  };

  return (
    <div className="pt-[30px] pr-10  font-medium ">
      <div className="mb-[33px] flex items-center justify-between">
        <div className="flex items-center gap-5 ">
          <div className="rounded-full w-[34px] h-[34px]  flex items-center justify-center overflow-hidden">
            <ImageRound
              className="w-[34px] h-[34px] rounded-full"
              src="/icons/statistic-team.svg"
              border="full"
              name="Multi users"
            />
          </div>
          <span className="text-[26px] font-medium relative top-[-2px] max-w-[350px] truncate">
            {selectedOrganization?.label}
          </span>
          <span className="text-[26px] font-medium relative top-[-2px]">
            チーム集計
          </span>
          <div className="flex justify-center items-center gap-2 ">
            <Button
              variant={'outline'}
              onClick={() => {
                router.push(
                  `${pageRouters.STATISTIC_TEAM_MANAGEMENT.href}?organization=${selectedOrganization?.value}&tabId=1`,
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
        <div className="flex items-center">
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
              <div className="flex gap-2 ">
                {selectedTags.map((item) => {
                  return (
                    <div
                      key={item.value}
                      className="w-[66px] h-6 px-[10px] bg-[#77858F] justify-between gap-[6px] text-xs text-white font-medium flex items-center truncate rounded-[20px] ">
                      <span className="w-[32px] truncate">{item.label}</span>
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
          handleSelectOrganization={handleSelectOrganization}
          handleSelectLarge={handleSelectLarge}
          handleSelectMedium={handleSelectMedium}
          handleSelectSmall={handleSelectSmall}
          creationDataStatisticData={creationDataStatisticData?.organization}
        />
      )}
    </div>
  );
};

export default StatisticTeamTagBoard;
