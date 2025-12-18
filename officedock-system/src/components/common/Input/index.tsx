'use client';
import { InputHTMLAttributes, ReactNode, useState } from 'react';
import Image from 'next/image';
import { UseFormRegisterReturn } from 'react-hook-form';

import ErrorMessage from '../ErrorMessage';
import TimeDropdown from '../Dropdown/TimeDropdown';

import { OptionDropdownType } from '@interfaces/common';

export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: ReactNode;
  type?: string;
  error?: ReactNode;
  requireText?: ReactNode;
  required?: boolean;
  labelClassName?: string;
  autoCompleteInput?: boolean;
  register?: UseFormRegisterReturn;
  isShowClockIcon?: boolean;
  classNameOption?: string;
  isBottomOptions?: boolean;
  iconSrc?: string;
  options?: OptionDropdownType[];
  valueInput?: string | null;
  errorClassName?: string;
  onChangeDropdown?: (value: OptionDropdownType) => void;
};

const Input = ({
  label,
  type = 'text',
  error,
  iconSrc,
  register,
  required,
  requireText,
  className,
  labelClassName,
  disabled,
  autoCompleteInput = false,
  isShowClockIcon = false,
  options,
  valueInput,
  classNameOption,
  isBottomOptions,
  errorClassName,
  onChangeDropdown,
  ...props
}: InputProps) => {
  const isPassword = type === 'password';
  const [isShowPassword, setIsShowPassword] = useState(!isPassword);
  const errorClasses = error ? 'border-danger' : 'border-gray-200';

  return (
    <div className="flex flex-col w-full">
      {label && (
        <label
          className={`text-sm ${labelClassName}  ${disabled && 'opacity-55'}`}>
          {label}

          <>
            {required && <span className="text-error font-bold">{`*`}</span>}
            {requireText && (
              <span className="text-error  text-xs">{requireText}</span>
            )}
          </>
        </label>
      )}
      <div className={`relative flex items-center ${label ? 'mt-1' : ''}`}>
        {isShowClockIcon && (
          <>
            <div
              className={`${iconSrc ? 'w-[22px] left-[10px] top-[4px]' : 'w-4 left-[5px] top-[8px]'} absolute  ${classNameOption} `}>
              <TimeDropdown
                options={options ? options : []}
                valueInput={valueInput}
                onChange={onChangeDropdown}
                iconSrc={iconSrc}
                isBottomOptions={isBottomOptions}
              />
            </div>
          </>
        )}
        <input
          type={
            type === 'password' ? (isShowPassword ? 'text' : 'password') : type
          }
          autoFocus={false}
          className={`w-full px-3.5 py-2.5 leading-5.5 placeholder-gray-300 border rounded-lg focus:outline-none focus:shadow-sm focus:border-focus focus:ring-0 ${isPassword ? 'pr-8' : null} ${disabled && 'opacity-55'} ${errorClasses} ${className}`}
          disabled={disabled}
          autoComplete={autoCompleteInput ? 'on' : 'off'}
          {...props}
          {...register}
        />
        {isPassword ? (
          isShowPassword ? (
            <Image
              src={'/icons/open-eye.svg'}
              alt="Password"
              width={18}
              height={15}
              className="absolute top-1/2 right-0 transform -translate-x-1/2 -translate-y-1/2 mx-auto cursor-pointer"
              onClick={() => {
                if (!disabled) {
                  setIsShowPassword(!isShowPassword);
                }
              }}
            />
          ) : (
            <Image
              src={'/icons/close-eye.svg'}
              alt="Password"
              width={18}
              height={19}
              className="absolute top-1/2 right-0 transform -translate-x-1/2 -translate-y-1/2 mx-auto cursor-pointer"
              onClick={() => {
                if (!disabled) {
                  setIsShowPassword(!isShowPassword);
                }
              }}
            />
          )
        ) : null}
      </div>
      {error && (
        <ErrorMessage error={error} className={`mt-[6px] ${errorClassName}`} />
      )}
    </div>
  );
};

export default Input;
