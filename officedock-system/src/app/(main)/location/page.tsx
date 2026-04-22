import React from 'react';

import MainLayout from '@components/layouts/MainLayout';
import { PermissionsSystem } from '@constants/enums';
import { pageRouters } from '@constants/routers';
import ListLocation from './list';

const LocalPage = () => {
  return (
    <MainLayout
      title={pageRouters.LOCATION_MANAGEMENT.name}
      className="!px-10 !py-[30px]"
      showFooter={false}
      permission={PermissionsSystem.CALENDAR_MANAGEMENT_VIEW}>
      <ListLocation />
    </MainLayout>
  );
};

export default LocalPage;
