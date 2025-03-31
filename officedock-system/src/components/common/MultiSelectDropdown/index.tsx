'use client';
import { ReactNode, useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import Image from 'next/image';

import ErrorMessage from '../ErrorMessage';
import Spinner from '../Spinner';

import { OptionDropdownType } from '@interfaces/common';
import { NO_DATA_AVAILABLE } from '@constants';
import Checkbox from '../Checkbox';
import ImageRound from '../ImageRound';

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
  onChange?: (value: OptionDropdownType) => void;
};
const MultiSelectDropdown = ({
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
  onChange,
}: Props) => {
  const [selected, setSelected] = useState<OptionDropdownType[] | undefined>(
    selectedOptions || [],
  );
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({
    top: 0,
    left: 0,
    width: 0,
    isShow: false,
  });
  const dropdownRef = useRef<HTMLDivElement>(null);
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
  const calculatePosition = () => {
    if (dropdownRef.current) {
      const rect = dropdownRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom,
        left: rect.left,
        width: rect.width,
        isShow: true,
      });
    }
  };
  useEffect(() => {
    if (isOpen) {
      calculatePosition();
    } else {
      setPosition({
        top: 0,
        left: 0,
        width: 0,
        isShow: false,
      });
    }
  }, [isOpen]);
  const renderOptions = () => (
    <div
      className={`absolute mt-1 z-50 max-h-60 overflow-y-auto overflow-x-hidden rounded bg-white text-base shadow-lg ring-1 ring-black ring-opacity-5 ${optionClassName}`}
      style={{
        top: position.top,
        left: position.left,
        width: position.width,
        position: 'fixed',
        display: position.isShow ? 'block' : 'none',
      }}>
      {isLoading ? (
        <Spinner className="!h-fit py-3" />
      ) : options?.length ? (
        options.map((option) => (
          <>
            <div
              key={option.value}
              className={`relative hover:cursor-pointer flex items-start justify-between  select-none hover:bg-[#f8fafc] py-2 pl-2 pr-3 border-b-[1px] border-gray-100`}>
              <div className="max-w-[80%]">
                <Checkbox
                  label={option.label}
                  onChange={() => {
                    handleOptionClick(option);
                  }}
                  classLabel={labelOptionClass}
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
          onClick={() => {
            if (disabled) {
              setIsOpen(false);
            } else {
              setIsOpen(true);
            }
          }}>
          <div className="h-full">
            <div
              className={` h-full flex relative w-full cursor-default rounded border bg-white py-2  leading-5.5 pl-3 pr-10 text-left shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                disabled ? 'opacity-50 cursor-not-allowed' : ''
              } ${valueClassName} `}>
              <p
                className={`block truncate ${!selected && 'text-gray-300'} text-left min-h-[24px] text-xs  ${labelClass}`}>
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

      {isOpen &&
        ReactDOM.createPortal(
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />,
          document.body,
        )}
      {isOpen && ReactDOM.createPortal(renderOptions(), document.body)}
      {error && (
        <ErrorMessage error={error} className="mt-2 text-sm text-red-600" />
      )}
    </div>
  );
};
export default MultiSelectDropdown;
