import MainLayout from '@components/layouts/MainLayout';
import ListRoles from './list';

import { pageRouters } from '@constants/routers';
import { PermissionsSystem } from '@constants/enums';
import Link from 'next/link';
import ImageRound from '@components/common/ImageRound';

const RolePage = () => {
  return (
    <MainLayout
      title={pageRouters.ROLES_MANAGEMENT.name}
      permission={PermissionsSystem.ROLE_VIEW}
      className="px-10 py-[30px] !overflow-x-auto"
      showFooter={false}>
      <div className="flex gap-4 items-center mb-[30px] justify-between">
        <p className="text-black font-medium text-[26px] leading-[1]">
          権限管理
        </p>
        <Link
          href={pageRouters.ROLES_MANAGEMENT_HIDDEN.href}
          className="flex items-center hover:cursor-pointer">
          <ImageRound
            name="Hide"
            src={'/icons/dark-close-eye.svg'}
            className={`w-[16px] h-[13px] hover:cursor-pointer ml-1`}
          />
          <p className="ml-1 text-[#77858F] font-medium text-xs">非表示一覧</p>
          <div className="ml-[6px] flex justify-between p-[3px] rounded-full bg-white border-b">
            <ImageRound
              name="Filter extend icon"
              src={'/icons/arrow-down.svg'}
              className={`w-4 h-4 hover:cursor-pointer -rotate-90`}
            />
          </div>
        </Link>
      </div>
      <div className="flex flex-col gap-[30px]">
        <ListRoles />
      </div>
    </MainLayout>
  );
};

export default RolePage;
