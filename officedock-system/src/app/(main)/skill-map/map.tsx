'use client';
import Image from 'next/image';
import { useState } from 'react';

import CustomUserAvatar from '@components/common/AvatarIcon/CustomUserAvatar';

import useSkillMapInfo from '@hooks/useSkillMapList';

import { SkillMapByOrganization } from '@interfaces/skills';

import { SkillMapByOrganizationPanel } from './skill-map-by-organization-panel';

const SkillMap = () => {
  const [skillMapByOrganizations, setSkillMapByOrganizations] = useState<
    SkillMapByOrganization[]
  >([]);
  const { skillMapInfo } = useSkillMapInfo({
    onSuccess: (data) => {
      setSkillMapByOrganizations(data.organizations);
    },
  });

  return (
    <div className="w-full">
      {/* Banner */}
      <div className="w-full h-[189px] relative mb-5">
        <Image
          alt="Mountains"
          src="/images/skill-banner.jpg"
          fill
          style={{ height: '100%', width: '100%' }}
          className=" rounded-[14px]"
        />

        <div className="absolute w-full h-full top-0 left-0 flex justify-between gap-5 pl-[50px] pr-[30px] pt-[30px]">
          <div className=" h-full flex gap-5 items-start w-[395px]">
            <CustomUserAvatar
              avatarUrl={skillMapInfo?.user?.avatar || ''}
              avatarColor={skillMapInfo?.user?.avatarColor || ''}
              size={70}
            />
            <div className="flex flex-col items-start justify-center">
              <p className="text-sm font-medium text-white line-clamp-2">
                {skillMapInfo?.user?.organizations?.name || ''}
              </p>
              <p className="text-black font-medium text-[26px] max-w-[300px] truncate">
                {skillMapInfo?.user.fullName}
              </p>
            </div>
          </div>
          <div className="text-xs font-medium text-white w-fit flex-grow flex-shrink-0">
            <div className="bg-[#FFFFFFBF] w-full h-[104px] mt-3 rounded-md px-[30px] py-[25px] flex flex-col gap-2">
              <div className="flex items-center gap-[10px] text-black font-medium text-base">
                <Image
                  src="/icons/completed.svg"
                  width={12}
                  height={12}
                  alt="completed-icon"
                />
                <p>直近1ヶ月で大カテゴリーAのタスクを60時間行いました</p>
              </div>
              <div className="flex items-center gap-[10px] text-black font-medium text-base">
                <Image
                  src="/icons/completed.svg"
                  width={12}
                  height={12}
                  alt="completed-icon"
                />
                <p>企画提案力のレベルアップが近づいています！</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Skill map by organizations */}
      {skillMapByOrganizations.length > 0 &&
        skillMapByOrganizations.map((skillMap, index) => (
          <SkillMapByOrganizationPanel key={index} skillMapDetail={skillMap} />
        ))}
    </div>
  );
};

export default SkillMap;
