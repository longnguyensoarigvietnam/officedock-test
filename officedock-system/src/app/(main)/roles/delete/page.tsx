import MainLayout from '@components/layouts/MainLayout';
import ListRolesDelete from './list';

import { pageRouters } from '@constants/routers';
import { PermissionsSystem } from '@constants/enums';
import ImageRound from '@components/common/ImageRound';
import Link from 'next/link';

const RolePage = () => {
  return (
    <MainLayout
      title={pageRouters.ROLES_MANAGEMENT.name}
      permission={PermissionsSystem.ROLE_VIEW}
      className="px-10 py-[30px] !bg-[#F3F3F3] !overflow-x-auto"
      showFooter={false}>
      <div className="flex gap-4 items-center mb-5 justify-between">
        <div className="flex items-center gap-5">
          <p className="text-black font-medium text-[26px] leading-[1]">
            権限管理
          </p>
          <div className="text-xs flex items-center gap-1">
            <ImageRound
              name="Hide"
              src={'/icons/dark-close-eye.svg'}
              className={`w-[16px] h-[13px]`}
            />
            <span className='text-[#77858F]'>非表示一覧</span>
          </div>
        </div>
        <Link
          href={pageRouters.ROLES_MANAGEMENT.href}
          className="flex items-center hover:cursor-pointer">
          <p className="ml-1 text-[#77858F] font-medium text-xs">表示中一覧</p>
          <div className="ml-[6px] flex justify-between p-[3px] rounded-full bg-white border-b">
            <ImageRound
              name="Filter extend icon"
              src={'/icons/arrow-down.svg'}
              className={`w-4 h-4 hover:cursor-pointer -rotate-90`}
            />
          </div>
        </Link>
      </div>
      <div className="flex flex-col gap-6">
        <ListRolesDelete />
      </div>
    </MainLayout>
  );
};

export default RolePage;
