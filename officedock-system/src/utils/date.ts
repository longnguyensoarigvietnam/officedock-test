import {
  addDays,
  endOfDay,
  format,
  formatISO,
  isSameDay,
  parseISO,
  startOfDay,
} from 'date-fns';
import { v4 as uuidv4 } from 'uuid';

import {
  DATE_FORMAT_SERVER,
  DATE_TIME_FORMAT,
  DATE_TIME_LOCAL,
} from '@constants';
import { DateInfo, OptionDropdownType } from '@interfaces/common';
import { StatisticCategoryInfo } from '@interfaces/statistic';
import {
  ItemStartType,
  ItemScheduleType,
  StatisticViewOptions,
  TimeOptionsType,
} from '@constants/enums';
import { TaskTimeSchedule } from '@interfaces/task';

export const getFormattedDateTime = (dateInput?: string | Date): string => {
  const date: Date = dateInput ? new Date(dateInput) : new Date();
  const year: number = date.getFullYear();
  const month: string = String(date.getMonth() + 1).padStart(2, '0');
  const day: string = String(date.getDate()).padStart(2, '0');
  const hours24: string = String(date.getHours()).padStart(2, '0');
  const minutes: string = String(date.getMinutes()).padStart(2, '0');
  return `${year}/${month}/${day} ${hours24}:${minutes}`;
};

//  Format date sever
export const formatDateServer = (
  date: Date | string | undefined | null,
): string => {
  if (!date) return '';
  return format(new Date(date), DATE_FORMAT_SERVER);
};

// Add time to date
export const addTimeToDate = (date: Date, time: string | null) => {
  if (!time) {
    return date.toISOString().split('T')[0] + ' ' + '00:00';
  }
  const [hours, minutes] = time.trim().split(':').map(Number);
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const hourStr = hours.toString().padStart(2, '0');
  const minuteStr = minutes.toString().padStart(2, '0');
  return `${year}-${month}-${day} ${hourStr}:${minuteStr}`;
};

// Format start date for calendar
export const formatQueryStartDateForCalendar = (inputDate: Date) => {
  const year = inputDate.getFullYear();
  const month = (inputDate.getMonth() + 1).toString().padStart(2, '0');
  const day = inputDate.getDate().toString().padStart(2, '0');
  const hours = inputDate.getHours().toString().padStart(2, '0');
  const minutes = inputDate.getMinutes().toString().padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}`;
};

// Format end date for calendar
export const formatQueryEndDateForCalendar = (inputDate: Date) => {
  const adjustedDate = new Date(inputDate.getTime() - 60000);

  const year = adjustedDate.getFullYear();
  const month = (adjustedDate.getMonth() + 1).toString().padStart(2, '0');
  const day = adjustedDate.getDate().toString().padStart(2, '0');
  const hours = adjustedDate.getHours().toString().padStart(2, '0');
  const minutes = adjustedDate.getMinutes().toString().padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}`;
};
// Format end date for calendar with isWeek
export const formatQueryEndDateForCalendarCustom = (
  inputDate: Date,
  isWeek: boolean = false,
) => {
  const adjustedDate = new Date(inputDate);
  adjustedDate.setDate(adjustedDate.getDate() + (isWeek ? 6 : 1));

  const year = adjustedDate.getFullYear();
  const month = (adjustedDate.getMonth() + 1).toString().padStart(2, '0');
  const day = adjustedDate.getDate().toString().padStart(2, '0');
  const hours = '00';
  const minutes = '00';

  return `${year}-${month}-${day} ${hours}:${minutes}`;
};

// Get Time to date
export const convertToTimeString = (date: string): string => {
  const dateObj = new Date(date);
  const hours = String(dateObj.getHours()).padStart(2, '0');
  const minutes = String(dateObj.getMinutes()).padStart(2, '0');

  return `${hours}:${minutes}`;
};
//  Format time
export const formatTimeInput = (value: string): string => {
  let hours: number, minutes: number;
  if (value.length === 3) {
    hours = parseInt(value.substring(0, 1), 10);
    minutes = parseInt(value.substring(1, 3), 10);
  } else {
    hours = parseInt(value.substring(0, 2), 10);
    minutes = parseInt(value.substring(2, 4) || '00', 10);
  }
  if (value.length < 2) {
    hours = parseInt(value.substring(0, 1), 10) || 0;
  }
  if (hours >= 24 || minutes >= 60) {
    const now = new Date();
    hours = now.getHours();
    minutes = now.getMinutes();
  }
  const formattedHours = String(hours).padStart(2, '0');
  const formattedMinutes = String(minutes).padStart(2, '0');
  return `${formattedHours}:${formattedMinutes}`;
};

export const formatTimeInputFilter = (value: string, date: Date): string => {
  let hours: number, minutes: number;

  // Parse input
  if (value.length === 3) {
    hours = parseInt(value.substring(0, 1), 10);
    minutes = parseInt(value.substring(1, 3), 10);
  } else {
    hours = parseInt(value.substring(0, 2), 10);
    minutes = parseInt(value.substring(2, 4) || '00', 10);
  }

  if (value.length < 2) {
    hours = parseInt(value.substring(0, 1), 10) || 0;
  }

  // Validate range
  if (hours >= 24 || minutes >= 60) {
    const now = new Date();
    hours = now.getHours();
    minutes = now.getMinutes();
  }

  let formattedHours = String(hours).padStart(2, '0');
  let formattedMinutes = String(minutes).padStart(2, '0');
  let inputTime = `${formattedHours}:${formattedMinutes}`;

  const now = new Date();
  if (isSameDay(date, now)) {
    const inputTotalMinutes = hours * 60 + minutes;
    const nowTotalMinutes = now.getHours() * 60 + now.getMinutes();

    if (inputTotalMinutes < nowTotalMinutes) {
      formattedHours = String(now.getHours()).padStart(2, '0');
      formattedMinutes = String(now.getMinutes()).padStart(2, '0');
      inputTime = `${formattedHours}:${formattedMinutes}`;
    }
  }

  return inputTime;
};

