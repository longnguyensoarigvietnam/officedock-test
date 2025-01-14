import React from 'react';
import MainLayout from '@components/layouts/MainLayout';
import { pageRouters } from '@constants/routers';
import EditOrganizationSkillForm from './form';
import { PermissionsSystem } from '@constants/enums';

const EditOrganizationSkillPage = () => {
  return (
    <MainLayout
      title={pageRouters.CREATE_ORGANIZATION_SKILL.name}
      permission={PermissionsSystem.ORGANIZATION_SKILL_UPDATE}>
      <div className="flex flex-col gap-6 h-full">
        <EditOrganizationSkillForm />
      </div>
    </MainLayout>
  );
};

export default EditOrganizationSkillPage;
