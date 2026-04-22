import MainLayout from '@components/layouts/MainLayout';
import ListMember from './list';
import { pageRouters } from '@constants/routers';
import { PermissionsSystem } from '@constants/enums';

const MemberListPage = () => {
  return (
    <MainLayout
      title={pageRouters.MEMBER_MANAGEMENT.name}
      className="bg-[#E6F3FB]"
      permission={PermissionsSystem.VIEW_ALL}>
      <ListMember />
    </MainLayout>
  );
};

export default MemberListPage;
