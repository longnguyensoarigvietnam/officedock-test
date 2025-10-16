'use client';

import Button from '@components/common/Button';
import ImageRound from '@components/common/ImageRound';
import Modal from '@components/common/Modal';
import { SkillMapProgressBar } from '@components/common/ProgressBar/SkillMapProgressBar';
import { TwinklingIcon } from '@components/common/TwinklingIcon';

import { SkillMapByOrganizationInfo } from '@interfaces/skills';

import { getLastChar } from '@utils';

import { ActionsModal } from '@constants/enums';

interface ConfirmSettingSkillProps {
  action: ActionsModal;
  open: boolean;
  message: string;
  confirmSettingSkillInfo: SkillMapByOrganizationInfo;
  onClose: () => void;
  onSubmit: (id: string) => void;
}

export const ConfirmSettingSkillModal = ({
  action,
  open,
  message,
  confirmSettingSkillInfo,
  onClose,
  onSubmit,
}: ConfirmSettingSkillProps) => {
  const isLocked = confirmSettingSkillInfo.isLocked;
  const step = confirmSettingSkillInfo.skill.step
    ? Number(getLastChar(confirmSettingSkillInfo.skill.step))
    : 1;
  const stepCompleted = confirmSettingSkillInfo.isComplete;
  const level = confirmSettingSkillInfo.level?.level
    ? Number(getLastChar(confirmSettingSkillInfo.level?.level))
    : 1;
  const progressPercent = confirmSettingSkillInfo?.progressPercent || 0;
  const showTwinklingStars =
    confirmSettingSkillInfo?.progressPercent == 100 && !stepCompleted;
  let strokeColor = '';
  switch (step) {
    case 1:
      strokeColor = '#3DC1E2';
      break;
    case 2:
      strokeColor = '#228CDB';
      break;
    case 3:
      strokeColor = '#355AC9';
      break;
  }
  if (stepCompleted) {
    strokeColor = '#D2DBE1';
  } else if (isLocked || progressPercent == 0) {
    strokeColor = '#EBF1F7';
  }

  const renderTreasureForStep = (
    isLocked: boolean,
    step: number,
    stepCompleted: boolean,
    level: number,
  ) => {
    // 1. Render locked state
    if (isLocked) {
      return (
        <ImageRound
          name="Lock treasure"
          src="/icons/lock-treasure.svg"
          className="w-[51px] h-[40px] cursor-pointer"
        />
      );
    }

    // 2. If step is completed, return treasure image
    const treasureIcons: Record<number, string> = {
      1: '/icons/step-1-treasure.svg',
      2: '/icons/step-2-treasure.svg',
      3: '/icons/step-3-treasure.svg',
    };

    if (stepCompleted) {
      return (
        <ImageRound
          name={`Step ${step} treasure`}
          src={treasureIcons[step]}
          className={`w-[40px] h-[40px] cursor-pointer`}
        />
      );
    }

    const renderLevelText = () => (
      <div className="flex gap-[2px] items-baseline">
        <p className="text-[15px] font-medium">Lv.</p>
        <p className="text-[26px] font-medium">{level}</p>
      </div>
    );

    return (
      <div className="flex flex-col items-center">{renderLevelText()}</div>
    );
  };

  return (
    <Modal
      open={open}
      className={`font-primary bg-white w-[400px] h-[296px] !rounded-[20px] !py-[40px] !px-[20px]`}
      contentClass="!rounded-[20px]"
      isOutSideAction={false}
      onClose={onClose}>
      <div className="flex flex-col items-center">
        <div className="space-y-[26px] mb-[26px]">
          <p className="text-[18px] font-medium text-center leading-none">
            確認
          </p>
          <p className="text-sm text-center leading-none">{message}</p>
        </div>

        <div className="bg-[#E9EEF3] rounded-[20px] p-[10px] w-[265px] h-[75px] mb-[30px]">
          <div
            className={`flex gap-3 bg-white items-center rounded-[14px] relative w-full h-full px-[20px] ${stepCompleted && '!pr-[5px]'} py-[12px]`}
            style={{
              boxShadow: showTwinklingStars
                ? '0px 0px 20px 0px #36ACDE80'
                : '0px 2px 8px 0px #0000001A',
            }}>
            {showTwinklingStars && (
              <>
                <div className="absolute -top-[20px] left-[20px] bg-primary rounded-[20px] w-[140px] h-[28px] flex items-center justify-center">
                  <p className="text-white text-xs font-bold">
                    レベルアップ申請可能
                  </p>
                </div>
                <div className="bg-primary absolute clip-diagonal-left h-3 w-3 top-[3px] left-[38px]"></div>
              </>
            )}

            {showTwinklingStars && (
              <>
                <TwinklingIcon
                  className="absolute top-[10px] left-[-3px] w-[5px] h-[5px]"
                  delay={0}
                  iconUrl="/icons/blue-star.svg"
                />
                <TwinklingIcon
                  className="absolute top-[3px] left-[5px] w-[5px] h-[5px]"
                  delay={0.5}
                  iconUrl="/icons/blue-star.svg"
                />
                <TwinklingIcon
                  className="absolute top-[10px] -right-[3px] w-[5px] h-[5px]"
                  delay={0.8}
                  iconUrl="/icons/blue-star.svg"
                />
                <TwinklingIcon
                  className="absolute bottom-[5px] left-[-3px] w-[5px] h-[5px]"
                  delay={1}
                  iconUrl="/icons/blue-star.svg"
                />
                <TwinklingIcon
                  className="absolute bottom-[5px] -right-[3px] w-[5px] h-[5px]"
                  delay={1.2}
                  iconUrl="/icons/blue-star.svg"
                />
                <TwinklingIcon
                  className="absolute -bottom-[3px] right-[5px] w-[5px] h-[5px]"
                  delay={1.5}
                  iconUrl="/icons/blue-star.svg"
                />
              </>
            )}
            <div className="w-[calc(100%_-_49px)]">
              <div className={`flex justify-between items-start mb-[10px]`}>
                <p
                  className={`text-[15px] leading-none font-medium max-w-[calc(100%_-_5px)] line-clamp-1 break-all ${stepCompleted ? 'text-[#B3B3B3]' : 'text-black'}`}>
                  {confirmSettingSkillInfo.skill?.name}
                </p>
              </div>

              <div>
                <SkillMapProgressBar
                  value={progressPercent}
                  strokeColor={strokeColor}
                  trailColor={stepCompleted ? '#D2DBE1' : '#EBF1F7'}
                  height={'6px'}
                />
              </div>
            </div>
            <div className="flex justify-end">
              {' '}
              {renderTreasureForStep(
                Boolean(isLocked),
                step,
                Boolean(stepCompleted),
                level,
              )}
            </div>
          </div>
        </div>

        <div className="gap-[10px] flex justify-center">
          <Button
            variant="outline"
            onClick={onClose}
            className={`w-[100px] rounded-[8px] h-[36px] !p-0`}>
            キャンセル
          </Button>
          <Button
            variant="primary"
            className={`w-[100px] rounded-[8px] h-[36px]`}
            style={{
              background: 'linear-gradient(to bottom, #355AC9, #5282FC)',
            }}
            onClick={() => {
              onSubmit(String(confirmSettingSkillInfo.id));
            }}>
            {action == ActionsModal.CREATE ? 'セット' : '解除する'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
