import MainLayout from '@components/layouts/MainLayout';
import RoomList from './list';

import { pageRouters } from '@constants/routers';
import { PermissionsSystem } from '@constants/enums';

const VisitRoomPage = () => {
  return (
    <MainLayout
      title={pageRouters.VISIT_ROOM.name}
      permission={PermissionsSystem.VIEW_ALL}
      className="pl-8 pt-8 !overflow-x-auto"
      showFooter={false}>
      <RoomList />
    </MainLayout>
  );
};

export default VisitRoomPage;