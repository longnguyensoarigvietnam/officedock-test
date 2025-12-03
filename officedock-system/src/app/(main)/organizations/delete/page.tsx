'use client';
import { Suspense } from 'react';
import { useRouter } from 'next/navigation';

import { useSessionCache } from '@providers/SessionCacheProvider';

import MainLayout from '@components/layouts/MainLayout';
import Button from '@components/common/Button';
import ImageRound from '@components/common/ImageRound';
import HiddenListOrganizations from './list';

import { pageRouters } from '@constants/routers';
import { PermissionsSystem } from '@constants/enums';

import { hasPermissionInArray } from '@utils';

const HiddenOrganizationPage = () => {
  const router = useRouter();
  const { data: session } = useSessionCache();

  return (
    <MainLayout
      title={pageRouters.ORGANIZATION_MANAGEMENT.name}
      permission={PermissionsSystem.ORGANIZATION_VIEW}
      className="px-10 py-[30px] !bg-[#F3F3F3] !overflow-x-auto"
      showFooter={false}>
      <div className="flex items-center justify-between mb-[27px]">
        <div className="flex gap-5 items-center">
          <div className="flex items-center gap-[10px]">
            <p className="text-black font-medium text-[26px] leading-[1]">
              チーム管理
            </p>
            <div className="flex items-center">
              <ImageRound
                name="Hide"
                src={'/icons/dark-close-eye.svg'}
                className="w-[16px] h-[13px] hover:cursor-pointer"
              />
              <p className="ml-1 text-[#77858F] font-medium text-xs">
                非表示一覧
              </p>
            </div>
          </div>
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
        <div
          className="flex items-center hover:cursor-pointer"
          onClick={() => {
            router.push(pageRouters.ORGANIZATION_MANAGEMENT.href);
          }}>
          <p className="ml-1 text-[#77858F] font-medium text-xs">表示中一覧</p>
          <div className="ml-[6px] flex justify-between p-[3px] rounded-full bg-white border-b">
            <ImageRound
              name="Filter extend icon"
              src={'/icons/arrow-down.svg'}
              className={`w-4 h-4 hover:cursor-pointer -rotate-90`}
            />
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-6">
        <Suspense>
          <HiddenListOrganizations />
        </Suspense>
      </div>
    </MainLayout>
  );
};

export default HiddenOrganizationPage;
