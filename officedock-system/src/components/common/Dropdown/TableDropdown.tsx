'use client';
import { ReactNode, useEffect, useRef, useState } from 'react';
import Image from 'next/image';

import ErrorMessage from '../ErrorMessage';
import Spinner from '../Spinner';
import InputSearch from '../InputSearch';
import ImageRound from '../ImageRound';

import { OptionDropdownType } from '@interfaces/common';
import { NO_DATA_AVAILABLE } from '@constants';

type Props = {
  label?: ReactNode;
  options: OptionDropdownType[];
  selectedOption?: OptionDropdownType;
  error?: ReactNode;
  isLoading?: boolean;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  labelClass?: string;
  labelOptionClass?: string;
  valueClassName?: string;
  optionClassName?: string;
  placeholder?: string;
  searchOption?: boolean;
  addInput?: boolean;
  onChange?: (value: OptionDropdownType) => void;
  onAdd?: (value: string) => void;
  minDropdownHeight?: number;
};
const TableDropdown = ({
  label,
  required,
  error,
  isLoading,
  options,
  placeholder,
  disabled = false,
  className,
  labelClass,
  labelOptionClass,
  valueClassName,
  optionClassName,
  selectedOption,
  searchOption = false,
  addInput = false,
  onChange,
  onAdd,
  minDropdownHeight = 0,
}: Props) => {
  const [selected, setSelected] = useState<OptionDropdownType | undefined>(
    selectedOption || undefined,
  );
  const [isOpen, setIsOpen] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [position, setPosition] = useState({
    top: 0,
    left: 0,
    width: 0,
    isShow: false,
  });
  const [isAbove, setIsAbove] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const optionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedOption) {
      setSelected(selectedOption);
    } else {
      setSelected(undefined);
    }
  }, [selectedOption]);
  const handleOptionClick = (option: OptionDropdownType) => {
    setSelected(option);
    setIsOpen(false);
    onChange && onChange(option);
  };
  const calculatePosition = () => {
    if (dropdownRef.current) {
      const rect = dropdownRef.current.getBoundingClientRect();
      setPosition({
        top: isAbove ? rect.top : rect.bottom,
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

  useEffect(() => {
    const handleClosePopover = (event: MouseEvent | Event) => {
      if (
        optionsRef.current &&
        !(optionsRef.current as Node).contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleScroll = () => {
      setIsOpen(false);
    };

    document.addEventListener('click', handleClosePopover, true);
    window.addEventListener('scroll', handleScroll, true);

    return () => {
      document.removeEventListener('click', handleClosePopover, true);
      window.removeEventListener('scroll', handleScroll, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredOptions = options.filter((option) =>
    option.label?.toLowerCase().includes(searchInput.toLowerCase()),
  );
  const renderOptions = () => (
    <div
      ref={optionsRef}
      className={`absolute mt-1 z-50 max-h-60 overflow-auto rounded bg-white text-base shadow-lg ring-1 ring-black ring-opacity-5 ${optionClassName}`}
      style={{
        top: position.top,
        transform: isAbove ? 'translateY(-103%)' : '',
        left: position.left,
        width: position.width,
        position: 'fixed',
        display: position.isShow ? 'block' : 'none',
      }}>
      {searchOption && (
        <div className="flex gap-2 items-center mb-[2px]">
          <div className="w-full ">
            <InputSearch
              value={searchInput}
              placeholder="検索"
              onChange={(e) => setSearchInput(e.target.value)}
              inputClassName="!rounded-none  border-t-0 border-x-0 "
              className="px-2"
              onKeyDown={(e) => {
                if (e.key === ' ') {
                  e.stopPropagation();
                }
              }}
            />
          </div>
          {addInput && (
            <ImageRound
              className="w-4 h-4 cursor-pointer mr-1"
              src="/icons/add.svg"
              border="full"
              name="Add option"
              onClick={() => {
                if (onAdd && searchInput.trim()) {
                  onAdd(searchInput);
                }
              }}
            />
          )}
        </div>
      )}
      {isLoading ? (
        <Spinner className="!h-fit py-3" />
      ) : filteredOptions?.length ? (
        filteredOptions.map((option) => (
          <div
            key={option.value}
            className={`relative hover:cursor-pointer select-none hover:bg-[#f8fafc] py-2 pl-0 pr-3 ${
              option.value == selected?.value
                ? ' !text-blue-600'
                : '!text-gray-900'
            }`}
            onClick={(e) => {
              e.stopPropagation();
              handleOptionClick(option);
            }}>
            <div className="flex items-center">
              {option.imgUrl && (
                <ImageRound
                  src={option.imgUrl}
                  name="Image option"
                  className="!w-4 !h-4"
                />
              )}
              <span className={`ml-3 block ${labelOptionClass}`}>
                {option.label}
              </span>
            </div>
          </div>
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
      <div
        className="h-full"
        onClick={() => {
          if (disabled) {
            setIsOpen(false);
          } else {
            if (dropdownRef.current) {
              const rect = dropdownRef.current.getBoundingClientRect();
              const viewportHeight = window.innerHeight;
              setIsAbove(rect.bottom + minDropdownHeight > viewportHeight);
            }
            setIsOpen(true);
          }
        }}>
        <div className="h-full">
          <div
            className={`${valueClassName} h-full flex justify-center flex-col relative w-full cursor-default rounded border bg-white py-2.5  leading-5.5 pl-3 pr-10 text-left shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
              disabled ? 'opacity-50 cursor-not-allowed' : ''
            }`}>
            <span
              className={`block truncate ${!selected && 'text-gray-300'} min-h-[24px] text-[16px] ${labelClass}`}>
              {selected
                ? selected.label
                : placeholder || <div className="h-[22px]"></div>}
            </span>
            <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
              <Image
                src="/icons/arrow-down.svg"
                alt="Arrow down"
                width={16}
                height={16}
                className={`${isOpen ? 'rotate-180' : 'rotate-0'}`}
              />
            </span>
          </div>
        </div>
      </div>
      {isOpen && renderOptions()}

      {error && (
        <ErrorMessage error={error} className="mt-2 text-sm text-red-600" />
      )}
    </div>
  );
};
export default TableDropdown;
