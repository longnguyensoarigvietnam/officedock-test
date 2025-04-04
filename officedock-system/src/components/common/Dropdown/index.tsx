'use client';
import { CSSProperties, Fragment, ReactNode, useEffect, useState } from 'react';
import {
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
  Transition,
} from '@headlessui/react';
import Image from 'next/image';

import ErrorMessage from '../ErrorMessage';
import ImageRound from '../ImageRound';
import InputSearch from '../InputSearch';
import { OptionDropdownType } from '@interfaces/common';
import { NO_DATA_AVAILABLE } from '@constants';
import { PriorityTask, StatusTask } from '@constants/enums';
import Spinner from '../Spinner';

type Props = {
  label?: ReactNode;
  options: OptionDropdownType[];
  selectedOption?: OptionDropdownType;
  error?: ReactNode;
  isLoading?: boolean;
  required?: boolean;
  isStatusDropdown?: boolean;
  disabled?: boolean;
  className?: string;
  classNameOption?: string;
  classNameError?: string;
  classNameTextData?: string;
  classTextOption?: string;
  placeholder?: string;
  searchOption?: boolean;
  openByDefault?: boolean;
  isShowIconDrop?: boolean;
  labelClass?: string;
  labelTextClass?: string;
  classActive?: string;
  labelOptionClass?: string;
  placeholderClass?: string;
  addInput?: boolean;
  styleClass?: CSSProperties;
  styleClassOption?: CSSProperties;
  imgClassname?: string;
  onChange?: (value: OptionDropdownType) => void;
  onAdd?: (value: string) => void;
  disableItems?: string[]
};

