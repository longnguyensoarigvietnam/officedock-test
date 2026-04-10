'use client';
import { ReactNode, useEffect, useRef, useState } from 'react';
import Image from 'next/image';

import ErrorMessage from '../ErrorMessage';
import Spinner from '../Spinner';
import Checkbox from '../Checkbox';
import ImageRound from '../ImageRound';
import InputSearch from '../InputSearch';

import { OptionDropdownType } from '@interfaces/common';

import { NO_DATA_AVAILABLE } from '@constants';

type Props = {
  isShowIconFilter?: boolean;
  label?: ReactNode;
  options: OptionDropdownType[];
  selectedOption?: OptionDropdownType;
  error?: ReactNode;
  isLoading?: boolean;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  labelClass?: string;
  valueClassName?: string;
  optionClassName?: string;
  optionsCheckBoxClassName?: string;
  labelOptionClass?: string;
  customLabel?: string;
  placeholder?: string;
  searchOption?: boolean;
  selectedOptions?: OptionDropdownType[];
  noDataClass?: string;
  forceClose?: number;
  /** When true, closes the panel when the pointer leaves the trigger + options area. */
  closeOnMouseLeave?: boolean;
  onChange?: (value: OptionDropdownType) => void;
};
const MultiSelectDropdownSearch = ({
  label,
  required,
  error,
  isLoading,
  options,
  placeholder,
  disabled = false,
  isShowIconFilter = false,
  optionsCheckBoxClassName,
  customLabel,
  className,
  labelClass,
  labelOptionClass,
  valueClassName,
  optionClassName,
  searchOption = false,
  selectedOptions,
  noDataClass,
  forceClose,
  closeOnMouseLeave = false,
  onChange,
}: Props) => {
  const [selected, setSelected] = useState<OptionDropdownType[] | undefined>(
    selectedOptions || [],
  );
  const [isOpen, setIsOpen] = useState(false);
  const [searchInput, setSearchInput] = useState('');

  const dropdownRef = useRef<HTMLDivElement>(null);
  const dropdownOptionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedOptions && selectedOptions.length > 0) {
      setSelected(selectedOptions);
    } else {
      setSelected([]);
    }
  }, [selectedOptions]);
  const handleOptionClick = (option: OptionDropdownType) => {
    onChange && onChange(option);
  };

  useEffect(() => {
    if (forceClose) {
      setIsOpen(false);
    }
  }, [forceClose]);

  useEffect(() => {
    if (!isOpen) {
      setSearchInput('');
    }
  }, [isOpen]);

  const normalizedSearchInput = searchInput.toLowerCase().trim();
  const filteredOptions = options?.filter((option) => {
    if (!normalizedSearchInput) return true;
    const label = option.label?.toLowerCase() || '';
    const furigana = option.furigana?.toLowerCase() || '';
    return (
      label.includes(normalizedSearchInput) ||
      furigana.includes(normalizedSearchInput)
    );
  });

  useEffect(() => {
    const handleMouseDownOutside = (event: MouseEvent) => {
      if (
        dropdownOptionsRef.current &&
        !dropdownOptionsRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('click', handleMouseDownOutside);
    }

    return () => {
      document.removeEventListener('click', handleMouseDownOutside);
    };
  }, [isOpen]);

  const renderOptions = () => (
    <div
      ref={dropdownOptionsRef}
      onClick={(e) => e.stopPropagation()}
      className={`multi-select-dropdown-options absolute top-8 w-full left-0 mt-1 z-50 max-h-60 overflow-y-auto overflow-x-hidden rounded-[6px] bg-white text-base shadow-lg ring-1 ring-black ring-opacity-5 ${optionClassName}`}>
      {searchOption && (
        <div className="flex gap-2 items-center">
          <div className="w-full">
            <InputSearch
              value={searchInput}
              placeholder="検索"
              onChange={(e) => setSearchInput(e.target.value)}
              inputClassName="!rounded-none border-t-0 border-x-0"
              className="px-2"
              onKeyDown={(e) => {
                if (e.key === ' ') {
                  e.stopPropagation();
                }
              }}
            />
          </div>
        </div>
      )}
      {isLoading ? (
        <Spinner className="!h-fit py-3" />
      ) : filteredOptions?.length ? (
        filteredOptions.map((option) => (
          <>
            <div
              key={option.value}
              onClick={(e) => {
                e.stopPropagation();
                handleOptionClick(option);
              }}
              className={`relative hover:!cursor-pointer flex items-start justify-between hover:bg-[#f8fafc] py-2 pl-2 pr-3 border-b-[1px] border-gray-100`}>
              <div className={`max-w-[80%] ${optionsCheckBoxClassName}`}>
                <Checkbox
                  label={option.label}
                  disable={disabled}
                  classLabel={labelOptionClass}
                  className="hover:!cursor-pointer"
                  isChecked={
                    selected?.find(
                      (selectedOption) => selectedOption.value == option.value,
                    )
                      ? true
                      : false
                  }
                />
              </div>
              {option.largeColor && (
                <div
                  style={{
                    backgroundColor: option.largeColor,
                  }}
                  className="w-3 h-3 rounded-full relative top-[6px]"></div>
              )}
            </div>
          </>
        ))
      ) : (
        <div
          className={`block py-2 px-3 text-sm text-center text-gray-500 ${noDataClass}`}>
          {NO_DATA_AVAILABLE}
        </div>
      )}
    </div>
  );
  return (
    <div
      className={`relative h-full ${className}`}
      ref={dropdownRef}
      onMouseLeave={
        closeOnMouseLeave
          ? () => {
              if (isOpen) setIsOpen(false);
            }
          : undefined
      }>
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500"> *</span>}
        </label>
      )}
      {isShowIconFilter ? (
        <ImageRound
          onClick={() => {
            if (disabled) {
              setIsOpen(false);
            } else {
              setIsOpen(true);
            }
          }}
          className={`w-[14px] h-[14px]  hover:cursor-pointer relative top-[2px]`}
          name="Sort icon"
          src={`/icons/sort.svg`}
        />
      ) : (
        <div
          className="h-full"
          onClick={(e) => {
            e.stopPropagation();
            if (disabled) {
              setIsOpen(false);
            } else {
              setIsOpen(!isOpen);
            }
          }}>
          <div className="h-full">
            <div
              className={` h-full flex items-center relative hover:cursor-pointer w-full cursor-default rounded-[6px] border bg-white py-2  leading-5.5 pl-3 pr-10 text-left shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                disabled ? 'opacity-50 cursor-not-allowed' : ''
              } ${valueClassName} `}>
              <p
                className={`block truncate ${!selected && 'text-gray-300'} text-left text-xs  ${labelClass}`}>
                {customLabel
                  ? customLabel
                  : placeholder || <div className="h-[22px]"></div>}
              </p>
              <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                <Image
                  src="/icons/arrow-down.svg"
                  alt="Arrow down"
                  width={16}
                  height={16}
                  className={`${isOpen ? 'rotate-180' : 'rotate-0'}`}
                />
              </div>
            </div>
          </div>
        </div>
      )}
      {isOpen && renderOptions()}
      {error && (
        <ErrorMessage error={error} className="mt-2 text-sm text-red-600" />
      )}
    </div>
  );
};
export default MultiSelectDropdownSearch;
