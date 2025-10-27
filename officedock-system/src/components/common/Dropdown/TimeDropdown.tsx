'use client';
import {
  CSSProperties,
  Fragment,
  ReactNode,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
  Transition,
} from '@headlessui/react';

import ErrorMessage from '../ErrorMessage';
import ImageRound from '../ImageRound';
import Spinner from '../Spinner';

import { OptionDropdownType } from '@interfaces/common';

import { NO_DATA_AVAILABLE } from '@constants';
import { PriorityTask, StatusTask } from '@constants/enums';

import {
  findClosestTimeOption,
  getJapanMinutes,
  timeStringToMinutes,
} from '@utils/date';

type Props = {
  label?: ReactNode;
  options: OptionDropdownType[];
  selectedOption?: OptionDropdownType;
  error?: ReactNode;
  isLoading?: boolean;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  classNameOption?: string;
  classNameError?: string;
  classNameTextData?: string;
  placeholder?: string;
  searchOption?: boolean;
  openByDefault?: boolean;
  isShowIconDrop?: boolean;
  labelClass?: string;
  classActive?: string;
  labelOptionClass?: string;
  addInput?: boolean;
  styleClass?: CSSProperties;
  styleClassOption?: CSSProperties;
  isBottomOptions?: boolean;
  iconSrc?: string;
  valueInput: string | null | undefined;
  onChange?: (value: OptionDropdownType) => void;
  onAdd?: (value: string) => void;
};

const TimeDropdown = ({
  error,
  iconSrc,
  isLoading,
  options,
  valueInput,
  labelOptionClass,
  disabled = false,
  isBottomOptions = true,
  className,
  classNameOption,
  classNameError,
  classNameTextData,
  selectedOption,
  openByDefault,
  styleClass,
  styleClassOption,
  onChange,
}: Props) => {
  const [selected, setSelected] = useState<OptionDropdownType | undefined>(
    selectedOption ? selectedOption : undefined,
  );
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [searchInput, setSearchInput] = useState<string>('');
  const optionsRef = useRef<HTMLUListElement | null>(null);

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
      color: 'hover:bg-[#A3EBF0]',
    },
    {
      label: StatusTask.IN_PROGRESS,
      color: 'hover:bg-[#92E9AF]',
    },
    {
      label: StatusTask.CONFIRMING,
      color: 'hover:bg-[#FCCF79]',
    },
    {
      label: StatusTask.COMPLETED,
      color: 'hover:bg-[#F58383]',
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

  useEffect(() => {
    if (isOpen && valueInput) {
      const itemSelected = options.find((item) => item.value == valueInput);
      if (itemSelected) {
        setSelected(itemSelected);
      } else {
        setSelected(undefined);
      }
    }
  }, [isOpen, options, valueInput]);

  const filteredOptions =
    options &&
    options.filter((option) =>
      option.label
        ? option.label.toLowerCase().includes(searchInput.toLowerCase())
        : ' ',
    );

  useEffect(() => {
    if (!isOpen || !optionsRef.current) return;

    const parent = optionsRef.current;

    // Case 1: Selected exists → scroll to selected
    if (selected) {
      const el = parent.querySelector(
        `[data-value="${selected.value}"]`,
      ) as HTMLElement | null;

      if (el) {
        parent.scrollTop = el.offsetTop;
        return;
      }
    }

    let referenceMinutes: number;
    if (valueInput) {
      referenceMinutes = timeStringToMinutes(valueInput); // Case 2: No selected, but has valueInput → scroll nearest to valueInput
    } else {
      referenceMinutes = getJapanMinutes(); // Case 3: No selected, no valueInput → scroll nearest to current time
    }

    const closestOption = filteredOptions
      ? findClosestTimeOption(filteredOptions, referenceMinutes)
      : undefined;
    if (closestOption) {
      const el = parent.querySelector(
        `[data-value="${closestOption.value}"]`,
      ) as HTMLElement | null;
      if (el) {
        parent.scrollTop = el.offsetTop;
      }
    }
  }, [isOpen, selected, filteredOptions, valueInput]);

  return (
    <div className="flex flex-col w-full h-full">
      <Listbox value={selected} onChange={setSelected} disabled={disabled}>
        {({ open }) => {
          setIsOpen(open);
          return (
            <>
              <div className={`relative h-full`}>
                <ListboxButton
                  style={styleClass}
                  className={`  w-full h-full cursor-default leading-5.5 !text-center rounded bg-white text-gray-900  text-base focus-visible:!outline-none focus-visible:!shadow-none ${disabled && 'opacity-55'}  ${className}`}>
                  <ImageRound
                    className={`${iconSrc ? 'w-[22px] h-fit' : 'h-[14px] w-[15px]'} hover:cursor-pointer absolute top-[2px]`}
                    src={`/icons/${iconSrc ? iconSrc : 'clock-time'}.svg`}
                    name="Clock icon"
                  />
                </ListboxButton>
                <Transition
                  show={open}
                  as={Fragment}
                  leave="transition ease-in duration-100"
                  leaveFrom="opacity-100"
                  leaveTo="opacity-0">
                  <ListboxOptions
                    ref={optionsRef}
                    className={`absolute z-20 left-[-4px]  mt-1 max-h-56 w-full min-w-[65px] overflow-auto rounded bg-white text-xs shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none ${classNameOption} ${isBottomOptions ? 'top-6' : 'bottom-8'}`}>
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
                          data-value={option.value}
                          className={({ focus }) =>
                            `relative ${openByDefault && priorityStyles.find((item) => item.label === option.value)?.color} ${openByDefault && statusStyles.find((item) => item.label === option.label)?.color} cursor-default select-none  py-2 hover:cursor-pointer ${focus ? 'bg-slate-50' : 'text-gray-900'} ${labelOptionClass}`
                          }
                          value={option}
                          onClick={() => handleOptionClick(option)}>
                          {() => (
                            <>
                              <div className="flex items-center w-full">
                                {option.imgUrl && (
                                  <ImageRound
                                    src={option.imgUrl}
                                    name="Image option"
                                    className="!w-4 !h-4"
                                  />
                                )}
                                <span
                                  className={` ${!openByDefault ? 'ml-3' : 'text-center w-full'}  block truncate  ${selected?.value === option.value ? 'text-blue-500' : ''} ${labelOptionClass}`}>
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

export default TimeDropdown;
