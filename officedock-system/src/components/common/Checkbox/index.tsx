'use client';
import { useEffect, useState } from 'react';

export type CheckboxProps = {
  id?: string;
  className?: string;
  label?: string;
  description?: string;
  isChecked?: boolean;
  classSize?: string;
  classLabel?: string;
  descriptionInline?: boolean;
  checkboxOnRight?: boolean;
  disable?: boolean;
  boxLabelClass?: string;
  isPreventClick?: boolean;
  onChange?: (selectedValues: boolean) => void;
};

const Checkbox = ({
  id,
  className,
  label,
  classSize,
  classLabel,
  description,
  isChecked = false,
  descriptionInline = false,
  checkboxOnRight = false,
  disable = false,
  isPreventClick = false,
  boxLabelClass,
  onChange,
  ...props
}: CheckboxProps) => {
  const [checked, setChecked] = useState(isChecked);

  useEffect(() => {
    setChecked(isChecked);
  }, [isChecked]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const isChecked = event.target.checked;
    setChecked(isChecked);
    onChange?.(isChecked);
  };

  return (
    <div
      className={`relative flex items-start w-full ${checkboxOnRight && 'flex-row-reverse justify-between'} ${className}`}>
      <div className="flex h-6 items-center">
        <input
          id={id}
          aria-describedby={`${id}-description`}
          name={id}
          type="checkbox"
          className={`h-4 w-4 cursor-pointer rounded !border-[#77858F] checked:border-none ${disable && 'opacity-50'} focus:outline-none focus:shadow-sm focus:border-focus focus:ring-0 focus:ring-offset-0 ${classSize}`}
          checked={checked}
          disabled={disable}
          onChange={handleChange}
          onClick={(e) => {
            if (isPreventClick) {
              e.stopPropagation();
            }
          }}
          {...props}
        />
      </div>
      <div
        className={`${checkboxOnRight ? '' : 'ml-3'} text-sm leading-6 flex ${descriptionInline ? 'flex-row' : 'flex-col'} ${boxLabelClass}`}>
        <label
          htmlFor={id}
          className={`font-medium text-black hover:cursor-pointer ${classLabel}`}>
          {label}
        </label>
        <p
          id={`${id}-description`}
          className={`text-gray-500 ${descriptionInline && 'ml-1'}`}>
          {description}
        </p>
      </div>
    </div>
  );
};

export default Checkbox;
