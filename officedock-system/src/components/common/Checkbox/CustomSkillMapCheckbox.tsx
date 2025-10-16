'use client';

import { ChangeEventHandler, MouseEventHandler } from "react";

export type CustomSkillMapCheckboxProps = {
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
  onChange?: ChangeEventHandler<HTMLInputElement> | undefined
  onClick?: MouseEventHandler<HTMLInputElement> | undefined
};

const CustomSkillMapCheckbox = ({
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
  onChange,
  onClick,
  ...props
}: CustomSkillMapCheckboxProps) => {
  return (
    <div
      className={`relative flex items-start w-full ${checkboxOnRight && 'flex-row-reverse justify-between'} ${className}`}>
      <div className="flex h-6 items-center">
        <input
          id={id}
          aria-describedby={`${id}-description`}
          name={id}
          type="checkbox"
          className={`h-4 w-4 rounded !border-[#77858F] checked:border-none focus:outline-none focus:shadow-sm focus:border-none focus:ring-0 focus:ring-offset-0 ${classSize}`}
          checked={isChecked}
          disabled={disable}
          onChange={onChange}
          onClick={onClick}
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

export default CustomSkillMapCheckbox;
