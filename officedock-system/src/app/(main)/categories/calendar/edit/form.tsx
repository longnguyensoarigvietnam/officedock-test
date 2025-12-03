import { Dispatch, SetStateAction, useEffect, useState } from 'react';
import { v4 as uuidv4, validate as isUUID } from 'uuid';
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';

import { CircleColorPicker } from '@components/common/CircleColorPicker';
import TableDropdown from '@components/common/Dropdown/TableDropdown';
import ImageRound from '@components/common/ImageRound';
import { Table } from '@components/common/Table';
import WarningChangeHierarchyCategoryModal from '@components/modals/WarningChangeHierarchyCategoryModal';
import WarningDeleteHierarchyCategoryModal from '@components/modals/WarningDeleteHierarchyCategoryModal';
import ConfirmArchiveModal from '@components/modals/ConfirmArchiveModal';
import { OptionsBoxToAddCategory } from '@components/category/OptionsBoxToAddCategory';

import { HIERARCHY_COLOR_LIST, NO_OPTION_CATEGORY } from '@constants';
import {
  AddCategoryHierarchyType,
  HierarchyType,
  StatisticCategoryType,
} from '@constants/enums';

import { OptionDropdownType } from '@interfaces/common';
import {
  CalendarCategoryRow,
  SelectedCalendarCategoryRow,
} from '@interfaces/hierarchy';

import { buildCategory, getCalendarCategoryRestoreType } from '@utils';

import useCalendarCategory from '@hooks/useCalendarCategory';

interface HierarchyDetail {
  id: number | string;
  name: string;
  statisticCategories: CalendarCategoryRow[];
}

type CheckCalendarCategoryRowArgs = {
  originalRow: CalendarCategoryRow;
  type?: HierarchyType; // optional: HierarchyType.LARGE | MEDIUM
};

