import React from 'react';
import Link from 'next/link';

import MainLayout from '@components/layouts/MainLayout';
import Button from '@components/common/Button';

import { pageRouters } from '@constants/routers';
import { PermissionsSystem } from '@constants/enums';

import EditSkillMapByMemberBoard from './board';

const EditSkillMapByMemberPage = () => {
  return (
    <MainLayout
      title={pageRouters.EDIT_SKILL_MAPS_MEMBERS.name}
      className="px-10 !bg-[#EBF1F7]"
      showFooter={false}
      permission={PermissionsSystem.SKILL_MAP_UPDATE}>
      <div className="flex gap-4 items-center mb-5">
        <p className="text-black font-medium text-[26px]">スキルマップ設定</p>
        <div className="flex gap-2">
          <Link href={pageRouters.SKILL_MAPS_MANAGEMENT.href}>
            <Button
              variant="outline"
              className={`w-[90px] !p-0 text-xs h-[28px] !text-[#77858F] !bg-transparent !border-[#77858F] border-[1px] !rounded-[20px]`}>
              スキル編集
            </Button>
          </Link>
          <Button
            variant="primary"
            className={`w-[120px] !p-0 text-xs h-[28px] text-white !border-transparent !rounded-[20px]`}>
            対応メンバー編集
          </Button>
        </div>
      </div>
      <div className="flex flex-col gap-6">
        <EditSkillMapByMemberBoard />
      </div>
    </MainLayout>
  );
};

export default EditSkillMapByMemberPage;
