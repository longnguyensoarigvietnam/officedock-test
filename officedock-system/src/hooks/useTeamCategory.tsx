'use client';

import { HierarchyType } from '@constants/enums';

import { OrganizationCategoryRow } from '@interfaces/hierarchy';

interface HierarchyDetail {
  id: number | string;
  name: string;
  statisticCategories: OrganizationCategoryRow[];
}

type CheckOrganizationCategoryRowArgs = {
  originalRow: OrganizationCategoryRow;
  type?: HierarchyType; // optional: HierarchyType.LARGE | MEDIUM | SMALL
};

const useTeamCategory = ({
  hierarchyList,
}: {
  hierarchyList: HierarchyDetail;
}) => {
  const checkIsHiddenCategory = ({
    type,
    originalRow,
  }: {
    type: HierarchyType;
    originalRow: OrganizationCategoryRow;
  }) => {
    switch (type) {
      case HierarchyType.LARGE:
        return hierarchyList.statisticCategories.find(
          (hierarchy) =>
            hierarchy.id == originalRow.id && hierarchy.large?.isHidden,
        )
          ? true
          : false;
      case HierarchyType.MEDIUM:
        return hierarchyList.statisticCategories.find(
          (hierarchy) =>
            hierarchy.id == originalRow.id && hierarchy.medium?.isHidden,
        )
          ? true
          : false;
      case HierarchyType.SMALL:
        return hierarchyList.statisticCategories.find(
          (hierarchy) =>
            hierarchy.id == originalRow.id && hierarchy.small?.isHidden,
        )
          ? true
          : false;
    }
  };

  const findLastUniqueMediumIndexes = (
    data: OrganizationCategoryRow[],
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
    data: OrganizationCategoryRow[],
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

      (lastLargeIndex = i); // Always update with the last index of the large group
    }

    // Push the last tracked index of the final large group
    if (lastLargeIndex !== null) lastIndexes.push(lastLargeIndex);

    return lastIndexes;
  };

  const findLastSmallInEachLarge = (
    data: OrganizationCategoryRow[],
  ): number[] => {
    const lastIndexes: number[] = [];
    let currentLargeValue: number | string | null = null;
    let lastSmallIndex: number | null = null;

    for (let i = 0; i < data.length; i++) {
      const { large } = data[i];

      // If the large category changes, push the previous lastSmallIndex
      if (large.value !== currentLargeValue) {
        if (lastSmallIndex !== null) lastIndexes.push(lastSmallIndex);
        currentLargeValue = large.value;
      }

      // Always update lastSmallIndex — we want the last small under current large
      lastSmallIndex = i;
    }

    // Push the last tracked index of the final large group
    if (lastSmallIndex !== null) lastIndexes.push(lastSmallIndex);

    return lastIndexes;
  };

  const findLastDisplayedSmallInEachLarge = (
    data: OrganizationCategoryRow[],
  ): number[] => {
    const result: number[] = [];

    let currentLargeValue: string | number | null = null;
    let lastMatchingIndex: number | null = null;

    for (let i = 0; i < data.length; i++) {
      const row = data[i];

      // Large group changes → store previous result (if exists)
      if (row.large.value !== currentLargeValue) {
        if (lastMatchingIndex !== null) {
          result.push(lastMatchingIndex);
        }

        currentLargeValue = row.large.value;
        lastMatchingIndex = null; // reset for new group
      }

      // Check small.isHidden matches isDisplayed
      if (!row.small.isHidden) {
        lastMatchingIndex = i;
      }
    }

    // Push the last group's match
    if (lastMatchingIndex !== null) {
      result.push(lastMatchingIndex);
    }

    return result;
  };

  const findLastUniqueSmallIndexes = (
    data: OrganizationCategoryRow[],
    isDisplayed: boolean | null = null,
  ): number[] => {
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
      if (isDisplayed) {
        if (!small.isHidden && smallIndexes[small.value] === undefined) {
          smallIndexes[small.value] = i;
          lastSmallIndex = i; // Track last added small index
        }
      } else {
        if (smallIndexes[small.value] === undefined) {
          smallIndexes[small.value] = i;
          lastSmallIndex = i; // Track last added medium index
        }
      }
    }

    // Push the last tracked index of the final large/medium group
    if (lastSmallIndex !== null) lastIndexes.push(lastSmallIndex);

    return lastIndexes;
  };

  const checkHasHiddenCategoryInARow = ({
    originalRow,
    type,
  }: CheckOrganizationCategoryRowArgs) => {
    let matchingRows: OrganizationCategoryRow[] = [];
    switch (type) {
      case HierarchyType.LARGE: {
        matchingRows = hierarchyList.statisticCategories.filter(
          (row) => row.large.value === originalRow.large.value,
        );
        break;
      }
      case HierarchyType.MEDIUM: {
        matchingRows = hierarchyList.statisticCategories.filter(
          (row) =>
            row.large.value === originalRow.large.value &&
            row.medium.value === originalRow.medium.value,
        );
        break;
      }
      case HierarchyType.SMALL: {
        matchingRows = hierarchyList.statisticCategories.filter(
          (row) =>
            row.large.value === originalRow.large.value &&
            row.medium.value === originalRow.medium.value &&
            row.small.value === originalRow.small.value,
        );
        break;
      }
    }
    return matchingRows.some(
      (row) => row.large.isHidden || row.medium.isHidden || row.small.isHidden,
    );
  };

  const sameLarge = (
    row: OrganizationCategoryRow,
    originalRow: OrganizationCategoryRow,
  ) => row.large.value === originalRow.large.value;

  const sameMedium = (
    row: OrganizationCategoryRow,
    originalRow: OrganizationCategoryRow,
  ) =>
    sameLarge(row, originalRow) &&
    row.medium.value === originalRow.medium.value;

  const sameSmall = (
    row: OrganizationCategoryRow,
    originalRow: OrganizationCategoryRow,
  ) =>
    sameMedium(row, originalRow) && row.small.value === originalRow.small.value;

  return {
    checkIsHiddenCategory,
    findLastUniqueLargeIndexes,
    findLastUniqueMediumIndexes,
    findLastSmallInEachLarge,
    findLastUniqueSmallIndexes,
    findLastDisplayedSmallInEachLarge,
    checkHasHiddenCategoryInARow,
    sameLarge,
    sameMedium,
    sameSmall,
  };
};

export default useTeamCategory;
