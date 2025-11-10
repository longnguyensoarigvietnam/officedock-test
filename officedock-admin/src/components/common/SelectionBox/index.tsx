'use client';

import { useState, ReactNode, useRef, useEffect } from 'react';
import { UseFormRegisterReturn } from 'react-hook-form';
import Image from 'next/image';

import Checkbox from '../Checkbox';

import { NAME_OTHER_OPTION, OTHER_OPTION_VALUE } from '@constants';
import { SelectionBoxType } from '@constants/enums';

import { OptionDropdownType } from '@interfaces/common';

export type SelectionBoxProps = {
  label?: ReactNode;
  type?: SelectionBoxType;
  error?: ReactNode | ReactNode[];
  required?: boolean;
  requireText?: ReactNode;
  labelClassName?: string;
  className?: string;
  register?: UseFormRegisterReturn;
  options?: OptionDropdownType[];
  value?: string | string[];
  onChange?: (value: string | string[]) => void;
  onOtherTextChange?: (other: string) => void;
  placeholder?: string;
  disabled?: boolean;
  description?: ReactNode;
  customStyleClassName?: string;
  errorMessage?: string;
  initialValue?: string;
};

const SelectionBox = ({
  label,
  type = SelectionBoxType.MONO_SELECT,
  required,
  requireText,
  labelClassName,
  className,
  options = [],
  value,
  onChange,
  onOtherTextChange,
  placeholder,
  description,
  customStyleClassName,
  errorMessage,
  disabled = false,
  initialValue,
}: SelectionBoxProps) => {
  const [selectedValue, setSelectedValue] = useState<string | string[]>(
    value || (type === SelectionBoxType.MULTIPLE_SELECT ? [] : ''),
  );
  const [otherValue, setOtherValue] = useState<string>('');
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    setSelectedValue(
      value || (type === SelectionBoxType.MULTIPLE_SELECT ? [] : ''),
    );
  }, [value, type]);

  // Handle otherValue initialization and updates
  useEffect(() => {
    const otherOption = options.find((opt) =>
      opt.label.includes(NAME_OTHER_OPTION),
    );

    // Check if OTHER_OPTION_VALUE is selected
    const isOtherSelected = Array.isArray(selectedValue)
      ? selectedValue.includes(OTHER_OPTION_VALUE)
      : selectedValue === OTHER_OPTION_VALUE;

    if (isOtherSelected && otherOption?.other && otherValue === '') {
      setOtherValue(initialValue || '');
    }
  }, [value, options, selectedValue, initialValue]);

  const handleChange = (val: string | string[]) => {
    setSelectedValue(val);
    onChange && onChange(val);
  };

  const handleCheckboxChange = (val: string) => {
    let newValue = Array.isArray(selectedValue) ? [...selectedValue] : [];
    if (newValue.includes(val)) {
      newValue = newValue.filter((value) => value !== val);
    } else {
      newValue.push(val);
    }
    handleChange(newValue);
  };

  const getDisplayLabel = (val: string | string[]) => {
    if (Array.isArray(val)) {
      if (val.length === 0) return placeholder;

      const labels = val.map((value) => {
        if (value === OTHER_OPTION_VALUE) {
          return otherValue;
        }
        const option = options.find((opt) => opt.value.toString() === value);
        return option?.label || value;
      });

      if (val.length === 1) return labels[0];

      return (
        <span className="flex items-center">
          {labels[0]}{' '}
          <span
            className="ml-1 text-[#9C9C9C]"
            style={{
              fontFamily: 'Noto Sans JP',
              fontWeight: 400,
              fontStyle: 'normal',
              fontSize: '12px',
              lineHeight: '100%',
              letterSpacing: '0%',
            }}>
            (+{labels.length - 1})
          </span>
        </span>
      );
    } else if (val) {
      if (val === OTHER_OPTION_VALUE) {
        return otherValue;
      }
      const option = options.find((opt) => opt.value.toString() === val);
      return option?.label || val;
    }
    return placeholder;
  };

  return (
    <div className={`flex flex-col w-full text-[14px] ${className || ''}`}>
      {label && (
        <label className={`text-sm ${labelClassName}`}>
          {label}
          {required && <span className="text-error font-bold">*</span>}
          {requireText && (
            <span className="text-error italic text-xs">{requireText}</span>
          )}
        </label>
      )}

      <div className="flex-1 mt-1 text-[#333333] relative">
        {/* MONO SELECT */}
        {type === SelectionBoxType.MONO_SELECT && (
          <div className="relative" ref={wrapperRef}>
            <div
              className={`w-full h-[45px] pl-4 pr-2 border rounded-md cursor-pointer flex justify-between items-center ${customStyleClassName}`}
              onClick={() => setOpen((prev) => !prev)}>
              <span className="text-base text-gray-900">
                {getDisplayLabel(selectedValue) || placeholder}
              </span>
              <div className="ml-4">
                <Image
                  alt="Arrow dropdown icon"
                  src={'/icons/arrow-down.svg'}
                  width={16}
                  height={16}
                  className={open ? 'rotate-180' : 'rotate-0'}
                />
              </div>
            </div>

            {open && (
              <div className="absolute z-10 mt-1 w-full border rounded-md bg-white shadow p-2 max-h-[170px] overflow-y-auto custom-scrollbar">
                {options
                  .filter((opt) => !opt.label.includes(NAME_OTHER_OPTION))
                  .map((opt) => {
                    const isSelected = selectedValue === opt.value.toString();
                    return (
                      <div
                        key={opt.value}
                        className={`px-2 py-2 cursor-pointer text-base rounded hover:bg-[#f8fafc] ${
                          isSelected ? 'text-blue-500' : ''
                        }`}
                        onClick={() => {
                          setOtherValue('');
                          handleChange(opt.value.toString());
                          setOpen(false);
                        }}>
                        {opt.label}
                      </div>
                    );
                  })}
                {/* OTHER */}
                {options.some((opt) =>
                  opt.label.includes(NAME_OTHER_OPTION),
                ) && (
                  <div
                    className={`group flex items-center gap-2 pl-2 py-1 ${
                      selectedValue && selectedValue === OTHER_OPTION_VALUE
                        ? 'text-blue-500'
                        : 'hover:bg-[#f8fafc]'
                    }`}
                    onClick={() => {
                      handleChange(OTHER_OPTION_VALUE);
                      setOpen(false);
                    }}>
                    <p className="text-base">
                      {
                        options.find((opt) =>
                          opt.label.includes(NAME_OTHER_OPTION),
                        )?.label
                      }
                    </p>
                    <input
                      type="text"
                      placeholder="入力してください"
                      value={otherValue}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => {
                        const val = e.target.value;
                        setOtherValue(val);

                        // Let the parent component handle the logic through onOtherTextChange callback
                        onOtherTextChange && onOtherTextChange(val);
                      }}
                      className={`w-[calc(100%_-_120px)] py-2 text-base ${
                        selectedValue && selectedValue === (otherValue || '')
                          ? 'bg-[#F0F9F8] group-hover:bg-[#f8fafc]'
                          : 'group-hover:bg-[#f8fafc]'
                      } border-0 border-b-[1px] placeholder-[#B6C9C8] focus:outline-none focus:ring-0 focus:border-primary caret-primary cursor-pointer`}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* MULTI SELECT */}
        {type === SelectionBoxType.MULTIPLE_SELECT && (
          <div className="relative" ref={wrapperRef}>
            <div
              className={`w-full h-[45px] pl-4 pr-2 border rounded-md cursor-pointer flex justify-between items-center bg-white ${customStyleClassName}`}
              onClick={() => setOpen((prev) => !prev)}>
              <span className="text-base text-gray-900">
                {getDisplayLabel(selectedValue)}
              </span>
              <Image
                alt="Arrow dropdown icon"
                src={'/icons/arrow-down.svg'}
                width={16}
                height={16}
                className={open ? 'rotate-180' : 'rotate-0'}
              />
            </div>

            {open && (
              <div className="absolute z-10 mt-1 w-full border rounded-md bg-white shadow p-2 max-h-[170px] overflow-y-auto custom-scrollbar">
                {/* Normal options */}
                {options
                  .filter((opt) => !opt.label.includes(NAME_OTHER_OPTION))
                  .map((opt) => {
                    const isChecked =
                      Array.isArray(selectedValue) &&
                      selectedValue.includes(opt.value.toString());
                    return (
                      <div
                        key={opt.value}
                        className={`flex items-center gap-3 px-2 py-2 rounded ${disabled ? 'cursor-not-allowed' : 'cursor-pointer hover:bg-[#f8fafc]'}`}
                        onClick={() => {
                          if (
                            !(
                              disabled &&
                              !selectedValue.includes(opt.value.toString())
                            )
                          ) {
                            handleCheckboxChange(opt.value.toString());
                          }
                        }}>
                        <Checkbox
                          className="!w-[12px]"
                          isChecked={isChecked}
                          disable={
                            disabled &&
                            !selectedValue.includes(opt.value.toString())
                          }
                        />

                        <span
                          className={`text-base ${isChecked ? 'text-blue-500' : ''}`}>
                          {opt.label}
                        </span>
                      </div>
                    );
                  })}

                {/* OTHER */}
                {options.some((opt) =>
                  opt.label.includes(NAME_OTHER_OPTION),
                ) && (
                  <div
                    className={`flex items-center gap-2 px-2 py-2 hover:cursor-pointer hover:bg-[#f8fafc] ${
                      Array.isArray(selectedValue) &&
                      selectedValue.includes(OTHER_OPTION_VALUE)
                        ? 'text-blue-500'
                        : ''
                    }`}>
                    <div
                      className="flex items-center gap-2 cursor-pointer"
                      onClick={() => {
                        if (
                          Array.isArray(selectedValue) &&
                          selectedValue.includes(OTHER_OPTION_VALUE)
                        ) {
                          setOtherValue('');
                        }
                        handleCheckboxChange(OTHER_OPTION_VALUE);
                      }}>
                      <Checkbox
                        className="!w-[12px]"
                        isChecked={
                          Array.isArray(selectedValue) &&
                          selectedValue.includes(OTHER_OPTION_VALUE)
                        }
                        onChange={(state) => {
                          if (!state) {
                            setOtherValue('');
                          }
                        }}
                      />
                      <span className={`text-base `}>
                        {
                          options.find((opt) =>
                            opt.label.includes(NAME_OTHER_OPTION),
                          )?.label
                        }
                      </span>
                    </div>
                    <input
                      type="text"
                      placeholder="入力してください"
                      value={otherValue}
                      onChange={(e) => {
                        const val = e.target.value;
                        setOtherValue(val);

                        // Let the parent component handle the array logic through onOtherTextChange callback
                        if (Array.isArray(selectedValue)) {
                          // Only notify parent about otherText change
                          onOtherTextChange && onOtherTextChange(val);
                        } else {
                          // For single select, handle the logic here
                          if (val.trim()) {
                            handleChange(OTHER_OPTION_VALUE);
                          } else {
                            handleChange('');
                          }
                          onOtherTextChange && onOtherTextChange(val);
                        }
                      }}
                      className={`w-[calc(100%_-_150px)] px-2 py-2 text-sm border-0 border-b-[1px] placeholder-[#B6C9C8] focus:outline-none focus:ring-0 focus:border-primary caret-primary cursor-pointer`}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {description && (
          <p className="text-xs text-blue-500 mt-1">{description}</p>
        )}
        {errorMessage && (
          <p className="md:text-[12px] text-[11px] tracking-[0.88px] text-[#F3608A] mt-1">
            {errorMessage}
          </p>
        )}
      </div>
    </div>
  );
};

export default SelectionBox;
