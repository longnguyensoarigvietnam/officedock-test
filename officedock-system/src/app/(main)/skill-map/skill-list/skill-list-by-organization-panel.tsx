import Button from '@components/common/Button';
import { StepInfoTooltip } from '@components/tooltip/StepInfoTooltip';

import {
  SkillMapByOrganization,
  SkillMapByOrganizationInfo,
} from '@interfaces/skills';

import { extractStepNumber } from '@utils';

interface SkillListByOrganizationPanelProps {
  skillMapDetail: SkillMapByOrganization;
  onDetail: ({
    skillId,
    stepNumber,
  }: {
    skillId: number;
    stepNumber: number;
  }) => void;
}

export const SkillListByOrganizationPanel = ({
  skillMapDetail,
  onDetail,
}: SkillListByOrganizationPanelProps) => {
  const normalizeSkillMaps = (
    skillMaps: SkillMapByOrganizationInfo[][],
  ): SkillMapByOrganizationInfo[][] => {
    return skillMaps.map((skillMap) => {
      const skillSteps = ['1', '2', '3'];

      // Fill missing steps
      const filledSkillMap = skillSteps.map((step) => {
        // Check if the skillMap contains the step
        const skill = skillMap.find((skill) => {
          return skill.skill.step == `ステップ${step}`;
        });

        // If not found, return an empty object to fill the step
        if (!skill) {
          return {
            id: null,
            skill: {
              id: null,
              name: `ステップ${step}-Empty`,
              description: '',
              step: step,
            },
            isComplete: false,
            step: step,
            isLocked: false,
            isHaveComment: false,
            progressPercent: 0,
            level: {
              id: null,
              skillMap: null,
              level: '',
              measureCount: null,
              actualMeasureCount: null,
              measureTime: null,
              actualMeasureTime: null,
              startLookbackAt: null,
              nextSubmitAt: null,
              lookBackInterval: 0,
              lookBackType: '',
              items: [],
              isComplete: false,
            },
          };
        }

        // Return the existing skill if found
        return skill;
      });
      return filledSkillMap;
    });
  };

  return (
    <div
      className="w-full p-7 bg-[#F8FAFC] rounded-[30px] mb-5 overflow-x-auto scrollbar-gutter-stable max-w-full"
      style={{ boxShadow: '0px 4px 10px 0px #0000000D' }}>
      <p className="text-[#77858F] text-[16px] font-medium mb-[30px] max-w-[100%] break-all">
        {skillMapDetail.organizationName}
      </p>

      <div>
        {/* Steps bar */}
        <div className="flex w-max font-medium text-white text-[16px] mb-[14px]">
          <div className="w-[625px]">
            <StepInfoTooltip
              placement="top"
              currentStep={1}
              stepDefinition={skillMapDetail.steps.step1}>
              <div className="w-[625px] h-[32px] rounded-l-[6px] bg-[#3DC1E2] relative clip-left  text-center flex items-center justify-center">
                STEP 1
              </div>
            </StepInfoTooltip>
            <div className="flex text-[#77858F] text-xs font-medium mt-[30px]">
              <p className="w-[calc(33.333333%_+_3px)]">スキル名</p>
              <p className="w-2/3 border-l-[1px] border-[#D2DBE1] pl-2">
                スキルの定義
              </p>
            </div>
          </div>

          <div className="w-[641px]">
            <StepInfoTooltip
              placement="top"
              currentStep={2}
              stepDefinition={skillMapDetail.steps.step2}>
              <div className="w-[641px] h-[32px] ml-[-16px] bg-primary relative clip-middle text-center flex items-center justify-center">
                STEP 2
              </div>
            </StepInfoTooltip>
            <div className="flex text-[#77858F] text-xs font-medium mt-[30px] ml-[-5px]">
              <p className="w-[calc(33.333333%_-_3px)]">スキル名</p>
              <p className="w-2/3 border-l-[1px] border-[#D2DBE1] pl-2">
                スキルの定義
              </p>
            </div>
          </div>

          <div className="w-[625px]">
            <StepInfoTooltip
              placement="top"
              currentStep={3}
              stepDefinition={skillMapDetail.steps.step3}>
              <div className="w-[625px] h-[32px] ml-[-32px] rounded-r-[6px] mr-7 bg-[#355AC9] relative clip-right text-center flex items-center justify-center">
                STEP 3
              </div>
            </StepInfoTooltip>
            <div className="flex text-[#77858F] text-xs font-medium mt-[30px] ml-[-25px]">
              <p className="w-[calc(33.333333%_-_5px)]">スキル名</p>
              <p className="w-2/3 border-l-[1px] border-[#D2DBE1] pl-2">
                スキルの定義
              </p>
            </div>
          </div>
        </div>
      </div>

      {normalizeSkillMaps(skillMapDetail.skillMaps).map(
        (skillMap: SkillMapByOrganizationInfo[], index) => {
          return (
            <div
              key={index}
              className={`flex w-full ${index != normalizeSkillMaps(skillMapDetail.skillMaps).length - 1 && 'mb-[14px]'} gap-[6px]`}>
              {skillMap.map((skill, idx) => {
                return (
                  <div key={skill.id ?? `${index}-${idx}`}>
                    {!skill.id ? (
                      <div
                        className="px-5 w-[613px] h-[90px] bg-white rounded-[14px]"
                        style={{
                          boxShadow: '0px 2px 8px 0px #0000001A',
                        }}></div>
                    ) : (
                      <div
                        className="px-5 py-4 w-[613px] h-[90px] bg-white flex justify-between items-center rounded-[14px]"
                        style={{
                          boxShadow: '0px 2px 8px 0px #0000001A',
                        }}>
                        <p className="w-1/3 text-sm font-medium max-w-full max-h-[72px] break-all line-clamp-2 pr-3">
                          {skill.skill.name}
                        </p>
                        <div className="w-2/3 pl-2 h-[60px] border-l-[1px] border-[#D2DBE1] flex items-center justify-between">
                          <p className="text-start text-sm max-w-[calc(100%_-_52px)] max-h-[60px] break-all line-clamp-2 pr-3">
                            {skill.skill.description}
                          </p>
                          <Button
                            variant="primary"
                            onClick={() => {
                              const stepNumber =
                                extractStepNumber(`${skill.skill.step}`) || 1;
                              onDetail({
                                skillId: skill.skill.id as number,
                                stepNumber: stepNumber,
                              });
                            }}
                            className="text-white font-medium text-sm !p-0 w-[50px] h-[30px]">
                            詳細
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        },
      )}
    </div>
  );
};
