export const EMAIL_REGEX = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,4}$/i;
export const PASSWORD_REGEX =
  /^(?=.*\d)(?=.*[a-z])(?=.*[!@#$%^&*()_+}{“:;’?/>.<,])(?=.*[a-zA-Z]).{8,}$/;
export const PHONE_REGEX =
  /^\+?\d{1,4}?[-.\s]?\(?\d{1,4}\)?([-.\s]?\d{1,4}){1,3}$/;
