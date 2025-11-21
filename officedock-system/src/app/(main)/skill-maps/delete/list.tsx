'use client';
import { useMutation } from 'react-query';
import React, {
  Fragment,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { AxiosError } from 'axios';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSessionCache } from '@providers/SessionCacheProvider';

import Link from 'next/link';

import Button from '@components/common/Button';
import ActionsSkillMapModal, {
  ActionsSkillMapModalRef,
} from '@components/modals/ActionsSkillMapModal';
import Dropdown from '@components/common/Dropdown';
import ConfirmRestoreModal from '@components/modals/ConfirmRestoreModal';
import ImageRound from '@components/common/ImageRound';

import { apiRouters, pageRouters } from '@constants/routers';
import {
  ERROR_COMMON_MESSAGE,
  ERROR_CREATE_MESSAGE,
  ERROR_RESTORE_MESSAGE,
  ERROR_UPDATE_MESSAGE,
  PLEASE_FILL_IN_STEP_2,
  SUCCESS_CREATE_MESSAGE,
  SUCCESS_RESTORE_MESSAGE,
  SUCCESS_UPDATE_MESSAGE,
} from '@constants/message';
import {
  PermissionsSystem,
  ServerStatusCode,
  SkillMapStep,
} from '@constants/enums';
import { ALL_TEAMS_OPTION, NO_SETTING } from '@constants';

import { LoadingContext } from '@providers/LoadingProvider';
import { useToast } from '@providers/ToastProvider';

import {
  OrganizationSkill,
  OrganizationSkillMapDetail,
  SkillDataDeleteType,
  SkillMapFormData,
  SkillMapRequestData,
  StepFormDataDetail,
  StepRequestDataDetail,
} from '@interfaces/skills';
import { OptionDropdownType } from '@interfaces/common';

import { useErrorToast } from '@hooks/useErrorToast';
import useOrganizationSkillList from '@hooks/useOrganizationSkillList';
import useOrganizationSkillMapDetail from '@hooks/useOrganizationSkillDetail';
import useCreationDataCommon from '@hooks/common/useCreationDataCommon';

import { hasPermissionInArray } from '@utils';

import api from '@base/api';
import { OrganizationDeleteSkillDetail } from './organization-delete-detail';

