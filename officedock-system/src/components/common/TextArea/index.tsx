import React, { ReactNode, HTMLProps } from 'react';
import { UseFormRegisterReturn } from 'react-hook-form';

import ErrorMessage from '../ErrorMessage';

import { ComponentSize } from '@constants/enums';

export type TextAreaProps = HTMLProps<HTMLTextAreaElement> & {
  label?: ReactNode;
  error?: ReactNode;
  requireText?: ReactNode;
  required?: boolean;
  labelClassName?: string;
  register?: UseFormRegisterReturn;
  textareaSize?: string;
  wrapperClassName?: string;
};
const TextArea = ({
  label,
  error,
  register,
  required,
  requireText,
  className,
  labelClassName,
  disabled,
  textareaSize,
  wrapperClassName,
  ...props
}: TextAreaProps) => {
  const errorClasses = error ? 'border-danger' : 'border-gray-200';
  return (
    <div className="flex flex-col w-full h-full">
      {label && (
        <label className={`text-sm ${labelClassName}`}>
          {label}
          <>
            {required && <span className="text-error font-bold">{`*`}</span>}
            {requireText && (
              <span className="text-error  text-xs">{requireText}</span>
            )}
          </>
        </label>
      )}
      <div
        className={`relative flex items-center h-full w-full ${label ? 'mt-1' : ''} ${wrapperClassName}`}>
        <textarea
          className={`w-full px-3.5 ${textareaSize === ComponentSize.SHORT ? '!min-h-[10px] !py-0' : 'h-32 py-2.5'} leading-5.5 placeholder-gray-300 border rounded-lg focus:outline-none  focus:shadow-none focus:border-focus focus:ring-0 ${disabled && 'opacity-55'} ${errorClasses} ${className}`}
          disabled={disabled}
          {...props}
          {...register}
        />
      </div>
      {error && <ErrorMessage error={error} className="mt-[6px]" />}
    </div>
  );
};
export default TextArea;
