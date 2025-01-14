import React from 'react';
import CreateOrganizationSkillForm from './form';
import MainLayout from '@components/layouts/MainLayout';
import { pageRouters } from '@constants/routers';
import { PermissionsSystem } from '@constants/enums';

const CreateOrganizationSkillPage = () => {
  return (
    <MainLayout
      title={pageRouters.CREATE_ORGANIZATION_SKILL.name}
      permission={PermissionsSystem.ORGANIZATION_SKILL_ADD}>
      <div className="flex flex-col gap-6 h-full">
        <CreateOrganizationSkillForm />
      </div>
    </MainLayout>
  );
};

export default CreateOrganizationSkillPage;
