export enum SessionStatus {
  LOADING = 'loading',
  AUTHENTICATED = 'authenticated',
  UNAUTHENTICATED = 'unauthenticated',
}
export enum ServerStatusCode {
  OK = 200,
  CREATED = 201,
  NO_CONTENT = 204,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  ALREADY_EXISTS = 409,
  INTERNAL_SERVER_ERROR = 500,
}
export enum AuthenticationTypes {
  EMAIL = 'メールアドレス',
}

export enum VerifyOTP {
  EMAIL = 1,
  OTP = 2,
  DONE = 3,
}

export enum StatusCompany {
  ALREADY = '締結済み',
  NOT_YET = '未締結',
}

export enum StatusTerm {
  DRAFT = 'ドラフト',
  PUBLIC = '公開',
}

export enum TermType {
  TERM_OF_USE = 'TERM_OF_USE',
  PRIVACY_POLICY = 'PRIVACY_POLICY',
}

export enum VerifyTokenType {
  LOGIN = 'LOGIN',
  RESET_PASSWORD = 'RESET_PASSWORD',
}
