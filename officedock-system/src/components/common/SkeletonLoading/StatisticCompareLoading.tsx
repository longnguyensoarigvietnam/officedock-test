import React from 'react';
import { SkeletonElement } from '.';

interface props {
  className?: string;
}

const StatisticCompareLoading = ({ className }: props) => {
  return (
    <div className={`w-[280px] ${className} `}>
      <SkeletonElement className="!h-[100px] !rounded-sm w-full" />
    </div>
  );
};

export default StatisticCompareLoading;
