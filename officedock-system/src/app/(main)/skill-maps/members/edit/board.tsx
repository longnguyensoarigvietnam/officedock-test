'use client';
import React, {
  Fragment,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AxiosError } from 'axios';
import { useMutation } from 'react-query';

import Dropdown from '@components/common/Dropdown';
import Button from '@components/common/Button';
import WarningCloseTaskModal from '@components/modals/WarningCloseTaskModal';

import {
  ManageSkillMapsRequest,
  SkillMapByMembers,
  SkillMapSkill,
} from '@interfaces/skills';
import { OptionDropdownType } from '@interfaces/common';

import useSkillMapByMembers from '@hooks/useSkillMapByMembers';
import useOrganizationSkillList from '@hooks/useOrganizationSkillList';
import { useErrorToast } from '@hooks/useErrorToast';
import useCreationDataCommon from '@hooks/common/useCreationDataCommon';

import { ScreenName } from '@constants/enums';
import { apiRouters, pageRouters } from '@constants/routers';
import {
  ERROR_COMMON_MESSAGE,
  ERROR_UPDATE_MESSAGE,
  SUCCESS_UPDATE_MESSAGE,
} from '@constants/message';
import { ALL_TEAMS_OPTION } from '@constants';

import { LoadingContext } from '@providers/LoadingProvider';
import { GlobalStateContext } from '@providers/GlobalStateProvider';
import { useToast } from '@providers/ToastProvider';

import { EditSkillMapByMemberForm } from './form';

import api from '@base/api';

