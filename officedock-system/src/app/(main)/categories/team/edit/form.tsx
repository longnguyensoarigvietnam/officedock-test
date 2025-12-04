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
import MultiSectionBox from '@components/common/MultiSectionBox';
import { OptionsBoxToAddCategory } from '@components/category/OptionsBoxToAddCategory';
import ConfirmArchiveModal from '@components/modals/ConfirmArchiveModal';

import { HIERARCHY_COLOR_LIST, NO_OPTION_CATEGORY } from '@constants';
import {
  AddCategoryHierarchyType,
  HierarchyType,
  StatisticCategoryType,
} from '@constants/enums';

import { OptionDropdownType } from '@interfaces/common';
import {
  OrganizationCategoryRow,
  SelectedOrganizationCategoryRow,
} from '@interfaces/hierarchy';

import { buildCategory, getDeletedTypeFromRow, getRestoreType } from '@utils';

import useTeamCategory from '@hooks/useTeamCategory';

interface HierarchyDetail {
  id: number | string;
  name: string;
  statisticCategories: OrganizationCategoryRow[];
}

const TableComponent = ({
  hierarchyList,
  categoryList,
  organizationName,
  dataOptionsSkill,
  isHiddenList,
  setIsTyping,
  setHierarchyList,
  setSelectedHierarchiesToUpdate,
}: {
  hierarchyList: HierarchyDetail;
  categoryList: OptionDropdownType[];
  organizationName: string;
  dataOptionsSkill: {
    value: number;
    label: string;
  }[];
  isHiddenList: boolean;
  setIsTyping: Dispatch<SetStateAction<boolean>>;
  setHierarchyList: Dispatch<SetStateAction<HierarchyDetail[]>>;
  setSelectedHierarchiesToUpdate: Dispatch<
    SetStateAction<SelectedOrganizationCategoryRow[]>
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
  const [categoryDropdownOptions, setCategoryDropdownOptions] = useState<
    OptionDropdownType[]
  >([]);
  const [pendingSelection, setPendingSelection] = useState<{
    originalRow?: OrganizationCategoryRow;
    newValue: OptionDropdownType;
    type: string;
  } | null>(null);

  const [pendingArchiveCategory, setPendingArchiveCategory] = useState<{
    originalRow?: OrganizationCategoryRow;
    type: string;
  } | null>(null);
  const [openConfirmArchiveModal, setOpenConfirmArchiveModal] =
    useState<boolean>(false);

  const [pendingRestoreCategory, setPendingRestoreCategory] = useState<{
    originalRow?: OrganizationCategoryRow;
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
    checkIsHiddenCategory,
    checkHasHiddenCategoryInARow,
    sameLarge,
    sameMedium,
    sameSmall,
    findLastUniqueMediumIndexes,
    findLastSmallInEachLarge,
    findLastUniqueSmallIndexes,
  } = useTeamCategory({ hierarchyList });

  useEffect(() => {
    if (categoryList) {
      const categoryOptions = categoryList.filter(
        (category) => category.teamId == null,
      );
      setCategoryDropdownOptions(categoryOptions);
    }
  }, [categoryList, hierarchyList.id]);

  const lastMediumIndexes = findLastUniqueMediumIndexes(
    hierarchyList.statisticCategories,
  );

  const lastSmallIndexesInDisplayedList = findLastUniqueSmallIndexes(
    hierarchyList.statisticCategories,
    true,
  );

  const lastSmallIndexes = findLastUniqueSmallIndexes(
    hierarchyList.statisticCategories,
  );

  const lastSmallIndexesInEachLarge = findLastSmallInEachLarge(
    hierarchyList.statisticCategories,
  );

  const uniqueLargeCount = new Set(
    hierarchyList.statisticCategories
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
    hierarchyList.statisticCategories
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
  const uniqueSmallCount = hierarchyList.statisticCategories.filter(
    (hierarchy) =>
      hierarchy.small.showBy &&
      !checkIsHiddenCategory({
        type: HierarchyType.SMALL,
        originalRow: hierarchy,
      }),
  ).length;

  const columns = [
    {
      accessorKey: HierarchyType.LARGE,
      header: () => (
        <div className="flex justify-between pl-[18px] pr-[14px]">
          <p>大カテゴリー</p>
          <p>{uniqueLargeCount}</p>
        </div>
      ),
    },
    {
      accessorKey: HierarchyType.MEDIUM,
      header: () => (
        <div className="flex justify-between px-[14px]">
          <p>中カテゴリー</p>
          <p>{uniqueMediumCount}</p>
        </div>
      ),
    },
    {
      accessorKey: HierarchyType.SMALL,
      header: () => (
        <div className="flex justify-between px-[14px]">
          <p>小カテゴリー</p>
          <p>{uniqueSmallCount}</p>
        </div>
      ),
    },
    {
      accessorKey: 'skills',
      header: () => (
        <p className="font-medium text-xs text-[#77858F] text-left px-[14px]">
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
    data: OrganizationCategoryRow[],
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

  const insertOrReplaceSmallCategory = (
    prev: HierarchyDetail[],
    targetOrgId: string,
    rowInfo: OrganizationCategoryRow,
    newRow: OrganizationCategoryRow,
  ) => {
    return prev.map((org) => {
      if (org.id !== targetOrgId) return org;

      const updatedCategories = [...org.statisticCategories];

      // Find all indexes with the same `large` & `medium`
      const sameGroupIndexes = updatedCategories
        .map((item, index) =>
          item.large.value === rowInfo.large.value &&
          item.medium.value === rowInfo.medium.value
            ? index
            : -1,
        )
        .filter((index) => index !== -1); // Remove -1 values

      // Check for empty `small` slot
      const emptySmallIndex = sameGroupIndexes.find((index) => {
        const small = updatedCategories[index].small;

        return isUUID(small?.label); // is empty (UUID)
      });

      if (emptySmallIndex !== undefined) {
        // Replace the empty row with the new row instead of adding a new one
        updatedCategories[emptySmallIndex] = {
          ...newRow,
          id: updatedCategories[emptySmallIndex].id, // keep original ID
        };
      } else {
        // Otherwise, add the new row after the last occurrence
        const lastIndex = sameGroupIndexes.at(-1);
        if (lastIndex !== undefined) {
          updatedCategories.splice(lastIndex + 1, 0, newRow);
        } else {
          updatedCategories.push(newRow);
        }
      }

      return {
        ...org,
        statisticCategories: updatedCategories,
      };
    });
  };

  const handleAddSmallCategory = (
    option: string,
    rowInfo: OrganizationCategoryRow,
  ) => {
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

    setHierarchyList((prev) =>
      insertOrReplaceSmallCategory(
        prev,
        hierarchyList.id as string,
        rowInfo,
        newRow,
      ),
    );
  };

  const insertOrReplaceMediumCategory = (
    prev: HierarchyDetail[],
    targetOrgId: string,
    rowInfo: OrganizationCategoryRow,
    newRow: OrganizationCategoryRow,
  ) => {
    return prev.map((org) => {
      if (org.id !== targetOrgId) return org;

      const updatedCategories = [...org.statisticCategories];

      const sameGroupIndexes = updatedCategories
        .map((item, index) =>
          item.large.value === rowInfo.large.value ? index : -1,
        )
        .filter((index) => index !== -1); // Remove -1 values

      // Find if there is already an empty `medium` row
      const emptyMediumIndex = sameGroupIndexes.find((index) => {
        const medium = updatedCategories[index].medium;

        return isUUID(medium?.label);
      });

      if (emptyMediumIndex !== undefined) {
        // Replace the empty row with the new row instead of adding a new one
        updatedCategories[emptyMediumIndex] = {
          ...newRow,
          id: updatedCategories[emptyMediumIndex].id, // keep original ID
        };
      } else {
        // Otherwise, add the new row after the last occurrence
        const lastIndex = sameGroupIndexes.at(-1);
        if (lastIndex !== undefined) {
          updatedCategories.splice(lastIndex + 1, 0, newRow);
        } else {
          updatedCategories.push(newRow);
        }
      }

      return {
        ...org,
        statisticCategories: updatedCategories,
      };
    });
  };

  const handleAddMediumCategory = (
    option: string,
    rowInfo: OrganizationCategoryRow,
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
      small: {
        label: newUuid,
        value: newUuid,
        showBy: '',
      },
      skills: rowInfo.skills,
    };
    setHierarchyList((prev) =>
      insertOrReplaceMediumCategory(
        prev,
        hierarchyList.id as string,
        rowInfo,
        newRow,
      ),
    );
  };

  const insertLargeCategory = (
    prev: HierarchyDetail[],
    targetId: string,
    newRow: OrganizationCategoryRow,
  ) => {
    return prev.map((org) => {
      if (org.id !== targetId) return org;

      return {
        ...org,
        statisticCategories: [...org.statisticCategories, newRow],
      };
    });
  };

  const handleAddLargeCategory = (option: string) => {
    const newUuid = uuidv4();
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
    setHierarchyList((prev) =>
      insertLargeCategory(prev, hierarchyList.id as string, newRow),
    );
  };

  const updateHierarchyCategoryByInput = (
    list: (typeof hierarchyList)[], // type of your hierarchy list
    variables: {
      name: string;
      uuid: string;
      type: string;
      rowInfo: OrganizationCategoryRow;
    },
  ) => {
    return list.map((org) => {
      if (org.id !== hierarchyList.id) return org;

      const updatedCategories = org.statisticCategories.map((hierarchy) => {
        if (!variables.rowInfo || hierarchy.id !== variables.rowInfo.id)
          return hierarchy;

        const newCategory = {
          label: variables.name || variables.uuid,
          value: variables.uuid,
          showBy: AddCategoryHierarchyType.INPUT,
        };

        if (variables.type === HierarchyType.LARGE) {
          return { ...hierarchy, large: newCategory };
        } else if (variables.type === HierarchyType.MEDIUM) {
          if (hierarchy.large.value === variables.rowInfo.large.value) {
            return { ...hierarchy, medium: newCategory };
          }
        } else {
          if (
            hierarchy.large.value === variables.rowInfo.large.value &&
            hierarchy.medium.value === variables.rowInfo.medium.value
          ) {
            return { ...hierarchy, small: newCategory };
          }
        }

        return hierarchy;
      });

      return { ...org, statisticCategories: updatedCategories };
    });
  };

  // Set category when onBlur triggers
  const handleChangeCategoryByInput = (variables: {
    name: string;
    uuid: string;
    type: string;
    rowInfo: OrganizationCategoryRow;
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
          skillIds: variables.rowInfo.skills.map((skill: OptionDropdownType) =>
            Number(skill.value),
          ),
          deletedType:
            variables.rowInfo && getDeletedTypeFromRow(variables.rowInfo),
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
          skillIds: variables.rowInfo.skills.map((skill: OptionDropdownType) =>
            Number(skill.value),
          ),
          deletedType:
            variables.rowInfo && getDeletedTypeFromRow(variables.rowInfo),
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
          skillIds: variables.rowInfo.skills.map((skill: OptionDropdownType) =>
            Number(skill.value),
          ),
          deletedType:
            variables.rowInfo && getDeletedTypeFromRow(variables.rowInfo),
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
    setHierarchyList((prev) => updateHierarchyCategoryByInput(prev, variables));
    setIsTyping(false);
  };

  const getExcludedSmalls = (currentRow: OrganizationCategoryRow) => {
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

  const updateHierarchyLargeCategoryByPulldown = (
    prev: HierarchyDetail[],
    targetOrgId: number,
    originalLargeValue: string | undefined,
    newLarge: {
      value: string | number;
      label: string;
      showBy: string;
    },
  ) => {
    return prev.map((org) => {
      if (org.id !== targetOrgId) return org;

      const statisticCategories = org.statisticCategories;

      const matchedRows = statisticCategories
        .filter((item) => item.large.value === originalLargeValue)
        .map((item) => ({ ...item, large: newLarge }));

      const remainingRows = statisticCategories.filter(
        (item) => item.large.value !== originalLargeValue,
      );

      // Find last index of newLarge.value in remaining rows
      const lastIndex = remainingRows.reduce((acc, item, idx) => {
        return item.large.value === newLarge.value ? idx : acc;
      }, -1);

      const newStatisticCategories = [...remainingRows];

      if (lastIndex !== -1) {
        newStatisticCategories.splice(lastIndex + 1, 0, ...matchedRows);
      } else {
        // Instead of pushing, find the **original** position of row.original.large.value
        const originalIndex = statisticCategories.findIndex(
          (item) => item.large.value === originalLargeValue,
        );
        if (originalIndex !== -1) {
          // Insert in the same position as original row
          newStatisticCategories.splice(originalIndex, 0, ...matchedRows);
        } else {
          // If no match found, append to the end
          newStatisticCategories.push(...matchedRows);
        }
      }

      // Remove duplicates based on large|medium|small labels
      const uniqueMap = new Map<string, boolean>();
      const filteredStatisticCategories = newStatisticCategories.filter(
        (item) => {
          const key = `${isUUID(item.large.label) ? '' : item.large.label}|${isUUID(item.medium.label) ? '' : item.medium.label}|${isUUID(item.small?.label) ? '' : item.small?.label}`;
          if (uniqueMap.has(key)) return false;
          uniqueMap.set(key, true);
          return true;
        },
      );

      return { ...org, statisticCategories: filteredStatisticCategories };
    });
  };

  const handleChangeLargeCategoryByPulldown = (
    originalRow: OrganizationCategoryRow | undefined,
    e: OptionDropdownType,
  ) => {
    const newLarge = {
      label: e.label,
      value: e.value,
      showBy: AddCategoryHierarchyType.PULLDOWN,
    };
    setSelectedHierarchiesToUpdate((prev) => {
      const updatedHierarchiesToUpdate = [...prev];
      const statisticCategories = hierarchyList.statisticCategories;

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
            deletedType: row && getDeletedTypeFromRow(row),
          };
        });
      } else {
        updatedHierarchies = [
          {
            organizationStatisticCategoryId: originalRow?.id,
            organizationId: hierarchyList.id as number,
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
            smallStatisticCategory:
              originalRow?.small.label == '' ||
              isUUID(originalRow?.small.label as string)
                ? null
                : {
                    name: originalRow?.small.label as string,
                    uuid: originalRow?.small.value as string,
                  },
            color: originalRow?.color,
            skillIds: originalRow?.skills.map((skill) => Number(skill.value)),
            deletedType: originalRow && getDeletedTypeFromRow(originalRow),
          },
        ];
      }

      updatedHierarchies.forEach((updatedHierarchy) => {
        const key = `${updatedHierarchy.organizationId}|${
          updatedHierarchy.largeStatisticCategory?.uuid || ''
        }|${updatedHierarchy.mediumStatisticCategory?.uuid || ''}|${
          updatedHierarchy.smallStatisticCategory?.uuid || ''
        }`;

        const index = updatedHierarchiesToUpdate.findIndex(
          (item) =>
            item.organizationStatisticCategoryId ===
              updatedHierarchy.organizationStatisticCategoryId ||
            `${item.organizationId}|${
              item.largeStatisticCategory?.uuid || ''
            }|${item.mediumStatisticCategory?.uuid || ''}|${
              item.smallStatisticCategory?.uuid || ''
            }` === key,
        );

        if (index !== -1) {
          // replace the old one
          updatedHierarchiesToUpdate[index] = {
            ...updatedHierarchy,
            organizationStatisticCategoryId:
              updatedHierarchy.organizationStatisticCategoryId!,
            color: updatedHierarchy.color!,
            skillIds: updatedHierarchy.skillIds!,
          };
        } else {
          // add new
          updatedHierarchiesToUpdate.push({
            ...updatedHierarchy,
            organizationStatisticCategoryId:
              updatedHierarchy.organizationStatisticCategoryId!,
            color: updatedHierarchy.color!,
            skillIds: updatedHierarchy.skillIds!,
          });
        }
      });

      return updatedHierarchiesToUpdate;
    });

    setHierarchyList((prev) =>
      updateHierarchyLargeCategoryByPulldown(
        prev,
        hierarchyList.id as number,
        originalRow?.large.value as string,
        newLarge,
      ),
    );
  };

  const updateHierarchyMediumCategoryByPulldown = (
    prev: HierarchyDetail[],
    targetOrgId: number,
    originalRow: OrganizationCategoryRow | undefined,
    newMedium: {
      value: string | number;
      label: string;
      showBy: string;
    },
  ) => {
    return prev.map((org) => {
      if (org.id !== targetOrgId) return org;

      const statisticCategories = org.statisticCategories;

      // Separate matching and non-matching rows
      const matchedRows = statisticCategories
        .filter(
          (item) =>
            item.medium.value === originalRow?.medium.value &&
            item.large.value === originalRow?.large.value,
        )
        .map((item) => ({ ...item, medium: newMedium }));

      const remainingRows = statisticCategories.filter(
        (item) =>
          !(
            item.medium.value === originalRow?.medium.value &&
            item.large.value === originalRow?.large.value
          ),
      );

      // Find the last index where newMedium.value already exists
      let lastIndex = -1;
      remainingRows.forEach((item, index) => {
        if (
          item.large.value === originalRow?.large.value &&
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
            item.medium.value === originalRow?.medium.value &&
            item.large.value === originalRow?.large.value,
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
      const uniqueMap = new Map<string, boolean>();
      const filteredStatisticCategories = newStatisticCategories.filter(
        (item) => {
          const key = `${isUUID(item.large.label) ? '' : item.large.label}|${isUUID(item.medium.label) ? '' : item.medium.label}|${isUUID(item.small?.label) ? '' : item.small?.label}`;
          if (uniqueMap.has(key)) return false;
          uniqueMap.set(key, true);
          return true;
        },
      );

      return { ...org, statisticCategories: filteredStatisticCategories };
    });
  };

  const handleChangeMediumCategoryByPulldown = (
    originalRow: OrganizationCategoryRow | undefined,
    e: OptionDropdownType,
  ) => {
    const newMedium = {
      label: e.label,
      value: e.value,
      showBy: AddCategoryHierarchyType.PULLDOWN,
    };
    setSelectedHierarchiesToUpdate((prev) => {
      const updatedHierarchiesToUpdate = [...prev];
      const statisticCategories = hierarchyList.statisticCategories;
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
          deletedType: row && getDeletedTypeFromRow(row),
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
    setHierarchyList((prev) =>
      updateHierarchyMediumCategoryByPulldown(
        prev,
        hierarchyList.id as number,
        originalRow,
        newMedium,
      ),
    );
  };

  const updateHierarchySmallCategoryByPulldown = (
    prev: HierarchyDetail[],
    targetOrgId: number,
    originalRowId: string | undefined,
    newSmall: {
      label: string;
      value: string | number;
      showBy: AddCategoryHierarchyType;
    },
  ) => {
    return prev.map((org) => {
      if (org.id !== targetOrgId) return org;

      const updatedCategories = org.statisticCategories.map((hierarchy) =>
        hierarchy.id === originalRowId
          ? { ...hierarchy, small: newSmall }
          : hierarchy,
      );

      // Remove duplicates
      const uniqueMap = new Map<string, boolean>();
      const filteredCategories = updatedCategories.filter((item) => {
        const key = `${isUUID(item.large.label) ? '' : item.large.label}|${isUUID(item.medium.label) ? '' : item.medium.label}|${isUUID(item.small?.label) ? '' : item.small?.label}`;
        if (uniqueMap.has(key)) return false;
        uniqueMap.set(key, true);
        return true;
      });

      return { ...org, statisticCategories: filteredCategories };
    });
  };

  const handleChangeSmallCategoryByPulldown = (
    originalRow: OrganizationCategoryRow | undefined,
    e: OptionDropdownType,
  ) => {
    const newSmall = {
      label: e.label,
      value: e.value,
      showBy: AddCategoryHierarchyType.PULLDOWN,
    };
    setSelectedHierarchiesToUpdate((prev) => {
      const updatedHierarchiesToUpdate = [...prev];

      const existingIndex = updatedHierarchiesToUpdate.findIndex(
        (item) => item.organizationStatisticCategoryId === originalRow?.id,
      );

      const newEntry = {
        organizationStatisticCategoryId: originalRow?.id,
        organizationId: hierarchyList.id as number,
        largeStatisticCategory:
          originalRow?.large.label == '' ||
          isUUID(originalRow?.large.label as string)
            ? null
            : {
                name: originalRow?.large.label as string,
                uuid: originalRow?.large.value as string,
              },
        mediumStatisticCategory:
          originalRow?.medium.label == '' ||
          isUUID(originalRow?.medium.label as string)
            ? null
            : {
                name: originalRow?.medium.label as string,
                uuid: originalRow?.medium.value as string,
              },
        smallStatisticCategory: {
          name: e.label as string,
          uuid: e.value as string,
        },
        color: originalRow?.color,
        skillIds: originalRow?.skills.map((skill) => Number(skill.value)),
      };

      if (existingIndex !== -1) {
        // If it exists, replace it
        updatedHierarchiesToUpdate[existingIndex] = {
          ...newEntry,
          organizationStatisticCategoryId:
            newEntry.organizationStatisticCategoryId!,
          color: newEntry.color!,
          skillIds: newEntry.skillIds!,
          deletedType: originalRow && getDeletedTypeFromRow(originalRow),
        };
      } else {
        // Otherwise, add it
        updatedHierarchiesToUpdate.push({
          ...newEntry,
          organizationStatisticCategoryId:
            newEntry.organizationStatisticCategoryId!,
          color: newEntry.color!,
          skillIds: newEntry.skillIds!,
          deletedType: originalRow && getDeletedTypeFromRow(originalRow),
        });
      }

      return updatedHierarchiesToUpdate;
    });
    setHierarchyList((prev) =>
      updateHierarchySmallCategoryByPulldown(
        prev,
        hierarchyList.id as number,
        originalRow?.id as string,
        newSmall,
      ),
    );
  };

  const updateHierarchyPayloadWhenArchive = ({
    originalRow,
    type,
  }: {
    originalRow: OrganizationCategoryRow;
    type: StatisticCategoryType;
  }) => {
    const matchingRowIds = hierarchyList.statisticCategories
      .filter((row) => {
        switch (type) {
          case StatisticCategoryType.LARGE:
            return sameLarge(row, originalRow);
          case StatisticCategoryType.MEDIUM:
            return sameMedium(row, originalRow);
          case StatisticCategoryType.SMALL:
            return sameSmall(row, originalRow);
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
          const existingHierarchy = hierarchyList.statisticCategories.find(
            (item) => item.id == rowId,
          );

          const newEntry = {
            organizationStatisticCategoryId: rowId!,
            organizationId: hierarchyList.id as number,
            largeStatisticCategory: buildCategory(
              existingHierarchy!.large as { label: string; value: string },
            ),
            mediumStatisticCategory: buildCategory(
              existingHierarchy!.medium as { label: string; value: string },
            ),
            smallStatisticCategory: buildCategory(
              existingHierarchy!.small as { label: string; value: string },
            ),
            color: existingHierarchy?.color || '',
            skillIds: existingHierarchy?.skills.length
              ? existingHierarchy?.skills.map((s) => Number(s.value))
              : [],
            deletedType: type,
          };

          prevSelectedHierarchies.push(newEntry);
        }
      });
      return prevSelectedHierarchies;
    });
  };

  const handleArchiveLargeHierarchyCategory = (
    originalRow: OrganizationCategoryRow,
  ) => {
    updateHierarchyPayloadWhenArchive({
      originalRow,
      type: StatisticCategoryType.LARGE,
    });
    setHierarchyList((prev) => {
      return prev.map((org) => {
        if (org.id !== hierarchyList.id) return org;

        return {
          ...org,
          statisticCategories: org.statisticCategories.map((row) => {
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
              small: {
                ...row.small,
                isHidden: true,
              },
            };
          }),
        };
      });
    });
  };

  const findAffectedRows = (
    hierarchyList: OrganizationCategoryRow[],
    originalRow: OrganizationCategoryRow,
    type: StatisticCategoryType,
  ): OrganizationCategoryRow[] => {
    return hierarchyList.filter((row) => {
      switch (type) {
        case StatisticCategoryType.LARGE:
          return (
            row.large.isHidden && row.large.value === originalRow.large.value
          );

        case StatisticCategoryType.MEDIUM:
          return (
            (row.large.isHidden &&
              row.large.value === originalRow.large.value) ||
            (row.medium.isHidden &&
              row.medium.value === originalRow.medium.value &&
              row.large.value === originalRow.large.value)
          );

        case StatisticCategoryType.SMALL:
          return (
            (row.large.isHidden &&
              row.large.value === originalRow.large.value) ||
            (row.medium.isHidden &&
              row.medium.value === originalRow.medium.value &&
              row.large.value === originalRow.large.value) ||
            (row.small.isHidden &&
              row.small.value === originalRow.small.value &&
              row.medium.value === originalRow.medium.value &&
              row.large.value === originalRow.large.value)
          );

        default:
          return false;
      }
    });
  };

  const handleRestoreHierarchyCategory = (
    originalRow: OrganizationCategoryRow,
    type: StatisticCategoryType,
  ) => {
    const affectedRows = findAffectedRows(
      hierarchyList.statisticCategories,
      originalRow,
      type,
    );

    setSelectedHierarchiesToUpdate((prev) => {
      let next = prev.map((item) => ({ ...item })); // deep clone level-1

      affectedRows.forEach((row) => {
        const deletedType = getRestoreType({ row, originalRow, type });
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
              organizationId: hierarchyList.id as number,
              largeStatisticCategory: buildCategory(
                row.large as { label: string; value: string },
              ),
              mediumStatisticCategory: buildCategory(
                row.medium as { label: string; value: string },
              ),
              smallStatisticCategory: buildCategory(
                row.small as { label: string; value: string },
              ),
              color: row.color!,
              skillIds: row.skills.map((s) => Number(s.value)),
              deletedType,
            },
          ];
        }
      });

      return next;
    });

    switch (type) {
      case StatisticCategoryType.LARGE:
        setHierarchyList((prev) => {
          return prev.map((org) => {
            if (org.id !== hierarchyList.id) return org;

            return {
              ...org,
              statisticCategories: org.statisticCategories.map((row) => {
                return {
                  ...row,

                  // Requirement: same large → unhide large
                  large: sameLarge(row, originalRow)
                    ? { ...row.large, isHidden: false }
                    : row.large,
                };
              }),
            };
          });
        });
        break;
      case StatisticCategoryType.MEDIUM:
        setHierarchyList((prev) => {
          return prev.map((org) => {
            if (org.id !== hierarchyList.id) return org;

            return {
              ...org,
              statisticCategories: org.statisticCategories.map((row) => {
                return {
                  ...row,

                  // Requirement #1: same large → unhide large
                  large: sameLarge(row, originalRow)
                    ? { ...row.large, isHidden: false }
                    : row.large,

                  // Requirement #2: same large+medium → unhide medium
                  medium:
                    sameLarge(row, originalRow) && sameMedium(row, originalRow)
                      ? { ...row.medium, isHidden: false }
                      : row.medium,
                };
              }),
            };
          });
        });
        break;
      case StatisticCategoryType.SMALL:
        setHierarchyList((prev) => {
          return prev.map((org) => {
            if (org.id !== hierarchyList.id) return org;

            return {
              ...org,
              statisticCategories: org.statisticCategories.map((row) => {
                return {
                  ...row,

                  // Requirement #1: same large → unhide large
                  large: sameLarge(row, originalRow)
                    ? { ...row.large, isHidden: false }
                    : row.large,

                  // Requirement #2: same large+medium → unhide medium
                  medium:
                    sameLarge(row, originalRow) && sameMedium(row, originalRow)
                      ? { ...row.medium, isHidden: false }
                      : row.medium,

                  // Requirement #3: only this small becomes unhidden
                  small: sameSmall(row, originalRow)
                    ? { ...row.small, isHidden: false }
                    : row.small,
                };
              }),
            };
          });
        });
        break;
    }
  };

  const handleArchiveMediumHierarchyCategory = (
    originalRow: OrganizationCategoryRow,
  ) => {
    updateHierarchyPayloadWhenArchive({
      originalRow,
      type: StatisticCategoryType.MEDIUM,
    });
    setHierarchyList((prev) => {
      return prev.map((org) => {
        if (org.id !== hierarchyList.id) return org;

        return {
          ...org,
          statisticCategories: org.statisticCategories.map((row) => {
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
              small: {
                ...row.small,
                isHidden: true,
              },
            };
          }),
        };
      });
    });
  };

  const handleArchiveSmallHierarchyCategory = (
    originalRow: OrganizationCategoryRow,
  ) => {
    updateHierarchyPayloadWhenArchive({
      originalRow,
      type: StatisticCategoryType.SMALL,
    });

    setHierarchyList((prev) => {
      return prev.map((org) => {
        if (org.id !== hierarchyList.id) return org;

        return {
          ...org,
          statisticCategories: org.statisticCategories.map((row) => {
            if (
              !(
                row.large.value == originalRow.large.value &&
                row.medium.value == originalRow.medium.value &&
                row.small.value == originalRow.small.value
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
              },
              small: {
                ...row.small,
                isHidden: true,
              },
            };
          }),
        };
      });
    });
  };

  const updateColorInHierarchyList = (
    prevList: any[],
    orgId: string,
    largeValue: string,
    newColor: string,
  ) => {
    return prevList.map((org) => {
      if (org.id != orgId) return org;

      return {
        ...org,
        statisticCategories: org.statisticCategories.map((item: any) =>
          item.large.value == largeValue ? { ...item, color: newColor } : item,
        ),
      };
    });
  };

  const handleChangeColor = (newColor: string, largeValue: string) => {
    setSelectedHierarchiesToUpdate((prev) => {
      const updatedHierarchiesToUpdate = [...prev];
      const statisticCategories = hierarchyList.statisticCategories;

      const matchedRows = statisticCategories
        .filter((item) => item.large.value == largeValue)
        .map((item) => ({
          ...item,
          color: newColor,
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
          deletedType: row && getDeletedTypeFromRow(row),
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
    setHierarchyList((prev) =>
      updateColorInHierarchyList(
        prev,
        hierarchyList.id as string,
        largeValue,
        newColor,
      ),
    );
    setOpenColorBox({
      status: false,
      uuid: '',
    });
  };

  const getHiddenMediumsForLarge = (largeValue: string) => {
    return hierarchyList.statisticCategories
      .filter((row) => row.large.value == largeValue && row.medium.isHidden)
      .map((row) => row.medium.value);
  };

  const getHiddenSmallsForLargeAndMedium = (
    largeValue: string,
    mediumValue: string,
  ) => {
    return hierarchyList.statisticCategories
      .filter(
        (row) =>
          row.large.value == largeValue &&
          row.medium.value == mediumValue &&
          row.small.isHidden,
      )
      .map((row) => row.small.value);
  };

  const getAllSmallsForMedium = (largeValue: string, mediumValue: string) => {
    return hierarchyList.statisticCategories
      .filter(
        (row) =>
          row.large.value == largeValue && row.medium.value == mediumValue,
      )
      .map((row) => row.small.value);
  };

  const getAllMediumsAndSmallsForLarge = (largeValue: string) => {
    const mediumList = hierarchyList.statisticCategories
      .filter((row) => row.large.value == largeValue)
      .map((row) => row.medium.value);
    const smallList = hierarchyList.statisticCategories
      .filter((row) => row.large.value == largeValue)
      .map((row) => row.small.value);
    return [...mediumList, ...smallList];
  };

  const getHiddenSmallsForMedium = (
    largeValue: string,
    mediumValue: string,
  ) => {
    return hierarchyList.statisticCategories
      .filter(
        (row) =>
          row.large.value == largeValue &&
          row.medium.value == mediumValue &&
          row.small.isHidden,
      )
      .map((row) => row.small.value);
  };

  const getDisabledMediumValuesForLarge = (largeValue: string) => {
    return hierarchyList.statisticCategories
      .filter((row) => row.large.value === largeValue)
      .filter((row) =>
        checkHasHiddenCategoryInARow({
          originalRow: row,
          type: HierarchyType.MEDIUM,
        }),
      )
      .map((row) => row.medium.value);
  };

  const getHiddenLargeCategoryList = () => {
    return hierarchyList.statisticCategories
      .filter((row) => row.large.isHidden)
      .map((row) => row.large.value);
  };

  const getDisabledLargeCategoryList = () => {
    return hierarchyList.statisticCategories
      .filter((row) =>
        checkHasHiddenCategoryInARow({
          originalRow: row,
          type: HierarchyType.LARGE,
        }),
      )
      .map((row) => row.large.value);
  };

  const getMediumDropdownOptions = (
    row: OrganizationCategoryRow,
    categoryDropdownOptions: OptionDropdownType[],
  ) => {
    const largeValue = row.large.value as string;
    const mediumValue = row.medium.value as string;

    const hiddenMediums = getHiddenMediumsForLarge(largeValue);
    const hiddenSmalls = getHiddenSmallsForMedium(largeValue, mediumValue);
    const disabledMediums = getDisabledMediumValuesForLarge(largeValue);
    const allSmallForMedium = getAllSmallsForMedium(largeValue, mediumValue);

    return categoryDropdownOptions.filter((option) => {
      return (
        option.value !== largeValue &&
        option.value !== '' &&
        !allSmallForMedium.includes(option.value) &&
        !hiddenMediums.includes(option.value) &&
        !hiddenSmalls.includes(option.value) &&
        !disabledMediums.includes(option.value)
      );
    });
  };

  const getSmallDropdownOptions = (
    row: OrganizationCategoryRow,
    categoryDropdownOptions: OptionDropdownType[],
    excludedSmalls: (string | number)[],
  ) => {
    const largeValue = row.large.value as string;
    const mediumValue = row.medium.value as string;

    const hiddenSmallsForLargeAndMedium = getHiddenSmallsForLargeAndMedium(
      largeValue,
      mediumValue,
    );

    return categoryDropdownOptions.filter((option) => {
      return (
        option.value !== largeValue &&
        option.value !== mediumValue &&
        option.value !== '' &&
        !excludedSmalls.includes(option.value) &&
        !hiddenSmallsForLargeAndMedium.includes(option.value)
      );
    });
  };

  const getLargeDropdownOptions = (
    row: OrganizationCategoryRow,
    categoryDropdownOptions: OptionDropdownType[],
  ) => {
    const largeValue = row.large.value as string;

    const hiddenLarges = getHiddenLargeCategoryList();
    const disabledLarges = getDisabledLargeCategoryList();
    const mediumsAndSmallForLarge = getAllMediumsAndSmallsForLarge(largeValue);

    return categoryDropdownOptions.filter((option) => {
      return (
        option.value !== '' &&
        !mediumsAndSmallForLarge.includes(option.value) &&
        !hiddenLarges.includes(option.value) &&
        !disabledLarges.includes(option.value)
      );
    });
  };

  const shouldShowMediumBorderBottom = ({
    rowIndex,
    isHiddenList,
    isHiddenMediumCategory,
  }: {
    rowIndex: number;
    isHiddenList: boolean;
    isHiddenMediumCategory: boolean;
  }) => {
    const isLastMedium = lastMediumIndexes.includes(rowIndex);

    if (!isHiddenList) {
      // Normal mode → border only at last medium
      return isLastMedium;
    }

    // Hidden list mode → show under text row OR last medium
    const isTextRow = isHiddenMediumCategory;

    return isTextRow || isLastMedium;
  };

  const shouldShowSmallBorderBottom = ({
    row,
    rowIndex,
    isHiddenSmallCategory,
  }: {
    row: OrganizationCategoryRow;
    rowIndex: number;
    isHiddenSmallCategory: boolean;
  }) => {
    const smallsInMedium = hierarchyList.statisticCategories.filter(
      (r) =>
        r.large.value === row.large.value &&
        r.medium.value === row.medium.value &&
        !r.small.isHidden,
    );

    const isLastSmallInEmptyMedium =
      smallsInMedium.length === 0 &&
      lastSmallIndexes.includes(rowIndex) &&
      !row.medium.isHidden &&
      !row.large.isHidden;

    if (isHiddenList) {
      return isHiddenSmallCategory
        ? !lastSmallIndexesInEachLarge.includes(rowIndex)
        : !lastSmallIndexesInEachLarge.includes(rowIndex) &&
            (isLastSmallInEmptyMedium || lastSmallIndexes.includes(rowIndex));
    }
    return (
      !isHiddenSmallCategory &&
      !lastSmallIndexesInEachLarge.includes(rowIndex) &&
      (isLastSmallInEmptyMedium || lastSmallIndexes.includes(rowIndex))
    );
  };

  const shouldShowAddSmallButton = (
    row: OrganizationCategoryRow,
    rowIndex: number,
  ) => {
    if (isHiddenList) {
      // Archived list: show only for last small
      return (
        lastSmallIndexes.includes(rowIndex) &&
        !row.medium.isHidden &&
        !row.large.isHidden
      );
    }

    // Displayed list:
    // Show if:
    // 1) there are smalls in this medium and this is the last one
    // 2) OR there are NO smalls in this medium
    const smallsInMedium = hierarchyList.statisticCategories.filter(
      (r) =>
        r.large.value === row.large.value &&
        r.medium.value === row.medium.value &&
        !r.small.isHidden,
    );

    return (
      (smallsInMedium.length === 0 &&
        lastSmallIndexes.includes(rowIndex) &&
        !row.medium.isHidden &&
        !row.large.isHidden) ||
      lastSmallIndexesInDisplayedList.includes(rowIndex)
    );
  };

  const shouldHideCategoryArchiveIcon = (
    isNoLabel: boolean,
    isUUIDLabel: boolean,
    isHiddenCategory: boolean,
  ): boolean => {
    // CASES for hidden:
    if (isHiddenCategory && !isHiddenList) return true;
    if (!isHiddenCategory && (isNoLabel || isUUIDLabel) && isHiddenList)
      return true;
    if ((isUUIDLabel || isNoLabel) && !isHiddenList) return true;

    return false;
  };

  return (
    <div
      className="w-full p-5 bg-[#F8FAFC] rounded-[30px]"
      style={{ boxShadow: '0px 4px 10px 0px #0000000D' }}>
      <p className="text-[#77858F] text-[16px] font-medium my-2 max-w-[100%] break-all">
        {organizationName}
      </p>
      <Table
        className="w-full h-full bg-white !rounded-[10px]"
        tableClassName="!w-full !table-fixed">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header, index) => (
                <th
                  key={header.id}
                  className={`text-[#77858F] bg-[#F8FAFC] ${headerGroup.headers.length - 1 != index && 'border-r-[1px] border-[#D2DBE1]'} w-1/4 font-medium text-xs py-3`}>
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
            const isHiddenLargeCategory = checkIsHiddenCategory({
              type: HierarchyType.LARGE,
              originalRow: row.original,
            });
            const isHiddenMediumCategory = checkIsHiddenCategory({
              type: HierarchyType.MEDIUM,
              originalRow: row.original,
            });
            const isHiddenSmallCategory = checkIsHiddenCategory({
              type: HierarchyType.SMALL,
              originalRow: row.original,
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
                              onChange={(newColor) =>
                                handleChangeColor(
                                  newColor,
                                  row.original.large.value as string,
                                )
                              }
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
                                handleChangeCategoryByInput({
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
                              className="h-full w-full flex-grow"
                              labelOptionClass="!text-sm"
                              valueClassName="!border-[#77858F] !rounded-[6px] !py-1 !pl-[10px]"
                              labelClass="w-[150px] !text-sm"
                              disabled={
                                row.original.large.isHidden && isHiddenList
                              }
                              selectedOption={
                                row.original.large &&
                                !isUUID(row.original.large.label)
                                  ? {
                                      label: row.original.large.label,
                                      value: row.original.large.value,
                                    }
                                  : undefined
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
                        className={`w-[16px] h-[13px] ${
                          shouldHideCategoryArchiveIcon(
                            Boolean(!row.original.large.label),
                            isUUID(row.original.large.label),
                            isHiddenLargeCategory,
                          ) && 'hidden'
                        } hover:cursor-pointer`}
                        onClick={() => {
                          if (
                            shouldHideCategoryArchiveIcon(
                              Boolean(!row.original.large.label),
                              isUUID(row.original.large.label),
                              isHiddenLargeCategory,
                            )
                          )
                            return;
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
                    className={`w-1/4 !p-0`}
                    style={{
                      height:
                        isHiddenLargeCategory && !isHiddenList
                          ? '0px'
                          : 'inherit',
                    }}
                    rowSpan={mediumRowspan[rowIndex]}>
                    <div
                      className={`${isHiddenList && !lastMediumIndexes.includes(rowIndex) ? 'py-[14px] mx-[14px]' : 'p-[14px]'} flex flex-col !h-full ${isHiddenMediumCategory && !isHiddenList && '!p-0'}
                       ${
                         shouldShowMediumBorderBottom({
                           rowIndex,
                           isHiddenList,
                           isHiddenMediumCategory,
                         })
                           ? 'border-b-[1px] border-[#D2DBE1]'
                           : ''
                       } ${isHiddenLargeCategory && isHiddenMediumCategory && !isHiddenList ? '!border-0' : ''}`}>
                      <div className={`flex items-center !h-full gap-[14px]`}>
                        {isHiddenMediumCategory ? (
                          !isHiddenList ? (
                            <>
                              <div className="hidden w-full"></div>
                              {lastMediumIndexes.includes(rowIndex) &&
                                (!isHiddenLargeCategory || isHiddenList) && (
                                  <OptionsBoxToAddCategory
                                    text={'中カテゴリーを追加'}
                                    customClassName={`pt-[10px] pb-[14px] px-[14px] w-full`}
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
                                )}
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
                                  handleChangeCategoryByInput({
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
                                )}
                                minDropdownHeight={240}
                                className="h-full w-full flex-grow"
                                labelOptionClass="!text-sm"
                                valueClassName="!border-[#77858F] !rounded-[6px] !py-1 !pl-[10px]"
                                labelClass="w-[180px] !text-sm"
                                selectedOption={
                                  row.original.medium &&
                                  !isUUID(row.original.medium.label)
                                    ? {
                                        label: row.original.medium.label,
                                        value: row.original.medium.value,
                                      }
                                    : undefined
                                }
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
                            className={`w-[16px] h-[13px] ${
                              shouldHideCategoryArchiveIcon(
                                Boolean(!row.original.medium.label),
                                isUUID(row.original.medium.label),
                                isHiddenMediumCategory,
                              ) && 'hidden'
                            } 
                             hover:cursor-pointer`}
                            onClick={() => {
                              if (
                                shouldHideCategoryArchiveIcon(
                                  Boolean(!row.original.medium.label),
                                  isUUID(row.original.medium.label),
                                  isHiddenMediumCategory,
                                )
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
                        (!isHiddenMediumCategory ||
                          (isHiddenMediumCategory &&
                            !isHiddenLargeCategory &&
                            isHiddenList)) && (
                          <>
                            <OptionsBoxToAddCategory
                              text={'中カテゴリーを追加'}
                              customClassName="pt-[10px]"
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
                  className={`${lastSmallIndexesInEachLarge.includes(rowIndex) && 'border-b-[1px]'} border-x-[1px] border-[#D2DBE1] w-1/4 !py-0 ${isHiddenLargeCategory && !isHiddenList && '!border-b-0'}`}
                  style={{
                    height:
                      isHiddenLargeCategory && !isHiddenList
                        ? '0px'
                        : 'inherit',
                  }}>
                  <div
                    className={`mx-[14px] pt-[14px] ${isHiddenSmallCategory && 'pb-[14px]'} 
                      ${
                        shouldShowSmallBorderBottom({
                          row: row.original,
                          rowIndex,
                          isHiddenSmallCategory: isHiddenSmallCategory,
                        })
                          ? 'border-b-[1px] border-[#D2DBE1]'
                          : ''
                      }
                      flex flex-col !h-[100%] ${isHiddenSmallCategory && !isHiddenList && '!p-0'} ${isHiddenLargeCategory && !isHiddenList && 'hidden'}`}>
                    <div
                      className={`flex items-center gap-[14px] w-full ${isHiddenList && 'h-full'}`}>
                      {isHiddenSmallCategory ? (
                        !isHiddenList ? (
                          <>
                            <div className="hidden w-full"></div>
                          </>
                        ) : (
                          <p
                            className={`text-sm flex-1 break-all font-medium text-black opacity-30`}>
                            {row.original.small.label &&
                            !isUUID(row.original.small.label)
                              ? row.original.small.label
                              : NO_OPTION_CATEGORY}
                          </p>
                        )
                      ) : row.original.small.showBy ==
                        AddCategoryHierarchyType.INPUT ? (
                        <div className="flex flex-col w-[calc(100%_-_30px)]">
                          <div className="w-full">
                            <input
                              key={JSON.stringify(row.original.small)}
                              type="text"
                              className={`w-full text-sm !min-h-[34px] px-[10px] py-[6px] text-black rounded-[6px] ${
                                row.original.small.isHidden &&
                                isHiddenList &&
                                'opacity-50'
                              }`}
                              placeholder="新しいカテゴリーを入力"
                              defaultValue={
                                !isUUID(row.original.small.label)
                                  ? row.original.small.label
                                  : ''
                              }
                              disabled={
                                row.original.small.isHidden && isHiddenList
                              }
                              onBlur={(e) => {
                                handleChangeCategoryByInput({
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
                          <div className="w-[calc(100%_-_30px)]">
                            <TableDropdown
                              key={JSON.stringify(row.original.small)}
                              options={getSmallDropdownOptions(
                                row.original,
                                categoryDropdownOptions,
                                excludedSmalls,
                              )}
                              disabled={
                                row.original.small.isHidden && isHiddenList
                              }
                              minDropdownHeight={240}
                              className="h-full"
                              valueClassName="!border-[#77858F] !rounded-[6px] !py-1 !pl-[10px]"
                              labelOptionClass="!text-sm"
                              labelClass="w-[180px] !text-sm"
                              selectedOption={
                                row.original.small &&
                                !isUUID(row.original.small.label)
                                  ? {
                                      label: row.original.small.label,
                                      value: row.original.small.value,
                                    }
                                  : undefined
                              }
                              onPendingChange={(e) => {
                                if (e.value == row.original.small.value) return;
                                if (
                                  row.original.small.label &&
                                  !isUUID(row.original.small.label) &&
                                  !isUUID(row.original.id as string)
                                ) {
                                  setWarningChangeCategoryModalOpen(true);
                                  setPendingSelection({
                                    originalRow: row.original,
                                    newValue: e,
                                    type: StatisticCategoryType.SMALL,
                                  });
                                } else {
                                  handleChangeSmallCategoryByPulldown(
                                    row.original,
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
                          name="Hide"
                          src={`/icons/${row.original.small.isHidden ? 'dark-close-eye' : 'gray-open-eye'}.svg`}
                          className={`w-[16px] h-[13px] ${
                            shouldHideCategoryArchiveIcon(
                              Boolean(!row.original.small.label),
                              isUUID(row.original.small.label),
                              isHiddenSmallCategory,
                            ) && 'hidden'
                          } hover:cursor-pointer`}
                          onClick={() => {
                            if (
                              shouldHideCategoryArchiveIcon(
                                Boolean(!row.original.small.label),
                                isUUID(row.original.small.label),
                                isHiddenSmallCategory,
                              )
                            )
                              return;
                            if (row.original.small.isHidden) {
                              setPendingRestoreCategory({
                                originalRow: row.original,
                                type: StatisticCategoryType.SMALL,
                              });
                              setOpenConfirmRestoreModal({
                                name: row.original.small.label,
                                status: true,
                              });
                            } else {
                              setPendingArchiveCategory({
                                originalRow: row.original,
                                type: StatisticCategoryType.SMALL,
                              });
                              setOpenConfirmArchiveModal(true);
                            }
                          }}
                        />
                      )}
                    </div>
                    {shouldShowAddSmallButton(row.original, rowIndex) && (
                      <OptionsBoxToAddCategory
                        text={'小カテゴリーを追加'}
                        customClassName={`pt-[10px] pb-[14px]`}
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
                <td
                  className={`align-top h-full ${lastSmallIndexesInEachLarge.includes(rowIndex) && 'border-b-[1px] border-[#D2DBE1]'} !w-1/4 max-w-[1/4] ${isHiddenLargeCategory && !isHiddenList && 'hidden'}`}
                  style={{
                    height:
                      isHiddenLargeCategory && !isHiddenList
                        ? '0px'
                        : 'inherit',
                  }}>
                  {isHiddenSmallCategory ? (
                    !isHiddenList ? (
                      <div className="hidden"></div>
                    ) : (
                      <div
                        className={`mx-[14px] ${!lastSmallIndexesInEachLarge.includes(rowIndex) && 'border-b-[1px] border-[#D2DBE1]'} flex items-center h-full`}>
                        <div className="flex items-center overflow-x-auto gap-2 pb-1 pr-1">
                          {row.original.skills.map((skill) => (
                            <p
                              key={skill.value}
                              className="text-white leading-[1] text-nowrap bg-[#d6dadd] py-[7.5px] px-[10px] rounded-[20px] text-xs font-medium">
                              {skill.label}
                            </p>
                          ))}
                        </div>
                      </div>
                    )
                  ) : (
                    <MultiSectionBox
                      key={JSON.stringify(row.original.skills)}
                      options={dataOptionsSkill.filter(
                        (option) => option.value,
                      )}
                      onChange={(selectedSkills: OptionDropdownType[]) => {
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
                            skillIds: selectedSkills.map((skill) =>
                              Number(skill.value),
                            ),
                            deletedType:
                              row.original &&
                              getDeletedTypeFromRow(row.original),
                          };

                          if (existingIndex !== -1) {
                            // If it exists, replace it
                            updatedHierarchiesToUpdate[existingIndex] =
                              newEntry;
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
                      value={row.original.skills.map((skill) => {
                        return {
                          label: skill.label,
                          value: skill.value,
                        };
                      })}
                      placeholder={'選択'}
                      className="w-full shadow-none text-sm !rounded mt-1.5 md:mt-0"
                    />
                  )}
                </td>
              </tr>
            );
          })}
          <tr>
            <td className="p-3 w-1/4 border-r-[1px] border-[#D2DBE1]">
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
            <td className="w-1/4 border-r-[1px] border-[#D2DBE1]"></td>
            <td className="w-1/4 border-r-[1px] border-[#D2DBE1]"></td>
            <td className="w-1/4"></td>
          </tr>
        </tbody>
      </Table>

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
              case StatisticCategoryType.SMALL:
                handleArchiveSmallHierarchyCategory(originalRow!);
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
              case StatisticCategoryType.SMALL:
                handleRestoreHierarchyCategory(
                  originalRow!,
                  StatisticCategoryType.SMALL,
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
              case StatisticCategoryType.SMALL:
                handleChangeSmallCategoryByPulldown(originalRow, newValue);
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
