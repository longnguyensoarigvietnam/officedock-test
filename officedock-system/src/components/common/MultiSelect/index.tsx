'use client';
import { useEffect, useRef, useState } from 'react';
import Select, {
  GroupBase,
  MultiValue,
  PropsValue,
  components,
} from 'react-select';
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

const CustomRemoveIcon = (props: any) => (
  <components.MultiValueRemove {...props}>
    {/* Your custom icon here */}
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="white"
      stroke="white"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  </components.MultiValueRemove>
);

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
      fontSize: '12px',
    }),
    multiValue: (base: any) => ({
      ...base,
      maxWidth: '300px',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
      backgroundColor: '#77858F',
      borderRadius: '20px',
      color: 'white',
      paddingLeft: '7px',
    }),
    multiValueLabel: (base: any) => ({
      ...base,
      maxWidth: '100px',
      fontSize: '12px',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
      color: 'white',
      fontWeight: '500'
    }),
    multiValueRemove: (base: any) => ({
      ...base,
      backgroundColor: 'transparent', // no background
      color: 'white', // keep icon color white
      ':hover': {
        backgroundColor: 'transparent', // prevent hover background
        color: 'white', // keep icon white on hover
        cursor: 'pointer',
      },
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
          MultiValueRemove: CustomRemoveIcon,
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
