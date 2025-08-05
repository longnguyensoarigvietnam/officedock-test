'use client';
import { memo } from 'react';

import Modal from '@components/common/Modal';
import CustomUserAvatar from '@components/common/AvatarIcon/CustomUserAvatar';
import ImageRound from '@components/common/ImageRound';
import { TwinklingStar } from '@components/common/TwinklingStar';
import Checkbox from '@components/common/Checkbox';

import { SubmitLevel } from '@interfaces/skills';

import {
  SkillMapLookBackType,
  SkillMapTypeInterval,
  SubmitLevelStatus,
} from '@constants/enums';
import { SKILL_MAP_STEPS } from '@constants';

import { getLastChar } from '@utils';

export type ReviewSubmittedLevelUpModalProps = {
  open: boolean;
  submitLevelUpDetail: SubmitLevel;
  onClose: () => void;
};

const ReviewSubmittedLevelUpModal = memo(
  ({
    open,
    submitLevelUpDetail,
    onClose,
  }: ReviewSubmittedLevelUpModalProps) => {
    const renderNewConditionText = (
      measureCount: number | null,
      measureTime: number | null,
      lookBackInterval: number | null,
      lookBackType: string | null,
    ) => {
      if (measureCount) {
        return (
          <div className="text-black flex flex-col justify-start w-full">
            <p className="text-sm font-medium mb-3">再度レベルアップ条件</p>
            <p className="text-[13px] font-normal">
              対応タスクを{measureCount}回完了した
            </p>
          </div>
        );
      } else if (measureTime) {
        return (
          <div className="text-black flex flex-col justify-start w-full">
            <p className="text-sm font-medium mb-3">再度レベルアップ条件</p>
            <p className="text-[13px] font-normal">
              対応タスクを{measureTime}時間行った
            </p>
          </div>
        );
      } else if (lookBackInterval && lookBackType) {
        let lookBackTypeText = '';
        switch (lookBackType) {
          case SkillMapLookBackType.DAY:
            lookBackTypeText = SkillMapTypeInterval.DAY;
            break;
          case SkillMapLookBackType.WEEK:
            lookBackTypeText = SkillMapTypeInterval.WEEK;
            break;
          case SkillMapLookBackType.MONTH:
            lookBackTypeText = SkillMapTypeInterval.MONTH;
            break;
          case SkillMapLookBackType.YEAR:
            lookBackTypeText = SkillMapTypeInterval.YEAR;
            break;
        }

        return (
          <div className="text-black flex flex-col justify-start w-full">
            <p className="text-sm font-medium mb-3">再度レベルアップ条件</p>
            <p className="text-[13px] font-normal">
              振り返りの期間{lookBackInterval}
              {lookBackTypeText}ごと
            </p>
          </div>
        );
      }
    };

    return (
      <Modal
        open={open}
        className="font-primary !rounded-[8px] text-gray-700 !p-0 w-[400px] "
        contentClass="!w-[400px] !rounded-[8px]"
        onClose={onClose}>
        <div className="py-[40px] px-[20px] flex flex-col gap-5 items-center">
          {/* Header */}
          <p className="text-black font-medium text-[18px] max-w-full break-all text-center">
            {submitLevelUpDetail?.skill.name}
          </p>
          <div className="flex justify-center items-center w-full">
            <div className="flex items-center gap-2">
              <div
                className={`bg-[#EBF1F7] rounded-[6px] w-[62px] h-[62px] flex flex-col items-center justify-center ${submitLevelUpDetail.status == SubmitLevelStatus.APPROVAL && 'opacity-40'}`}>
                <p
                  className="text-white text-xs font-medium rounded-[10px] w-[51px] h-[21px] flex justify-center items-center"
                  style={{
                    background:
                      SKILL_MAP_STEPS.find((step) =>
                        step.label.includes(
                          getLastChar(
                            submitLevelUpDetail?.progression.stepBeforeSubmit,
                          ),
                        ),
                      )?.color || '#0068B6',
                  }}>
                  STEP{' '}
                  {getLastChar(
                    submitLevelUpDetail?.progression.stepBeforeSubmit,
                  )}
                </p>
                <div
                  className={`flex gap-1 items-baseline ${submitLevelUpDetail.status == SubmitLevelStatus.APPROVAL && 'opacity-40'}`}>
                  <p className="text-sm font-medium">Lv.</p>
                  <p className="text-[20px] font-medium">
                    {getLastChar(
                      submitLevelUpDetail?.progression.levelBeforeSubmit,
                    )}
                  </p>
                </div>
              </div>
              <ImageRound
                className="w-fit h-fit opacity-40"
                src="/icons/blue-chevron.svg"
                name="Blue chevron"
              />
              <div className="relative bg-[#EBF1F7] rounded-[6px] w-[62px] h-[62px] flex flex-col items-center justify-center">
                {submitLevelUpDetail.status == SubmitLevelStatus.APPROVAL && (
                  <div>
                    <TwinklingStar
                      className="absolute top-[5px] right-[-15px]"
                      delay={0.5}
                    />
                    <TwinklingStar
                      className="absolute top-[-15px] right-[5px]"
                      delay={0.8}
                    />
                    <TwinklingStar
                      className="absolute bottom-[5px] left-[-15px]"
                      delay={1}
                    />
                    <TwinklingStar
                      className="absolute bottom-[-15px] left-[5px]"
                      delay={1.2}
                    />
                  </div>
                )}

                <p
                  className={`text-white text-xs font-medium rounded-[10px] w-[51px] h-[21px] flex justify-center items-center ${submitLevelUpDetail.status == SubmitLevelStatus.REJECTED && 'opacity-40'}`}
                  style={{
                    background:
                      SKILL_MAP_STEPS.find((step) =>
                        step.label.includes(
                          getLastChar(
                            submitLevelUpDetail?.progression.stepAfterSubmit,
                          ),
                        ),
                      )?.color || '#0068B6',
                  }}>
                  STEP{' '}
                  {getLastChar(
                    submitLevelUpDetail?.progression.stepAfterSubmit,
                  )}
                </p>
                <div
                  className={`flex gap-1 items-baseline ${submitLevelUpDetail.status == SubmitLevelStatus.REJECTED && 'opacity-40'}`}>
                  <p className="text-sm font-medium">Lv.</p>
                  <p className="text-[20px] font-medium">
                    {getLastChar(
                      submitLevelUpDetail?.progression.levelAfterSubmit,
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <p className="text-primary text-[18px] font-medium">
            {submitLevelUpDetail.status == SubmitLevelStatus.REJECTED
              ? '申請についてコメントが届きました'
              : 'レベルアップしました！'}
          </p>

          {/* Check list */}
          {submitLevelUpDetail.status == SubmitLevelStatus.REJECTED && (
            <div className="bg-[#EBF1F7] py-[24px] px-[30px] rounded-[6px] !w-full">
              <p className="text-primary text-[16px] font-medium mb-4 text-center">
                チェックリスト
              </p>
              <div className="flex flex-col gap-2 justify-start">
                {submitLevelUpDetail.skillMapSkillLevel?.items &&
                  submitLevelUpDetail.skillMapSkillLevel?.items.length > 0 &&
                  submitLevelUpDetail.skillMapSkillLevel.items.map(
                    (item, index) => {
                      return (
                        <div key={index} className="flex gap-2">
                          <Checkbox
                            classLabel="text-black text-sm font-medium !max-w-full !break-all"
                            label={item.item}
                            isChecked={item.isChecked}
                            disable={true}
                          />
                        </div>
                      );
                    },
                  )}
              </div>
            </div>
          )}

          {/* Modified level up condition text */}
          {submitLevelUpDetail.status == SubmitLevelStatus.REJECTED &&
            renderNewConditionText(
              submitLevelUpDetail.skillMapSkillLevel.measureCount,
              submitLevelUpDetail.skillMapSkillLevel.measureTime,
              submitLevelUpDetail.skillMapSkillLevel.lookBackInterval,
              submitLevelUpDetail.skillMapSkillLevel.lookBackType,
            )}

          {/* Comment */}
          <div className="bg-[#EBF1F7] py-[24px] px-[30px] rounded-[6px] !w-full">
            <div className="flex items-center mb-3">
              <CustomUserAvatar
                avatarUrl={submitLevelUpDetail.approver?.avatar || ''}
                avatarColor={submitLevelUpDetail.approver?.avatarColor || ''}
                size={24}
              />
              <p className="text-sm font-medium ml-2 max-w-full break-all line-clamp-4">
                {submitLevelUpDetail.approver &&
                  submitLevelUpDetail.approver.profile.fullName}{' '}
                <span className="text-[#77858F] text-xs font-medium ml-1">
                  さんからのコメント
                </span>
              </p>
            </div>
            <p className="text-sm font-normal max-w-[100%] break-all">
              {submitLevelUpDetail.comment}
            </p>
          </div>

          {/* Close button */}
          <p
            className="text-primary font-medium text-[13px] mt-2 hover:cursor-pointer"
            onClick={onClose}>
            閉じる
          </p>
        </div>
      </Modal>
    );
  },
);

export default ReviewSubmittedLevelUpModal;
