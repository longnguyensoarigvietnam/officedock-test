import React from 'react';

import MainLayout from '@components/layouts/MainLayout';
import { PermissionsSystem } from '@constants/enums';
import { pageRouters } from '@constants/routers';
import ListLocation from './list';

const LocalPage = () => {
  return (
    <MainLayout
      title={pageRouters.LOCATION_MANAGEMENT.name}
      className="bg-[#EBF1F7] !px-10 !py-[30px]"
      permission={PermissionsSystem.VIEW_ALL}>
      <ListLocation />
    </MainLayout>
  );
};

export default LocalPage;
