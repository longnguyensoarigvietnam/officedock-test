import { useContext, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { clsx } from 'clsx';
import { GlobalStateContext } from '@providers/GlobalStateProvider';

type Props = {
  content: React.ReactNode;
  children: React.ReactElement;
  disabled?: boolean;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  customOffset?: { top?: number; left?: number };
};

export const DynamicTooltip = ({
  content,
  children,
  disabled = false,
  placement = 'right',
  customOffset
}: Props) => {
  const { getDelay, recordHover } = useContext(GlobalStateContext);
  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number }>({
    top: 0,
    left: 0,
  });
  const wrapperRef = useRef<HTMLDivElement>(null);
  const timeoutId = useRef<NodeJS.Timeout | null>(null);

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
              'fixed z-50 px-2 py-1 bg-[#5B6770] text-white text-sm rounded shadow pointer-events-none transform -translate-x-1/2',
              {
                '-translate-y-full': placement === 'top',
                'translate-y-0': placement === 'bottom',
                '-translate-y-1/2 translate-x-0':
                  placement === 'left' || placement === 'right',
              },
            )}
            style={{
              top: coords.top,
              left: coords.left,
            }}>
            {content}
          </div>,
          document.body,
        )
      : null;

  return (
    <div onMouseEnter={show} onMouseLeave={hide} ref={wrapperRef}>
      {children}
      {tooltipNode}
    </div>
  );
};
