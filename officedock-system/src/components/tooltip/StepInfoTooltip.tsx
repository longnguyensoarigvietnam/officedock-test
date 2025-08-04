import React, { cloneElement, useContext, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { clsx } from 'clsx';
import { GlobalStateContext } from '@providers/GlobalStateProvider';

type Props = {
  children: React.ReactElement;
  disabled?: boolean;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  customOffset?: { top?: number; left?: number };
  stepDefinition: string;
  currentStep: number;
};

export const StepInfoTooltip = ({
  children,
  disabled = false,
  placement = 'right',
  customOffset,
  stepDefinition,
  currentStep,
}: Props) => {
  const { getDelay, recordHover } = useContext(GlobalStateContext);
  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number }>({
    top: 0,
    left: 0,
  });
  const wrapperRef = useRef<HTMLDivElement>(null);
  const timeoutId = useRef<NodeJS.Timeout | null>(null);
  const [size, setSize] = useState<{ width: number }>({ width: 0 });

  const show = () => {
    if (disabled) return;

    const delay = getDelay();
    timeoutId.current = setTimeout(() => {
      if (wrapperRef.current) {
        const rect = wrapperRef.current.getBoundingClientRect();
        const offset = 8; // tooltip margin
        const positionMap = {
          top: { top: rect.top - offset, left: rect.left + rect.width / 2 },
          bottom: {
            top: rect.bottom + offset,
            left: rect.left + rect.width / 2,
          },
          left: {
            top: rect.top + rect.height / 2,
            left: rect.left - offset,
          },
          right: { top: rect.top + rect.height / 2, left: rect.right + offset },
        };
        const base = positionMap[placement];
        setCoords({
          top:
            customOffset?.top !== undefined
              ? base.top + customOffset.top
              : base.top,
          left:
            customOffset?.left !== undefined
              ? base.left + customOffset.left
              : base.left,
        });
        setSize({ width: rect.width });
      }

      setVisible(true);
      recordHover();
    }, delay);
  };

  const hide = () => {
    setVisible(false);
    if (timeoutId.current) clearTimeout(timeoutId.current);
  };

  const tooltipNode =
    visible && !disabled
      ? createPortal(
          <div
            className={clsx(
              'fixed p-5 bg-white rounded-[14px] z-50 text-sm pointer-events-none transform',
              {
                '-translate-x-1/2 -translate-y-full': placement === 'top',
                '-translate-x-1/2 translate-y-0': placement === 'bottom',
                '-translate-y-1/2 translate-x-0':
                  placement === 'left' || placement === 'right',
              },
              'after:content-[""] after:absolute after:border-[8px] after:border-transparent',
              {
                'after:top-full after:left-1/2 after:-translate-x-1/2 after:border-t-white':
                  placement === 'top',
                'after:bottom-full after:left-1/2 after:-translate-x-1/2 after:border-b-white':
                  placement === 'bottom',
              },
            )}
            style={{
              top: coords.top - 10,
              left: coords.left,
              width: size.width,
              boxShadow: '0px 2px 8px 0px #0000001A',
            }}>
            <div className="flex gap-1 items-center mb-4">
              <div
                className="rounded-[20px] text-white text-xs w-[70px] h-[24px] flex justify-center items-center"
                style={{
                  backgroundColor:
                    currentStep == 1
                      ? '#36ACDE'
                      : currentStep == 2
                        ? '#0068B6'
                        : '#424EC1',
                }}>
                STEP {currentStep}
              </div>
              <p className="text-[#77858F] text-xs font-medium">の定義</p>
            </div>
            <p className="font-normal text-sm max-w-[100%] break-all">
              {stepDefinition}
            </p>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      {cloneElement(children, {
        onMouseEnter: show,
        onMouseLeave: hide,
        ref: wrapperRef,
      })}
      {tooltipNode}
    </>
  );
};
