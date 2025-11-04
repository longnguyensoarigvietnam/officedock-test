'use client';
import { useSessionCache } from '@providers/SessionCacheProvider';

import { useRouter } from 'next/navigation';
import Button from '@components/common/Button';
import MainLayout from '@components/layouts/MainLayout';

import { pageRouters } from '@constants/routers';
import { PermissionsSystem } from '@constants/enums';
import HierarchyOrganization from './hierarchies';
import { hasPermissionInArray } from '@utils';

const OrganizationPage = () => {
  const router = useRouter();
  const { data: session } = useSessionCache();

  return (
    <MainLayout
      title={pageRouters.ORGANIZATION_HIERARCHY.name}
      permission={PermissionsSystem.ORGANIZATION_HIERARCHY_VIEW}
      className="px-10 py-[30px] !overflow-x-auto"
      showFooter={false}>
      <div className="flex justify-between items-start">
        <div className="flex gap-5 items-center mb-[27px] w-fit">
          <p className="text-black font-medium text-[26px]">チーム管理</p>
          <div className="flex justify-center items-center gap-2 bg-white w-fit p-[6px] rounded-[20px] ">
            <Button
              onClick={() => {
                router.push(pageRouters.ORGANIZATION_MANAGEMENT.href);
              }}
              variant={'outline'}
              className={`w-[80px] !p-0 text-xs h-[28px] !font-bold !text-[#77858F] !bg-[#EBF1F7] border-none !rounded-[20px]`}>
              チーム作成
            </Button>
            <Button
              variant={'primary'}
              className={`w-[80px] !p-0 text-xs h-[28px] !font-bold text-white border-none !rounded-[20px]`}>
              チーム階層
            </Button>
          </div>
        </div>
        {session?.user.permissions &&
          hasPermissionInArray(
            session?.user.permissions,
            PermissionsSystem.ORGANIZATION_HIERARCHY_UPDATE,
          ) && (
            <Button
              type="button"
              onClick={() => {
                router.push(pageRouters.ORGANIZATION_HIERARCHY_EDIT.href);
              }}
              className="w-[100px] h-[34px] !text-[14px] !px-2 relative top-[4px]">
              編集
            </Button>
          )}
      </div>
      <div className="flex flex-col gap-5">
        <HierarchyOrganization />
      </div>
    </MainLayout>
  );
};

export default OrganizationPage;
