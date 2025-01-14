import MainLayout from '@components/layouts/MainLayout';
import EditOrganizationForm from './form';

import { pageRouters } from '@constants/routers';
import { PermissionsSystem } from '@constants/enums';

const EditOrganizationPage = () => {
  return (
    <MainLayout
      title={pageRouters.EDIT_ORGANIZATION.name}
      permission={PermissionsSystem.ORGANIZATION_UPDATE}>
      <div className="flex flex-col gap-6 h-full">
        <EditOrganizationForm />
      </div>
    </MainLayout>
  );
};

export default EditOrganizationPage;
