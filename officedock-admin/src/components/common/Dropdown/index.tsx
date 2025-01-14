import { Fragment, ReactNode, useEffect, useState } from 'react';
import {
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
  Transition,
} from '@headlessui/react';
import Image from 'next/image';

import ErrorMessage from '../ErrorMessage';
import InputSearch from '../InputSearch';
import ImageRound from '../ImageRound';

import { OptionDropdownType } from '@interfaces/common';

type Props = {
  label?: ReactNode;
  options: OptionDropdownType[];
  selectedOption?: OptionDropdownType;
  error?: ReactNode;
  required?: boolean;
  className?: string;
  classNameOption?: string;
  placeholder?: string;
  searchOption?: boolean;
  disabled?: boolean;
  onChange?: (value: OptionDropdownType) => void;
};

const Dropdown = ({
  label,
  required,
  error,
  options,
  placeholder,
  className,
  classNameOption,
  selectedOption,
  searchOption = false,
  disabled = false,
  onChange,
}: Props) => {
  const [selected, setSelected] = useState<OptionDropdownType | undefined>(
    selectedOption ? selectedOption : undefined,
  );
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [searchInput, setSearchInput] = useState<string>('');
  const errorClasses = error ? 'border-danger' : 'border-gray-200';

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

  const filteredOptions = options.filter((option) =>
    option.label.toLowerCase().includes(searchInput.toLowerCase()),
  );

  return (
    <div className="flex flex-col w-full">
      {label && (
        <label className={`text-sm`}>
          {label}
          {required && <span className="text-error align-super">*</span>}
        </label>
      )}
      <Listbox value={selected} onChange={setSelected} disabled={disabled}>
        {({ open }) => {
          setIsOpen(open);
          return (
            <>
              <div className={`relative ${label ? 'mt-1' : ''}`}>
                <ListboxButton
                  className={`relative w-full cursor-default leading-5.5 rounded-md bg-white py-2.5 pl-3.5 pr-10 text-left text-gray-900 shadow-sm border text-base focus-visible:!outline-none focus-visible:!shadow-none ${errorClasses} ${className}`}>
                  <span className="flex items-center">
                    {selected ? (
                      <>
                        {selected.imgUrl && (
                          <ImageRound
                            src={selected.imgUrl}
                            name="Image selected option"
                            className="w-4 h-4"
                          />
                        )}
                        <span
                          className={`${selected.imgUrl && 'ml-3'} block truncate`}>
                          {selected.label}
                        </span>
                      </>
                    ) : (
                      <span className="block truncate text-gray-300">
                        {placeholder || <div className="h-[22px]"></div>}
                      </span>
                    )}
                  </span>
                  <span className="pointer-events-none absolute inset-y-0 right-0 ml-3 flex items-center pr-2">
                    <Image
                      alt="Arrow dropdown icon"
                      src={'/icons/arrow-down.svg'}
                      width={16}
                      height={16}
                      className={isOpen ? 'rotate-180' : 'rotate-0'}
                    />
                  </span>
                </ListboxButton>

                <Transition
                  show={open}
                  as={Fragment}
                  leave="transition ease-in duration-100"
                  leaveFrom="opacity-100"
                  leaveTo="opacity-0">
                  <ListboxOptions
                    className={`absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-md bg-white text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none ${classNameOption}`}>
                    {searchOption && (
                      <InputSearch
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        inputClassName="!rounded-none"
                        className="px-2"
                      />
                    )}
                    {filteredOptions?.length ? (
                      filteredOptions.map((option) => (
                        <ListboxOption
                          key={option.value}
                          className={({ focus }) =>
                            `relative cursor-default select-none py-2 pl-3 pr-9 hover:cursor-pointer ${focus ? 'bg-slate-50' : 'text-gray-900'}`
                          }
                          value={option}
                          onClick={() => handleOptionClick(option)}>
                          {() => (
                            <>
                              <div className="flex items-center">
                                {option.imgUrl && (
                                  <ImageRound
                                    src={option.imgUrl}
                                    name="Image option"
                                    className="!w-4 !h-4"
                                  />
                                )}
                                <span
                                  className={`ml-3 block truncate ${selected?.value === option.value ? 'text-blue-500' : ''}`}>
                                  {option.label}
                                </span>
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
                        className={`block py-2 pl-6 pr-6 text-sm text-black w-full text-left border-none opacity-80 hover:cursor-not-allowed`}>
                        <div className="flex items-center justify-start">
                          <p>データが見つかりません</p>
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
      {error && <ErrorMessage error={error} className="mt-[6px]" />}
    </div>
  );
};

export default Dropdown;
