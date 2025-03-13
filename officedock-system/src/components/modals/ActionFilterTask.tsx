import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import Image from 'next/image';

import Checkbox from '@components/common/Checkbox';
import Button from '@components/common/Button';
import ImageRound from '@components/common/ImageRound';
import MultiSelectDropdown from '@components/common/MultiSelectDropdown';

import { CreationDataTask, Team } from '@interfaces/task';
import { OptionDropdownType } from '@interfaces/common';
import { TaskContext } from '@providers/TaskProvider';

type ActionTaskFilterProp = {
  creationDataTaskData: CreationDataTask | undefined;
  handleClose: () => void;
};

const ActionFilterTask = ({
  creationDataTaskData,
  handleClose,
}: ActionTaskFilterProp) => {
  const boxListRef = useRef<HTMLDivElement | null>(null);

  const { orderingOptions, setOrderingOptions } = useContext(TaskContext);
  const [isOpen, setIsOpen] = useState(false);
  const [
    dataOptionsOrganizationsCategory,
    setDataOptionsOrganizationsCategory,
  ] = useState<Team[]>([]);
  const [dataOptionsTagIds, setDataOptionsTagIds] = useState<
    OptionDropdownType[]
  >([]);

  const { getValues, setValue, watch, reset } = useForm<{
    tagIds: OptionDropdownType[];
  }>({
    mode: 'onSubmit',
    defaultValues: {},
  });

  const defaultValues = useMemo<{
    tagIds: OptionDropdownType[];
  }>(() => {
    const value: {
      tagIds: OptionDropdownType[];
    } = {
      tagIds: [],
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
  const toggleTeam = (teamId: number, teamName: string) => {
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
  const toggleCategory = (
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
    });
    handleClose();
  };
  const handleReset = () => {
    setOrderingOptions({
      category_ids: [],
      organization_ids: [],
      tag_ids: [],
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
          {/* Organization */}
          <div ref={boxListRef} className="relative">
            <div
              onClick={() => setIsOpen(true)}
              className="relative rounded-md flex items-center pl-3 text-sm font-medium text-black border border-[#77858F] h-[34px]">
              <span>チーム&カテゴリー</span>
              <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                <Image
                  src="/icons/arrow-down.svg"
                  alt="Arrow down"
                  width={16}
                  height={16}
                  className={`${isOpen ? 'rotate-180' : 'rotate-0'}`}
                />
              </div>
            </div>
            {isOpen && (
              <div className="w-[370px] h-fit max-h-[400px] overflow-y-auto absolute top-10 z-20 right-0 rounded-md p-1  border border-[#77858F] bg-white">
                {dataOptionsOrganizationsCategory.map((team) => (
                  <div
                    key={team.organization.id}
                    className="border-b last:border-none">
                    <div
                      className={`flex items-center relative  justify-between p-2 border-b border-transparent cursor-pointer  ${selectedTeams[team.organization.id] ? 'bg-[#F6F9FA] border-b border-[#EBF1F4]  rounded' : ''}`}
                      onClick={() =>
                        toggleTeam(team.organization.id, team.organization.name)
                      }>
                      <div onClick={() => {}} className="w-full">
                        <Checkbox
                          isChecked={
                            !!selectedTeams[team.organization.id]?.selected
                          }
                          onChange={() => {}}
                          label={team.organization.name}
                          classLabel="break-words  line-clamp-2"
                        />
                      </div>
                      <div className="absolute z-30  inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                        <Image
                          onClick={() => {}}
                          src="/icons/arrow-down.svg"
                          alt="Arrow down"
                          width={16}
                          height={16}
                          className={`${selectedTeams[team.organization.id] && selectedTeams[team.organization.id].selected ? 'rotate-180' : 'rotate-0'}`}
                        />
                      </div>
                    </div>
                    {selectedTeams[team.organization.id] &&
                      selectedTeams[team.organization.id].selected && (
                        <div
                          style={{
                            display:
                              team.categories.length > 0 ? 'flex' : 'none',
                          }}
                          className="pl-10 py-1 flex-col gap-2">
                          {team.categories.map((category) => (
                            <div
                              key={category.id}
                              className="flex items-start   py-1  pr-3 ">
                              <div className="w-full">
                                <Checkbox
                                  isChecked={
                                    !!selectedCategories[
                                      team.organization.id
                                    ]?.[category.id]?.selected
                                  }
                                  onChange={() =>
                                    toggleCategory(
                                      team.organization.id,
                                      category,
                                    )
                                  }
                                  label={category.name}
                                  classLabel="break-words  line-clamp-2 max-w-[260px]"
                                />
                              </div>
                              <span
                                className="w-3 h-3 rounded-sm relative top-2"
                                style={{ backgroundColor: category.color }}
                              />
                            </div>
                          ))}
                        </div>
                      )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* TagIds */}
          <div>
            <MultiSelectDropdown
              className="!h-[34px] !rounded-md"
              labelClass="!min-h-0 !text-sm font-medium"
              valueClassName="!border-[1px] !border-[#77858F] !py-0 flex items-center !rounded-md"
              optionClassName="!border-[1px] !border-[#77858F]"
              labelOptionClass="break-words max-w-[300px] line-clamp-2 !text-sm"
              options={dataOptionsTagIds}
              selectedOptions={watch('tagIds') ?? []}
              customLabel="タグ"
              onChange={(selected) => {
                let updatedTagIds = [];
                const currentTagIds = getValues('tagIds') || [];
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
                setValue('tagIds', updatedTagIds);
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

export default ActionFilterTask;
