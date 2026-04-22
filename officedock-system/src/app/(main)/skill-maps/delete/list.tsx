'use client';
import { useMutation } from 'react-query';
import React, { Fragment, useContext, useEffect, useState } from 'react';
import { AxiosError } from 'axios';

import Link from 'next/link';

import Button from '@components/common/Button';
import Dropdown from '@components/common/Dropdown';
import ConfirmRestoreModal from '@components/modals/ConfirmRestoreModal';
import ImageRound from '@components/common/ImageRound';
import { OrganizationDeleteSkillDetail } from './organization-delete-detail';

import { apiRouters, pageRouters } from '@constants/routers';
import {
  ERROR_COMMON_MESSAGE,
  ERROR_RESTORE_MESSAGE,
  SUCCESS_RESTORE_MESSAGE,
} from '@constants/message';
import { ALL_TEAMS_OPTION } from '@constants';
import { ScreenName } from '@constants/enums';

import { LoadingContext } from '@providers/LoadingProvider';
import { useToast } from '@providers/ToastProvider';

import { OrganizationSkill, SkillDataDeleteType } from '@interfaces/skills';
import { OptionDropdownType } from '@interfaces/common';

import { useErrorToast } from '@hooks/useErrorToast';
import useOrganizationSkillList from '@hooks/useOrganizationSkillList';
import useCreationDataCommon from '@hooks/common/useCreationDataCommon';

import api from '@base/api';

const ListSkillsMapDelete = () => {
  const { setIsLoading } = useContext(LoadingContext);
  const showErrorToast = useErrorToast();
  const { showToast } = useToast();

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

  useEffect(() => {
    document.body.style.backgroundColor = '#F3F3F3';
    return () => {
      document.body.style.backgroundColor = '';
    };
  }, []);

  // Get organization skills
  const { organizationSkillList } = useOrganizationSkillList({
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
    onError: (error: AxiosError<any>) => {
      showErrorToast(error, ERROR_COMMON_MESSAGE);
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
    },
    onError: (error: AxiosError<any>) => {
      showErrorToast(error, ERROR_COMMON_MESSAGE);
    },
  });

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
                  className={`w-[16px] h-[13px] opacity-80`}
                />
                <span className="text-[#77858F] text-xs font-medium">
                  非表示一覧
                </span>
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
          className="!w-[220px] !h-[34px] !text-sm !py-0 !border-[1px] !border-[#77858F]"
          classNameOption="!w-[220px] !text-sm"
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
                handleOpenDeleteSkillModal={(skill) => {
                  handleOpenRestoreSkillModal({ ...skill, orgId: orgSkill.id });
                }}
              />
            );
          })}
      </div>

      <ConfirmRestoreModal
        open={openConfirmRestoreModal}
        name={selectedSkillToRestore?.name || ''}
        message="このスキルマップを復元しますか？"
        onConfirm={handleConfirmRestoreSkill}
        onClose={() => setOpenConfirmRestoreModal(false)}
      />
    </Fragment>
  );
};

export default ListSkillsMapDelete;
