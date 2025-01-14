'use client';
import React, { useEffect, useState } from 'react';
import {
  DragDropContext,
  Droppable,
  DropResult,
  Draggable,
} from '@hello-pangea/dnd';
import { useParams, useRouter } from 'next/navigation';
import { useMutation } from 'react-query';
import { v4 as uuidv4 } from 'uuid';
import { AxiosError } from 'axios';
import { MultiValue } from 'react-select';

import ImageRound from '@components/common/ImageRound';
import Button from '@components/common/Button';
import MultiSelect from '@components/common/MultiSelect';
import TableDropdown from '@components/common/Dropdown/TableDropdown';

import { apiRouters, pageRouters } from '@constants/routers';
import {
  ERROR_COMMON_MESSAGE,
  ERROR_CREATE_MESSAGE,
  ERROR_SAVE_MESSAGE,
  SUCCESS_CREATE_MESSAGE,
  SUCCESS_SAVE_MESSAGE,
} from '@constants/message';
import { ScreenName, ServerStatusCode } from '@constants/enums';

import { OptionDropdownType } from '@interfaces/common';
import { CreateCategoryFormRequest } from '@interfaces/category';
import useCreationDataStatisticOrganization from '@hooks/useCreationDataStatisticOrganization';
import useOrganizationDetail from '@hooks/useOrganizationDetail';
import useCreationDataSkill from '@hooks/useCreationDataSkill';
import api from '@base/api';
import { useToast } from '@providers/ToastProvider';
import { useErrorToast } from '@hooks/useErrorToast';

