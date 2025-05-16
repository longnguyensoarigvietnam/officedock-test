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
              nextLevel: '',
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
      className="w-full p-7 bg-[#F8FAFC] rounded-[14px] mb-5 overflow-x-auto scrollbar-gutter-stable max-w-full"
      style={{ boxShadow: '0px 4px 10px 0px #0000000D' }}>
      <p className="text-[#77858F] text-[16px] font-medium mb-4 max-w-[100%] break-all">
        {skillMapDetail.organizationName}
      </p>

      <div>
        <div className="flex w-max font-medium text-white text-[16px] mb-5">
          <div className="w-[625px]">
            <StepInfoTooltip
              placement="top"
              currentStep={1}
              stepDefinition={skillMapDetail.steps.step1}>
              <div className="w-[625px] h-[32px] rounded-l-[6px] bg-[#36ACDE] relative clip-left  text-center flex items-center justify-center">
                STEP 1
              </div>
            </StepInfoTooltip>
            <div className="flex text-[#77858F] text-xs font-medium mt-8">
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
              <div className="w-[641px] h-[32px] ml-[-16px] bg-[#0068B6] relative clip-middle text-center flex items-center justify-center">
                STEP 2
              </div>
            </StepInfoTooltip>
            <div className="flex text-[#77858F] text-xs font-medium mt-8 ml-[-5px]">
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
              <div className="w-[625px] h-[32px] ml-[-32px] rounded-r-[6px] mr-7 bg-[#424EC1] relative clip-right text-center flex items-center justify-center">
                STEP 3
              </div>
            </StepInfoTooltip>
            <div className="flex text-[#77858F] text-xs font-medium mt-8 ml-[-25px]">
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
              className={`flex w-full ${index != normalizeSkillMaps(skillMapDetail.skillMaps).length - 1 && 'mb-5'} gap-2`}>
              {skillMap.map((skill) => {
                return (
                  <div key={skill.id}>
                    {!skill.id ? (
                      <div
                        className="px-5 w-[613px] h-[90px] bg-white rounded-[6px]"
                        style={{
                          boxShadow: '0px 2px 8px 0px #0000001A',
                        }}></div>
                    ) : (
                      <div
                        className="px-5 py-4 w-[613px] h-[90px] bg-white flex justify-between items-center rounded-[6px]"
                        style={{
                          boxShadow: '0px 2px 8px 0px #0000001A',
                        }}>
                        <p className="w-1/3 max-w-full max-h-[72px] break-all line-clamp-2 pr-3">
                          {skill.skill.name}
                        </p>
                        <div className="w-2/3 pl-2 h-[74px] border-l-[1px] border-[#D2DBE1] flex items-center justify-between">
                          <p className="text-start max-w-[calc(100%_-_52px)] max-h-[72px] break-all line-clamp-2 pr-3">
                            {skill.skill.description}
                          </p>
                          <Button
                            variant="primary"
                            onClick={() => {
                              const stepNumber =
                                extractStepNumber(`${skill.step}`) || 1;
                              onDetail({
                                skillId: skill.skill.id as number,
                                stepNumber: stepNumber,
                              });
                            }}
                            className="text-white font-medium text-sm !p-0 w-[52px] h-[30px]">
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
