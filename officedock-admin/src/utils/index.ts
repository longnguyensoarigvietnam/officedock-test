import { jwtDecode } from 'jwt-decode';
import { format, parseISO } from 'date-fns';

import { DATE_FORMAT, DATE_FORMAT_SERVER } from '@constants';
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

// Function to check if content is empty
export const isContentEmpty = (content: string) => {
  const trimmedContent = content.replace(/<(.|\n)*?>/g, '').trim();
  return !trimmedContent;
};
