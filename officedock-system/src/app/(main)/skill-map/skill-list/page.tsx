'use client';

import { useContext } from 'react';

import MainLayout from '@components/layouts/MainLayout';

import { pageRouters } from '@constants/routers';
import { PermissionsSystem } from '@constants/enums';

import { GlobalStateContext } from '@providers/GlobalStateProvider';

import SkillList from './list';

const SkillListPage = () => {
  const { expanded } = useContext(GlobalStateContext);

  return (
    <MainLayout
      title={pageRouters.SKILL_LIST_MANAGEMENT.name}
      showFooter={false}
      className={`!px-0 !py-0 ${expanded ? '!w-[calc(100%_-_210px)]' : '!w-[calc(100%_-_70px)]'} `}
      permission={PermissionsSystem.MY_DOCK_SKILL_MAP_VIEW}>
      <SkillList />
    </MainLayout>
  );
};

export default SkillListPage;