// Format date time
export const formatDateTime = (dateString: string) => {
  const date = new Date(dateString);
  return format(date, DATE_TIME_FORMAT);
};
// Format time
export const formatTime = (seconds: number) => {
  const hrs = Math.floor(seconds / 3600)
    .toString()
    .padStart(2, '0');
  const mins = Math.floor((seconds % 3600) / 60)
    .toString()
    .padStart(2, '0');
  const secs = (seconds % 60).toString().padStart(2, '0');
  return `${hrs}:${mins}:${secs}`;
};
export function formatTimeTask(isoString: string): string {
  if (!isoString || isNaN(Date.parse(isoString))) {
    return '----';
  }

  const date: Date = new Date(isoString);

  const hours: number = date.getHours();
  const minutes: number = date.getMinutes();

  const formattedTime: string = `${hours}:${minutes.toString().padStart(2, '0')}`;

  return formattedTime;
}
//Convert date to 00:00
export const convertDateToStartDate = (dateString: string): string => {
  const date = parseISO(dateString);
  const startOfDayDate = startOfDay(date);
  return format(startOfDayDate, DATE_TIME_LOCAL);
};
//Convert time to minutes
export function convertToMinutes(time: string): number {
  const [hoursStr, minutesStr, period] = time.trim().split(/[: ]+/);
  let hours = parseInt(hoursStr, 10);
  const minutes = parseInt(minutesStr, 10);

  if (isNaN(hours) || isNaN(minutes) || !['AM', 'PM'].includes(period)) {
    // TODO  : Show error message
    // throw new Error(`Error: ${time}`);
  }

  if (period === 'PM' && hours !== 12) {
    hours += 12;
  } else if (period === 'AM' && hours === 12) {
    hours = 0;
  }

  return hours * 60 + minutes;
}

export const encodeFormatDateISO = (date: Date) => {
  return encodeURIComponent(formatISO(date));
};

// Handle format check date
export const formatCheckDate = (dateString: string): string => {
  if (!dateString) {
    return '';
  }

  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    return '';
  }

  const formattedDate = `${date.getMonth() + 1}月${date.getDate()}日 ${date.toLocaleTimeString(
    'ja-JP',
    {
      hour: '2-digit',
      minute: '2-digit',
    },
  )}`;

  return formattedDate;
};

export function isMoreThanSixtyMinutes(timeRange: string): boolean {
  if (!timeRange || typeof timeRange !== 'string') {
    return false;
  }

  const [start, end] = timeRange.split(' - ');

  if (!start || !end) {
    return false;
  }

  const [startHour, startMinute] = start.split(':').map(Number);
  const [endHour, endMinute] = end.split(':').map(Number);

  if (
    isNaN(startHour) ||
    isNaN(startMinute) ||
    isNaN(endHour) ||
    isNaN(endMinute)
  ) {
    return false;
  }

  const startTimeInMinutes = startHour * 60 + startMinute;
  const endTimeInMinutes = endHour * 60 + endMinute;

  const differenceInMinutes = endTimeInMinutes - startTimeInMinutes;

  return differenceInMinutes > 60;
}

export function isMoreThanThirtyMinutes(timeRange: string): boolean {
  if (!timeRange || typeof timeRange !== 'string') {
    return false;
  }

  const [start, end] = timeRange.split(' - ');

  if (!start || !end) {
    return false;
  }

  const [startHour, startMinute] = start.split(':').map(Number);
  const [endHour, endMinute] = end.split(':').map(Number);

  if (
    isNaN(startHour) ||
    isNaN(startMinute) ||
    isNaN(endHour) ||
    isNaN(endMinute)
  ) {
    return false;
  }

  const startTimeInMinutes = startHour * 60 + startMinute;
  const endTimeInMinutes = endHour * 60 + endMinute;

  const differenceInMinutes = endTimeInMinutes - startTimeInMinutes;

  return differenceInMinutes >= 30;
}

export function addTimeDifference(
  planStartDate: string,
  planEndDate: string,
  total: Date,
  additionalDays: number = 0,
): Date {
  const startDate = new Date(planStartDate);
  const endDate = new Date(planEndDate);

  let timeDifference = endDate.getTime() - startDate.getTime();

  timeDifference = Math.max(timeDifference, 60000);

  const newTotal = new Date(total.getTime() + timeDifference);

  newTotal.setDate(newTotal.getDate() + additionalDays);

  return newTotal;
}
export const getMinuteDifference = (timeText: string): number => {
  if (!timeText) return 0;

  const [start, end] = timeText.split(' - ');
  if (!start || !end) return 0;

  const toMinutes = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number);
    if (isNaN(hours) || isNaN(minutes)) return 0;
    return hours * 60 + minutes;
  };

  const startMinutes = toMinutes(start);
  const endMinutes = toMinutes(end);

  return endMinutes >= startMinutes
    ? endMinutes - startMinutes
    : endMinutes + 1440 - startMinutes;
};
export function isMoreThanFifteenMinutes(start: string, end: string): boolean {
  if (!start || !end || typeof start !== 'string' || typeof end !== 'string') {
    return false;
  }

  const startDate = new Date(start);
  const endDate = new Date(end);

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return false;
  }

  const differenceInMinutes =
    (endDate.getTime() - startDate.getTime()) / (1000 * 60);

  return differenceInMinutes > 15;
}

