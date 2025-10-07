'use client';

import React from 'react';

import MainLayout from '@components/layouts/MainLayout';
import ImageRound from '@components/common/ImageRound';

import { PermissionsSystem } from '@constants/enums';
import { pageRouters } from '@constants/routers';

import CurrentStatus from './current-status';
import PointHistory from './point-history';

import useCreationDataCommon from '@hooks/common/useCreationDataCommon';

const PointManagementPage = () => {
  const { creationDataCommonData } = useCreationDataCommon({
    options: {
      get_company: true,
    },
  });

  return (
    <MainLayout
      title={pageRouters.POINT_MANAGEMENT.name}
      className="!px-10 !py-[30px]"
      showFooter={false}
      permission={PermissionsSystem.VIEW_ALL}>
      <p className="text-black font-medium text-[26px] mb-[30px]">コイン設定</p>
      <div className="flex gap-[10px] items-center mb-5">
        <ImageRound
          src={`/icons/purple-company.svg`}
          name="company"
          className="w-[30px] h-[30px]"
        />
        <p className="text-[20px] font-medium">
          {creationDataCommonData?.company?.name || ''}
        </p>
      </div>
      <div className="flex gap-5">
        <CurrentStatus />
        <PointHistory />
      </div>
    </MainLayout>
  );
};

export default PointManagementPage;
