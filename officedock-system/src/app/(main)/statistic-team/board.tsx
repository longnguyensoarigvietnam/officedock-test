'use client';
import React, { useContext } from 'react';

import Button from '@components/common/Button';
import Dropdown from '@components/common/Dropdown';
import ImageRound from '@components/common/ImageRound';

import { OptionDropdownType } from '@interfaces/common';
import { formatDateToYMD, sumDurations } from '@utils/date';
import { useRouter, useSearchParams } from 'next/navigation';
import { pageRouters } from '@constants/routers';
import StatisticTeamCalendar from '@components/statisticTeam/category/StatisticTeamCalendar';
import useStatisticCategoriesTeam from '@hooks/useStatisticCategoriesTeam';
import { StatisticTeamStateContext } from '@providers/StatisticTeamProvider';
import PercentageTeamCategory from '@components/statisticTeam/category/PercentageTeamCategory';
import PercentageTeamCategoryCompare from '@components/statisticTeam/category/compare/PercentageCategoryCompare';
import TaskListTeamStatistic from '@components/statisticTeam/category/TaskList';
import useStatisticCategoriesTeamCompare from '@hooks/useStatisticCategoriesTeamCompare';
import useCreationDataStatisticTeam from '@hooks/useCreationDataStatisticTeam';
import AvatarIconWithDynamicColor from '@components/common/AvatarIcon';
import MultiSelectDropdown from '@components/common/MultiSelectDropdown';

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
    selectedTags,
    tagsOptions,
    setTotalDurationTask,
    setTotalDurationTaskCompare,
    setSelectedTags,
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
  } = useContext(StatisticTeamStateContext);
  const router = useRouter();
  const searchParams = useSearchParams();

  const organizationId = searchParams.get('organization');

  const { statisticCategoryListTeam } = useStatisticCategoriesTeam({
    filter: {
      fromDate: formatDateToYMD(startDate) || '',
      endDate: formatDateToYMD(`${endDate}`) || '',
      organizationIds: String(selectedOrganization?.value || ''),
      largeCategoryId: Number(selectedLarge?.value),
      mediumCategoryId: Number(selectedMedium?.value),
      smallCategoryId: Number(selectedSmall?.value),
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
  });

  const { statisticCategoryListTeamCompare } =
    useStatisticCategoriesTeamCompare({
      filter: {
        fromDate: formatDateToYMD(startDateCompare) || '',
        endDate: formatDateToYMD(`${endDateCompare}`) || '',
        organizationIds: String(selectedOrganization?.value || ''),
        largeCategoryId: Number(selectedLarge?.value),
        mediumCategoryId: Number(selectedMedium?.value),
        smallCategoryId: Number(selectedSmall?.value),
        isCompare: isCheckCompare,
        tagIds: selectedTags,
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
      const optionsTagList = data.tags.map((item) => ({
        label: item.name,
        value: item.id,
      }));
      setTagsOptions(optionsTagList);

      setListMemberTeam(
        data.members.map((member) => ({
          id: member.id,
          fullName: member.fullName,
          color: member.avatarColor,
        })),
      );
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
    setSelectedOrganization(data);
    setSelectedLarge(null);
    setSelectedMedium(null);
    setSelectedSmall(null);

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

  // Handle Choose organization with option large
  const handleSelectOrganizationCustom = (data: OptionDropdownType) => {
    setSelectedOrganization(data);
    setSelectedLarge(null);
    setSelectedMedium(null);
    setSelectedSmall(null);

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
    if (data.value !== selectedLarge?.value) {
      setIsLoadingLarge(true);
      if (isCheckCompare) {
        setIsLoadingLargeCompare(true);
      }
    }
    setSelectedLarge(data);
    setSelectedMedium(null);
    setSelectedSmall(null);

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
    if (data.value !== selectedMedium?.value) {
      setIsLoadingMedium(true);
      if (isCheckCompare) {
        setIsLoadingMediumCompare(true);
      }
    }
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

  // Remove tags
  const removeTag = (selected: OptionDropdownType) => {
    const currentTagIds = selectedTags || [];
    const updatedTagIds = currentTagIds.filter(
      (tag) => tag.value !== selected.value,
    );
    setSelectedTags(updatedTagIds);
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
                  `${pageRouters.STATISTIC_TEAM_TAG_MANAGEMENT.href}?organization=${selectedOrganization?.value}&tabId=1`,
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
          <div className="w-[240px] flex-shrink-0 relative">
            <MultiSelectDropdown
              isShowIconFilter
              options={tagsOptions}
              placeholder="集計対象のタグを選択"
              labelOptionClass="break-all"
              optionClassName="!top-6"
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
            {selectedTags.length === 0 && (
              <span className="text-xs absolute text-[#77858F] top-[2px] right-[135px]">
                タグの絞り込み
              </span>
            )}
          </div>
          <div className="relative flex-grow flex-shrink-0 right-[224px] top-[-8px]">
            <div className="flex gap-2 flex-wrap w-[80%] flex-shrink-0 ">
              {selectedTags.map((item) => {
                return (
                  <div
                    key={item.value}
                    className="min-w-[66px] w-fit  h-6 px-[10px] bg-[#77858F] justify-between gap-[6px] text-xs text-white font-medium flex items-center truncate rounded-[20px] ">
                    <span className="min-w-[32px]  truncate">{item.label}</span>
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
      </div>
      {/* Percentage of categories */}
      {isCheckCompare ? (
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
          handleSelectSmall={handleSelectSmall}
        />
      ) : (
        <PercentageTeamCategory
          startDate={startDate}
          endDate={endDate}
          statisticTeamCategoryList={statisticCategoryListTeam}
          handleSelectOrganization={handleSelectOrganization}
          handleSelectOrganizationCustom={handleSelectOrganizationCustom}
          handleSelectLarge={handleSelectLarge}
          handleSelectMedium={handleSelectMedium}
          removeTag={removeTag}
        />
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
          creationDataStatisticData={creationDataStatisticData?.organization}
        />
      )}
    </div>
  );
};

export default StatisticTeamBoard;
