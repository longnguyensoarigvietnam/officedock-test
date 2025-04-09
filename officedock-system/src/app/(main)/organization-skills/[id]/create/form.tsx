'use client';
import React, { useContext, useEffect, useState } from 'react';
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from '@hello-pangea/dnd';
import { useRouter, useParams } from 'next/navigation';
import { useMutation } from 'react-query';
import { v4 as uuidv4 } from 'uuid';
import { AxiosError } from 'axios';

import ImageRound from '@components/common/ImageRound';
import Button from '@components/common/Button';
import Input from '@components/common/Input';
import TableDropdown from '@components/common/Dropdown/TableDropdown';
import LevelRequirements from '@components/levelRequirements/levelRequirements';

import { ONLY_DIGITS_REGEX } from '@constants/regex';
import { apiRouters, pageRouters } from '@constants/routers';
import {
  ERROR_COMMON_MESSAGE,
  ERROR_CREATE_MESSAGE,
  ERROR_SAVE_MESSAGE,
  SUCCESS_SAVE_MESSAGE,
} from '@constants/message';
import {
  LevelKey,
  NestedFieldKey,
  ScreenName,
  ServerStatusCode,
} from '@constants/enums';

import { OptionDropdownType } from '@interfaces/common';
import {
  CreateRowDataType,
  OrganizationSkillFormData,
} from '@interfaces/skills';

import { useToast } from '@providers/ToastProvider';
import { LoadingContext } from '@providers/LoadingProvider';
import { GlobalStateContext } from '@providers/GlobalStateProvider';

import useSkillList from '@hooks/useSkillList';
import useOrganizationSkillDetail from '@hooks/useOrganizationSkillDetail';

import api from '@base/api';
import { useErrorToast } from '@hooks/useErrorToast';

