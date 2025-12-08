import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';

import { Table } from '@components/common/Table';

import { NO_OPTION_CATEGORY } from '@constants';
import { HierarchyType } from '@constants/enums';

import { OrganizationCategoryRow } from '@interfaces/hierarchy';

import useTeamCategory from '@hooks/useTeamCategory';

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
  const {
    checkIsHiddenCategory,
    findLastUniqueLargeIndexes,
    findLastUniqueMediumIndexes,
    findLastSmallInEachLarge,
    findLastDisplayedSmallInEachLarge,
  } = useTeamCategory({ hierarchyList });

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

  // Call the function
  const lastLargeIndexes = findLastUniqueLargeIndexes(
    hierarchyList.statisticCategories,
  );

  const lastMediumIndexes = findLastUniqueMediumIndexes(
    hierarchyList.statisticCategories,
  );

  const lastDisplayedMediumIndexesInEachLarge = findLastUniqueMediumIndexes(
    hierarchyList.statisticCategories,
    true,
  );

  const lastSmallIndexesInEachLarge = findLastSmallInEachLarge(
    hierarchyList.statisticCategories,
  );

  const lastDisplayedSmallIndexesInEachLarge =
    findLastDisplayedSmallInEachLarge(hierarchyList.statisticCategories);

  return (
    <div
      className="w-full p-5 bg-[#F8FAFC] rounded-[30px]"
      style={{ boxShadow: '0px 4px 10px 0px #0000000D' }}>
      <p className="text-[#77858F] text-[16px] font-medium mb-4 max-w-[100%] break-all">
        {organizationName}
      </p>
      <Table className="w-full h-full bg-white !rounded-[10px]" tableClassName="!w-full !table-fixed">
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
            const rows = table.getRowModel().rows;
            const lastIndex = rows.length - 1;
            const secondLastLargeIndex =
              Array.isArray(lastLargeIndexes) && lastLargeIndexes.length >= 2
                ? lastLargeIndexes[lastLargeIndexes.length - 2]
                : null;

            return (
              <tr
                key={row.id}
                style={{
                  height: isHiddenLargeCategory ? '0px' : '1px',
                }}>
                {largeRowspan[rowIndex] > 0 && (
                  <td
                    className={`!w-1/4 h-full border-r-[1px] border-[#D2DBE1] !p-0`}
                    style={{
                      height: isHiddenLargeCategory ? '0px' : 'inherit',
                    }}
                    rowSpan={largeRowspan[rowIndex]}>
                    <div
                      className={`pr-[14px] pl-[18px] py-5 h-full flex items-center gap-[14px] ${isHiddenLargeCategory && 'hidden'} 
                      ${lastIndex !== rowIndex &&
                        secondLastLargeIndex !== null &&
                        secondLastLargeIndex + 1 !== rowIndex &&
                        'border-b-[1px]'
                        } border-[#D2DBE1] ${isHiddenLargeCategory && '!border-b-0'}`}>
                      <div
                        className={`w-[14px] min-w-[14px] h-[14px] rounded-full hover:cursor-pointer ${isHiddenLargeCategory && 'hidden'}`}
                        style={{ backgroundColor: `${row.original.color}` }}
                      />
                      {isHiddenLargeCategory ? (
                        <div className="hidden w-full"></div>
                      ) : (
                        <p className="text-sm max-w-full break-all font-medium">
                          {row.original.large.label || NO_OPTION_CATEGORY}
                        </p>
                      )}
                    </div>
                  </td>
                )}
                {mediumRowspan[rowIndex] > 0 && (
                  <td
                    className={`w-1/4 !p-0`}
                    style={{
                      height: isHiddenLargeCategory ? '0px' : 'inherit',
                    }}
                    rowSpan={mediumRowspan[rowIndex]}>
                    <div
                      className={`${!lastMediumIndexes.includes(rowIndex) ? 'mx-[14px]' : 'px-[14px]'} flex flex-col !h-full ${isHiddenMediumCategory && '!p-0'} ${(!isHiddenMediumCategory &&
                        !lastDisplayedMediumIndexesInEachLarge.includes(
                          rowIndex,
                        ) &&
                        !lastMediumIndexes
                          .slice(0, lastMediumIndexes.length - 1)
                          .includes(rowIndex)) ||
                        (lastMediumIndexes.includes(rowIndex) &&
                          lastDisplayedMediumIndexesInEachLarge.at(-1) !=
                          rowIndex)
                        ? 'border-b-[1px] border-[#D2DBE1]'
                        : ''
                        } ${isHiddenLargeCategory && isHiddenMediumCategory ? '!border-0' : ''}`}>
                      {isHiddenMediumCategory ? (
                        <>
                          <div className="hidden w-full"></div>
                        </>
                      ) : (
                        <div
                          className={`flex items-center h-full gap-2 flex-wrap w-full py-5
                            `}>
                          <p className="text-sm max-w-full break-all font-medium">
                            {row.original.medium.label || NO_OPTION_CATEGORY}
                          </p>
                        </div>
                      )}
                    </div>
                  </td>
                )}
                <td
                  className={`w-1/4 !p-0 border-x-[1px] border-[#D2DBE1]`}
                  style={{
                    height: isHiddenLargeCategory ? '0px' : 'inherit',
                  }}>
                  <div className={`!h-full ${lastSmallIndexesInEachLarge.slice(0, lastSmallIndexesInEachLarge.length - 1).includes(rowIndex) && 'border-b-[1px] border-[#D2DBE1]'} ${isHiddenLargeCategory && 'hidden'} px-[14px]`}>
                    {isHiddenSmallCategory ? (
                      <>
                        <div className="hidden w-full"></div>
                      </>
                    ) : (
                      <div
                        className={`flex items-center h-full gap-2 flex-wrap py-5 
                        ${!lastLargeIndexes.includes(rowIndex) &&
                          !lastDisplayedSmallIndexesInEachLarge.includes(
                            rowIndex,
                          ) &&
                          'border-b-[1px] border-[#D2DBE1]'
                          }`}>
                        <p className="text-sm max-w-full break-all font-medium">
                          {row.original.small.label || NO_OPTION_CATEGORY}
                        </p>
                      </div>
                    )}
                  </div>
                </td>
                <td
                  className={`align-top !p-0 !w-1/4 max-w-[1/4]`}
                  style={{
                    height: isHiddenLargeCategory ? '0px' : 'inherit',
                  }}>
                  <div className={`!h-full ${lastSmallIndexesInEachLarge.slice(0, lastSmallIndexesInEachLarge.length - 1).includes(rowIndex) && 'border-b-[1px] border-[#D2DBE1]'} ${isHiddenLargeCategory && 'hidden'} px-[14px]`}>
                    {isHiddenSmallCategory ? (
                      <div className="hidden w-full"></div>
                    ) : (
                      <div
                        className={`flex items-center h-full gap-2 flex-wrap py-4 
                        ${!lastLargeIndexes.includes(rowIndex) &&
                          !lastDisplayedSmallIndexesInEachLarge.includes(
                            rowIndex,
                          ) &&
                          'border-b-[1px] border-[#D2DBE1]'
                          }`}>
                        {row.original.skills.length > 0 ? (
                          row.original.skills.map((skill) => {
                            return (
                              <div
                                key={skill.value}
                                className="flex items-center justify-center bg-[#77858F] !h-fit min-w-[35px] px-[10px] !py-[5px] rounded-[20px]">
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
