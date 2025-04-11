import MainLayout from '@components/layouts/MainLayout';

import EditRoleForm from './form';

import { pageRouters } from '@constants/routers';
import { PermissionsSystem } from '@constants/enums';

const EditRolesPage = () => {
  return (
    <MainLayout
      title={pageRouters.EDIT_ROLE.name}
      permission={PermissionsSystem.ROLE_UPDATE}
      className="px-8 pt-8 !bg-[#EBF1F7]"
      showFooter={false}>
      <div className="flex flex-col gap-6 h-full">
        <EditRoleForm />
      </div>
    </MainLayout>
  );
};

export default EditRolesPage;
