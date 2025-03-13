import { Dispatch, SetStateAction, useState } from 'react';
import { v4 as uuidv4, validate as isUUID } from 'uuid';
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';

import { CircleColorPicker } from '@components/common/CircleColorPicker';
import TableDropdown from '@components/common/Dropdown/TableDropdown';
import ImageRound from '@components/common/ImageRound';
import MultiSelect from '@components/common/MultiSelect';
import { Table } from '@components/common/Table';

import { HIERARCHY_COLOR_LIST } from '@constants';
import { OptionDropdownType } from '@interfaces/common';

interface rowDataType {
  id: number | string;
  large: OptionDropdownType;
  medium: OptionDropdownType;
  small: OptionDropdownType;
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

  const lastMediumIndexes = findLastUniqueMediumIndexes(
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
        <span className="font-semibold text-gray-700">スキルの紐付け</span>
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
                  className="text-[#77858F] font-medium text-xs py-3">
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
              <tr key={row.id}>
                {largeRowspan[rowIndex] > 0 && (
                  <td
                    className="border-[1px] w-1/4 border-[#D2DBE1] h-full relative"
                    rowSpan={largeRowspan[rowIndex]}>
                    <div className="absolute p-3 inset-0 flex items-center gap-3">
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

                      <TableDropdown
                        options={[
                          ...categoryList.filter(
                            (option) =>
                              option.value !== row.original.medium.value && // Prevent selecting the same as medium
                              option.value !== row.original.small.value && // Prevent selecting the same as small
                              option.value !== '',
                          ),
                        ]}
                        className="h-full w-full flex-grow !border-[1px] !border-[#77858F]"
                        selectedOption={categoryList.find(
                          (element) =>
                            element.value === row.original.large.value,
                        )}
                        onChange={(e) => {
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
                              largeStatisticCategory: {
                                name: e.label as string,
                                uuid: e.value as string,
                              },
                              mediumStatisticCategory: isUUID(
                                row.original.medium.label as string,
                              )
                                ? null
                                : {
                                    name: row.original.medium.label as string,
                                    uuid: row.original.medium.value as string,
                                  },
                              smallStatisticCategory: isUUID(
                                row.original.small.label as string,
                              )
                                ? null
                                : {
                                    name: row.original.small.label as string,
                                    uuid: row.original.small.value as string,
                                  },
                              color: row.original.color,
                              skillIds: [],
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
                                (hierarchy) =>
                                  hierarchy.id === hierarchyList.id,
                              );

                            if (foundOrganizationHierarchyIndex !== -1) {
                              const statisticCategories =
                                updatedHierarchyList[
                                  foundOrganizationHierarchyIndex
                                ].statisticCategories;

                              const oldLargeValue = row.original.large.value;
                              const newLarge = {
                                label: e.label,
                                value: e.value,
                              };

                              // Separate matching and non-matching rows
                              const matchedRows = statisticCategories
                                .filter(
                                  (item) => item.large.value === oldLargeValue,
                                )
                                .map((item) => ({
                                  ...item,
                                  large: newLarge,
                                }));

                              const remainingRows = statisticCategories.filter(
                                (item) => item.large.value !== oldLargeValue,
                              );

                              // Find the last index where newLarge.value already exists
                              let lastIndex = -1;
                              remainingRows.forEach((item, index) => {
                                if (item.large.value === newLarge.value)
                                  lastIndex = index;
                              });

                              // Insert updated rows right after the last occurrence of newLarge
                              const newStatisticCategories = [...remainingRows];

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
                    className="border-[1px] w-1/4 border-[#D2DBE1] h-full relative"
                    rowSpan={mediumRowspan[rowIndex]}>
                    <div className="absolute p-3 inset-0">
                      <div className="flex items-center h-[calc(100%_-_46px)] mb-3 gap-3">
                        <TableDropdown
                          options={[
                            ...categoryList.filter(
                              (option) =>
                                option.value !== row.original.large.value && // Prevent selecting the same as large
                                option.value !== row.original.small.value && // Prevent selecting the same as small
                                option.value !== '',
                            ),
                          ]}
                          className="h-full w-full flex-grow !border-[1px] !border-[#77858F]"
                          selectedOption={categoryList.find(
                            (element) =>
                              element.value === row.original.medium.value,
                          )}
                          onChange={(e) => {
                            setSelectedHierarchiesToUpdate((prev) => {
                              const updatedHierarchiesToUpdate = [...prev];

                              const existingIndex =
                                updatedHierarchiesToUpdate.findIndex(
                                  (item) =>
                                    item.organizationStatisticCategoryId ===
                                    row.original.id,
                                );

                              const newEntry = {
                                organizationStatisticCategoryId:
                                  row.original.id, // Track creation if null
                                organizationId: hierarchyList.id as number,
                                largeStatisticCategory: isUUID(
                                  row.original.large.label as string,
                                )
                                  ? null
                                  : {
                                      name: row.original.large.label as string,
                                      uuid: row.original.large.value as string,
                                    },
                                mediumStatisticCategory: {
                                  name: e.label as string,
                                  uuid: e.value as string,
                                },
                                smallStatisticCategory: isUUID(
                                  row.original.small.label as string,
                                )
                                  ? null
                                  : {
                                      name: row.original.small.label as string,
                                      uuid: row.original.small.value as string,
                                    },
                                color: row.original.color,
                                skillIds: [],
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
                                statisticCategories: [
                                  ...org.statisticCategories,
                                ],
                              }));

                              const foundOrganizationHierarchyIndex =
                                updatedHierarchyList.findIndex(
                                  (hierarchy) =>
                                    hierarchy.id === hierarchyList.id,
                                );

                              if (foundOrganizationHierarchyIndex !== -1) {
                                const updatedCategories = updatedHierarchyList[
                                  foundOrganizationHierarchyIndex
                                ].statisticCategories.map((hierarchy) =>
                                  hierarchy.large.value ===
                                    row.original.large.value &&
                                  hierarchy.medium.value ===
                                    row.original.medium.value
                                    ? {
                                        ...hierarchy,
                                        medium: {
                                          label: e.label,
                                          value: e.value,
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
                            setHierarchyList((prev) => {
                              const updatedHierarchyList = prev.map((org) => ({
                                ...org,
                                statisticCategories: [
                                  ...org.statisticCategories,
                                ],
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
                      </div>
                      {lastMediumIndexes.includes(rowIndex) && (
                        <div
                          className="flex items-center gap-2 h-[34px] bg-[#ECF0F2] rounded-[6px] py-[4px] px-[10px]"
                          onClick={() => {
                            setHierarchyList((prev) => {
                              // Create a deep copy of the hierarchy list
                              const updatedHierarchyList = prev.map((org) => ({
                                ...org,
                                statisticCategories: [
                                  ...org.statisticCategories,
                                ],
                              }));

                              const foundOrganizationHierarchyIndex =
                                updatedHierarchyList.findIndex(
                                  (hierarchy) =>
                                    hierarchy.id === hierarchyList.id,
                                );

                              if (foundOrganizationHierarchyIndex !== -1) {
                                const newUuid = uuidv4();
                                const newRow = {
                                  id: newUuid,
                                  color: row.original.color,
                                  large: row.original.large,
                                  medium: { label: newUuid, value: newUuid },
                                  small: { label: newUuid, value: newUuid },
                                  skills: [],
                                };

                                const targetOrg =
                                  updatedHierarchyList[
                                    foundOrganizationHierarchyIndex
                                  ];

                                // Find the last index where the same `large` category appears
                                const lastIndex = targetOrg.statisticCategories
                                  .map((item, index) =>
                                    item.large.value ===
                                    row.original.large.value
                                      ? index
                                      : -1,
                                  )
                                  .filter((index) => index !== -1)
                                  .pop(); // Get the last occurrence

                                if (lastIndex !== undefined) {
                                  targetOrg.statisticCategories.splice(
                                    lastIndex + 1,
                                    0,
                                    newRow,
                                  );
                                } else {
                                  targetOrg.statisticCategories.push(newRow);
                                }
                              }

                              return updatedHierarchyList;
                            });
                          }}>
                          <ImageRound
                            className="w-[17px] h-[17px] hover:cursor-pointer"
                            src="/icons/add-category.svg"
                            name="Add category icon"
                          />
                          <p className="text-[#77858F] font-medium text-sm">
                            中カテゴリーを追加
                          </p>
                        </div>
                      )}
                    </div>
                  </td>
                )}
                {smallRowspan[rowIndex] > 0 && (
                  <td
                    className="border-[1px] w-1/4 border-[#D2DBE1] h-full relative p-3"
                    rowSpan={smallRowspan[rowIndex]}>
                    <div className="flex gap-3 mb-3 items-center">
                      <TableDropdown
                        options={[
                          ...categoryList.filter(
                            (option) =>
                              !excludedSmalls.includes(option.value) && // Prevent selecting the same as other rows in the group
                              option.value !== row.original.large.value && // Prevent selecting the same as large
                              option.value !== row.original.medium.value && // Prevent selecting the same as medium
                              option.value !== '',
                          ),
                        ]}
                        className="w-full  !border-[1px] !border-[#77858F]"
                        selectedOption={categoryList.find(
                          (element) =>
                            element.value == row.original.small.value,
                        )}
                        onChange={(e) => {
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
                              largeStatisticCategory: isUUID(
                                row.original.large.label as string,
                              )
                                ? null
                                : {
                                    name: row.original.large.label as string,
                                    uuid: row.original.large.value as string,
                                  },
                              mediumStatisticCategory: isUUID(
                                row.original.medium.label as string,
                              )
                                ? null
                                : {
                                    name: row.original.medium.label as string,
                                    uuid: row.original.medium.value as string,
                                  },
                              smallStatisticCategory: {
                                name: e.label as string,
                                uuid: e.value as string,
                              },
                              color: row.original.color,
                              skillIds: [],
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
                                (hierarchy) =>
                                  hierarchy.id === hierarchyList.id,
                              );

                            if (foundOrganizationHierarchyIndex !== -1) {
                              const updatedCategories = updatedHierarchyList[
                                foundOrganizationHierarchyIndex
                              ].statisticCategories.map((hierarchy) =>
                                hierarchy.id === row.original.id
                                  ? {
                                      ...hierarchy,
                                      small: { label: e.label, value: e.value },
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
                    </div>
                    <div
                      className="flex items-center gap-2 h-[34px] bg-[#ECF0F2] rounded-[6px] py-[4px] px-[10px]"
                      onClick={() => {
                        setHierarchyList((prev) => {
                          // Create a deep copy of the hierarchy list
                          const updatedHierarchyList = prev.map((org) => ({
                            ...org,
                            statisticCategories: [...org.statisticCategories],
                          }));

                          const foundOrganizationHierarchyIndex =
                            updatedHierarchyList.findIndex(
                              (hierarchy) => hierarchy.id === hierarchyList.id,
                            );

                          if (foundOrganizationHierarchyIndex !== -1) {
                            const newUuid = uuidv4();
                            const newRow = {
                              id: newUuid,
                              color: row.original.color,
                              large: row.original.large, // Keep the same large category
                              medium: row.original.medium, // Keep the same medium category
                              small: { label: newUuid, value: newUuid }, // Unique small value
                              skills: [],
                            };

                            const targetOrg =
                              updatedHierarchyList[
                                foundOrganizationHierarchyIndex
                              ];

                            // Find the last index where the same `large` & `medium` category appears
                            const lastIndex = targetOrg.statisticCategories
                              .map((item, index) =>
                                item.large.value === row.original.large.value &&
                                item.medium.value === row.original.medium.value
                                  ? index
                                  : -1,
                              )
                              .filter((index) => index !== -1) // Remove -1 values
                              .pop(); // Get the last occurrence

                            if (lastIndex !== undefined) {
                              targetOrg.statisticCategories.splice(
                                lastIndex + 1,
                                0,
                                newRow,
                              );
                            } else {
                              targetOrg.statisticCategories.push(newRow);
                            }
                          }

                          return updatedHierarchyList;
                        });
                      }}>
                      <ImageRound
                        className="w-[17px] h-[17px] hover:cursor-pointer"
                        src="/icons/add-category.svg"
                        name="Add category icon"
                      />
                      <p className="text-[#77858F] font-medium text-sm">
                        小カテゴリーを追加
                      </p>
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
                          largeStatisticCategory: isUUID(
                            row.original.large.label as string,
                          )
                            ? null
                            : {
                                name: row.original.large.label as string,
                                uuid: row.original.large.value as string,
                              },
                          mediumStatisticCategory: isUUID(
                            row.original.medium.label as string,
                          )
                            ? null
                            : {
                                name: row.original.medium.label as string,
                                uuid: row.original.medium.value as string,
                              },
                          smallStatisticCategory: isUUID(
                            row.original.small.label as string,
                          )
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
              <div
                className="flex items-center gap-2 h-[34px] bg-[#ECF0F2] rounded-[6px] py-[4px] px-[10px]"
                onClick={() => {
                  setHierarchyList((prev) => {
                    const updatedHierarchyList = prev.map((org) => ({
                      ...org,
                      statisticCategories: [...org.statisticCategories],
                    }));

                    const foundOrganizationHierarchyIndex =
                      updatedHierarchyList.findIndex(
                        (hierarchy) => hierarchy.id === hierarchyList.id,
                      );

                    if (foundOrganizationHierarchyIndex !== -1) {
                      const newUuid = uuidv4();
                      const newRow = {
                        id: newUuid,
                        color: HIERARCHY_COLOR_LIST[0],
                        large: { label: newUuid, value: newUuid },
                        medium: { label: newUuid, value: newUuid },
                        small: { label: newUuid, value: newUuid },
                        skills: [],
                      };

                      // Ensure deep immutability
                      updatedHierarchyList[foundOrganizationHierarchyIndex] = {
                        ...updatedHierarchyList[
                          foundOrganizationHierarchyIndex
                        ],
                        statisticCategories: [
                          ...updatedHierarchyList[
                            foundOrganizationHierarchyIndex
                          ].statisticCategories,
                          newRow,
                        ],
                      };
                    }

                    return updatedHierarchyList;
                  });
                }}>
                <ImageRound
                  className="w-[17px] h-[17px] hover:cursor-pointer"
                  src="/icons/add-category.svg"
                  name="Add category icon"
                />
                <p className="text-[#77858F] font-medium text-sm">
                  大カテゴリーを追加
                </p>
              </div>
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
