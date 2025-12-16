import React from 'react';
import { notFound } from 'next/navigation';

import MainLayout from '@components/layouts/MainLayout';

import { pageRouters } from '@constants/routers';
import { PermissionsSystem } from '@constants/enums';

import ActualDurationsDetail from './detail';

const DetailActualDurationsPage = () => {
  const showActualDurationPage =
    process.env.NEXT_PUBLIC_SHOW_ACTUAL_DURATION_PAGE?.toLowerCase() === 'true';

  if (!showActualDurationPage) {
    notFound()
  } else {
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
  }
};

export default DetailActualDurationsPage;
