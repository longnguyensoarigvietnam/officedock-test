import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import Button from '@components/common/Button';
import ImageRound from '@components/common/ImageRound';

import { CreationDataTask, Team } from '@interfaces/task';
import { OptionDropdownType } from '@interfaces/common';
import { TaskTeamStateContext } from '@providers/TaskTeamProvider';
import MultiSelectUserDropdown from '@components/common/MultiSelectDropdown/MultiSelectUserDropdown';

type ActionTaskFilterProp = {
  creationDataTaskData: CreationDataTask | undefined;
  listMemberTeam: {
    id: number;
    fullName: string;
    color: string;
    avatarUrl: string;
  }[];
  handleClose: () => void;
  handleReadyToFetch: () => void;
};

const ActionFilterTaskTeam = ({
  creationDataTaskData,
  listMemberTeam,
  handleClose,
  handleReadyToFetch,
}: ActionTaskFilterProp) => {
  const boxListRef = useRef<HTMLDivElement | null>(null);

  const { orderingOptions, setOrderingOptions } =
    useContext(TaskTeamStateContext);
  const [_isOpen, setIsOpen] = useState(false);
  const [
    _dataOptionsOrganizationsCategory,
    setDataOptionsOrganizationsCategory,
  ] = useState<Team[]>([]);
  const [_dataOptionsTagIds, setDataOptionsTagIds] = useState<
    OptionDropdownType[]
  >([]);
  const [dataOptionsUserIds, setDataOptionsUserIds] = useState<
    OptionDropdownType[]
  >([]);

  const { getValues, watch, setValue, reset } = useForm<{
    tagIds: OptionDropdownType[];
    userIds: OptionDropdownType[];
  }>({
    mode: 'onSubmit',
    defaultValues: {},
  });

  const defaultValues = useMemo<{
    tagIds: OptionDropdownType[];
    userIds: OptionDropdownType[];
  }>(() => {
    const value: {
      tagIds: OptionDropdownType[];
      userIds: OptionDropdownType[];
    } = {
      tagIds: [],
      userIds: [],
    };

    if (orderingOptions) {
      if (orderingOptions.tag_ids) {
        value.tagIds = orderingOptions.tag_ids.map((tag) => {
          return {
            value: tag.value,
            label: tag.label,
          };
        });
      }
      if (orderingOptions.user_ids) {
        value.userIds = orderingOptions.user_ids.map((tag) => {
          return {
            value: tag.value,
            label: tag.label,
          };
        });
      }
    }
    return value;
  }, [orderingOptions]);

  useEffect(() => {
    reset(defaultValues);
  }, [defaultValues, reset]);

  useEffect(() => {
    if (creationDataTaskData) {
      setDataOptionsOrganizationsCategory(
        creationDataTaskData.organizationCategories,
      );
      setDataOptionsTagIds(
        creationDataTaskData.tags.map((org) => ({
          label: String(org.name),
          value: String(org.id),
        })),
      );
    }
  }, [creationDataTaskData]);
  useEffect(() => {
    if (listMemberTeam) {
      setDataOptionsUserIds(
        listMemberTeam.map((org) => ({
          label: String(org.fullName),
          value: String(org.id),
          imgUrl: org.avatarUrl,
          iconColor: org.color,
        })),
      );
    }
  }, [listMemberTeam]);

  const [selectedTeams, setSelectedTeams] = useState<{
    [key: number]: { id: number; name: string; selected: boolean };
  }>({});
  const [selectedCategories, setSelectedCategories] = useState<{
    [teamId: number]: {
      [categoryId: number]: { id: number; name: string; selected: boolean };
    };
  }>({});

  useEffect(() => {
    if (orderingOptions) {
      //  Update selectedTeams from organization_ids
      const newSelectedTeams = orderingOptions.organization_ids.reduce(
        (acc, team) => {
          acc[team.value as number] = {
            selected: true,
            id: team.value as number,
            name: team.label,
          };
          return acc;
        },
        {} as {
          [key: number]: { selected: boolean; id: number; name: string };
        },
      );

      // Update selectedCategories from category_ids
      const newSelectedCategories = orderingOptions.category_ids.reduce(
        (acc, category) => {
          const teamId = category.teamId!;
          if (!acc[teamId]) acc[teamId] = {}; // If there is no teamId, create a new one
          acc[teamId][category.value as number] = {
            selected: true,
            id: category.value as number,
            name: category.label,
          };
          return acc;
        },
        {} as {
          [teamId: number]: {
            [categoryId: number]: {
              selected: boolean;
              id: number;
              name: string;
            };
          };
        },
      );

      setSelectedTeams(newSelectedTeams);
      setSelectedCategories(newSelectedCategories);
    }
  }, [orderingOptions]);

  useEffect(() => {
    const handleClickOutside = (event: any) => {
      if (boxListRef.current && !boxListRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Click team
  const _toggleTeam = (teamId: number, teamName: string) => {
    setSelectedTeams((prev) => {
      const isSelected = !prev[teamId]?.selected;
      return {
        ...prev,
        [teamId]: { id: teamId, name: teamName, selected: isSelected },
      };
    });

    if (!selectedCategories[teamId]) {
      setSelectedCategories((prev) => ({
        ...prev,
        [teamId]: {},
      }));
    }
  };
  // Click category
  const _toggleCategory = (
    teamId: number,
    category: { id: number; name: string },
  ) => {
    setSelectedCategories((prev) => ({
      ...prev,
      [teamId]: {
        ...prev[teamId],
        [category.id]: {
          id: category.id,
          name: category.name,
          selected: !prev[teamId]?.[category.id]?.selected,
        },
      },
    }));
  };

  const handleSearch = () => {
    handleReadyToFetch();
    const selectedTeamsList = Object.values(selectedTeams)
      .filter((team) => team.selected)
      .map((team) => ({ value: team.id, label: team.name }));

    const selectedCategoriesList = Object.entries(selectedCategories).flatMap(
      ([teamId, categories]) =>
        Object.values(categories)
          .filter((category) => category.selected)
          .map((category) => ({
            value: category.id,
            label: category.name,
            teamId: Number(teamId),
          })),
    );

    setOrderingOptions({
      category_ids: selectedCategoriesList,
      organization_ids: selectedTeamsList,
      tag_ids: getValues('tagIds'),
      user_ids: getValues('userIds'),
    });
    handleClose();
  };
  const handleReset = () => {
    handleReadyToFetch();
    setOrderingOptions({
      category_ids: [],
      organization_ids: [],
      tag_ids: [],
      user_ids: [],
    });
  };

  return (
    <>
      <div className="w-full pt-[10px] pl-5 pr-[10px] pb-5 bg-white rounded-lg shadow-common p-1 flex flex-col gap-1 text-sm">
        <div className="text-xs font-medium text-[#77858F] flex justify-between items-center">
          <span>絞り込み</span>
          <div className="flex items-center gap-x-[10px]">
            <span onClick={handleReset} className="cursor-pointer">
              選択をクリア
            </span>
            <div
              style={{
                padding: '5px',
              }}
              onClick={() => handleClose()}
              className={`rounded-full cursor-pointer w-6 h-6 bg-[#E3EAED]`}>
              <ImageRound
                src={`/icons/close-black.svg`}
                name="close"
                className="w-fit h-fit"
              />
            </div>
          </div>
        </div>
        <div className="mt-[10px] flex  flex-col gap-[14px] ">
          {/*  User */}
          <div>
            <MultiSelectUserDropdown
              className="!h-[34px] !rounded-md"
              labelClass="!min-h-0 !text-sm font-medium"
              valueClassName="!border-[1px] !border-[#77858F] !py-0 flex items-center !rounded-md"
              optionClassName="!border-[1px] !border-[#77858F]"
              labelOptionClass="break-words max-w-[300px] line-clamp-3 !text-sm"
              options={dataOptionsUserIds}
              selectedOptions={watch('userIds') ?? []}
              customLabel="メンバー"
              onChange={(selected) => {
                let updatedUserIds = [];
                const currentUserIds = getValues('userIds') || [];
                const foundItemIndex = currentUserIds.findIndex(
                  (tag) => tag.value == selected.value,
                );
                if (foundItemIndex == -1) {
                  updatedUserIds = [...currentUserIds, selected];
                } else {
                  updatedUserIds = currentUserIds.filter(
                    (tag) => tag.value != selected.value,
                  );
                }
                setValue('userIds', updatedUserIds);
              }}
            />
          </div>
        </div>
        <div className="flex justify-center gap-[10px] mt-4 ">
          <Button variant="outline" onClick={handleClose} className="h-9">
            キャンセル
          </Button>
          <Button onClick={handleSearch} className="h-9">
            絞り込む
          </Button>
        </div>
      </div>
    </>
  );
};

export default ActionFilterTaskTeam;
