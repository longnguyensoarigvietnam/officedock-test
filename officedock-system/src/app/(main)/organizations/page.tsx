'use client';
import { Suspense } from 'react';
import { useRouter } from 'next/navigation';

import MainLayout from '@components/layouts/MainLayout';
import Button from '@components/common/Button';
import ListOrganizations from './list';

import { pageRouters } from '@constants/routers';
import { PermissionsSystem } from '@constants/enums';

const OrganizationPage = () => {
  const router = useRouter();
  return (
    <MainLayout
      title={pageRouters.ORGANIZATION_MANAGEMENT.name}
      permission={PermissionsSystem.ORGANIZATION_VIEW}
      className="px-10 !overflow-x-auto !bg-[#EBF1F7]"
      showFooter={false}>
      <div className="flex gap-5 items-center mb-5">
        <p className="text-black font-medium text-[26px]">チーム管理</p>
        <div className="flex justify-center items-center gap-2 ">
          <Button
            variant={'primary'}
            className={`!py-0 !px-0 font-bold w-[80px] h-7 
              !rounded-[20px] text-xs`}>
            チーム作成
          </Button>
          <Button
            onClick={() => {
              router.push(pageRouters.ORGANIZATION_HIERARCHY.href);
            }}
            variant={'outline'}
            className={`!text-[#77858F] !bg-transparent !border-[#77858F] !py-0 !px-0 font-bold w-[80px] h-7 !rounded-[20px] text-xs`}>
            チーム階層
          </Button>
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
