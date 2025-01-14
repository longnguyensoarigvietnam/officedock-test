import {
  EMAIL_INVALID_MESSAGE,
  EMAIL_IS_REQUIRED_MESSAGE,
  PASSWORD_MIN_LENGTH_MESSAGE,
  PASSWORD_REQUIRED_MESSAGE,
  PASSWORD_WRONG_FORMAT,
} from '@constants/message';
import { PASSWORD_MIN_LENGTH } from '@constants';
import { EMAIL_REGEX, PASSWORD_REGEX } from '@constants/regex';

export const emailRules = (
  isRequired = false,
  requireMsg = EMAIL_IS_REQUIRED_MESSAGE,
  patternMsg = EMAIL_INVALID_MESSAGE,
) => {
  return {
    ...(isRequired && { required: requireMsg }),
    pattern: {
      value: EMAIL_REGEX,
      message: patternMsg,
    },
  };
};

export const passwordLoginRules = (isRequired = false) => {
  return {
    ...(isRequired && { required: PASSWORD_REQUIRED_MESSAGE }),
  };
};

export const passwordRegisterRules = (isRequired = false) => {
  return {
    ...(isRequired && { required: PASSWORD_REQUIRED_MESSAGE }),
    minLength: {
      value: PASSWORD_MIN_LENGTH,
      message: PASSWORD_MIN_LENGTH_MESSAGE,
    },
    pattern: {
      value: PASSWORD_REGEX,
      message: PASSWORD_WRONG_FORMAT,
    },
  };
};

// TODO : Update type for value
export const handlePreventInputText = (e: any): void => {
  if (
    e.key === 'Backspace' ||
    e.key === 'Tab' ||
    e.key === 'Enter' ||
    e.key === 'Delete' ||
    e.key === 'ArrowLeft' ||
    e.key === 'ArrowRight'
  ) {
    return;
  }
  if (
    (e.ctrlKey || e.metaKey) &&
    (e.key === 'c' || e.key === 'v' || e.key === 'a')
  ) {
    return;
  }
  if (isNaN(Number(e.key)) || e.key === 'e') {
    e.preventDefault();
  }
};

export const handleRemoveText = (e: any): void => {
  setTimeout(() => {
    const input = e.target as HTMLInputElement;
    input.value = input.value.replace(/[^0-9]/g, '');
  }, 0);
};
