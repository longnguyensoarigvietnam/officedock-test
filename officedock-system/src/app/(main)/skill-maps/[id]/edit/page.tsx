import React from 'react';
import EditSkillMapForm from './form';
import MainLayout from '@components/layouts/MainLayout';
import { pageRouters } from '@constants/routers';
import { PermissionsSystem } from '@constants/enums';

const EditSkillMapPage = () => {
  return (
    <MainLayout
      title={pageRouters.EDIT_SKILL_MAPS.name}
      permission={PermissionsSystem.SKILL_MAP_UPDATE}>
      <div className="flex flex-col gap-6 h-full">
        <EditSkillMapForm />
      </div>
    </MainLayout>
  );
};

export default EditSkillMapPage;
