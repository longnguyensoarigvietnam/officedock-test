'use client';

import { HierarchyType, StatisticCategoryType } from '@constants/enums';

import { CalendarCategoryRow } from '@interfaces/hierarchy';

interface HierarchyDetail {
  id: number | string;
  name: string;
  statisticCategories: CalendarCategoryRow[];
}

const useCalendarCategory = ({
  hierarchyDetail,
}: {
  hierarchyDetail: HierarchyDetail;
}) => {
  const checkIsHiddenCategory = ({
    type,
    originalRow,
  }: {
    type: HierarchyType;
    originalRow: CalendarCategoryRow;
  }) => {
    switch (type) {
      case HierarchyType.LARGE:
        return hierarchyDetail.statisticCategories.find(
          (hierarchy) =>
            hierarchy.id == originalRow.id && hierarchy.large?.isHidden,
        )
          ? true
          : false;
      case HierarchyType.MEDIUM:
        return hierarchyDetail.statisticCategories.find(
          (hierarchy) =>
            hierarchy.id == originalRow.id && hierarchy.medium?.isHidden,
        )
          ? true
          : false;
    }
  };

  const sameLarge = (
    row: CalendarCategoryRow,
    originalRow: CalendarCategoryRow,
  ) => row.large.value === originalRow.large.value;

  const sameMedium = (
    row: CalendarCategoryRow,
    originalRow: CalendarCategoryRow,
  ) =>
    sameLarge(row, originalRow) &&
    row.medium.value === originalRow.medium.value;

  const findLastUniqueMediumIndexes = (
    data: CalendarCategoryRow[],
    isDisplayed: boolean | null = null,
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
      if (isDisplayed) {
        if (!medium.isHidden && mediumIndexes[medium.value] === undefined) {
          mediumIndexes[medium.value] = i;
          lastMediumIndex = i; // Track last added medium index
        }
      } else {
        if (mediumIndexes[medium.value] === undefined) {
          mediumIndexes[medium.value] = i;
          lastMediumIndex = i; // Track last added medium index
        }
      }
    }

    // Push the last tracked index of the final large group
    if (lastMediumIndex !== null) lastIndexes.push(lastMediumIndex);

    return lastIndexes;
  };

  const findLastUniqueLargeIndexes = (
    data: CalendarCategoryRow[],
  ): number[] => {
    const lastIndexes: number[] = [];
    let lastLargeIndex: number | null = null;
    let currentLargeValue: number | string | null = null;

    for (let i = 0; i < data.length; i++) {
      const { large } = data[i];

      // If the large category changes, store the last large index
      if (large.value !== currentLargeValue) {
        if (lastLargeIndex !== null) lastIndexes.push(lastLargeIndex);
        currentLargeValue = large.value;
      }

      lastLargeIndex = i; // Always update with the last index of the large group
    }

    // Push the last tracked index of the final large group
    if (lastLargeIndex !== null) lastIndexes.push(lastLargeIndex);

    return lastIndexes;
  };

  const findAffectedRows = (
    hierarchyList: CalendarCategoryRow[],
    originalRow: CalendarCategoryRow,
    type: StatisticCategoryType,
  ): CalendarCategoryRow[] => {
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

        default:
          return false;
      }
    });
  };

  function getDeletedCalendarCategoryTypeFromRow(
    row: CalendarCategoryRow,
  ): StatisticCategoryType | null {
    const largeHidden = row.large?.isHidden ?? false;
    const mediumHidden = row.medium?.isHidden ?? false;

    // Case 1: all hidden → deletedType = LARGE
    if (largeHidden && mediumHidden) {
      return StatisticCategoryType.LARGE;
    }

    // Case 2: large visible, medium hidden → deletedType = MEDIUM
    if (!largeHidden && mediumHidden) {
      return StatisticCategoryType.MEDIUM;
    }

    // Case 3: all visible → deletedType = null
    return null;
  }

  return {
    checkIsHiddenCategory,
    sameLarge,
    sameMedium,
    findLastUniqueMediumIndexes,
    findLastUniqueLargeIndexes,
    findAffectedRows,
    getDeletedCalendarCategoryTypeFromRow,
  };
};

export default useCalendarCategory;
