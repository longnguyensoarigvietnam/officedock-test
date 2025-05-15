import { Dispatch, SetStateAction, useEffect, useState } from 'react';
import { v4 as uuidv4, validate as isUUID } from 'uuid';
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { useMutation } from 'react-query';

import { CircleColorPicker } from '@components/common/CircleColorPicker';
import TableDropdown from '@components/common/Dropdown/TableDropdown';
import ImageRound from '@components/common/ImageRound';
import MultiSelect from '@components/common/MultiSelect';
import { Table } from '@components/common/Table';
import WarningChangeHierarchyCategoryModal from '@components/modals/WarningChangeHierarchyCategoryModal';
import WarningDeleteHierarchyCategoryModal from '@components/modals/WarningDeleteHierarchyCategoryModal';
import { OptionsBoxToAddCategory } from '@components/category/OptionsBoxToAddCategory';

import { HIERARCHY_COLOR_LIST } from '@constants';
import { apiRouters } from '@constants/routers';
import {
  AddCategoryHierarchyType,
  HierarchyType,
  StatisticCategoryType,
} from '@constants/enums';

import { OptionDropdownType } from '@interfaces/common';

import api from '@base/api';

interface rowDataType {
  id: number | string;
  large: {
    value: string | number;
    label: string;
    showBy: string;
  };
  medium: {
    value: string | number;
    label: string;
    showBy: string;
  };
  small: {
    value: string | number;
    label: string;
    showBy: string;
  };
  skills: OptionDropdownType[];
  color: string;
}

interface HierarchyDetail {
  id: number | string;
  name: string;
  statisticCategories: rowDataType[];
}

