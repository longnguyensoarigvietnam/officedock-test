export const EMAIL_REGEX =
  /^(?!.*\.\.)[a-zA-Z0-9+_.-]+(?:[._-][a-zA-Z0-9+_.-]+)*@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*\.[a-zA-Z]{2,}$/;
export const PASSWORD_REGEX =
  /^(?=.*\d)(?=.*[a-z])(?=.*[!@#$%^&*()_+}{“:;’?/>.<,])(?=.*[a-zA-Z]).{8,}$/;
export const ONLY_DIGITS_REGEX = /^\d*$/;
export const MENTION_NAME_REGEX = /^[\w\s+\-*_/一-龯ぁ-んァ-ン々〆〤ー]+$/;
export const HIGHLIGHT_SEARCH_TERM_REGEX = /[.*+?^${}()|[\]\\]/g;
export const URL_REGEX = /(https?:\/\/[^\s]+)/g;
