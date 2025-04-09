import { Suspense } from 'react';
import MainLayout from '@components/layouts/MainLayout';

import { pageRouters } from '@constants/routers';
import { PermissionsSystem } from '@constants/enums';
import EventCalendar from './calendar';

const CalendarPage = () => {
  return (
    <MainLayout
      className="!bg-[#ebf1f4] !p-0 !overflow-y-hidden"
      title={pageRouters.CALENDAR_MANAGEMENT.name}
      showFooter={false}
      permission={PermissionsSystem.CALENDAR_VIEW}>
      <div className="flex flex-col h-full">
        <Suspense>
          <EventCalendar />
        </Suspense>
      </div>
    </MainLayout>
  );
};

export default CalendarPage;
