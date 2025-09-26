import { jwtDecode } from 'jwt-decode';
import { format, parseISO } from 'date-fns';

import {
  DATE_FORMAT,
  DATE_FORMAT_SERVER,
  MONTH_FORMAT_SERVER,
} from '@constants';
import { UNREGISTERED } from '@constants/message';

import { JwtDecode } from '@interfaces/auth';

export const setLocalStorage = (key: string, values: any) => {
  localStorage.setItem(key, JSON.stringify(values));
};

export const decodeToken = (token: string): JwtDecode => {
  return jwtDecode(token);
};
export const renderDate = (
  date: string | undefined,
  formatType = DATE_FORMAT,
) => {
  if (!date) return UNREGISTERED;
  return format(parseISO(date || ''), formatType);
};
export const formatDateServer = (
  date: Date | string | undefined | null,
): string => {
  if (!date) return '';
  return format(new Date(date), DATE_FORMAT_SERVER);
};
export const formatMonthServer = (
  date: Date | string | undefined | null,
): string => {
  if (!date) return '';
  return format(new Date(date), MONTH_FORMAT_SERVER);
};

// Function to check if content is empty
export const isContentEmpty = (content: string) => {
  const trimmedContent = content.replace(/<(.|\n)*?>/g, '').trim();
  return !trimmedContent;
};

// Format Japanese date range with start and end date
export const formatJapaneseDateRange = (startDate: string | null, endDate: string | null) => {
  if (!startDate) return '';

  const start = new Date(startDate);
  const startYear = start.getFullYear();
  const startMonth = String(start.getMonth() + 1).padStart(2, '0');

  if (!endDate) {
    return `${startYear}年${startMonth}月~`;
  }

  const end = new Date(endDate);
  const endYear = end.getFullYear();
  const endMonth = String(end.getMonth() + 1).padStart(2, '0');

  if (startYear === endYear) {
    return `${startYear}年${startMonth}月~${endMonth}月`;
  } else {
    return `${startYear}年${startMonth}月~${endYear}年${endMonth}月`;
  }
};