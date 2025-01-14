'use client';
import { HTMLProps, useEffect, useState } from 'react';
import { UseFormRegisterReturn } from 'react-hook-form';
import TextareaAutosize from 'react-textarea-autosize';
export type TextAreaProps = HTMLProps<HTMLTextAreaElement> & {
  register?: UseFormRegisterReturn;
  defaultText?: string;
  placeholderValue?: string;
  readonlyValue?: boolean;
};
const TextAreaAutosize = ({
  register,
  className,
  defaultText,
  placeholderValue,
  readonlyValue = false,
}: TextAreaProps) => {
  const [data, setData] = useState('');

  useEffect(() => {
    if (defaultText) {
      setData(defaultText);
    }
  }, [defaultText]);

  return (
    <TextareaAutosize
      className={className}
      {...register}
      onClick={(e) => e.stopPropagation()}
      defaultValue={data}
      placeholder={placeholderValue}
      readOnly={readonlyValue}
    />
  );
};
export default TextAreaAutosize;