export function areDatesDifferent(
  planStartDate: string,
  planEndDate: string,
): boolean {
  const startDate = new Date(planStartDate);
  const endDate = new Date(planEndDate);

  const isDifferent =
    startDate.getFullYear() !== endDate.getFullYear() ||
    startDate.getMonth() !== endDate.getMonth() ||
    startDate.getDate() !== endDate.getDate();

  return isDifferent;
}
// Add hours in time
export function addHoursToDate(dateString: string, hours: number = 1): string {
  const date = new Date(dateString);

  if (isNaN(date.getTime())) {
    return '';
  }

  date.setHours(date.getHours() + hours);

  return date.toISOString();
}

// Add minutes in time
export function addMinutesToDate(
  dateString: string,
  minutes: number = 15,
): string {
  const date = new Date(dateString);

  if (isNaN(date.getTime())) {
    return '';
  }

  date.setMinutes(date.getMinutes() + minutes);

  return date.toISOString();
}

// Check start & end with minutes
export function adjustEndDate(
  start: Date,
  end: Date,
  minutes: number = 15,
): Date {
  const differenceInMinutes = (end.getTime() - start.getTime()) / (1000 * 60);

  if (differenceInMinutes >= minutes) {
    return end;
  }

  const adjustedEnd = new Date(start);
  adjustedEnd.setMinutes(start.getMinutes() + minutes);
  return adjustedEnd;
}
// Check mid night
export function isMidnight(date: Date): boolean {
  return (
    date.getHours() === 0 && date.getMinutes() === 0 && date.getSeconds() === 0
  );
}

// Get Japanese day name
export function getJapaneseDayName(isoDateStr: string) {
  const date = new Date(isoDateStr);

  const weekdayNames: string[] = ['日', '月', '火', '水', '木', '金', '土'];

  const weekdayNumber: number = date.getDay();

  return weekdayNames[weekdayNumber];
}

export function convertDateString(dateStr: string | Date): string {
  const date = new Date(dateStr);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = date.getHours();
  const minute = date.getMinutes();

  const hourStr = String(hour).padStart(2, '0');
  const minuteStr = String(minute).padStart(2, '0');

  return `${year}-${month}-${day} ${hourStr}:${minuteStr}`;
}

export function convertDateStringFull(dateStr: string | Date): string {
  const date = new Date(dateStr);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = date.getHours();
  const minute = date.getMinutes();
  const second = date.getSeconds();
  const millisecond = date.getMilliseconds();

  const hourStr = String(hour).padStart(2, '0');
  const minuteStr = String(minute).padStart(2, '0');
  const secondStr = String(second).padStart(2, '0');
  const millisecondStr = String(millisecond).padStart(3, '0');

  return `${year}-${month}-${day} ${hourStr}:${minuteStr}:${secondStr}.${millisecondStr}`;
}

export function convertToCurrentTimezone(dateString: Date | string) {
  const tokyoTimeString = dateString + '+09:00';

  return `${new Date(tokyoTimeString)}`;
}

export function getCurrentTimeInJapan() {
  const currentDate = new Date();

  const japanTime = currentDate.toLocaleString('en-CA', {
    timeZone: 'Asia/Tokyo',
    hour12: false,
  });

  return japanTime.replace(',', '');
}
export const isDateInFutureOrToday = (inputDate: Date | string): boolean => {
  const currentDate = new Date();

  const dateToCompare =
    typeof inputDate === 'string' ? new Date(inputDate) : inputDate;

  if (isNaN(dateToCompare.getTime())) {
    // Handle error
  }

  return dateToCompare >= currentDate;
};
export function formatShowDateJapanese(date: Date | string): string {
  const newDate = new Date(date);
  const year = newDate.getFullYear();
  const month = String(newDate.getMonth() + 1).padStart(2, '0');
  const day = String(newDate.getDate()).padStart(2, '0');

  return `${year}年${month}月${day}日`;
}

export function formatShowDeadline(date: string | Date): string {
  const inputDate = new Date(date);

  inputDate.setHours(0, 0, 0, 0);

  const month = String(inputDate.getMonth() + 1).padStart(2, '0');
  const day = String(inputDate.getDate()).padStart(2, '0');
  return `${month}月${day}日`;
}
export function formatShowDeadlineTask(date: string | Date): string {
  const inputDate = new Date(date);
  const today = new Date();

  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  inputDate.setHours(0, 0, 0, 0);

  if (inputDate.getTime() === today.getTime()) {
    return '今日';
  }

  if (inputDate.getTime() === tomorrow.getTime()) {
    return '明日';
  }

  const month = String(inputDate.getMonth() + 1).padStart(2, '0');
  const day = String(inputDate.getDate()).padStart(2, '0');
  return `${month}月${day}日`;
}
export function formatShowStatisticTask(date: string | Date): string {
  const inputDate = new Date(date);
  const today = new Date();

  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  inputDate.setHours(0, 0, 0, 0);

  const month = String(inputDate.getMonth() + 1).padStart(2, '0');
  const day = String(inputDate.getDate()).padStart(2, '0');
  return `${month}月${day}日`;
}

export function formatShowDeadlineAllDayEvent(date: string | Date): string {
  const inputDate = new Date(date);
  const today = new Date();

  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  inputDate.setHours(0, 0, 0, 0);

  const day = String(inputDate.getDate()).padStart(2, '0');
  return `${day}日`;
}

export const compareWithCurrentDate = (inputDate: Date | string): boolean => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let compareDate: Date;
  if (typeof inputDate === 'string') {
    compareDate = new Date(inputDate);
    if (isNaN(compareDate.getTime())) return false;
  } else {
    compareDate = inputDate;
  }

  compareDate.setHours(0, 0, 0, 0);

  return compareDate.getTime() >= today.getTime();
};

