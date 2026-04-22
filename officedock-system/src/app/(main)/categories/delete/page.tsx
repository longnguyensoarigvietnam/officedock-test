'use client';
import Link from 'next/link';

import { useSessionCache } from '@providers/SessionCacheProvider';

import MainLayout from '@components/layouts/MainLayout';
import Button from '@components/common/Button';
import ImageRound from '@components/common/ImageRound';

import { pageRouters } from '@constants/routers';
import { PermissionsSystem } from '@constants/enums';

import { hasPermissionInArray } from '@utils';

import ListCategory from './list';

const HiddenCategoryPage = () => {
  const { data: session } = useSessionCache();

  return (
    <MainLayout
      title={pageRouters.CATEGORY_MANAGEMENT.name}
      permission={PermissionsSystem.CATEGORY_VIEW}
      className="px-10 py-[30px] !overflow-x-auto !bg-[#F3F3F3]"
      showFooter={false}>
      <div className="flex justify-between mb-5">
        <div className="flex gap-5 items-center">
          <div className="flex items-center gap-[10px]">
            <p className="text-black font-medium text-[26px] leading-[1]">
              業務カテゴリー設定
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
          <div className="flex gap-[6px] bg-white w-fit p-[6px] rounded-[20px]">
            <Button
              variant="primary"
              className={`w-[140px] !p-0 text-xs h-[28px] !font-bold text-white border-none !rounded-[20px]`}>
              社内共通カテゴリー
            </Button>
            {session?.user.permissions &&
              hasPermissionInArray(
                session?.user.permissions,
                PermissionsSystem.CATEGORY_HIERARCHY_VIEW,
              ) && (
                <Link href={pageRouters.TEAM_CATEGORY_MANAGEMENT.href}>
                  <Button
                    variant="outline"
                    className={`w-[140px] !p-0 text-xs h-[28px] !font-bold !text-[#77858F] !bg-[#EBF1F7] border-none !rounded-[20px]`}>
                    チームカテゴリー
                  </Button>
                </Link>
              )}
            {session?.user.permissions &&
              hasPermissionInArray(
                session?.user.permissions,
                PermissionsSystem.CATEGORY_HIERARCHY_VIEW,
              ) && (
                <Link href={pageRouters.CALENDAR_CATEGORY_MANAGEMENT.href}>
                  <Button
                    variant="outline"
                    className={`w-[140px] !p-0 text-xs h-[28px] !font-bold !text-[#77858F] !bg-[#EBF1F7] border-none !rounded-[20px]`}>
                    カレンダーカテゴリー
                  </Button>
                </Link>
              )}
          </div>
        </div>
        <Link
          href={pageRouters.CATEGORY_MANAGEMENT.href}
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
        <ListCategory />
      </div>
    </MainLayout>
  );
};

export default HiddenCategoryPage;
