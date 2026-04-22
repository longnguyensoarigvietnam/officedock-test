import MainLayout from '@components/layouts/MainLayout';
import RoomDetail from './detail';

import { pageRouters } from '@constants/routers';
import { PermissionsSystem } from '@constants/enums';

const RoomDetailPage = () => {
  return (
    <MainLayout
      title={pageRouters.VISIT_ROOM.name}
      permission={PermissionsSystem.VIEW_ALL}
      className="pl-[41px] pt-6 !overflow-x-auto"
      showFooter={false}>
      <RoomDetail />
    </MainLayout>
  );
};

export default RoomDetailPage;