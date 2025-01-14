import { pageRouters } from './routers';

export const breadcrumbsData = {
  [pageRouters.COMPANY_MANAGEMENT.href]: {
    ...pageRouters.COMPANY_MANAGEMENT,
    current: false,
  },
  [pageRouters.COMPANY_DETAIL.href('id')]: {
    ...pageRouters.COMPANY_DETAIL,
    href: pageRouters.COMPANY_DETAIL.href('id'),
    current: false,
  },
  [pageRouters.COMPANY_EDIT.href('id')]: {
    ...pageRouters.COMPANY_EDIT,
    href: pageRouters.COMPANY_EDIT.href('id'),
    current: false,
    removeBefore: true,
  },
  [pageRouters.USERS_MANAGEMENT.href]: {
    ...pageRouters.USERS_MANAGEMENT,
    current: false,
  },
  [pageRouters.USER_CREATE.href]: {
    ...pageRouters.USER_CREATE,
    current: false,
  },
  [pageRouters.USER_DETAIL.href('id')]: {
    ...pageRouters.USER_DETAIL,
    href: pageRouters.USER_DETAIL.href('id'),
    current: false,
  },
  [pageRouters.USER_EDIT.href('id')]: {
    ...pageRouters.USER_EDIT,
    href: pageRouters.USER_EDIT.href('id'),
    current: false,
    removeBefore: true,
  },
};
