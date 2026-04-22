'use client';

import { useState, ReactNode, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { UseFormRegisterReturn } from 'react-hook-form';

import ImageRound from '../ImageRound';

import { OptionDropdownType } from '@interfaces/common';

import { NO_DATA_AVAILABLE } from '@constants';

export type SelectionBoxProps = {
  label?: ReactNode;
  error?: ReactNode | ReactNode[];
  required?: boolean;
  requireText?: ReactNode;
  labelClassName?: string;
  className?: string;
  register?: UseFormRegisterReturn;
  options?: OptionDropdownType[];
  value?: OptionDropdownType[];
  onChange?: (value: OptionDropdownType[]) => void;
  placeholder?: string;
  disabled?: boolean;
  description?: ReactNode;
  customStyleClassName?: string;
  errorMessage?: string;
};

const MultiSectionBox = ({
  label,
  required,
  requireText,
  labelClassName,
  className,
  options = [],
  value,
  onChange,
  placeholder,
  description,
  customStyleClassName,
  errorMessage,
  disabled = false,
}: SelectionBoxProps) => {
  const [selectedValue, setSelectedValue] = useState<OptionDropdownType[]>(
    value || [],
  );
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [openUpward, setOpenUpward] = useState(false);

  const portalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node) &&
        portalRef.current &&
        !portalRef.current.contains(event.target as Node)
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
    setSelectedValue(value || []);
  }, [value]);

  const handleChange = (val: OptionDropdownType[]) => {
    setSelectedValue(val);
    onChange && onChange(val);
  };

  const handleCheckboxChange = (option: OptionDropdownType) => {
    const newValue = [...selectedValue];
    const existingIndex = newValue.findIndex((v) => v.value == option.value);
    if (existingIndex !== -1) {
      newValue.splice(existingIndex, 1);
    } else {
      newValue.push(option);
    }
    handleChange(newValue);
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

      <div className="flex-1 mt-1 text-[#333333] relative mx-[14px]">
        <div className="relative" ref={wrapperRef}>
          <div
            className={`w-full h-[45px] border-b-[1px] border-[#D2DBE1] cursor-pointer flex items-center gap-2 overflow-x-auto whitespace-nowrap ${customStyleClassName}`}
            onClick={() => {
              const rect = wrapperRef.current?.getBoundingClientRect();
              if (rect) {
                const dropdownHeight = 170; // same as max-h-[170px]
                const spaceBelow = window.innerHeight - rect.bottom;

                setOpenUpward(spaceBelow < dropdownHeight);
              }
              setOpen((prev) => !prev);
            }}>
            <ImageRound
              src={`/icons/add-template.svg`}
              name="Add"
              className="!w-[18px] !h-[18px]"
            />
            {selectedValue.length === 0 ? (
              <span className="text-gray-400">{placeholder}</span>
            ) : (
              selectedValue.map((val) => (
                <div
                  className="flex items-center gap-[6px] bg-[#77858F] px-[10px] py-[6px] rounded-[20px] flex-shrink-0"
                  key={val.value}>
                  <p className="leading-[1] text-white text-xs">{val.label}</p>
                  <ImageRound
                    className="w-2 h-2 hover:cursor-pointer"
                    src="/icons/close-white.svg"
                    name="Close icon"
                    onClick={() => handleCheckboxChange(val)}
                  />
                </div>
              ))
            )}
          </div>
          {open &&
            createPortal(<div className="fixed inset-0 z-40" />, document.body)}
          {open &&
            createPortal(
              <div
                ref={portalRef}
                className="absolute z-50 w-[200px] border rounded-md bg-white shadow p-2 max-h-[170px] overflow-y-auto custom-scrollbar"
                style={{
                  top: wrapperRef.current
                    ? openUpward
                      ? wrapperRef.current.getBoundingClientRect().top +
                        window.scrollY -
                        (options.length > 0 ? 170 : 0) // dropdown height
                      : wrapperRef.current.getBoundingClientRect().bottom +
                        window.scrollY
                    : 0,
                  left: wrapperRef.current
                    ? wrapperRef.current.getBoundingClientRect().left +
                      window.scrollX
                    : 0,
                  width: wrapperRef.current
                    ? wrapperRef.current.getBoundingClientRect().width
                    : 'auto',
                }}>
                {options.length ? (
                  options.map((opt) => {
                    const isSelected = selectedValue.some(
                      (v) => v.value == opt.value,
                    );
                    return (
                      <div
                        key={opt.value}
                        className={`flex items-center gap-3 px-2 py-2 rounded ${
                          disabled
                            ? 'cursor-not-allowed'
                            : 'cursor-pointer hover:bg-[#f8fafc]'
                        }`}
                        onClick={() => {
                          if (!(disabled && !isSelected)) {
                            handleCheckboxChange({
                              label: opt.label,
                              value: opt.value.toString(),
                            });
                          }
                        }}>
                        <span
                          className={`text-sm break-words max-w-full ${isSelected ? 'text-blue-500' : ''}`}>
                          {opt.label}
                        </span>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-xs text-center text-gray-700">
                    {NO_DATA_AVAILABLE}
                  </p>
                )}
              </div>,
              document.body,
            )}
        </div>

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

export default MultiSectionBox;
