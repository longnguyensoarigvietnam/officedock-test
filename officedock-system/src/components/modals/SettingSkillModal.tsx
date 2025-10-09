import { useState } from 'react';

import Button from '@components/common/Button';
import Modal from '@components/common/Modal';

import { SkillMapByOrganizationPanel } from '@app/(main)/skill-map/skill-map-by-organization-panel';

import { ActionsModal } from '@constants/enums';

import useSkillMapInfo from '@hooks/useSkillMapList';

import {
  SkillMapByOrganization,
  SkillMapByOrganizationInfo,
} from '@interfaces/skills';

interface SettingSkillProps {
  open: boolean;
  action: ActionsModal;
  onClose: () => void;
  onOpenConfirmSettingSkillInfo?: (skill: SkillMapByOrganizationInfo) => void;
  onEditSettingSkill?: (skillId: string) => Promise<void>;
}
export const SettingSkillModal = ({
  open,
  action,
  onClose,
  onOpenConfirmSettingSkillInfo,
  onEditSettingSkill,
}: SettingSkillProps) => {
  // Skill map list
  const [skillMapByOrganizations, setSkillMapByOrganizations] = useState<
    SkillMapByOrganization[]
  >([]);

  // Get skill map info
  const { skillMapInfo } = useSkillMapInfo({
    onSuccess: (data) => {
      setSkillMapByOrganizations(data.organizations);
    },
  });

  return (
    <Modal
      open={open}
      className="font-primary bg-white w-[915px] h-[705px] !rounded-[20px] !p-[30px]"
      contentClass="!rounded-[20px]"
      isOutSideAction={false}
      onClose={onClose}>
      <div className="flex flex-col items-center gap-5 h-full">
        <p className="text-[18px] font-medium text-center">
          {action == ActionsModal.CREATE
            ? 'スキルセット'
            : 'スキルセットを変更する'}
        </p>
        {/* Skill map by organizations */}
        <div className="overflow-y-auto max-h-[550px] !w-full !rounded-[20px]">
          {skillMapByOrganizations.length > 0 &&
            skillMapByOrganizations.map((skillMap, index) => (
              <SkillMapByOrganizationPanel
                key={index}
                skillMapDetail={skillMap}
                userId={skillMapInfo?.user.id || 0}
                settingSkillAction={action}
                onOpenConfirmSettingSkillInfo={onOpenConfirmSettingSkillInfo}
                onEditSettingSkill={onEditSettingSkill}
              />
            ))}
        </div>

        <div className="mt-auto">
          <Button variant="text" onClick={onClose}>
            閉じる
          </Button>
        </div>
      </div>
    </Modal>
  );
};
