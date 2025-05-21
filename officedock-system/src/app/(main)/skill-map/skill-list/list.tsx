'use client';
import { AxiosError } from 'axios';
import { useEffect, useState } from 'react';

import Dropdown from '@components/common/Dropdown';
import ActionsSkillMapDetailModal from '@components/modals/ActionsSkillMapDetailModal';

import { ScreenName, ServerStatusCode } from '@constants/enums';
import { ALL_TEAMS_OPTION } from '@constants';
import { ERROR_COMMON_MESSAGE } from '@constants/message';

import {
  OrganizationSkillMapDetail,
  SkillMapByOrganization,
} from '@interfaces/skills';
import { OptionDropdownType } from '@interfaces/common';

import useSkillMapInfo from '@hooks/useSkillMapList';
import useOrganizationOptions from '@hooks/useFullOrganizationList';
import useSkillMapUserDetail from '@hooks/useSkillMapUserDetail';

import { useToast } from '@providers/ToastProvider';

import { SkillListByOrganizationPanel } from './skill-list-by-organization-panel';

const SkillList = () => {
  const { showToast } = useToast();

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

  const [selectedSkillMapId, setSelectedSkillMapId] = useState<number | null>();
  const [selectedStep, setSelectedStep] = useState<number>(1);
  const [openSkillMapDetailModal, setOpenSkillMapDetailModal] = useState(false);
  const [skillMapEditDetail, setSkillMapEditDetail] = useState<
    OrganizationSkillMapDetail[] | null
  >([]);

  // Hooks
  const { organizationOptions } = useOrganizationOptions({
    current_screen: ScreenName.SKILL_MAP,
  });
  useSkillMapInfo({
    organizationId: String(selectedOrganizationOption.value),
    onSuccess: (data) => {
      setSkillMapByOrganizations(data.organizations);
    },
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

  useSkillMapUserDetail({
    skillId: Number(selectedSkillMapId),
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
      setOpenSkillMapDetailModal(true);
    },
  });

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
          <SkillListByOrganizationPanel
            key={index}
            skillMapDetail={skillMap}
            onDetail={({
              skillId,
              stepNumber,
            }: {
              skillId: number;
              stepNumber: number;
            }) => {
              setSelectedSkillMapId(skillId);
              setSelectedStep(stepNumber);
            }}
          />
        ))}

      {openSkillMapDetailModal && (
        <ActionsSkillMapDetailModal
          step={selectedStep}
          open={openSkillMapDetailModal}
          skillMapEditDetail={skillMapEditDetail}
          onClose={() => {
            setOpenSkillMapDetailModal(false);
            setSelectedSkillMapId(null);
            setSkillMapEditDetail(null);
          }}
        />
      )}
    </div>
  );
};

export default SkillList;
