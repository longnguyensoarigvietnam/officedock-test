import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import Button from '@components/common/Button';

export const SkillInfoPopup = ({
  skillName,
  skillInfo,
}: {
  skillName: string;
  skillInfo:
    | {
        id: number;
        name: string;
        description: string;
        step: string;
      }[]
    | undefined;
}) => {
  const [showSkillInfoPopup, setShowSkillInfoPopup] = useState<boolean>(false);
  const [position, setPosition] = useState<{ top: number; left: number }>({
    top: -9999,
    left: -9999,
  });
  const [isReady, setIsReady] = useState(false);
  const infoPopupRef = useRef<HTMLDivElement | null>(null);
  const skillNameRef = useRef<HTMLParagraphElement | null>(null);
  const steps = [
    { label: 'STEP 1', color: '#36ACDE' },
    { label: 'STEP 2', color: '#0068B6' },
    { label: 'STEP 3', color: '#424EC1' },
  ];
  const [currentStep, setCurrentStep] = useState<number>(1);

  const renderSkillDetail = (
    skillInfo:
      | {
          id: number;
          name: string;
          description: string;
          step: string;
        }[]
      | undefined,
  ) => {
    const currentStepInfo = skillInfo?.find(
      (skill) => skill.step == `ステップ${currentStep}`,
    );
    return (
      <div
        ref={infoPopupRef}
        className="absolute
            after:content-[''] after:top-full after:absolute after:left-1/2 after:-translate-x-1/2
            after:border-8 after:border-transparent after:border-t-white
            bg-white rounded-[6px] text-sm z-50 flex flex-col gap-4
            transition-opacity duration-200 h-[190px] w-[300px] p-[24px]"
        style={{
          top: `${position.top}px`,
          left: `${position.left}px`,
          opacity: isReady ? 1 : 0,
          visibility: isReady ? 'visible' : 'hidden',
          boxShadow: '0px 2px 8px 0px #0000001A',
        }}>
        <div className="flex w-full rounded-[20px] font-medium bg-[#EBF1F7] px-[6px] py-[4px]">
          {steps.map((step, index) => {
            const stepNumber = index + 1;
            const isActive = currentStep === stepNumber;
            return (
              <Button
                key={step.label}
                type="button"
                onClick={() => {
                  setCurrentStep(stepNumber);
                }}
                style={
                  isActive
                    ? { backgroundColor: step.color, color: 'white' }
                    : { color: step.color, backgroundColor: '#EBF1F7' }
                }
                className="w-1/3 text-center py-[4px] !px-0 border-none !rounded-[20px] text-xs">
                {step.label}
              </Button>
            );
          })}
        </div>
        <p className="text-primary font-medium text-[16px] max-w-[100%] break-all">
          {currentStepInfo?.name}
        </p>
        <p className="text-black text-sm font-normal max-w-[100%] break-all max-h-[100%] overflow-y-auto">
          {currentStepInfo?.description}
        </p>
      </div>
    );
  };

  const handleToggle = () => {
    if (!skillNameRef.current) return;

    const buttonRect = skillNameRef.current.getBoundingClientRect();
    setShowSkillInfoPopup((prev) => !prev);
    setIsReady(false);

    requestAnimationFrame(() => {
      if (infoPopupRef.current) {
        setPosition({
          top: buttonRect.top - 205 + window.scrollY,
          left: buttonRect.left + buttonRect.width / 2 - 150 + window.scrollX,
        });

        setIsReady(true);
      }
    });
  };

  return (
    <div>
      <p
        className="text-left max-w-[100%] truncate px-4 hover:cursor-pointer"
        ref={skillNameRef}
        onClick={handleToggle}>
        {skillName}
      </p>
      {showSkillInfoPopup &&
        createPortal(
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowSkillInfoPopup(false)}
          />,
          document.body,
        )}
      {showSkillInfoPopup &&
        createPortal(renderSkillDetail(skillInfo), document.body)}
    </div>
  );
};
