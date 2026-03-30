'use client';
import { ReactNode, useEffect, useRef, useState } from 'react';
import DatePickerUI from 'react-datepicker';
import type { ReactDatePickerProps } from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { ja } from 'date-fns/locale';
import { addDays, format, isSaturday, isSunday, startOfDay } from 'date-fns';
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
  clickStartButton?: () => void;
  clickEndButton?: () => void;
  resetStartClickCustom?: () => void;
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
  clickEndButton,
  resetStartClickCustom,
  dateFormat = DATE_FORMAT,
  ...props
}: DatePickerProps) => {
  const datePickerRef = useRef<DatePickerUI>(null);
  const errorClasses = error ? 'border-danger' : 'border-gray-200';

  const dayClassName = (date: Date) => {
    // Use current selected range (state), not initial props.
    // This prevents stale highlight when parent hasn't synced initial* props yet.
    if (startDate && endDate) {
      const d = startOfDay(date);
      const s = startOfDay(startDate);
      const e = startOfDay(endDate);
      if (d > s && d < e)
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
    // Always sync internal end state with parent.
    // Parent can intentionally pass null to clear the selection.
    setEndDate(initialEndDate ?? null);
  }, [initialEndDate]);

  const handleChange = (dates: [Date, Date | null]) => {
    const [start, end] = dates;

    // Keep previous selection so we can decide how to interpret
    // the "second click" when end is not set yet (custom range mode).
    const prevStart = startDate;
    const prevEnd = endDate;

    if (isTypeTime === TimeOptionsType.MORE) {
      // Custom range mode rule:
      // If we only have "start" set (prevEnd === null) and the picker returns both
      // [start, end] on the next click, interpret the clicked date relative to prevStart:
      // - clicked date < prevStart => update start, keep end = null
      // - clicked date > prevStart => update end
      // Use initialEndDate (from parent) to determine whether "end" was set yet.
      // Parent may still pass null even if internal state was normalized by the picker.
      if (
        initialEndDate == null &&
        !isEndButtonClicked &&
        start &&
        end &&
        prevStart
      ) {
        const prevStartStr = prevStart.toDateString();
        const startStr = start.toDateString();
        const endStr = end.toDateString();

        // ReactDatePicker normalizes range order (start <= end)
        // If end === prevStart => user clicked before prevStart
        if (endStr === prevStartStr) {
          setStartDate(start);
          setEndDate(null);
          onChange && onChange(start, null);
          return;
        }

        // If start === prevStart => user clicked after prevStart
        if (startStr === prevStartStr) {
          let adjustedEnd = end;
          const diffInTime = end.getTime() - start.getTime();
          const diffInDays = diffInTime / (1000 * 3600 * 24);

          if (diffInDays > 365) {
            adjustedEnd = new Date(start);
            adjustedEnd.setDate(adjustedEnd.getDate() + 365);
          }

          setStartDate(start);
          setEndDate(adjustedEnd);
          onChange && onChange(start, adjustedEnd);
          resetStartClickCustom && resetStartClickCustom();
          clickEndButton && clickEndButton();
          return;
        }

        // Fallback: compare by time when strings didn't match expected normalization.
        if (start.getTime() < prevStart.getTime()) {
          setStartDate(start);
          setEndDate(null);
          onChange && onChange(start, null);
          return;
        }

        setStartDate(prevStart);
        setEndDate(end);
        onChange && onChange(prevStart, end);
        clickEndButton && clickEndButton();
        return;
      }

      if (start && isEndButtonClicked) {
        // If the parent hasn't set end yet, interpret "second click" relative
        // to initialStartDate:
        // - clicked date < initialStartDate => update start, clear end
        // - clicked date > initialStartDate => keep start, set end
        if (initialEndDate == null && initialStartDate) {
          const initialStartTime = initialStartDate.getTime();
          const startTime = start.getTime();

          if (startTime < initialStartTime) {
            setStartDate(start);
            setEndDate(null);
            onChange && onChange(start, null);
            return;
          }

          if (startTime === initialStartTime) {
            if (end) {
              setEndDate(end);
              onChange && onChange(initialStartDate as Date, end);
              resetEndClick && resetEndClick();
            } else {
              setEndDate(null);
              onChange && onChange(initialStartDate as Date, null);
            }
            return;
          }
        }

        let adjustedEnd = end;
        if (end) {
          const diffInTime = end.getTime() - start.getTime();
          const diffInDays = diffInTime / (1000 * 3600 * 24);

          if (diffInDays > 365) {
            adjustedEnd = new Date(start);
            adjustedEnd.setDate(adjustedEnd.getDate() + 365);
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
        // Custom range selection:
        // - prevEnd is null means we currently have only "start" set.
        // - When the user clicks again and the picker returns both start+end,
        //   decide based on ordering relative to prevStart:
        //   - clicked date < prevStart => update start, clear end
        //   - clicked date > prevStart => set end
        if (prevEnd === null && start && end) {
          const prevStartStr = prevStart?.toDateString();
          const startStr = start.toDateString();
          const endStr = end.toDateString();

          // ReactDatePicker normalizes the range order (start <= end).
          // If prevStart became the later date, user clicked before prevStart.
          if (endStr === prevStartStr) {
            setStartDate(start);
            setEndDate(null);
            onChange && onChange(start, null);
            return;
          }

          // If prevStart is still the earlier date, user clicked after prevStart.
          if (startStr === prevStartStr) {
            let adjustedEnd = end;
            const diffInTime = end.getTime() - start.getTime();
            const diffInDays = diffInTime / (1000 * 3600 * 24);
            if (diffInDays > 365) {
              adjustedEnd = new Date(start);
              adjustedEnd.setDate(adjustedEnd.getDate() + 365);
            }

            setStartDate(start);
            setEndDate(adjustedEnd);
            onChange && onChange(start, adjustedEnd);
            resetStartClickCustom && resetStartClickCustom();
            clickEndButton && clickEndButton();
            return;
          }
        }

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

            if (diffInDays > 365) {
              adjustedEnd = new Date(start);
              adjustedEnd.setDate(adjustedEnd.getDate() + 365);
            }
          }

          setStartDate(start);
          setEndDate(adjustedEnd);
          onChange && onChange(start, adjustedEnd);
          resetStartClickCustom && resetStartClickCustom();
          clickEndButton && clickEndButton();
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
          disabledKeyboardNavigation={isDisable}
          yearDropdownItemNumber={100}
          ref={(el) => {
            if (el) {
              el.setOpen(true);
            }
          }}
          open={isOpen}
          disabled={isDisable}
          selected={startDate}
          onChange={(date: [Date, Date | null]) => {
            if (!isDisable) {
              handleChange(date);
            }
          }}
          maxDate={
            isStartButtonClicked
              ? null
              : initialStartDate
                ? addDays(initialStartDate, 365)
                : null
          }
          startDate={startDate}
          endDate={endDate}
          selectsRange
          minDate={
            // In custom mode we don't restrict min date.
            // This allows choosing a date before the current "start"
            // (which we interpret as updating the start date).
            isTypeTime === TimeOptionsType.MORE
              ? null
              : isEndButtonClicked
                ? startDate
                : null
          }
          locale={customLocale}
          dateFormat={dateFormat}
          className={`w-full px-3.5 py-2.5 ${size === ComponentSize.SMALL && ComponentSize.HIDDEN} leading-5.5 placeholder-gray-300 border rounded-lg disabled:opacity-55 focus:outline-none focus:shadow-sm focus:border-focus focus:ring-0 ${errorClasses} ${className}`}
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
