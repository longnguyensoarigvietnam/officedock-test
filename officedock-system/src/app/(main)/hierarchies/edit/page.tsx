import React from 'react';
import EditHierarchyForm from './board';
import MainLayout from '@components/layouts/MainLayout';
import { pageRouters } from '@constants/routers';
import { PermissionsSystem } from '@constants/enums';
import Link from 'next/link';
import Button from '@components/common/Button';

const EditHierarchyPage = () => {
  return (
    <MainLayout
      title={pageRouters.EDIT_HIERARCHY.name}
      className="pl-8 pt-8 !bg-[#EBF1F7]"
      showFooter={false}
      permission={PermissionsSystem.CATEGORY_HIERARCHY_UPDATE}>
      <div className="flex gap-4 items-center">
        <p className="text-black font-medium text-[26px]">業務カテゴリー設定</p>
        <div className="flex gap-2">
          <Link href={pageRouters.CATEGORY_MANAGEMENT.href}>
            <Button
              variant="outline"
              className={`w-[152px] !p-0 text-xs h-[28px] !text-[#77858F] !bg-transparent !border-[#77858F] border-[1px] !rounded-[20px]`}>
              共通業務カテゴリー登録
            </Button>
          </Link>

          <Link href={pageRouters.HIERARCHY_MANAGEMENT.href}>
            <Button
              variant="primary"
              className={`w-[152px] !p-0 text-xs h-[28px] !border-transparent text-white !rounded-[20px]`}>
              業務カテゴリー階層
            </Button>
          </Link>
        </div>
      </div>
      <EditHierarchyForm />
    </MainLayout>
  );
};

export default EditHierarchyPage;
