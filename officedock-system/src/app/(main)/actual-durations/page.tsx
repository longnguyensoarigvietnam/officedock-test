import { notFound } from 'next/navigation';

import MainLayout from '@components/layouts/MainLayout';
import ListActualDurations from './list';

import { pageRouters } from '@constants/routers';
import { PermissionsSystem } from '@constants/enums';

const ActualDurationsPage = () => {
  const showActualDurationPage =
    process.env.NEXT_PUBLIC_SHOW_ACTUAL_DURATION_PAGE?.toLowerCase() === 'true';

  if (!showActualDurationPage) {
    notFound()
  } else {
    return (
      <MainLayout
        title={pageRouters.ACTUAL_DURATIONS_MANAGEMENT.name}
        permission={PermissionsSystem.ACTUAL_DURATION_VIEW}
        showFooter={false}>
        <div className="flex flex-col gap-6">
          <ListActualDurations />
        </div>
      </MainLayout>
    );
  }
};

export default ActualDurationsPage;
