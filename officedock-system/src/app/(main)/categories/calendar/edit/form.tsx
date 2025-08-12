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
import { CalendarCategoryRow } from '@interfaces/hierarchy';

import api from '@base/api';

interface HierarchyDetail {
  id: number | string;
  name: string;
  statisticCategories: CalendarCategoryRow[];
}

const TableComponent = ({
  hierarchyDetail,
  categoryList,
  setIsTyping,
  setHierarchyDetail,
  setSelectedHierarchiesToDelete,
  setSelectedHierarchiesToUpdate,
}: {
  hierarchyDetail: HierarchyDetail;
  categoryList: OptionDropdownType[];
  setIsTyping: Dispatch<SetStateAction<boolean>>;
  setHierarchyDetail: Dispatch<SetStateAction<HierarchyDetail>>;
  setSelectedHierarchiesToDelete: Dispatch<SetStateAction<string[]>>;
  setSelectedHierarchiesToUpdate: Dispatch<
    SetStateAction<
      {
        organizationStatisticCategoryId: string | number | null;
        largeStatisticCategory: {
          name: string;
          uuid: string;
        } | null;
        mediumStatisticCategory: {
          name: string;
          uuid: string;
        } | null;
        color: string;
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
    oldRowColor?: string;
    newValue: OptionDropdownType;
    type: string;
  } | null>(null);

  useEffect(() => {
    if (categoryList) {
      const categoryOptions = categoryList.filter(
        (category) =>
          category.teamId == null || category.teamId == hierarchyDetail.id,
      );
      setCategoryDropdownOptions(categoryOptions);
    }
  }, [categoryList, hierarchyDetail.id]);

  const findLastUniqueMediumIndexes = (
    data: CalendarCategoryRow[],
  ): number[] => {
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

  const lastMediumIndexes = findLastUniqueMediumIndexes(
    hierarchyDetail.statisticCategories,
  );

  const uniqueLargeCount = new Set(
    hierarchyDetail.statisticCategories
      .filter((hierarchy) => hierarchy.large.showBy)
      .map((item) => item.large.value),
  ).size;
  const uniqueMediumCount = new Set(
    hierarchyDetail.statisticCategories
      .filter((hierarchy) => hierarchy.medium.showBy)
      .map((item) => `${item.large.value}-${item.medium.value}`),
  ).size;

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
  ];

  const table = useReactTable({
    data: hierarchyDetail.statisticCategories,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const processRowspan = (
    data: CalendarCategoryRow[],
    key: HierarchyType.LARGE | HierarchyType.MEDIUM,
  ): Record<number, number> => {
    const rowspanMap: Record<number, number> = {};
    const countMap: Record<string, number> = {}; // Stores counts per (large, medium) group
    let prevLargeValue: string | null = null;
    let prevKeyValue: string | null = null;

    data.forEach((row, index) => {
      const groupKey = `${row.large.value}-${row[key].value}`; // Unique key per large-medium pair

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
    hierarchyDetail.statisticCategories,
    HierarchyType.LARGE,
  );
  const mediumRowspan = processRowspan(
    hierarchyDetail.statisticCategories,
    HierarchyType.MEDIUM,
  );

  const handleAddMediumCategory = (
    option: string,
    rowInfo: CalendarCategoryRow,
  ) => {
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
    };

    setHierarchyDetail((prev) => {
      const updatedHierarchyDetail = { ...prev };
      const targetList = updatedHierarchyDetail?.statisticCategories || [];

      const sameGroupIndexes = targetList
        .map((item, index) =>
          item.large.value === rowInfo.large.value ? index : -1,
        )
        .filter((index) => index !== -1); // Remove -1 values

      const emptyMediumIndex = sameGroupIndexes.find((index) =>
        isUUID(targetList[index].medium?.label),
      );

      if (emptyMediumIndex !== undefined) {
        // Replace the first matching "empty" medium row
        targetList[emptyMediumIndex] = {
          ...newRow,
          id: String(targetList[emptyMediumIndex].id), // retain original row id
        };
      } else {
        // Check if there's already an empty medium row to avoid adding duplicates
        const alreadyHasEmpty = targetList.some(
          (item) =>
            item.large.value === rowInfo.large.value &&
            isUUID(String(item.medium.label)) &&
            item.medium.showBy,
        );

        if (!alreadyHasEmpty) {
          // Otherwise, add the new row after the last occurrence
          const lastIndex = sameGroupIndexes.pop();
          if (lastIndex !== undefined) {
            targetList.splice(lastIndex + 1, 0, newRow);
          } else {
            targetList.push(newRow);
          }
        }
      }

      updatedHierarchyDetail.statisticCategories = [...targetList];
      return updatedHierarchyDetail;
    });
  };

  const handleAddLargeCategory = (option: string) => {
    const newUuid = uuidv4();
    setHierarchyDetail((prev) => {
      const updatedHierarchyDetail = { ...prev };
      const targetList = updatedHierarchyDetail?.statisticCategories || [];
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
      };

      // Check if there's already an empty medium row to avoid adding duplicates
      const emptyLargeIndex = targetList.findIndex(
        (item) => isUUID(String(item.large.label)) && item.large.showBy,
      );
      if (emptyLargeIndex != -1) {
        // Replace the first matching "empty" medium row
        targetList[emptyLargeIndex] = {
          ...newRow,
          id: String(targetList[emptyLargeIndex].id), // retain original row id
        };
      } else {
        targetList.push(newRow); // Only add if no empty row exists
      }

      updatedHierarchyDetail.statisticCategories = [...targetList];
      return updatedHierarchyDetail;
    });
  };

  // Set category when onBlur triggers
  const handleSetNewCategory = (variables: {
    name: string;
    uuid: string;
    type: string;
    rowInfo: CalendarCategoryRow;
  }) => {
    setSelectedHierarchiesToUpdate((prev) => {
      const updatedHierarchiesToUpdate = [...prev];

      const existingIndex = updatedHierarchiesToUpdate.findIndex(
        (item) => item.organizationStatisticCategoryId === variables.rowInfo.id,
      );

      let newEntry: any = {};
      if (variables.type == HierarchyType.LARGE) {
        newEntry = {
          organizationStatisticCategoryId: variables.rowInfo.id,
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
          color: variables.rowInfo.color,
        };
      } else if (variables.type == HierarchyType.MEDIUM) {
        newEntry = {
          organizationStatisticCategoryId: variables.rowInfo.id,
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
          color: variables.rowInfo.color,
        };
      } else {
        newEntry = {
          organizationStatisticCategoryId: variables.rowInfo.id,
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
          color: variables.rowInfo.color,
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
    setHierarchyDetail((prev) => {
      const updatedHierarchyDetail = { ...prev };
      if (variables.type == HierarchyType.LARGE) {
        updatedHierarchyDetail.statisticCategories =
          updatedHierarchyDetail.statisticCategories.map((hierarchy) =>
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
        updatedHierarchyDetail.statisticCategories =
          updatedHierarchyDetail.statisticCategories.map((hierarchy) =>
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
      }

      return updatedHierarchyDetail;
    });
    setIsTyping(false);
  };

  const handleChangeLargeCategoryByPulldown = (
    oldLargeOption: OptionDropdownType,
    e: OptionDropdownType,
  ) => {
    setSelectedHierarchiesToUpdate((prev) => {
      const updatedHierarchiesToUpdate = [...prev];
      const statisticCategories = hierarchyDetail.statisticCategories;

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
          color: row.color,
        };
      });

      updatedHierarchies.forEach((updatedHierarchy) => {
        const key = `${
          updatedHierarchy.largeStatisticCategory?.uuid || ''
        }|${updatedHierarchy.mediumStatisticCategory?.uuid || ''}`;

        const alreadyExists = updatedHierarchiesToUpdate.some(
          (item) =>
            item.organizationStatisticCategoryId ===
              updatedHierarchy.organizationStatisticCategoryId ||
            `${
              item.largeStatisticCategory?.uuid || ''
            }|${item.mediumStatisticCategory?.uuid || ''}` === key,
        );

        if (!alreadyExists) {
          updatedHierarchiesToUpdate.push(updatedHierarchy);
        }
      });

      return updatedHierarchiesToUpdate;
    });

    setHierarchyDetail((prev) => {
      let updatedHierarchyDetail = { ...prev };

      const statisticCategories = updatedHierarchyDetail.statisticCategories;

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
          const key = `${isUUID(item.large.label) ? '' : item.large.label}|${isUUID(item.medium.label) ? '' : item.medium.label}`;
          if (uniqueMap.has(key)) return false;
          uniqueMap.set(key, true);
          return true;
        },
      );

      // Update hierarchy list
      updatedHierarchyDetail = {
        ...updatedHierarchyDetail,
        statisticCategories: filteredStatisticCategories,
      };

      return updatedHierarchyDetail;
    });
  };

  const handleChangeMediumCategoryByPulldown = (
    oldLargeOption: OptionDropdownType,
    oldMediumOption: OptionDropdownType,
    e: OptionDropdownType,
  ) => {
    setSelectedHierarchiesToUpdate((prev) => {
      const updatedHierarchiesToUpdate = [...prev];
      const statisticCategories = hierarchyDetail.statisticCategories;
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
          color: row.color,
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
    setHierarchyDetail((prev) => {
      let updatedHierarchyDetail = { ...prev };

      const statisticCategories = updatedHierarchyDetail.statisticCategories;

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
          const key = `${isUUID(item.large.label) ? '' : item.large.label}|${isUUID(item.medium.label) ? '' : item.medium.label}`;
          if (uniqueMap.has(key)) return false;
          uniqueMap.set(key, true);
          return true;
        },
      );

      // Update hierarchy list
      updatedHierarchyDetail = {
        ...updatedHierarchyDetail,
        statisticCategories: filteredStatisticCategories,
      };

      return updatedHierarchyDetail;
    });
  };

  const handleDeleteLargeHierarchyCategory = (
    oldLargeValue: string | number,
  ) => {
    setSelectedHierarchiesToDelete((prev) => {
      const currentHierarchiesToDelete = [...(prev || [])];

      const matchingHierarchies = hierarchyDetail.statisticCategories
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
    setHierarchyDetail((prev) => {
      let updatedHierarchyDetail = { ...prev };

      updatedHierarchyDetail = {
        ...updatedHierarchyDetail,
        statisticCategories: [
          ...updatedHierarchyDetail.statisticCategories.filter(
            (hierarchy) => hierarchy.large.value != oldLargeValue,
          ),
        ],
      };

      return updatedHierarchyDetail;
    });
  };

  const handleDeleteMediumHierarchyCategory = (
    oldLargeValue: string | number,
    oldMediumValue: string | number,
  ) => {
    const newUuid = uuidv4();
    setSelectedHierarchiesToDelete((prev) => {
      const matchedRowsWithLargeValue =
        hierarchyDetail.statisticCategories.filter(
          (item) => item.large.value == oldLargeValue,
        );
      const currentHierarchiesToDelete = [...(prev || [])];
      if (matchedRowsWithLargeValue.length > 1) {
        const matchingHierarchies = hierarchyDetail.statisticCategories
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
        hierarchyDetail.statisticCategories.filter(
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
        const statisticCategories = hierarchyDetail.statisticCategories;
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
            color: row.color,
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
    setHierarchyDetail((prev) => {
      let updatedHierarchyDetail = { ...prev };

      const statisticCategories = updatedHierarchyDetail.statisticCategories;

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
            const key = `${isUUID(item.large.label) ? '' : item.large.label}|${isUUID(item.medium.label) ? '' : item.medium.label}`;
            if (uniqueMap.has(key)) return false;
            uniqueMap.set(key, true);
            return true;
          },
        );

        // Update hierarchy list
        updatedHierarchyDetail = {
          ...updatedHierarchyDetail,
          statisticCategories: filteredStatisticCategories,
        };
      } else {
        updatedHierarchyDetail = {
          ...updatedHierarchyDetail,
          statisticCategories: [
            ...updatedHierarchyDetail.statisticCategories.filter(
              (hierarchy) =>
                !(
                  hierarchy.large.value == oldLargeValue &&
                  hierarchy.medium.value == oldMediumValue
                ),
            ),
          ],
        };
      }

      return updatedHierarchyDetail;
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

  const getExcludedMediums = (currentRow: CalendarCategoryRow) => {
    return hierarchyDetail.statisticCategories
      .filter(
        (row) =>
          row.id !== currentRow.id &&
          row.large.value === currentRow.large.value,
      )
      .map((row) => row.medium.value)
      .filter((value) => value !== '');
  };

  return (
    <div
      className="w-full p-5 bg-[#F8FAFC] rounded-[30px]"
      style={{ boxShadow: '0px 4px 10px 0px #0000000D' }}>
      <p className="text-[#77858F] text-[16px] font-medium my-2 max-w-[100%] break-all">
        {hierarchyDetail.name}
      </p>
      <Table className="w-full h-full bg-white !rounded-[10px]">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  className="text-[#77858F] bg-[#F8FAFC] border-[1px] w-1/2 font-medium text-xs py-3">
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
            const excludedMediums = getExcludedMediums(row.original);
            return (
              <tr key={row.id} className="h-[1px]">
                {largeRowspan[rowIndex] > 0 && (
                  <td
                    className="border-[1px] !w-1/2 border-[#D2DBE1] h-full"
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
                                    hierarchyDetail.statisticCategories;

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
                                        color: row.color,
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
                                setHierarchyDetail((prev) => {
                                  const updatedHierarchyDetail = { ...prev };

                                  const updatedCategories =
                                    updatedHierarchyDetail.statisticCategories.map(
                                      (hierarchy) =>
                                        hierarchy.large.value ===
                                        row.original.large.value
                                          ? {
                                              ...hierarchy,
                                              color: newColor,
                                            }
                                          : hierarchy,
                                    );

                                  updatedHierarchyDetail.statisticCategories =
                                    updatedCategories;

                                  return updatedHierarchyDetail;
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
                              className={`w-full !h-full !min-h-[46px] p-2 text-black rounded-[6px]`}
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
                                  option.value !== '',
                              ),
                            ]}
                            minDropdownHeight={240}
                            className="h-full !rounded-[6px] w-full flex-grow"
                            valueClassName="!border-[#77858F]"
                            labelClass="w-[360px]"
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
                            hierarchyDetail.statisticCategories
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
                    className={`w-1/2 border-[#D2DBE1] ${lastMediumIndexes.includes(rowIndex) ? 'border-b-[1px] border-x-[1px]' : 'border-x-[1px]'}`}
                    style={{ height: 'inherit' }}
                    rowSpan={mediumRowspan[rowIndex]}>
                    <div className="p-3 flex flex-col !h-[100%]">
                      <div
                        className={`flex items-center ${lastMediumIndexes.includes(rowIndex) ? 'h-[calc(100%_-_46px)] mb-3' : 'h-[calc(100%)]'} gap-3`}>
                        {row.original.medium.showBy ==
                        AddCategoryHierarchyType.INPUT ? (
                          <div className="flex flex-col !h-full w-full">
                            <div className="mb-1 !h-full w-full">
                              <input
                                type="text"
                                className={`w-full !h-full !min-h-[46px] p-2 text-black rounded-[6px]`}
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
                                      !excludedMediums.includes(option.value) && // Prevent selecting the same as other rows in the group
                                      option.value !==
                                        row.original.large.value &&
                                      option.value !== '',
                                  ),
                                ]}
                                minDropdownHeight={240}
                                className="h-full !rounded-[6px] w-full flex-grow"
                                valueClassName="!border-[#77858F]"
                                labelClass="w-[360px]"
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
                                hierarchyDetail.statisticCategories
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
              </tr>
            );
          })}
          <tr>
            <td className="p-3 w-1/2 border-[1px] border-[#D2DBE1]">
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
            <td className="w-1/2 border-[1px] border-[#D2DBE1]"></td>
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

            const { oldLargeOption, oldMediumOption, newValue, type } =
              pendingSelection;
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
