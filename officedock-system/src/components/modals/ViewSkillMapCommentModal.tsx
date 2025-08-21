'use client';
import { memo, useState } from 'react';

import Modal from '@components/common/Modal';
import CustomUserAvatar from '@components/common/AvatarIcon/CustomUserAvatar';
import ImageRound from '@components/common/ImageRound';
import { TwinklingIcon } from '@components/common/TwinklingIcon';

import { SkillMapComment } from '@interfaces/skills';

import { SKILL_MAP_STEPS } from '@constants';

import { getLastChar } from '@utils';

export type ViewSkillMapCommentModalProps = {
  open: boolean;
  skillMapCommentList: SkillMapComment[];
  onClose: () => void;
};

const ViewSkillMapCommentModal = memo(
  ({ open, skillMapCommentList, onClose }: ViewSkillMapCommentModalProps) => {
    const [currentIndex, setCurrentIndex] = useState(0);

    const currentComment = skillMapCommentList[currentIndex];

    const handlePrev = () => {
      if (currentIndex > 0) {
        setCurrentIndex((prev) => prev - 1);
      }
    };

    const handleNext = () => {
      if (currentIndex < skillMapCommentList.length - 1) {
        setCurrentIndex((prev) => prev + 1);
      }
    };

    return (
      <Modal
        open={open}
        className="font-primary !rounded-[8px] text-gray-700 !p-0 w-[400px] "
        contentClass="!w-[400px] !rounded-[8px]"
        onClose={onClose}>
        <div className="py-[40px] px-[20px] flex flex-col gap-4 items-center">
          <p className="text-black font-medium text-[18px] max-w-full break-all text-center">
            {currentComment.skill.name}
          </p>
          <div className="flex justify-between items-center w-full">
            {currentIndex > 0 ? (
              <div
                className="opacity-50 hover:cursor-pointer"
                onClick={handlePrev}>
                <ImageRound
                  className="w-5 h-5"
                  src="/icons/chevron-left.svg"
                  name="Arrow left"
                />
              </div>
            ) : (
              <div className="w-5 h-5"></div>
            )}

            <div className="flex items-center gap-2">
              <div className="bg-[#EBF1F7] rounded-[6px] w-[62px] h-[62px] flex flex-col items-center justify-center opacity-55">
                <p
                  className="text-white text-xs font-medium rounded-[10px] w-[51px] h-[21px] flex justify-center items-center"
                  style={{
                    background:
                      SKILL_MAP_STEPS.find((step) =>
                        step.label.includes(
                          getLastChar(currentComment.stepBeforeSubmit),
                        ),
                      )?.color || '#0068B6',
                  }}>
                  STEP {getLastChar(currentComment.stepBeforeSubmit)}
                </p>
                <div className="flex gap-1 items-baseline">
                  <p className="text-sm font-medium">Lv.</p>
                  <p className="text-[20px] font-medium">
                    {getLastChar(currentComment.levelBeforeSubmit)}
                  </p>
                </div>
              </div>
              <ImageRound
                className="w-fit h-fit opacity-55"
                src="/icons/blue-chevron.svg"
                name="Blue chevron"
              />
              <div className="relative bg-[#EBF1F7] rounded-[6px] w-[62px] h-[62px] flex flex-col items-center justify-center">
                <div>
                  <TwinklingIcon
                    className="absolute top-[5px] right-[-15px]"
                    delay={0.5}
                    iconUrl='/icons/blue-star.svg'
                  />
                  <TwinklingIcon
                    className="absolute top-[-15px] right-[5px]"
                    delay={0.8}
                    iconUrl='/icons/blue-star.svg'
                  />
                  <TwinklingIcon
                    className="absolute bottom-[5px] left-[-15px]"
                    delay={1}
                    iconUrl='/icons/blue-star.svg'
                  />
                  <TwinklingIcon
                    className="absolute bottom-[-15px] left-[5px]"
                    delay={1.2}
                    iconUrl='/icons/blue-star.svg'
                  />
                </div>
                <p
                  className="text-white text-xs font-medium rounded-[10px] w-[51px] h-[21px] flex justify-center items-center"
                  style={{
                    background:
                      SKILL_MAP_STEPS.find((step) =>
                        step.label.includes(
                          getLastChar(currentComment.stepAfterSubmit),
                        ),
                      )?.color || '#0068B6',
                  }}>
                  STEP {getLastChar(currentComment.stepAfterSubmit)}
                </p>
                <div className="flex gap-1 items-baseline">
                  <p className="text-sm font-medium">Lv.</p>
                  <p className="text-[20px] font-medium">
                    {getLastChar(currentComment.levelAfterSubmit)}
                  </p>
                </div>
              </div>
            </div>

            {currentIndex < skillMapCommentList.length - 1 ? (
              <div
                className="opacity-50 hover:cursor-pointer"
                onClick={handleNext}>
                <ImageRound
                  className="w-5 h-5"
                  src="/icons/chevron-right.svg"
                  name="Arrow right"
                />
              </div>
            ) : (
              <div className="w-5 h-5"></div>
            )}
          </div>
          <p className="text-primary text-[18px] font-medium">
            レベルアップしました！
          </p>
          <div className="bg-[#EBF1F7] py-[24px] px-[30px] rounded-[6px] !w-full">
            <div className="flex items-center mb-3">
              <CustomUserAvatar
                avatarUrl={currentComment.approver?.avatar || ''}
                avatarColor={currentComment.approver?.avatarColor || ''}
                size={24}
              />
              <p className="text-sm font-medium ml-2 max-w-full break-all line-clamp-4">
                {currentComment.approver.profile.fullName}{' '}
                <span className="text-[#77858F] text-xs font-medium ml-1">
                  さんからのコメント
                </span>
              </p>
            </div>
            <p className="text-sm font-normal max-w-[100%] break-all">
              {currentComment.comment}
            </p>
          </div>
          <p
            className="text-primary font-medium text-[13px] hover:cursor-pointer"
            onClick={onClose}>
            閉じる
          </p>
        </div>
      </Modal>
    );
  },
);

export default ViewSkillMapCommentModal;
