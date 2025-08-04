'use client';
import Link from 'next/link';
import { useSessionCache } from '@providers/SessionCacheProvider';

import MainLayout from '@components/layouts/MainLayout';
import Button from '@components/common/Button';

import { pageRouters } from '@constants/routers';
import { PermissionsSystem } from '@constants/enums';

import { hasPermissionInArray } from '@utils';

import ListCategory from './list';

const CategoryPage = () => {
  const { data: session } = useSessionCache();

  return (
    <MainLayout
      title={pageRouters.CATEGORY_MANAGEMENT.name}
      permission={PermissionsSystem.CATEGORY_VIEW}
      className="px-10 pt-8 !overflow-x-auto"
      showFooter={false}>
      <div className="flex gap-4 items-center mb-5">
        <p className="text-black font-medium text-[26px]">業務カテゴリー設定</p>
        <div className="flex gap-2">
          <Button
            variant="primary"
            className={`w-[128px] !p-0 text-xs h-[28px] !border-transparent text-white !rounded-[20px]`}>
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
                  className={`w-[128px] !p-0 text-xs h-[28px] !text-[#77858F] !bg-transparent !border-[#77858F] border-[1px] !rounded-[20px]`}>
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
                  className={`w-[140px] !p-0 text-xs h-[28px] !text-[#77858F] !bg-transparent !border-[#77858F] border-[1px] !rounded-[20px]`}>
                  カレンダーカテゴリー
                </Button>
              </Link>
            )}
        </div>
      </div>
      <div className="flex flex-col gap-6">
        <ListCategory />
      </div>
    </MainLayout>
  );
};

export default CategoryPage;
