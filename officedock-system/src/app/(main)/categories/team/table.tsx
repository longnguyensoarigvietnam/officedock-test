import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';

import { Table } from '@components/common/Table';

import { NO_OPTION_CATEGORY } from '@constants';
import { HierarchyType } from '@constants/enums';

import { OrganizationCategoryRow } from '@interfaces/hierarchy';

interface HierarchyDetail {
  id: number | string;
  name: string;
  statisticCategories: OrganizationCategoryRow[];
}

const HierarchyTable = ({
  hierarchyList,
  organizationName,
}: {
  hierarchyList: HierarchyDetail;
  organizationName: string;
}) => {
  const uniqueLargeCount = new Set(
    hierarchyList.statisticCategories.map((item) => item.large.value),
  ).size;
  const uniqueMediumCount = new Set(
    hierarchyList.statisticCategories.map(
      (item) => `${item.large.value}-${item.medium.value}`,
    ),
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

  const findLastUniqueMediumIndexes = (data: OrganizationCategoryRow[]): number[] => {
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

  const findLastUniqueLargeIndexes = (data: OrganizationCategoryRow[]): number[] => {
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

  // Call the function
  const lastLargeIndexes = findLastUniqueLargeIndexes(
    hierarchyList.statisticCategories,
  );

  const lastMediumIndexes = findLastUniqueMediumIndexes(
    hierarchyList.statisticCategories,
  );

  return (
    <div className="w-full p-5 bg-[#F8FAFC] rounded-[30px]" style={{ boxShadow: '0px 4px 10px 0px #0000000D' }}>
      <p className="text-[#77858F] text-[16px] font-medium mb-4 max-w-[100%] break-all">
        {organizationName}
      </p>
      <Table className="w-full h-full bg-white !rounded-[10px]">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header, index) => (
                <th
                  key={header.id}
                  className={`text-[#77858F] ${headerGroup.headers.length - 1 != index && 'border-r-[1px]'} w-1/4 font-medium text-xs py-3`}>
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
            return (
              <tr key={row.id} className="h-[1px]">
                {largeRowspan[rowIndex] > 0 && (
                  <td
                    className={`${table.getRowModel().rows.length - 1 != rowIndex && 'border-b-[1px]'} border-r-[1px] w-[25%] max-w-[25%] break-all border-[#D2DBE1] h-full`}
                    style={{ height: 'inherit' }}
                    rowSpan={largeRowspan[rowIndex]}>
                    <div className="p-3 h-full flex items-center gap-3">
                      <div className="relative">
                        <div
                          className={`w-[14px] h-[14px] rounded-full hover:cursor-pointer`}
                          style={{ backgroundColor: `${row.original.color}` }}
                        />
                      </div>
                      <p className="text-sm flex justify-left items-center font-medium py-4">
                        {row.original.large.label || NO_OPTION_CATEGORY}
                      </p>
                    </div>
                  </td>
                )}
                {mediumRowspan[rowIndex] > 0 && (
                  <td
                    className={`w-[25%] max-w-[25%] break-all px-3 ${lastMediumIndexes.includes(rowIndex) && table.getRowModel().rows.length - 1 != rowIndex && 'border-b-[1px] border-[#D2DBE1]'} border-r-[1px] h-full`}
                    style={{ height: 'inherit' }}
                    rowSpan={mediumRowspan[rowIndex]}>
                    <p
                      className={`text-sm h-full flex justify-left items-center font-medium py-4 ${!lastMediumIndexes.includes(rowIndex) && 'border-b-[1px] border-[#D2DBE1]'} `}>
                      {row.original.medium.label || NO_OPTION_CATEGORY}
                    </p>
                  </td>
                )}
                <td
                  className={`w-[25%] max-w-[25%] break-all px-3 ${lastLargeIndexes.includes(rowIndex) && table.getRowModel().rows.length - 1 != rowIndex && 'border-b-[1px] border-[#D2DBE1]'} border-r-[1px] h-full`}
                  style={{ height: 'inherit' }}>
                  <p
                    className={`text-sm h-full flex justify-left items-center font-medium py-4 ${!lastLargeIndexes.includes(rowIndex) && 'border-b-[1px] border-[#D2DBE1]'} `}>
                    {row.original.small.label || NO_OPTION_CATEGORY}
                  </p>
                </td>
                <td
                  className={`h-full px-3 w-[25%] max-w-[25%] break-all ${lastLargeIndexes.includes(rowIndex) && table.getRowModel().rows.length - 1 != rowIndex && 'border-b-[1px]'} border-l-[1px] border-[#D2DBE1]`}
                  style={{ height: 'inherit' }}>
                  <div
                    className={`flex gap-2 flex-wrap py-4 ${!lastLargeIndexes.includes(rowIndex) && 'border-b-[1px] border-[#D2DBE1]'}`}>
                    {row.original.skills.length > 0 ? (
                      row.original.skills.map((skill) => {
                        return (
                          <div
                            key={skill.value}
                            className="flex items-center justify-center bg-[#77858F] px-[10px] !py-[5px] rounded-[20px]">
                            <p className="text-white text-xs font-medium">
                              {skill.label}
                            </p>
                          </div>
                        );
                      })
                    ) : (
                      <div className="py-[5px]"></div>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </Table>
    </div>
  );
};

export default HierarchyTable;
