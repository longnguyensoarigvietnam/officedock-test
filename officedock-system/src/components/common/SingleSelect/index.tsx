import React, { useEffect, useRef, useState } from 'react';
import Select, { PropsValue, SingleValue } from 'react-select';
import makeAnimated from 'react-select/animated';
import Image from 'next/image';

import { NO_OPTIONS_CUSTOM } from '@constants';
import { MenuPlacementType } from '@constants/enums';

import { OptionDropdownType } from '@interfaces/common';

import './styles/singleSelect.css';

export type SingleSelectProps = {
  closeMenuOnSelect?: boolean;
  options?: OptionDropdownType[];
  placeholder?: string;
  className?: string;
  isDisabled?: boolean;
  defaultValue?:
    | PropsValue<{
        value: number | string;
        label: string;
      }>
    | undefined;
  onChange?: (
    selected: SingleValue<{
      value: number | string;
      label: string;
    }>,
  ) => void;
  showArrow?: boolean;
  forceMenuPlacementBottom?: boolean;
};

const SingleSelect = ({
  isDisabled = false,
  closeMenuOnSelect = false,
  options,
  placeholder = '選択してください',
  className,
  defaultValue,
  onChange,
  showArrow = false,
  forceMenuPlacementBottom = false,
}: SingleSelectProps) => {
  const animatedComponents = makeAnimated();
  const [menuIsOpen, setMenuIsOpen] = useState(false);
  const [menuPlacement, setMenuPlacement] = useState<MenuPlacementType>(
    MenuPlacementType.BOTTOM,
  );
  const selectRef = useRef<any>(null);
  const optionRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!menuIsOpen || !selectRef.current || forceMenuPlacementBottom) return;

    const rect = selectRef.current.controlRef.getBoundingClientRect();
    const viewportHeight = window.innerHeight;

    // Check if there is enough space below, otherwise open above
    setMenuPlacement(
      rect.bottom + 100 > viewportHeight
        ? MenuPlacementType.TOP
        : MenuPlacementType.BOTTOM,
    );
  }, [forceMenuPlacementBottom, menuIsOpen]);

  const handleChange = (selectedOption: any) => {
    if (onChange) onChange(selectedOption);
    setMenuIsOpen(false);
  };
  useEffect(() => {
    const handleClickOutside = (event: any) => {
      if (optionRef.current && !optionRef.current.contains(event.target)) {
        setMenuIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div ref={optionRef} className={`h-full w-full relative ${className}`}>
      <Select
        ref={selectRef}
        closeMenuOnSelect={closeMenuOnSelect}
        noOptionsMessage={() => (
          <div className="text-xs">{NO_OPTIONS_CUSTOM}</div>
        )}
        options={options}
        isDisabled={isDisabled}
        placeholder={placeholder}
        className={`${className} border-[1px] rounded-md !disabled:bg-white`}
        defaultValue={defaultValue}
        onChange={handleChange}
        styles={{
          control: (base: any) => ({
            ...base,
            border: 'none',
            boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
            width: '100%',
            paddingY: '0',
            paddingX: '0',
          }),
          placeholder: (base: any) => ({
            ...base,
            maxWidth: 'calc(100% - 20px)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }),
          option: (base: any, state: any) => {
            return {
              ...base,
              maxWidth: '100%',
              paddingY: '0',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              backgroundColor: state.isFocused ? '#f8fafc' : 'transparent',
              '&:active': {
                backgroundColor: state.isFocused && 'transparent',
              },
              color: state.isSelected && '#111827',
              cursor: 'pointer',
            };
          },
          menu: (base) => ({
            ...base,
            zIndex: 50,
          }),
        }}
        isSearchable={true}
        isClearable={false}
        menuPortalTarget={document.body}
        components={{
          ...animatedComponents,
          DropdownIndicator: () => null,
          IndicatorSeparator: () => null,
        }}
        filterOption={(option, inputValue) =>
          option.label.toLowerCase().includes(inputValue.toLowerCase())
        }
        menuShouldScrollIntoView={false}
        menuIsOpen={menuIsOpen}
        onMenuOpen={() => setMenuIsOpen(true)}
        onMenuClose={() => setMenuIsOpen(false)}
        menuPlacement={
          forceMenuPlacementBottom ? MenuPlacementType.BOTTOM : menuPlacement
        }
      />
      {showArrow && !isDisabled && (
        <div
          onClick={() => setMenuIsOpen(!menuIsOpen)}
          className="absolute top-1/2 -translate-y-1/2 right-1">
          <Image
            alt="Arrow dropdown icon"
            src={'/icons/arrow-down.svg'}
            width={16}
            height={16}
            className={menuIsOpen ? 'rotate-180' : 'rotate-0'}
          />
        </div>
      )}
    </div>
  );
};

export default SingleSelect;