export function getRandomDateTimeBetween(
  startDateTimeStr: string | null | undefined,
  endDateTimeStr: string | null | undefined,
): string {
  // Check if both values are null or undefined
  if (!startDateTimeStr && !endDateTimeStr) {
    // Handle error 'At least one of start or end dateTime must be provided.';
  }

  let startDatetime: Date;
  let endDatetime: Date;
  let newDate: Date;

  // If startDateTimeStr is null or undefined, set startDatetime to the current time (now)
  if (!startDateTimeStr) {
    endDatetime = new Date(endDateTimeStr as string);
    if (isNaN(endDatetime.getTime())) {
      // Handle error invalid end dateTime format.
    }

    newDate = new Date(new Date(endDatetime.getTime() - 1000).getTime());
  }
  // If endDateTimeStr is null or undefined, add 1 second to startDatetime
  else if (!endDateTimeStr) {
    startDatetime = new Date(startDateTimeStr);
    if (isNaN(startDatetime.getTime())) {
      // Handle error invalid start dateTime format.
    }

    newDate = new Date(new Date(startDatetime.getTime() + 1000).getTime());
  } else {
    startDatetime = new Date(startDateTimeStr);
    endDatetime = new Date(endDateTimeStr);

    if (isNaN(startDatetime.getTime()) || isNaN(endDatetime.getTime())) {
      // Handle error invalid date format. Please provide valid ISO dateTime strings.
    }

    if (startDatetime >= endDatetime) {
      // Handle error the start dateTime must be earlier than the end dateTime.
    }

    const randomMilliseconds = Math.floor(
      Math.random() * (endDatetime.getTime() - startDatetime.getTime()),
    );
    newDate = new Date(startDatetime.getTime() + randomMilliseconds);
  }

  return convertDateStringFull(newDate);
}

// Get date info
export function getDateInfo(date: Date) {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const weekdayNames: string[] = ['日', '月', '火', '水', '木', '金', '土'];
  const dayOfWeek = weekdayNames[date.getDay()];
  return { month, day, dayOfWeek };
}

// Remove time and compare between days
export function removeTimeAndCompareDates(
  firstDate: Date,
  secondDate: Date,
  targetDate: Date,
): boolean {
  firstDate.setHours(0, 0, 0, 0);
  secondDate.setHours(0, 0, 0, 0);
  targetDate.setHours(0, 0, 0, 0);

  return (
    firstDate.getTime() <= targetDate.getTime() &&
    targetDate.getTime() <= secondDate.getTime()
  );
}

// Subtract one day from a specific day
export function subtractOneDay(dateStr: string): Date {
  const date = new Date(dateStr);
  date.setDate(date.getDate() - 1);
  return date;
}

// convert duration to time
export function convertToJapaneseTime(timeString: string) {
  const [hours, minutes] = timeString.split(':').map(Number);

  const hourString = hours > 0 ? `${hours}時間` : '';
  const minuteString = minutes > 0 ? `${minutes}分` : '';

  return hourString || minuteString ? `${hourString}${minuteString}` : '0分';
}
export function convertToJapaneseValue(timeString: string): {
  hoursConvert: number;
  minutesConvert: number;
} {
  const [hours, minutes] = timeString.split(':').map(Number);

  return {
    hoursConvert: hours > 0 ? hours : 0,
    minutesConvert: minutes > 0 ? minutes : 0,
  };
}
// format time range
export function formatTime24h(dateString: string): string {
  const date = new Date(dateString);
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours} : ${minutes}`;
}
// combine Date and time
export const combineDateAndTime = (currentDate: Date, time: string): string => {
  const cleanedTime = time.replace(/\s*:\s*/g, ':').trim();

  const [hourStr = '0', minuteStr = '0'] = cleanedTime.split(':');

  const hour = parseInt(hourStr, 10) || 0;
  const minute = parseInt(minuteStr, 10) || 0;

  const year = currentDate.getFullYear();
  const month = String(currentDate.getMonth() + 1).padStart(2, '0');
  const day = String(currentDate.getDate()).padStart(2, '0');

  const formattedDate = `${year}-${month}-${day} ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

  return formattedDate;
};

export const isTimeEarlier = (startTime: string, EndTime: string): boolean => {
  const parseTime = (time: string): number => {
    const cleanedTime = time
      .replace(/\s*:\s*/g, ':')
      .replace(/\s*(AM|PM)\s*/i, ' $1')
      .trim();

    const [timePart, meridiem = ''] = cleanedTime.split(' ');
    const [hourStr, minuteStr = '0'] = timePart.split(':');

    let hour = parseInt(hourStr, 10);
    const minute = parseInt(minuteStr, 10);

    if (isNaN(hour) || isNaN(minute)) {
      // handle Error
    }

    const upperMeridiem = meridiem.toUpperCase();
    if (upperMeridiem === 'PM' && hour !== 12) hour += 12;
    if (upperMeridiem === 'AM' && hour === 12) hour = 0;

    return hour * 60 + minute;
  };

  const minuteStart = parseTime(startTime);
  const minutesEnd = parseTime(EndTime);

  return minuteStart < minutesEnd;
};

// Handle check EndTime > StartTime
export const isEndTimeLater = (startTime: string, endTime: string): boolean => {
  const parseTime = (time: string): number => {
    const cleanedTime = time
      .replace(/\s*:\s*/g, ':')
      .replace(/\s*(AM|PM)\s*/i, ' $1')
      .trim();

    const [timePart, meridiem = ''] = cleanedTime.split(' ');
    const [hourStr, minuteStr = '0'] = timePart.split(':');

    let hour = parseInt(hourStr, 10);
    const minute = parseInt(minuteStr, 10);

    if (isNaN(hour) || isNaN(minute)) {
      throw new Error(`Invalid time format: ${time}`);
    }

    const upperMeridiem = meridiem.toUpperCase();
    if (upperMeridiem === 'PM' && hour !== 12) hour += 12;
    if (upperMeridiem === 'AM' && hour === 12) hour = 0;

    return hour * 60 + minute;
  };

  return parseTime(endTime) > parseTime(startTime);
};

