'use client';
import { useEffect, useState } from 'react';

import Dropdown from '@components/common/Dropdown';

import { SkillMapByOrganization } from '@interfaces/skills';
import { OptionDropdownType } from '@interfaces/common';

import useSkillMapInfo from '@hooks/useSkillMapList';
import useOrganizationOptions from '@hooks/useFullOrganizationList';

import { ScreenName } from '@constants/enums';
import { ALL_TEAMS_OPTION } from '@constants';

import { SkillListByOrganizationPanel } from './skill-list-by-organization-panel';

const SkillList = () => {
  const [skillMapByOrganizations, setSkillMapByOrganizations] = useState<
    SkillMapByOrganization[]
  >([]);
  const [organizationList, setOrganizationList] = useState<
    OptionDropdownType[]
  >([]);
  const [selectedOrganizationOption, setSelectedOrganizationOption] =
    useState<OptionDropdownType>({
      label: ALL_TEAMS_OPTION,
      value: '',
    });

  // Hooks
  const { organizationOptions } = useOrganizationOptions({
    current_screen: ScreenName.SKILL_MAP,
  });
  const { skillMapInfo } = useSkillMapInfo({
    organizationId: Number(selectedOrganizationOption.value),
  });

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

  useEffect(() => {
    if (skillMapInfo?.organizations) {
      setSkillMapByOrganizations(skillMapInfo?.organizations);
    }
  }, [skillMapInfo]);

  return (
    <div className="w-full">
      <Dropdown
        options={organizationList}
        className="!w-[220px] !h-[34px] !py-0 !border-[1px] !border-[#77858F] mb-7"
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

      {/* Skill map by organizations */}
      {skillMapByOrganizations.length > 0 &&
        skillMapByOrganizations.map((skillMap, index) => (
          <SkillListByOrganizationPanel key={index} skillMapDetail={skillMap} />
        ))}
    </div>
  );
};

export default SkillList;
