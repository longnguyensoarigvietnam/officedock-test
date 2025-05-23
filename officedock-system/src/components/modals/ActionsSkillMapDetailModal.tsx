'use client';
import { useEffect, useState } from 'react';

import Button from '@components/common/Button';
import ImageRound from '@components/common/ImageRound';
import Drawer from '@components/common/Drawers';

import { SKILL_MAP_STEPS } from '@constants';
import { SkillMapLookBackType, SkillMapTypeInterval } from '@constants/enums';

import {
  OrganizationSkillMapDetail,
  SkillMapFormData,
} from '@interfaces/skills';

import {
  extractLevelNumber,
  extractStepNumber,
  showModalHeaderBackgroundColorByTime,
} from '@utils';
import { formatShowDateJapanese } from '@utils/date';

export type ActionsSkillMapDetailModalProps = {
  open: boolean;
  skillMapEditDetail: OrganizationSkillMapDetail[] | null;
  step?: number;
  onClose: () => void;
  onCreate?: (values: SkillMapFormData) => void;
  onEdit?: (values: SkillMapFormData) => void;
};

const ActionsSkillMapDetailModal = ({
  open,
  skillMapEditDetail,
  step = 1,
  onClose,
}: ActionsSkillMapDetailModalProps) => {
  const [currentStep, setCurrentStep] = useState<number>(
    step ? Number(step) : 1,
  );
  const [dataStep, setDataStep] = useState<OrganizationSkillMapDetail>();
  const [listStep, setListStep] = useState<Set<number>>(new Set());

  const handleCloseModal = () => {
    onClose();
  };
  useEffect(() => {
    if (skillMapEditDetail) {
      const filteredData = skillMapEditDetail?.find(
        (item) => extractStepNumber(item.step) === currentStep,
      );
      setDataStep(filteredData);
      const availableSteps = new Set(
        skillMapEditDetail.map((item) => extractStepNumber(item.step)),
      );
      setListStep(availableSteps);
    }
  }, [skillMapEditDetail, currentStep]);

  return (
    <Drawer
      open={open}
      className="font-primary bg-white h-screen w-[700px] !px-0 !rounded-tl-xl"
      onClose={handleCloseModal}>
      <header
        className="px-8 rounded-tl-xl h-[50px] flex items-center justify-between"
        style={{
          background: showModalHeaderBackgroundColorByTime(),
        }}>
        <div className="flex text-sm items-center gap-4 text-white">
          <p className="">
            登録日{' '}
            {dataStep && formatShowDateJapanese(dataStep.createdAt as Date)}
          </p>
        </div>
        <div className="flex gap-5 items-center">
          <ImageRound
            className="mt-1 w-3 h-[14px] hover:cursor-pointer"
            src="/icons/drawer-close-white.svg"
            name="Close icon"
            onClick={() => {
              onClose();
            }}
          />
        </div>
      </header>
      <div className="px-8 pb-8 !h-[calc(100vh_-_130px)] overflow-y-auto flex flex-col gap-5">
        <header className="sticky z-[100] top-[0px] py-5 gap-2 bg-white">
          <div className="flex rounded-[20px] font-medium bg-[#EBF1F7] mb-8 px-[6px] py-[4px]">
            {SKILL_MAP_STEPS.map((step, index) => {
              const stepNumber = index + 1;
              const isActive = currentStep === stepNumber;
              const isDisabled = !listStep.has(stepNumber);
              return (
                <Button
                  key={step.label}
                  type="button"
                  onClick={() => {
                    if (isDisabled) return;
                    setCurrentStep(stepNumber);
                  }}
                  disabled={isDisabled}
                  style={
                    isActive
                      ? { backgroundColor: step.color, color: 'white' }
                      : { color: step.color, backgroundColor: '#EBF1F7' }
                  }
                  className={`w-1/3 text-center py-[4px] border-none !rounded-[20px]`}>
                  {step.label}
                </Button>
              );
            })}
          </div>
          <div className="flex items-center gap-2 justify-between">
            <p className="font-bold text-[22px] max-w-[calc(100%_-_95px)] break-all line-clamp-2">
              {dataStep?.name}
            </p>
            <Button
              onClick={handleCloseModal}
              className="h-[34px] w-[86px]"
              variant="outline">
              閉じる
            </Button>
          </div>
        </header>
        <div className="text-sm">
          <p className="text-base text-[#0068B6] font-medium mb-3 ">
            スキルの定義
          </p>
          <p className="font-normal break-all mb-9">{dataStep?.description}</p>
          {/* Category */}
          <div>
            <p className="text-base text-[#0068B6] font-medium mb-3 ">
              対応カテゴリー
            </p>
            <div className="flex flex-col gap-[10px]">
              {dataStep &&
                dataStep.categories.map((cate, index) => (
                  <div key={index} className="flex gap-2 items-center">
                    {cate.map((item, cateIndex) => (
                      <>
                        <div className="w-[194px] h-[30px] truncate break-all rounded-md bg-[#EBF1F7] flex items-center justify-start px-2">
                          <p className="w-full break-all truncate">
                            {item.name}
                          </p>
                        </div>
                        {cateIndex + 1 !== cate.length && (
                          <div>
                            <ImageRound
                              className={`w-[8px] h-fit `}
                              src="/icons/skill-map-right.svg"
                              name="icon chevron right"
                            />
                          </div>
                        )}
                      </>
                    ))}
                  </div>
                ))}
            </div>
          </div>

          {/* Level */}
          {dataStep &&
            dataStep.skillLevels.map((level) => {
              const number = extractLevelNumber(level.level) || 1;
              let lookBackTypeText = '';
              switch (level.lookBackType) {
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
                <div key={level.id}>
                  <p className="text-base text-[#0068B6] font-medium mb-4 mt-[10px]">
                    レベル{number - 1}→{number}
                  </p>
                  <div className="text-[#77858F]">レベルアップ条件</div>
                  <div className="font-normal mt-3">
                    振り返り回数・計測時間・期間
                  </div>
                  <div className="flex gap-2 items-center mt-[10px]">
                    <div className="w-[274px] h-[30px] rounded-md bg-[#EBF1F7] flex items-center justify-start px-2">
                      {level.measureCount
                        ? '対応タスクを'
                        : level.lookBackInterval
                          ? '振り返りの期間'
                          : level.measureTime
                            ? '対応タスクを'
                            : ''}
                    </div>
                    <div className="w-[44px] h-[30px] rounded-md bg-[#EBF1F7] flex items-center justify-center">
                      {level.measureCount ||
                        level.lookBackInterval ||
                        level.measureTime}
                    </div>
                    <p className="text-nowrap">
                      {level.measureCount
                        ? '回'
                        : level.lookBackInterval
                          ? lookBackTypeText
                          : '時間'}
                    </p>

                    <div
                      className={`w-[274px] h-[30px] rounded-md bg-[#EBF1F7] flex items-center justify-start px-2`}>
                      {level.measureCount
                        ? '完了した'
                        : level.lookBackInterval
                          ? 'ごと'
                          : level.measureTime
                            ? '行った'
                            : ''}
                    </div>
                  </div>
                  <ul className="mt-5 font-normal">
                    <p className="text-[#77858F] font-medium mb-3">
                      振り返り項目
                    </p>
                    {level.items.map((item, itemIndex) => (
                      <li key={itemIndex}>・{item}</li>
                    ))}
                  </ul>
                </div>
              );
            })}
        </div>
      </div>
    </Drawer>
  );
};

export default ActionsSkillMapDetailModal;