export function formatCurrentDay() {
  const currentDay = new Date();

  let hours = currentDay.getHours();
  const minutes = String(currentDay.getMinutes()).padStart(2, '0');

  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  const formattedHours = String(hours).padStart(2, '0');

  return `${formattedHours}:${minutes}${ampm}`;
}

// Convert date to Japanese format
export function convertDateToJapaneseFormat(date: Date): string {
  const month = date.getMonth() + 1;
  const day = date.getDate();

  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');

  return `${month}月${day}日 ${hours}:${minutes}`;
}

// Get time range for click date
export function getTimeRangeForClickDate(
  eventStart: Date,
  eventEnd: Date,
): string {
  const startDateStr = `${eventStart.getFullYear()}/${eventStart.getMonth() + 1}/${eventStart.getDate()}`;
  const endDateStr = `${eventEnd.getFullYear()}/${eventEnd.getMonth() + 1}/${eventEnd.getDate()}`;

  if (startDateStr == endDateStr) {
    const startHours = eventStart.getHours().toString().padStart(2, '0');
    const startMinutes = eventStart.getMinutes().toString().padStart(2, '0');
    const endHours = eventEnd.getHours().toString().padStart(2, '0');
    const endMinutes = eventEnd.getMinutes().toString().padStart(2, '0');
    return `${startHours}:${startMinutes} ~ ${endHours}:${endMinutes}`;
  }

  return `${convertDateToJapaneseFormat(eventStart)} ${
    eventEnd && `~ ${convertDateToJapaneseFormat(eventEnd)}`
  }`;
}

// Convert edit input type time
export const convertToMinutesNumber = (data: string | number): number => {
  if (typeof data === 'number') {
    return data;
  }

  const cleanedData = data.replace(/\s*:\s*/, ':').trim();

  if (/^\d{1,2}$/.test(cleanedData)) {
    return parseInt(cleanedData, 10) * 100;
  }

  if (/^\d{3,4}$/.test(cleanedData)) {
    const length = cleanedData.length;
    const hour = parseInt(cleanedData.slice(0, length - 2), 10);
    const minute = parseInt(cleanedData.slice(length - 2), 10);
    return hour * 100 + minute;
  }
  const timePattern = /^(\d{1,2}):(\d{2})\s?(AM|PM)?$/i;
  const match = cleanedData.match(timePattern);

  if (!match) {
    // Handle Error
    return 0;
  }

  const [_, hours, minutes, period] = match;
  let hour = parseInt(hours, 10);
  const minute = parseInt(minutes, 10);

  if (period) {
    if (period.toUpperCase() === 'PM' && hour !== 12) {
      hour += 12;
    } else if (period.toUpperCase() === 'AM' && hour === 12) {
      hour = 0;
    }
  }

  return hour * 100 + minute;
};

