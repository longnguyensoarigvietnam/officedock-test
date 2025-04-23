import { Dispatch, SetStateAction, useEffect, useRef, useState } from 'react';
import { v4 as uuidv4, validate as isUUID } from 'uuid';
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { createPortal } from 'react-dom';
import { useMutation } from 'react-query';
import { Popover, PopoverButton } from '@headlessui/react';

import { CircleColorPicker } from '@components/common/CircleColorPicker';
import TableDropdown from '@components/common/Dropdown/TableDropdown';
import ImageRound from '@components/common/ImageRound';
import MultiSelect from '@components/common/MultiSelect';
import { Table } from '@components/common/Table';

import { HIERARCHY_COLOR_LIST } from '@constants';
import { apiRouters } from '@constants/routers';
import { ServerStatusCode, StatisticCategoryType } from '@constants/enums';
import { INVALID_CATEGORY_NAME } from '@constants/message';

import { OptionDropdownType } from '@interfaces/common';

import api from '@base/api';
import WarningChangeHierarchyCategoryModal from '@components/modals/WarningChangeHierarchyCategoryModal';
import WarningDeleteHierarchyCategoryModal from '@components/modals/WarningDeleteHierarchyCategoryModal';

interface rowDataType {
  id: number | string;
  large: {
    value: string | number;
    label: string;
    showBy: string;
    isValid: boolean;
  };
  medium: {
    value: string | number;
    label: string;
    showBy: string;
    isValid: boolean;
  };
  small: {
    value: string | number;
    label: string;
    showBy: string;
    isValid: boolean;
  };
  skills: OptionDropdownType[];
  color: string;
}

interface HierarchyDetail {
  id: number | string;
  name: string;
  statisticCategories: rowDataType[];
}

const OptionsBoxToAddCategory = ({
  text,
  addCategoryUsingInput,
  addCategoryUsingDropdown,
}: {
  text: string;
  addCategoryUsingInput: (option: string) => void;
  addCategoryUsingDropdown: (option: string) => void;
}) => {
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const [position, setPosition] = useState<{ top: number; left: number }>({
    top: -9999,
    left: -9999,
  });
  const [isOpen, setIsOpen] = useState(false);
  const [isReady, setIsReady] = useState(false);

  const handleToggle = () => {
    if (!buttonRef.current) return;

    const buttonRect = buttonRef.current.getBoundingClientRect();
    setIsOpen((prev) => !prev);
    setIsReady(false);

    requestAnimationFrame(() => {
      if (dropdownRef.current) {
        const dropdownHeight = dropdownRef.current.offsetHeight;
        const viewportHeight = window.innerHeight;

        const shouldShowAbove =
          buttonRect.bottom + dropdownHeight + 10 > viewportHeight;

        setPosition({
          top: shouldShowAbove
            ? buttonRect.top - dropdownHeight - 10 + window.scrollY
            : buttonRect.bottom + 10 + window.scrollY,
          left: buttonRect.left + window.scrollX,
        });

        setIsReady(true);
      }
    });
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const renderOptions = () => {
    return (
      <div
        ref={dropdownRef}
        className="fixed bg-[#5B6770] text-white rounded-[6px] w-[252px] py-[5px] text-sm font-medium shadow-lg z-50 transition-opacity duration-200"
        style={{
          top: `${position.top}px`,
          left: `${position.left}px`,
          opacity: isReady ? 1 : 0,
          visibility: isReady ? 'visible' : 'hidden',
        }}>
        <button
          className="py-[10px] px-[14px] text-left w-full hover:bg-[#7D8A94] transition-all duration-200 rounded-[6px]"
          onClick={() => {
            setIsOpen(false);
            addCategoryUsingInput('input');
          }}>
          チームの業務カテゴリーを入力
        </button>
        <button
          className="py-[10px] px-[14px] text-left w-full hover:bg-[#7D8A94] transition-all duration-200 rounded-[6px]"
          onClick={() => {
            setIsOpen(false);
            addCategoryUsingDropdown('pulldown');
          }}>
          登録済みの業務カテゴリーから選択
        </button>
      </div>
    );
  };

  return (
    <>
      <Popover className="relative">
        <PopoverButton
          ref={buttonRef}
          className="focus:outline-none flex items-center gap-2 h-[34px] bg-[#ECF0F2] rounded-[6px] py-[4px] px-[10px]"
          onClick={handleToggle}>
          <ImageRound
            className="w-[17px] h-[17px] hover:cursor-pointer"
            src="/icons/add-category.svg"
            name="Add category icon"
          />
          <p className="text-[#77858F] font-medium text-sm">{text}</p>
        </PopoverButton>
      </Popover>

      {isOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />,
          document.body,
        )}
      {isOpen && createPortal(renderOptions(), document.body)}
    </>
  );
};

