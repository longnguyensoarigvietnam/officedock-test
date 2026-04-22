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

export enum CompanyTransactionType {
  INVOICE = 'INVOICE',
  PLAN = 'PLAN',
  POINT = 'POINT',
}

export enum CompanyStatus {
  PENDING_APPROVAL = '申請中',
  ACTIVE_CONTRACT = '契約中',
  RETRY_PAYMENT = '決済失敗',
  SUSPENDED = '利用停止中',
  CANCELLATION_PENDING = '解約予約中',
  CONTRACT_TERMINATED = '解約済',
  TEMPORARY_USAGE = '仮利用',
}

export enum SelectionBoxType {
  MONO_SELECT = 'monoSelect',
  MULTIPLE_SELECT = 'multipleSelect',
}

export enum CompanyPlan {
  CUSTOM_PLAN = 'カスタムプラン',
  NORMAL_PLAN = '通常プラン'
}