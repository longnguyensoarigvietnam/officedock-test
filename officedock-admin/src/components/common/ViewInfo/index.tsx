import React, { ReactNode } from 'react';

type ViewInfoProps = {
  label?: string;
  className?: string;
  children?: ReactNode;
  labelClassName?: string
};

const ViewInfo = ({ label, className, labelClassName, children }: ViewInfoProps) => {
  return (
    <div className={`break-words pr-2 ${className}`}>
      <label htmlFor="" className={`font-bold ${labelClassName}`}>
        {label}
      </label>
      <div className="mt-1 text-gray-600">{children}</div>
    </div>
  );
};

export default ViewInfo;