interface rowDataType {
  id: number | null;
  customId: string;
  large: string | null;
  medium: string | null;
  small: string | null;
  index: number;
  isShow?: boolean | null;
  skills: { value: number; label: string }[];
}
const CreateHierarchyForm = () => {
  const params = useParams<{ id: string }>();

  const router = useRouter();
  const showErrorToast = useErrorToast();

  const { showToast } = useToast();

  const [isSubmit, setIsSubmit] = useState(false);

  const [dataOptionsCategory, setDataOptionsCategory] = useState<
    OptionDropdownType[]
  >([]);

  const [dataOptionsSkill, setDataOptionsSkill] = useState<
    {
      value: number;
      label: string;
    }[]
  >([]);

  const [rows, setRows] = useState<rowDataType[]>([]);

  const { creationDataCategoryData } = useCreationDataStatisticOrganization({});

  const { creationDataSkillData } = useCreationDataSkill({
    organizationId: params.id,
    current_screen: ScreenName.CATEGORY_HIERARCHY,
  });

  const { organizationDetail } = useOrganizationDetail({
    organizationId: params.id,
    current_screen: ScreenName.CATEGORY_HIERARCHY,
    onError: (error: AxiosError) => {
      if (error.response?.status === ServerStatusCode.NOT_FOUND) {
        router.push(pageRouters.HIERARCHY_MANAGEMENT.href);
        showToast({
          variant: 'error',
          description: ERROR_COMMON_MESSAGE,
        });
      }
    },
  });

  useEffect(() => {
    if (creationDataCategoryData) {
      const options = creationDataCategoryData.map((org) => ({
        label: org.name,
        value: org.uuid,
      }));
      setDataOptionsCategory([
        {
          label: '未選択',
          value: '',
        },
        ...options,
      ]);
    }
  }, [creationDataCategoryData]);

  useEffect(() => {
    if (creationDataSkillData) {
      setDataOptionsSkill(
        creationDataSkillData.map((item) => {
          return {
            label: item.name,
            value: item.id,
          };
        }),
      );
    }
  }, [creationDataSkillData]);

  useEffect(() => {
    if (organizationDetail) {
      const sortedRows = organizationDetail.statisticCategories
        .map((org) => ({
          id: org.id,
          large: org.largeStatisticCategory
            ? org.largeStatisticCategory.uuid
            : '',
          medium:
            org.mediumStatisticCategory && org.mediumStatisticCategory !== null
              ? org.mediumStatisticCategory.uuid
              : '',
          small: org.smallStatisticCategory
            ? org.smallStatisticCategory.uuid
            : '',
          index: org.index,
          customId: uuidv4(),
          isShow: true,
          skills: org.skills.map((skill) => ({
            value: skill.id,
            label: skill.name,
          })),
        }))
        .sort((firstItem, secondItem) => firstItem.index - secondItem.index);

      setRows(sortedRows);
    }
  }, [organizationDetail]);
  //  Handle call api edit / create line
  const handleActionCategoryInline = async (dataList: {
    organizationStatisticCategories: {
      organizationStatisticCategoryId?: number | null;
      largeStatisticCategoryUuid: string | null;
      mediumStatisticCategoryUuid: string | null;
      smallStatisticCategoryUuid: string | null;
      index?: number;
      skillIds: number[];
    }[];
  }) => {
    const { data } = await api.post(
      apiRouters.ACTION_STATISTIC_ORGANIZATION(params.id),
      dataList,
    );
    return data;
  };
  const { mutate: actionCategoryInline } = useMutation(
    'postActionCategoryInline',
    handleActionCategoryInline,
    {
      onSuccess: async () => {
        showToast({
          variant: 'success',
          description: SUCCESS_SAVE_MESSAGE,
        });
        router.push(pageRouters.HIERARCHY_MANAGEMENT.href);
      },
      onError: (error: AxiosError<any>) => {
        setIsSubmit(false);
        showErrorToast(error, ERROR_SAVE_MESSAGE);
      },
      onSettled: () => {},
    },
  );

  // Function call API create Category
  const handleCreateCategory = async (data: CreateCategoryFormRequest) => {
    return await api.post(apiRouters.CATEGORY_LIST, data);
  };

  const { mutate: createCategory } = useMutation(
    'postCreateCategory',
    handleCreateCategory,
    {
      onSuccess: ({ data }) => {
        showToast({
          description: SUCCESS_CREATE_MESSAGE,
        });
        const newOptions = {
          label: data.name,
          value: data.uuid,
        };
        setDataOptionsCategory([newOptions, ...dataOptionsCategory]);
      },
      onError: (error: AxiosError<any>) => {
        showErrorToast(error, ERROR_CREATE_MESSAGE);
      },
      onSettled: () => {},
    },
  );

  // Handle drag & drop item
  const onDragEnd = (result: DropResult) => {
    const { source, destination } = result;
    if (!destination) return;

    const newRows = Array.from(rows);
    const [movedRow] = newRows.splice(source.index, 1);

    const isSameParentAgeAbove =
      destination.index > 0 &&
      newRows[destination.index - 1].large === movedRow.large;
    const isSameParentAgeBelow =
      destination.index < newRows.length &&
      newRows[destination.index].large === movedRow.large;

    const hasMultipleLarge =
      rows.filter((item) => item.large === movedRow.large).length > 1;

    if (!isSameParentAgeAbove && !isSameParentAgeBelow) {
      const itemAbove =
        destination.index > 0 ? newRows[destination.index - 1] : null;
      const itemBelow =
        destination.index < newRows.length ? newRows[destination.index] : null;

      const isLargeEqualAboveBelow =
        itemAbove && itemBelow ? itemAbove.large === itemBelow.large : false;

      if (!isLargeEqualAboveBelow && !hasMultipleLarge) {
        newRows.splice(destination.index, 0, movedRow);
        const updatedRows = newRows.map((row, idx) => ({
          ...row,
          index: idx + 1,
        }));
        setRows(updatedRows);
      } else {
        return;
      }
    } else {
      newRows.splice(destination.index, 0, movedRow);
      const updatedRows = newRows.map((row, idx) => ({
        ...row,
        index: idx + 1,
      }));
      setRows(updatedRows);
    }
  };

  // Handle edit / create line
  const handleEditCategoryLine = (
    customId: string,
    field: string,
    value: string,
  ) => {
    let newRows = rows.map((row) => {
      if (row.customId === customId) {
        const newRow = { ...row, [field]: value, isShow: true };

        const duplicateRow = rows.find(
          (prevRow) =>
            prevRow.customId !== customId &&
            prevRow.large === newRow.large &&
            prevRow.medium === newRow.medium &&
            prevRow.small === newRow.small,
        );

        if (duplicateRow) {
          newRow.small = '';
        }
        return newRow;
      }

      return row;
    });
    const groupedRows = new Map();

    newRows.forEach((row) => {
      const { large } = row;
      if (!groupedRows.has(large)) {
        groupedRows.set(large, []);
      }
      groupedRows.get(large).push(row);
    });
    if (field === 'large') {
      newRows = Array.from(groupedRows.values()).flat();

      newRows = newRows.map((row, idx) => ({
        ...row,
        index: idx + 1,
      }));
    }

    setRows(newRows);
  };

  // Handle create category option
  const handleAddCategory = (data: string) => {
    if (data && data.trim()) {
      const newOptions = {
        label: data,
        value: uuidv4(),
      };

      createCategory({
        name: newOptions.label,
        uuid: newOptions.value,
      });
    }
  };

  // Handle delete line
  const handleDeleteRow = (customId: string) => {
    const newRowList = rows.map((item) => {
      if (item.customId === customId) {
        return {
          ...item,
          large: '',
          medium: '',
          small: '',
          isShow: false,
        };
      } else {
        return item;
      }
    });
    setRows(newRowList);
  };

  // Handle change option skill
  const handleSkillsChange = (
    id: number | string,
    selected: MultiValue<{ value: number; label: string }>,
  ) => {
    const newSkills = [...selected];

    setRows((prevRows) =>
      prevRows.map((row) =>
        row.id === id || row.customId === id
          ? { ...row, skills: newSkills }
          : row,
      ),
    );
  };
  const handleSubmit = () => {
    if (isSubmit) return;
    const allNull = rows.every(
      (item) => item.large === '' && item.medium === '' && item.small === '',
    );

    if (allNull) {
      showToast({
        variant: 'error',
        description: ERROR_SAVE_MESSAGE,
      });
    } else {
      setIsSubmit(true);
      actionCategoryInline({
        organizationStatisticCategories: rows
          .filter((item) => item.isShow !== null)
          .map((item) => {
            return {
              organizationStatisticCategoryId: item.id,
              largeStatisticCategoryUuid: item.large !== '' ? item.large : null,
              mediumStatisticCategoryUuid:
                item.medium !== '' ? item.medium : null,
              smallStatisticCategoryUuid: item.small !== '' ? item.small : null,
              index: item.index,
              skillIds: item.skills.map((option) => option.value),
            };
          }),
      });
    }
  };

  // Validate small category
  const getExcludedSmalls = (currentRow: rowDataType) => {
    return rows
      .filter(
        (row) =>
          row.customId !== currentRow.customId &&
          row.large === currentRow.large &&
          row.medium === currentRow.medium,
      )
      .map((row) => row.small)
      .filter((small) => small !== '');
  };
  return (
    <div className="flex flex-col justify-between h-full">
      <div>
        <div className="mb-2 text-lg">{organizationDetail?.name}</div>
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="w-[98%] divide-y divide-gray-200 ">
            <div className="flex bg-[#F3F4F6] py-3 rounded-tl-2xl rounded-tr-2xl ring-1 ring-gray-200 mx-[1px] ">
              <div className="flex-grow text-center">大カテゴリ</div>
              <div className="flex-grow text-center">中カテゴリ</div>
              <div className="flex-grow text-center">小カテゴリ</div>
              <div className="flex-grow text-center">カテゴリ対応スキル</div>
              <div className="w-10 h-full"></div>
            </div>

            <Droppable droppableId="divRows" direction="vertical">
              {(provided) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className="bg-white max-h-[calc(100vh_-_462px)] overflow-y-auto">
                  {rows
                    .filter((item) => item.isShow !== false)
                    .map((row, index) => {
                      const excludedSmalls = getExcludedSmalls(row);

                      return (
                        <Draggable
                          key={row.customId}
                          draggableId={row.customId}
                          index={index}>
                          {(provided) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className="flex relative h-full">
                              <div className="flex items-center h-full justify-center absolute left-2  z-10 top-0">
                                <ImageRound
                                  {...provided.dragHandleProps}
                                  className="w-[12px] h-[20px] cursor-grab hover:cursor-pointer"
                                  src="/icons/drag.svg"
                                  name="drag item"
                                />
                              </div>
                              <div className="w-1/4 ">
                                <TableDropdown
                                  selectedOption={dataOptionsCategory.find(
                                    (element) => element.value === row.large,
                                  )}
                                  labelClass="pl-4"
                                  placeholder="大カテゴリ"
                                  options={[
                                    {
                                      label: '未選択',
                                      value: '',
                                    },
                                    ...dataOptionsCategory.filter(
                                      (option) =>
                                        !excludedSmalls.includes(
                                          option.value as string,
                                        ) &&
                                        option.value !== row.medium &&
                                        option.value !== row.small &&
                                        option.value !== '',
                                    ),
                                  ]}
                                  className="rounded-none h-full"
                                  onAdd={handleAddCategory}
                                  searchOption
                                  addInput
                                  onChange={(e) => {
                                    if (e.value !== row.large) {
                                      handleEditCategoryLine(
                                        row.customId,
                                        'large',
                                        String(e.value),
                                      );
                                    }
                                  }}
                                />
                              </div>
                              <div className="w-1/4">
                                <TableDropdown
                                  selectedOption={dataOptionsCategory.find(
                                    (element) => element.value === row.medium,
                                  )}
                                  placeholder="中カテゴリ"
                                  options={[
                                    {
                                      label: '未選択',
                                      value: '',
                                    },
                                    ...dataOptionsCategory.filter(
                                      (option) =>
                                        option.value !== row.large &&
                                        option.value !== row.small &&
                                        option.value !== '',
                                    ),
                                  ]}
                                  searchOption
                                  addInput
                                  onAdd={handleAddCategory}
                                  onChange={(e) => {
                                    if (e.value !== row.medium) {
                                      handleEditCategoryLine(
                                        row.customId,
                                        'medium',
                                        String(e.value),
                                      );
                                    }
                                  }}
                                  className="rounded-none h-full"
                                />
                              </div>
                              <div className="w-1/4">
                                <TableDropdown
                                  selectedOption={dataOptionsCategory.find(
                                    (element) => element.value === row.small,
                                  )}
                                  onChange={(e) => {
                                    if (e.value !== row.small) {
                                      handleEditCategoryLine(
                                        row.customId,
                                        'small',
                                        String(e.value),
                                      );
                                    }
                                  }}
                                  placeholder="小カテゴリ"
                                  searchOption
                                  addInput
                                  onAdd={handleAddCategory}
                                  options={[
                                    {
                                      label: '未選択',
                                      value: '',
                                    },
                                    ...dataOptionsCategory.filter(
                                      (option) =>
                                        !excludedSmalls.includes(
                                          option.value as string,
                                        ) &&
                                        option.value !== row.medium &&
                                        option.value !== row.large &&
                                        option.value !== '',
                                    ),
                                  ]}
                                  className="rounded-none h-full"
                                />
                              </div>
                              <div className="w-1/4">
                                <MultiSelect
                                  className=""
                                  defaultValue={row.skills}
                                  options={dataOptionsSkill.filter(
                                    (option) =>
                                      !row.skills.some(
                                        (skill) => skill.value === option.value,
                                      ),
                                  )}
                                  onChange={(selected) =>
                                    handleSkillsChange(row.customId, selected)
                                  }
                                />
                              </div>
                              <div className="flex items-center justify-center h-full w-10">
                                <ImageRound
                                  className="w-[12px] h-[20px] absolute top-1/2 ss -translate-y-1/2 cursor-grab hover:cursor-pointer hover:opacity-70"
                                  src="/icons/delete.svg"
                                  name="delete item"
                                  onClick={() => handleDeleteRow(row.customId)}
                                />
                              </div>
                            </div>
                          )}
                        </Draggable>
                      );
                    })}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </div>
        </DragDropContext>

        <div>
          <Button
            className="mt-4"
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
                  small: '',
                  medium: '',
                  large: '',
                  isShow: true,
                  skills: [],
                },
              ]);
            }}>
            行追加
          </Button>
        </div>
      </div>
      <div className="w-full flex items-center gap-2 mt-0 flex-col mb-3">
        <Button className="w-[426px]" onClick={handleSubmit}>
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

export default CreateHierarchyForm;
