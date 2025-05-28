import { useContext, useMemo } from 'react';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';

import CustomUserAvatar from '@components/common/AvatarIcon/CustomUserAvatar';
import ImageRound from '@components/common/ImageRound';
import { Table } from '@components/common/Table';
import { SkillInfoPopup } from '@components/skillMap/SkillInfoPopup';

import { SkillMapByMembers, SkillMapSkill } from '@interfaces/skills';

import { GlobalStateContext } from '@providers/GlobalStateProvider';

interface SkillMapByMembersProps {
  skillMapByMembers: SkillMapByMembers;
  dataSkillMapList: SkillMapSkill[];
}

interface DynamicRow {
  id: number;
  fullName: string;
  avatar: string | null;
  avatarColor: string;
  skills: Record<string, {
    isChecked: boolean;
    skillMap: number;
  }>;
}

export const SkillMapByMembersDetail = ({
  skillMapByMembers,
  dataSkillMapList,
}: SkillMapByMembersProps) => {
  const { expanded } = useContext(GlobalStateContext);

  // Declare fixed columns
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const fixedColumns: ColumnDef<DynamicRow, any>[] = [
    {
      accessorKey: 'fullName',
      size: 300,
      header: () => <p className="px-4 text-left">名前</p>,
      cell: ({ row }) => {
        return (
          <div className="flex gap-2 items-center">
            <CustomUserAvatar
              avatarUrl={row.original?.avatar || ''}
              avatarColor={row.original?.avatarColor || ''}
              size={25}
            />
            <p className="text-left max-w-[100%] break-all">
              {row.original.fullName}
            </p>
          </div>
        );
      },
    },
  ];

  // Declare dynamic columns
  const dynamicColumns: ColumnDef<DynamicRow>[] = useMemo(() => {
    if (!skillMapByMembers || skillMapByMembers.users.length === 0) return [];

    const skillKeys = Object.keys(skillMapByMembers.users[0].skills);

    return skillKeys.map((skillId) => ({
      id: skillId,
      size: 200,
      header: () => {
        const orgDetail = dataSkillMapList.find(
          (orgSkill) => orgSkill.id == skillMapByMembers.id,
        );
        if (orgDetail) {
          const foundSkill = orgDetail.skills.find(
            (skill) => skill.id == Number(skillId),
          );
          return (
            <SkillInfoPopup
              skillName={foundSkill ? foundSkill.parentName : ''}
              skillInfo={foundSkill ? foundSkill.detail : []}
            />
          );
        }
      },
      cell: ({ row }) => {
        const skillValue = row.original.skills[skillId].isChecked;
        return (
          <div className="flex justify-center my-3">
            {skillValue ? (
              <ImageRound
                name="Completed"
                src={'/icons/completed.svg'}
                className={`w-4 h-3 hover:cursor-pointer`}
              />
            ) : (
              <div className="bg-[#D2DBE1] w-[16px] h-[2px]"></div>
            )}
          </div>
        );
      },
    }));
  }, [skillMapByMembers, dataSkillMapList]);

  const columns = useMemo(
    () => [...fixedColumns, ...dynamicColumns],
    [fixedColumns, dynamicColumns],
  );

  const table = useReactTable({
    data: skillMapByMembers.users,
    columns: columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div
      className="w-full p-5 bg-[#F8FAFC] rounded-[14px]"
      style={{ boxShadow: '0px 4px 10px 0px #0000000D' }}>
      <p className="text-[#77858F] text-[16px] font-medium mb-4 max-w-[100%] break-all">
        {skillMapByMembers.name}
      </p>

      <div className="w-full">
        <Table
          className={`${expanded ? '!max-w-[calc(100vw_-_350px)]' : '!max-w-[calc(100vw_-_230px)]'} !overflow-x-auto table-auto h-full bg-white !rounded-[6px]`}>
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header, index) => {
                  const isSticky = index === 0;
                  return (
                    <th
                      key={header.id}
                      style={{
                        width: header.getSize(),
                        minWidth: header.getSize(),
                        maxWidth: header.getSize(),
                      }}
                      className={`
                        text-[#77858F] text-xs font-medium py-3 max-w-[100%] truncate 
                        ${index !== headerGroup.headers.length - 1 ? 'border-r-[1px]' : ''}
                        ${isSticky ? 'sticky left-0 z-20 bg-white' : ''}
                      `}>
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row, rowIndex) => {
              const isLastRow =
                rowIndex === table.getRowModel().rows.length - 1;
              const cells = row.getVisibleCells();

              return (
                <tr key={row.id}>
                  {cells.map((cell, colIndex) => {
                    const isFirstCol = colIndex === 0;
                    const isLastCol = colIndex === cells.length - 1;

                    const cellClasses = [
                      'px-4',
                      'py-2',
                      'text-center',
                      'text-sm',
                      'text-[#77858F] border',
                      isFirstCol && 'border-l-0',
                      isLastCol && 'border-r-0',
                      isLastRow && 'border-b-0',
                      isFirstCol && 'sticky left-0 z-20 bg-white',
                    ]
                      .filter(Boolean)
                      .join(' ');

                    return (
                      <td
                        key={cell.id}
                        style={{
                          width: cell.column.getSize(),
                          minWidth: cell.column.getSize(),
                          maxWidth: cell.column.getSize(),
                        }}
                        className={cellClasses}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </Table>
      </div>
    </div>
  );
};
