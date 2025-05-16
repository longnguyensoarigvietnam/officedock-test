'use client';
import Image from 'next/image';
import { useState } from 'react';
import { AxiosError } from 'axios';

import CustomUserAvatar from '@components/common/AvatarIcon/CustomUserAvatar';
import ActionsSkillMapDetailModal from '@components/modals/ActionsSkillMapDetailModal';
import { SkillMapProgressBar } from '@components/common/ProgressBar/SkillMapProgressBar';
import Button from '@components/common/Button';

import useSkillMapInfo from '@hooks/useSkillMapList';
import useOrganizationSkillMapDetail from '@hooks/useOrganizationSkillDetail';

import { ServerStatusCode } from '@constants/enums';
import { ERROR_COMMON_MESSAGE } from '@constants/message';

import {
  OrganizationSkillMapDetail,
  SkillMapByOrganization,
} from '@interfaces/skills';
import { extractLevelNumber, extractStepNumber, getSkillStep } from '@utils';
import { useToast } from '@providers/ToastProvider';

const MySkill = () => {
  const { showToast } = useToast();

  // Skill map actions
  const [openSkillMapDetailModal, setOpenSkillMapDetailModal] = useState(false);
  const [skillMapEditDetail, setSkillMapEditDetail] = useState<
    OrganizationSkillMapDetail[] | null
  >([]);
  const [selectedSkillMapId, setSelectedSkillMapId] = useState<number | null>();
  const [selectedStep, setSelectedStep] = useState<number>(1);

  const [mySkillData, setMySkillData] = useState<SkillMapByOrganization[]>([]);
  const { skillMapInfo } = useSkillMapInfo({
    onSuccess: (data) => {
      setMySkillData(data.organizations);
    },
  });

  useOrganizationSkillMapDetail({
    skillId: Number(selectedSkillMapId),
    onError: (error: AxiosError) => {
      if (error.response?.status === ServerStatusCode.NOT_FOUND) {
        showToast({
          variant: 'error',
          description: ERROR_COMMON_MESSAGE,
        });
      }
    },
    onSuccess: (data) => {
      setSkillMapEditDetail(data);
      setOpenSkillMapDetailModal(true);
    },
  });

  return (
    <div className="w-full">
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
      {/* My Skill */}
      <div className="flex flex-col gap-5">
        {mySkillData.map((item, index) => (
          <div
            key={index}
            className="w-full rounded-[14px] p-[30px] font-medium bg-[#F8FAFC]">
            <p className="text-[#77858F] text-base mb-4">
              {item.organizationName}
            </p>
            <div>
              <div className="w-full ">
                {/* Header (thead) */}
                <div className="flex  text-xs text-[#77858F] font-medium">
                  <div className="min-w-[104px] flex-grow text-start ">
                    <div className="flex justify-between items-center">
                      <span>スキル名</span>
                      <div className="w-[1px] bg-[#D2DBE1] h-[9px]"></div>
                    </div>
                  </div>

                  <div className="min-w-[390px] max-w-[390px] flex-grow text-start ">
                    <div className="flex justify-between items-center">
                      <span className="px-5 relative top-[1px]">
                        スキルの定義
                      </span>
                      <div className="w-[1px] bg-[#D2DBE1] h-[9px]"></div>
                    </div>
                  </div>

                  <div className="min-w-[102px] max-w-[102px]  flex-grow text-start ">
                    <div className="flex justify-between items-center">
                      <span className="px-[14px] relative top-[1px]">
                        現在のレベル
                      </span>
                      <div className="w-[1px] bg-[#D2DBE1] h-[9px]"></div>
                    </div>
                  </div>

                  <div className="min-w-[290px] max-w-[290px]  flex-grow text-start ">
                    <div className="flex justify-between items-center">
                      <span className="px-5 relative top-[1px]">
                        振り返りまで
                      </span>
                    </div>
                  </div>

                  <div className="min-w-[156px] max-w-[156px] flex-grow text-start "></div>
                </div>
                {/* BODY */}
                {item.skillMaps.map((skillMaps, indexSkill) => (
                  <div key={indexSkill} className="w-full  mt-[14px]">
                    {skillMaps.map((skill) => {
                      if (!skill.level) return <></>;
                      const step = getSkillStep(`${skill.step}`);
                      const levelNumber =
                        extractLevelNumber(`${skill.level.level}`) || 1;
                      const stepNumber =
                        extractStepNumber(`${skill.step}`) || 1;
                      return (
                        <div
                          key={skill.id}
                          style={{
                            boxShadow: '0px 2px 8px 0px #0000001A',
                          }}
                          className="inline-flex text-sm font-medium w-full text-black whitespace-normal bg-white py-5 rounded-md">
                          <div className="min-w-[154px] text-base flex-grow  break-all border-r border-[#D2DBE1] px-5 flex items-center min-h-[50px]">
                            {skill.skill.name}
                          </div>
                          <div className="min-w-[390px] font-normal max-w-[390px] flex-shrink-0 break-all border-r px-5 flex items-center border-[#D2DBE1]">
                            {skill.skill.description}
                          </div>
                          <div className="min-w-[102px] max-w-[102px] relative flex-shrink-0 break-words border-r px-5 flex items-center border-[#D2DBE1]">
                            <div className="w-[62px] absolute top-[-6px] left-5 h-[62px] rounded-md bg-[#EBF1F7] py-2 px-[5.5px] ">
                              <div
                                style={{
                                  backgroundColor: step?.color || '#0068B6',
                                }}
                                className=" h-[21px] rounded-[10px] text-white text-xs flex items-center justify-center">
                                {step?.label}
                              </div>
                              <div className="text-black flex gap-[2px]  items-end justify-center mt-[6px]">
                                <p className="relative top-[2px]">Lv.</p>
                                <p className="text-[20px]">{levelNumber}</p>
                              </div>
                            </div>
                          </div>
                          <div className="min-w-[290px] text-xs max-w-[290px] flex-shrink-0 break-words border-r px-5 border-[#D2DBE1]">
                            <p>対応タスクを始めてから</p>
                            <div className="flex gap-[2px] items-end mt-[4px]">
                              {skill.level.measureCount && (
                                <>
                                  <p className="text-[18px] text-[#0068B6]">
                                    {skill.level.actualMeasureCount}/
                                    {skill.level.measureCount}
                                  </p>
                                  <p className="relative top-[2px]">
                                    時間経過した
                                  </p>
                                </>
                              )}
                              {skill.level.measureTime && (
                                <>
                                  <p className="text-[18px] text-[#0068B6]">
                                    {skill.level.actualMeasureTime}/
                                    {skill.level.measureTime}
                                  </p>
                                  <p className="relative top-[2px]">
                                    回完了にする
                                  </p>
                                </>
                              )}
                              {skill.level.lookBackInterval && (
                                <>
                                  <p className="text-[18px] text-[#0068B6]">
                                    {skill.level.lookBackInterval}
                                  </p>
                                  <p className="relative top-[2px] text-xs">
                                    ヶ月
                                  </p>
                                </>
                              )}
                            </div>
                            <div className="w-full mt-[10px]">
                              <SkillMapProgressBar
                                value={skill.progressPercent || 0}
                                strokeColor={step?.color || '#0068B6'}
                                className="w-full"
                              />
                            </div>
                          </div>
                          <div className="min-w-[156px] max-w-[156px] flex-shrink-0 text-blue-500 cursor-pointer break-words px-5 flex items-center">
                            <Button
                              onClick={() => {
                                setSelectedSkillMapId(skill.skill.id);
                                setSelectedStep(stepNumber);
                              }}
                              className="!py-0 !px-0 flex items-center justify-center h-9 w-[112px] !rounded-md">
                              スキルの詳細
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {openSkillMapDetailModal && (
        <ActionsSkillMapDetailModal
          step={selectedStep}
          open={openSkillMapDetailModal}
          skillMapEditDetail={skillMapEditDetail}
          onClose={() => {
            setOpenSkillMapDetailModal(false);
            setSelectedSkillMapId(null);
            setSkillMapEditDetail(null);
          }}
        />
      )}
    </div>
  );
};

export default MySkill;