// Get submit level formatted date
export const getSubmitLevelFormattedDate = (date: Date) => {
  return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`;
};

// Format hours and minutes for event start and end time
export const formatHoursAndMinutesForDateTime = (date: Date) => {
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
};

// Calculate task and event's duration
export function calculateActualDuration(
  startedAt: string,
  pausedAt: string,
): number | string {
  const start = new Date(startedAt);
  const pause = pausedAt ? new Date(pausedAt) : new Date();

  const durationMs = pause.getTime() - start.getTime();

  const minutes = Math.floor((durationMs / (1000 * 60)) % 60);
  const hours = Math.floor(durationMs / (1000 * 60 * 60));
  return `${hours}時間 ${minutes}分`;
}
export function calculateActualDurationDaily(
  start: string,
  end: string,
): string {
  const [startHour, startMinute] = start.split(':').map(Number);
  const [endHour, endMinute] = end.split(':').map(Number);

  const startDate = new Date();
  startDate.setHours(startHour, startMinute, 0, 0);

  const endDate = new Date();
  endDate.setHours(endHour, endMinute, 0, 0);

  const durationMs = endDate.getTime() - startDate.getTime();

  const minutes = Math.floor((durationMs / (1000 * 60)) % 60);
  const hours = Math.floor(durationMs / (1000 * 60 * 60));

  return `${hours}時間 ${minutes}分`;
}

export function getNext30MinuteSlot(inputDate: Date): Date {
  const now = new Date();

  const diffInMinutes = Math.ceil(
    (now.getTime() - inputDate.getTime()) / 60000,
  );

  let addedMinutes = Math.ceil(diffInMinutes / 30) * 30;

  if (addedMinutes === diffInMinutes) {
    addedMinutes += 30;
  }

  const adjustedDate = new Date(inputDate);
  adjustedDate.setMinutes(adjustedDate.getMinutes() + addedMinutes);

  return adjustedDate;
}

export function isDateLessThanToday(date: Date): boolean {
  const currentDate = new Date();
  const inputDate = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  );
  const today = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth(),
    currentDate.getDate(),
  );

  return inputDate < today;
}

export const generateTimeOptionsAsObjects = (): OptionDropdownType[] => {
  const options: OptionDropdownType[] = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      options.push({ label: time, value: time });
    }
  }
  options.push({ label: '23:59', value: '23:59' });
  return options;
};

export const getFilteredTimeOptions = (
  selectedDate: Date,
): OptionDropdownType[] => {
  const allOptions = generateTimeOptionsAsObjects();
  const now = new Date();
  const isToday = isSameDay(selectedDate, now);

  if (!isToday) return allOptions;

  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  return allOptions.filter((option) => {
    const [hourStr, minuteStr] = String(option.value).split(':');
    const totalMinutes = parseInt(hourStr) * 60 + parseInt(minuteStr);
    return totalMinutes >= currentMinutes;
  });
};

export const isTodaySchedule = (date: Date) => {
  const today = new Date();
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
};

export const isYesterdaySchedule = (date: Date) => {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  return (
    date.getFullYear() === yesterday.getFullYear() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getDate() === yesterday.getDate()
  );
};
export const calculateTotalTime = (data: OptionDropdownType[]): string => {
  const timeToSeconds = (time: string): number => {
    if (!time) return 0;

    const [hh, mm, ss] = time.split(':').map(Number);
    return hh * 3600 + mm * 60 + ss;
  };

  const secondsToTime = (totalSeconds: number): string => {
    const hh = Math.floor(totalSeconds / 3600);
    const mm = Math.floor((totalSeconds % 3600) / 60);
    const ss = totalSeconds % 60;
    return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
  };

  const totalSeconds = data.reduce((sum, item) => {
    const timeStr = item.totalData ? item.totalData : '';
    return sum + timeToSeconds(timeStr);
  }, 0);

  return secondsToTime(totalSeconds);
};

export const formatDateToYMD = (dateString: Date | string) => {
  const date = new Date(dateString);

  if (isNaN(date.getTime())) {
    return;
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};
export function formatTimeToJapanese(time: string): string {
  const [hours, minutes, seconds] = time.split(':').map(Number);

  if (
    isNaN(hours) ||
    isNaN(minutes) ||
    isNaN(seconds) ||
    hours < 0 ||
    minutes < 0 ||
    seconds < 0 ||
    minutes >= 60 ||
    seconds >= 60
  ) {
    // Handle Error
  }

  const totalMinutes = hours * 60 + minutes + Math.floor(seconds / 60);

  const resultHours = Math.floor(totalMinutes / 60);
  const resultMinutes = totalMinutes % 60;

  return `${resultHours}時間${String(resultMinutes).padStart(2, '0')}分`;
}

export function sumDurations(data: StatisticCategoryInfo[]): string {
  if (data.length === 0) return '00:00:00';
  let totalSeconds = 0;

  data.forEach((item) => {
    const [hours, minutes, seconds] = item.duration.split(':').map(Number);
    totalSeconds += hours * 3600 + minutes * 60 + seconds;
  });

  const totalHours = Math.floor(totalSeconds / 3600);
  const totalMinutes = Math.floor((totalSeconds % 3600) / 60);
  const totalSecondsLeft = totalSeconds % 60;

  const formattedHours = String(totalHours).padStart(2, '0');
  const formattedMinutes = String(totalMinutes).padStart(2, '0');
  const formattedSeconds = String(totalSecondsLeft).padStart(2, '0');

  return `${formattedHours}:${formattedMinutes}:${formattedSeconds}`;
}

// Get category formatted date
export const getCategoryFormattedDate = (date: Date) => {
  return `${date.getFullYear()}年${String(date.getMonth() + 1).padStart(2, '0')}月${String(date.getDate()).padStart(2, '0')}日`;
};

// Get full formatted date
export const getFullFormattedDate = (date: Date) => {
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}年${month}月${day}日 ${hours}:${minutes}`;
};

