'use client';
import React, { Fragment, useEffect, useState } from 'react';
import Link from 'next/link';

import Dropdown from '@components/common/Dropdown';
import Button from '@components/common/Button';

import { ALL_TEAMS_OPTION } from '@constants';
import { pageRouters } from '@constants/routers';
import { ScreenName } from '@constants/enums';

import { SkillMapByMembers, SkillMapSkill } from '@interfaces/skills';
import { OptionDropdownType } from '@interfaces/common';

import useOrganizationOptions from '@hooks/useFullOrganizationList';
import useSkillMapByMembers from '@hooks/useSkillMapByMembers';
import useOrganizationSkillList from '@hooks/useOrganizationSkillList';

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

  const { organizationOptions } = useOrganizationOptions({
    current_screen: ScreenName.SKILL_MAP,
  });

  // Fetch organization skills
  const { skillMapListByMembers } = useSkillMapByMembers({
    organizationId: Number(selectedOrganizationOption.value),
  });

  // Fetch organization skills
  const { organizationSkillList } = useOrganizationSkillList({
    organizationId: Number(selectedOrganizationOption.value),
    screen: ScreenName.SKILL_MAP,
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

  useEffect(() => {
    if (organizationOptions) {
      const organizationList = organizationOptions.map((org) => {
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
  }, [organizationOptions]);

  return (
    <Fragment>
      <div className="flex justify-between items-center">
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
        <Link href={pageRouters.EDIT_SKILL_MAPS_MEMBERS.href}>
          <Button
            variant="primary"
            className={`w-[100px] !p-0 text-xs h-[34px] !border-transparent text-white`}>
            編集
          </Button>
        </Link>
      </div>

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
    </Fragment>
  );
};

export default ListSkillsMapByMembers;
