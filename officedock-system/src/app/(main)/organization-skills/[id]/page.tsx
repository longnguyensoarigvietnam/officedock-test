import React from 'react';
import MainLayout from '@components/layouts/MainLayout';
import { pageRouters } from '@constants/routers';
import DetailOrganizationSkill from './detail';
import { PermissionsSystem } from '@constants/enums';

const DetailOrganizationSkillPage = () => {
  return (
    <MainLayout
      title={pageRouters.CREATE_ORGANIZATION_SKILL.name}
      permission={PermissionsSystem.ORGANIZATION_SKILL_VIEW}>
      <div className="flex flex-col gap-6 h-full">
        <DetailOrganizationSkill />
      </div>
    </MainLayout>
  );
};

export default DetailOrganizationSkillPage;
