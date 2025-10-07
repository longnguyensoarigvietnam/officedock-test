'use client';
import { RadioGroup, Label, Description, Radio } from '@headlessui/react';
import { OptionRadioButtonType } from '@interfaces/common';

export type SingleRadioButtonProps = {
  option: OptionRadioButtonType;
  checked?: boolean;
  className?: string;
  descriptionInline?: boolean;
  buttonOnRight?: boolean;
  hiddenTitle?: boolean;
  disabled?: boolean;
  onChange?: (value: string | number) => void;
};

const RadioButtonSingle = ({
  option,
  checked = false,
  className,
  descriptionInline,
  buttonOnRight,
  hiddenTitle = false,
  disabled = false,
  onChange,
}: SingleRadioButtonProps) => {
  const handleChange = () => {
    if (disabled) return;
    onChange?.(option.value);
  };

  return (
    <RadioGroup
      value={checked ? option.value : null}
      onChange={handleChange}
      className={className || ''}>
      <Radio
        value={option.value}
        disabled={disabled}
        className={() =>
          `flex ${buttonOnRight ? 'flex-row-reverse justify-between' : ''} items-start gap-3 ${
            disabled ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'
          }`
        }>
        {() => (
          <>
            <span
              className={`h-5 w-5 rounded-full border flex items-center justify-center ${
                checked ? 'border-button' : 'border-gray-300'
              }`}>
              <span
                className={`w-3 h-3 rounded-full ${
                  checked ? 'bg-button' : 'bg-transparent'
                }`}
              />
            </span>

            <span
              className={`flex ${
                descriptionInline ? 'flex-row gap-1' : 'flex-col'
              } ${!buttonOnRight && 'ml-1'}`}>
              {!hiddenTitle && (
                <Label as="span" className="text-sm font-medium text-gray-900">
                  {option.label}
                </Label>
              )}
              {option.description && (
                <Description as="span" className="text-sm text-gray-500">
                  {option.description}
                </Description>
              )}
            </span>
          </>
        )}
      </Radio>
    </RadioGroup>
  );
};

export default RadioButtonSingle;