const ListSkillsMapDelete = () => {
  const { setIsLoading } = useContext(LoadingContext);
  const showErrorToast = useErrorToast();
  const { data: session } = useSessionCache();
  const { showToast } = useToast();
  const modalRef = useRef<ActionsSkillMapModalRef>(null);

  // Router
  const searchParams = useSearchParams();
  const params = new URLSearchParams(searchParams);
  const router = useRouter();
  const [_skillIdParam, setSkillIdParam] = useState<string | null>(
    searchParams.get('skillId'),
  );
  const [actionTypeParam, setActionTypeParam] = useState<string | null>(
    searchParams.get('action'),
  );
  const [currentStepParam, setCurrentStepParam] = useState<string | null>(
    searchParams.get('step'),
  );
  const [organizationParam, setOrganizationParam] = useState<string | null>(
    searchParams.get('organization'),
  );

  // Set ID skill for restore
  const [selectedSkillToRestore, setSelectedSkillToRestore] =
    useState<SkillDataDeleteType | null>(null);
  const [openConfirmRestoreModal, setOpenConfirmRestoreModal] = useState(false);

  const [dataOrganizationSkillList, setDataOrganizationSkillList] = useState<
    OrganizationSkill[]
  >([]);

  const [selectedOrganizationOption, setSelectedOrganizationOption] =
    useState<OptionDropdownType>({
      label: ALL_TEAMS_OPTION,
      value: '',
    });

  const [selectedFilterStepDetail, setSelectedFilterStepDetail] = useState<{
    filterStep: string;
    filterOrganizationId: number;
  }>();

  const [organizationList, setOrganizationList] = useState<
    OptionDropdownType[]
  >([]);

  // Skill map actions
  const [openSkillMapActionsModal, setOpenSkillMapActionsModal] =
    useState(false);
  const [selectedSkillMapToUpdate, setSelectedSkillMapToUpdate] = useState<
    number | null
  >();
  const [skillMapEditDetail, setSkillMapEditDetail] = useState<
    OrganizationSkillMapDetail[] | null
  >([]);

  useEffect(() => {
    document.body.style.backgroundColor = '#F3F3F3';
    return () => {
      document.body.style.backgroundColor = '';
    };
  }, []);

  // Get organization skills
  const { organizationSkillList, refetchOrganizationSkillList } =
    useOrganizationSkillList({
      filter: {
        organizationId: Number(selectedOrganizationOption.value),
        filterSteps: selectedFilterStepDetail
          ? String(selectedFilterStepDetail.filterStep)
          : undefined,
        filterOrganizationIds: selectedFilterStepDetail
          ? Number(selectedFilterStepDetail.filterOrganizationId)
          : undefined,
        is_deleted: 'true',
      },
      showLoadingIndicator: true,
    });

  // Get skill map detail
  useOrganizationSkillMapDetail({
    skillId: Number(selectedSkillMapToUpdate),
    onError: (error: AxiosError) => {
      if (error.response?.status === ServerStatusCode.NOT_FOUND) {
        showToast({
          variant: 'error',
          description: ERROR_COMMON_MESSAGE,
        });
      }
    },
    onSuccess: (data) => {
      setSkillMapEditDetail(data);
      setOpenSkillMapActionsModal(true);
    },
  });

  useEffect(() => {
    if (organizationSkillList) {
      setDataOrganizationSkillList(
        organizationSkillList as OrganizationSkill[],
      );
    }
  }, [organizationSkillList]);

  // Get organization options for pulldown
  useCreationDataCommon({
    options: {
      get_all_organizations: true,
    },
    onSuccess: (data) => {
      const organizationList =
        data.allOrganizations?.map((org) => {
          return {
            value: Number(org.id),
            label: org.name,
          };
        }) || [];
      setOrganizationList([
        {
          label: ALL_TEAMS_OPTION,
          value: '',
        },
        ...organizationList,
      ]);
    },
  });

  const convertFormDataToCreationRequestData = (
    formData: Partial<SkillMapFormData>,
  ): SkillMapRequestData => {
    const convertStep = (
      key: string,
      step: StepFormDataDetail,
    ): StepRequestDataDetail => ({
      name: step?.name || '',
      organizationId: Number(organizationParam) || 0,
      description: step?.description || '',
      step:
        key === 'step1'
          ? SkillMapStep.STEP_1
          : key === 'step2'
            ? SkillMapStep.STEP_2
            : SkillMapStep.STEP_3,
      skillLevels:
        step?.skillLevels && step?.skillLevels.length > 0
          ? step.skillLevels.map((level, index) => ({
              level: `レベル${index + 1}`,
              items:
                level.items.length > 0
                  ? level.items
                      .filter((item) => item.value)
                      .map((item) => item.value)
                  : [],
              lookBackType: level?.lookBackType
                ? String(level?.lookBackType.value)
                : null,
              lookBackInterval: level?.lookBackInterval
                ? Number(level?.lookBackInterval)
                : null,
              measureCount: level?.measureCount
                ? Number(level?.measureCount)
                : null,
              measureTime: level?.measureTime
                ? Number(level?.measureTime)
                : null,
              organization: Number(organizationParam) || 0,
            }))
          : [],
      categoryIds: step.rawCategories.map((cate) => ({
        largeStatisticCategoryId:
          cate.LARGE.value !== NO_SETTING && cate.LARGE.value !== ''
            ? (cate.LARGE.value as number)
            : null,
        mediumStatisticCategoryId:
          cate.MEDIUM.value !== NO_SETTING && cate.MEDIUM.value !== ''
            ? (cate.MEDIUM.value as number)
            : null,
        smallStatisticCategoryId:
          cate.SMALL.value !== NO_SETTING && cate.SMALL.value !== ''
            ? (cate.SMALL.value as number)
            : null,
      })),
    });

    return Object.fromEntries(
      Object.entries(formData).map(([key, step]) => [
        key,
        convertStep(key, step as StepFormDataDetail),
      ]),
    ) as SkillMapRequestData;
  };

  const convertFormDataToEditionRequestData = (
    formData: Partial<SkillMapFormData>,
  ): SkillMapRequestData => {
    const convertStep = (
      key: string,
      step: StepFormDataDetail,
    ): StepRequestDataDetail => ({
      skillId: step?.skillId ? Number(step.skillId) : null,
      name: step?.name || '',
      organizationId: step?.organizationId ? Number(step.organizationId) : 0,
      description: step?.description || '',
      step:
        key === 'step1'
          ? SkillMapStep.STEP_1
          : key === 'step2'
            ? SkillMapStep.STEP_2
            : SkillMapStep.STEP_3,
      skillLevels:
        step?.skillLevels && step?.skillLevels.length > 0
          ? step.skillLevels.map((level, index) => ({
              level: `レベル${index + 1}`,
              items:
                level.items.length > 0
                  ? level.items
                      .filter((item) => item.value)
                      .map((item) => item.value)
                  : [],
              lookBackType: level?.lookBackType
                ? String(level?.lookBackType.value)
                : null,
              lookBackInterval: level?.lookBackInterval
                ? Number(level?.lookBackInterval)
                : null,
              measureCount: level?.measureCount
                ? Number(level?.measureCount)
                : null,
              measureTime: level?.measureTime
                ? Number(level?.measureTime)
                : null,
              skillLevelId: level?.skillLevelId
                ? Number(level.skillLevelId)
                : null,
              organization: level?.organization
                ? Number(level?.organization)
                : 0,
            }))
          : [],
      categoryIds: step.rawCategories.map((cate) => ({
        largeStatisticCategoryId:
          cate.LARGE.value !== NO_SETTING && cate.LARGE.value !== ''
            ? (cate.LARGE.value as number)
            : null,
        mediumStatisticCategoryId:
          cate.MEDIUM.value !== NO_SETTING && cate.MEDIUM.value !== ''
            ? (cate.MEDIUM.value as number)
            : null,
        smallStatisticCategoryId:
          cate.SMALL.value !== NO_SETTING && cate.SMALL.value !== ''
            ? (cate.SMALL.value as number)
            : null,
      })),
    });

    return Object.fromEntries(
      Object.entries(formData).map(([key, step]) => [
        key,
        convertStep(key, step as StepFormDataDetail),
      ]),
    ) as SkillMapRequestData;
  };

  const validateSkillLevels = (steps: SkillMapRequestData): string | null => {
    for (const stepKey of Object.keys(steps) as (keyof SkillMapRequestData)[]) {
      const step = steps[stepKey];
      for (let i = 0; i < step.skillLevels.length; i++) {
        const skill = step.skillLevels[i];
        const { lookBackType, lookBackInterval, measureCount, measureTime } =
          skill;
        const allNull = [
          lookBackType,
          lookBackInterval,
          measureCount,
          measureTime,
        ].every((value) => value === null);
        if (allNull) {
          return stepKey;
        }
      }
    }
    return null;
  };

  const handleConfirmCreateSkillMap = (data: SkillMapFormData) => {
    const filteredData = Object.fromEntries(
      Object.entries(data).filter(([_, step]) => step != null && step.name),
    ) as Partial<SkillMapFormData>;

    const keys = Object.keys(filteredData);

    if (keys.length === 2 && keys.includes('step1') && keys.includes('step3')) {
      showToast({
        variant: 'error',
        description: PLEASE_FILL_IN_STEP_2,
      });
      return;
    }
    const requestData = convertFormDataToCreationRequestData(filteredData);
    if (validateSkillLevels(requestData)) {
      showToast({
        variant: 'error',
        description: `${validateSkillLevels(requestData)?.toUpperCase()}の必須情報を入力してください。`,
      });
      return;
    }

    createSkillMap(requestData);
  };

  const handleCreateSkillMap = async (data: SkillMapRequestData) => {
    setIsLoading(true);
    return await api.post(apiRouters.SKILL_LIST, data);
  };

  const { mutate: createSkillMap } = useMutation(
    'createSkillMap',
    handleCreateSkillMap,
    {
      onSuccess: async () => {
        showToast({
          description: SUCCESS_CREATE_MESSAGE,
        });
        setOpenSkillMapActionsModal(false);
        handleRemoveParam();
        refetchOrganizationSkillList();
      },
      onError: (error: AxiosError<any>) => {
        showErrorToast(error, ERROR_CREATE_MESSAGE);

        modalRef.current?.setServerErrors(error);
      },
      onSettled: () => {
        setIsLoading(false);
      },
    },
  );

  const handleConfirmEditSkillMap = (data: SkillMapFormData) => {
    const filteredData = Object.fromEntries(
      Object.entries(data).filter(
        ([_, step]) => step != null && step.skillId != null,
      ),
    ) as Partial<SkillMapFormData>;

    const keys = Object.keys(filteredData);

    if (keys.length === 2 && keys.includes('step1') && keys.includes('step3')) {
      showToast({
        variant: 'error',
        description: PLEASE_FILL_IN_STEP_2,
      });
      return;
    }
    const requestData = convertFormDataToEditionRequestData(filteredData);
    if (validateSkillLevels(requestData)) {
      showToast({
        variant: 'error',
        description: `${validateSkillLevels(requestData)?.toUpperCase()}の必須情報を入力してください。`,
      });
      return;
    }
    editSkillMap(requestData);
  };

  const handleEditSkillMap = async (data: SkillMapRequestData) => {
    setIsLoading(true);
    return await api.post(apiRouters.SKILL_LIST, data);
  };

  const { mutate: editSkillMap } = useMutation(
    'editSkillMap',
    handleEditSkillMap,
    {
      onSuccess: async () => {
        showToast({
          description: SUCCESS_UPDATE_MESSAGE,
        });
        setOpenSkillMapActionsModal(false);
        setSelectedSkillMapToUpdate(null);
        setSkillMapEditDetail(null);
        handleRemoveParam();
        refetchOrganizationSkillList();
      },
      onError: (error: AxiosError<any>) => {
        showErrorToast(error, ERROR_UPDATE_MESSAGE);
      },
      onSettled: () => {
        setIsLoading(false);
      },
    },
  );

  // Delete skill map
  const handleOpenRestoreSkillModal = (skill: SkillDataDeleteType) => {
    setOpenConfirmRestoreModal(true);
    setSelectedSkillToRestore(skill);
  };

  const handleConfirmRestoreSkill = () => {
    if (selectedSkillToRestore) {
      setIsLoading(true);
      restoreSkill(selectedSkillToRestore.id);
      return;
    }
  };

  const postRestoreSkill = async (id: number) => {
    const { data: response } = await api.post(
      apiRouters.SKILL_RESTORE(`${id}`),
    );
    return response;
  };

  const { mutate: restoreSkill } = useMutation(postRestoreSkill, {
    onSuccess: async () => {
      showToast({
        description: SUCCESS_RESTORE_MESSAGE,
      });
      setDataOrganizationSkillList((prev) =>
        prev.map((org) => {
          if (org.id !== selectedSkillToRestore?.orgId) return org;

          return {
            ...org,
            skills: org.skills.filter(
              (skill) => skill.id !== selectedSkillToRestore.id,
            ),
          };
        }),
      );
      setOpenConfirmRestoreModal(false);
      setSelectedSkillToRestore(null);
    },
    onError: (error: AxiosError<any>) => {
      showErrorToast(error, ERROR_RESTORE_MESSAGE);
      setOpenConfirmRestoreModal(false);
    },
    onSettled: () => {
      setIsLoading(false);
    },
  });

  const handleSetParam = ({
    id,
    action,
    step,
    organization,
  }: {
    id?: string | null;
    action?: string | null;
    step?: number | null;
    organization?: number | null;
  }) => {
    if (id) {
      params.set('skillId', id);
      setSkillIdParam(id);
    }
    if (action) {
      params.set('action', action);
      setActionTypeParam(action);
    }
    if (step) {
      params.set('step', String(step));
      setCurrentStepParam(String(step));
    }
    if (organization) {
      params.set('organization', String(organization));
      setOrganizationParam(String(organization));
    }
    router.push(`?${params.toString()}`);
  };

  const handleRemoveParam = () => {
    const params = new URLSearchParams(searchParams);
    params.delete('skillId');
    params.delete('action');
    params.delete('step');
    params.delete('organization');
    setSkillIdParam(null);
    setActionTypeParam(null);
    setCurrentStepParam(null);
    setOrganizationParam(null);
    router.replace(`?${params.toString()}`);
  };

  const hasAddPermission =
    session?.user.permissions &&
    hasPermissionInArray(
      session?.user.permissions,
      PermissionsSystem.SKILL_MAP_MANAGEMENT_ADD,
    );
  const hasUpdatePermission =
    session?.user.permissions &&
    hasPermissionInArray(
      session?.user.permissions,
      PermissionsSystem.SKILL_MAP_MANAGEMENT_UPDATE,
    );

  return (
    <Fragment>
      <div className="sticky z-[21] top-[0px] !bg-[#F3F3F3]  px-10 py-[30px] ">
        <div className="flex items-start justify-between">
          <div className="flex gap-5 items-center mb-[30px]">
            <div className="text-black flex items-center gap-[10px] font-medium text-[26px] leading-[1]">
              スキルマップ設定
              <div className="text-xs flex items-center gap-1">
                <ImageRound
                  name="Hide"
                  src={'/icons/dark-close-eye.svg'}
                  className={`w-[16px] h-[13px]`}
                />
                <span>非表示一覧</span>
              </div>
            </div>
            <div className="flex gap-[6px] bg-white w-fit p-[6px] rounded-[20px]">
              <Button
                variant="primary"
                className={`w-[120px] !p-0 text-xs h-[28px] !font-bold text-white border-none !rounded-[20px]`}>
                スキル編集
              </Button>
              <Link href={pageRouters.SKILL_MAPS_MEMBERS_MANAGEMENT.href}>
                <Button
                  variant="outline"
                  className={`w-[120px] !p-0 text-xs h-[28px] !font-bold !text-[#77858F] !bg-[#EBF1F7] border-none !rounded-[20px]`}>
                  対応メンバー編集
                </Button>
              </Link>
            </div>
          </div>
          <Link
            href={pageRouters.SKILL_MAPS_MANAGEMENT.href}
            className="flex items-center hover:cursor-pointer">
            <p className="ml-1 text-[#77858F] font-medium text-xs">
              表示中一覧
            </p>
            <div className="ml-[6px] flex justify-between p-[3px] rounded-full bg-white border-b">
              <ImageRound
                name="Filter extend icon"
                src={'/icons/arrow-down.svg'}
                className={`w-4 h-4 hover:cursor-pointer -rotate-90`}
              />
            </div>
          </Link>
        </div>
        <Dropdown
          options={organizationList}
          className="!w-[220px] !h-[34px] !py-0 !border-[1px] !border-[#77858F]"
          classNameOption="!w-[220px]"
          selectedOption={organizationList.find(
            (element) => element.value == selectedOrganizationOption.value,
          )}
          onChange={(e) => {
            setSelectedOrganizationOption({
              label: e.label,
              value: e.value,
            });
          }}
        />
      </div>

      {/* Render skills by organizations */}
      <div className="px-10 flex flex-col gap-5">
        {dataOrganizationSkillList.length > 0 &&
          dataOrganizationSkillList.map((orgSkill) => {
            return (
              <OrganizationDeleteSkillDetail
                key={orgSkill.id}
                orgSkillDetail={orgSkill}
                setSelectedFilterStepDetail={setSelectedFilterStepDetail}
                setSelectedSkillMapToUpdate={setSelectedSkillMapToUpdate}
                handleSetParam={handleSetParam}
                refetchOrganizationSkillList={refetchOrganizationSkillList}
                handleOpenDeleteSkillModal={(skill) => {
                  handleOpenRestoreSkillModal({ ...skill, orgId: orgSkill.id });
                }}
              />
            );
          })}
      </div>

      <ConfirmRestoreModal
        open={openConfirmRestoreModal}
        type="スキルマップ"
        onConfirm={handleConfirmRestoreSkill}
        onClose={() => setOpenConfirmRestoreModal(false)}
      />

      {/* Open skill map actions modal */}
      {openSkillMapActionsModal &&
        actionTypeParam &&
        (hasAddPermission || hasUpdatePermission) && (
          <ActionsSkillMapModal
            ref={modalRef}
            action={actionTypeParam}
            step={Number(currentStepParam)}
            open={openSkillMapActionsModal}
            skillMapEditDetail={skillMapEditDetail}
            onClose={() => {
              setOpenSkillMapActionsModal(false);
              setSelectedSkillMapToUpdate(null);
              setSkillMapEditDetail(null);
              handleRemoveParam();
            }}
            onCreate={handleConfirmCreateSkillMap}
            onEdit={handleConfirmEditSkillMap}
          />
        )}
    </Fragment>
  );
};

export default ListSkillsMapDelete;
