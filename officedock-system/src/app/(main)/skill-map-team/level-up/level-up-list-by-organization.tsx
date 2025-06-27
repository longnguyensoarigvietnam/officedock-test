'use client';

import { Dispatch, SetStateAction } from 'react';
import { useSessionCache } from '@providers/SessionCacheProvider';

import CustomUserAvatar from '@components/common/AvatarIcon/CustomUserAvatar';
import Button from '@components/common/Button';
import ImageRound from '@components/common/ImageRound';

import { SubmitLevelByOrganization } from '@interfaces/skills';

import { getFullFormattedDate } from '@utils/date';
import { getLastChar } from '@utils';

import { SKILL_MAP_STEPS } from '@constants';

interface LevelUpListByOrganizationProps {
  orgSubmitLevel: SubmitLevelByOrganization;
  setSelectedSubmitLevel: Dispatch<SetStateAction<number | null>>;
}

export const LevelUpListByOrganization = ({
  orgSubmitLevel,
  setSelectedSubmitLevel,
}: LevelUpListByOrganizationProps) => {
  const { data: session } = useSessionCache();

  return (
    <div
      className="w-full py-5 px-10 bg-[#F8FAFC] rounded-[14px] mb-6"
      style={{ boxShadow: '0px 4px 10px 0px #0000000D' }}>
      <p className="text-[#77858F] text-[16px] font-medium mb-4 max-w-[100%] break-all">
        {orgSubmitLevel.organizationName}
      </p>
      {orgSubmitLevel.submitLevels.length == 0 ? (
        <p className="text-sm font-medium">
          現在レベルアップ申請はありません。
        </p>
      ) : (
        <div>
          {/* Header */}
          <div className="flex text-xs mb-4 text-[#77858F] font-medium">
            <div className="w-[114px] border-r borer-[#D2DBE1]">
              <span>申請日時</span>
            </div>
            <div className="w-[calc((100%_-_433px)/6)] px-3 border-r borer-[#D2DBE1]">
              <span>申請者</span>
            </div>
            <div className="w-[calc((100%_-_433px)/3)] px-3 border-r borer-[#D2DBE1]">
              <span>スキル名</span>
            </div>
            <div className="w-[calc((100%_-_433px)/2)] px-3 border-r borer-[#D2DBE1]">
              <span>スキルの定義</span>
            </div>
            <div className="w-[195px] px-3 border-r borer-[#D2DBE1]">
              <span>申請のレベル</span>
            </div>
            <div className="w-[124px] px-3">
              <span>申請承認</span>
            </div>
          </div>
          {/* Body */}
          {orgSubmitLevel.submitLevels.map((submitLevel) => {
            return (
              <div
                key={submitLevel.id}
                className="bg-white py-[20px] rounded-[6px] mb-5"
                style={{
                  boxShadow: '0px 2px 8px 0px #0000001A',
                }}>
                <div className="flex items-center">
                  <div className="px-3 border-r border-[#D2DBE1]">
                    <p className="text-xs font-normal w-[90px]">
                      {getFullFormattedDate(
                        new Date(submitLevel?.createdAt || '') || new Date(),
                      )}
                    </p>
                  </div>

                  <div className="w-[calc((100%_-_433px)/6)] px-3 flex items-center gap-2 border-r border-[#D2DBE1]">
                    <CustomUserAvatar
                      avatarUrl={submitLevel.staff?.avatar || ''}
                      avatarColor={submitLevel.staff?.avatarColor || ''}
                      size={26}
                    />
                    <p className="max-w-full text-sm font-medium break-all line-clamp-2">
                      {submitLevel.staff.profile.fullName}
                    </p>
                  </div>

                  <div className="w-[calc((100%_-_433px)/3)] px-3 border-r border-[#D2DBE1]">
                    <p className="text-sm font-medium w-[100%] break-all line-clamp-2 ">
                      {submitLevel.skill.name}
                    </p>
                  </div>

                  <div className="w-[calc((100%_-_433px)/2)] px-3 border-r border-[#D2DBE1]">
                    <p className="text-sm font-normal w-[100%] break-all line-clamp-2 ">
                      {submitLevel.skill.description || '-'}
                    </p>
                  </div>

                  <div className="w-[195px] border-r border-[#D2DBE1]">
                    <div className="flex items-center px-3 w-full gap-2">
                      <div className="bg-[#EBF1F7] rounded-[6px] w-[62px] h-[62px] flex flex-col items-center justify-center">
                        <p
                          className="text-white text-xs font-medium rounded-[10px] w-[51px] h-[21px] flex justify-center items-center"
                          style={{
                            background:
                              SKILL_MAP_STEPS.find((step) =>
                                step.label.includes(
                                  getLastChar(
                                    submitLevel.progression.stepBeforeSubmit,
                                  ),
                                ),
                              )?.color || '#0068B6',
                          }}>
                          STEP{' '}
                          {getLastChar(
                            submitLevel.progression.stepBeforeSubmit,
                          )}
                        </p>
                        <div className="flex gap-1 items-baseline">
                          <p className="text-sm font-medium">Lv.</p>
                          <p className="text-[20px] font-medium">
                            {getLastChar(
                              submitLevel.progression.levelBeforeSubmit,
                            )}
                          </p>
                        </div>
                      </div>
                      <ImageRound
                        className="w-fit h-fit"
                        src="/icons/blue-chevron.svg"
                        name="Blue chevron"
                      />
                      <div className="relative bg-[#EBF1F7] rounded-[6px] w-[62px] h-[62px] flex flex-col items-center justify-center">
                        <p
                          className="text-white text-xs font-medium rounded-[10px] w-[51px] h-[21px] flex justify-center items-center"
                          style={{
                            background:
                              SKILL_MAP_STEPS.find((step) =>
                                step.label.includes(
                                  getLastChar(
                                    submitLevel.progression.stepAfterSubmit,
                                  ),
                                ),
                              )?.color || '#0068B6',
                          }}>
                          STEP{' '}
                          {getLastChar(submitLevel.progression.stepAfterSubmit)}
                        </p>
                        <div className="flex gap-1 items-baseline">
                          <p className="text-sm font-medium">Lv.</p>
                          <p className="text-[20px] font-medium">
                            {getLastChar(
                              submitLevel.progression.levelAfterSubmit,
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="px-3">
                    {' '}
                    {session?.user.id != submitLevel.staff.id && (
                      <Button
                        variant="primary"
                        className="w-[100px] h-[36px] !p-0 text-sm font-medium rounded-[6px] text-white"
                        onClick={() => {
                          setSelectedSubmitLevel(submitLevel.id);
                        }}>
                        確認する
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
