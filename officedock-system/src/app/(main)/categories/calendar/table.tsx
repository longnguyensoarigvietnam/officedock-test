import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';

import { Table } from '@components/common/Table';

import { CalendarCategoryRow } from '@interfaces/hierarchy';

import { NO_OPTION_CATEGORY } from '@constants';
import { HierarchyType } from '@constants/enums';

import useCalendarCategory from '@hooks/useCalendarCategory';

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
  const {
    checkIsHiddenCategory,
    findLastUniqueMediumIndexes,
    findLastUniqueLargeIndexes,
  } = useCalendarCategory({ hierarchyDetail });

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
        <div className="flex justify-between px-[18px]">
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

  const lastMediumIndexes = findLastUniqueMediumIndexes(
    hierarchyDetail.statisticCategories,
  );

  const lastLargeIndexes = findLastUniqueLargeIndexes(
    hierarchyDetail.statisticCategories,
  );

  const lastDisplayedMediumIndexes = findLastUniqueMediumIndexes(
    hierarchyDetail.statisticCategories,
    true,
  );

  return (
    <div
      className="w-full p-5 bg-[#F8FAFC] rounded-[30px]"
      style={{ boxShadow: '0px 4px 10px 0px #0000000D' }}>
      <p className="text-[#77858F] text-[16px] font-medium mb-4 max-w-[100%] break-all">
        {hierarchyDetail.name}
      </p>
      <Table className="w-full h-full bg-white !rounded-[10px]">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header, index) => (
                <th
                  key={header.id}
                  className={`text-[#77858F] bg-[#F8FAFC] ${headerGroup.headers.length - 1 != index && 'border-[#D2DBE1] border-r-[1px]'} w-1/2 font-medium text-xs py-3`}>
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
            const rows = table.getRowModel().rows;
            const lastIndex = rows.length - 1;

            const secondLastLargeIndex =
              Array.isArray(lastLargeIndexes) && lastLargeIndexes.length >= 2
                ? lastLargeIndexes[lastLargeIndexes.length - 2]
                : null;

            const isHiddenLargeCategory = checkIsHiddenCategory({
              type: HierarchyType.LARGE,
              originalRow: row.original,
            });
            const isHiddenMediumCategory = checkIsHiddenCategory({
              type: HierarchyType.MEDIUM,
              originalRow: row.original,
            });

            return (
              <tr
                key={row.id}
                style={{
                  height: isHiddenLargeCategory ? '0px' : '1px',
                }}>
                {largeRowspan[rowIndex] > 0 && (
                  <td
                    className={`${
                      lastIndex !== rowIndex &&
                      secondLastLargeIndex !== null &&
                      secondLastLargeIndex + 1 !== rowIndex &&
                      'border-b-[1px]'
                    } border-r-[1px] border-[#D2DBE1] w-1/2 max-w-1/2 break-all h-full !p-0 ${isHiddenLargeCategory && '!border-b-0'}`}
                    style={{
                      height: isHiddenLargeCategory ? '0px' : 'inherit',
                    }}
                    rowSpan={largeRowspan[rowIndex]}>
                    <div
                      className={`pr-[14px] pl-[18px] h-full flex items-center gap-[14px] ${isHiddenLargeCategory && 'hidden'}`}>
                      <div className="relative">
                        <div
                          className={`w-[14px] h-[14px] rounded-full hover:cursor-pointer ${isHiddenLargeCategory && 'hidden'}`}
                          style={{ backgroundColor: `${row.original.color}` }}
                        />
                      </div>
                      {isHiddenLargeCategory ? (
                        <div className="hidden w-full"></div>
                      ) : (
                        <p className="text-sm flex justify-left items-center font-medium py-5">
                          {row.original.large.label || NO_OPTION_CATEGORY}
                        </p>
                      )}
                    </div>
                  </td>
                )}
                {mediumRowspan[rowIndex] > 0 && (
                  <td
                    className={`w-1/2 max-w-1/2 break-all px-[14px] ${lastMediumIndexes.includes(rowIndex) && table.getRowModel().rows.length - 1 != rowIndex && 'border-b-[1px] border-[#D2DBE1]'} h-full !py-0 ${isHiddenLargeCategory && 'hidden'}`}
                    style={{
                      height: isHiddenLargeCategory ? '0px' : 'inherit',
                    }}
                    rowSpan={mediumRowspan[rowIndex]}>
                    {isHiddenMediumCategory ? (
                      <>
                        <div className="hidden w-full"></div>
                      </>
                    ) : (
                      <div
                        className={`flex items-center h-full flex-wrap w-full
                          ${
                            !lastLargeIndexes.includes(rowIndex) &&
                            !lastDisplayedMediumIndexes.includes(rowIndex) &&
                            'border-b-[1px] border-[#D2DBE1]'
                          }  `}>
                        <p
                          className={`text-sm flex justify-left items-center font-medium py-5 leading-[1]`}>
                        {row.original.medium.label || NO_OPTION_CATEGORY}
                        </p>
                      </div>
                    )}
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
