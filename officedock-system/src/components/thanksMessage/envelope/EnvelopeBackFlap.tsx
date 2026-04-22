import React from 'react';

interface EnvelopeBackFlapProps {
  isSendThanksMsg?: boolean;
}

// eslint-disable-next-line import/no-named-as-default-member
export const EnvelopeBackFlap = React.forwardRef<
  HTMLDivElement,
  EnvelopeBackFlapProps
>(({ isSendThanksMsg = false }, ref) => {
  return (
    <div
      ref={ref}
      className={`${!isSendThanksMsg ? '-rotate-180 z-40' : 'z-10'} absolute -top-[134px] left-0 `}
      style={{
        transformStyle: 'preserve-3d',
        transformOrigin: 'bottom center',
      }}>
      <svg
        width="620"
        height="254"
        viewBox="0 0 620 254"
        fill="none"
        xmlns="http://www.w3.org/2000/svg">
        <path
          d="M297.148 4.7793C304.582 -1.45559 315.418 -1.45559 322.852 4.7793L620 254H0L297.148 4.7793Z"
          fill={isSendThanksMsg ? '#F86683' : '#FF88A0'}
        />
      </svg>
    </div>
  );
});
