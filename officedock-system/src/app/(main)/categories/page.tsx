'use client';
import Link from 'next/link';

import MainLayout from '@components/layouts/MainLayout';
import Button from '@components/common/Button';

import { pageRouters } from '@constants/routers';
import { PermissionsSystem } from '@constants/enums';

import ListCategory from './list';

const CategoryPage = () => {
  return (
    <MainLayout
      title={pageRouters.CATEGORY_MANAGEMENT.name}
      permission={PermissionsSystem.CATEGORY_VIEW}
      className="px-10 !overflow-x-auto !bg-[#EBF1F7]"
      showFooter={false}>
      <div className="flex gap-4 items-center mb-5">
        <p className="text-black font-medium text-[26px]">業務カテゴリー設定</p>
        <div className="flex gap-2">
          <Link href={pageRouters.CATEGORY_MANAGEMENT.href}>
            <Button
              variant="primary"
              className={`w-[152px] !p-0 text-xs h-[28px] !border-transparent text-white !rounded-[20px]`}>
              社内共通カテゴリー
            </Button>
          </Link>

          <Link href={pageRouters.HIERARCHY_MANAGEMENT.href}>
            <Button
              variant="outline"
              className={`w-[152px] !p-0 text-xs h-[28px] !text-[#77858F] !bg-transparent !border-[#77858F] border-[1px] !rounded-[20px]`}>
              チームカテゴリー
            </Button>
          </Link>
        </div>
      </div>
      <div className="flex flex-col gap-6">
        <ListCategory />
      </div>
    </MainLayout>
  );
};

export default CategoryPage;
