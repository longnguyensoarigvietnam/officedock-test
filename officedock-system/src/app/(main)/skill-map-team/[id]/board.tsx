'use client';
import React, { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

import Button from '@components/common/Button';
import ImageRound from '@components/common/ImageRound';
import { SkillMapBanner } from '@components/skillMap/SkillMapBanner';

import { pageRouters } from '@constants/routers';

import useSkillMapInfo from '@hooks/useSkillMapList';

import { SkillMapByOrganization } from '@interfaces/skills';

import { SkillMapDetailByUser } from './skill-map-detail';
import MySkillDetailByUser from './my-skill-detail';

const BoardSkillUser = () => {
  const searchParams = useSearchParams();
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [isMapOption, setIsMapOption] = useState(true);

  // Params
  const user_organizationId = searchParams.get('user_organization');
  const isMapParam = searchParams.get('is_map');
  const isSkill = searchParams.get('is_skill');
  const userId = params.id;
  const tabId = searchParams.get('tabId');

  const [detailSkillData, setDetailSkillData] = useState<
    SkillMapByOrganization[]
  >([]);

  // Get skillmap info
  const { skillMapInfo } = useSkillMapInfo({
    organizationId: user_organizationId || '',
    userId: userId,
    onSuccess: (data) => {
      setDetailSkillData(data.organizations);
    },
  });

  useEffect(() => {
    if (isMapParam) {
      setIsMapOption(true);
    }
    if (isSkill) {
      setIsMapOption(false);
    }
  }, [isMapParam, isSkill]);

  // Navigate to prev/next user
  const handleNavigateUser = (userId: number | undefined) => {
    if (!userId) return;

    const params = new URLSearchParams(searchParams.toString());
    const newPath = `${pageRouters.SKILL_MAP_TEAM_DETAIL.href(userId)}?${params.toString()}`;
    router.push(newPath);
  };
  return (
    <>
      {/* Navigate buttons */}
      <div className="sticky z-[21] top-[0px] px-10 py-[27px] bg-[#E6F3FB]">
        <div className="flex justify-between">
          <div className="flex gap-2 items-center bg-white w-fit p-[6px] rounded-[20px]">
            <Button
              variant={isMapOption ? 'primary' : 'outline'}
              onClick={() => {
                const params = new URLSearchParams(searchParams);
                params.delete('is_skill');
                params.set('is_map', 'true');
                router.replace(`?${params.toString()}`);
              }}
              className={`w-[100px] !p-0 text-xs h-[28px] !font-bold text-white border-none !rounded-[20px] ${isMapOption ? '' : '!text-[#77858F] !bg-[#EBF1F7]'}`}>
              スキルマップ
            </Button>
            <Button
              variant={isMapOption ? 'outline' : 'primary'}
              onClick={() => {
                const params = new URLSearchParams(searchParams);
                params.delete('is_map');
                params.set('is_skill', 'true');
                router.replace(`?${params.toString()}`);
              }}
              className={` w-[120px] !p-0 text-xs h-[28px] !font-bold text-white border-none !rounded-[20px] ${!isMapOption ? '' : '!text-[#77858F] !bg-[#EBF1F7]'}`}>
              マイスキル
            </Button>
          </div>
          <Link href={`${pageRouters.SKILL_MAP_TEAM.href}?tabId=${tabId || 0}`}>
            <Button
              variant="secondary"
              className="w-[130px] !p-0 text-sm h-[34px] !border-transparent !text-[#77858F] bg-white rounded-[6px]"
              style={{ boxShadow: '0px 2px 8px 0px #0000001A' }}>
              メンバー一覧{' '}
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
      </div>

      <div className="px-10 mb-8">
        {/* Banner */}
        <SkillMapBanner
          skillMapInfo={skillMapInfo}
          handleNavigateUser={handleNavigateUser}
          hasNavigateOtherSkillMap={true}
        />

        {isMapOption ? (
          <SkillMapDetailByUser detailSkillData={detailSkillData} />
        ) : (
          <MySkillDetailByUser detailSkillData={detailSkillData} />
        )}
      </div>
    </>
  );
};

export default BoardSkillUser;
