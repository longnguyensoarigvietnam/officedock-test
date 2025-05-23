'use client';
import { useEffect, useRef, useState } from 'react';
import Select, { GroupBase, MultiValue, PropsValue } from 'react-select';
import makeAnimated from 'react-select/animated';

import { NO_OPTIONS } from '@constants';
import { MenuPlacementType } from '@constants/enums';

import './styles/multiselect.css';

export type MultiSelectProps = {
  closeMenuOnSelect?: boolean;
  options?: readonly (
    | { value: number; label: string }
    | GroupBase<{ value: number; label: string }>
  )[];
  placeholder?: string;
  className?: string;
  defaultValue?:
    | PropsValue<{
        value: number;
        label: string;
      }>
    | undefined;
  onChange?: (
    selected: MultiValue<{
      value: number;
      label: string;
    }>,
  ) => void;
};

const MultiSelect = ({
  closeMenuOnSelect = false,
  options,
  placeholder = '選択してください',
  className,
  defaultValue,
  onChange,
}: MultiSelectProps) => {
  const animatedComponents = makeAnimated();
  const [menuIsOpen, setMenuIsOpen] = useState(false);
  const [menuPlacement, setMenuPlacement] = useState<MenuPlacementType>(
    MenuPlacementType.BOTTOM,
  );
  const selectRef = useRef<any>(null);

  useEffect(() => {
    if (!menuIsOpen || !selectRef.current) return;

    const rect = selectRef.current.controlRef.getBoundingClientRect();
    const viewportHeight = window.innerHeight;

    // Check if there is enough space below, otherwise open above
    setMenuPlacement(
      (options && options?.length > 0 && rect.bottom + 270 > viewportHeight) ||
        (options && options?.length == 0 && rect.bottom + 60 > viewportHeight)
        ? MenuPlacementType.TOP
        : MenuPlacementType.BOTTOM,
    );
  }, [menuIsOpen, options]);

  const style = {
    control: (base: any) => ({
      ...base,
      border: 'none',
      boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
      width: '100%',
      paddingY: '0',
      paddingX: '0',
    }),
    option: (base: any) => ({
      ...base,
      maxWidth: '100%',
      paddingY: '0',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
    }),
    multiValue: (base: any) => ({
      ...base,
      maxWidth: '300px',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
    }),
    multiValueLabel: (base: any) => ({
      ...base,
      maxWidth: '100%',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
    }),
  };

  useEffect(() => {
    const handleScroll = (e: Event) => {
      const menuElement = document.querySelector('.css-1nmdiq5-menu');
      if (
        menuIsOpen &&
        menuElement &&
        !menuElement.contains(e.target as Node)
      ) {
        setMenuIsOpen(false);
      }
    };
    document.addEventListener('scroll', handleScroll, true);
    return () => {
      document.removeEventListener('scroll', handleScroll, true);
    };
  }, [menuIsOpen]);

  return (
    <div className={`h-full w-full border custom-input shadow-sm ${className}`}>
      <Select
        ref={selectRef}
        closeMenuOnSelect={closeMenuOnSelect}
        noOptionsMessage={() => NO_OPTIONS}
        isMulti
        options={options}
        placeholder={placeholder}
        className={className}
        defaultValue={defaultValue}
        defaultMenuIsOpen={false}
        onChange={onChange}
        styles={style}
        isSearchable={true}
        isClearable={false}
        menuPortalTarget={document.body}
        filterOption={(option, inputValue) =>
          option.label.toLowerCase().includes(inputValue.toLowerCase())
        }
        components={{
          ...animatedComponents,
          DropdownIndicator: () => null,
          IndicatorSeparator: () => null,
        }}
        menuShouldScrollIntoView={false}
        menuIsOpen={menuIsOpen}
        onMenuOpen={() => setMenuIsOpen(true)}
        onMenuClose={() => setMenuIsOpen(false)}
        menuPlacement={menuPlacement}
      />
    </div>
  );
};

export default MultiSelect;
