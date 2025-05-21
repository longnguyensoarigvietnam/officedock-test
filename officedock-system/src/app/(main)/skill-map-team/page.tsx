import MainLayout from '@components/layouts/MainLayout';
import Button from '@components/common/Button';

import { pageRouters } from '@constants/routers';
import { PermissionsSystem } from '@constants/enums';

import MemberList from './member-list';
import Link from 'next/link';

const SkillMapTeamPage = () => {
  return (
    <MainLayout
      title={pageRouters.SKILL_MAP_TEAM.name}
      showFooter={false}
      className="!px-10 !py-[30px]"
      permission={PermissionsSystem.SKILL_MAP_VIEW}>
      <div className="flex gap-2 items-center mb-[30px]">
        <Button
          variant="primary"
          className={`w-[100px] !p-0 text-xs h-[28px] !border-transparent text-white !rounded-[20px]`}>
          メンバー一覧
        </Button>
        <Link href={pageRouters.LEVEL_UP_TEAM.href}>
          <Button
            variant="outline"
            className={`w-[120px] !p-0 text-xs h-[28px] !text-[#77858F] !bg-transparent !border-[#77858F] border-[1px] !rounded-[20px]`}>
            レベルアップ申請
          </Button>
        </Link>
      </div>
      <div className="flex flex-col gap-6">
        <MemberList />
      </div>
    </MainLayout>
  );
};

export default SkillMapTeamPage;
