import { ReactNode } from 'react';

const ViewInfo = ({
  label,
  children,
  className,
  childrenClassName
}: {
  label: string;
  children?: ReactNode;
  className?: string;
  childrenClassName?: string
}) => {
  return (
    <div className={`w-full ${className}`}>
      <div>
        <label className="font-bold">{label}</label>
        <div className={`mt-1 text-gray-600 min-h-[24px] ${childrenClassName}`}>
          <span>{children}</span>
        </div>
      </div>
    </div>
  );
};

export default ViewInfo;
