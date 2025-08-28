import React from 'react';

import MainLayout from '@components/layouts/MainLayout';
import Button from '@components/common/Button';

import { PermissionsSystem } from '@constants/enums';
import { pageRouters } from '@constants/routers';

import MVPList from './list';

const LocalPage = () => {
  return (
    <MainLayout
      title={pageRouters.MVP_MANAGEMENT.name}
      className="!px-10 !py-[30px]"
      showFooter={false}
      permission={PermissionsSystem.MVP_VOTING_MANAGEMENT_VIEW}>
      <div className="flex gap-4 items-center mb-5">
        <p className="text-black font-medium text-[26px]">MVP投票管理</p>
        <div className="flex gap-2 bg-white w-fit p-[6px] rounded-[20px]">
          <Button
            variant="primary"
            className={`w-[100px] !p-0 text-xs h-[28px] !font-bold text-white border-none !rounded-[20px]`}>
            管理一覧
          </Button>
          <Button
            variant="outline"
            className={`w-[100px] !p-0 text-xs h-[28px] !font-bold !text-[#77858F] !bg-[#EBF1F7] border-none !rounded-[20px]`}>
            投票状況
          </Button>
        </div>
      </div>
      <div className="flex flex-col gap-6">
        <MVPList />
      </div>
    </MainLayout>
  );
};

export default LocalPage;
