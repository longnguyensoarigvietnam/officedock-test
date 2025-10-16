'use client';
import { forwardRef, ReactNode, useEffect, useRef, useState } from 'react';
import DatePickerUI from 'react-datepicker';
import type { ReactDatePickerProps } from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { ja } from 'date-fns/locale';
import { format, isSaturday, isSunday } from 'date-fns';
import { isHoliday } from 'japanese-holidays';

import ImageRound from '../ImageRound';
import ErrorMessage from '../ErrorMessage';
import { DATE_FORMAT } from '@constants';
import './styles/datepicker.css';
import { ComponentSize } from '@constants/enums';
import { DynamicTooltip } from '@components/tooltip/DynamicTooltip';

export type DatePickerProps = Omit<ReactDatePickerProps, 'onChange'> & {
  selected?: Date | null;
  className?: string;
  labelClassName?: string;
  label?: string;
  error?: ReactNode;
  required?: boolean;
  requireText?: ReactNode;
  placeholder?: string;
  autoFocus?: boolean;
  size?: string;
  isShowInput?: boolean;
  tooltipMsg?: string;
  iconClassName?: string;
  dateFormat?: string;
  onChange?: (date: Date | null) => void;
};

const CustomInput = forwardRef<HTMLInputElement, any>((props, ref) => (
  <input {...props} ref={ref} readOnly />
));

const DatePicker = ({
  label,
  className,
  labelClassName,
  required,
  requireText,
  error,
  placeholder,
  selected,
  size,
  isShowInput = true,
  autoFocus = false,
  onChange,
  tooltipMsg,
  dateFormat = DATE_FORMAT,
  iconClassName,
  ...props
}: DatePickerProps) => {
  const datePickerRef = useRef<DatePickerUI>(null);
  const errorClasses = error ? 'border-danger' : 'border-gray-200';

  const [selectedDate, setSelectedDate] = useState(selected);
  const [isOpen, setIsOpen] = useState(false);

  const dayClassName = (date: Date) => {
    if (isHoliday(date)) return 'holiday';
    else if (isSunday(date)) return 'sunday';
    else if (isSaturday(date)) return 'saturday';
    return null;
  };

  const customLocale: any = {
    ...ja,
    options: {
      ...ja.options,
      weekStartsOn: 1 as const,
    },
  };

  useEffect(() => {
    if (autoFocus || size === ComponentSize.SMALL) {
      datePickerRef.current?.setOpen(true);
    }
  }, [autoFocus, size]);

  useEffect(() => {
    if (selected) {
      setSelectedDate(selected);
    } else {
      setSelectedDate(null);
    }
  }, [selected]);

  const handleChange = (date: Date | null) => {
    setSelectedDate(date);
    onChange && onChange(date);
    datePickerRef.current?.setOpen(false);
    setIsOpen(false);
  };

  return (
    <div className={`w-full ${size}`}>
      {label && (
        <label className={`text-sm ${labelClassName}`}>
          {label}
          <>
            {required && <span className="text-error font-bold">{`*`}</span>}
            {requireText && (
              <span className="text-error italic text-xs">{requireText}</span>
            )}
          </>
        </label>
      )}
      <div
        className={`relative single-date ${label ? 'mt-1' : ''}`}
        onClick={() => {
          setIsOpen(true);
        }}>
        <DatePickerUI
          scrollableYearDropdown
          yearDropdownItemNumber={100}
          ref={datePickerRef}
          selected={selectedDate}
          onChange={(date) => handleChange(date)}
          locale={customLocale}
          dateFormat={dateFormat}
          className={`${isShowInput && `w-full py-2.5 ${size === ComponentSize.SMALL && ComponentSize.HIDDEN} leading-5.5 placeholder-gray-300 border rounded-lg focus:outline-none focus:shadow-sm focus:border-focus focus:ring-0 ${errorClasses} ${className}`}`}
          placeholderText={placeholder}
          todayButton="今日"
          wrapperClassName="w-full"
          customInput={isShowInput ? <CustomInput /> : <div></div>}
          dayClassName={dayClassName}
          renderCustomHeader={({ date, decreaseMonth, increaseMonth }) => {
            const year = format(date, 'yyyy');
            const month = format(date, 'M');
            return (
              <div className="flex items-center justify-between px-2 w-[60%] mb-2">
                <ImageRound
                  className=" w-4 h-4 opacity-70 hover:cursor-pointer"
                  src="/icons/chevron-left.svg"
                  name="left"
                  onClick={decreaseMonth}
                />
                <p className="text-[#5B6770] text-[17px] font-medium">
                  {year}年 {month}月
                </p>
                <ImageRound
                  className=" w-4 h-4 opacity-70 hover:cursor-pointer"
                  src="/icons/chevron-right.svg"
                  name="right"
                  onClick={increaseMonth}
                />
              </div>
            );
          }}
          {...props}
        />

        <DynamicTooltip
          content={tooltipMsg}
          placement="top"
          disabled={!tooltipMsg}
          customOffset={{
            top: -20,
          }}>
          <div>
            <ImageRound
              className={`w-[18px] h-[18px] cursor-pointer p-0 border-none bg-transparent absolute top-1/2 right-0 transform -translate-x-1/2 -translate-y-1/2 hover:cursor-pointer ${size === ComponentSize.SMALL && ComponentSize.HIDDEN} ${className?.includes('hidden') && 'hidden'} ${iconClassName}`}
              name="Calendar icon"
              src="/icons/calendar-time.svg"
              onClick={(e) => {
                e.stopPropagation();
                if (isOpen) {
                  datePickerRef.current?.setOpen(false);
                  setIsOpen(false);
                } else {
                  datePickerRef.current?.setOpen(true);
                  setIsOpen(true);
                }
              }}
            />
          </div>
        </DynamicTooltip>
      </div>
      {error && <ErrorMessage error={error} className="mt-[6px]" />}
    </div>
  );
};

export default DatePicker;
