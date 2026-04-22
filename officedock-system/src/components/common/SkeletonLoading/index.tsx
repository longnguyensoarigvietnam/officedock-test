import { ReactNode } from 'react';

export const SkeletonContainer = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => {
  return (
    <div
      className={`bg-white flex flex-col gap-6 p-5 rounded-2xl ${className}`}>
      {children}
    </div>
  );
};

export const SkeletonElement = ({ className }: { className?: string }) => {
  return (
    <div
      className={`w-full h-3 bg-[#d9d9d9] rounded-sm bg-[linear-gradient(100deg,_#ffffff00_40%,_#ffffff80_50%,_#ffffff00_60%)] bg-[length:200%_100%] animate-[loadingShimmer_1s_ease-in-out_infinite] ${className}`}
      style={{ backgroundPositionX: '180%' }}
    />
  );
};