const TableComponent = ({
  hierarchyDetail,
  categoryList,
  isHiddenList,
  setIsTyping,
  setHierarchyDetail,
  setSelectedHierarchiesToUpdate,
}: {
  hierarchyDetail: HierarchyDetail;
  categoryList: OptionDropdownType[];
  isHiddenList: boolean;
  setIsTyping: Dispatch<SetStateAction<boolean>>;
  setHierarchyDetail: Dispatch<SetStateAction<HierarchyDetail>>;
  setSelectedHierarchiesToUpdate: Dispatch<
    SetStateAction<SelectedCalendarCategoryRow[]>
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
    originalRow?: CalendarCategoryRow;
    newValue: OptionDropdownType;
    type: string;
  } | null>(null);

  const [pendingArchiveCategory, setPendingArchiveCategory] = useState<{
    originalRow?: CalendarCategoryRow;
    type: string;
  } | null>(null);
  const [openConfirmArchiveModal, setOpenConfirmArchiveModal] =
    useState<boolean>(false);

  const [pendingRestoreCategory, setPendingRestoreCategory] = useState<{
    originalRow?: CalendarCategoryRow;
    type: string;
  } | null>(null);
  const [openConfirmRestoreModal, setOpenConfirmRestoreModal] = useState<{
    status: boolean;
    name: string | null;
  }>({
    status: false,
    name: null,
  });

  const {
    sameLarge,
    sameMedium,
    findLastUniqueMediumIndexes,
    findAffectedRows,
    getDeletedCalendarCategoryTypeFromRow,
    checkIsHiddenCategory
  } = useCalendarCategory({ hierarchyDetail });

  useEffect(() => {
    if (categoryList) {
      const categoryOptions = categoryList.filter(
        (category) =>
          category.teamId == null || category.teamId == hierarchyDetail.id,
      );
      setCategoryDropdownOptions(categoryOptions);
    }
  }, [categoryList, hierarchyDetail.id]);

  const lastMediumIndexes = findLastUniqueMediumIndexes(
    hierarchyDetail.statisticCategories,
  );

  const uniqueLargeCount = new Set(
    hierarchyDetail.statisticCategories
      .filter(
        (hierarchy) =>
          hierarchy.large.showBy &&
          !checkIsHiddenCategory({
            type: HierarchyType.LARGE,
            originalRow: hierarchy,
          }),
      )
      .map((item) => item.large.value),
  ).size;
  const uniqueMediumCount = new Set(
    hierarchyDetail.statisticCategories
      .filter(
        (hierarchy) =>
          hierarchy.medium.showBy &&
          !checkIsHiddenCategory({
            type: HierarchyType.MEDIUM,
            originalRow: hierarchy,
          }),
      )
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
          deletedType:
            variables.rowInfo &&
            getDeletedCalendarCategoryTypeFromRow(variables.rowInfo),
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
          deletedType:
            variables.rowInfo &&
            getDeletedCalendarCategoryTypeFromRow(variables.rowInfo),
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
          deletedType:
            variables.rowInfo &&
            getDeletedCalendarCategoryTypeFromRow(variables.rowInfo),
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
    originalRow: CalendarCategoryRow | undefined,
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
        .filter((item) => item.large.value === originalRow?.large.value)
        .map((item) => ({
          ...item,
          large: newLarge,
        }));
      let updatedHierarchies = [];

      if (matchedRows.length) {
        updatedHierarchies = matchedRows.map((row) => {
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
            deletedType: row && getDeletedCalendarCategoryTypeFromRow(row),
          };
        });
      } else {
        updatedHierarchies = [
          {
            organizationStatisticCategoryId: originalRow?.id,
            largeStatisticCategory:
              newLarge.label == '' || isUUID(newLarge.label as string)
                ? null
                : {
                    name: newLarge.label as string,
                    uuid: newLarge.value as string,
                  },
            mediumStatisticCategory:
              originalRow?.medium.label == '' ||
              isUUID(originalRow?.medium.label as string)
                ? null
                : {
                    name: originalRow?.medium.label as string,
                    uuid: originalRow?.medium.value as string,
                  },
            color: originalRow?.color,
            deletedType:
              originalRow && getDeletedCalendarCategoryTypeFromRow(originalRow),
          },
        ];
      }

      updatedHierarchies.forEach((updatedHierarchy) => {
        const key = `${
          updatedHierarchy.largeStatisticCategory?.uuid || ''
        }|${updatedHierarchy.mediumStatisticCategory?.uuid || ''}`;

        const index = updatedHierarchiesToUpdate.findIndex(
          (item) =>
            item.organizationStatisticCategoryId ===
              updatedHierarchy.organizationStatisticCategoryId ||
            `${
              item.largeStatisticCategory?.uuid || ''
            }|${item.mediumStatisticCategory?.uuid || ''}` === key,
        );

        if (index !== -1) {
          // replace the old one
          updatedHierarchiesToUpdate[index] = {
            ...updatedHierarchy,
            organizationStatisticCategoryId:
              updatedHierarchy.organizationStatisticCategoryId!,
            color: updatedHierarchy.color!,
          };
        } else {
          // add new
          updatedHierarchiesToUpdate.push({
            ...updatedHierarchy,
            organizationStatisticCategoryId:
              updatedHierarchy.organizationStatisticCategoryId!,
            color: updatedHierarchy.color!,
          });
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
        .filter((item) => item.large.value === originalRow?.large.value)
        .map((item) => ({
          ...item,
          large: newLarge,
        }));

      const remainingRows = statisticCategories.filter(
        (item) => item.large.value !== originalRow?.large.value,
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
          (item) => item.large.value === originalRow?.large.value,
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
          const key = `${item.large.value}|${item.medium.value}`;
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
    originalRow: CalendarCategoryRow | undefined,
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
            item.medium.value === originalRow?.medium.value &&
            item.large.value === originalRow?.large.value,
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
          deletedType: row && getDeletedCalendarCategoryTypeFromRow(row),
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
            item.medium.value == originalRow?.medium.value &&
            item.large.value == originalRow?.large.value,
        )
        .map((item) => ({
          ...item,
          medium: newMedium,
        }));

      const remainingRows = statisticCategories.filter(
        (item) =>
          !(
            item.medium.value == originalRow?.medium.value &&
            item.large.value == originalRow?.large.value
          ),
      );

      // Find the last index where newMedium.value already exists
      let lastIndex = -1;
      remainingRows.forEach((item, index) => {
        if (
          item.large.value == originalRow?.large.value &&
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
            item.medium.value == originalRow?.medium.value &&
            item.large.value == originalRow?.large.value,
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
          const key = `${item.large.value}|${item.medium.value}`;
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

  const checkHasHiddenCategoryInARow = ({
    originalRow,
    type,
  }: CheckCalendarCategoryRowArgs) => {
    let matchingRows: CalendarCategoryRow[] = [];
    switch (type) {
      case HierarchyType.LARGE: {
        matchingRows = hierarchyDetail.statisticCategories.filter(
          (row) => row.large.value === originalRow.large.value,
        );
        break;
      }
      case HierarchyType.MEDIUM: {
        matchingRows = hierarchyDetail.statisticCategories.filter(
          (row) =>
            row.large.value === originalRow.large.value &&
            row.medium.value === originalRow.medium.value,
        );
        break;
      }
    }
    return matchingRows.some(
      (row) => row.large.isHidden || row.medium.isHidden,
    );
  };

  const handleRestoreHierarchyCategory = (
    originalRow: CalendarCategoryRow,
    type: StatisticCategoryType,
  ) => {
    const affectedRows = findAffectedRows(
      hierarchyDetail.statisticCategories,
      originalRow,
      type,
    );

    setSelectedHierarchiesToUpdate((prev) => {
      let next = prev.map((item) => ({ ...item })); // deep clone level-1

      affectedRows.forEach((row) => {
        const deletedType = getCalendarCategoryRestoreType({
          row,
          originalRow,
          type,
        });
        const existingIndex = next.findIndex(
          (i) => i.organizationStatisticCategoryId === row.id,
        );

        if (existingIndex !== -1) {
          // produce a new array replacing the item
          next = next.map((i, idx) =>
            idx === existingIndex ? { ...i, deletedType } : i,
          );
        } else {
          // append new item immutably
          next = [
            ...next,
            {
              organizationStatisticCategoryId: row.id,
              largeStatisticCategory: buildCategory(
                row.large as { label: string; value: string },
              ),
              mediumStatisticCategory: buildCategory(
                row.medium as { label: string; value: string },
              ),
              color: row.color!,
              deletedType,
            },
          ];
        }
      });

      return next;
    });

    switch (type) {
      case StatisticCategoryType.LARGE:
        setHierarchyDetail((prev) => {
          return {
            ...prev,
            statisticCategories: prev.statisticCategories.map((row) => {
              const sameLarge = row.large.value === originalRow.large.value;

              return {
                ...row,

                // Requirement: same large → unhide large
                large: sameLarge
                  ? { ...row.large, isHidden: false }
                  : row.large,
              };
            }),
          };
        });
        break;
      case StatisticCategoryType.MEDIUM:
        setHierarchyDetail((prev) => {
          return {
            ...prev,
            statisticCategories: prev.statisticCategories.map((row) => {
              const sameLarge = row.large.value === originalRow.large.value;
              const sameMedium =
                row.large.value === originalRow.large.value &&
                row.medium.value === originalRow.medium.value;

              return {
                ...row,

                // Requirement #1: same large → unhide large
                large: sameLarge
                  ? { ...row.large, isHidden: false }
                  : row.large,

                // Requirement #2: same large+medium → unhide medium
                medium:
                  sameLarge && sameMedium
                    ? { ...row.medium, isHidden: false }
                    : row.medium,
              };
            }),
          };
        });
        break;
    }
  };

  const updateHierarchyPayloadWhenArchive = ({
    originalRow,
    type,
  }: {
    originalRow: CalendarCategoryRow;
    type: StatisticCategoryType;
  }) => {
    const matchingRowIds = hierarchyDetail.statisticCategories
      .filter((row) => {
        switch (type) {
          case StatisticCategoryType.LARGE:
            return sameLarge(row, originalRow);
          case StatisticCategoryType.MEDIUM:
            return sameMedium(row, originalRow);
        }
      })
      .map((row) => row.id);

    setSelectedHierarchiesToUpdate((prev) => {
      const prevSelectedHierarchies = [...prev];

      matchingRowIds.forEach((rowId) => {
        const existingHierarchyIndex = prevSelectedHierarchies.findIndex(
          (item) => item.organizationStatisticCategoryId == rowId,
        );

        if (existingHierarchyIndex != -1) {
          prevSelectedHierarchies[existingHierarchyIndex] = {
            ...prevSelectedHierarchies[existingHierarchyIndex],
            deletedType: type,
          };
        } else {
          const existingHierarchy = hierarchyDetail.statisticCategories.find(
            (item) => item.id == rowId,
          );

          const newEntry = {
            organizationStatisticCategoryId: rowId!,
            organizationId: hierarchyDetail.id as number,
            largeStatisticCategory: buildCategory(
              existingHierarchy!.large as { label: string; value: string },
            ),
            mediumStatisticCategory: buildCategory(
              existingHierarchy!.medium as { label: string; value: string },
            ),
            color: existingHierarchy?.color || '',
            deletedType: type,
          };

          prevSelectedHierarchies.push(newEntry);
        }
      });
      return prevSelectedHierarchies;
    });
  };

  const handleArchiveLargeHierarchyCategory = (
    originalRow: CalendarCategoryRow,
  ) => {
    updateHierarchyPayloadWhenArchive({
      originalRow,
      type: StatisticCategoryType.LARGE,
    });
    setHierarchyDetail((prev) => {
      return {
        ...prev,
        statisticCategories: prev.statisticCategories.map((row) => {
          if (row.large.value != originalRow.large.value) return row;
          return {
            ...row,
            large: {
              ...row.large,
              isHidden: true,
            },
            medium: {
              ...row.medium,
              isHidden: true,
            },
          };
        }),
      };
    });
  };

  const handleArchiveMediumHierarchyCategory = (
    originalRow: CalendarCategoryRow,
  ) => {
    updateHierarchyPayloadWhenArchive({
      originalRow,
      type: StatisticCategoryType.MEDIUM,
    });
    setHierarchyDetail((prev) => {
      return {
        ...prev,
        statisticCategories: prev.statisticCategories.map((row) => {
          if (
            !(
              row.large.value == originalRow.large.value &&
              row.medium.value == originalRow.medium.value
            )
          )
            return row;
          return {
            ...row,
            large: {
              ...row.large,
            },
            medium: {
              ...row.medium,
              isHidden: true,
            },
          };
        }),
      };
    });
  };

  const getHiddenLargeCategoryList = () => {
    return hierarchyDetail.statisticCategories
      .filter((row) => row.large.isHidden)
      .map((row) => row.large.value);
  };

  const getDisabledLargeCategoryList = () => {
    return hierarchyDetail.statisticCategories
      .filter((row) =>
        checkHasHiddenCategoryInARow({
          originalRow: row,
          type: HierarchyType.LARGE,
        }),
      )
      .map((row) => row.large.value);
  };

  const getAllMediumsForLarge = (largeValue: string) => {
    const mediumList = hierarchyDetail.statisticCategories
      .filter((row) => row.large.value == largeValue)
      .map((row) => row.medium.value);
    return mediumList;
  };

  const getHiddenMediumsForLarge = (largeValue: string) => {
    return hierarchyDetail.statisticCategories
      .filter((row) => row.large.value == largeValue && row.medium.isHidden)
      .map((row) => row.medium.value);
  };

  const getLargeDropdownOptions = (
    row: CalendarCategoryRow,
    categoryDropdownOptions: OptionDropdownType[],
  ) => {
    const largeValue = row.large.value as string;

    const hiddenLarges = getHiddenLargeCategoryList();
    const disabledLarges = getDisabledLargeCategoryList();
    const mediumsForLarge = getAllMediumsForLarge(largeValue);

    return categoryDropdownOptions.filter((option) => {
      return (
        option.value !== '' &&
        !mediumsForLarge.includes(option.value) &&
        !hiddenLarges.includes(option.value) &&
        !disabledLarges.includes(option.value)
      );
    });
  };

  const getMediumDropdownOptions = (
    row: CalendarCategoryRow,
    categoryDropdownOptions: OptionDropdownType[],
    excludedMediums: (string | number)[],
  ) => {
    const largeValue = row.large.value as string;

    const hiddenMediumsForLarge = getHiddenMediumsForLarge(largeValue);

    return categoryDropdownOptions.filter((option) => {
      return (
        option.value !== largeValue &&
        option.value !== '' &&
        !excludedMediums.includes(option.value) &&
        !hiddenMediumsForLarge.includes(option.value)
      );
    });
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
              {headerGroup.headers.map((header, index) => (
                <th
                  key={header.id}
                  className={`text-[#77858F] bg-[#F8FAFC] ${headerGroup.headers.length - 1 != index && 'border-r-[1px] border-[#D2DBE1]'} w-1/2 font-medium text-xs py-3`}>
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
            const isHiddenLargeCategory = checkIsHiddenCategory({
              type: HierarchyType.LARGE,
              originalRow: row.original,
            });
            const isHiddenMediumCategory = checkIsHiddenCategory({
              type: HierarchyType.MEDIUM,
              originalRow: row.original,
            });
            const shouldMediumCategoryDisabled = checkHasHiddenCategoryInARow({
              originalRow: row.original,
              type: HierarchyType.MEDIUM,
            });
            return (
              <tr
                key={row.id}
                style={{
                  height:
                    isHiddenLargeCategory && !isHiddenList ? '0px' : '1px',
                }}>
                {largeRowspan[rowIndex] > 0 && (
                  <td
                    className={`border-b-[1px] border-r-[1px] !w-1/4 border-[#D2DBE1] h-full !p-0 ${isHiddenLargeCategory && !isHiddenList && '!border-b-0'}`}
                    style={{
                      height:
                        isHiddenLargeCategory && !isHiddenList
                          ? '0px'
                          : 'inherit',
                    }}
                    rowSpan={largeRowspan[rowIndex]}>
                    <div
                      className={`p-[14px] pl-[18px] h-full flex items-center gap-[14px] ${isHiddenLargeCategory && !isHiddenList && 'hidden'}`}>
                      <div className="relative">
                        <div
                          className={`w-[14px] h-[14px] rounded-full hover:cursor-pointer ${isHiddenLargeCategory && !isHiddenList && 'hidden'}`}
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
                                        deletedType:
                                          row &&
                                          getDeletedCalendarCategoryTypeFromRow(
                                            row,
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
                      {isHiddenLargeCategory ? (
                        !isHiddenList ? (
                          <div className="hidden w-full"></div>
                        ) : (
                          <p className="text-sm ml-[-6px] flex-1 break-all font-medium text-black opacity-30">
                            {row.original.large.label &&
                            !isUUID(row.original.large.label)
                              ? row.original.large.label
                              : NO_OPTION_CATEGORY}
                          </p>
                        )
                      ) : row.original.large.showBy ==
                        AddCategoryHierarchyType.INPUT ? (
                        <div className="flex flex-col !h-full w-[calc(100%_-_58px)]">
                          <div className="!h-full">
                            <input
                              key={JSON.stringify(row.original.large)}
                              type="text"
                              className={`w-full !h-full text-sm !min-h-[34px] px-[10px] py-[6px] text-black rounded-[6px] ${
                                row.original.large.isHidden &&
                                isHiddenList &&
                                'opacity-50'
                              }`}
                              placeholder="新しいカテゴリーを入力"
                              defaultValue={
                                !isUUID(row.original.large.label)
                                  ? row.original.large.label
                                  : ''
                              }
                              disabled={
                                row.original.large.isHidden && isHiddenList
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
                          <div className="h-full w-[calc(100%_-_58px)]">
                            <TableDropdown
                              key={JSON.stringify(row.original.large)}
                              options={getLargeDropdownOptions(
                                row.original,
                                categoryDropdownOptions,
                              )}
                              minDropdownHeight={240}
                              className={`h-full w-full flex-grow`}
                              valueClassName="!border-[#77858F] !rounded-[6px] !py-1 !pl-[10px]"
                              labelOptionClass="!text-sm"
                              labelClass="w-[360px] !text-sm"
                              selectedOption={categoryDropdownOptions.find(
                                (element) =>
                                  element.value === row.original.large.value,
                              )}
                              disabled={
                                row.original.large.isHidden && isHiddenList
                              }
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
                                    originalRow: row.original,
                                    newValue: e,
                                    type: StatisticCategoryType.LARGE,
                                  });
                                } else {
                                  handleChangeLargeCategoryByPulldown(
                                    row.original,
                                    e,
                                  );
                                }
                              }}
                            />
                          </div>
                        )
                      )}

                      <ImageRound
                        name="Hide"
                        src={`/icons/${
                          isHiddenLargeCategory
                            ? 'dark-close-eye'
                            : 'gray-open-eye'
                        }.svg`}
                        className={`w-[16px] h-[13px] ${isHiddenLargeCategory && !isHiddenList && 'hidden'} ${isUUID(row.original.large.label) ? 'hover:cursor-not-allowed' : 'hover:cursor-pointer'}`}
                        onClick={() => {
                          if (isUUID(row.original.large.label)) return;
                          if (isHiddenLargeCategory) {
                            setPendingRestoreCategory({
                              originalRow: row.original,
                              type: StatisticCategoryType.LARGE,
                            });
                            setOpenConfirmRestoreModal({
                              name: row.original.large.label,
                              status: true,
                            });
                          } else {
                            setPendingArchiveCategory({
                              originalRow: row.original,
                              type: StatisticCategoryType.LARGE,
                            });
                            setOpenConfirmArchiveModal(true);
                          }
                        }}
                      />
                    </div>
                  </td>
                )}
                {mediumRowspan[rowIndex] > 0 && (
                  <td
                    className={`${lastMediumIndexes.includes(rowIndex) && 'border-b-[1px]'} border-l-[1px] border-[#D2DBE1] w-1/2 !py-0 ${isHiddenLargeCategory && !isHiddenList && '!border-b-0'}`}
                    style={{
                      height:
                        isHiddenLargeCategory && !isHiddenList
                          ? '0px'
                          : 'inherit',
                    }}
                    rowSpan={mediumRowspan[rowIndex]}>
                    <div
                      className={`mx-[14px] pt-[14px] ${(isHiddenMediumCategory || shouldMediumCategoryDisabled) && 'pb-[14px]'} ${isHiddenMediumCategory && !lastMediumIndexes.includes(rowIndex) && isHiddenList && 'border-b-[1px] border-[#D2DBE1]'}
                      flex flex-col !h-[100%] ${isHiddenMediumCategory && !isHiddenList && '!p-0'} ${isHiddenLargeCategory && !isHiddenList && 'hidden'}`}>
                      <div
                        className={`flex items-center ${lastMediumIndexes.includes(rowIndex) ? '' : ''} !h-full gap-[14px] `}>
                        {isHiddenMediumCategory ? (
                          !isHiddenList ? (
                            <>
                              <div className="hidden w-full"></div>
                            </>
                          ) : (
                            <p className="text-sm flex-1 break-all font-medium text-black opacity-30">
                              {row.original.medium.label &&
                              !isUUID(row.original.medium.label)
                                ? row.original.medium.label
                                : NO_OPTION_CATEGORY}
                            </p>
                          )
                        ) : row.original.medium.showBy ==
                          AddCategoryHierarchyType.INPUT ? (
                          <div className="flex flex-col !h-full w-[calc(100%_-_30px)]">
                            <div className="!h-full w-full">
                              <input
                                key={JSON.stringify(row.original.medium)}
                                type="text"
                                className={`w-full !h-full text-sm !min-h-[34px] px-[10px] py-[6px] text-black rounded-[6px] ${
                                  row.original.medium.isHidden &&
                                  isHiddenList &&
                                  'opacity-50'
                                }`}
                                placeholder="新しいカテゴリーを入力"
                                defaultValue={
                                  !isUUID(row.original.medium.label)
                                    ? row.original.medium.label
                                    : ''
                                }
                                disabled={
                                  row.original.medium.isHidden && isHiddenList
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
                            <div className={` w-[calc(100%_-_30px)] h-full`}>
                              <TableDropdown
                                key={JSON.stringify(row.original.medium)}
                                options={getMediumDropdownOptions(
                                  row.original,
                                  categoryDropdownOptions,
                                  excludedMediums,
                                )}
                                minDropdownHeight={240}
                                className="h-full w-full flex-grow"
                                labelOptionClass="!text-sm"
                                valueClassName="!border-[#77858F] !rounded-[6px] !py-1 !pl-[10px]"
                                labelClass="w-[360px] !text-sm"
                                selectedOption={categoryDropdownOptions.find(
                                  (element) =>
                                    element.value === row.original.medium.value,
                                )}
                                disabled={
                                  row.original.medium.isHidden && isHiddenList
                                }
                                onPendingChange={(e) => {
                                  const oldMediumOption = row.original.medium;
                                  if (e.value == oldMediumOption.value) return;
                                  if (
                                    row.original.medium.label &&
                                    !isUUID(row.original.medium.label) &&
                                    !isUUID(row.original.id as string)
                                  ) {
                                    setWarningChangeCategoryModalOpen(true);
                                    setPendingSelection({
                                      originalRow: row.original,
                                      newValue: e,
                                      type: StatisticCategoryType.MEDIUM,
                                    });
                                  } else {
                                    handleChangeMediumCategoryByPulldown(
                                      row.original,
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
                            name="Hide"
                            src={`/icons/${row.original.medium.isHidden ? 'dark-close-eye' : 'gray-open-eye'}.svg`}
                            className={`w-[16px] h-[13px] ${isHiddenMediumCategory && !isHiddenList && 'hidden'}
                              ${isUUID(row.original.medium.label) ? 'hover:cursor-not-allowed' : 'hover:cursor-pointer'}`}
                            onClick={() => {
                              if (
                                isUUID(row.original.medium.label) &&
                                !isHiddenList
                              )
                                return;
                              if (row.original.medium.isHidden) {
                                setPendingRestoreCategory({
                                  originalRow: row.original,
                                  type: StatisticCategoryType.MEDIUM,
                                });
                                setOpenConfirmRestoreModal({
                                  name: row.original.medium.label,
                                  status: true,
                                });
                              } else {
                                setPendingArchiveCategory({
                                  originalRow: row.original,
                                  type: StatisticCategoryType.MEDIUM,
                                });
                                setOpenConfirmArchiveModal(true);
                              }
                            }}
                          />
                        )}
                      </div>

                      {lastMediumIndexes.includes(rowIndex) &&
                        !isHiddenLargeCategory && (
                          <>
                            <OptionsBoxToAddCategory
                              text={'中カテゴリーを追加'}
                              customClassName={`pt-[10px] pb-[14px]`}
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
            <td className="p-3 w-1/2 border-r-[1px] border-[#D2DBE1]">
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
            <td className="w-1/2"></td>
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

      {openConfirmArchiveModal && (
        <ConfirmArchiveModal
          open={openConfirmArchiveModal}
          name="業務カテゴリー"
          question="このカテゴリーを非表示にしますか？"
          message="配下のカテゴリーがある場合、すべて見えなくなります。あとで復元することも可能です。"
          onConfirm={() => {
            if (!pendingArchiveCategory) return;

            const { originalRow, type } = pendingArchiveCategory;
            switch (type) {
              case StatisticCategoryType.LARGE:
                handleArchiveLargeHierarchyCategory(originalRow!);
                break;
              case StatisticCategoryType.MEDIUM:
                handleArchiveMediumHierarchyCategory(originalRow!);
                break;
            }

            setOpenConfirmArchiveModal(false);
            setPendingArchiveCategory(null);
          }}
          onClose={() => {
            setOpenConfirmArchiveModal(false);
            setPendingArchiveCategory(null);
          }}
        />
      )}

      {openConfirmRestoreModal.status ? (
        <ConfirmArchiveModal
          open={openConfirmRestoreModal.status}
          name={openConfirmRestoreModal.name || NO_OPTION_CATEGORY}
          question="この業務カテゴリーを復元しますか？"
          onConfirm={() => {
            if (!pendingRestoreCategory) return;

            const { originalRow, type } = pendingRestoreCategory;
            switch (type) {
              case StatisticCategoryType.LARGE:
                handleRestoreHierarchyCategory(
                  originalRow!,
                  StatisticCategoryType.LARGE,
                );
                break;
              case StatisticCategoryType.MEDIUM:
                handleRestoreHierarchyCategory(
                  originalRow!,
                  StatisticCategoryType.MEDIUM,
                );
                break;
            }

            setOpenConfirmRestoreModal({
              name: null,
              status: false,
            });
            setPendingRestoreCategory(null);
          }}
          onClose={() => {
            setOpenConfirmRestoreModal({
              name: null,
              status: false,
            });
            setPendingRestoreCategory(null);
          }}
        />
      ) : (
        <></>
      )}

      {warningChangeCategoryModalOpen && (
        <WarningChangeHierarchyCategoryModal
          open={warningChangeCategoryModalOpen}
          onConfirm={() => {
            if (!pendingSelection) return;

            const { originalRow, newValue, type } = pendingSelection;
            switch (type) {
              case StatisticCategoryType.LARGE:
                handleChangeLargeCategoryByPulldown(originalRow, newValue);
                break;
              case StatisticCategoryType.MEDIUM:
                handleChangeMediumCategoryByPulldown(originalRow, newValue);
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
