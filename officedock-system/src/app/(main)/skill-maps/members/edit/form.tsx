import { useCallback, useContext, useMemo, useState } from 'react';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';

import CustomUserAvatar from '@components/common/AvatarIcon/CustomUserAvatar';
import { Table } from '@components/common/Table';
import WarningUncheckSkillModal from '@components/modals/WarningUncheckSkillModal';
import CustomSkillMapCheckbox from '@components/common/Checkbox/CustomSkillMapCheckbox';
import { SkillInfoPopup } from '@components/skillMap/SkillInfoPopup';

import { SkillMapByMembers, SkillMapSkill } from '@interfaces/skills';
import { Organizations } from '@interfaces/organization';

import { GlobalStateContext } from '@providers/GlobalStateProvider';

interface SkillMapByMembersProps {
  skillMapByMembers: SkillMapByMembers;
  dataSkillMapList: SkillMapSkill[];
  setSelectedSkillByUserToUpdate: React.Dispatch<
    React.SetStateAction<
      {
        id: number | null;
        skillId: number;
        userId: number;
        isChecked: boolean;
      }[]
    >
  >;
  setDataSkillMapsByMembers: React.Dispatch<
    React.SetStateAction<SkillMapByMembers[]>
  >;
}

interface DynamicRow {
  id: number;
  fullName: string;
  avatar: string | null;
  avatarColor: string;
  organizations: Organizations;
  skills: Record<
    string,
    {
      isChecked: boolean;
      skillMap: number;
    }
  >;
}

export const EditSkillMapByMemberForm = ({
  skillMapByMembers,
  dataSkillMapList,
  setSelectedSkillByUserToUpdate,
  setDataSkillMapsByMembers,
}: SkillMapByMembersProps) => {
  const { expanded } = useContext(GlobalStateContext);
  const [warningUncheckSkillModalOpen, setWarningUncheckSkillModalOpen] =
    useState<boolean>(false);
  const [warningUncheckSkillDetail, setWarningUncheckSkillDetail] = useState<{
    avatarColor: string;
    avatarUrl: string;
    fullName: string;
    skillName: string;
    organizationName: string;
  } | null>(null);
  const [pendingChangeSkillByUser, setPendingChangeSkillByUser] = useState<{
    isChecked: boolean;
    organizationId: number;
    staffId: number;
    skillId: number;
    skillMapId: number | null;
  } | null>(null);

  const handleChangeSkillByUser = useCallback(
    (changeSkillProps: {
      isChecked: boolean;
      organizationId: number;
      staffId: number;
      skillId: number;
      skillMapId: number | null;
    }) => {
      setSelectedSkillByUserToUpdate((prev) => {
        const currentSelectedSkillByUserToUpdate = [...prev];
        const foundSelectedSkillIndex =
          currentSelectedSkillByUserToUpdate.findIndex(
            (skill) =>
              skill.id == changeSkillProps.skillMapId &&
              skill.skillId == changeSkillProps.skillId &&
              skill.userId == changeSkillProps.staffId,
          );
        if (foundSelectedSkillIndex != -1) {
          currentSelectedSkillByUserToUpdate[
            foundSelectedSkillIndex
          ].isChecked = changeSkillProps.isChecked;
          return currentSelectedSkillByUserToUpdate;
        } else {
          return [
            ...currentSelectedSkillByUserToUpdate,
            {
              id: changeSkillProps.skillMapId,
              isChecked: changeSkillProps.isChecked,
              skillId: changeSkillProps.skillId,
              userId: changeSkillProps.staffId,
            },
          ];
        }
      });
      setPendingChangeSkillByUser(null);
      setDataSkillMapsByMembers((prev) => {
        return prev.map((org) => {
          if (org.id !== changeSkillProps.organizationId) return org;

          return {
            ...org,
            users: org.users.map((user) => {
              if (user.id !== changeSkillProps.staffId) return user;

              const existingSkill = user.skills[changeSkillProps.skillId];

              return {
                ...user,
                skills: {
                  ...user.skills,
                  [changeSkillProps.skillId]: {
                    ...existingSkill,
                    isChecked: changeSkillProps.isChecked,
                  },
                },
              };
            }),
          };
        });
      });
    },
    [setSelectedSkillByUserToUpdate, setDataSkillMapsByMembers],
  );

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

  const dynamicColumns: ColumnDef<DynamicRow>[] = useMemo(() => {
    if (!skillMapByMembers || skillMapByMembers.users.length === 0) return [];

    const skillKeys = Object.keys(skillMapByMembers.users[0].skills);
    const orgDetail = dataSkillMapList.find(
      (orgSkill) => orgSkill.id == skillMapByMembers.id,
    );

    return skillKeys.map((skillId) => ({
      id: skillId,
      size: 200,
      header: () => {
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
        const foundSkill = orgDetail
          ? orgDetail.skills.find((skill) => skill.id == Number(skillId))
          : null;
        return (
          <div className="flex justify-center my-3">
            <CustomSkillMapCheckbox
              isChecked={skillValue}
              className="!w-4"
              onClick={(e: any) => {
                e.preventDefault();
                if (skillValue) {
                  setWarningUncheckSkillModalOpen(true);
                  setWarningUncheckSkillDetail({
                    avatarColor: row.original.avatarColor || '',
                    avatarUrl: row.original?.avatar || '',
                    fullName: row.original.fullName,
                    skillName: foundSkill ? foundSkill.parentName : '',
                    organizationName: row.original?.organizations?.name || '',
                  });
                  setPendingChangeSkillByUser({
                    isChecked: false,
                    organizationId: skillMapByMembers.id,
                    staffId: row.original.id,
                    skillId: Number(skillId),
                    skillMapId: row.original.skills[skillId].skillMap ? Number(row.original.skills[skillId].skillMap) : null,
                  });
                } else {
                  handleChangeSkillByUser({
                    isChecked: true,
                    organizationId: skillMapByMembers.id,
                    staffId: row.original.id,
                    skillId: Number(skillId),
                    skillMapId: row.original.skills[skillId].skillMap ? Number(row.original.skills[skillId].skillMap) : null,
                  });
                }
              }}
            />
          </div>
        );
      },
    }));
  }, [skillMapByMembers, dataSkillMapList, handleChangeSkillByUser]);

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
      {warningUncheckSkillModalOpen && pendingChangeSkillByUser && (
        <WarningUncheckSkillModal
          open={warningUncheckSkillModalOpen}
          warningUncheckSkillDetail={warningUncheckSkillDetail}
          onClose={() => {
            setWarningUncheckSkillModalOpen(false);
            setPendingChangeSkillByUser(null);
          }}
          onConfirm={() => {
            setWarningUncheckSkillModalOpen(false);
            handleChangeSkillByUser(pendingChangeSkillByUser!);
          }}
        />
      )}
    </div>
  );
};
