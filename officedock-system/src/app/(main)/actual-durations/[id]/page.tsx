import React from 'react';
import MainLayout from '@components/layouts/MainLayout';
import { pageRouters } from '@constants/routers';
import { PermissionsSystem } from '@constants/enums';
import ActualDurationsDetail from './detail';

const DetailActualDurationsPage = () => {
  return (
    <MainLayout
      title={pageRouters.DETAIL_ACTUAL_DURATIONS.name}
      permission={PermissionsSystem.ACTUAL_DURATION_VIEW}
      showFooter={false}>
      <div className="flex flex-col gap-6 h-full">
        <ActualDurationsDetail />
      </div>
    </MainLayout>
  );
};

export default DetailActualDurationsPage;
