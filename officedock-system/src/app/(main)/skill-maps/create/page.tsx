import React from 'react';
import CreateSkillMapForm from './form';
import MainLayout from '@components/layouts/MainLayout';
import { pageRouters } from '@constants/routers';
import { PermissionsSystem } from '@constants/enums';

const CreateSkillMapPage = () => {
  return (
    <MainLayout
      title={pageRouters.CREATE_SKILL_MAPS.name}
      permission={PermissionsSystem.SKILL_MAP_ADD}>
      <div className="flex flex-col gap-6 h-full">
        <CreateSkillMapForm />
      </div>
    </MainLayout>
  );
};

export default CreateSkillMapPage;
