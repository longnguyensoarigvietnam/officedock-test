'use client';
import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { useParams, useSearchParams } from 'next/navigation';

import Button from '@components/common/Button';
import CustomUserAvatar from '@components/common/AvatarIcon/CustomUserAvatar';

import useSkillMapInfo from '@hooks/useSkillMapList';
import { SkillMapByOrganization } from '@interfaces/skills';
import DetailSkillUser from './detail';

const BoardSkillUser = () => {
  const searchParams = useSearchParams();
  const params = useParams<{ id: string }>();
  const userId = params.id;

  const [isMapOption, setIsMapOption] = useState(true);

  const user_organizationId = searchParams.get('user_organization');
  const isMapParam = searchParams.get('is_map');
  const isSkill = searchParams.get('is_skill');

  const [detailSkillData, setDetailSkillData] = useState<
    SkillMapByOrganization[]
  >([]);

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

  return (
    <>
      <div className="flex gap-2 items-center mb-[30px]">
        <Button
          variant={isMapOption ? 'primary' : 'outline'}
          onClick={() => {
            setIsMapOption(true);
          }}
          className={`w-[100px] !p-0 text-xs h-[28px] border-transparent text-white !rounded-[20px] ${isMapOption ? '' : '!text-[#77858F] !bg-transparent !border-[#77858F] border-[1px]'}`}>
          メンバー一覧
        </Button>
        <Button
          variant={isMapOption ? 'outline' : 'primary'}
          onClick={() => {
            setIsMapOption(false);
          }}
          className={` w-[120px] !p-0 text-xs h-[28px]  !rounded-[20px] ${!isMapOption ? '' : '!text-[#77858F] !bg-transparent !border-[#77858F] border-[1px]'}`}>
          レベルアップ申請
        </Button>
      </div>
      <div>
        {/* Banner */}
        <div className="w-full h-[189px] relative mt-[33px] mb-5">
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
        {isMapOption ? (
          <></>
        ) : (
          <DetailSkillUser detailSkillData={detailSkillData} />
        )}
      </div>
    </>
  );
};

export default BoardSkillUser;
