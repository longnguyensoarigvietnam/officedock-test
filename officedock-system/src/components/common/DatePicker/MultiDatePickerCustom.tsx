'use client';
import { ReactNode, useEffect, useRef, useState } from 'react';
import DatePickerUI from 'react-datepicker';
import type { ReactDatePickerProps } from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { ja } from 'date-fns/locale';
import { addDays, format, isSaturday, isSunday } from 'date-fns';
import { isHoliday } from 'japanese-holidays';

import ImageRound from '../ImageRound';
import ErrorMessage from '../ErrorMessage';
import { DATE_FORMAT } from '@constants';
import { ComponentSize, TimeOptionsType } from '@constants/enums';
import './styles/multiPickerCustom.css';
import { compareAndSetDate, getDaysFromTimeOption } from '@utils/date';

export type DatePickerProps = Omit<ReactDatePickerProps, 'onChange'> & {
  isCalendarCompare?: boolean;
  isTypeTime: TimeOptionsType;
  initialStartDate?: Date;
  initialEndDate?: Date | null;
  className?: string;
  isDisable?: boolean;
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
  isEndButtonClicked?: boolean;
  isStartButtonClicked?: boolean;
  onChange?: (startDate: Date, endDate: Date | null) => void;
  resetEndClick?: () => void;
  resetStartClick?: () => void;
};

