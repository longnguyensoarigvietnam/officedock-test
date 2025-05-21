import Link from 'next/link';

import MainLayout from '@components/layouts/MainLayout';
import Button from '@components/common/Button';

import { pageRouters } from '@constants/routers';
import { PermissionsSystem } from '@constants/enums';

import SkillMap from './map';

const SkillsPage = () => {
  return (
    <MainLayout
      title={pageRouters.SKILL_MAP.name}
      showFooter={false}
      className="!px-10 !py-[30px]"
      permission={PermissionsSystem.SKILL_MAP_VIEW}>
      <div className="flex gap-2 items-center mb-7">
        <Button
          variant="primary"
          className={`w-[90px] !p-0 text-xs h-[28px] !border-transparent text-white !rounded-[20px]`}>
          スキルマップ
        </Button>
        <Link href={pageRouters.SKILL_MAP_SKILL.href}>
          <Button
            variant="outline"
            className={`w-[90px] !p-0 text-xs h-[28px] !text-[#77858F] !bg-transparent !border-[#77858F] border-[1px] !rounded-[20px]`}>
            マイスキル
          </Button>
        </Link>
        <Link href={pageRouters.SKILL_LIST_MANAGEMENT.href}>
          <Button
            variant="outline"
            className={`w-[90px] !p-0 text-xs h-[28px] !text-[#77858F] !bg-transparent !border-[#77858F] border-[1px] !rounded-[20px]`}>
            スキル一覧
          </Button>
        </Link>
      </div>
      <div className="flex flex-col gap-6">
        <SkillMap />
      </div>
    </MainLayout>
  );
};

export default SkillsPage;
