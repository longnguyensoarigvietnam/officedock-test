import React from 'react';

import MainLayout from '@components/layouts/MainLayout';

import { pageRouters } from '@constants/routers';
import { PermissionsSystem } from '@constants/enums';

import EditSkillMapByMemberBoard from './board';

const EditSkillMapByMemberPage = () => {
  return (
    <MainLayout
      title={pageRouters.EDIT_SKILL_MAPS_MEMBERS.name}
      className="px-0 !pt-0"
      showFooter={false}
      permission={PermissionsSystem.SKILL_MAP_MANAGEMENT_UPDATE}>
      <EditSkillMapByMemberBoard />
    </MainLayout>
  );
};

export default EditSkillMapByMemberPage;
