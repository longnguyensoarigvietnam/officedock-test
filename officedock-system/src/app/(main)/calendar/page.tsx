import MainLayout from '@components/layouts/MainLayout';

import { pageRouters } from '@constants/routers';
import EventCalendar from './calendar';
import { PermissionsSystem } from '@constants/enums';

const CalendarPage = () => {
  return (
    <MainLayout
      className="!bg-[#ebf1f4] !p-0 !overflow-y-hidden"
      title={pageRouters.CALENDAR_MANAGEMENT.name}
      showFooter={false}
      permission={PermissionsSystem.CALENDAR_VIEW}>
      <div className="flex flex-col h-full">
        <EventCalendar />
      </div>
    </MainLayout>
  );
};

export default CalendarPage;
