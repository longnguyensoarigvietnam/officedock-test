'use client';
import { ReactNode, useEffect, useRef, useState } from 'react';
import DatePickerUI from 'react-datepicker';
import type { ReactDatePickerProps } from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { ja } from 'date-fns/locale';

import ImageRound from '../ImageRound';
import ErrorMessage from '../ErrorMessage';
import { DATE_FORMAT } from '@constants';
import './styles/datepicker.css';

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
  onChange?: (date: Date | null) => void;
};

const DatePicker = ({
  label,
  className,
  labelClassName,
  required,
  requireText,
  error,
  placeholder,
  selected,
  autoFocus = false,
  onChange,
  ...props
}: DatePickerProps) => {
  const datePickerRef = useRef<DatePickerUI>(null);
  const errorClasses = error ? 'border-danger' : 'border-gray-200';

  const [selectedDate, setSelectedDate] = useState(selected);

  useEffect(() => {
    if (autoFocus) {
      datePickerRef.current?.setOpen(true);
    }
  }, [autoFocus]);

  useEffect(() => {
    setSelectedDate(selected);
  }, [selected]);

  const handleChange = (date: Date | null) => {
    setSelectedDate(date);
    onChange && onChange(date);
  };

  const handleClickIconCalendar = () => {
    datePickerRef.current?.setOpen(true);
  };

  return (
    <div className="w-full">
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
      <div className={`relative flex items-center ${label ? 'mt-1' : ''}`}>
        <DatePickerUI
          showYearDropdown
          showMonthDropdown
          scrollableYearDropdown
          yearDropdownItemNumber={100}
          ref={datePickerRef}
          selected={selectedDate}
          onChange={(date) => handleChange(date)}
          locale={ja}
          dateFormat={DATE_FORMAT}
          className={`w-full px-3.5 py-2.5 leading-5.5 placeholder-gray-300 border rounded-lg focus:outline-none focus:shadow-sm focus:border-focus focus:ring-0 ${errorClasses} ${className}`}
          placeholderText={placeholder}
          todayButton="今日"
          wrapperClassName="w-full"
          {...props}
        />

        <ImageRound
          className={`absolute w-4 h-4 top-1/2 right-0 transform -translate-x-1/2 -translate-y-1/2 hover:cursor-pointer ${className?.includes('hidden') && 'hidden'}`}
          name="Calendar icon"
          src="/icons/calendar.svg"
          onClick={handleClickIconCalendar}
        />
      </div>
      {error && <ErrorMessage error={error} className="mt-[6px]" />}
    </div>
  );
};

export default DatePicker;
