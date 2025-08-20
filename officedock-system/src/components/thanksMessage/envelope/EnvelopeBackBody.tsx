import React from "react";

export const EnvelopeBackBody = React.forwardRef<HTMLDivElement>((_, ref) => {
  return (
    <div
      ref={ref}
      className="w-[620px] h-[330px] bg-[#E7456A] shadow-md absolute top-[120px] left-0 z-10 rounded-b-[20px]"
    />
  );
});