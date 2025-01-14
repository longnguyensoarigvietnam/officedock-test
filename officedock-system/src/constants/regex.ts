export const EMAIL_REGEX =
  /^(?!.*\.\.)[a-zA-Z0-9+_.-]+(?:[._-][a-zA-Z0-9+_.-]+)*@[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(\.[a-zA-Z]{2,})?$/;
export const PASSWORD_REGEX =
  /^(?=.*\d)(?=.*[a-z])(?=.*[!@#$%^&*()_+}{“:;’?/>.<,])(?=.*[a-zA-Z]).{8,}$/;
export const ONLY_DIGITS_REGEX = /^\d*$/;
