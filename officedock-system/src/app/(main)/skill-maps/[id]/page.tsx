import React from 'react';
import MainLayout from '@components/layouts/MainLayout';
import { pageRouters } from '@constants/routers';
import DetailSkillMap from './detail';
import { PermissionsSystem } from '@constants/enums';

const DetailSkillMapPage = () => {
  return (
    <MainLayout
      title={pageRouters.DETAIL_SKILL_MAPS.name}
      permission={PermissionsSystem.SKILL_MAP_VIEW}>
      <div className="flex flex-col gap-6 h-full">
        <DetailSkillMap />
      </div>
    </MainLayout>
  );
};

export default DetailSkillMapPage;