const CreateOrganizationSkillForm = () => {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const showErrorToast = useErrorToast();
  const { expanded } = useContext(GlobalStateContext);
  const { setIsLoading } = useContext(LoadingContext);

  const { showToast } = useToast();

  const [rows, setRows] = useState<CreateRowDataType[]>([]);
  const [isSubmit, setIsSubmit] = useState(false);
  const [initialSkillOptions, setInitialSkillOptions] =
    useState<OptionDropdownType[]>();
  const { skillList } = useSkillList({
    current_screen: ScreenName.ORGANIZATION_SKILL,
  });

  useOrganizationSkillDetail({
    organizationId: `${params.id}`,
    current_screen: ScreenName.ORGANIZATION_SKILL,
    onError: (error: AxiosError) => {
      if (error.response?.status === ServerStatusCode.NOT_FOUND) {
        router.push(pageRouters.ORGANIZATION_SKILLS_MANAGEMENT.href);
        showToast({
          variant: 'error',
          description: ERROR_COMMON_MESSAGE,
        });
      }
    },
  });

  useEffect(() => {
    if (skillList) {
      const skillOptions = skillList.results?.map((org) => ({
        label: org.name,
        value: String(org.id),
      }));
      setInitialSkillOptions([...skillOptions]);
    }
  }, [skillList]);

  const handleEditFieldInline = (
    customId: string,
    field:
      | keyof CreateRowDataType
      | {
          levelKey: LevelKey;
          nestedField: NestedFieldKey;
        },
    value: any,
  ) => {
    const newRows = rows.map((row) => {
      if (row.customId === customId) {
        if (typeof field === 'string') {
          return {
            ...row,
            [field]: value,
            isShow: true,
          };
        }

        const { levelKey, nestedField } = field;
        const currentLevel = row.levels[levelKey];

        return {
          ...row,
          levels: {
            ...row.levels,
            [levelKey]: {
              ...currentLevel,
              [nestedField]: Array.isArray(currentLevel[nestedField])
                ? [
                    ...(currentLevel[nestedField] || []),
                    {
                      label: value,
                      value: currentLevel[nestedField].length + 1,
                    },
                  ]
                : value,
            },
          },
          isShow: true,
        };
      }
      return row;
    });
    setRows(newRows);
  };

  const handleDeleteLevelRequirementOption = (
    customId: string,
    field: {
      levelKey: LevelKey;
      nestedField: NestedFieldKey;
    },
    value: any,
  ) => {
    const newRows = rows.map((row) => {
      if (row.customId === customId) {
        const { levelKey, nestedField } = field;
        const currentLevel = row.levels[levelKey];

        const updatedNestedField = Array.isArray(currentLevel[nestedField])
          ? (currentLevel[nestedField] as { label: string; value: number }[])
          : [];

        return {
          ...row,
          levels: {
            ...row.levels,
            [levelKey]: {
              ...currentLevel,
              [nestedField]: updatedNestedField.filter(
                (option) => option.value !== value,
              ),
            },
          },
          isShow: true,
        };
      }
      return row;
    });
    setRows(newRows);
  };

  const onDragEnd = (result: DropResult) => {
    const { source, destination } = result;

    if (!destination) return;

    if (source.index === destination.index) return;

    const updatedRows = [...rows];

    const [reorderedItem] = updatedRows.splice(source.index, 1);
    updatedRows.splice(destination.index, 0, reorderedItem);

    const reorderedRows = updatedRows.map((row, idx) => ({
      ...row,
      index: idx + 1,
    }));

    setRows(reorderedRows);
  };

  // Handle delete line
  const handleDeleteRow = (rowId: string) => {
    const updatedRows = [...rows];
    const rowIndex = updatedRows.findIndex((row) => row.customId == rowId);
    if (rowIndex != -1) {
      updatedRows[rowIndex].skillId = null;
      updatedRows[rowIndex].isShow = false;
    }
    setRows(updatedRows);
  };

  const durationOptions = Array.from({ length: 12 }, (_, i) => {
    const month = i + 1;
    return {
      label: `${month}か月ごと`,
      value: `${month}か月ごと`,
    };
  });

  const handleCreateOrganizationSkill = async (
    data: OrganizationSkillFormData,
  ) => {
    setIsLoading(true);
    return await api.post(
      apiRouters.ORGANIZATION_SKILL_DETAIL(params.id),
      data,
    );
  };

  const { mutate: createOrganizationSkill } = useMutation(
    'postCreateOrganizationSkill',
    handleCreateOrganizationSkill,
    {
      onSuccess: async () => {
        showToast({
          variant: 'success',
          description: SUCCESS_SAVE_MESSAGE,
        });
        router.push(pageRouters.ORGANIZATION_SKILLS_MANAGEMENT.href);
      },
      onError: (error: AxiosError<any>) => {
        showErrorToast(error, ERROR_CREATE_MESSAGE);
        setIsSubmit(false);
      },
      onSettled: () => {
        setIsLoading(false);
      },
    },
  );

  const handleConfirmCreateOrganizationSkills = () => {
    if (rows.every((item) => item.skillId == null)) {
      showToast({
        variant: 'error',
        description: ERROR_SAVE_MESSAGE,
      });
    } else {
      const submitOrganizationSkills = rows.map((organizationSkill) => {
        return {
          skillId: organizationSkill.skillId
            ? Number(organizationSkill.skillId)
            : null,
          defineSkill: organizationSkill.defineSkill || '',
          levels: {
            level1: {
              measurementCount: organizationSkill.levels.level1.measurementCount
                ? Number(organizationSkill.levels.level1.measurementCount)
                : null,
              measurementTime: organizationSkill.levels.level1.measurementTime
                ? Number(organizationSkill.levels.level1.measurementTime)
                : null,
              reviewPeriod: organizationSkill.levels.level1.reviewPeriod || '',
              descriptions:
                organizationSkill.levels.level1.descriptions.map((option) => {
                  return option.label;
                }) || null,
            },
            level2: {
              measurementCount: organizationSkill.levels.level2.measurementCount
                ? Number(organizationSkill.levels.level2.measurementCount)
                : null,
              measurementTime: organizationSkill.levels.level2.measurementTime
                ? Number(organizationSkill.levels.level2.measurementTime)
                : null,
              reviewPeriod: organizationSkill.levels.level2.reviewPeriod || '',
              descriptions:
                organizationSkill.levels.level2.descriptions.map((option) => {
                  return option.label;
                }) || null,
            },
            level3: {
              measurementCount: organizationSkill.levels.level3.measurementCount
                ? Number(organizationSkill.levels.level3.measurementCount)
                : null,
              measurementTime: organizationSkill.levels.level3.measurementTime
                ? Number(organizationSkill.levels.level3.measurementTime)
                : null,
              reviewPeriod: organizationSkill.levels.level3.reviewPeriod || '',
              descriptions:
                organizationSkill.levels.level3.descriptions.map((option) => {
                  return option.label;
                }) || null,
            },
          },
          index: organizationSkill.index,
        };
      });
      if (!isSubmit) {
        setIsSubmit(true);
        createOrganizationSkill({
          organizationSkills: submitOrganizationSkills,
        });
      }
    }
  };

  return (
    <div className="flex flex-col justify-between h-full">
      <div>
        <DragDropContext onDragEnd={onDragEnd}>
          <div
            className={`max-h-[calc(100vh_-_360px)]  ${expanded ? 'max-w-[calc(100vw_-_260px)]' : 'max-w-[calc(100vw_-_150px)]'} overflow-x-auto ring-1 ring-gray-200 rounded-tl-2xl rounded-tr-2xl bg-white`}>
            <div className="sticky top-0 z-10 grid grid-cols-[250px_450px_repeat(2,150px)_180px_450px_repeat(2,150px)_180px_450px_repeat(2,150px)_180px_450px_40px] [&>div]:bg-[#F3F4F6] ">
              <div className="px-5 py-3 w-[250px] border-r-[1px] font-normal row-span-2 flex items-center justify-center">
                スキル
              </div>
              <div className="px-5 py-3 w-[450px] border-r-[1px] font-normal row-span-2 flex items-center justify-center">
                スキルの定義
              </div>
              <div className="px-5 py-3 w-[480px] border-r-[1px] border-b-[1px] font-normal col-span-3 flex items-center justify-center">
                レベル0→1条件
              </div>
              <div className="px-5 py-3 w-[450px] border-r-[1px] border-b-[1px] font-normal flex items-center justify-center">
                レベル0→1
              </div>
              <div className="px-5 py-3 w-[480px] border-r-[1px] border-b-[1px] font-normal col-span-3 flex items-center justify-center">
                レベル1→2条件
              </div>
              <div className="px-5 py-3 w-[450px] border-r-[1px] border-b-[1px] font-normal flex items-center justify-center">
                レベル1→2
              </div>
              <div className="px-5 py-3 w-[480px] border-r-[1px] border-b-[1px] font-normal col-span-3 flex items-center justify-center">
                レベル2→3条件
              </div>
              <div className="px-5 py-3 w-[450px] border-b-[1px] font-normal flex items-center justify-center">
                レベル2→3
              </div>
              <div className="px-5 py-3 w-[40px] border-b-[1px] font-normal flex items-center justify-center"></div>
              <div className="px-5 py-3 border-r-[1px] font-normal flex items-center justify-center">
                計測回数
              </div>
              <div className="px-5 py-3 border-r-[1px] font-normal flex items-center justify-center">
                計測時間
              </div>
              <div className="px-5 py-3 border-r-[1px] font-normal flex items-center justify-center">
                振り返り期間
              </div>
              <div className="px-5 py-3 border-r-[1px] font-normal flex items-center justify-center">
                初心者
              </div>
              <div className="px-5 py-3 border-r-[1px] font-normal flex items-center justify-center">
                計測回数
              </div>
              <div className="px-5 py-3 border-r-[1px] font-normal flex items-center justify-center">
                計測時間
              </div>
              <div className="px-5 py-3 border-r-[1px] font-normal flex items-center justify-center">
                振り返り期間
              </div>
              <div className="px-5 py-3 border-r-[1px] font-normal flex items-center justify-center">
                必達
              </div>
              <div className="px-5 py-3 border-r-[1px] font-normal flex items-center justify-center">
                計測回数
              </div>
              <div className="px-5 py-3 border-r-[1px] font-normal flex items-center justify-center">
                計測時間
              </div>
              <div className="px-5 py-3 border-r-[1px] font-normal flex items-center justify-center">
                振り返り期間
              </div>
              <div className="px-5 py-3 font-normal flex items-center justify-center">
                上級
              </div>
              <div className="px-5 py-3 w-[40px] border-b-[1px] font-normal flex items-center justify-center"></div>
            </div>
            <Droppable droppableId="divRows" direction="vertical">
              {(provided) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className="!bg-white relative">
                  {rows
                    .filter((row) => row.isShow == true)
                    .map((row, index) => (
                      <Draggable
                        key={row.customId}
                        draggableId={row.customId}
                        index={index}>
                        {(provided) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className="flex relative">
                            <div className="px-6 py-3 w-[250px] relative h-[70px]">
                              <div className="flex items-center justify-center absolute left-2 z-auto top-[25px]">
                                <ImageRound
                                  {...provided.dragHandleProps}
                                  className="w-[12px] h-[20px] cursor-grab hover:cursor-pointer"
                                  src="/icons/drag.svg"
                                  name="drag item"
                                />
                              </div>
                              <TableDropdown
                                valueClassName="!w-[220px] !h-[46px] rounded-lg !shadow-none"
                                optionClassName="!w-[220px]"
                                searchOption
                                placeholder="選択してください"
                                minDropdownHeight={240}
                                options={
                                  initialSkillOptions?.filter(
                                    (option) =>
                                      !rows.find(
                                        (row) => row.skillId == option.value,
                                      ),
                                  ) || []
                                }
                                selectedOption={
                                  initialSkillOptions?.find(
                                    (element) =>
                                      Number(element.value) ==
                                      Number(row.skillId),
                                  ) as {
                                    value: number | string;
                                    label: string;
                                  }
                                }
                                onChange={(selectedOption: any) => {
                                  const value = selectedOption.value;
                                  handleEditFieldInline(
                                    row.customId,
                                    'skillId',
                                    String(value),
                                  );
                                }}
                              />
                            </div>
                            <div className="px-5 py-3 w-[450px]">
                              <Input
                                className="!w-[430px]"
                                value={row.defineSkill}
                                onChange={(e) => {
                                  handleEditFieldInline(
                                    row.customId,
                                    'defineSkill',
                                    String(e.target.value),
                                  );
                                }}
                              />
                            </div>
                            <div className="px-3 py-3 w-[150px]">
                              <Input
                                className="!w-[130px] text-center placeholder:text-[#111827] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                placeholder="-"
                                value={row.levels.level1.measurementCount || ''}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  if (ONLY_DIGITS_REGEX.test(value)) {
                                    handleEditFieldInline(
                                      row.customId,
                                      {
                                        levelKey: LevelKey.LEVEL1,
                                        nestedField:
                                          NestedFieldKey.MEASUREMENT_COUNT,
                                      },
                                      Number(e.target.value),
                                    );
                                  }
                                }}
                              />
                            </div>
                            <div className="px-3 py-3 w-[150px]">
                              <Input
                                className="!w-[130px] text-center placeholder:text-[#111827] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                placeholder="-"
                                value={row.levels.level1.measurementTime || ''}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  if (ONLY_DIGITS_REGEX.test(value)) {
                                    handleEditFieldInline(
                                      row.customId,
                                      {
                                        levelKey: LevelKey.LEVEL1,
                                        nestedField:
                                          NestedFieldKey.MEASUREMENT_TIME,
                                      },
                                      Number(e.target.value),
                                    );
                                  }
                                }}
                              />
                            </div>
                            <div className="px-3 pr-5 py-3 w-[180px] relative h-[70px]">
                              <TableDropdown
                                valueClassName="!w-[150px] !h-[46px] rounded-lg !shadow-none"
                                optionClassName="!w-[150px]"
                                placeholder="選択してください"
                                options={durationOptions || []}
                                minDropdownHeight={240}
                                selectedOption={
                                  durationOptions?.find(
                                    (element) =>
                                      element.value ==
                                      row.levels.level1.reviewPeriod,
                                  ) as {
                                    value: number | string;
                                    label: string;
                                  }
                                }
                                onChange={(selectedOption: any) => {
                                  const value = selectedOption.value;
                                  handleEditFieldInline(
                                    row.customId,
                                    {
                                      levelKey: LevelKey.LEVEL1,
                                      nestedField: NestedFieldKey.REVIEW_PERIOD,
                                    },
                                    value,
                                  );
                                }}
                              />
                            </div>
                            <div className="px-5 py-3 w-[450px]">
                              <LevelRequirements
                                descriptions={row.levels.level1.descriptions}
                                onDeleteLevelRequirementOption={(e) =>
                                  handleDeleteLevelRequirementOption(
                                    row.customId,
                                    {
                                      levelKey: LevelKey.LEVEL1,
                                      nestedField: NestedFieldKey.DESCRIPTIONS,
                                    },
                                    e,
                                  )
                                }
                                onKeyDown={(e) => {
                                  handleEditFieldInline(
                                    row.customId,
                                    {
                                      levelKey: LevelKey.LEVEL1,
                                      nestedField: NestedFieldKey.DESCRIPTIONS,
                                    },
                                    e,
                                  );
                                }}
                              />
                            </div>
                            <div className="px-3 py-3 w-[150px]">
                              <Input
                                className="!w-[130px] text-center placeholder:text-[#111827] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                placeholder="-"
                                value={row.levels.level2.measurementCount || ''}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  if (ONLY_DIGITS_REGEX.test(value)) {
                                    handleEditFieldInline(
                                      row.customId,
                                      {
                                        levelKey: LevelKey.LEVEL2,
                                        nestedField:
                                          NestedFieldKey.MEASUREMENT_COUNT,
                                      },
                                      Number(e.target.value),
                                    );
                                  }
                                }}
                              />
                            </div>
                            <div className="px-3 py-3 w-[150px]">
                              <Input
                                className="!w-[130px] text-center placeholder:text-[#111827] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                placeholder="-"
                                value={row.levels.level2.measurementTime || ''}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  if (ONLY_DIGITS_REGEX.test(value)) {
                                    handleEditFieldInline(
                                      row.customId,
                                      {
                                        levelKey: LevelKey.LEVEL2,
                                        nestedField:
                                          NestedFieldKey.MEASUREMENT_TIME,
                                      },
                                      Number(e.target.value),
                                    );
                                  }
                                }}
                              />
                            </div>
                            <div className="px-3 pr-5 py-3 w-[180px] relative h-[70px]">
                              <TableDropdown
                                valueClassName="!w-[150px] !h-[46px] rounded-lg !shadow-none"
                                optionClassName="!w-[150px]"
                                placeholder="選択してください"
                                options={durationOptions || []}
                                minDropdownHeight={240}
                                selectedOption={
                                  durationOptions?.find(
                                    (element) =>
                                      element.value ==
                                      row.levels.level2.reviewPeriod,
                                  ) as {
                                    value: number | string;
                                    label: string;
                                  }
                                }
                                onChange={(selectedOption: any) => {
                                  const value = selectedOption.value;
                                  handleEditFieldInline(
                                    row.customId,
                                    {
                                      levelKey: LevelKey.LEVEL2,
                                      nestedField: NestedFieldKey.REVIEW_PERIOD,
                                    },
                                    value,
                                  );
                                }}
                              />
                            </div>
                            <div className="px-5 py-3 w-[450px]">
                              <LevelRequirements
                                descriptions={row.levels.level2.descriptions}
                                onDeleteLevelRequirementOption={(e) =>
                                  handleDeleteLevelRequirementOption(
                                    row.customId,
                                    {
                                      levelKey: LevelKey.LEVEL2,
                                      nestedField: NestedFieldKey.DESCRIPTIONS,
                                    },
                                    e,
                                  )
                                }
                                onKeyDown={(e) => {
                                  handleEditFieldInline(
                                    row.customId,
                                    {
                                      levelKey: LevelKey.LEVEL2,
                                      nestedField: NestedFieldKey.DESCRIPTIONS,
                                    },
                                    e,
                                  );
                                }}
                              />
                            </div>
                            <div className="px-3 py-3 w-[150px]">
                              <Input
                                className="!w-[130px] text-center placeholder:text-[#111827] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                placeholder="-"
                                value={row.levels.level3.measurementCount || ''}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  if (ONLY_DIGITS_REGEX.test(value)) {
                                    handleEditFieldInline(
                                      row.customId,
                                      {
                                        levelKey: LevelKey.LEVEL3,
                                        nestedField:
                                          NestedFieldKey.MEASUREMENT_COUNT,
                                      },
                                      Number(e.target.value),
                                    );
                                  }
                                }}
                              />
                            </div>
                            <div className="px-3 py-3 w-[150px]">
                              <Input
                                className="!w-[130px] text-center placeholder:text-[#111827] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                placeholder="-"
                                value={row.levels.level3.measurementTime || ''}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  if (ONLY_DIGITS_REGEX.test(value)) {
                                    handleEditFieldInline(
                                      row.customId,
                                      {
                                        levelKey: LevelKey.LEVEL3,
                                        nestedField:
                                          NestedFieldKey.MEASUREMENT_TIME,
                                      },
                                      Number(e.target.value),
                                    );
                                  }
                                }}
                              />
                            </div>
                            <div className="px-3 pr-5 py-3 w-[180px] relative h-[70px]">
                              <TableDropdown
                                valueClassName="!w-[150px] !h-[46px] rounded-lg !shadow-none"
                                optionClassName="!w-[150px]"
                                placeholder="選択してください"
                                options={durationOptions || []}
                                minDropdownHeight={240}
                                selectedOption={
                                  durationOptions?.find(
                                    (element) =>
                                      element.value ==
                                      row.levels.level3.reviewPeriod,
                                  ) as {
                                    value: number | string;
                                    label: string;
                                  }
                                }
                                onChange={(selectedOption: any) => {
                                  const value = selectedOption.value;
                                  handleEditFieldInline(
                                    row.customId,
                                    {
                                      levelKey: LevelKey.LEVEL3,
                                      nestedField: NestedFieldKey.REVIEW_PERIOD,
                                    },
                                    value,
                                  );
                                }}
                              />
                            </div>
                            <div className="px-5 py-3 w-[450px]">
                              <LevelRequirements
                                descriptions={row.levels.level3.descriptions}
                                onDeleteLevelRequirementOption={(e) =>
                                  handleDeleteLevelRequirementOption(
                                    row.customId,
                                    {
                                      levelKey: LevelKey.LEVEL3,
                                      nestedField: NestedFieldKey.DESCRIPTIONS,
                                    },
                                    e,
                                  )
                                }
                                onKeyDown={(e) => {
                                  handleEditFieldInline(
                                    row.customId,
                                    {
                                      levelKey: LevelKey.LEVEL3,
                                      nestedField: NestedFieldKey.DESCRIPTIONS,
                                    },
                                    e,
                                  );
                                }}
                              />
                            </div>
                            <ImageRound
                              className="w-[12px] !mt-5 h-[20px] cursor-grab hover:cursor-pointer hover:opacity-70"
                              src="/icons/delete.svg"
                              name="delete item"
                              onClick={() => handleDeleteRow(row.customId)}
                            />
                          </div>
                        )}
                      </Draggable>
                    ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </div>
        </DragDropContext>

        <div>
          <Button
            className="mt-3"
            onClick={() => {
              setRows((prevRows) => [
                ...prevRows,
                {
                  id: null,
                  customId: uuidv4(),
                  index:
                    prevRows.length > 0
                      ? prevRows[prevRows.length - 1].index + 1
                      : 1,
                  skillId: null,
                  defineSkill: '',
                  levels: {
                    level1: {
                      measurementCount: null,
                      measurementTime: null,
                      reviewPeriod: '',
                      descriptions: [],
                    },
                    level2: {
                      measurementCount: null,
                      measurementTime: null,
                      reviewPeriod: '',
                      descriptions: [],
                    },
                    level3: {
                      measurementCount: null,
                      measurementTime: null,
                      reviewPeriod: '',
                      descriptions: [],
                    },
                  },
                  isShow: true,
                  isHasSkillMap: false,
                },
              ]);
            }}>
            行追加
          </Button>
        </div>
      </div>

      <div className="w-full flex items-center gap-2 mt-0 mb-3 flex-col">
        <Button
          className="w-[426px]"
          type="submit"
          onClick={handleConfirmCreateOrganizationSkills}>
          保存
        </Button>
        <Button
          className="w-[426px]"
          variant="secondary"
          type="button"
          onClick={() => router.back()}>
          戻る
        </Button>
      </div>
    </div>
  );
};

export default CreateOrganizationSkillForm;
