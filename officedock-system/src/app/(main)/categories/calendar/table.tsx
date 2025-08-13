import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';

import { Table } from '@components/common/Table';

import { CalendarCategoryRow } from '@interfaces/hierarchy';

import { NO_OPTION_CATEGORY } from '@constants';
import { HierarchyType } from '@constants/enums';

interface HierarchyDetail {
  id: number | string;
  name: string;
  statisticCategories: CalendarCategoryRow[];
}

const HierarchyTable = ({
  hierarchyDetail,
}: {
  hierarchyDetail: HierarchyDetail;
}) => {
  const uniqueLargeCount = new Set(
    hierarchyDetail.statisticCategories.map((item) => item.large.value),
  ).size;
  const uniqueMediumCount = new Set(
    hierarchyDetail.statisticCategories.map(
      (item) => `${item.large.value}-${item.medium.value}`,
    ),
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
    hierarchyDetail.statisticCategories,
    HierarchyType.LARGE,
  );
  const mediumRowspan = processRowspan(
    hierarchyDetail.statisticCategories,
    HierarchyType.MEDIUM,
  );

  const findLastUniqueMediumIndexes = (data: CalendarCategoryRow[]): number[] => {
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

  return (
    <div className="w-full p-5 bg-[#F8FAFC] rounded-[30px]" style={{ boxShadow: '0px 4px 10px 0px #0000000D' }}>
      <p className="text-[#77858F] text-[16px] font-medium mb-4 max-w-[100%] break-all">
        {hierarchyDetail.name}
      </p>
      <Table className="w-full h-full bg-white !rounded-[10px]">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  className={`text-[#77858F] bg-[#F8FAFC] border-[1px] w-1/2 font-medium text-xs py-3`}>
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
                    className={`border-[1px] w-1/2 max-w-1/2 break-all border-[#D2DBE1] h-full`}
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
                    className={`w-1/2 max-w-1/2 break-all px-3 border-[#D2DBE1] ${lastMediumIndexes.includes(rowIndex) ? 'border-b-[1px] border-x-[1px]' : 'border-x-[1px]'} h-full`}
                    style={{ height: 'inherit' }}
                    rowSpan={mediumRowspan[rowIndex]}>
                    <p
                      className={`text-sm h-full flex justify-left items-center font-medium py-4 ${!lastMediumIndexes.includes(rowIndex) && 'border-b-[1px] border-[#D2DBE1]'} `}>
                      {row.original.medium.label || NO_OPTION_CATEGORY}
                    </p>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </Table>
    </div>
  );
};

export default HierarchyTable;
