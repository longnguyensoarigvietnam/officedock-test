import { useState } from 'react';
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';

import Button from '@components/common/Button';
import ImageRound from '@components/common/ImageRound';
import { Table } from '@components/common/Table';

import {
  SkillMapLookBackType,
  SkillMapTypeInterval,
} from '@constants/enums';
import { SKILL_MAP_STEPS } from '@constants';

import {
  OrganizationSkill,
  SkillDataDeleteType,
} from '@interfaces/skills';

interface OrganizationSkillDetailProps {
  orgSkillDetail: OrganizationSkill;
  handleOpenDeleteSkillModal: (skill: SkillDataDeleteType) => void;
  setSelectedFilterStepDetail: React.Dispatch<
    React.SetStateAction<
      | {
          filterStep: string;
          filterOrganizationId: number;
        }
      | undefined
    >
  >;
}

const LevelConditionDetail = ({
  measureCount,
  measureTime,
  lookBackInterval,
  lookBackType,
  items,
}: {
  measureCount: number | null | undefined;
  measureTime: number | null | undefined;
  lookBackInterval: number | null | undefined;
  lookBackType: string | null | undefined;
  items: string[];
}) => {
  let measureConditionText = '';
  const [openItemsDetail, setOpenItemsDetail] = useState<boolean>(false);
  if (measureCount) {
    measureConditionText = `対応タスクを${measureCount}回完了した`;
  } else if (measureTime) {
    measureConditionText = `対応タスクを${measureTime}時間行った`;
  } else {
    let lookBackTypeText = '';
    switch (lookBackType) {
      case SkillMapLookBackType.DAY:
        lookBackTypeText = SkillMapTypeInterval.DAY;
        break;
      case SkillMapLookBackType.WEEK:
        lookBackTypeText = SkillMapTypeInterval.WEEK;
        break;
      case SkillMapLookBackType.MONTH:
        lookBackTypeText = SkillMapTypeInterval.MONTH;
        break;
      case SkillMapLookBackType.YEAR:
        lookBackTypeText = SkillMapTypeInterval.YEAR;
        break;
    }
    measureConditionText = `振り返りの期間${lookBackInterval}${lookBackTypeText}ごと`;
  }
  return (
    <div className="flex flex-col gap-3 w-full">
      <p className="text-xs font-medium text-nowrap">{measureConditionText}</p>
      <div
        className="flex gap-1 hover:cursor-pointer"
        onClick={() => {
          setOpenItemsDetail((prev) => !prev);
        }}>
        <p className="text-[#77858F] text-xs font-medium">振り返り項目を表示</p>
        <ImageRound
          className={`w-4 h-4 opacity-80 ${openItemsDetail && 'rotate-180'}`}
          src={'/icons/arrow-down.svg'}
          name="Arrow down"
        />
      </div>
      {items.length > 0 && openItemsDetail && (
        <div className="flex flex-col gap-2 ml-2">
          {items.map((item, index) => {
            return (
              <div className="flex gap-2 items-center" key={index}>
                <div className="w-1 min-w-1 h-1 bg-black rounded-full"></div>
                <p className="text-xs font-medium max-w-[calc(100%_-_8px)] break-all">
                  {item}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export const OrganizationDeleteSkillDetail = ({
  orgSkillDetail,
  setSelectedFilterStepDetail,
  handleOpenDeleteSkillModal,
}: OrganizationSkillDetailProps) => {
  const [currentStep, setCurrentStep] = useState<number>(1);

  const columns = [
    {
      accessorKey: 'id',
      header: () => <p className="text-center">ID</p>,
    },
    {
      accessorKey: 'name',
      header: () => (
        <div className="flex justify-between px-5">
          <p>スキル名</p>
        </div>
      ),
    },
    {
      accessorKey: 'description',
      header: () => (
        <div className="flex justify-between px-5">
          <p>スキルの定義</p>
        </div>
      ),
    },
    {
      accessorKey: 'level1',
      header: () => (
        <div className="flex gap-1 justify-start px-5 text-nowrap">
          <p className="font-medium text-xs text-primary">レベル1→2</p>
          <p className="font-medium text-xs text-[#77858F]">
            のレベルアップ条件
          </p>
        </div>
      ),
    },
    {
      accessorKey: 'level2',
      header: () => (
        <div className="flex gap-1 justify-start px-5 text-nowrap">
          <p className="font-medium text-xs text-primary">レベル2→3</p>
          <p className="font-medium text-xs text-[#77858F]">
            のレベルアップ条件
          </p>
        </div>
      ),
    },
    {
      accessorKey: 'level3',
      header: () => (
        <div className="flex gap-1 justify-start px-5 text-nowrap">
          <p className="font-medium text-xs text-primary">レベル3→</p>
          <p className="font-medium text-xs text-[#77858F]">
            のレベルアップ条件
          </p>
        </div>
      ),
    },
  ];

  const table = useReactTable({
    data: orgSkillDetail.skills,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div
      className="w-full p-5 bg-white rounded-[30px]"
      style={{ boxShadow: '0px 4px 10px 0px #0000000D' }}>
      <p className="text-[#77858F] text-[16px] font-medium mb-[30px] max-w-[100%] break-all">
        {orgSkillDetail.name}
      </p>

      {/* Buttons */}
      <div className="flex gap-[30px] !w-full mb-[30px]">
        <div className="flex w-fit rounded-[20px] font-medium bg-[#EBF1F7] px-[6px] py-[4px]">
          {SKILL_MAP_STEPS.map((step, index) => {
            const stepNumber = index + 1;
            const isActive = currentStep === stepNumber;
            return (
              <Button
                key={step.label}
                type="button"
                onClick={() => {
                  setCurrentStep(stepNumber);
                  setSelectedFilterStepDetail({
                    filterStep: `ステップ${stepNumber}`,
                    filterOrganizationId: orgSkillDetail.id,
                  });
                }}
                style={
                  isActive
                    ? { background: step.color, color: 'white' }
                    : { color: step.color, background: '#EBF1F7' }
                }
                className="w-[70px] text-center py-[4px] !px-0 border-none !rounded-[20px] text-xs">
                {step.label}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Step information */}
      <Table
        className="w-full h-full bg-white !rounded-[10px] !border-[#BDBDBD]"
        classCustom="!p-0">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header, index) => {
                const isLast = headerGroup.headers.length - 1 === index;
                // assign width classes by index or accessor
                const widthClass = (() => {
                  switch (header.column.id) {
                    case 'id':
                      return 'w-[4%]';
                    case 'name':
                      return 'w-[20%]';
                    case 'description':
                      return 'w-[20%]';
                    case 'level1':
                    case 'level2':
                    case 'level3':
                      return 'w-[18.666667%]';
                    default:
                      return 'w-auto';
                  }
                })();

                return (
                  <th
                    key={header.id}
                    className={`text-[#77858F] bg-[#F3F3F3] text-xs  font-medium py-3 ${widthClass} ${!isLast ? 'border-r-[1px] border-[#BDBDBD]' : ''}`}>
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
            const skillLevel1Detail = row.original.skillLevels.find(
              (level) => level.level == 'レベル1',
            );
            const skillLevel2Detail = row.original.skillLevels.find(
              (level) => level.level == 'レベル2',
            );
            const skillLevel3Detail = row.original.skillLevels.find(
              (level) => level.level == 'レベル3',
            );
            return (
              <tr
                key={row.id}
                className={`${table.getRowModel().rows.length - 1 != rowIndex && 'border-b-[1px] border-b-[#BDBDBD]'} ${rowIndex == 0 && 'border-t border-[#BDBDBD]'}`}>
                <td
                  className={`w-[4%] break-all h-full border-r-[1px] border-r-[#BDBDBD]`}>
                  <p className="text-sm font-medium py-4 text-center">
                    {row.original.id}
                  </p>
                </td>
                <td
                  className={`w-[20%] break-all h-full border-r-[1px] border-r-[#BDBDBD]`}>
                  <div className="flex justify-between">
                    <p className="text-sm flex justify-left items-center font-medium py-4 px-5 max-w-[calc(100%_-_50px)] break-all">
                      {row.original.name}
                    </p>
                    <div className="flex gap-2 items-center w-[25px]">
                      <ImageRound
                        name="Hide"
                        onClick={() => {
                          handleOpenDeleteSkillModal({
                            id: row.original.id,
                            name: row.original.name,
                          });
                        }}
                        src={'/icons/dark-close-eye.svg'}
                        className={`w-[16px] h-[12px] hover:cursor-pointer `}
                      />
                    </div>
                  </div>
                </td>
                <td
                  className={`w-[20%] break-all h-full border-r-[1px] border-r-[#D2DBE1]`}>
                  <p className="text-xs flex justify-left items-center font-medium py-4 px-5">
                    {row.original.description || '-'}
                  </p>
                </td>
                <td
                  className={`w-[18.666667%] break-all h-full border-r-[1px] border-r-[#D2DBE1]`}>
                  <p className="text-sm flex justify-left items-center font-medium py-4 px-5">
                    <LevelConditionDetail
                      measureCount={skillLevel1Detail?.measureCount}
                      measureTime={skillLevel1Detail?.measureTime}
                      lookBackInterval={skillLevel1Detail?.lookBackInterval}
                      lookBackType={skillLevel1Detail?.lookBackType}
                      items={skillLevel1Detail?.items || []}
                    />
                  </p>
                </td>
                <td
                  className={`w-[18.666667%] break-all h-full border-r-[1px] border-r-[#D2DBE1]`}>
                  <p className="text-sm flex justify-left items-center font-medium py-4 px-5">
                    <LevelConditionDetail
                      measureCount={skillLevel2Detail?.measureCount}
                      measureTime={skillLevel2Detail?.measureTime}
                      lookBackInterval={skillLevel2Detail?.lookBackInterval}
                      lookBackType={skillLevel2Detail?.lookBackType}
                      items={skillLevel2Detail?.items || []}
                    />
                  </p>
                </td>
                <td
                  className={`w-[18.666667%] break-all border-[#D2DBE1] h-full`}>
                  <p className="text-sm flex justify-left items-center font-medium py-4 px-5">
                    <LevelConditionDetail
                      measureCount={skillLevel3Detail?.measureCount}
                      measureTime={skillLevel3Detail?.measureTime}
                      lookBackInterval={skillLevel3Detail?.lookBackInterval}
                      lookBackType={skillLevel3Detail?.lookBackType}
                      items={skillLevel3Detail?.items || []}
                    />
                  </p>
                </td>
              </tr>
            );
          })}
        </tbody>
      </Table>
    </div>
  );
};
