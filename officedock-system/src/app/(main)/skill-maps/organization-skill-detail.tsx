import { useSessionCache } from '@providers/SessionCacheProvider';

import { useContext, useEffect, useRef, useState } from 'react';
import { useMutation } from 'react-query';
import { AxiosError } from 'axios';
import { useForm } from 'react-hook-form';
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';

import Button from '@components/common/Button';
import ImageRound from '@components/common/ImageRound';
import Input from '@components/common/Input';
import { Table } from '@components/common/Table';

import {
  ActionsModal,
  PermissionsSystem,
  ScreenName,
  SkillMapLookBackType,
  SkillMapTypeInterval,
} from '@constants/enums';
import {
  ERROR_UPDATE_MESSAGE,
  SUCCESS_UPDATE_MESSAGE,
} from '@constants/message';
import { apiRouters } from '@constants/routers';
import { SKILL_MAP_STEPS } from '@constants';

import { useErrorToast } from '@hooks/useErrorToast';
import {
  OrganizationDefineSteps,
  OrganizationSkill,
  SkillDataDeleteType,
} from '@interfaces/skills';

import { LoadingContext } from '@providers/LoadingProvider';
import { useToast } from '@providers/ToastProvider';

import { hasPermissionInArray } from '@utils';

import api from '@base/api';

