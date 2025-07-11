'use client';
import { useEffect, useState } from 'react';

export type CustomStatisticUserCheckboxProps = {
  id?: string;
  className?: string;
  label?: string;
  description?: string;
  isChecked?: boolean;
  classSize?: string;
  classLabel?: string;
  descriptionInline?: boolean;
  checkboxOnRight?: boolean;
  color: string;
  disable?: boolean;
  boxLabelClass?: string;
  onChange?: (selectedValues: boolean) => void;
};

const CustomStatisticUserCheckbox = ({
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
  boxLabelClass,
  color = '#0068B6',
  onChange,
  ...props
}: CustomStatisticUserCheckboxProps) => {
  const [checked, setChecked] = useState(isChecked);

  useEffect(() => {
    setChecked(isChecked);
    const checkbox = document.getElementById(id || '');
    if (checkbox instanceof HTMLInputElement) {
      checkbox.style.backgroundColor = isChecked ? color : '#fff';
      checkbox.style.backgroundImage = isChecked
        ? "url('/icons/check.svg')"
        : 'none';
      checkbox.style.backgroundSize = '10px 10px';
      checkbox.style.backgroundRepeat = 'no-repeat';
      checkbox.style.backgroundPosition = 'center';
    }
  }, [isChecked, color, id]);

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
          className={`h-4 w-4 rounded border-gray-300 focus:outline-none focus:shadow-sm focus:border-focus focus:ring-0 focus:ring-offset-0 ${disable && 'cursor-not-allowed'} ${classSize}`}
          checked={checked}
          disabled={disable}
          onChange={handleChange}
          {...props}
        />
      </div>
      <div
        className={`${checkboxOnRight ? '' : 'ml-3'} text-sm leading-6 flex ${descriptionInline ? 'flex-row' : 'flex-col'} ${boxLabelClass}`}>
        <label
          htmlFor={id}
          className={`font-medium text-gray-900  ${classLabel}`}>
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

export default CustomStatisticUserCheckbox;
