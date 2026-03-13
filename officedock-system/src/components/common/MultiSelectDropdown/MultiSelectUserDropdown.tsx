'use client';
import { ReactNode, useEffect, useRef, useState } from 'react';
import Image from 'next/image';

import ErrorMessage from '../ErrorMessage';
import Spinner from '../Spinner';

import { OptionDropdownType } from '@interfaces/common';
import { NO_DATA_AVAILABLE } from '@constants';
import Checkbox from '../Checkbox';
import ImageRound from '../ImageRound';
import CustomUserAvatar from '../AvatarIcon/CustomUserAvatar';

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
  labelOptionClass?: string;
  customLabel?: string;
  placeholder?: string;
  searchOption?: boolean;
  selectedOptions?: OptionDropdownType[];
  forceClose?: number;
  onChange?: (value: OptionDropdownType) => void;
};
const MultiSelectUserDropdown = ({
  label,
  required,
  error,
  isLoading,
  options,
  placeholder,
  disabled = false,
  isShowIconFilter = false,
  customLabel,
  className,
  labelClass,
  labelOptionClass,
  valueClassName,
  optionClassName,
  selectedOptions,
  forceClose,
  onChange,
}: Props) => {
  const [selected, setSelected] = useState<OptionDropdownType[] | undefined>(
    selectedOptions || [],
  );
  const [isOpen, setIsOpen] = useState(false);
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
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownOptionsRef.current &&
        !dropdownOptionsRef.current.contains(event.target as Node) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('click', handleClickOutside);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [isOpen]);
  const renderOptions = () => (
    <div
      ref={dropdownOptionsRef}
      className={`multi-select-user-dropdown-options absolute top-8 w-full left-0 mt-1 z-50 max-h-60 overflow-y-auto overflow-x-hidden rounded bg-white text-base shadow-lg ring-1 ring-black ring-opacity-5 ${optionClassName}`}>
      {isLoading ? (
        <Spinner className="!h-fit py-3" />
      ) : options?.length ? (
        options.map((option) => (
          <>
            <div
              key={option.value}
              className={`relative hover:cursor-pointer flex items-start justify-between  select-none hover:bg-[#f8fafc] py-2 pl-2 pr-3 border-b-[1px] border-gray-100`}
              onClick={() => handleOptionClick(option)}>
              <div className="max-w-[80%] flex items-center gap-2">
                <div className="w-5">
                  <Checkbox
                    classLabel={labelOptionClass}
                    isChecked={
                      selected?.find(
                        (selectedOption) =>
                          selectedOption.value == option.value,
                      )
                        ? true
                        : false
                    }
                  />
                </div>
                <div className="min-w-[30px]">
                  <CustomUserAvatar
                    avatarUrl={option?.imgUrl || ''}
                    avatarColor={option?.iconColor || ''}
                    size={30}
                    customClassName={`${!option?.imgUrl && 'mt-[2px]'}`}
                  />
                </div>
                <span className={` text-sm font-medium ${labelOptionClass}`}>
                  {option.label}
                </span>
              </div>
              {option.largeColor && (
                <div
                  style={{
                    backgroundColor: option.largeColor,
                  }}
                  className="w-3 h-3 rounded-sm relative top-[6px]"></div>
              )}
            </div>
          </>
        ))
      ) : (
        <div className="block py-2 px-3 text-sm text-gray-500">
          {NO_DATA_AVAILABLE}
        </div>
      )}
    </div>
  );
  return (
    <div className={`relative h-full ${className}`} ref={dropdownRef}>
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
              setIsOpen(!isOpen);
            }
          }}
          className={`w-[14px] h-[14px]  hover:cursor-pointer relative top-[2px]`}
          name="Sort icon"
          src={`/icons/sort.svg`}
        />
      ) : (
        <div
          className="h-full"
          onClick={() => {
            if (disabled) {
              setIsOpen(false);
            } else {
              setIsOpen(!isOpen);
            }
          }}>
          <div className="h-full">
            <div
              className={` h-full flex relative w-full cursor-pointer rounded border bg-white py-2  leading-5.5 pl-3 pr-10 text-left shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                disabled ? 'opacity-50 cursor-not-allowed' : ''
              } ${valueClassName} `}>
              <p
                className={`block truncate ${!selected && 'text-gray-300'} text-left min-h-[24px] text-xs ${labelClass}`}>
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
export default MultiSelectUserDropdown;
