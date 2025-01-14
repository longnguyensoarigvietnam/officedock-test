import MainLayout from '@components/layouts/MainLayout';
import { PermissionsSystem } from '@constants/enums';

const DefaultPage = () => {
  return (
    <MainLayout title="" permission={PermissionsSystem.VIEW_ALL}>
      <div className="flex flex-col gap-6">
        <div></div>
      </div>
    </MainLayout>
  );
};

export default DefaultPage;
