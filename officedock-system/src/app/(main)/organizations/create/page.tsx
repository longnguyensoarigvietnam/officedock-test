import MainLayout from '@components/layouts/MainLayout';
import CreateOrganizationForm from './form';

import { pageRouters } from '@constants/routers';
import { PermissionsSystem } from '@constants/enums';

const CreateOrganizationPage = () => {
  return (
    <MainLayout
      title={pageRouters.CREATE_ORGANIZATION.name}
      permission={PermissionsSystem.ORGANIZATION_ADD}>
      <div className="flex flex-col gap-6 h-full">
        <CreateOrganizationForm />
      </div>
    </MainLayout>
  );
};

export default CreateOrganizationPage;
