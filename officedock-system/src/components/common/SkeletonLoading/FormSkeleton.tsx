import React from 'react';
import { SkeletonContainer, SkeletonElement } from '.';

const FormSkeleton = () => {
  return (
    <SkeletonContainer className="!p-0 !gap-0 w-full border border-gray-200">
      <div className="flex flex-col gap-4 p-6">
        {[...Array(3)].map((_, index) => (
          <div
            key={index}
            className="w-full bg-gray-100 p-4 rounded-2xl grid grid-cols-7 gap-2">
            <SkeletonElement className="col-span-3 !h-8" />
            <SkeletonElement className="col-span-1 !h-8" />
            <SkeletonElement className="col-span-1 !h-8" />
            <SkeletonElement className="col-span-1 !h-8" />
            <SkeletonElement className="col-span-1 !h-8" />
          </div>
        ))}
      </div>
    </SkeletonContainer>
  );
};

export default FormSkeleton;