const EditSkillMapByMemberBoard = () => {
  const { setIsLoading } = useContext(LoadingContext);
  const {
    setHasUnsavedChanges,
    pendingGlobalNavigationHref,
    setPendingGlobalNavigationHref,
  } = useContext(GlobalStateContext);
  const { showToast } = useToast();
  const showErrorToast = useErrorToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = new URLSearchParams(searchParams);
  const orgIdParam = searchParams.get('orgId');

  const [dataSkillMapsByMembers, setDataSkillMapsByMembers] = useState<
    SkillMapByMembers[]
  >([]);

  const [dataSkillMapList, setDataSkillMapList] = useState<SkillMapSkill[]>([]);

  const [selectedOrganizationOption, setSelectedOrganizationOption] =
    useState<OptionDropdownType>({
      label: ALL_TEAMS_OPTION,
      value: '',
    });
  const [selectedSkillByUserToUpdate, setSelectedSkillByUserToUpdate] =
    useState<
      {
        id: number | null;
        skillId: number;
        userId: number;
        isChecked: boolean;
      }[]
    >([]);

  const [organizationList, setOrganizationList] = useState<
    OptionDropdownType[]
  >([]);

  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [pendingNavigationHref, setPendingNavigationHref] = useState<
    string | null
  >(null);
  const navigateAfterSaveRef = useRef<string | null>(null);

  const hasUnsavedChanges = selectedSkillByUserToUpdate.length > 0;

  useEffect(() => {
    setHasUnsavedChanges(hasUnsavedChanges);
    return () => setHasUnsavedChanges(false);
  }, [hasUnsavedChanges, setHasUnsavedChanges]);

  useEffect(() => {
    if (pendingGlobalNavigationHref !== null) {
      setPendingNavigationHref(pendingGlobalNavigationHref);
      setPendingGlobalNavigationHref(null);
      setShowUnsavedModal(true);
    }
  }, [pendingGlobalNavigationHref, setPendingGlobalNavigationHref]);

  const handleNavigate = useCallback(
    (href: string) => {
      if (hasUnsavedChanges) {
        setPendingNavigationHref(href);
        setShowUnsavedModal(true);
      } else {
        router.push(href);
      }
    },
    [hasUnsavedChanges, router],
  );

  const handleConfirmLeave = useCallback(() => {
    setShowUnsavedModal(false);
    setSelectedSkillByUserToUpdate([]);
    setHasUnsavedChanges(false);
    if (pendingNavigationHref) {
      router.push(pendingNavigationHref);
      setPendingNavigationHref(null);
    }
  }, [pendingNavigationHref, router, setHasUnsavedChanges]);

  const handleConfirmSaveAndLeave = () => {
    navigateAfterSaveRef.current = pendingNavigationHref;
    setShowUnsavedModal(false);
    setPendingNavigationHref(null);
    handleConfirmUpdateSkillMapByUsers();
  };

  // Fetch skill map by members
  useSkillMapByMembers({
    filter: {
      organizationId:
        Number(selectedOrganizationOption.value) || Number(orgIdParam),
      has_include_deleted_user: 'false',
      has_include_deleted_skill: 'false',
    },
    onSuccess: (data) => {
      setDataSkillMapsByMembers(data);
    },
    onError: (error: AxiosError<any>) => {
      showErrorToast(error, ERROR_COMMON_MESSAGE);
    },
  });

  // Fetch organization skills
  useOrganizationSkillList({
    filter: {
      organizationId:
        Number(selectedOrganizationOption.value) || Number(orgIdParam),
      screen: ScreenName.SKILL_MAP,
      is_deleted: 'false',
    },
    onSuccess: (data) => {
      setDataSkillMapList(data as SkillMapSkill[]);
    },
    onError: (error: AxiosError<any>) => {
      showErrorToast(error, ERROR_COMMON_MESSAGE);
    },
  });

  // Get organization options for pulldown
  useCreationDataCommon({
    options: {
      get_organizations_of_user_by_screen: ScreenName.SKILL_MAP_MANAGEMENT,
    },
    onSuccess: (data) => {
      const organizationList =
        data.organizations?.map((org) => {
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
      if (orgIdParam) {
        const orgId = Number(orgIdParam);
        if (Number.isNaN(orgId))
          router.push(pageRouters.SKILL_MAPS_MEMBERS_MANAGEMENT.href);
        const selectedOrg = organizationList.find((org) => org.value == orgId);
        setSelectedOrganizationOption({
          label: String(selectedOrg?.label),
          value: String(selectedOrg?.value),
        });
      }
    },
    onError: (error: AxiosError<any>) => {
      showErrorToast(error, ERROR_COMMON_MESSAGE);
    },
  });

  // Update skill map by users
  const handleConfirmUpdateSkillMapByUsers = () => {
    updateSkillMapByUsers({
      items: selectedSkillByUserToUpdate,
    });
  };

  const handleUpdateSkillMapByUsers = async (data: ManageSkillMapsRequest) => {
    setIsLoading(true);
    return await api.post(apiRouters.MANAGE_SKILL_MAPS, data);
  };

  const { mutate: updateSkillMapByUsers } = useMutation(
    'updateSkillMapByUsers',
    handleUpdateSkillMapByUsers,
    {
      onSuccess: async () => {
        setSelectedSkillByUserToUpdate([]);
        setHasUnsavedChanges(false);
        showToast({
          description: SUCCESS_UPDATE_MESSAGE,
        });
        const targetHref = navigateAfterSaveRef.current;
        navigateAfterSaveRef.current = null;
        router.push(
          targetHref ||
            `${pageRouters.SKILL_MAPS_MEMBERS_MANAGEMENT.href}${orgIdParam ? `?orgId=${orgIdParam}` : ''}`,
        );
      },
      onError: (error: AxiosError<any>) => {
        showErrorToast(error, ERROR_UPDATE_MESSAGE);
      },
      onSettled: () => {
        setIsLoading(false);
      },
    },
  );

  const handleSetParam = ({ id }: { id?: string | null }) => {
    if (id) {
      params.set('orgId', id);
    }
    router.push(`?${params.toString()}`);
  };

  const handleRemoveParam = () => {
    const params = new URLSearchParams(searchParams);
    params.delete('orgId');
    router.replace(`?${params.toString()}`);
  };

  return (
    <Fragment>
      <div className="sticky z-[21] top-[0px] px-10 py-[30px] bg-[#E6F3FB]">
        <div className="flex gap-5 items-center mb-[30px]">
          <p className="text-black font-medium text-[26px] leading-[1]">
            スキルマップ設定
          </p>
          <div className="flex gap-[6px] bg-white w-fit p-[6px] rounded-[20px]">
            <Button
              variant="outline"
              className={`w-[120px] !p-0 text-xs h-[28px] !font-bold !text-[#77858F] !bg-[#EBF1F7] border-none !rounded-[20px]`}
              onClick={() =>
                handleNavigate(pageRouters.SKILL_MAPS_MANAGEMENT.href)
              }>
              スキル編集
            </Button>
            <Button
              variant="primary"
              className={`w-[120px] !p-0 text-xs h-[28px] !font-bold text-white border-none !rounded-[20px]`}>
              対応メンバー編集
            </Button>
          </div>
        </div>
        <div className="flex justify-between items-center">
          <Dropdown
            options={organizationList}
            className="!w-[220px] !h-[34px] !text-sm !py-0 !border-[1px] !border-[#77858F]"
            classNameOption="!w-[220px] !text-sm !z-[30]"
            selectedOption={organizationList.find(
              (element) => element.value == selectedOrganizationOption.value,
            )}
            onChange={(e) => {
              if (e.value) {
                handleSetParam({ id: e.value as string });
              } else {
                handleRemoveParam();
              }
              setSelectedOrganizationOption({
                label: e.label,
                value: e.value,
              });
            }}
          />
          <div className="flex justify-center gap-[10px] items-center">
            <Button
              variant="outline"
              className="w-[100px] !p-0 !h-[34px]"
              onClick={() => {
                setHasUnsavedChanges(false);
                router.push(
                  `${pageRouters.SKILL_MAPS_MEMBERS_MANAGEMENT.href}${orgIdParam ? `?orgId=${orgIdParam}` : ''}`,
                );
              }}>
              キャンセル
            </Button>
            <Button
              variant="primary"
              className="w-[100px] !p-0 !h-[34px] !border-none"
              style={{ boxShadow: '0px 1px 5px 0px #00000033' }}
              onClick={handleConfirmUpdateSkillMapByUsers}>
              保存
            </Button>
          </div>
        </div>
      </div>

      <div className="px-10 flex flex-col gap-5">
        {dataSkillMapsByMembers.length > 0 &&
          dataSkillMapsByMembers.map((skillMapByMembers) => {
            return (
              <EditSkillMapByMemberForm
                key={skillMapByMembers.id}
                skillMapByMembers={skillMapByMembers}
                dataSkillMapList={dataSkillMapList}
                setSelectedSkillByUserToUpdate={setSelectedSkillByUserToUpdate}
                setDataSkillMapsByMembers={setDataSkillMapsByMembers}
              />
            );
          })}
      </div>

      <WarningCloseTaskModal
        open={showUnsavedModal}
        onConfirm={handleConfirmSaveAndLeave}
        onClose={handleConfirmLeave}
        onCloseByIcon={() => setShowUnsavedModal(false)}
      />
    </Fragment>
  );
};

export default EditSkillMapByMemberBoard;
