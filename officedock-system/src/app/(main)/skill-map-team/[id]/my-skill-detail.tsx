'use client';
import React, { useState } from 'react';
import { AxiosError } from 'axios';

import { SkillMapProgressBar } from '@components/common/ProgressBar/SkillMapProgressBar';
import Button from '@components/common/Button';
import ActionsSkillMapDetailModal from '@components/modals/ActionsSkillMapDetailModal';

import { ServerStatusCode, SkillMapTypeInterval } from '@constants/enums';
import { ERROR_COMMON_MESSAGE } from '@constants/message';

import { useToast } from '@providers/ToastProvider';
import useSkillMapUserDetail from '@hooks/useSkillMapUserDetail';
import {
  OrganizationSkillMapDetail,
  SkillMapByOrganization,
} from '@interfaces/skills';

import {
  extractLevelNumber,
  extractStepNumber,
  getSkillStep,
  timeStringToHours,
} from '@utils';

type Props = {
  detailSkillData: SkillMapByOrganization[];
};

const MySkillDetailByUser = ({ detailSkillData }: Props) => {
  const { showToast } = useToast();

  // Skill map actions
  const [openSkillMapDetailModal, setOpenSkillMapDetailModal] = useState(false);
  const [skillMapEditDetail, setSkillMapEditDetail] = useState<
    OrganizationSkillMapDetail[] | null
  >([]);
  const [selectedSkillMapId, setSelectedSkillMapId] = useState<number | null>();
  const [selectedStep, setSelectedStep] = useState<number>(1);

  useSkillMapUserDetail({
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
    <>
      <div className="flex flex-col gap-6">
        {detailSkillData.map((item, index) => (
          <div
            key={index}
            className="w-full rounded-[30px] p-[30px] font-medium bg-[#F8FAFC]">
            <p className="text-[#77858F] text-base mb-4 max-w-full break-all">
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
                {item.skillMaps.map((skillMaps, indexSkill) => {
                  const lastValidSkill = [...skillMaps]
                    .reverse()
                    .find((skill) => skill.level != null);
                  if (!lastValidSkill) return;
                  const step = getSkillStep(`${lastValidSkill?.step}`);
                  const levelNumber =
                    extractLevelNumber(`${lastValidSkill?.level.level}`) || 1;
                  const stepNumber =
                    extractStepNumber(`${lastValidSkill?.step}`) || 1;
                  return (
                    <div key={indexSkill} className="w-full mt-[14px]">
                      {lastValidSkill && (
                        <div
                          style={{
                            boxShadow: '0px 2px 8px 0px #0000001A',
                          }}
                          className="inline-flex text-sm font-medium w-full text-black whitespace-normal bg-white py-5 rounded-[14px]">
                          <div className="min-w-[154px] text-base flex-grow  break-all border-r border-[#D2DBE1] px-5 flex items-center min-h-[50px]">
                            {lastValidSkill.skill.name}
                          </div>
                          <div className="min-w-[390px] font-normal max-w-[390px] flex-shrink-0 break-all border-r px-5 flex items-center border-[#D2DBE1]">
                            {lastValidSkill.skill.description}
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
                          <div
                            className={`min-w-[290px] ${lastValidSkill.skill.deletedAt && 'invisible'} text-xs max-w-[290px] flex-shrink-0 break-words border-r px-5 border-[#D2DBE1]`}>
                            <p>対応タスクを始めてから</p>
                            <div className="flex gap-[2px] items-end mt-[4px]">
                              {lastValidSkill.level.measureCount !== null && (
                                <>
                                  <p className="text-[18px] text-primary">
                                    {lastValidSkill.level.actualMeasureCount}/
                                    {lastValidSkill.level.measureCount}
                                  </p>
                                  <p className="relative top-[2px]">
                                    回完了にする
                                  </p>
                                </>
                              )}
                              {lastValidSkill.level.measureTime !== null && (
                                <>
                                  <p className="text-[18px] text-primary">
                                    {lastValidSkill.level.actualMeasureTime &&
                                      timeStringToHours(
                                        `${lastValidSkill.level.actualMeasureTime}`,
                                      )}
                                    /{lastValidSkill.level.measureTime}
                                  </p>
                                  <p className="relative top-[2px]">
                                    時間経過した
                                  </p>
                                </>
                              )}
                              {lastValidSkill.level.lookBackInterval !==
                                null && (
                                <>
                                  <p className="text-[18px] text-primary">
                                    {lastValidSkill.level.lookBackInterval}
                                  </p>
                                  <p className="relative top-[2px] text-xs">
                                    {
                                      SkillMapTypeInterval[
                                        lastValidSkill.level
                                          .lookBackType as keyof typeof SkillMapTypeInterval
                                      ]
                                    }
                                  </p>
                                </>
                              )}
                            </div>
                            <div className="w-full mt-[10px]">
                              <SkillMapProgressBar
                                value={lastValidSkill.progressPercent || 0}
                                strokeColor={step?.color || '#0068B6'}
                                className="w-full"
                              />
                            </div>
                          </div>
                          <div className="min-w-[156px] max-w-[156px] flex-shrink-0 text-blue-500 cursor-pointer break-words px-5 flex items-center">
                            <Button
                              onClick={() => {
                                setSelectedSkillMapId(lastValidSkill.skill.id);
                                setSelectedStep(stepNumber);
                              }}
                              className="!py-0 !px-0 flex items-center justify-center h-9 w-[112px] !rounded-md">
                              スキルの詳細
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
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
    </>
  );
};

export default MySkillDetailByUser;
