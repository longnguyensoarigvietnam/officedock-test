import { ReactNode } from 'react';

export type TableProps = {
  children: ReactNode;
  className?: string;
  classCustom?: string;
  tableClassName?: string;
};

export type TableHeaderProps = TableProps;

export type TableBodyProps = TableProps;

export const TableHeader = ({
  children,
  className,
  classCustom,
}: TableHeaderProps) => {
  return (
    <thead className={`bg-gray-100 static top-0 ${className}`}>
      <tr
        className={`[&>th]:text-gray-700 [&>th]:font-medium [&>th]:text-base [&>th]:py-3 [&>th]:pr-2 [&>th]:pl-[18px] ${classCustom}`}>
        {children}
      </tr>
    </thead>
  );
};

export const TableBody = ({ children, className }: TableBodyProps) => {
  return (
    <tbody
      className={`divide-y divide-gray-200 bg-white text-gray-600 text-base font-normal text-center [&>tr>td]:py-3 [&>tr>td]:pr-2 [&>tr>td]:pl-4 ${className}`}>
      {children}
    </tbody>
  );
};

export const Table = ({ children, className, classCustom, tableClassName }: TableProps) => {
  return (
    <div className={`low-root w-full ${classCustom}`}>
      <div
        className={`overflow-x-auto min-w-full py-2 px-1 align-middle ${classCustom} `}>
        <div
          className={`overflow-hidden border border-gray-300 rounded-2xl ${className}`}>
          <table className={`min-w-full table-auto divide-y divide-gray-200 ${tableClassName}`}>
            {children}
          </table>
        </div>
      </div>
    </div>
  );
};
