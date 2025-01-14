import MainLayout from '@components/layouts/MainLayout';
import ListActualDurations from './list';

import { pageRouters } from '@constants/routers';
import { PermissionsSystem } from '@constants/enums';

const ActualDurationsPage = () => {
  return (
    <MainLayout
      title={pageRouters.ACTUAL_DURATIONS_MANAGEMENT.name}
      permission={PermissionsSystem.VIEW_ALL}>
      <div className="flex flex-col gap-6">
        <ListActualDurations />
      </div>
    </MainLayout>
  );
};

export default ActualDurationsPage;
