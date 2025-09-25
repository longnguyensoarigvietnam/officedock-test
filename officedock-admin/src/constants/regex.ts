export const EMAIL_REGEX = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,4}$/i;
export const PASSWORD_REGEX =
  /^(?=.*\d)(?=.*[a-z])(?=.*[!@#$%^&*()_+}{“:;’?/>.<,])(?=.*[a-zA-Z]).{8,}$/;
export const PHONE_REGEX = /^\d{10}$|^\d{11}$/;
export const HALF_WIDTH_DIGIT_REGEX = /^[0-9]$/;
export const ONLY_DIGITS_REGEX = /^[0-9]+$/;
