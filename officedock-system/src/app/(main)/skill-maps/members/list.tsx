'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import React, { Fragment, useState } from 'react';
import Link from 'next/link';

import Dropdown from '@components/common/Dropdown';
import Button from '@components/common/Button';

import { ALL_TEAMS_OPTION } from '@constants';
import { pageRouters } from '@constants/routers';
import { ScreenName } from '@constants/enums';

import { SkillMapByMembers, SkillMapSkill } from '@interfaces/skills';
import { OptionDropdownType } from '@interfaces/common';

import useSkillMapByMembers from '@hooks/useSkillMapByMembers';
import useOrganizationSkillList from '@hooks/useOrganizationSkillList';
import useCreationDataCommon from '@hooks/common/useCreationDataCommon';

import { SkillMapByMembersDetail } from './form';

const ListSkillsMapByMembers = () => {
  const [dataSkillMapsByMembers, setDataSkillMapsByMembers] = useState<
    SkillMapByMembers[]
  >([]);

  const [dataSkillMapList, setDataSkillMapList] = useState<SkillMapSkill[]>([]);

  const [selectedOrganizationOption, setSelectedOrganizationOption] =
    useState<OptionDropdownType>({
      label: ALL_TEAMS_OPTION,
      value: '',
    });

  const [organizationList, setOrganizationList] = useState<
    OptionDropdownType[]
  >([]);

  const searchParams = useSearchParams();
  const params = new URLSearchParams(searchParams);
  const router = useRouter();
  const orgIdParam = searchParams.get('orgId')

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

  // Fetch skill map by members
  useSkillMapByMembers({
    filter: {
      organizationId: Number(selectedOrganizationOption.value) || Number(orgIdParam),
    },
    onSuccess: (data) => {
      setDataSkillMapsByMembers(data);
    }
  });

  // Fetch organization skills
  useOrganizationSkillList({
    filter: {
      organizationId: Number(selectedOrganizationOption.value) || Number(orgIdParam),
      screen: ScreenName.SKILL_MAP,
    },
    onSuccess: (data) => {
      setDataSkillMapList(data as SkillMapSkill[]);
    }
  });

  const handleSetParam = ({
    id,
  }: {
    id?: string | null;
  }) => {
    if (id) {
      params.set('orgId', id);
    }
    router.push(`?${params.toString()}`);
  };

  return (
    <Fragment>
      <div className="sticky z-[21] top-[0px] px-10 py-[30px] bg-[#E6F3FB]">
        <div className="flex gap-5 items-center mb-[30px]">
          <p className="text-black font-medium text-[26px] leading-[1]">スキルマップ設定</p>
          <div className="flex gap-[6px] bg-white w-fit p-[6px] rounded-[20px]">
            <Link href={pageRouters.SKILL_MAPS_MANAGEMENT.href}>
              <Button
                variant="outline"
                className={`w-[120px] !p-0 text-xs h-[28px] !font-bold !text-[#77858F] !bg-[#EBF1F7] border-none !rounded-[20px]`}>
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
            className="!w-[220px] !h-[34px] !text-sm !py-0 !border-[1px] !border-[#77858F]"
            classNameOption="!w-[220px] !text-sm !z-[30]"
            selectedOption={organizationList.find(
              (element) => element.value == selectedOrganizationOption.value,
            )}
            onChange={(e) => {
              handleSetParam({ id: e.value as string })
              setSelectedOrganizationOption({
                label: e.label,
                value: e.value,
              });
            }}
          />
          <Link href={`${pageRouters.EDIT_SKILL_MAPS_MEMBERS.href}${orgIdParam ? `?orgId=${orgIdParam}` : ''}`}>
            <Button
              variant="primary"
              className={`w-[100px] !p-0 text-sm h-[34px] text-white border-none`}
              style={{ boxShadow: '0px 1px 5px 0px #00000033' }}>
              編集
            </Button>
          </Link>
        </div>
      </div>

      <div className="px-10 flex flex-col gap-5">
        {dataSkillMapsByMembers.length > 0 &&
          dataSkillMapsByMembers.map((skillMapByMembers) => {
            return (
              <SkillMapByMembersDetail
                key={skillMapByMembers.id}
                skillMapByMembers={skillMapByMembers}
                dataSkillMapList={dataSkillMapList}
              />
            );
          })}
      </div>
    </Fragment>
  );
};

export default ListSkillsMapByMembers;
