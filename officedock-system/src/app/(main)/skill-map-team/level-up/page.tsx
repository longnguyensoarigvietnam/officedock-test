import Link from 'next/link';

import MainLayout from '@components/layouts/MainLayout';
import Button from '@components/common/Button';

import { pageRouters } from '@constants/routers';
import { PermissionsSystem } from '@constants/enums';

import LevelUpList from './list';

const LevelUpPage = () => {
  return (
    <MainLayout
      title={pageRouters.LEVEL_UP_TEAM.name}
      showFooter={false}
      className="!px-10 !py-[30px]"
      permission={PermissionsSystem.SKILL_MAP_VIEW}>
      <div className="flex gap-2 items-center mb-[30px]">
        <Link href={pageRouters.SKILL_MAP_TEAM.href}>
          <Button
            variant="outline"
            className={`w-[100px] !p-0 text-xs h-[28px] !text-[#77858F] !bg-transparent !border-[#77858F] border-[1px] !rounded-[20px]`}>
            メンバー一覧
          </Button>
        </Link>
        <Button
          variant="primary"
          className={`w-[120px] !p-0 text-xs h-[28px] !border-transparent text-white !rounded-[20px]`}>
          レベルアップ申請
        </Button>
      </div>
      <div className="flex flex-col gap-6">
        <LevelUpList />
      </div>
    </MainLayout>
  );
};

export default LevelUpPage;
