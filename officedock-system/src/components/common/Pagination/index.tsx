'use client';
import React, { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';

import { OptionDropdownType } from '@interfaces/common';
import Dropdown from '../Dropdown';

export type PaginationActiveButtonVariant =
  | 'primary'
  | 'secondary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'neutral';

export type PaginationSize = 'xs' | 'sm' | 'md' | 'lg';

export type PaginationProps = {
  currentPage: number;
  totalPages: number;
  showFirst?: boolean;
  showLast?: boolean;
  showTotal?: boolean;
  pagesToShow?: number;
  sz?: PaginationSize;
  variant?: PaginationActiveButtonVariant;
  className?: string;
  isKeepPage?: boolean;
  isSpace?: boolean;
  options?: OptionDropdownType[];
  selectedOption?: OptionDropdownType;
  onChange?: (pageSelected: number) => void;
  onChangeOption?: (value: OptionDropdownType) => void;
};

const Pagination = ({
  currentPage,
  totalPages,
  showFirst = true,
  showLast = true,
  showTotal = false,
  pagesToShow = 3,
  sz = 'md',
  variant = 'primary',
  className,
  isKeepPage = false,
  isSpace = false,
  options,
  selectedOption,
  onChange,
  onChangeOption,
}: PaginationProps) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [currentNumber, setCurrentNumber] = useState<number>(currentPage);

  useEffect(() => {
    if (currentPage) {
      setCurrentNumber(currentPage);
    }
  }, [currentPage]);

  const onPageChange = useCallback(
    (pageNumber: number) => {
      const createPageURL = (pageNumber: number | string) => {
        const params = new URLSearchParams(searchParams);
        params.set('page', pageNumber.toString());
        return `${pathname}?${params.toString()}`;
      };
      const handleChangePagination = (page: number) => {
        if (page === 1) {
          router.push(pathname);
          return;
        }
        router.push(createPageURL(pageNumber));
        return;
      };
      if (pageNumber > totalPages || pageNumber === 0) return;
      setCurrentNumber(pageNumber);
      isKeepPage ? handleChangePagination(pageNumber) : null;
      onChange ? onChange(pageNumber) : null;
    },
    [totalPages, isKeepPage, onChange, searchParams, pathname, router],
  );

  if (currentNumber > totalPages && totalPages > 0) {
    setCurrentNumber(1);
  }

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  const pageRange = () => {
    if (totalPages <= pagesToShow) return pages;
    const start = Math.max(currentNumber - Math.floor(pagesToShow / 2), 1);
    const end = Math.min(start + pagesToShow - 1, totalPages);
    if (end === totalPages) return pages.slice(totalPages - pagesToShow);
    if (start === 1) return pages.slice(0, pagesToShow);
    return pages.slice(start - 1, end);
  };

  const pageList = pageRange();
  const hasLeftEllipsis = pageList[0] > 2;
  const hasRightEllipsis = pageList[pageList.length - 1] < totalPages - 1;
  const showFirstPages = showFirst
    ? pagesToShow > 2
      ? pages.slice(0, 1)
      : pages.slice(0, 0)
    : [];
  const showLastPages = showLast ? pages.slice(totalPages - 1, totalPages) : [];

  let sizeClasses = '';
  switch (sz) {
    case 'xs':
      sizeClasses = 'w-5 h-5 text-xs';
      break;
    case 'sm':
      sizeClasses = 'w-7 h-7 text-sm';
      break;
    case 'lg':
      sizeClasses = 'w-9 h-9 text-sm';
      break;
    default:
      sizeClasses = 'w-[34px] h-[34px] text-sm';
      break;
  }

  const styleTag =
    'flex justify-center items-center relative rounded inline-flex font-medium hover: cursor-pointer';
  if (totalPages <= 0) {
    return;
  }

  return (
    <div
      className={`flex items-center justify-between px-4 py-3 sm:px-6 ${className}`}>
      <div className="flex flex-1 items-center justify-between">
        {options && (
          <div className="min-w-[54px] flex items-center">
            <Dropdown
              selectedOption={selectedOption}
              options={options}
              onChange={onChangeOption}
              className="h-[34px]  text-sm !py-0 !pl-[7px] !pr-0 !text-[#6B7280] mt-1 !bg-gray-100 border-gray-100"
              classNameOption="[&>li]:!pl-0 [&>li]:!pr-0 [&>li]:!text-sm [&>li]:!text-[#6B7280]"
            />
          </div>
        )}
        <nav
          className="isolate -space-x-px inline-flex rounded gap-2"
          aria-label="Pagination">
          {currentNumber != 1 && (
            <a
              href="#"
              className={`${sizeClasses} ${styleTag} ${isSpace && 'mr-5'} items-center`}
              onClick={() => onPageChange(currentNumber - 1)}>
              <Image
                src="/icons/chevron-left-pagination.svg"
                alt="Chevron left"
                width={7.5}
                height={13}
              />
            </a>
          )}

          {currentNumber >= pagesToShow && totalPages !== pagesToShow && (
            <>
              {showFirstPages.map((page) => (
                <a
                  key={page}
                  href="#"
                  aria-current="page"
                  className={`${sizeClasses} ${styleTag}   items-center ${
                    page === currentNumber
                      ? `bg-${variant} text-white font-normal`
                      : 'text-[#6B7280]'
                  }`}
                  onClick={() => onPageChange(page)}>
                  {page}
                </a>
              ))}
            </>
          )}
          {hasLeftEllipsis && (
            <span
              className={`items-center ${sizeClasses} ${styleTag}`}>
              ...
            </span>
          )}
          {pageList.map((page) => (
            <a
              key={page}
              className={`${sizeClasses} ${styleTag} z-2 items-center" ${
                page === currentNumber
                  ? `bg-${variant} text-white font-normal`
                  : 'text-[#6B7280]'
              }`}
              onClick={() => onPageChange(page)}>
              {page}
            </a>
          ))}
          {hasRightEllipsis && (
            <span
              className={`items-center ${sizeClasses} ${styleTag}`}>
              ...
            </span>
          )}
          {currentNumber <= totalPages - pagesToShow + 1 &&
            totalPages !== pagesToShow && (
              <>
                {showLastPages.map((page) => (
                  <a
                    key={page}
                    className={`${sizeClasses} ${styleTag} z-2 items-center ${
                      page === currentNumber
                        ? `bg-${variant} text-white font-normal`
                        : 'text-[#6B7280]'
                    }`}
                    onClick={() => onPageChange(page)}>
                    {page}
                  </a>
                ))}
              </>
            )}
          {currentNumber != totalPages && (
            <a
              className={`${sizeClasses} ${styleTag} ${isSpace && '!ml-5'} items-center`}
              onClick={() => onPageChange(currentNumber + 1)}>
              <Image
                src="/icons/chevron-left-pagination.svg"
                alt="Chevron right"
                width={7.5}
                height={13}
                className="rotate-180"
              />
            </a>
          )}
        </nav>

        {showTotal && (
          <p className="text-sm  text-[#6B7280]">ステータス : {totalPages}</p>
        )}
      </div>
    </div>
  );
};

export default Pagination;
