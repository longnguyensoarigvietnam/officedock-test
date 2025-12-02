'use client';
import { AxiosError } from 'axios';
import { useState } from 'react';
import { useSessionCache } from '@providers/SessionCacheProvider';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

import Dropdown from '@components/common/Dropdown';
import ActionsSkillMapDetailModal from '@components/modals/ActionsSkillMapDetailModal';
import ImageRound from '@components/common/ImageRound';
import Button from '@components/common/Button';

import { PermissionsSystem, ServerStatusCode } from '@constants/enums';
import { ALL_TEAMS_OPTION } from '@constants';
import { ERROR_COMMON_MESSAGE } from '@constants/message';
import { pageRouters } from '@constants/routers';

import {
  OrganizationSkillMapDetail,
  SkillMapByOrganization,
} from '@interfaces/skills';
import { OptionDropdownType } from '@interfaces/common';

import useCreationDataCommon from '@hooks/common/useCreationDataCommon';
import useSkillMapUserDetail from '@hooks/useSkillMapUserDetail';
import useListSkillsInSkillMap from '@hooks/useListSkillsInSkillMap';

import { useToast } from '@providers/ToastProvider';

import { hasPermissionInArray } from '@utils';

import { SkillListByOrganizationPanel } from './skill-list-by-organization-panel';

const SkillList = () => {
  const { showToast } = useToast();
  const { data: session } = useSessionCache();

  const searchParams = useSearchParams();
  const tabId = searchParams.get('tabId');

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

  // Get skill list
  useListSkillsInSkillMap({
    organizationId: String(selectedOrganizationOption.value),
    onSuccess: (data) => {
      setSkillMapByOrganizations(data);
    },
  });

  useCreationDataCommon({
    options: {
      get_organization_skills: true,
    },
    onSuccess: (data) => {
      const organizationList =
        data.organizationSkills?.map((org) => {
          return {
            value: Number(org.organization.id),
            label: org.organization.name,
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

  // Get skill map detail
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
      <div className="sticky z-[21] top-[0px] px-10 pt-[27px] pb-[30px] bg-[#E6F3FB]">
        <div className="flex justify-between mb-[27px]">
          <div className="flex gap-[6px] items-center bg-white w-fit p-[6px] rounded-[20px]">
            <Link href={`${pageRouters.SKILL_MAP.href}?tabId=${tabId || 0}`}>
              <Button
                variant="outline"
                className={`w-[90px] !p-0 text-xs h-[28px] !font-bold !text-[#77858F] !bg-[#EBF1F7] border-none !rounded-[20px]`}>
                スキルマップ
              </Button>
            </Link>

            <Link
              href={`${pageRouters.SKILL_MAP_SKILL.href}?tabId=${tabId || 0}`}>
              <Button
                variant="outline"
                className={`w-[90px] !p-0 text-xs h-[28px] !font-bold !text-[#77858F] !bg-[#EBF1F7] border-none !rounded-[20px]`}>
                マイスキル
              </Button>
            </Link>

            <Button
              variant="primary"
              className={`w-[90px] !p-0 text-xs h-[28px] !font-bold text-white !rounded-[20px]`}>
              スキル一覧
            </Button>
          </div>
          {session?.user.permissions &&
            hasPermissionInArray(
              session?.user.permissions,
              PermissionsSystem.SKILL_MAP_MANAGEMENT_VIEW,
            ) && (
              <Link href={pageRouters.SKILL_MAPS_MANAGEMENT.href}>
                <Button
                  variant="secondary"
                  className="w-[158px] !p-0 text-sm h-[34px] !text-[#77858F] !bg-white rounded-[6px]"
                  style={{ boxShadow: '0px 2px 8px 0px #0000001A' }}>
                  スキルマップ設定{' '}
                  <ImageRound
                    src="/icons/detail-task.svg"
                    name="right"
                    style={{
                      height: '18px',
                      width: '18px',
                    }}
                    className="!text-transparent ml-1 cursor-pointer"
                  />
                </Button>
              </Link>
            )}
        </div>
        <Dropdown
          options={organizationList}
          className="!w-[220px] !h-[34px] !text-sm !py-0 !border-[1px] !border-[#77858F]"
          classNameOption="!w-[220px] !text-sm"
          selectedOption={organizationList.find(
            (element) => element.value == selectedOrganizationOption.value,
          )}
          onChange={(e) => {
            setSkillMapByOrganizations([]);
            setSelectedOrganizationOption({
              label: e.label,
              value: e.value,
            });
          }}
        />
      </div>

      <div className="px-10">
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
      </div>

      {/* Open skill map detail modal */}
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
