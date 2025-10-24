import { jwtDecode } from 'jwt-decode';
import { format, parseISO } from 'date-fns';
import { FieldErrors, Path, UseFormSetError } from 'react-hook-form';

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
export const formatJapaneseDateRange = (
  startDate: string | null,
  endDate: string | null,
) => {
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

export const normalizeJapaneseText = (str: string) => str.normalize('NFC');

export const getErrorMessage = (
  errors: FieldErrors,
  fieldName: string,
): string | undefined => {
  if (!errors) return undefined;
  // Handle nested field names like "additional_qualifications.0.qualification_id"
  if (fieldName.includes('.')) {
    return getFieldArrayErrorMessage(errors, fieldName);
  }

  const error = errors[fieldName];
  if (Array.isArray(error)) {
    return error[0];
  }
  if (error?.message) {
    return error.message as string;
  }
  return undefined;
};

export const flattenErrors = (
  obj: any,
  parentKey = '',
): Record<string, string[]> => {
  return Object.entries(obj).reduce(
    (acc, [key, value]) => {
      const newKey = parentKey ? `${parentKey}.${key}` : key;

      if (Array.isArray(value)) {
        acc[newKey] = value;
      } else if (typeof value === 'object' && value !== null) {
        Object.assign(acc, flattenErrors(value, newKey));
      }
      return acc;
    },
    {} as Record<string, string[]>,
  );
};

export const getFieldArrayErrorMessage = (
  errors: FieldErrors,
  fieldName: string,
): string | undefined => {
  const path = fieldName.split('.');
  let error: any = errors;

  for (const key of path) {
    if (error?.[key] == null) return undefined;
    error = error[key];
  }

  // Handle array errors
  if (Array.isArray(error)) {
    return error[0];
  }

  // Handle error objects with message
  if (error?.message) {
    return error.message;
  }

  // Handle case where error is an object without message
  if (error && typeof error === 'object') {
    // Check if it's a validation error object
    if (error.type && error.message) {
      return error.message;
    }
    // If it's just an object, try to extract meaningful error
    if (error && typeof error === 'object') {
      const possibleKeys = ['error', 'detail', 'reason'];
      for (const key of possibleKeys) {
        if (error[key]) return String(error[key]);
      }
      return 'Invalid input';
    }
    return 'Invalid input';
  }

  return undefined;
};

// Convert server error keys to form field keys
export const mapServerErrorKeyToFormKey = (key: string): string => {
  return key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
};

export const handleServerFormErrors = <T extends Record<string, any>>(
  error: any,
  setError: UseFormSetError<T>,
) => {
  if (!error?.response?.data) return;

  const flattened = flattenErrors(error.response.data);

  Object.entries(flattened).forEach(([field, messages]) => {
    const formKey = mapServerErrorKeyToFormKey(field) as Path<T>;
    setError(formKey, {
      type: 'server',
      message: messages[0],
    });
  });
};