const MultiDatePickerCustom = ({
  isTypeTime,
  label,
  className,
  labelClassName,
  required,
  requireText,
  error,
  placeholder,
  size,
  initialStartDate,
  initialEndDate,
  autoFocus = false,
  isDisable = false,
  isEndButtonClicked = false,
  isStartButtonClicked = false,
  isCalendarCompare = false,
  onChange,
  resetEndClick,
  resetStartClick,
  dateFormat = DATE_FORMAT,
  ...props
}: DatePickerProps) => {
  const datePickerRef = useRef<DatePickerUI>(null);
  const errorClasses = error ? 'border-danger' : 'border-gray-200';

  const dayClassName = (date: Date) => {
    if (initialStartDate && initialEndDate) {
      const endDate = new Date(initialEndDate);
      endDate.setDate(endDate.getDate() - 1);
      const startDate = new Date(initialStartDate);
      startDate.setDate(startDate.getDate());
      if (date > startDate && date < endDate)
        return isCalendarCompare ? 'highlighted-compare' : 'highlighted-date';
    }
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

  const [isOpen, setIsOpen] = useState(true);
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState<Date | null>(null);

  // Start date
  useEffect(() => {
    if (initialStartDate) {
      setStartDate(initialStartDate);
    }
  }, [initialStartDate]);

  // End date
  useEffect(() => {
    if (initialEndDate) {
      setEndDate(initialEndDate);
    }
  }, [initialEndDate]);

  const handleChange = (dates: [Date, Date | null]) => {
    const [start, end] = dates;

    if (isTypeTime === TimeOptionsType.MORE) {
      if (start && isEndButtonClicked) {
        let adjustedEnd = end;
        if (end) {
          const diffInTime = end.getTime() - start.getTime();
          const diffInDays = diffInTime / (1000 * 3600 * 24);

          if (diffInDays > 366) {
            adjustedEnd = new Date(start);
            adjustedEnd.setDate(adjustedEnd.getDate() + 366);
          }
          setEndDate(adjustedEnd);
          onChange && onChange(start, adjustedEnd);
          resetEndClick && resetEndClick();
        } else {
          if (initialStartDate && start) {
            const endNew = compareAndSetDate(initialStartDate, start);
            setEndDate(endNew);
            onChange && onChange(initialStartDate as Date, endNew);
            resetEndClick && resetEndClick();
          } else {
            setEndDate(start);
            onChange && onChange(initialStartDate as Date, start);
            resetEndClick && resetEndClick();
          }
        }
      } else {
        if (start && isStartButtonClicked && end) {
          setStartDate(end);
          setEndDate(null);
          onChange && onChange(end, null);
          resetStartClick && resetStartClick();
        } else {
          let adjustedEnd = end;

          if (start && end) {
            const diffInTime = end.getTime() - start.getTime();
            const diffInDays = diffInTime / (1000 * 3600 * 24);

            if (diffInDays > 366) {
              adjustedEnd = new Date(start);
              adjustedEnd.setDate(adjustedEnd.getDate() + 366);
            }
          }

          setStartDate(start);
          setEndDate(adjustedEnd);
          onChange && onChange(start, adjustedEnd);
          resetStartClick && resetStartClick();
          resetEndClick && resetEndClick();
        }
      }
    } else if (start && isEndButtonClicked) {
      const days = getDaysFromTimeOption(isTypeTime, start, true);
      const endDate = new Date(start);

      endDate.setDate(start.getDate() - (days - 1));
      setStartDate(endDate);
      setEndDate(start);
      onChange && onChange(endDate, start);
      resetEndClick && resetEndClick();
    } else if (start && isStartButtonClicked) {
      const days = getDaysFromTimeOption(isTypeTime, start, false);
      const endDate = new Date(start);
      endDate.setDate(start.getDate() + (days - 1));
      setStartDate(start);
      setEndDate(endDate);

      onChange && onChange(start, endDate);
      resetStartClick && resetStartClick();
    } else {
      setStartDate(start);
      setEndDate(end);
      onChange && onChange(start, end);
    }
  };

  useEffect(() => {
    datePickerRef.current?.setOpen(true);
  }, []);

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
        className={`relative multi-date flex items-center ${label ? 'mt-1' : ''}`}>
        <DatePickerUI
          openToDate={startDate}
          scrollableYearDropdown
          disabledKeyboardNavigation={
            isTypeTime === TimeOptionsType.MORE ? false : isDisable
          }
          yearDropdownItemNumber={100}
          ref={(el) => {
            if (el) {
              el.setOpen(true);
            }
          }}
          open={isOpen}
          disabled={isTypeTime === TimeOptionsType.MORE ? false : isDisable}
          selected={startDate}
          onChange={(date: [Date, Date | null]) => {
            if (isTypeTime === TimeOptionsType.MORE) {
              handleChange(date);
            } else {
              if (!isDisable) {
                handleChange(date);
              }
            }
          }}
          maxDate={
            isStartButtonClicked
              ? null
              : initialStartDate
                ? addDays(initialStartDate, 366)
                : null
          }
          startDate={startDate}
          endDate={endDate}
          selectsRange
          minDate={null}
          locale={customLocale}
          dateFormat={dateFormat}
          className={`w-full px-3.5 py-2.5 ${size === ComponentSize.SMALL && ComponentSize.HIDDEN} leading-5.5 placeholder-gray-300 border rounded-lg focus:outline-none focus:shadow-sm focus:border-focus focus:ring-0 ${errorClasses} ${className}`}
          placeholderText={placeholder}
          todayButton="今日"
          wrapperClassName="w-full"
          customInput={
            <div className="!w-4 h-4 absolute right-0 top-[-16px] !border-none cursor-pointer"></div>
          }
          dayClassName={dayClassName}
          renderCustomHeader={({ date, decreaseMonth, increaseMonth }) => {
            const year = format(date, 'yyyy');
            const month = format(date, 'M');
            return (
              <div className="flex items-center justify-between px-2 w-[70%] mb-3">
                <ImageRound
                  className=" w-4 h-4 opacity-70 hover:cursor-pointer relative top-[1px]"
                  src="/icons/chevron-left.svg"
                  name="left"
                  onClick={decreaseMonth}
                />
                <p className="text-[#5B6770] text-[15px] font-medium">
                  {year}年 {month}月
                </p>
                <ImageRound
                  className=" w-4 h-4 opacity-70 hover:cursor-pointer relative top-[1px]"
                  src="/icons/chevron-right.svg"
                  name="right"
                  onClick={increaseMonth}
                />
              </div>
            );
          }}
          onClickOutside={() => setIsOpen(true)}
          {...props}
        />
      </div>
      {error && <ErrorMessage error={error} className="mt-[6px]" />}
    </div>
  );
};

export default MultiDatePickerCustom;
