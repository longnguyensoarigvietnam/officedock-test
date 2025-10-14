'use client';
import React, { Fragment, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AxiosError } from 'axios';
import { useMutation } from 'react-query';
import Link from 'next/link';

import Dropdown from '@components/common/Dropdown';
import Button from '@components/common/Button';

import {
  ManageSkillMapsRequest,
  SkillMapByMembers,
  SkillMapSkill,
} from '@interfaces/skills';
import { OptionDropdownType } from '@interfaces/common';

import useTeamList from '@hooks/useListTeam';
import useSkillMapByMembers from '@hooks/useSkillMapByMembers';
import useOrganizationSkillList from '@hooks/useOrganizationSkillList';
import { useErrorToast } from '@hooks/useErrorToast';

import { ScreenName } from '@constants/enums';
import { apiRouters, pageRouters } from '@constants/routers';
import {
  ERROR_UPDATE_MESSAGE,
  SUCCESS_UPDATE_MESSAGE,
} from '@constants/message';
import { ALL_TEAMS_OPTION } from '@constants';

import { LoadingContext } from '@providers/LoadingProvider';
import { useToast } from '@providers/ToastProvider';

import { EditSkillMapByMemberForm } from './form';

import api from '@base/api';

const EditSkillMapByMemberBoard = () => {
  const { setIsLoading } = useContext(LoadingContext);
  const { showToast } = useToast();
  const showErrorToast = useErrorToast();
  const router = useRouter();

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

  const { teamList } = useTeamList({});

  // Fetch organization skills
  const { skillMapListByMembers } = useSkillMapByMembers({
    organizationId: Number(selectedOrganizationOption.value),
  });

  // Fetch organization skills
  const { organizationSkillList } = useOrganizationSkillList({
    filter: {
      organizationId: Number(selectedOrganizationOption.value),
      screen: ScreenName.SKILL_MAP,
    },
  });

  useEffect(() => {
    if (skillMapListByMembers) {
      setDataSkillMapsByMembers(skillMapListByMembers);
    }
  }, [skillMapListByMembers]);

  useEffect(() => {
    if (organizationSkillList) {
      setDataSkillMapList(organizationSkillList as SkillMapSkill[]);
    }
  }, [organizationSkillList]);

  // Get organization options for pulldown
  useEffect(() => {
    if (teamList) {
      const organizationList = teamList.map((org) => {
        return {
          value: Number(org.id),
          label: org.name,
        };
      });
      setOrganizationList([
        {
          label: ALL_TEAMS_OPTION,
          value: '',
        },
        ...organizationList,
      ]);
    }
  }, [teamList]);

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
        showToast({
          description: SUCCESS_UPDATE_MESSAGE,
        });
        setSelectedSkillByUserToUpdate([]);
        router.push(pageRouters.SKILL_MAPS_MEMBERS_MANAGEMENT.href);
      },
      onError: (error: AxiosError<any>) => {
        showErrorToast(error, ERROR_UPDATE_MESSAGE);
      },
      onSettled: () => {
        setIsLoading(false);
      },
    },
  );

  return (
    <Fragment>
      <div className="sticky z-[21] top-[0px] px-10 py-8 bg-[#E6F3FB]">
        <div className="flex gap-4 items-center mb-5">
          <p className="text-black font-medium text-[26px]">スキルマップ設定</p>
          <div className="flex gap-2 bg-white w-fit p-[6px] rounded-[20px]">
            <Link href={pageRouters.SKILL_MAPS_MANAGEMENT.href}>
              <Button
                variant="outline"
                className={`w-[100px] !p-0 text-xs h-[28px] !font-bold !text-[#77858F] !bg-[#EBF1F7] border-none !rounded-[20px]`}>
                スキル編集
              </Button>
            </Link>
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
            className="!w-[220px] !h-[34px] !py-0 !border-[1px] !border-[#77858F]"
            classNameOption="!w-[220px] !z-[30]"
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
          <div className="flex justify-center gap-3 items-center">
            <Link href={pageRouters.SKILL_MAPS_MEMBERS_MANAGEMENT.href}>
              <Button variant="outline" className="w-[100px] !p-0 !h-[34px]">
                キャンセル
              </Button>
            </Link>
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

      <div className="px-10 flex flex-col gap-6">
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
    </Fragment>
  );
};

export default EditSkillMapByMemberBoard;
