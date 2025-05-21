'use client';

import { useContext } from 'react';
import Link from 'next/link';

import MainLayout from '@components/layouts/MainLayout';
import Button from '@components/common/Button';
import ImageRound from '@components/common/ImageRound';

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
      className={`!px-10 !py-[30px] ${expanded ? '!w-[calc(100%_-_210px)]' : '!w-[calc(100%_-_70px)]'} `}
      permission={PermissionsSystem.SKILL_MAP_VIEW}>
      <div className="flex mb-7 justify-between">
        <div className="flex gap-2 items-center">
          <Link href={pageRouters.SKILL_MAP.href}>
            <Button
              variant="outline"
              className={`w-[90px] !p-0 text-xs h-[28px] !text-[#77858F] !bg-transparent !border-[#77858F] border-[1px] !rounded-[20px] `}>
              スキルマップ
            </Button>
          </Link>

          <Link href={pageRouters.SKILL_MAP_SKILL.href}>
            <Button
              variant="outline"
              className={`w-[90px] !p-0 text-xs h-[28px] !text-[#77858F] !bg-transparent !border-[#77858F] border-[1px] !rounded-[20px]`}>
              マイスキル
            </Button>
          </Link>

          <Link href={pageRouters.SKILL_LIST_MANAGEMENT.href}>
            <Button
              variant="primary"
              className={`w-[90px] !p-0 text-xs h-[28px] !border-transparent text-white !rounded-[20px]`}>
              スキル一覧
            </Button>
          </Link>
        </div>
        <Link href={pageRouters.SKILL_MAPS_MANAGEMENT.href}>
          <Button className="w-[158px] !p-0 text-sm h-[34px] !border-transparent !text-[#77858F] bg-white rounded-[6px]">
            スキルマップ設定{' '}
            <ImageRound
              src="/icons/detail-task.svg"
              name="right"
              style={{
                height: '18px',
                width: '18px',
              }}
              className="!text-transparent ml-1 cursor-pointer"
            />
          </Button>
        </Link>
      </div>

      <SkillList />
    </MainLayout>
  );
};

export default SkillListPage;
