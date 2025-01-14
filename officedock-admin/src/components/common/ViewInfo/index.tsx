import React, { ReactNode } from 'react';

type ViewInfoProps = {
  label?: string;
  className?: string;
  children?: ReactNode;
};

const ViewInfo = ({ label, className, children }: ViewInfoProps) => {
  return (
    <div className={`break-words pr-2 ${className}`}>
      <label htmlFor="" className="font-bold">
        {label}
      </label>
      <div className="mt-1 text-gray-600">{children}</div>
    </div>
  );
};

export default ViewInfo;
