'use client';
import { Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useSessionCache } from '@providers/SessionCacheProvider';

import MainLayout from '@components/layouts/MainLayout';
import Button from '@components/common/Button';
import ListOrganizations from './list';

import { pageRouters } from '@constants/routers';
import { PermissionsSystem } from '@constants/enums';
import { hasPermissionInArray } from '@utils';

const OrganizationPage = () => {
  const router = useRouter();
  const { data: session } = useSessionCache();

  return (
    <MainLayout
      title={pageRouters.ORGANIZATION_MANAGEMENT.name}
      permission={PermissionsSystem.ORGANIZATION_VIEW}
      className="px-10 !overflow-x-auto"
      showFooter={false}>
      <div className="flex gap-5 items-center mb-5">
        <p className="text-black font-medium text-[26px]">チーム管理</p>
        <div className="flex justify-center items-center gap-2 bg-white w-fit p-[6px] rounded-[20px]">
          <Button
            variant={'primary'}
            className={`w-[80px] !p-0 text-xs h-[28px] !font-bold text-white border-none !rounded-[20px]`}>
            チーム作成
          </Button>
          {session?.user.permissions &&
            hasPermissionInArray(
              session?.user.permissions,
              PermissionsSystem.ORGANIZATION_HIERARCHY_VIEW,
            ) && (
              <Button
                onClick={() => {
                  router.push(pageRouters.ORGANIZATION_HIERARCHY.href);
                }}
                variant={'outline'}
                className={`w-[80px] !p-0 text-xs h-[28px] !font-bold !text-[#77858F] !bg-[#EBF1F7] border-none !rounded-[20px]`}>
                チーム階層
              </Button>
            )}
        </div>
      </div>
      <div className="flex flex-col gap-6">
        <Suspense>
          <ListOrganizations />
        </Suspense>
      </div>
    </MainLayout>
  );
};

export default OrganizationPage;