const TableComponent = ({
  hierarchyList,
  categoryList,
  organizationName,
  dataOptionsSkill,
  newCategory,
  setNewCategory,
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
  newCategory: {
    name: string;
    uuid: string;
    type: string;
    rowInfo: rowDataType;
  };
  setHierarchyList: Dispatch<SetStateAction<HierarchyDetail[]>>;
  setSelectedHierarchiesToDelete: Dispatch<
    SetStateAction<string[] | undefined>
  >;
  setNewCategory: Dispatch<
    SetStateAction<{
      name: string;
      uuid: string;
      type: string;
      rowInfo: rowDataType;
    }>
  >;
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

  const inputRef = useRef<HTMLInputElement | null>(null);

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
      accessorKey: 'large',
      header: () => (
        <div className="flex justify-between px-5">
          <p>大カテゴリー</p>
          <p>{uniqueLargeCount}</p>
        </div>
      ),
    },
    {
      accessorKey: 'medium',
      header: () => (
        <div className="flex justify-between px-5">
          <p>中カテゴリー</p>
          <p>{uniqueMediumCount}</p>
        </div>
      ),
    },
    {
      accessorKey: 'small',
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
    key: 'large' | 'medium',
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
    'large',
  );
  const mediumRowspan = processRowspan(
    hierarchyList.statisticCategories,
    'medium',
  );

  const handleAddSmallCategory = (option: string, rowInfo: rowDataType) => {
    const newUuid = uuidv4();
    const newRow = {
      id: newUuid,
      color: rowInfo.color,
      large: rowInfo.large,
      medium: rowInfo.medium,
      small: { label: newUuid, value: newUuid, showBy: option, isValid: false },
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
        isValid: false,
      },
      small: { label: newUuid, value: newUuid, showBy: '', isValid: false },
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
            isValid: false,
          },
          medium: {
            label: newUuid,
            value: newUuid,
            showBy: '',
            isValid: false,
          },
          small: { label: newUuid, value: newUuid, showBy: '', isValid: false },
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

  // Validate category
  const handleValidateCategory = async (data: {
    uuid: string;
    name: string;
  }) => {
    return await api.post(apiRouters.CATEGORY_VALIDATION, {
      uuid: data.uuid,
      name: data.name,
    });
  };

  const { mutate: validateCategory } = useMutation(
    'postValidateCategory',
    handleValidateCategory,
    {
      onSettled: (data) => {
        if (data?.status == ServerStatusCode.OK) {
          setSelectedHierarchiesToUpdate((prev) => {
            const updatedHierarchiesToUpdate = [...prev];

            const existingIndex = updatedHierarchiesToUpdate.findIndex(
              (item) =>
                item.organizationStatisticCategoryId === newCategory.rowInfo.id,
            );

            let newEntry: any = {};
            if (newCategory.type == 'large') {
              newEntry = {
                organizationStatisticCategoryId: newCategory.rowInfo.id,
                organizationId: hierarchyList.id as number,
                largeStatisticCategory: {
                  name: newCategory.name as string,
                  uuid: newCategory.uuid as string,
                },
                mediumStatisticCategory:
                  newCategory.rowInfo.medium.label == '' ||
                  isUUID(newCategory.rowInfo.medium.label as string)
                    ? null
                    : {
                        name: newCategory.rowInfo.medium.label as string,
                        uuid: newCategory.rowInfo.medium.value as string,
                      },
                smallStatisticCategory:
                  newCategory.rowInfo.small.label ||
                  isUUID(newCategory.rowInfo.small.label as string)
                    ? null
                    : {
                        name: newCategory.rowInfo.small.label as string,
                        uuid: newCategory.rowInfo.small.value as string,
                      },
                color: newCategory.rowInfo.color,
                skillIds: newCategory.rowInfo.skills.map((skill) =>
                  Number(skill.value),
                ),
              };
            } else if (newCategory.type == 'medium') {
              newEntry = {
                organizationStatisticCategoryId: newCategory.rowInfo.id,
                organizationId: hierarchyList.id as number,
                largeStatisticCategory:
                  newCategory.rowInfo.large.label == '' ||
                  isUUID(newCategory.rowInfo.large.label as string)
                    ? null
                    : {
                        name: newCategory.rowInfo.large.label as string,
                        uuid: newCategory.rowInfo.large.value as string,
                      },
                mediumStatisticCategory: {
                  name: newCategory.name as string,
                  uuid: newCategory.uuid as string,
                },
                smallStatisticCategory:
                  newCategory.rowInfo.small.label == '' ||
                  isUUID(newCategory.rowInfo.small.label as string)
                    ? null
                    : {
                        name: newCategory.rowInfo.small.label as string,
                        uuid: newCategory.rowInfo.small.value as string,
                      },
                color: newCategory.rowInfo.color,
                skillIds: newCategory.rowInfo.skills.map((skill) =>
                  Number(skill.value),
                ),
              };
            } else {
              newEntry = {
                organizationStatisticCategoryId: newCategory.rowInfo.id,
                organizationId: hierarchyList.id as number,
                largeStatisticCategory:
                  newCategory.rowInfo.large.label == '' ||
                  isUUID(newCategory.rowInfo.large.label as string)
                    ? null
                    : {
                        name: newCategory.rowInfo.large.label as string,
                        uuid: newCategory.rowInfo.large.value as string,
                      },
                mediumStatisticCategory:
                  newCategory.rowInfo.medium.label == '' ||
                  isUUID(newCategory.rowInfo.medium.label as string)
                    ? null
                    : {
                        name: newCategory.rowInfo.medium.label as string,
                        uuid: newCategory.rowInfo.medium.value as string,
                      },
                smallStatisticCategory: {
                  name: newCategory.name as string,
                  uuid: newCategory.uuid as string,
                },
                color: newCategory.rowInfo.color,
                skillIds: newCategory.rowInfo.skills.map((skill) =>
                  Number(skill.value),
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
        }

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
            let updatedCategories: rowDataType[] = [];
            if (newCategory.type == 'large') {
              updatedCategories = updatedHierarchyList[
                foundOrganizationHierarchyIndex
              ].statisticCategories.map((hierarchy) =>
                hierarchy.id == newCategory.rowInfo.id
                  ? {
                      ...hierarchy,
                      large: {
                        label: newCategory.name,
                        value: newCategory.uuid,
                        showBy: 'input',
                        isValid:
                          data?.status == ServerStatusCode.OK ? true : false,
                      },
                    }
                  : hierarchy,
              );
            } else if (newCategory.type == 'medium') {
              updatedCategories = updatedHierarchyList[
                foundOrganizationHierarchyIndex
              ].statisticCategories.map((hierarchy) =>
                newCategory.rowInfo &&
                hierarchy.id == newCategory.rowInfo.id &&
                hierarchy.large.value === newCategory.rowInfo.large.value
                  ? {
                      ...hierarchy,
                      medium: {
                        label: newCategory.name,
                        value: newCategory.uuid,
                        showBy: 'input',
                        isValid:
                          data?.status == ServerStatusCode.OK ? true : false,
                      },
                    }
                  : hierarchy,
              );
            } else {
              updatedCategories = updatedHierarchyList[
                foundOrganizationHierarchyIndex
              ].statisticCategories.map((hierarchy) =>
                newCategory.rowInfo &&
                hierarchy.id == newCategory.rowInfo.id &&
                hierarchy.large.value === newCategory.rowInfo.large.value &&
                hierarchy.medium.value === newCategory.rowInfo.medium.value
                  ? {
                      ...hierarchy,
                      small: {
                        label: newCategory.name,
                        value: newCategory.uuid,
                        showBy: 'input',
                        isValid:
                          data?.status == ServerStatusCode.OK ? true : false,
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

        setNewCategory({
          name: '',
          uuid: '',
          type: '',
          rowInfo: {
            id: '',
            large: {
              value: '',
              label: '',
              showBy: '',
              isValid: false,
            },
            medium: {
              value: '',
              label: '',
              showBy: '',
              isValid: false,
            },
            small: {
              value: '',
              label: '',
              showBy: '',
              isValid: false,
            },
            skills: [],
            color: '',
          },
        });
      },
    },
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        validateCategory({
          name: newCategory.name,
          uuid: newCategory.uuid,
        });
      }
    };

    if (newCategory.name) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [newCategory.name, newCategory.uuid]);

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
        showBy: 'pulldown',
        isValid: true,
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
          showBy: 'pulldown',
          isValid: true,
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
        showBy: 'pulldown',
        isValid: true,
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
          showBy: 'pulldown',
          isValid: true,
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
                  showBy: 'pulldown',
                  isValid: true,
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
    setSelectedHierarchiesToDelete((prev) => {
      const currentHierarchiesToDelete = [...(prev || [])];

      const matchingHierarchies = hierarchyList.statisticCategories
        .filter(
          (item) =>
            item.large.value === oldLargeValue &&
            item.medium.value === oldMediumValue,
        )
        .map((hierarchy) => String(hierarchy.id)); // Convert IDs to strings

      return [...currentHierarchiesToDelete, ...matchingHierarchies]; // Spread to avoid nested arrays
    });
    setSelectedHierarchiesToUpdate((prev) => {
      const currentHierarchiesToUpdate = [...(prev || [])];

      return currentHierarchiesToUpdate.filter(
        (hierarchy) =>
          !(
            hierarchy.largeStatisticCategory?.uuid == oldLargeValue &&
            hierarchy.mediumStatisticCategory?.uuid == oldMediumValue
          ),
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
              (hierarchy) =>
                !(
                  hierarchy.large.value == oldLargeValue &&
                  hierarchy.medium.value == oldMediumValue
                ),
            ),
          ],
        };
      }

      return updatedHierarchyList;
    });
  };

  const handleDeleteSmallHierarchyCategory = (
    oldLargeValue: string | number,
    oldMediumValue: string | number,
    oldSmallValue: string | number,
  ) => {
    setSelectedHierarchiesToDelete((prev) => {
      const currentHierarchiesToDelete = [...(prev || [])];

      const matchingHierarchies = hierarchyList.statisticCategories
        .filter(
          (item) =>
            item.large.value == oldLargeValue &&
            item.medium.value == oldMediumValue &&
            item.small.value == oldSmallValue,
        )
        .map((hierarchy) => String(hierarchy.id)); // Convert IDs to strings

      return [...currentHierarchiesToDelete, ...matchingHierarchies]; // Spread to avoid nested arrays
    });
    setSelectedHierarchiesToUpdate((prev) => {
      const currentHierarchiesToUpdate = [...(prev || [])];

      return currentHierarchiesToUpdate.filter(
        (hierarchy) =>
          !(
            hierarchy.largeStatisticCategory?.uuid == oldLargeValue &&
            hierarchy.mediumStatisticCategory?.uuid == oldMediumValue &&
            hierarchy.smallStatisticCategory?.uuid == oldSmallValue
          ),
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
              (hierarchy) =>
                !(
                  hierarchy.large.value == oldLargeValue &&
                  hierarchy.medium.value == oldMediumValue &&
                  hierarchy.small.value == oldSmallValue
                ),
            ),
          ],
        };
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
                      {row.original.large.showBy == 'input' ? (
                        <div className="flex flex-col !h-full w-full">
                          <div className="mb-1 !h-full w-full" ref={inputRef}>
                            <input
                              type="text"
                              className={`w-full !h-full !min-h-[46px] p-2 text-black rounded-[5px] ${!row.original.large.isValid && !isUUID(row.original.large.label) && 'border-red-500'}`}
                              placeholder="新しいカテゴリーを入力"
                              value={
                                newCategory.name !== '' &&
                                newCategory.type == 'large' &&
                                newCategory.rowInfo.id == row.original.id
                                  ? newCategory.name
                                  : !isUUID(row.original.large.label)
                                    ? row.original.large.label
                                    : ''
                              }
                              onChange={(e) =>
                                setNewCategory({
                                  name: e.target.value,
                                  uuid: String(row.original.large.value) || '',
                                  type: 'large',
                                  rowInfo: row.original,
                                })
                              }
                            />
                          </div>
                          <p className="text-xs text-error">
                            {!row.original.large.isValid &&
                              !isUUID(row.original.large.label) &&
                              INVALID_CATEGORY_NAME}
                          </p>
                        </div>
                      ) : (
                        row.original.large.showBy == 'pulldown' && (
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
                        {row.original.medium.showBy == 'input' ? (
                          <div className="flex flex-col !h-full w-full">
                            <div className="mb-1 !h-full w-full" ref={inputRef}>
                              <input
                                type="text"
                                className={`w-full !h-full !min-h-[46px] p-2 text-black rounded-[5px] ${!row.original.medium.isValid && !isUUID(row.original.medium.label) && 'border-red-500'}`}
                                placeholder="新しいカテゴリーを入力"
                                value={
                                  newCategory.name !== '' &&
                                  newCategory.type == 'medium' &&
                                  newCategory.rowInfo.id == row.original.id
                                    ? newCategory.name
                                    : !isUUID(row.original.medium.label)
                                      ? row.original.medium.label
                                      : ''
                                }
                                onChange={(e) =>
                                  setNewCategory({
                                    name: e.target.value,
                                    uuid:
                                      String(row.original.medium.value) || '',
                                    type: 'medium',
                                    rowInfo: row.original,
                                  })
                                }
                              />
                            </div>
                            <p className="text-xs text-error">
                              {!row.original.medium.isValid &&
                                !isUUID(row.original.medium.label) &&
                                INVALID_CATEGORY_NAME}
                            </p>
                          </div>
                        ) : (
                          row.original.medium.showBy == 'pulldown' && (
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
                              handleAddMediumCategory('input', row.original)
                            }
                            addCategoryUsingDropdown={() =>
                              handleAddMediumCategory('pulldown', row.original)
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
                      {row.original.small.showBy == 'input' ? (
                        <div className="flex flex-col !h-full w-full">
                          <div className="mb-1 !h-full w-full" ref={inputRef}>
                            <input
                              type="text"
                              className={`w-full !h-full !min-h-[46px] p-2 text-black rounded-[5px] ${!row.original.small.isValid && !isUUID(row.original.small.label) && 'border-red-500'}`}
                              placeholder="新しいカテゴリーを入力"
                              value={
                                newCategory.name !== '' &&
                                newCategory.type == 'small' &&
                                newCategory.rowInfo.id == row.original.id
                                  ? newCategory.name
                                  : !isUUID(row.original.small.label)
                                    ? row.original.small.label
                                    : ''
                              }
                              onChange={(e) =>
                                setNewCategory({
                                  name: e.target.value,
                                  uuid: String(row.original.small.value) || '',
                                  type: 'small',
                                  rowInfo: row.original,
                                })
                              }
                            />
                          </div>
                          <p className="text-xs text-error">
                            {!row.original.small.isValid &&
                              !isUUID(row.original.small.label) &&
                              INVALID_CATEGORY_NAME}
                          </p>
                        </div>
                      ) : (
                        row.original.small.showBy == 'pulldown' && (
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
                            const oldLargeValue = row.original.large.value;
                            const oldMediumValue = row.original.medium.value;
                            const oldSmallValue = row.original.small.value;
                            const matchingHierarchies =
                              hierarchyList.statisticCategories
                                .filter(
                                  (item) =>
                                    item.large.value == oldLargeValue &&
                                    item.medium.value == oldMediumValue &&
                                    item.small.value == oldSmallValue,
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
                                oldLargeValue,
                                oldMediumValue,
                                oldSmallValue,
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
                          handleAddSmallCategory('input', row.original)
                        }
                        addCategoryUsingDropdown={() =>
                          handleAddSmallCategory('pulldown', row.original)
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
                    options={dataOptionsSkill}
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
                addCategoryUsingInput={() => handleAddLargeCategory('input')}
                addCategoryUsingDropdown={() =>
                  handleAddLargeCategory('pulldown')
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
