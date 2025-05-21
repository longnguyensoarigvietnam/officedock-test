import Link from 'next/link';

import MainLayout from '@components/layouts/MainLayout';
import Button from '@components/common/Button';
import ListSkillsMap from './list';

import { pageRouters } from '@constants/routers';
import { PermissionsSystem } from '@constants/enums';

const SkillsMapPage = () => {
  return (
    <MainLayout
      title={pageRouters.SKILL_MAPS_MANAGEMENT.name}
      permission={PermissionsSystem.SKILL_MAP_VIEW}
      className="px-10 !overflow-x-auto !bg-[#EBF1F7]"
      showFooter={false}>
      <div className="flex gap-4 items-center mb-5">
        <p className="text-black font-medium text-[26px]">スキルマップ設定</p>
        <div className="flex gap-2">
          <Button
            variant="primary"
            className={`w-[90px] !p-0 text-xs h-[28px] !border-transparent text-white !rounded-[20px]`}>
            スキル編集
          </Button>
          <Link href={pageRouters.SKILL_MAPS_MEMBERS_MANAGEMENT.href}>
            <Button
              variant="outline"
              className={`w-[120px] !p-0 text-xs h-[28px] !text-[#77858F] !bg-transparent !border-[#77858F] border-[1px] !rounded-[20px]`}>
              対応メンバー編集
            </Button>
          </Link>
        </div>
      </div>
      <div className="flex flex-col gap-6">
        <ListSkillsMap />
      </div>
    </MainLayout>
  );
};

export default SkillsMapPage;