// Get time date statistic
export const getDaysFromTimeOption = (
  option: TimeOptionsType,
  startDate?: Date,
  isEndDate?: boolean,
): number => {
  switch (option) {
    case TimeOptionsType.WEEK:
      return 7;
    case TimeOptionsType.MONTH:
      if (startDate) {
        const date = new Date(startDate);

        if (isEndDate) {
          date.setMonth(startDate.getMonth() - 1);
        } else {
          date.setMonth(startDate.getMonth() + 1);
        }
        if (date.getDate() !== startDate.getDate()) {
          return 31;
        }

        return Math.abs(
          Math.floor(
            (date.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
          ),
        );
      }
      return 30;

    case TimeOptionsType.HALF_YEAR:
      if (startDate) {
        const date = new Date(startDate);

        if (isEndDate) {
          date.setMonth(startDate.getMonth() - 6);
        } else {
          date.setMonth(startDate.getMonth() + 6);
        }

        return Math.abs(
          Math.floor(
            (date.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
          ),
        );
      }
      return 182;

    case TimeOptionsType.YEAR:
      if (startDate) {
        const date = new Date(startDate);

        if (isEndDate) {
          date.setFullYear(startDate.getFullYear() - 1);
        } else {
          date.setFullYear(startDate.getFullYear() + 1);
        }

        return Math.abs(
          Math.floor(
            (date.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
          ),
        );
      }
      return 365;

    case TimeOptionsType.MORE:
      return 0;

    default:
      return 0;
  }
};

// Get time date statistic compare before
export const handleSetStartDateBefore = (
  option: TimeOptionsType,
  startDate: Date,
) => {
  if (!startDate) return;

  const newStartDateBefore = new Date(startDate);

  switch (option) {
    case TimeOptionsType.WEEK:
      newStartDateBefore.setDate(newStartDateBefore.getDate() - 7);
      break;

    case TimeOptionsType.MONTH:
      newStartDateBefore.setMonth(newStartDateBefore.getMonth() - 1);
      break;

    case TimeOptionsType.HALF_YEAR:
      newStartDateBefore.setMonth(newStartDateBefore.getMonth() - 6);
      break;

    case TimeOptionsType.YEAR:
      newStartDateBefore.setFullYear(newStartDateBefore.getFullYear() - 1);
      break;

    default:
      break;
  }

  return newStartDateBefore;
};

// Get time date statistic compare start
export const handleSetStartDateAfter = (
  option: TimeOptionsType,
  startDate: Date,
) => {
  if (!startDate) return;

  const newStartDateAfter = new Date(startDate);

  switch (option) {
    case TimeOptionsType.WEEK:
      newStartDateAfter.setDate(newStartDateAfter.getDate() + 7);
      break;

    case TimeOptionsType.MONTH:
      newStartDateAfter.setMonth(newStartDateAfter.getMonth() + 1);
      break;

    case TimeOptionsType.HALF_YEAR:
      newStartDateAfter.setMonth(newStartDateAfter.getMonth() + 6);
      break;

    case TimeOptionsType.YEAR:
      newStartDateAfter.setFullYear(newStartDateAfter.getFullYear() + 1);
      break;

    default:
      break;
  }

  return newStartDateAfter;
};

export const getAdjustedStartDateDefault = () => {
  const today = new Date();

  if (today.getDate() === 31) {
    return new Date(today.getFullYear(), today.getMonth(), 1);
  }
  return new Date(
    new Date().setMonth(new Date().getMonth() - 1) + 24 * 60 * 60 * 1000,
  );
};

// Get Japanese week day
export function getJapaneseWeekDay(dayIndex: number) {
  const weekdayNames: string[] = ['月', '火', '水', '木', '金', '土', '日'];

  return weekdayNames[dayIndex];
}

// Calculate total durations for statistic
export const totalDurationsForStatistic = (durations: string[]) => {
  const totalSeconds = durations.reduce((acc, duration) => {
    const [hours, minutes, seconds] = duration.split(':').map(Number);
    return acc + hours * 3600 + minutes * 60 + seconds;
  }, 0);

  const hh = Math.floor(totalSeconds / 3600)
    .toString()
    .padStart(2, '0');
  const mm = Math.floor((totalSeconds % 3600) / 60)
    .toString()
    .padStart(2, '0');
  const ss = (totalSeconds % 60).toString().padStart(2, '0');

  return `${hh}:${mm}:${ss}`;
};

// Convert time to decimal
export function convertTimeToDecimal(timeString: string) {
  const [hours, minutes, seconds] = timeString.split(':').map(Number);
  return hours + minutes / 60 + seconds / 3600;
}

// Convert from number to Japanese time
export const convertFromNumberToJapaneseTime = (
  decimalHours: number,
): { formattedHours: string; formattedMinutes: string } => {
  const hours = Math.floor(decimalHours);
  const minutes = Math.round((decimalHours - hours) * 60);
  const formattedHours = String(hours).padStart(2, '0');
  const formattedMinutes = String(minutes).padStart(2, '0');

  return { formattedHours, formattedMinutes };
};

// Convert to Japanese date range
export const convertToJapaneseDateRange = (
  startDateStr: string,
  endDateStr: string,
): string => {
  const daysOfWeek = ['日', '月', '火', '水', '木', '金', '土'];

  const formatDate = (date: Date) => {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dayOfWeek = daysOfWeek[date.getDay()];
    return `${month}月${day}日(${dayOfWeek})`;
  };

  const endDate = new Date(endDateStr);
  const startDate = new Date(startDateStr);

  return `${formatDate(startDate)} ~ ${formatDate(endDate)}`;
};

export const convertToJapaneseMonthDate = (
  dateStr: string,
  showMonth: boolean,
) => {
  const daysOfWeek = ['日', '月', '火', '水', '木', '金', '土']; // Japanese days of the week
  const date = new Date(dateStr);

  const month = String(date.getMonth() + 1).padStart(2, '0'); // Ensure two digits
  const day = String(date.getDate()).padStart(2, '0');
  const dayOfWeek = daysOfWeek[date.getDay()]; // Get Japanese weekday

  return showMonth
    ? `${month}月${day}日(${dayOfWeek})`
    : `${day}日(${dayOfWeek})`;
};

export const subtractDurations = (
  standard: string,
  compare: string,
): string => {
  const parseTime = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes; // ignore seconds
  };

  const standardMinutes = parseTime(standard);
  const compareMinutes = parseTime(compare);
  let diffMinutes = standardMinutes - compareMinutes;

  const sign = diffMinutes < 0 ? '-' : '';
  diffMinutes = Math.abs(diffMinutes);

  const hh = String(Math.floor(diffMinutes / 60)).padStart(2, '0');
  const mm = String(diffMinutes % 60).padStart(2, '0');

  return `${sign}${hh}時間${mm}分`;
};

export const getMinuteDifferenceTime = (
  dateStart: Date | string,
  dateEnd: Date | string,
): number => {
  const d1 = new Date(dateStart);
  const d2 = new Date(dateEnd);

  if (isNaN(d1.getTime()) || isNaN(d2.getTime())) {
    // handle Error
  }

  const diffInMs = d2.getTime() - d1.getTime();
  return Math.round(Math.abs(diffInMs / (1000 * 60)));
};

export const convertToStatisticJapaneseLabels = (
  dateStr: string,
  viewBy: string,
  isEdge: boolean,
) => {
  const daysOfWeek = ['日', '月', '火', '水', '木', '金', '土']; // Japanese days of the week
  const date = new Date(dateStr);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0'); // Ensure two digits
  const day = String(date.getDate()).padStart(2, '0');
  const dayOfWeek = daysOfWeek[date.getDay()]; // Get Japanese weekday

  switch (viewBy) {
    case StatisticViewOptions.DAY:
    case StatisticViewOptions.WEEK:
      return isEdge
        ? `${month}月${day}日(${dayOfWeek})`
        : `${day}日(${dayOfWeek})`;
    case StatisticViewOptions.MONTH:
      return `${year}年${month}月${day}日`;
    default:
      return '';
  }
};

export const compareAndSetDate = (start: Date, end: Date): Date => {
  const ONE_DAY = 1000 * 60 * 60 * 24;
  const diffInDays = (end.getTime() - start.getTime()) / ONE_DAY;
  if (diffInDays > 365) {
    const newDateB = new Date(start);
    newDateB.setDate(newDateB.getDate() + 365);
    return newDateB;
  }
  return end;
};
export function isDateInPast(date: Date) {
  return new Date(date) < new Date();
}
export function isTimeEarlierToday(date: Date) {
  const now = new Date();
  const isSameDay =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();
  if (isSameDay) {
    return date.getTime() < now.getTime();
  }

  return false;
}
export function formatLocalDate(dateInput: Date | string) {
  const date = new Date(dateInput);

  const pad = (value: number) => value.toString().padStart(2, '0');

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function splitEvent(event: TaskTimeSchedule): TaskTimeSchedule[] {
  const results: TaskTimeSchedule[] = [];

  let currentStart = event.start;
  const endTime = event.end;
  let index = 0;

  while (!isSameDay(currentStart, endTime)) {
    const endOfCurrentDay = endOfDay(currentStart);

    results.push({
      ...event,
      uuid: index === 0 ? event.uuid : uuidv4(),
      id: index === 0 ? event.id : uuidv4(),
      start: currentStart,
      end: endOfCurrentDay,
      planStartDate: String(currentStart),
      planEndDate: String(endOfCurrentDay),
    });

    currentStart = startOfDay(addDays(currentStart, 1));
    index++;
  }

  results.push({
    ...event,
    uuid: index === 0 ? event.uuid : uuidv4(),
    id: index === 0 ? event.id : uuidv4(),
    start: currentStart,
    end: endTime,
    planStartDate: String(currentStart),
    planEndDate: String(endTime),
  });

  return results;
}
// Split multi event all day
export function splitMultiDayEventsArray(events: TaskTimeSchedule[]): {
  allEvents: TaskTimeSchedule[];
  splittedEvents: TaskTimeSchedule[];
} {
  const allEvents: TaskTimeSchedule[] = [];
  const splittedEvents: TaskTimeSchedule[] = [];

  for (const event of events) {
    if (
      isSameDay(event.start, event.end) ||
      event.type == ItemStartType.SCHEDULE
    ) {
      allEvents.push(event);
    } else {
      const parts = splitEvent(event);
      allEvents.push(...parts);
      splittedEvents.push(...parts);
    }
  }

  return { allEvents, splittedEvents };
}
export const convertTimeToTodayDate = (time: string): Date => {
  const cleanedTime = time.replace(/\s*:\s*/g, ':').trim();
  const [hourStr = '0', minuteStr = '0'] = cleanedTime.split(':');

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const day = now.getDate();

  const hour = parseInt(hourStr, 10);
  const minute = parseInt(minuteStr, 10);

  return new Date(year, month, day, hour, minute);
};

// Check startTime  < endTime  < now

export const isEndTimeValidNow = (
  startTime: string,
  endTime: string,
  now: Date = new Date(),
): boolean => {
  const parseTime = (time: string): number => {
    const cleanedTime = time
      .replace(/\s*:\s*/g, ':')
      .replace(/\s*(AM|PM)\s*/i, ' $1')
      .trim();

    const [timePart, meridiem = ''] = cleanedTime.split(' ');
    const [hourStr, minuteStr = '0'] = timePart.split(':');

    let hour = parseInt(hourStr, 10);
    const minute = parseInt(minuteStr, 10);

    if (isNaN(hour) || isNaN(minute)) {
      throw new Error('Invalid time format');
    }

    const upperMeridiem = meridiem.toUpperCase();
    if (upperMeridiem === 'PM' && hour !== 12) hour += 12;
    if (upperMeridiem === 'AM' && hour === 12) hour = 0;

    return hour * 60 + minute;
  };

  const minuteStart = parseTime(startTime);
  const minuteEnd = parseTime(endTime);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  // ✅ endTime  > startTime  < now
  return minuteEnd > minuteStart && minuteEnd < nowMinutes;
};

export const isOverlappingWithOthers = ({
  itemCompare,
  items,
}: {
  itemCompare: {
    uuid: string;
    taskId: number;
    start: Date;
    end: Date;
  };
  items: TaskTimeSchedule[];
}): boolean => {
  return items.some((item) => {
    if (
      item.uuid === itemCompare.uuid ||
      item.taskId !== itemCompare.taskId ||
      item.resourceId !== ItemScheduleType.ACTUAL
    ) {
      return false;
    }
    return (
      itemCompare.start < new Date(item.planEndDate as string) &&
      itemCompare.end > new Date(item.planStartDate as string)
    );
  });
};

// Convert duration to total minutes
export const convertDurationToTotalMinutes = (duration: string) => {
  const [hours, minutes, seconds] = duration.split(':').map(Number);
  return hours * 60 + minutes + seconds / 60; // Convert to total minutes
};

// Check whether current time within event
export const isCurrentTimeWithinEvent = (event: {
  start: Date | null;
  end: Date | null;
}): boolean => {
  const now = new Date();

  const eventStart = event.start;
  const eventEnd = event.end;

  if (!(eventStart instanceof Date) || isNaN(eventStart.getTime())) {
    return false;
  }

  const startTime = eventStart.getTime();
  const endTime =
    eventEnd instanceof Date && !isNaN(eventEnd.getTime())
      ? eventEnd.getTime()
      : startTime; // fallback to startTime if end is invalid

  const nowTime = now.getTime();

  return nowTime >= startTime && nowTime <= endTime;
};

// Get date info with detail
export function getDateInfoFull(date: Date): DateInfo {
  const year: number = date.getFullYear();
  const month: number = date.getMonth() + 1;
  const day: number = date.getDate();

  const weekdaysJapanese: string[] = ['日', '月', '火', '水', '木', '金', '土'];
  const weekday: string = weekdaysJapanese[date.getDay()];

  return {
    year,
    month,
    day,
    weekday,
  };
}