const Dropdown = ({
  label,
  required,
  error,
  isLoading,
  options,
  labelClass,
  labelTextClass,
  placeholderClass,
  isStatusDropdown,
  labelOptionClass,
  placeholder,
  classTextOption,
  disabled = false,
  className,
  classNameOption,
  classNameError,
  classNameTextData,
  classActive,
  selectedOption,
  searchOption = false,
  addInput = false,
  openByDefault,
  styleClass,
  styleClassOption,
  isShowIconDrop = true,
  imgClassname,
  disableItems = [],
  onAdd,
  onChange,
}: Props) => {
  const [selected, setSelected] = useState<OptionDropdownType | undefined>(
    selectedOption ? selectedOption : undefined,
  );
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [searchInput, setSearchInput] = useState<string>('');
  const errorClasses = error ? 'border-danger' : 'border-gray-200';

  const priorityStyles = [
    {
      label: PriorityTask.HIGH,
      color: 'hover:bg-[#FFAB87]',
    },
    {
      label: PriorityTask.MEDIUM,
      color: 'hover:bg-[#FBE366]',
    },
    {
      label: PriorityTask.LOW,
      color: 'hover:bg-[#94CDF7]',
    },
  ];

  const statusStyles = [
    {
      label: StatusTask.NOT_STARTED,
      color: 'bg-[#A3EBF0]',
    },
    {
      label: StatusTask.IN_PROGRESS,
      color: 'bg-[#92E9AF]',
    },
    {
      label: StatusTask.CONFIRMING,
      color: 'bg-[#FCCF79]',
    },
    {
      label: StatusTask.COMPLETED,
      color: 'bg-[#F58383]',
    },
  ];

  useEffect(() => {
    if (selectedOption) {
      setSelected(selectedOption);
      return;
    }
    setSelected(undefined);
  }, [selectedOption]);

  const handleOptionClick = (option: OptionDropdownType) => {
    onChange && onChange(option);
    setSelected(option);
  };

  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setSearchInput('');
      }, 200);
    }
  }, [isOpen]);

  const filteredOptions =
    options &&
    options.filter((option) =>
      option.label
        ? option.label.toLowerCase().includes(searchInput.toLowerCase())
        : ' ',
    );

  return (
    <div className="flex flex-col w-full h-full">
      {label && (
        <label className={`text-sm ${labelTextClass}`}>
          {label}
          {required && <span className="text-error align-super">*</span>}
        </label>
      )}
      <Listbox value={selected} onChange={setSelected} disabled={disabled}>
        {({ open }) => {
          setIsOpen(open);
          return (
            <>
              <div className={`relative h-full ${label ? 'mt-1' : ''}`}>
                <ListboxButton
                  style={styleClass}
                  className={`relative  w-full cursor-default leading-5.5 !text-center rounded bg-white py-2.5 text-gray-900 shadow-sm border text-base focus-visible:!outline-none focus-visible:!shadow-none ${disabled && 'opacity-55'} ${errorClasses}  ${openByDefault ? 'flex justify-center items-center pr-0 pl-0' : 'pl-3.5 pr-10'} ${className}`}>
                  <span
                    className={`flex items-center ${!openByDefault && 'pr-3'}  ${classActive}`}>
                    {selected ? (
                      <>
                        {selected.imgUrl && (
                          <ImageRound
                            src={selected.imgUrl}
                            name="Image selected option"
                            className={`w-4 h-4 ${imgClassname}`}
                          />
                        )}
                        {selected.imgComponent && (
                          <div className="w-8">{selected.imgComponent}</div>
                        )}
                        <span
                          className={`${selected.imgUrl && 'ml-3'} ${selected.imgComponent && 'ml-2'} block truncate ${labelClass} ${classActive} `}>
                          {selected.label}
                        </span>
                      </>
                    ) : (
                      <span
                        className={`block truncate text-gray-300 ${labelClass} ${placeholderClass}`}>
                        {placeholder || <div className="h-[22px]"></div>}
                      </span>
                    )}
                  </span>
                  {!openByDefault && isShowIconDrop && (
                    <span
                      className={`pointer-events-none absolute inset-y-0 right-0 ml-3 flex items-center pr-2 ${classActive}`}>
                      <Image
                        alt="Arrow dropdown icon"
                        src={'/icons/arrow-down.svg'}
                        width={16}
                        height={16}
                        className={isOpen ? 'rotate-180' : 'rotate-0'}
                      />
                    </span>
                  )}
                </ListboxButton>
                <Transition
                  show={open}
                  as={Fragment}
                  leave="transition ease-in duration-100"
                  leaveFrom="opacity-100"
                  leaveTo="opacity-0">
                  <ListboxOptions
                    className={`absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded bg-white text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none ${classNameOption}`}>
                    {searchOption && (
                      <div className="flex gap-2 items-center ">
                        <div className="w-full">
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
                            name="icon add"
                            onClick={() => {
                              onAdd && onAdd(searchInput);
                            }}
                          />
                        )}
                      </div>
                    )}
                    {isLoading ? (
                      <Spinner
                        className="!h-fit py-3"
                        iconClassName="h-6 w-6"
                      />
                    ) : filteredOptions?.length ? (
                      filteredOptions.map((option) => (
                        <ListboxOption
                          key={option.value}
                          style={styleClassOption}
                          className={({ focus }) =>
                            `relative ${openByDefault && priorityStyles.find((item) => item.label === option.value)?.color} cursor-default border-b-[1px] border-[#EBF1F7] select-none ${!openByDefault && 'pl-3 pr-5'} py-2 hover:cursor-pointer ${focus ? 'bg-slate-50' : 'text-gray-900'} ${labelOptionClass} overflow-x-hidden`
                          }
                          value={option}
                          onClick={() => handleOptionClick(option)}
                          disabled={disableItems.includes(String(option.value))}>
                          {() => (
                            <>
                              <div
                                className={`flex  items-center w-full ${classTextOption}`}>
                                {option.imgUrl && (
                                  <ImageRound
                                    src={option.imgUrl}
                                    name="Image option"
                                    className="!w-4 !h-4"
                                  />
                                )}
                                {option.imgComponent && (
                                  <div className="w-4 mr-3">
                                    {option.imgComponent}
                                  </div>
                                )}
                                {isStatusDropdown && (
                                  <div
                                    className={`${statusStyles.find((item) => item.label == option.label)?.color} w-3 h-3 ml-2 rounded-full`}
                                  />
                                )}
                                <p
                                  className={` ${!openByDefault ? 'ml-1' : 'text-center w-full'} ${!isStatusDropdown && selected?.value == option.value ? 'text-blue-500' : ''} ${labelOptionClass} ${isStatusDropdown && '!text-left ml-2 !w-[50px]'} w-[100%] break-words ${disableItems.includes(String(option.value)) && 'text-gray-300 hover:cursor-not-allowed'}`}>
                                  {option.label}
                                </p>
                                {isStatusDropdown && (
                                  <p className="w-[40px] text-[#A7B7C2]">
                                    {selected?.value === option.value &&
                                      '選択中'}
                                  </p>
                                )}
                              </div>
                            </>
                          )}
                        </ListboxOption>
                      ))
                    ) : (
                      <ListboxOption
                        as="div"
                        key="no-data"
                        value={undefined}
                        onClick={(e) => e.preventDefault()}
                        className={`block py-2 pl-6 pr-6 text-sm text-black w-full text-left border-none opacity-80 hover:cursor-not-allowed ${classNameTextData}`}>
                        <div className="flex items-center justify-start">
                          <p>{NO_DATA_AVAILABLE}</p>
                        </div>
                      </ListboxOption>
                    )}
                  </ListboxOptions>
                </Transition>
              </div>
            </>
          );
        }}
      </Listbox>
      {error && (
        <ErrorMessage error={error} className={`my-[6px] ${classNameError}`} />
      )}
    </div>
  );
};

export default Dropdown;
