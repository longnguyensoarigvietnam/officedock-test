'use client';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Button from '@components/common/Button';
import MainLayout from '@components/layouts/MainLayout';

import { pageRouters } from '@constants/routers';
import { PermissionsSystem } from '@constants/enums';
import HierarchyOrganization from './hierarchies';
import { hasPermissionInArray } from '@utils';

const OrganizationPage = () => {
  const router = useRouter();
  const { data: session } = useSession();

  return (
    <MainLayout
      title={pageRouters.ORGANIZATION_HIERARCHY.name}
      permission={PermissionsSystem.ORGANIZATION_HIERARCHY_VIEW}
      className="px-10 pt-8 !overflow-x-auto !bg-[#EBF1F7]"
      showFooter={false}>
      <div className="flex justify-between items-start">
        <div className="flex gap-5 items-center mb-5 w-fit">
          <p className="text-black font-medium text-[26px]">チーム管理</p>
          <div className="flex justify-center items-center gap-2 ">
            <Button
              onClick={() => {
                router.push(pageRouters.ORGANIZATION_MANAGEMENT.href);
              }}
              variant={'outline'}
              className={`!text-[#77858F] !bg-transparent !border-[#77858F] !py-0 !px-0 font-bold w-[80px] h-7 !rounded-[20px] text-xs`}>
              チーム作成
            </Button>
            <Button
              variant={'primary'}
              className={`!py-0 !px-0 font-bold w-[80px] h-7 
              !rounded-[20px] text-xs`}>
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
