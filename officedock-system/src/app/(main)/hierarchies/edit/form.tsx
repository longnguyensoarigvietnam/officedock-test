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
import { ServerStatusCode } from '@constants/enums';
import { INVALID_CATEGORY_NAME } from '@constants/message';

import { OptionDropdownType } from '@interfaces/common';

import api from '@base/api';

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
    top: 0,
    left: 0,
  });
  const [isOpen, setIsOpen] = useState(false);

  const handleToggle = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
      });
    }
    setIsOpen((prev) => !prev);
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
            ref={dropdownRef}
            className="fixed bg-[#5B6770] text-white rounded-[6px] w-[252px] py-[5px] text-sm font-medium shadow-lg z-50"
            style={{
              top: `${position.top + 10}px`,
              left: `${position.left}px`,
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
          </div>,
          document.body,
        )}
    </>
  );
};

const TableComponent = ({
  hierarchyList,
  categoryList,
  organizationName,
  dataOptionsSkill,
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
  setHierarchyList: Dispatch<SetStateAction<HierarchyDetail[]>>;
  setSelectedHierarchiesToDelete: Dispatch<
    SetStateAction<string[] | undefined>
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
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [newCategory, setNewCategory] = useState<{
    name: string;
    uuid: string;
    type: string;
    rowInfo: rowDataType;
  }>({
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
    hierarchyList.statisticCategories.map((item) => item.large.value),
  ).size;
  const uniqueMediumCount = new Set(
    hierarchyList.statisticCategories.map(
      (item) => `${item.large.value}-${item.medium.value}`,
    ),
  ).size;
  const uniqueSmallCount = new Set(
    hierarchyList.statisticCategories.map(
      (item) => `${item.large.value}-${item.medium.value}-${item.small.value}`,
    ),
  ).size;

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
    key: 'large' | 'medium' | 'small',
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
  const smallRowspan = processRowspan(
    hierarchyList.statisticCategories,
    'small',
  );

  const getExcludedSmalls = (currentRow: rowDataType) => {
    return hierarchyList.statisticCategories
      .filter(
        (row) =>
          row.id !== currentRow.id &&
          row.large.value === currentRow.large.value &&
          row.medium.value === currentRow.medium.value,
      )
      .map((row) => row.small.value) // ⬅️ Get only small.value
      .filter((value) => value !== '');
  };

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
                mediumStatisticCategory: isUUID(
                  newCategory.rowInfo.medium.label as string,
                )
                  ? null
                  : {
                      name: newCategory.rowInfo.medium.label as string,
                      uuid: newCategory.rowInfo.medium.value as string,
                    },
                smallStatisticCategory: isUUID(
                  newCategory.rowInfo.small.label as string,
                )
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
                largeStatisticCategory: isUUID(
                  newCategory.rowInfo.large.label as string,
                )
                  ? null
                  : {
                      name: newCategory.rowInfo.large.label as string,
                      uuid: newCategory.rowInfo.large.value as string,
                    },
                mediumStatisticCategory: {
                  name: newCategory.name as string,
                  uuid: newCategory.uuid as string,
                },
                smallStatisticCategory: isUUID(
                  newCategory.rowInfo.small.label as string,
                )
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
                  newCategory.rowInfo &&
                  isUUID(newCategory.rowInfo.large.label as string)
                    ? null
                    : {
                        name: newCategory.rowInfo.large.label as string,
                        uuid: newCategory.rowInfo.large.value as string,
                      },
                mediumStatisticCategory:
                  newCategory.rowInfo &&
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

  return (
    <div className="w-full p-5 bg-[#F8FAFC] rounded-[14px]">
      <p className="text-[#77858F] text-[16px] font-medium my-2">
        {organizationName}
      </p>
      <Table className="w-full h-full bg-white !rounded-[6px]">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  className="text-[#77858F] border-r-[1px] font-medium text-xs py-3">
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
                    className="border-[1px] w-1/4 border-[#D2DBE1] h-full"
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
                                        hierarchy.id === row.original.id
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
                              className={`w-full !h-full p-2 text-black rounded-md ${!row.original.large.isValid && !isUUID(row.original.large.label) && 'border-red-500'}`}
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
                            options={[
                              ...categoryList.filter(
                                (option) =>
                                  option.value !== row.original.medium.value && // Prevent selecting the same as medium
                                  option.value !== row.original.small.value && // Prevent selecting the same as small
                                  option.value !== '',
                              ),
                            ]}
                            className="h-full !rounded-[5px] w-full flex-grow !border-[1px] !border-[#77858F]"
                            selectedOption={categoryList.find(
                              (element) =>
                                element.value === row.original.large.value,
                            )}
                            onChange={(e) => {
                              setSelectedHierarchiesToUpdate((prev) => {
                                const updatedHierarchiesToUpdate = [...prev];
                                const statisticCategories =
                                  hierarchyList.statisticCategories;
                                const oldLargeValue = row.original.large.value;
                                const newLarge = {
                                  label: e.label,
                                  value: e.value,
                                  showBy: 'pulldown',
                                  isValid: true,
                                };

                                const matchedRows = statisticCategories
                                  .filter(
                                    (item) =>
                                      item.large.value === oldLargeValue,
                                  )
                                  .map((item) => ({
                                    ...item,
                                    large: newLarge,
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
                                              name: row.medium.label as string,
                                              uuid: row.medium.value as string,
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
                                  const statisticCategories =
                                    updatedHierarchyList[
                                      foundOrganizationHierarchyIndex
                                    ].statisticCategories;

                                  const oldLargeValue =
                                    row.original.large.value;
                                  const newLarge = {
                                    label: e.label,
                                    value: e.value,
                                    showBy: 'pulldown',
                                    isValid: true,
                                  };

                                  // Separate matching and non-matching rows
                                  const matchedRows = statisticCategories
                                    .filter(
                                      (item) =>
                                        item.large.value === oldLargeValue,
                                    )
                                    .map((item) => ({
                                      ...item,
                                      large: newLarge,
                                    }));

                                  const remainingRows =
                                    statisticCategories.filter(
                                      (item) =>
                                        item.large.value !== oldLargeValue,
                                    );

                                  // Find the last index where newLarge.value already exists
                                  let lastIndex = -1;
                                  remainingRows.forEach((item, index) => {
                                    if (item.large.value === newLarge.value)
                                      lastIndex = index;
                                  });

                                  // Insert updated rows right after the last occurrence of newLarge
                                  const newStatisticCategories = [
                                    ...remainingRows,
                                  ];

                                  if (lastIndex !== -1) {
                                    newStatisticCategories.splice(
                                      lastIndex + 1,
                                      0,
                                      ...matchedRows,
                                    );
                                  } else {
                                    newStatisticCategories.push(...matchedRows);
                                  }

                                  // Update hierarchy list
                                  updatedHierarchyList[
                                    foundOrganizationHierarchyIndex
                                  ] = {
                                    ...updatedHierarchyList[
                                      foundOrganizationHierarchyIndex
                                    ],
                                    statisticCategories: newStatisticCategories,
                                  };
                                }

                                return updatedHierarchyList;
                              });
                            }}
                          />
                        )
                      )}

                      <ImageRound
                        name="Delete"
                        src={'/icons/delete-gray.svg'}
                        className="w-[15px] h-[17px] hover:cursor-pointer"
                        onClick={() => {
                          setSelectedHierarchiesToDelete((prev) => {
                            const currentHierarchiesToDelete = [
                              ...(prev || []),
                            ];

                            const matchingHierarchies =
                              hierarchyList.statisticCategories
                                .filter(
                                  (item) =>
                                    item.large.value ===
                                    row.original.large.value,
                                )
                                .map((hierarchy) => String(hierarchy.id)); // Convert IDs to strings

                            return [
                              ...currentHierarchiesToDelete,
                              ...matchingHierarchies,
                            ]; // Spread to avoid nested arrays
                          });
                          setSelectedHierarchiesToUpdate((prev) => {
                            const currentHierarchiesToUpdate = [
                              ...(prev || []),
                            ];

                            return currentHierarchiesToUpdate.filter(
                              (hierarchy) =>
                                hierarchy.largeStatisticCategory?.uuid !=
                                row.original.large.value,
                            );
                          });
                          setHierarchyList((prev) => {
                            const updatedHierarchyList = prev.map((org) => ({
                              ...org,
                              statisticCategories: [...org.statisticCategories],
                            }));

                            const foundOrganizationHierarchyIndex =
                              updatedHierarchyList.findIndex(
                                (hierarchy) =>
                                  hierarchy.id === hierarchyList.id,
                              );

                            if (foundOrganizationHierarchyIndex !== -1) {
                              updatedHierarchyList[
                                foundOrganizationHierarchyIndex
                              ] = {
                                ...updatedHierarchyList[
                                  foundOrganizationHierarchyIndex
                                ],
                                statisticCategories: [
                                  ...updatedHierarchyList[
                                    foundOrganizationHierarchyIndex
                                  ].statisticCategories.filter(
                                    (hierarchy) =>
                                      hierarchy.large.value !=
                                      row.original.large.value,
                                  ),
                                ],
                              };
                            }

                            return updatedHierarchyList;
                          });
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
                                className={`w-full !h-full p-2 text-black rounded-md ${!row.original.medium.isValid && !isUUID(row.original.medium.label) && 'border-red-500'}`}
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
                                options={[
                                  ...categoryList.filter(
                                    (option) =>
                                      option.value !==
                                        row.original.large.value &&
                                      option.value !==
                                        row.original.small.value &&
                                      option.value !== '',
                                  ),
                                ]}
                                className="h-full !rounded-[5px] w-full flex-grow !border-[1px] !border-[#77858F]"
                                selectedOption={categoryList.find(
                                  (element) =>
                                    element.value === row.original.medium.value,
                                )}
                                onChange={(e) => {
                                  setSelectedHierarchiesToUpdate((prev) => {
                                    const updatedHierarchiesToUpdate = [
                                      ...prev,
                                    ];
                                    const statisticCategories =
                                      hierarchyList.statisticCategories;
                                    const oldMediumValue =
                                      row.original.medium.value;
                                    const newMedium = {
                                      label: e.label,
                                      value: e.value,
                                      showBy: 'pulldown',
                                      isValid: true,
                                    };
                                    const matchedRows = statisticCategories
                                      .filter(
                                        (item) =>
                                          item.medium.value ===
                                            oldMediumValue &&
                                          item.large.value ===
                                            row.original.large.value,
                                      )
                                      .map((item) => ({
                                        ...item,
                                        medium: newMedium,
                                      }));

                                    const updatedHierarchies = matchedRows.map(
                                      (row) => {
                                        return {
                                          organizationStatisticCategoryId:
                                            row.id,
                                          organizationId:
                                            hierarchyList.id as number,
                                          largeStatisticCategory:
                                            row.large.label == '' ||
                                            isUUID(row.large.label as string)
                                              ? null
                                              : {
                                                  name: row.large
                                                    .label as string,
                                                  uuid: row.large
                                                    .value as string,
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
                                                  name: row.small
                                                    .label as string,
                                                  uuid: row.small
                                                    .value as string,
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
                                          hierarchy.id == hierarchyList.id,
                                      );

                                    if (
                                      foundOrganizationHierarchyIndex !== -1
                                    ) {
                                      const statisticCategories =
                                        updatedHierarchyList[
                                          foundOrganizationHierarchyIndex
                                        ].statisticCategories;

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
                                            item.medium.value ==
                                              row.original.medium.value &&
                                            item.large.value ==
                                              row.original.large.value,
                                        )
                                        .map((item) => ({
                                          ...item,
                                          medium: newMedium,
                                        }));

                                      const remainingRows =
                                        statisticCategories.filter(
                                          (item) =>
                                            item.medium.value !==
                                            row.original.medium.value,
                                        );

                                      // Find the last index where newMedium.value already exists
                                      let lastIndex = -1;
                                      remainingRows.forEach((item, index) => {
                                        if (
                                          item.medium.value === newMedium.value
                                        )
                                          lastIndex = index;
                                      });

                                      // Insert updated rows right after the last occurrence of newMedium
                                      const newStatisticCategories = [
                                        ...remainingRows,
                                      ];

                                      if (lastIndex !== -1) {
                                        newStatisticCategories.splice(
                                          lastIndex + 1,
                                          0,
                                          ...matchedRows,
                                        );
                                      } else {
                                        newStatisticCategories.push(
                                          ...matchedRows,
                                        );
                                      }

                                      // Update hierarchy list
                                      updatedHierarchyList[
                                        foundOrganizationHierarchyIndex
                                      ] = {
                                        ...updatedHierarchyList[
                                          foundOrganizationHierarchyIndex
                                        ],
                                        statisticCategories:
                                          newStatisticCategories,
                                      };
                                    }

                                    return updatedHierarchyList;
                                  });
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
                            onClick={() => {
                              setSelectedHierarchiesToDelete((prev) => {
                                const currentHierarchiesToDelete = [
                                  ...(prev || []),
                                ];

                                const matchingHierarchies =
                                  hierarchyList.statisticCategories
                                    .filter(
                                      (item) =>
                                        item.large.value ===
                                          row.original.large.value &&
                                        item.medium.value ===
                                          row.original.medium.value,
                                    )
                                    .map((hierarchy) => String(hierarchy.id)); // Convert IDs to strings

                                return [
                                  ...currentHierarchiesToDelete,
                                  ...matchingHierarchies,
                                ]; // Spread to avoid nested arrays
                              });
                              setSelectedHierarchiesToUpdate((prev) => {
                                const currentHierarchiesToUpdate = [
                                  ...(prev || []),
                                ];

                                return currentHierarchiesToUpdate.filter(
                                  (hierarchy) =>
                                    !(
                                      hierarchy.largeStatisticCategory?.uuid ==
                                        row.original.large.value &&
                                      hierarchy.mediumStatisticCategory?.uuid ==
                                        row.original.medium.value
                                    ),
                                );
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
                                  updatedHierarchyList[
                                    foundOrganizationHierarchyIndex
                                  ] = {
                                    ...updatedHierarchyList[
                                      foundOrganizationHierarchyIndex
                                    ],
                                    statisticCategories: [
                                      ...updatedHierarchyList[
                                        foundOrganizationHierarchyIndex
                                      ].statisticCategories.filter(
                                        (hierarchy) =>
                                          !(
                                            hierarchy.large.value ==
                                              row.original.large.value &&
                                            hierarchy.medium.value ==
                                              row.original.medium.value
                                          ),
                                      ),
                                    ],
                                  };
                                }

                                return updatedHierarchyList;
                              });
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
                {smallRowspan[rowIndex] > 0 && (
                  <td
                    className="border-[1px] w-1/4 border-[#D2DBE1]"
                    style={{ height: 'inherit' }}
                    rowSpan={smallRowspan[rowIndex]}>
                    <div className="p-3 flex flex-col !h-[100%]">
                      <div className={`flex items-center mb-3 gap-3`}>
                        {row.original.small.showBy == 'input' ? (
                          <div className="flex flex-col !h-full w-full">
                            <div className="mb-1 !h-full w-full" ref={inputRef}>
                              <input
                                type="text"
                                className={`w-full !h-full p-2 text-black rounded-md ${!row.original.small.isValid && !isUUID(row.original.small.label) && 'border-red-500'}`}
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
                                    uuid:
                                      String(row.original.small.value) || '',
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
                                options={[
                                  ...categoryList.filter(
                                    (option) =>
                                      !excludedSmalls.includes(option.value) && // Prevent selecting the same as other rows in the group
                                      option.value !==
                                        row.original.large.value && // Prevent selecting the same as large
                                      option.value !==
                                        row.original.medium.value && // Prevent selecting the same as medium
                                      option.value !== '',
                                  ),
                                ]}
                                className="w-full !rounded-[5px] !border-[1px] !border-[#77858F]"
                                selectedOption={categoryList.find(
                                  (element) =>
                                    element.value == row.original.small.value,
                                )}
                                onChange={(e) => {
                                  setSelectedHierarchiesToUpdate((prev) => {
                                    const updatedHierarchiesToUpdate = [
                                      ...prev,
                                    ];

                                    const existingIndex =
                                      updatedHierarchiesToUpdate.findIndex(
                                        (item) =>
                                          item.organizationStatisticCategoryId ===
                                          row.original.id,
                                      );

                                    const newEntry = {
                                      organizationStatisticCategoryId:
                                        row.original.id, // Track creation if null
                                      organizationId:
                                        hierarchyList.id as number,
                                      largeStatisticCategory: isUUID(
                                        row.original.large.label as string,
                                      )
                                        ? null
                                        : {
                                            name: row.original.large
                                              .label as string,
                                            uuid: row.original.large
                                              .value as string,
                                          },
                                      mediumStatisticCategory: isUUID(
                                        row.original.medium.label as string,
                                      )
                                        ? null
                                        : {
                                            name: row.original.medium
                                              .label as string,
                                            uuid: row.original.medium
                                              .value as string,
                                          },
                                      smallStatisticCategory: {
                                        name: e.label as string,
                                        uuid: e.value as string,
                                      },
                                      color: row.original.color,
                                      skillIds: row.original.skills.map(
                                        (skill) => Number(skill.value),
                                      ),
                                    };

                                    if (existingIndex !== -1) {
                                      // If it exists, replace it
                                      updatedHierarchiesToUpdate[
                                        existingIndex
                                      ] = newEntry;
                                    } else {
                                      // Otherwise, add it
                                      updatedHierarchiesToUpdate.push(newEntry);
                                    }

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
                                          hierarchy.id == hierarchyList.id,
                                      );

                                    if (
                                      foundOrganizationHierarchyIndex !== -1
                                    ) {
                                      const updatedCategories =
                                        updatedHierarchyList[
                                          foundOrganizationHierarchyIndex
                                        ].statisticCategories.map(
                                          (hierarchy) =>
                                            hierarchy.id === row.original.id
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

                                      updatedHierarchyList[
                                        foundOrganizationHierarchyIndex
                                      ].statisticCategories = updatedCategories;
                                    }

                                    return updatedHierarchyList;
                                  });
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
                            onClick={() => {
                              setSelectedHierarchiesToDelete((prev) => {
                                const currentHierarchiesToDelete = [
                                  ...(prev || []),
                                ];

                                const matchingHierarchies =
                                  hierarchyList.statisticCategories
                                    .filter(
                                      (item) =>
                                        item.large.value ==
                                          row.original.large.value &&
                                        item.medium.value ==
                                          row.original.medium.value &&
                                        item.small.value ==
                                          row.original.small.value,
                                    )
                                    .map((hierarchy) => String(hierarchy.id)); // Convert IDs to strings

                                return [
                                  ...currentHierarchiesToDelete,
                                  ...matchingHierarchies,
                                ]; // Spread to avoid nested arrays
                              });
                              setSelectedHierarchiesToUpdate((prev) => {
                                const currentHierarchiesToUpdate = [
                                  ...(prev || []),
                                ];

                                return currentHierarchiesToUpdate.filter(
                                  (hierarchy) =>
                                    !(
                                      hierarchy.largeStatisticCategory?.uuid ==
                                        row.original.large.value &&
                                      hierarchy.mediumStatisticCategory?.uuid ==
                                        row.original.medium.value &&
                                      hierarchy.smallStatisticCategory?.uuid ==
                                        row.original.small.value
                                    ),
                                );
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
                                  updatedHierarchyList[
                                    foundOrganizationHierarchyIndex
                                  ] = {
                                    ...updatedHierarchyList[
                                      foundOrganizationHierarchyIndex
                                    ],
                                    statisticCategories: [
                                      ...updatedHierarchyList[
                                        foundOrganizationHierarchyIndex
                                      ].statisticCategories.filter(
                                        (hierarchy) =>
                                          !(
                                            hierarchy.large.value ==
                                              row.original.large.value &&
                                            hierarchy.medium.value ==
                                              row.original.medium.value &&
                                            hierarchy.small.value ==
                                              row.original.small.value
                                          ),
                                      ),
                                    ],
                                  };
                                }

                                return updatedHierarchyList;
                              });
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
                )}
                <td className="border-[1px] h-full border-[#D2DBE1] !w-1/4 max-w-[1/4]">
                  <MultiSelect
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
                          organizationStatisticCategoryId: row.original.id, // Track creation if null
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
                    }}
                  />
                </td>
              </tr>
            );
          })}
          <tr>
            <td className="p-3 border-[1px] border-[#D2DBE1]">
              <OptionsBoxToAddCategory
                text={'大カテゴリーを追加'}
                addCategoryUsingInput={() => handleAddLargeCategory('input')}
                addCategoryUsingDropdown={() =>
                  handleAddLargeCategory('pulldown')
                }
              />
            </td>
            <td className="border-[1px] border-[#D2DBE1]"></td>
            <td className="border-[1px] border-[#D2DBE1]"></td>
            <td className="border-[1px] border-[#D2DBE1]"></td>
          </tr>
        </tbody>
      </Table>
    </div>
  );
};

export default TableComponent;