const TableComponent = ({
  hierarchyList,
  categoryList,
  organizationName,
  dataOptionsSkill,
  setIsTyping,
  setHierarchyList,
  setSelectedHierarchiesToDelete,
  setSelectedHierarchiesToUpdate,
}: {
  hierarchyList: HierarchyDetail;
  categoryList: OptionDropdownType[];
  organizationName: string;
  dataOptionsSkill: {
    value: number;
    label: string;
  }[];
  setIsTyping: Dispatch<SetStateAction<boolean>>;
  setHierarchyList: Dispatch<SetStateAction<HierarchyDetail[]>>;
  setSelectedHierarchiesToDelete: Dispatch<SetStateAction<string[]>>
  setSelectedHierarchiesToUpdate: Dispatch<
    SetStateAction<
      {
        organizationStatisticCategoryId: string | number | null;
        organizationId: number;
        largeStatisticCategory: {
          name: string;
          uuid: string;
        } | null;
        mediumStatisticCategory: {
          name: string;
          uuid: string;
        } | null;
        smallStatisticCategory: {
          name: string;
          uuid: string;
        } | null;
        color: string;
        skillIds: number[];
      }[]
    >
  >;
}) => {
  const [openColorBox, setOpenColorBox] = useState<{
    uuid: string;
    status: boolean;
  }>({
    uuid: '',
    status: false,
  });
  const [warningChangeCategoryModalOpen, setWarningChangeCategoryModalOpen] =
    useState<boolean>(false);
  const [warningDeleteCategoryModalOpen, setWarningDeleteCategoryModalOpen] =
    useState<boolean>(false);
  const [categoryDropdownOptions, setCategoryDropdownOptions] = useState<
    OptionDropdownType[]
  >([]);
  const [pendingSelection, setPendingSelection] = useState<{
    oldLargeOption: OptionDropdownType;
    oldMediumOption?: OptionDropdownType;
    oldRowId?: string | number;
    oldRowSkill?: OptionDropdownType[];
    oldRowColor?: string;
    newValue: OptionDropdownType;
    type: string;
  } | null>(null);

  useEffect(() => {
    if (categoryList) {
      const categoryOptions = categoryList.filter(
        (category) =>
          category.teamId == null || category.teamId == hierarchyList.id,
      );
      setCategoryDropdownOptions(categoryOptions);
    }
  }, [categoryList, hierarchyList.id]);

  const findLastUniqueMediumIndexes = (data: rowDataType[]): number[] => {
    const lastIndexes: number[] = [];
    let currentLargeValue: number | string | null = null;
    let mediumIndexes: Record<number | string, number> = {}; // Tracks first occurrence of each medium value
    let lastMediumIndex: number | null = null;

    for (let i = 0; i < data.length; i++) {
      const { large, medium } = data[i];

      // If the large category changes, reset tracking
      if (large.value !== currentLargeValue) {
        if (lastMediumIndex !== null) lastIndexes.push(lastMediumIndex); // Store last unique medium index of previous large group
        currentLargeValue = large.value;
        mediumIndexes = {}; // Reset for new large group
        lastMediumIndex = null; // Reset for new group
      }

      // Store only the first occurrence of each medium
      if (mediumIndexes[medium.value] === undefined) {
        mediumIndexes[medium.value] = i;
        lastMediumIndex = i; // Track last added medium index
      }
    }

    // Push the last tracked index of the final large group
    if (lastMediumIndex !== null) lastIndexes.push(lastMediumIndex);

    return lastIndexes;
  };

  const findLastUniqueSmallIndexes = (data: rowDataType[]): number[] => {
    const lastIndexes: number[] = [];
    let currentLargeValue: number | string | null = null;
    let currentMediumValue: number | string | null = null;
    let smallIndexes: Record<number | string, number> = {}; // Track first occurrence of each small value
    let lastSmallIndex: number | null = null;

    for (let i = 0; i < data.length; i++) {
      const { large, medium, small } = data[i];

      // If the large category changes, reset tracking
      if (large.value !== currentLargeValue) {
        if (lastSmallIndex !== null) lastIndexes.push(lastSmallIndex); // Store last small index of previous large group
        currentLargeValue = large.value;
        currentMediumValue = null; // Reset medium tracking
        smallIndexes = {}; // Reset for new large group
        lastSmallIndex = null;
      }

      // If the medium category changes, reset tracking
      if (medium.value !== currentMediumValue) {
        if (lastSmallIndex !== null) lastIndexes.push(lastSmallIndex); // Store last small index of previous medium group
        currentMediumValue = medium.value;
        smallIndexes = {}; // Reset for new medium group
        lastSmallIndex = null;
      }

      // Store only the first occurrence of each small
      if (smallIndexes[small.value] === undefined) {
        smallIndexes[small.value] = i;
        lastSmallIndex = i; // Track last added small index
      }
    }

    // Push the last tracked index of the final large/medium group
    if (lastSmallIndex !== null) lastIndexes.push(lastSmallIndex);

    return lastIndexes;
  };

  const lastMediumIndexes = findLastUniqueMediumIndexes(
    hierarchyList.statisticCategories,
  );

  const lastSmallIndexes = findLastUniqueSmallIndexes(
    hierarchyList.statisticCategories,
  );

  const uniqueLargeCount = new Set(
    hierarchyList.statisticCategories
      .filter((hierarchy) => hierarchy.large.showBy)
      .map((item) => item.large.value),
  ).size;
  const uniqueMediumCount = new Set(
    hierarchyList.statisticCategories
      .filter((hierarchy) => hierarchy.medium.showBy)
      .map((item) => `${item.large.value}-${item.medium.value}`),
  ).size;
  const uniqueSmallCount = hierarchyList.statisticCategories.filter(
    (hierarchy) => hierarchy.small.showBy,
  ).length;

  const columns = [
    {
      accessorKey: HierarchyType.LARGE,
      header: () => (
        <div className="flex justify-between px-5">
          <p>大カテゴリー</p>
          <p>{uniqueLargeCount}</p>
        </div>
      ),
    },
    {
      accessorKey: HierarchyType.MEDIUM,
      header: () => (
        <div className="flex justify-between px-5">
          <p>中カテゴリー</p>
          <p>{uniqueMediumCount}</p>
        </div>
      ),
    },
    {
      accessorKey: HierarchyType.SMALL,
      header: () => (
        <div className="flex justify-between px-5">
          <p>小カテゴリー</p>
          <p>{uniqueSmallCount}</p>
        </div>
      ),
    },
    {
      accessorKey: 'skills',
      header: () => (
        <p className="font-medium text-xs text-[#77858F] text-left px-5">
          スキルの紐付け
        </p>
      ),
      cell: ({ row }: { row: any }) => row.original.skills.join(', '),
    },
  ];

  const table = useReactTable({
    data: hierarchyList.statisticCategories,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const processRowspan = (
    data: rowDataType[],
    key: HierarchyType.LARGE | HierarchyType.MEDIUM,
  ): Record<number, number> => {
    const rowspanMap: Record<number, number> = {};
    const countMap: Record<string, number> = {}; // Stores counts per (large, medium/small) group
    let prevLargeValue: string | null = null;
    let prevKeyValue: string | null = null;

    data.forEach((row, index) => {
      const groupKey = `${row.large.value}-${row[key].value}`; // Unique key per large-medium/small pair

      if (
        index === 0 ||
        row.large.value !== prevLargeValue ||
        row[key].value !== prevKeyValue
      ) {
        countMap[groupKey] = 1;
        rowspanMap[index] = 1;
      } else {
        countMap[groupKey] += 1;
        rowspanMap[index] = 0;
        rowspanMap[index - countMap[groupKey] + 1] = countMap[groupKey];
      }

      prevLargeValue = String(row.large.value);
      prevKeyValue = String(row[key].value);
    });

    return rowspanMap;
  };

  const largeRowspan = processRowspan(
    hierarchyList.statisticCategories,
    HierarchyType.LARGE,
  );
  const mediumRowspan = processRowspan(
    hierarchyList.statisticCategories,
    HierarchyType.MEDIUM,
  );

  const handleAddSmallCategory = (option: string, rowInfo: rowDataType) => {
    const newUuid = uuidv4();
    const newRow = {
      id: newUuid,
      color: rowInfo.color,
      large: rowInfo.large,
      medium: rowInfo.medium,
      small: {
        label: newUuid,
        value: newUuid,
        showBy: option,
      },
      skills: rowInfo.skills,
    };

    setHierarchyList((prev) => {
      // Create a deep copy of the hierarchy list
      const updatedHierarchyList = prev.map((org) => ({
        ...org,
        statisticCategories: [...org.statisticCategories],
      }));

      const foundOrganizationHierarchyIndex = updatedHierarchyList.findIndex(
        (hierarchy) => hierarchy.id === hierarchyList.id,
      );

      if (foundOrganizationHierarchyIndex !== -1) {
        const targetOrg = updatedHierarchyList[foundOrganizationHierarchyIndex];

        // Find all indexes where the same `large` & `medium` category appears
        const sameGroupIndexes = targetOrg.statisticCategories
          .map((item, index) =>
            item.large.value === rowInfo.large.value &&
            item.medium.value === rowInfo.medium.value
              ? index
              : -1,
          )
          .filter((index) => index !== -1); // Remove -1 values

        // Find if there is already an empty `small` row
        const emptySmallIndex = sameGroupIndexes.find((index) =>
          isUUID(targetOrg.statisticCategories[index].small?.label),
        );

        if (emptySmallIndex !== undefined) {
          // Replace the empty row with the new row instead of adding a new one
          targetOrg.statisticCategories[emptySmallIndex] = {
            ...newRow,
            id: targetOrg.statisticCategories[emptySmallIndex].id,
          };
        } else {
          // Otherwise, add the new row after the last occurrence
          const lastIndex = sameGroupIndexes.pop();
          if (lastIndex !== undefined) {
            targetOrg.statisticCategories.splice(lastIndex + 1, 0, newRow);
          } else {
            targetOrg.statisticCategories.push(newRow);
          }
        }
      }

      return updatedHierarchyList;
    });
  };

  const handleAddMediumCategory = (option: string, rowInfo: rowDataType) => {
    const newUuid = uuidv4();
    const newRow = {
      id: newUuid,
      color: rowInfo.color,
      large: rowInfo.large,
      medium: {
        label: newUuid,
        value: newUuid,
        showBy: option,
      },
      small: {
        label: newUuid,
        value: newUuid,
        showBy: '',
      },
      skills: rowInfo.skills,
    };
    setHierarchyList((prev) => {
      // Create a deep copy of the hierarchy list
      const updatedHierarchyList = prev.map((org) => ({
        ...org,
        statisticCategories: [...org.statisticCategories],
      }));

      const foundOrganizationHierarchyIndex = updatedHierarchyList.findIndex(
        (hierarchy) => hierarchy.id === hierarchyList.id,
      );

      if (foundOrganizationHierarchyIndex !== -1) {
        const targetOrg = updatedHierarchyList[foundOrganizationHierarchyIndex];

        const sameGroupIndexes = targetOrg.statisticCategories
          .map((item, index) =>
            item.large.value === rowInfo.large.value ? index : -1,
          )
          .filter((index) => index !== -1); // Remove -1 values

        // Find if there is already an empty `small` row
        const emptyMediumIndex = sameGroupIndexes.find((index) =>
          isUUID(targetOrg.statisticCategories[index].medium?.label),
        );

        if (emptyMediumIndex !== undefined) {
          // Replace the empty row with the new row instead of adding a new one
          targetOrg.statisticCategories[emptyMediumIndex] = {
            ...newRow,
            id: targetOrg.statisticCategories[emptyMediumIndex].id,
          };
        } else {
          // Otherwise, add the new row after the last occurrence
          const lastIndex = sameGroupIndexes.pop();
          if (lastIndex !== undefined) {
            targetOrg.statisticCategories.splice(lastIndex + 1, 0, newRow);
          } else {
            targetOrg.statisticCategories.push(newRow);
          }
        }
      }

      return updatedHierarchyList;
    });
  };

  const handleAddLargeCategory = (option: string) => {
    const newUuid = uuidv4();
    setHierarchyList((prev) => {
      const updatedHierarchyList = prev.map((org) => ({
        ...org,
        statisticCategories: [...org.statisticCategories],
      }));

      const foundOrganizationHierarchyIndex = updatedHierarchyList.findIndex(
        (hierarchy) => hierarchy.id === hierarchyList.id,
      );

      if (foundOrganizationHierarchyIndex !== -1) {
        const newRow = {
          id: newUuid,
          color: HIERARCHY_COLOR_LIST[0],
          large: {
            label: newUuid,
            value: newUuid,
            showBy: option,
          },
          medium: {
            label: newUuid,
            value: newUuid,
            showBy: '',
          },
          small: {
            label: newUuid,
            value: newUuid,
            showBy: '',
          },
          skills: [],
        };

        // Ensure deep immutability
        updatedHierarchyList[foundOrganizationHierarchyIndex] = {
          ...updatedHierarchyList[foundOrganizationHierarchyIndex],
          statisticCategories: [
            ...updatedHierarchyList[foundOrganizationHierarchyIndex]
              .statisticCategories,
            newRow,
          ],
        };
      }

      return updatedHierarchyList;
    });
  };

  // Set category when onBlur triggers
  const handleSetNewCategory = (variables: {
    name: string;
    uuid: string;
    type: string;
    rowInfo: rowDataType;
  }) => {
    setSelectedHierarchiesToUpdate((prev) => {
      const updatedHierarchiesToUpdate = [...prev];

      const existingIndex = updatedHierarchiesToUpdate.findIndex(
        (item) =>
          item.organizationStatisticCategoryId === variables.rowInfo.id,
      );

      let newEntry: any = {};
      if (variables.type == HierarchyType.LARGE) {
        newEntry = {
          organizationStatisticCategoryId: variables.rowInfo.id,
          organizationId: hierarchyList.id as number,
          largeStatisticCategory:
            variables.name == ''
              ? null
              : {
                  name: variables.name as string,
                  uuid: variables.uuid as string,
                },
          mediumStatisticCategory:
            variables.rowInfo.medium.label == '' ||
            isUUID(variables.rowInfo.medium.label as string)
              ? null
              : {
                  name: variables.rowInfo.medium.label as string,
                  uuid: variables.rowInfo.medium.value as string,
                },
          smallStatisticCategory:
            variables.rowInfo.small.label == '' ||
            isUUID(variables.rowInfo.small.label as string)
              ? null
              : {
                  name: variables.rowInfo.small.label as string,
                  uuid: variables.rowInfo.small.value as string,
                },
          color: variables.rowInfo.color,
          skillIds: variables.rowInfo.skills.map(
            (skill: OptionDropdownType) => Number(skill.value),
          ),
        };
      } else if (variables.type == HierarchyType.MEDIUM) {
        newEntry = {
          organizationStatisticCategoryId: variables.rowInfo.id,
          organizationId: hierarchyList.id as number,
          largeStatisticCategory:
            variables.rowInfo.large.label == '' ||
            isUUID(variables.rowInfo.large.label as string)
              ? null
              : {
                  name: variables.rowInfo.large.label as string,
                  uuid: variables.rowInfo.large.value as string,
                },
          mediumStatisticCategory:
            variables.name == ''
              ? null
              : {
                  name: variables.name as string,
                  uuid: variables.uuid as string,
                },
          smallStatisticCategory:
            variables.rowInfo.small.label == '' ||
            isUUID(variables.rowInfo.small.label as string)
              ? null
              : {
                  name: variables.rowInfo.small.label as string,
                  uuid: variables.rowInfo.small.value as string,
                },
          color: variables.rowInfo.color,
          skillIds: variables.rowInfo.skills.map(
            (skill: OptionDropdownType) => Number(skill.value),
          ),
        };
      } else {
        newEntry = {
          organizationStatisticCategoryId: variables.rowInfo.id,
          organizationId: hierarchyList.id as number,
          largeStatisticCategory:
            variables.rowInfo.large.label == '' ||
            isUUID(variables.rowInfo.large.label as string)
              ? null
              : {
                  name: variables.rowInfo.large.label as string,
                  uuid: variables.rowInfo.large.value as string,
                },
          mediumStatisticCategory:
            variables.rowInfo.medium.label == '' ||
            isUUID(variables.rowInfo.medium.label as string)
              ? null
              : {
                  name: variables.rowInfo.medium.label as string,
                  uuid: variables.rowInfo.medium.value as string,
                },
          smallStatisticCategory:
            variables.name == ''
              ? null
              : {
                  name: variables.name as string,
                  uuid: variables.uuid as string,
                },
          color: variables.rowInfo.color,
          skillIds: variables.rowInfo.skills.map(
            (skill: OptionDropdownType) => Number(skill.value),
          ),
        };
      }

      if (existingIndex !== -1) {
        // If it exists, replace it
        updatedHierarchiesToUpdate[existingIndex] = newEntry;
      } else {
        // Otherwise, add it
        updatedHierarchiesToUpdate.push(newEntry);
      }

      return updatedHierarchiesToUpdate;
    });
    setHierarchyList((prev) => {
      const updatedHierarchyList = prev.map((org) => ({
        ...org,
        statisticCategories: [...org.statisticCategories],
      }));

      const foundOrganizationHierarchyIndex = updatedHierarchyList.findIndex(
        (hierarchy) => hierarchy.id == hierarchyList.id,
      );
      if (foundOrganizationHierarchyIndex !== -1) {
        let updatedCategories: rowDataType[] = [];
        if (variables.type == HierarchyType.LARGE) {
          updatedCategories = updatedHierarchyList[
            foundOrganizationHierarchyIndex
          ].statisticCategories.map((hierarchy) =>
            hierarchy.id == variables.rowInfo.id
              ? {
                  ...hierarchy,
                  large: {
                    label: variables.name || variables.uuid,
                    value: variables.uuid,
                    showBy: AddCategoryHierarchyType.INPUT,
                  },
                }
              : hierarchy,
          );
        } else if (variables.type == HierarchyType.MEDIUM) {
          updatedCategories = updatedHierarchyList[
            foundOrganizationHierarchyIndex
          ].statisticCategories.map((hierarchy) =>
            variables.rowInfo &&
            hierarchy.id == variables.rowInfo.id &&
            hierarchy.large.value === variables.rowInfo.large.value
              ? {
                  ...hierarchy,
                  medium: {
                    label: variables.name || variables.uuid,
                    value: variables.uuid,
                    showBy: AddCategoryHierarchyType.INPUT,
                  },
                }
              : hierarchy,
          );
        } else {
          updatedCategories = updatedHierarchyList[
            foundOrganizationHierarchyIndex
          ].statisticCategories.map((hierarchy) =>
            variables.rowInfo &&
            hierarchy.id == variables.rowInfo.id &&
            hierarchy.large.value === variables.rowInfo.large.value &&
            hierarchy.medium.value === variables.rowInfo.medium.value
              ? {
                  ...hierarchy,
                  small: {
                    label: variables.name || variables.uuid,
                    value: variables.uuid,
                    showBy: AddCategoryHierarchyType.INPUT,
                  },
                }
              : hierarchy,
          );
        }

        updatedHierarchyList[
          foundOrganizationHierarchyIndex
        ].statisticCategories = updatedCategories;
      }

      return updatedHierarchyList;
    });
    setIsTyping(false);
  };

  const getExcludedSmalls = (currentRow: rowDataType) => {
    return hierarchyList.statisticCategories
      .filter(
        (row) =>
          row.id !== currentRow.id &&
          row.large.value === currentRow.large.value &&
          row.medium.value === currentRow.medium.value,
      )
      .map((row) => row.small.value)
      .filter((value) => value !== '');
  };

  const handleChangeLargeCategoryByPulldown = (
    oldLargeOption: OptionDropdownType,
    e: OptionDropdownType,
  ) => {
    setSelectedHierarchiesToUpdate((prev) => {
      const updatedHierarchiesToUpdate = [...prev];
      const statisticCategories = hierarchyList.statisticCategories;

      const newLarge = {
        label: e.label,
        value: e.value,
        showBy: AddCategoryHierarchyType.PULLDOWN,
      };

      const matchedRows = statisticCategories
        .filter((item) => item.large.value === oldLargeOption.value)
        .map((item) => ({
          ...item,
          large: newLarge,
        }));
      const updatedHierarchies = matchedRows.map((row) => {
        return {
          organizationStatisticCategoryId: row.id,
          organizationId: hierarchyList.id as number,
          largeStatisticCategory:
            row.large.label == '' || isUUID(row.large.label as string)
              ? null
              : {
                  name: row.large.label as string,
                  uuid: row.large.value as string,
                },
          mediumStatisticCategory:
            row.medium.label == '' || isUUID(row.medium.label as string)
              ? null
              : {
                  name: row.medium.label as string,
                  uuid: row.medium.value as string,
                },
          smallStatisticCategory:
            row.small.label == '' || isUUID(row.small.label as string)
              ? null
              : {
                  name: row.small.label as string,
                  uuid: row.small.value as string,
                },
          color: row.color,
          skillIds: row.skills.map((skill) => Number(skill.value)),
        };
      });

      updatedHierarchies.forEach((updatedHierarchy) => {
        const key = `${updatedHierarchy.organizationId}|${
          updatedHierarchy.largeStatisticCategory?.uuid || ''
        }|${updatedHierarchy.mediumStatisticCategory?.uuid || ''}|${
          updatedHierarchy.smallStatisticCategory?.uuid || ''
        }`;

        const alreadyExists = updatedHierarchiesToUpdate.some(
          (item) =>
            item.organizationStatisticCategoryId ===
              updatedHierarchy.organizationStatisticCategoryId ||
            `${item.organizationId}|${
              item.largeStatisticCategory?.uuid || ''
            }|${item.mediumStatisticCategory?.uuid || ''}|${
              item.smallStatisticCategory?.uuid || ''
            }` === key,
        );

        if (!alreadyExists) {
          updatedHierarchiesToUpdate.push(updatedHierarchy);
        }
      });

      return updatedHierarchiesToUpdate;
    });

    setHierarchyList((prev) => {
      const updatedHierarchyList = prev.map((org) => ({
        ...org,
        statisticCategories: [...org.statisticCategories],
      }));

      const foundOrganizationHierarchyIndex = updatedHierarchyList.findIndex(
        (hierarchy) => hierarchy.id === hierarchyList.id,
      );

      if (foundOrganizationHierarchyIndex !== -1) {
        const statisticCategories =
          updatedHierarchyList[foundOrganizationHierarchyIndex]
            .statisticCategories;

        const newLarge = {
          label: e.label,
          value: e.value,
          showBy: AddCategoryHierarchyType.PULLDOWN,
        };

        // Separate matching and non-matching rows
        const matchedRows = statisticCategories
          .filter((item) => item.large.value === oldLargeOption.value)
          .map((item) => ({
            ...item,
            large: newLarge,
          }));

        const remainingRows = statisticCategories.filter(
          (item) => item.large.value !== oldLargeOption.value,
        );

        // Find the last index where newLarge.value already exists
        let lastIndex = -1;
        remainingRows.forEach((item, index) => {
          if (item.large.value === newLarge.value) lastIndex = index;
        });

        const newStatisticCategories = [...remainingRows];
        if (lastIndex !== -1) {
          newStatisticCategories.splice(lastIndex + 1, 0, ...matchedRows);
        } else {
          // Instead of pushing, find the **original** position of row.original.large.value
          const originalIndex = statisticCategories.findIndex(
            (item) => item.large.value === oldLargeOption.value,
          );

          if (originalIndex !== -1) {
            // Insert in the same position as original row
            newStatisticCategories.splice(originalIndex, 0, ...matchedRows);
          } else {
            // If no match found, append to the end
            newStatisticCategories.push(...matchedRows);
          }
        }

        const uniqueMap = new Map();
        const filteredStatisticCategories = newStatisticCategories.filter(
          (item) => {
            const key = `${isUUID(item.large.label) ? '' : item.large.label}|${isUUID(item.medium.label) ? '' : item.medium.label}|${isUUID(item.small?.label) ? '' : item.small?.label}`;
            if (uniqueMap.has(key)) return false;
            uniqueMap.set(key, true);
            return true;
          },
        );

        // Update hierarchy list
        updatedHierarchyList[foundOrganizationHierarchyIndex] = {
          ...updatedHierarchyList[foundOrganizationHierarchyIndex],
          statisticCategories: filteredStatisticCategories,
        };
      }

      return updatedHierarchyList;
    });
  };

  const handleChangeMediumCategoryByPulldown = (
    oldLargeOption: OptionDropdownType,
    oldMediumOption: OptionDropdownType,
    e: OptionDropdownType,
  ) => {
    setSelectedHierarchiesToUpdate((prev) => {
      const updatedHierarchiesToUpdate = [...prev];
      const statisticCategories = hierarchyList.statisticCategories;
      const newMedium = {
        label: e.label,
        value: e.value,
        showBy: AddCategoryHierarchyType.PULLDOWN,
      };
      const matchedRows = statisticCategories
        .filter(
          (item) =>
            item.medium.value === oldMediumOption.value &&
            item.large.value === oldLargeOption.value,
        )
        .map((item) => ({
          ...item,
          medium: newMedium,
        }));

      const updatedHierarchies = matchedRows.map((row) => {
        return {
          organizationStatisticCategoryId: row.id,
          organizationId: hierarchyList.id as number,
          largeStatisticCategory:
            row.large.label == '' || isUUID(row.large.label as string)
              ? null
              : {
                  name: row.large.label as string,
                  uuid: row.large.value as string,
                },
          mediumStatisticCategory:
            row.medium.label == '' || isUUID(row.medium.label as string)
              ? null
              : {
                  name: row.medium.label as string,
                  uuid: row.medium.value as string,
                },
          smallStatisticCategory:
            row.small.label == '' || isUUID(row.small.label as string)
              ? null
              : {
                  name: row.small.label as string,
                  uuid: row.small.value as string,
                },
          color: row.color,
          skillIds: row.skills.map((skill) => Number(skill.value)),
        };
      });

      updatedHierarchies.forEach((updatedHierarchy) => {
        const existingIndex = updatedHierarchiesToUpdate.findIndex(
          (item) =>
            item.organizationStatisticCategoryId ===
            updatedHierarchy.organizationStatisticCategoryId,
        );
        if (existingIndex != -1) {
          updatedHierarchiesToUpdate[existingIndex] = updatedHierarchy;
        } else {
          updatedHierarchiesToUpdate.push(updatedHierarchy);
        }
      });

      return updatedHierarchiesToUpdate;
    });
    setHierarchyList((prev) => {
      const updatedHierarchyList = prev.map((org) => ({
        ...org,
        statisticCategories: [...org.statisticCategories],
      }));

      const foundOrganizationHierarchyIndex = updatedHierarchyList.findIndex(
        (hierarchy) => hierarchy.id == hierarchyList.id,
      );

      if (foundOrganizationHierarchyIndex !== -1) {
        const statisticCategories =
          updatedHierarchyList[foundOrganizationHierarchyIndex]
            .statisticCategories;

        const newMedium = {
          label: e.label,
          value: e.value,
          showBy: AddCategoryHierarchyType.PULLDOWN,
        };

        // Separate matching and non-matching rows
        const matchedRows = statisticCategories
          .filter(
            (item) =>
              item.medium.value == oldMediumOption.value &&
              item.large.value == oldLargeOption.value,
          )
          .map((item) => ({
            ...item,
            medium: newMedium,
          }));

        const remainingRows = statisticCategories.filter(
          (item) =>
            !(
              item.medium.value == oldMediumOption.value &&
              item.large.value == oldLargeOption.value
            ),
        );

        // Find the last index where newMedium.value already exists
        let lastIndex = -1;
        remainingRows.forEach((item, index) => {
          if (
            item.large.value == oldLargeOption.value &&
            item.medium.value === newMedium.value
          )
            lastIndex = index;
        });

        // Maintain position if lastIndex is -1
        const newStatisticCategories = [...remainingRows];
        if (lastIndex !== -1) {
          newStatisticCategories.splice(lastIndex + 1, 0, ...matchedRows);
        } else {
          // Instead of pushing, find the **original** position of row.original.medium.value
          const originalIndex = statisticCategories.findIndex(
            (item) =>
              item.medium.value == oldMediumOption.value &&
              item.large.value == oldLargeOption.value,
          );

          if (originalIndex !== -1) {
            // Insert in the same position as original row
            newStatisticCategories.splice(originalIndex, 0, ...matchedRows);
          } else {
            // If no match found, append to the end
            newStatisticCategories.push(...matchedRows);
          }
        }

        // Remove duplicates
        const uniqueMap = new Map();
        const filteredStatisticCategories = newStatisticCategories.filter(
          (item) => {
            const key = `${isUUID(item.large.label) ? '' : item.large.label}|${isUUID(item.medium.label) ? '' : item.medium.label}|${isUUID(item.small?.label) ? '' : item.small?.label}`;
            if (uniqueMap.has(key)) return false;
            uniqueMap.set(key, true);
            return true;
          },
        );

        // Update hierarchy list
        updatedHierarchyList[foundOrganizationHierarchyIndex] = {
          ...updatedHierarchyList[foundOrganizationHierarchyIndex],
          statisticCategories: filteredStatisticCategories,
        };
      }

      return updatedHierarchyList;
    });
  };

  const handleChangeSmallCategoryByPulldown = (
    oldLargeOption: OptionDropdownType,
    oldMediumOption: OptionDropdownType,
    oldRowId: string | number,
    oldRowSkill: OptionDropdownType[],
    oldRowColor: string,
    e: OptionDropdownType,
  ) => {
    setSelectedHierarchiesToUpdate((prev) => {
      const updatedHierarchiesToUpdate = [...prev];

      const existingIndex = updatedHierarchiesToUpdate.findIndex(
        (item) => item.organizationStatisticCategoryId === oldRowId,
      );

      const newEntry = {
        organizationStatisticCategoryId: oldRowId,
        organizationId: hierarchyList.id as number,
        largeStatisticCategory:
          oldLargeOption.label == '' || isUUID(oldLargeOption.label as string)
            ? null
            : {
                name: oldLargeOption.label as string,
                uuid: oldLargeOption.value as string,
              },
        mediumStatisticCategory:
          oldMediumOption.label == '' || isUUID(oldMediumOption.label as string)
            ? null
            : {
                name: oldMediumOption.label as string,
                uuid: oldMediumOption.value as string,
              },
        smallStatisticCategory: {
          name: e.label as string,
          uuid: e.value as string,
        },
        color: oldRowColor,
        skillIds: oldRowSkill.map((skill) => Number(skill.value)),
      };

      if (existingIndex !== -1) {
        // If it exists, replace it
        updatedHierarchiesToUpdate[existingIndex] = newEntry;
      } else {
        // Otherwise, add it
        updatedHierarchiesToUpdate.push(newEntry);
      }

      return updatedHierarchiesToUpdate;
    });
    setHierarchyList((prev) => {
      const updatedHierarchyList = prev.map((org) => ({
        ...org,
        statisticCategories: [...org.statisticCategories],
      }));

      const foundOrganizationHierarchyIndex = updatedHierarchyList.findIndex(
        (hierarchy) => hierarchy.id == hierarchyList.id,
      );

      if (foundOrganizationHierarchyIndex !== -1) {
        const updatedCategories = updatedHierarchyList[
          foundOrganizationHierarchyIndex
        ].statisticCategories.map((hierarchy) =>
          hierarchy.id === oldRowId
            ? {
                ...hierarchy,
                small: {
                  label: e.label,
                  value: e.value,
                  showBy: AddCategoryHierarchyType.PULLDOWN,
                },
              }
            : hierarchy,
        );

        const uniqueMap = new Map();
        const filteredCategories = updatedCategories.filter((item) => {
          const key = `${isUUID(item.large.label) ? '' : item.large.label}|${isUUID(item.medium.label) ? '' : item.medium.label}|${isUUID(item.small?.label) ? '' : item.small?.label}`;
          if (uniqueMap.has(key)) return false;
          uniqueMap.set(key, true);
          return true;
        });

        updatedHierarchyList[
          foundOrganizationHierarchyIndex
        ].statisticCategories = filteredCategories;
      }

      return updatedHierarchyList;
    });
  };

  const handleDeleteLargeHierarchyCategory = (
    oldLargeValue: string | number,
  ) => {
    setSelectedHierarchiesToDelete((prev) => {
      const currentHierarchiesToDelete = [...(prev || [])];

      const matchingHierarchies = hierarchyList.statisticCategories
        .filter((item) => item.large.value === oldLargeValue)
        .map((hierarchy) => String(hierarchy.id)); // Convert IDs to strings

      return [...currentHierarchiesToDelete, ...matchingHierarchies]; // Spread to avoid nested arrays
    });
    setSelectedHierarchiesToUpdate((prev) => {
      const currentHierarchiesToUpdate = [...(prev || [])];

      return currentHierarchiesToUpdate.filter(
        (hierarchy) => hierarchy.largeStatisticCategory?.uuid != oldLargeValue,
      );
    });
    setHierarchyList((prev) => {
      const updatedHierarchyList = prev.map((org) => ({
        ...org,
        statisticCategories: [...org.statisticCategories],
      }));

      const foundOrganizationHierarchyIndex = updatedHierarchyList.findIndex(
        (hierarchy) => hierarchy.id === hierarchyList.id,
      );

      if (foundOrganizationHierarchyIndex !== -1) {
        updatedHierarchyList[foundOrganizationHierarchyIndex] = {
          ...updatedHierarchyList[foundOrganizationHierarchyIndex],
          statisticCategories: [
            ...updatedHierarchyList[
              foundOrganizationHierarchyIndex
            ].statisticCategories.filter(
              (hierarchy) => hierarchy.large.value != oldLargeValue,
            ),
          ],
        };
      }

      return updatedHierarchyList;
    });
  };

  const handleDeleteMediumHierarchyCategory = (
    oldLargeValue: string | number,
    oldMediumValue: string | number,
  ) => {
    const newUuid = uuidv4();
    setSelectedHierarchiesToDelete((prev) => {
      const matchedRowsWithLargeValue =
        hierarchyList.statisticCategories.filter(
          (item) => item.large.value == oldLargeValue,
        );
      const currentHierarchiesToDelete = [...(prev || [])];
      if (matchedRowsWithLargeValue.length > 1) {
        const matchingHierarchies = hierarchyList.statisticCategories
          .filter(
            (item) =>
              item.large.value === oldLargeValue &&
              item.medium.value === oldMediumValue,
          )
          .map((hierarchy) => String(hierarchy.id)); // Convert IDs to strings

        return [...currentHierarchiesToDelete, ...matchingHierarchies]; // Spread to avoid nested arrays
      } else {
        return currentHierarchiesToDelete;
      }
    });
    setSelectedHierarchiesToUpdate((prev) => {
      const matchedRowsWithLargeValue =
        hierarchyList.statisticCategories.filter(
          (item) => item.large.value == oldLargeValue,
        );
      if (matchedRowsWithLargeValue.length > 1) {
        const currentHierarchiesToUpdate = [...(prev || [])];

        return currentHierarchiesToUpdate.filter(
          (hierarchy) =>
            !(
              hierarchy.largeStatisticCategory?.uuid == oldLargeValue &&
              hierarchy.mediumStatisticCategory?.uuid == oldMediumValue
            ),
        );
      } else {
        const updatedHierarchiesToUpdate = [...prev];
        const statisticCategories = hierarchyList.statisticCategories;
        const newMedium = {
          label: newUuid,
          value: newUuid,
          showBy: AddCategoryHierarchyType.PULLDOWN,
        };
        const matchedRows = statisticCategories
          .filter(
            (item) =>
              item.medium.value === oldMediumValue &&
              item.large.value === oldLargeValue,
          )
          .map((item) => ({
            ...item,
            medium: newMedium,
          }));

        const updatedHierarchies = matchedRows.map((row) => {
          return {
            organizationStatisticCategoryId: row.id,
            organizationId: hierarchyList.id as number,
            largeStatisticCategory:
              row.large.label == '' || isUUID(row.large.label as string)
                ? null
                : {
                    name: row.large.label as string,
                    uuid: row.large.value as string,
                  },
            mediumStatisticCategory:
              row.medium.label == '' || isUUID(row.medium.label as string)
                ? null
                : {
                    name: row.medium.label as string,
                    uuid: row.medium.value as string,
                  },
            smallStatisticCategory:
              row.small.label == '' || isUUID(row.small.label as string)
                ? null
                : {
                    name: row.small.label as string,
                    uuid: row.small.value as string,
                  },
            color: row.color,
            skillIds: row.skills.map((skill) => Number(skill.value)),
          };
        });

        updatedHierarchies.forEach((updatedHierarchy) => {
          const existingIndex = updatedHierarchiesToUpdate.findIndex(
            (item) =>
              item.organizationStatisticCategoryId ===
              updatedHierarchy.organizationStatisticCategoryId,
          );
          if (existingIndex != -1) {
            updatedHierarchiesToUpdate[existingIndex] = updatedHierarchy;
          } else {
            updatedHierarchiesToUpdate.push(updatedHierarchy);
          }
        });

        return updatedHierarchiesToUpdate;
      }
    });
    setHierarchyList((prev) => {
      const updatedHierarchyList = prev.map((org) => ({
        ...org,
        statisticCategories: [...org.statisticCategories],
      }));

      const foundOrganizationHierarchyIndex = updatedHierarchyList.findIndex(
        (hierarchy) => hierarchy.id == hierarchyList.id,
      );

      if (foundOrganizationHierarchyIndex !== -1) {
        const statisticCategories =
          updatedHierarchyList[foundOrganizationHierarchyIndex]
            .statisticCategories;

        const matchedRowsWithLargeValue = statisticCategories.filter(
          (item) => item.large.value == oldLargeValue,
        );
        if (matchedRowsWithLargeValue.length == 1) {
          const newMedium = {
            label: newUuid as string,
            value: newUuid,
            showBy: AddCategoryHierarchyType.PULLDOWN,
          };

          // Separate matching and non-matching rows
          const matchedRows = statisticCategories
            .filter(
              (item) =>
                item.medium.value == oldMediumValue &&
                item.large.value == oldLargeValue,
            )
            .map((item) => ({
              ...item,
              medium: newMedium,
            }));

          const remainingRows = statisticCategories.filter(
            (item) =>
              !(
                item.medium.value == oldMediumValue &&
                item.large.value == oldLargeValue
              ),
          );

          // Find the last index where newMedium.value already exists
          let lastIndex = -1;
          remainingRows.forEach((item, index) => {
            if (
              item.large.value == oldLargeValue &&
              item.medium.value === newMedium.value
            )
              lastIndex = index;
          });

          // Maintain position if lastIndex is -1
          const newStatisticCategories = [...remainingRows];
          if (lastIndex !== -1) {
            newStatisticCategories.splice(lastIndex + 1, 0, ...matchedRows);
          } else {
            // Instead of pushing, find the **original** position of row.original.medium.value
            const originalIndex = statisticCategories.findIndex(
              (item) =>
                item.medium.value == oldMediumValue &&
                item.large.value == oldLargeValue,
            );

            if (originalIndex !== -1) {
              // Insert in the same position as original row
              newStatisticCategories.splice(originalIndex, 0, ...matchedRows);
            } else {
              // If no match found, append to the end
              newStatisticCategories.push(...matchedRows);
            }
          }

          // Remove duplicates
          const uniqueMap = new Map();
          const filteredStatisticCategories = newStatisticCategories.filter(
            (item) => {
              const key = `${isUUID(item.large.label) ? '' : item.large.label}|${isUUID(item.medium.label) ? '' : item.medium.label}|${isUUID(item.small?.label) ? '' : item.small?.label}`;
              if (uniqueMap.has(key)) return false;
              uniqueMap.set(key, true);
              return true;
            },
          );

          // Update hierarchy list
          updatedHierarchyList[foundOrganizationHierarchyIndex] = {
            ...updatedHierarchyList[foundOrganizationHierarchyIndex],
            statisticCategories: filteredStatisticCategories,
          };
        } else {
          updatedHierarchyList[foundOrganizationHierarchyIndex] = {
            ...updatedHierarchyList[foundOrganizationHierarchyIndex],
            statisticCategories: [
              ...updatedHierarchyList[
                foundOrganizationHierarchyIndex
              ].statisticCategories.filter(
                (hierarchy) =>
                  !(
                    hierarchy.large.value == oldLargeValue &&
                    hierarchy.medium.value == oldMediumValue
                  ),
              ),
            ],
          };
        }
      }

      return updatedHierarchyList;
    });
  };

  const handleDeleteSmallHierarchyCategory = (
    oldLargeOption: OptionDropdownType,
    oldMediumOption: OptionDropdownType,
    oldSmallOption: OptionDropdownType,
    oldRowId: string | number,
    oldRowSkill: OptionDropdownType[],
    oldRowColor: string,
  ) => {
    const newUuid = uuidv4();
    setSelectedHierarchiesToDelete((prev) => {
      const matchedRowsWithLargeValue =
        hierarchyList.statisticCategories.filter(
          (item) =>
            item.large.value == oldLargeOption.value &&
            item.medium.value == oldMediumOption.value,
        );
      const currentHierarchiesToDelete = [...(prev || [])];

      if (matchedRowsWithLargeValue.length > 1) {
        const matchingHierarchies = hierarchyList.statisticCategories
          .filter(
            (item) =>
              item.large.value == oldLargeOption.value &&
              item.medium.value == oldMediumOption.value &&
              item.small.value == oldSmallOption.value,
          )
          .map((hierarchy) => String(hierarchy.id)); // Convert IDs to strings

        return [...currentHierarchiesToDelete, ...matchingHierarchies]; // Spread to avoid nested arrays
      } else {
        return currentHierarchiesToDelete;
      }
    });
    setSelectedHierarchiesToUpdate((prev) => {
      const matchedRowsWithLargeValue =
        hierarchyList.statisticCategories.filter(
          (item) =>
            item.large.value == oldLargeOption.value &&
            item.medium.value == oldMediumOption.value,
        );
      if (matchedRowsWithLargeValue.length > 1) {
        const currentHierarchiesToUpdate = [...(prev || [])];

        return currentHierarchiesToUpdate.filter(
          (hierarchy) =>
            !(
              hierarchy.largeStatisticCategory?.uuid == oldLargeOption.value &&
              hierarchy.mediumStatisticCategory?.uuid ==
                oldMediumOption.value &&
              hierarchy.smallStatisticCategory?.uuid == oldSmallOption.value
            ),
        );
      } else {
        const updatedHierarchiesToUpdate = [...prev];

        const existingIndex = updatedHierarchiesToUpdate.findIndex(
          (item) => item.organizationStatisticCategoryId === oldRowId,
        );

        const newEntry = {
          organizationStatisticCategoryId: oldRowId,
          organizationId: hierarchyList.id as number,
          largeStatisticCategory:
            oldLargeOption.label == '' || isUUID(oldLargeOption.label as string)
              ? null
              : {
                  name: oldLargeOption.label as string,
                  uuid: oldLargeOption.value as string,
                },
          mediumStatisticCategory:
            oldMediumOption.label == '' ||
            isUUID(oldMediumOption.label as string)
              ? null
              : {
                  name: oldMediumOption.label as string,
                  uuid: oldMediumOption.value as string,
                },
          smallStatisticCategory: null,
          color: oldRowColor,
          skillIds: oldRowSkill.map((skill) => Number(skill.value)),
        };

        if (existingIndex !== -1) {
          // If it exists, replace it
          updatedHierarchiesToUpdate[existingIndex] = newEntry;
        } else {
          // Otherwise, add it
          updatedHierarchiesToUpdate.push(newEntry);
        }

        return updatedHierarchiesToUpdate;
      }
    });
    setHierarchyList((prev) => {
      const updatedHierarchyList = prev.map((org) => ({
        ...org,
        statisticCategories: [...org.statisticCategories],
      }));

      const foundOrganizationHierarchyIndex = updatedHierarchyList.findIndex(
        (hierarchy) => hierarchy.id === hierarchyList.id,
      );

      if (foundOrganizationHierarchyIndex !== -1) {
        const statisticCategories =
          updatedHierarchyList[foundOrganizationHierarchyIndex]
            .statisticCategories;

        const matchedRowsWithLargeValue = statisticCategories.filter(
          (item) =>
            item.large.value == oldLargeOption.value &&
            item.medium.value == oldMediumOption.value,
        );
        if (matchedRowsWithLargeValue.length == 1) {
          const updatedCategories = updatedHierarchyList[
            foundOrganizationHierarchyIndex
          ].statisticCategories.map((hierarchy) =>
            hierarchy.id === oldRowId
              ? {
                  ...hierarchy,
                  small: {
                    label: newUuid,
                    value: newUuid,
                    showBy: AddCategoryHierarchyType.PULLDOWN,
                  },
                }
              : hierarchy,
          );

          const uniqueMap = new Map();
          const filteredCategories = updatedCategories.filter((item) => {
            const key = `${isUUID(item.large.label) ? '' : item.large.label}|${isUUID(item.medium.label) ? '' : item.medium.label}|${isUUID(item.small?.label) ? '' : item.small?.label}`;
            if (uniqueMap.has(key)) return false;
            uniqueMap.set(key, true);
            return true;
          });

          updatedHierarchyList[
            foundOrganizationHierarchyIndex
          ].statisticCategories = filteredCategories;
        } else {
          updatedHierarchyList[foundOrganizationHierarchyIndex] = {
            ...updatedHierarchyList[foundOrganizationHierarchyIndex],
            statisticCategories: [
              ...updatedHierarchyList[
                foundOrganizationHierarchyIndex
              ].statisticCategories.filter(
                (hierarchy) =>
                  !(
                    hierarchy.large.value == oldLargeOption.value &&
                    hierarchy.medium.value == oldMediumOption.value &&
                    hierarchy.small.value == oldSmallOption.value
                  ),
              ),
            ],
          };
        }
      }

      return updatedHierarchyList;
    });
  };

  // Check delete hierarchy category
  const handleCheckDeleteHierarchyCategory = async (ids: string[]) => {
    return await api.post(apiRouters.CHECK_ACTUAL_DURATION, {
      ids,
    });
  };

  const { mutateAsync: checkDeleteHierarchyCategory } = useMutation(
    'postCheckDeleteHierarchyCategory',
    handleCheckDeleteHierarchyCategory,
  );

  return (
    <div
      className="w-full p-5 bg-[#F8FAFC] rounded-[14px]"
      style={{ boxShadow: '0px 4px 10px 0px #0000000D' }}>
      <p className="text-[#77858F] text-[16px] font-medium my-2 max-w-[100%] break-all">
        {organizationName}
      </p>
      <Table className="w-full h-full bg-white !rounded-[6px]">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  className="text-[#77858F] border-r-[1px] w-1/4 font-medium text-xs py-3">
                  {flexRender(
                    header.column.columnDef.header,
                    header.getContext(),
                  )}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row, rowIndex) => {
            const excludedSmalls = getExcludedSmalls(row.original);
            return (
              <tr key={row.id} className="h-[1px]">
                {largeRowspan[rowIndex] > 0 && (
                  <td
                    className="border-[1px] !w-1/4 border-[#D2DBE1] h-full"
                    style={{ height: 'inherit' }}
                    rowSpan={largeRowspan[rowIndex]}>
                    <div className="p-3 h-full flex items-center gap-3">
                      <div className="relative">
                        <div
                          className={`w-[14px] h-[14px] rounded-full hover:cursor-pointer`}
                          style={{ backgroundColor: `${row.original.color}` }}
                          onClick={() => {
                            setOpenColorBox({
                              status: true,
                              uuid: String(row.original.id),
                            });
                          }}
                        />
                        {row.original.id == openColorBox.uuid && (
                          <div className="absolute left-5 -top-5 z-50">
                            <CircleColorPicker
                              onChange={(newColor) => {
                                setSelectedHierarchiesToUpdate((prev) => {
                                  const updatedHierarchiesToUpdate = [...prev];
                                  const statisticCategories =
                                    hierarchyList.statisticCategories;

                                  const matchedRows = statisticCategories
                                    .filter(
                                      (item) =>
                                        item.large.value ===
                                        row.original.large.value,
                                    )
                                    .map((item) => ({
                                      ...item,
                                      color: newColor,
                                    }));
                                  const updatedHierarchies = matchedRows.map(
                                    (row) => {
                                      return {
                                        organizationStatisticCategoryId: row.id,
                                        organizationId:
                                          hierarchyList.id as number,
                                        largeStatisticCategory:
                                          row.large.label == '' ||
                                          isUUID(row.large.label as string)
                                            ? null
                                            : {
                                                name: row.large.label as string,
                                                uuid: row.large.value as string,
                                              },
                                        mediumStatisticCategory:
                                          row.medium.label == '' ||
                                          isUUID(row.medium.label as string)
                                            ? null
                                            : {
                                                name: row.medium
                                                  .label as string,
                                                uuid: row.medium
                                                  .value as string,
                                              },
                                        smallStatisticCategory:
                                          row.small.label == '' ||
                                          isUUID(row.small.label as string)
                                            ? null
                                            : {
                                                name: row.small.label as string,
                                                uuid: row.small.value as string,
                                              },
                                        color: row.color,
                                        skillIds: row.skills.map((skill) =>
                                          Number(skill.value),
                                        ),
                                      };
                                    },
                                  );

                                  updatedHierarchies.forEach(
                                    (updatedHierarchy) => {
                                      const existingIndex =
                                        updatedHierarchiesToUpdate.findIndex(
                                          (item) =>
                                            item.organizationStatisticCategoryId ===
                                            updatedHierarchy.organizationStatisticCategoryId,
                                        );
                                      if (existingIndex != -1) {
                                        updatedHierarchiesToUpdate[
                                          existingIndex
                                        ] = updatedHierarchy;
                                      } else {
                                        updatedHierarchiesToUpdate.push(
                                          updatedHierarchy,
                                        );
                                      }
                                    },
                                  );

                                  return updatedHierarchiesToUpdate;
                                });
                                setHierarchyList((prev) => {
                                  const updatedHierarchyList = prev.map(
                                    (org) => ({
                                      ...org,
                                      statisticCategories: [
                                        ...org.statisticCategories,
                                      ],
                                    }),
                                  );

                                  const foundOrganizationHierarchyIndex =
                                    updatedHierarchyList.findIndex(
                                      (hierarchy) =>
                                        hierarchy.id === hierarchyList.id,
                                    );

                                  if (foundOrganizationHierarchyIndex !== -1) {
                                    const updatedCategories =
                                      updatedHierarchyList[
                                        foundOrganizationHierarchyIndex
                                      ].statisticCategories.map((hierarchy) =>
                                        hierarchy.large.value ===
                                        row.original.large.value
                                          ? {
                                              ...hierarchy,
                                              color: newColor,
                                            }
                                          : hierarchy,
                                      );

                                    updatedHierarchyList[
                                      foundOrganizationHierarchyIndex
                                    ].statisticCategories = updatedCategories;
                                  }

                                  return updatedHierarchyList;
                                });
                                setOpenColorBox({
                                  status: false,
                                  uuid: '',
                                });
                              }}
                              onClose={() => {
                                setOpenColorBox({
                                  status: false,
                                  uuid: '',
                                });
                              }}
                            />
                          </div>
                        )}
                      </div>
                      {row.original.large.showBy ==
                      AddCategoryHierarchyType.INPUT ? (
                        <div className="flex flex-col !h-full w-full">
                          <div className="mb-1 !h-full w-full">
                            <input
                              type="text"
                              className={`w-full !h-full !min-h-[46px] p-2 text-black rounded-[5px]`}
                              placeholder="新しいカテゴリーを入力"
                              defaultValue={
                                !isUUID(row.original.large.label)
                                  ? row.original.large.label
                                  : ''
                              }
                              onBlur={(e) => {
                                handleSetNewCategory({
                                  name: e.target.value,
                                  uuid: String(row.original.large.value) || '',
                                  type: HierarchyType.LARGE,
                                  rowInfo: row.original,
                                });
                              }}
                              onChange={() => {
                                setIsTyping(true);
                              }}
                            />
                          </div>
                        </div>
                      ) : (
                        row.original.large.showBy ==
                          AddCategoryHierarchyType.PULLDOWN && (
                          <TableDropdown
                            key={JSON.stringify(row.original.large)}
                            options={[
                              ...categoryDropdownOptions.filter(
                                (option) =>
                                  option.value !== row.original.medium.value && // Prevent selecting the same as medium
                                  option.value !== row.original.small.value && // Prevent selecting the same as small
                                  option.value !== '',
                              ),
                            ]}
                            minDropdownHeight={240}
                            className="h-full !rounded-[5px] w-full flex-grow"
                            valueClassName="!border-[#77858F]"
                            labelClass="w-[160px]"
                            selectedOption={categoryDropdownOptions.find(
                              (element) =>
                                element.value === row.original.large.value,
                            )}
                            onPendingChange={(e) => {
                              const oldLargeOption = row.original.large;
                              if (e.value == oldLargeOption.value) return;
                              if (
                                row.original.large.label &&
                                !isUUID(row.original.large.label) &&
                                !isUUID(row.original.id as string)
                              ) {
                                setWarningChangeCategoryModalOpen(true);
                                setPendingSelection({
                                  oldLargeOption,
                                  newValue: e,
                                  type: StatisticCategoryType.LARGE,
                                });
                              } else {
                                handleChangeLargeCategoryByPulldown(
                                  oldLargeOption,
                                  e,
                                );
                              }
                            }}
                          />
                        )
                      )}

                      <ImageRound
                        name="Delete"
                        src={'/icons/delete-gray.svg'}
                        className="w-[15px] h-[17px] ml-[-7px] hover:cursor-pointer"
                        onClick={async () => {
                          const oldLargeValue = row.original.large.value;
                          const matchingHierarchies =
                            hierarchyList.statisticCategories
                              .filter(
                                (item) => item.large.value === oldLargeValue,
                              )
                              .filter(
                                (hierarchy) => !isUUID(String(hierarchy.id)),
                              )
                              .map((hierarchy) => String(hierarchy.id));
                          const { data } =
                            await checkDeleteHierarchyCategory(
                              matchingHierarchies,
                            );
                          if (!data.hasActualDuration) {
                            handleDeleteLargeHierarchyCategory(oldLargeValue);
                          } else {
                            setWarningDeleteCategoryModalOpen(true);
                          }
                        }}
                      />
                    </div>
                  </td>
                )}
                {mediumRowspan[rowIndex] > 0 && (
                  <td
                    className="border-[1px] w-1/4 border-[#D2DBE1]"
                    style={{ height: 'inherit' }}
                    rowSpan={mediumRowspan[rowIndex]}>
                    <div className="p-3 flex flex-col !h-[100%]">
                      <div
                        className={`flex items-center ${lastMediumIndexes.includes(rowIndex) ? 'h-[calc(100%_-_46px)]' : 'h-[calc(100%)]'} mb-3 gap-3`}>
                        {row.original.medium.showBy ==
                        AddCategoryHierarchyType.INPUT ? (
                          <div className="flex flex-col !h-full w-full">
                            <div className="mb-1 !h-full w-full">
                              <input
                                type="text"
                                className={`w-full !h-full !min-h-[46px] p-2 text-black rounded-[5px]`}
                                placeholder="新しいカテゴリーを入力"
                                defaultValue={
                                  !isUUID(row.original.medium.label)
                                    ? row.original.medium.label
                                    : ''
                                }
                                onBlur={(e) => {
                                  handleSetNewCategory({
                                    name: e.target.value,
                                    uuid:
                                      String(row.original.medium.value) || '',
                                    type: HierarchyType.MEDIUM,
                                    rowInfo: row.original,
                                  });
                                }}
                                onChange={() => {
                                  setIsTyping(true);
                                }}
                              />
                            </div>
                          </div>
                        ) : (
                          row.original.medium.showBy ==
                            AddCategoryHierarchyType.PULLDOWN && (
                            <div className={`w-full h-full`}>
                              <TableDropdown
                                key={JSON.stringify(row.original.medium)}
                                options={[
                                  ...categoryDropdownOptions.filter(
                                    (option) =>
                                      option.value !==
                                        row.original.large.value &&
                                      option.value !==
                                        row.original.small.value &&
                                      option.value !== '',
                                  ),
                                ]}
                                minDropdownHeight={240}
                                className="h-full !rounded-[5px] w-full flex-grow"
                                valueClassName="!border-[#77858F]"
                                labelClass="w-[160px]"
                                selectedOption={categoryDropdownOptions.find(
                                  (element) =>
                                    element.value === row.original.medium.value,
                                )}
                                onPendingChange={(e) => {
                                  const oldMediumOption = row.original.medium;
                                  const oldLargeOption = row.original.large;
                                  if (e.value == oldMediumOption.value) return;
                                  if (
                                    row.original.medium.label &&
                                    !isUUID(row.original.medium.label) &&
                                    !isUUID(row.original.id as string)
                                  ) {
                                    setWarningChangeCategoryModalOpen(true);
                                    setPendingSelection({
                                      oldLargeOption,
                                      oldMediumOption,
                                      newValue: e,
                                      type: StatisticCategoryType.MEDIUM,
                                    });
                                  } else {
                                    handleChangeMediumCategoryByPulldown(
                                      oldLargeOption,
                                      oldMediumOption!,
                                      e,
                                    );
                                  }
                                }}
                              />
                            </div>
                          )
                        )}
                        {row.original.medium.showBy && (
                          <ImageRound
                            name="Delete"
                            src={'/icons/delete-gray.svg'}
                            className="w-[15px] h-[17px] hover:cursor-pointer"
                            onClick={async () => {
                              const oldLargeValue = row.original.large.value;
                              const oldMediumValue = row.original.medium.value;
                              const matchingHierarchies =
                                hierarchyList.statisticCategories
                                  .filter(
                                    (item) =>
                                      item.large.value === oldLargeValue &&
                                      item.medium.value === oldMediumValue,
                                  )
                                  .filter(
                                    (hierarchy) =>
                                      !isUUID(String(hierarchy.id)),
                                  )
                                  .map((hierarchy) => String(hierarchy.id));
                              const { data } =
                                await checkDeleteHierarchyCategory(
                                  matchingHierarchies,
                                );
                              if (!data.hasActualDuration) {
                                handleDeleteMediumHierarchyCategory(
                                  oldLargeValue,
                                  oldMediumValue,
                                );
                              } else {
                                setWarningDeleteCategoryModalOpen(true);
                              }
                            }}
                          />
                        )}
                      </div>

                      {lastMediumIndexes.includes(rowIndex) && (
                        <>
                          <OptionsBoxToAddCategory
                            text={'中カテゴリーを追加'}
                            addCategoryUsingInput={() =>
                              handleAddMediumCategory(
                                AddCategoryHierarchyType.INPUT,
                                row.original,
                              )
                            }
                            addCategoryUsingDropdown={() =>
                              handleAddMediumCategory(
                                AddCategoryHierarchyType.PULLDOWN,
                                row.original,
                              )
                            }
                          />
                        </>
                      )}
                    </div>
                  </td>
                )}
                <td
                  className="border-[1px] w-1/4 border-[#D2DBE1]"
                  style={{ height: 'inherit' }}>
                  <div className="p-3 flex flex-col !h-[100%]">
                    <div className={`flex items-center mb-3 gap-3`}>
                      {row.original.small.showBy ==
                      AddCategoryHierarchyType.INPUT ? (
                        <div className="flex flex-col !h-full w-full">
                          <div className="mb-1 !h-full w-full">
                            <input
                              type="text"
                              className={`w-full !h-full !min-h-[46px] p-2 text-black rounded-[5px]`}
                              placeholder="新しいカテゴリーを入力"
                              defaultValue={
                                !isUUID(row.original.small.label)
                                  ? row.original.small.label
                                  : ''
                              }
                              onBlur={(e) => {
                                handleSetNewCategory({
                                  name: e.target.value,
                                  uuid: String(row.original.small.value) || '',
                                  type: HierarchyType.SMALL,
                                  rowInfo: row.original,
                                });
                              }}
                              onChange={() => {
                                setIsTyping(true);
                              }}
                            />
                          </div>
                        </div>
                      ) : (
                        row.original.small.showBy ==
                          AddCategoryHierarchyType.PULLDOWN && (
                          <div className="w-full h-full">
                            <TableDropdown
                              key={JSON.stringify(row.original.small)}
                              options={[
                                ...categoryDropdownOptions.filter(
                                  (option) =>
                                    !excludedSmalls.includes(option.value) && // Prevent selecting the same as other rows in the group
                                    option.value !== row.original.large.value && // Prevent selecting the same as large
                                    option.value !==
                                      row.original.medium.value && // Prevent selecting the same as medium
                                    option.value !== '',
                                ),
                              ]}
                              minDropdownHeight={240}
                              className="h-full !rounded-[5px]"
                              valueClassName="!border-[#77858F]"
                              labelClass="w-[160px]"
                              selectedOption={categoryDropdownOptions.find(
                                (element) =>
                                  element.value == row.original.small.value,
                              )}
                              onPendingChange={(e) => {
                                const oldMediumOption = row.original.medium;
                                const oldLargeOption = row.original.large;
                                const oldRowId = row.original.id;
                                const oldRowSkill = row.original.skills;
                                const oldRowColor = row.original.color;
                                if (e.value == row.original.small.value) return;
                                if (
                                  row.original.small.label &&
                                  !isUUID(row.original.small.label) &&
                                  !isUUID(row.original.id as string)
                                ) {
                                  setWarningChangeCategoryModalOpen(true);
                                  setPendingSelection({
                                    oldLargeOption,
                                    oldMediumOption,
                                    oldRowId,
                                    oldRowSkill,
                                    oldRowColor,
                                    newValue: e,
                                    type: StatisticCategoryType.SMALL,
                                  });
                                } else {
                                  handleChangeSmallCategoryByPulldown(
                                    oldLargeOption,
                                    oldMediumOption!,
                                    oldRowId!,
                                    oldRowSkill!,
                                    oldRowColor!,
                                    e,
                                  );
                                }
                              }}
                            />
                          </div>
                        )
                      )}
                      {row.original.small.showBy && (
                        <ImageRound
                          name="Delete"
                          src={'/icons/delete-gray.svg'}
                          className="w-[15px] h-[17px] hover:cursor-pointer"
                          onClick={async () => {
                            const oldLargeOption = row.original.large;
                            const oldMediumOption = row.original.medium;
                            const oldSmallOption = row.original.small;
                            const oldRowId = row.original.id;
                            const oldRowSkill = row.original.skills;
                            const oldRowColor = row.original.color;
                            const matchingHierarchies =
                              hierarchyList.statisticCategories
                                .filter(
                                  (item) =>
                                    item.large.value == oldLargeOption.value &&
                                    item.medium.value ==
                                      oldMediumOption.value &&
                                    item.small.value == oldSmallOption.value,
                                )
                                .filter(
                                  (hierarchy) => !isUUID(String(hierarchy.id)),
                                )
                                .map((hierarchy) => String(hierarchy.id));
                            const { data } =
                              await checkDeleteHierarchyCategory(
                                matchingHierarchies,
                              );
                            if (!data.hasActualDuration) {
                              handleDeleteSmallHierarchyCategory(
                                oldLargeOption,
                                oldMediumOption,
                                oldSmallOption,
                                oldRowId,
                                oldRowSkill,
                                oldRowColor,
                              );
                            } else {
                              setWarningDeleteCategoryModalOpen(true);
                            }
                          }}
                        />
                      )}
                    </div>

                    {lastSmallIndexes.includes(rowIndex) && (
                      <OptionsBoxToAddCategory
                        text={'小カテゴリーを追加'}
                        addCategoryUsingInput={() =>
                          handleAddSmallCategory(
                            AddCategoryHierarchyType.INPUT,
                            row.original,
                          )
                        }
                        addCategoryUsingDropdown={() =>
                          handleAddSmallCategory(
                            AddCategoryHierarchyType.PULLDOWN,
                            row.original,
                          )
                        }
                      />
                    )}
                  </div>
                </td>
                <td className="border-[1px] h-full border-[#D2DBE1] !w-1/4 max-w-[1/4]">
                  <MultiSelect
                    key={JSON.stringify(row.original.skills)}
                    className="w-full"
                    defaultValue={row.original.skills.map((skill) => {
                      return {
                        value: skill.value as number,
                        label: skill.label as string,
                      };
                    })}
                    options={dataOptionsSkill.filter((option) => option.value)}
                    onChange={(selectedSkills) => {
                      setSelectedHierarchiesToUpdate((prev) => {
                        const updatedHierarchiesToUpdate = [...prev];

                        const existingIndex =
                          updatedHierarchiesToUpdate.findIndex(
                            (item) =>
                              item.organizationStatisticCategoryId ===
                              row.original.id,
                          );

                        const newEntry = {
                          organizationStatisticCategoryId: row.original.id,
                          organizationId: hierarchyList.id as number,
                          largeStatisticCategory:
                            row.original.large.label == '' ||
                            isUUID(row.original.large.label as string)
                              ? null
                              : {
                                  name: row.original.large.label as string,
                                  uuid: row.original.large.value as string,
                                },
                          mediumStatisticCategory:
                            row.original.medium.label == '' ||
                            isUUID(row.original.medium.label as string)
                              ? null
                              : {
                                  name: row.original.medium.label as string,
                                  uuid: row.original.medium.value as string,
                                },
                          smallStatisticCategory:
                            row.original.small.label == '' ||
                            isUUID(row.original.small.label as string)
                              ? null
                              : {
                                  name: row.original.small.label as string,
                                  uuid: row.original.small.value as string,
                                },
                          color: row.original.color,
                          skillIds: selectedSkills.map((skill) => skill.value),
                        };

                        if (existingIndex !== -1) {
                          // If it exists, replace it
                          updatedHierarchiesToUpdate[existingIndex] = newEntry;
                        } else {
                          // Otherwise, add it
                          updatedHierarchiesToUpdate.push(newEntry);
                        }

                        return updatedHierarchiesToUpdate;
                      });
                      setHierarchyList((prev) => {
                        const updatedHierarchyList = prev.map((org) => ({
                          ...org,
                          statisticCategories: [...org.statisticCategories],
                        }));

                        const foundOrganizationHierarchyIndex =
                          updatedHierarchyList.findIndex(
                            (hierarchy) => hierarchy.id == hierarchyList.id,
                          );

                        if (foundOrganizationHierarchyIndex !== -1) {
                          const updatedCategories = updatedHierarchyList[
                            foundOrganizationHierarchyIndex
                          ].statisticCategories.map((hierarchy) =>
                            hierarchy.id === row.original.id
                              ? {
                                  ...hierarchy,
                                  skills: selectedSkills.map((skill) => {
                                    return {
                                      label: skill.label,
                                      value: skill.value,
                                    };
                                  }),
                                }
                              : hierarchy,
                          );

                          const uniqueMap = new Map();
                          const filteredCategories = updatedCategories.filter(
                            (item) => {
                              const key = `${item.large.value}|${item.medium.value}|${item.small?.value || ''}`;
                              if (uniqueMap.has(key)) return false;
                              uniqueMap.set(key, true);
                              return true;
                            },
                          );

                          updatedHierarchyList[
                            foundOrganizationHierarchyIndex
                          ].statisticCategories = filteredCategories;
                        }

                        return updatedHierarchyList;
                      });
                    }}
                  />
                </td>
              </tr>
            );
          })}
          <tr>
            <td className="p-3 w-1/4 border-[1px] border-[#D2DBE1]">
              <OptionsBoxToAddCategory
                text={'大カテゴリーを追加'}
                addCategoryUsingInput={() =>
                  handleAddLargeCategory(AddCategoryHierarchyType.INPUT)
                }
                addCategoryUsingDropdown={() =>
                  handleAddLargeCategory(AddCategoryHierarchyType.PULLDOWN)
                }
              />
            </td>
            <td className="w-1/4 border-[1px] border-[#D2DBE1]"></td>
            <td className="w-1/4 border-[1px] border-[#D2DBE1]"></td>
            <td className="w-1/4 border-[1px] border-[#D2DBE1]"></td>
          </tr>
        </tbody>
      </Table>

      {warningDeleteCategoryModalOpen && (
        <WarningDeleteHierarchyCategoryModal
          open={warningDeleteCategoryModalOpen}
          onClose={() => {
            setWarningDeleteCategoryModalOpen(false);
          }}
        />
      )}

      {warningChangeCategoryModalOpen && (
        <WarningChangeHierarchyCategoryModal
          open={warningChangeCategoryModalOpen}
          onConfirm={() => {
            if (!pendingSelection) return;

            const {
              oldLargeOption,
              oldMediumOption,
              oldRowId,
              oldRowSkill,
              oldRowColor,
              newValue,
              type,
            } = pendingSelection;
            switch (type) {
              case StatisticCategoryType.LARGE:
                handleChangeLargeCategoryByPulldown(oldLargeOption, newValue);
                break;
              case StatisticCategoryType.MEDIUM:
                handleChangeMediumCategoryByPulldown(
                  oldLargeOption,
                  oldMediumOption!,
                  newValue,
                );
                break;
              case StatisticCategoryType.SMALL:
                handleChangeSmallCategoryByPulldown(
                  oldLargeOption,
                  oldMediumOption!,
                  oldRowId!,
                  oldRowSkill!,
                  oldRowColor!,
                  newValue,
                );
                break;
            }

            setWarningChangeCategoryModalOpen(false);
            setPendingSelection(null);
          }}
          onClose={() => {
            setWarningChangeCategoryModalOpen(false);
            setPendingSelection(null);
          }}
        />
      )}
    </div>
  );
};

export default TableComponent;