interface OrganizationSkillDetailProps {
  isMyOrg?: boolean;
  orgSkillDetail: OrganizationSkill;
  handleOpenDeleteSkillModal: (skill: SkillDataDeleteType) => void;
  setOpenSkillMapActionsModal: React.Dispatch<React.SetStateAction<boolean>>;
  setSelectedFilterStepDetail: React.Dispatch<
    React.SetStateAction<
      | {
          filterStep: string;
          filterOrganizationId: number;
        }
      | undefined
    >
  >;
  setSelectedSkillMapToUpdate: React.Dispatch<
    React.SetStateAction<number | null | undefined>
  >;
  handleSetParam: ({
    id,
    action,
    step,
    organization,
  }: {
    id?: string | null;
    action?: string | null;
    step?: number | null;
    organization?: number | null;
  }) => void;
  refetchOrganizationSkillList: any;
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

export const OrganizationSkillDetail = ({
  orgSkillDetail,
  setOpenSkillMapActionsModal,
  setSelectedFilterStepDetail,
  setSelectedSkillMapToUpdate,
  handleSetParam,
  refetchOrganizationSkillList,
  handleOpenDeleteSkillModal,
}: OrganizationSkillDetailProps) => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isEditStepDefinitionMode, setIsEditStepDefinitionMode] =
    useState<boolean>(false);

  const { data: session } = useSessionCache();
  const { setIsLoading } = useContext(LoadingContext);
  const showErrorToast = useErrorToast();
  const { showToast } = useToast();

  const stepDefinitionBoxRef = useRef<HTMLDivElement | null>(null);
  const isEditingRef = useRef(false);

  const { register, watch, reset } = useForm<OrganizationDefineSteps>({
    mode: 'onSubmit',
  });

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

  // Edit step definitions
  const handleConfirmEditStepDefinitions = (data: OrganizationDefineSteps) => {
    const isChanged =
      orgSkillDetail.steps.step1 != watch('defineStep1') ||
      orgSkillDetail.steps.step2 != watch('defineStep2') ||
      orgSkillDetail.steps.step3 != watch('defineStep3');
    if (isChanged) {
      editStepDefinitions(data);
    } else {
      setIsEditStepDefinitionMode(false);
      isEditingRef.current = false;
    }
  };

  const handleEditSkillMap = async (data: OrganizationDefineSteps) => {
    setIsLoading(true);
    return await api.post(
      `${apiRouters.ORGANIZATION_DEFINE_STEPS(orgSkillDetail.id)}?screen_name=${ScreenName.SKILL_MAP_MANAGEMENT}`,
      data,
    );
  };

  const { mutate: editStepDefinitions } = useMutation(
    'editStepDefinitions',
    handleEditSkillMap,
    {
      onMutate: () => {
        isEditingRef.current = true;
      },
      onSuccess: async () => {
        setIsEditStepDefinitionMode(false);
        showToast({
          description: SUCCESS_UPDATE_MESSAGE,
        });
        refetchOrganizationSkillList();
        isEditingRef.current = false;
      },
      onError: (error: AxiosError<any>) => {
        showErrorToast(error, ERROR_UPDATE_MESSAGE);
        isEditingRef.current = false;
      },
      onSettled: () => {
        setIsLoading(false);
      },
    },
  );

  // Handle call API when click outside
  useEffect(() => {
    const handleClickOutside = (event: any) => {
      if (
        isEditStepDefinitionMode &&
        stepDefinitionBoxRef.current &&
        !stepDefinitionBoxRef.current.contains(event.target) &&
        !isEditingRef.current
      ) {
        handleConfirmEditStepDefinitions({
          defineStep1: watch('defineStep1') || null,
          defineStep2: watch('defineStep2') || null,
          defineStep3: watch('defineStep3') || null,
        });
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditStepDefinitionMode]);

  return (
    <div
      className="w-full p-5 bg-[#F8FAFC] rounded-[30px]"
      style={{ boxShadow: '0px 4px 10px 0px #0000000D' }}>
      <p className="text-[#77858F] text-[16px] font-medium mb-[30px] max-w-[100%] break-all">
        {orgSkillDetail.name}
      </p>

      {/* Step definitions */}
      {isEditStepDefinitionMode ? (
        <div
          className="border-[1px] border-[#D2DBE1] bg-white flex w-full py-[15px] pl-[14px] pr-[19px] mb-7 gap-5 items-center rounded-[6px]"
          ref={stepDefinitionBoxRef}>
          <div className="flex gap-5 w-[calc(100%_-_34px)]">
            <div className="flex gap-2 items-center w-1/3">
              <p className="bg-[#3DC1E2] text-white rounded-[20px] w-[70px] h-[24px] flex items-center justify-center text-xs">
                STEP 1
              </p>
              <div className="!w-full">
                <Input
                  className={`shadow-none text-sm leading-[56px] !pl-3 flex items-center !py-0 h-[34px] !w-full focus:!shadow-none focus:border !border-[1px] !border-[#77858F] rounded-md`}
                  defaultValue={orgSkillDetail.steps.step1}
                  register={register('defineStep1')}
                />
              </div>
            </div>
            <div className="flex gap-2 items-center w-1/3">
              <p className="bg-primary text-white rounded-[20px] w-[70px] h-[24px] flex items-center justify-center text-xs">
                STEP 2
              </p>
              <div className="!w-full">
                <Input
                  className={`shadow-none text-sm leading-[56px] !pl-3 flex items-center !py-0 h-[34px] !w-full focus:!shadow-none focus:border !border-[1px] !border-[#77858F] rounded-md`}
                  defaultValue={orgSkillDetail.steps.step2}
                  register={register('defineStep2')}
                />
              </div>
            </div>
            <div className="flex gap-2 items-center w-1/3">
              <p className="bg-[#355AC9] text-white rounded-[20px] w-[70px] h-[24px] flex items-center justify-center text-xs">
                STEP 3
              </p>
              <div className="!w-full">
                <Input
                  className={`shadow-none text-sm leading-[56px] !pl-3 flex items-center !py-0 h-[34px] !w-full focus:!shadow-none focus:border !border-[1px] !border-[#77858F] rounded-md`}
                  defaultValue={orgSkillDetail.steps.step3}
                  register={register('defineStep3')}
                />
              </div>
            </div>
          </div>
          <ImageRound
            name="Edit"
            src={'/icons/edit-gray.svg'}
            className="w-3.5 h-3.5 hover:cursor-pointer edit-icon"
            onClick={() => {
              if (!isEditingRef.current) {
                handleConfirmEditStepDefinitions({
                  defineStep1: watch('defineStep1') || null,
                  defineStep2: watch('defineStep2') || null,
                  defineStep3: watch('defineStep3') || null,
                });
              }
            }}
          />
        </div>
      ) : (
        <div className="border-[1px] border-[#D2DBE1] bg-white flex w-full py-[15px] pl-[14px] pr-[19px] mb-7 gap-5 items-center rounded-[6px]">
          <div className="flex gap-5 w-[calc(100%_-_34px)]">
            <div className="flex gap-2 items-center max-w-[33.3%] min-w-0">
              <p className="bg-[#3DC1E2] text-white rounded-[20px] w-[70px] h-[24px] flex items-center justify-center text-xs">
                STEP 1
              </p>
              <p className="text-sm font-normal max-w-[calc(100%_-_70px)] break-all">
                {orgSkillDetail.steps.step1}
              </p>
            </div>
            <div className="flex gap-2 items-center max-w-[33.3%] min-w-0">
              <p className="bg-primary text-white rounded-[20px] w-[70px] h-[24px] flex items-center justify-center text-xs">
                STEP 2
              </p>
              <p className="text-sm font-normal max-w-[calc(100%_-_70px)] break-all">
                {orgSkillDetail.steps.step2}
              </p>
            </div>
            <div className="flex gap-2 items-center max-w-[33.3%] min-w-0">
              <p className="bg-[#355AC9] text-white rounded-[20px] w-[70px] h-[24px] flex items-center justify-center text-xs">
                STEP 3
              </p>
              <p className="text-sm font-normal max-w-[calc(100%_-_70px)] break-all">
                {orgSkillDetail.steps.step3}
              </p>
            </div>
          </div>
          <ImageRound
            name="Edit"
            src={'/icons/edit-gray.svg'}
            className="w-3.5 h-3.5 hover:cursor-pointer opacity-45 hover:opacity-100"
            onClick={() => {
              setIsEditStepDefinitionMode(true);
              reset({
                defineStep1: orgSkillDetail.steps.step1,
                defineStep2: orgSkillDetail.steps.step2,
                defineStep3: orgSkillDetail.steps.step3,
              });
            }}
          />
        </div>
      )}

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
        {session?.user.permissions &&
          hasPermissionInArray(
            session?.user.permissions,
            PermissionsSystem.SKILL_MAP_MANAGEMENT_ADD,
          ) && (
            <Button
              className="w-[100px] h-[30px] !text-sm !text-nowrap !text-white border-none"
              style={{ boxShadow: '0px 1px 5px 0px #00000033' }}
              onClick={() => {
                setOpenSkillMapActionsModal(true);
                handleSetParam({
                  action: ActionsModal.CREATE,
                  organization: orgSkillDetail.id,
                });
              }}>
              <ImageRound
                src="/icons/add-with-background.svg"
                name="Add icon"
                className="!w-4 !h-4 text-gray-400 cursor-pointer text-sm mr-2"
              />
              新規追加
            </Button>
          )}
      </div>

      {/* Step information */}
      <Table
        className="w-full h-full bg-white !rounded-[10px]"
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
                    className={`text-[#77858F] bg-[#F8FAFC] text-xs font-medium py-3 ${widthClass} ${!isLast ? 'border-r-[1px]' : ''}`}>
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
                className={`${table.getRowModel().rows.length - 1 != rowIndex && 'border-b-[1px] border-b-[#D2DBE1]'}`}>
                <td
                  className={`w-[4%] break-all h-full border-r-[1px] border-r-[#D2DBE1]`}>
                  <p className="text-sm font-medium py-4 text-center">
                    {row.original.id}
                  </p>
                </td>
                <td
                  className={`w-[20%] break-all h-full border-r-[1px] border-r-[#D2DBE1]`}>
                  <div className="flex justify-between">
                    <p className="text-sm flex justify-left items-center font-medium py-4 px-5 max-w-[calc(100%_-_50px)] break-all">
                      {row.original.name}
                    </p>
                    <div className="flex gap-2 items-center w-[50px]">
                      <ImageRound
                        name="Edit"
                        src={'/icons/edit-gray.svg'}
                        className="w-3.5 h-3.5 hover:cursor-pointer opacity-45"
                        onClick={() => {
                          handleSetParam({
                            action: ActionsModal.EDIT,
                            id: String(row.original.id),
                            step: currentStep,
                            organization: orgSkillDetail.id,
                          });
                          setSelectedSkillMapToUpdate(row.original.id);
                        }}
                      />
                      <ImageRound
                        name="Hide"
                        onClick={() => {
                          handleOpenDeleteSkillModal({
                            id: row.original.id,
                            name: row.original.name,
                          });
                        }}
                        src={'/icons/eye.svg'}
                        className="w-[16px] h-[12px] hover:cursor-pointer"
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
