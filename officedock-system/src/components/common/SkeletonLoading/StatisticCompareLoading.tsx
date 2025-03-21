import React from 'react';
import { SkeletonElement } from '.';

interface props {
  className?: string;
}

const StatisticCompareLoading = ({ className }: props) => {
  return (
    <div className={`flex flex-col gap-[30px]  w-[280px] pt-8 ${className} `}>
      <SkeletonElement className="!h-[100px] !rounded-sm w-full" />
      <SkeletonElement className="!h-[100px] !rounded-sm w-full" />
    </div>
  );
};

export default StatisticCompareLoading;
