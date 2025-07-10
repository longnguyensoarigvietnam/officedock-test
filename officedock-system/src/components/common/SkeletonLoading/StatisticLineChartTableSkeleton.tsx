import React from 'react';
import { SkeletonContainer, SkeletonElement } from '.';

const StatisticLineChartTableSkeleton = () => {
  return (
    <div className="w-full pt-10">
      <SkeletonContainer className="!p-0 !gap-0 mt-5 w-full border border-gray-200">
        <div className="flex flex-col gap-4 p-6">
          {[...Array(3)].map((_, index) => (
            <div
              key={index}
              className="w-full bg-white p-4 rounded-2xl grid grid-cols-10 gap-2">
              <SkeletonElement className="col-span-4 !h-8" />
              <SkeletonElement className="col-span-1 !h-8" />
              <SkeletonElement className="col-span-1 !h-8" />
              <SkeletonElement className="col-span-4 !h-8" />
            </div>
          ))}
        </div>
      </SkeletonContainer>
    </div>
  );
};

export default StatisticLineChartTableSkeleton;
