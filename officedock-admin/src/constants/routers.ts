export const pageRouters = {
  LOGIN: {
    name: 'ログイン',
    href: '/',
  },
  LOGIN_2FA: {
    name: 'ログイン認証',
    href: '/login/2fa',
  },
  FORGOT_PASSWORD: {
    name: 'パスワードの再設定',
    href: '/forgot-password',
  },
  RESET_PASSWORD: {
    name: 'パスワード再設定',
    href: '/reset-password',
  },
  COMPANY_MANAGEMENT: {
    name: '会社・契約管理',
    href: '/companies',
  },
  COMPANY: {
    name: '検索',
    href: '/companies',
  },
  COMPANY_DETAIL: {
    name: '会社情報',
    href: (id: string) => `/companies/${id}`,
  },
  COMPANY_EDIT: {
    name: '会社情報編集',
    href: (id: string) => `/companies/${id}/edit`,
  },
  COMPANY_CREATE: {
    name: '会社新規作成',
    href: '/companies/create',
  },
  USERS_MANAGEMENT: {
    name: 'ユーザー管理',
    href: '/users',
  },
  USER_CREATE: {
    name: '新規登録',
    href: '/users/create',
  },
  USER_EDIT: {
    name: 'ユーザー編集',
    href: (id: string) => `/users/${id}/edit`,
  },
  USER_DETAIL: {
    name: 'ユーザー詳細',
    href: (id: string) => `/users/${id}`,
  },
  TERMS_MANAGEMENT: {
    name: '利用規約管理',
    href: '/terms',
  },
  TERM_CREATE: {
    name: '利用規約作成',
    href: '/terms/create',
  },
  TERM_EDIT: {
    name: '利用規約編集',
    href: (id: string) => `/terms/${id}/edit`,
  },
  TERM_DETAIL: {
    name: '利用規約詳細',
    href: (id: string) => `/terms/${id}`,
  },
  POLICIES_MANAGEMENT: {
    name: 'プライバシーポリシー管理',
    href: '/policies',
  },
  POLICY_CREATE: {
    name: 'プライバシーポリシー作成',
    href: '/policies/create',
  },
  POLICY_EDIT: {
    name: 'プライバシーポリシー編集',
    href: (id: string) => `/policies/${id}/edit`,
  },
  POLICY_DETAIL: {
    name: 'プライバシーポリシー詳細',
    href: (id: string) => `/policies/${id}`,
  },
};

// For the API routers
export const apiRouters = {
  LOGIN: '/auth/login/',
  VERIFY_TOKEN: '/auth/verify-token/',
  LOGIN_OTP: '/auth/verify-login/',
  LOGIN_GOOGLE: '/auth/login/google/',
  LOGIN_GOOGLE_VERIFY: '/auth/login/google/verify/',
  FORGOT_PASSWORD: '/auth/forgot-password/',
  RESET_PASSWORD: '/auth/reset-password/',
  COMPANY_LIST: '/companies/',
  COMPANY_DETAIL: (id: string) => `/companies/${id}/`,
  USER_LIST: '/users/',
  USER_DETAIL: (id: string) => `/users/${id}/`,
  TERM_DETAIL: (id: string) => `/terms/${id}/`,
  TERM_LIST: '/terms/',
};
