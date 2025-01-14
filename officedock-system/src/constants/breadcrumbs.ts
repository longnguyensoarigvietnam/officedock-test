import { pageRouters } from './routers';

export const breadcrumbsData = {
  [pageRouters.USERS_MANAGEMENT.href]: {
    ...pageRouters.USERS_MANAGEMENT,
    current: false,
  },
  [pageRouters.CREATE_USER.href]: {
    ...pageRouters.CREATE_USER,
    current: false,
  },
  [pageRouters.EDIT_USER.href('id')]: {
    ...pageRouters.EDIT_USER,
    href: pageRouters.EDIT_USER.href('id'),
    current: false,
    removeBefore: true,
  },
  [pageRouters.DETAIL_USER.href('id')]: {
    ...pageRouters.DETAIL_USER,
    href: pageRouters.DETAIL_USER.href('id'),
    current: false,
  },
  [pageRouters.ORGANIZATION_MANAGEMENT.href]: {
    ...pageRouters.ORGANIZATION_MANAGEMENT,
    current: false,
  },
  [pageRouters.CREATE_ORGANIZATION.href]: {
    ...pageRouters.CREATE_ORGANIZATION,
    current: false,
  },
  [pageRouters.EDIT_ORGANIZATION.href('id')]: {
    ...pageRouters.EDIT_ORGANIZATION,
    href: pageRouters.EDIT_ORGANIZATION.href('id'),
    current: false,
    removeBefore: true,
  },
  [pageRouters.DETAIL_ORGANIZATION.href('id')]: {
    ...pageRouters.DETAIL_ORGANIZATION,
    href: pageRouters.DETAIL_ORGANIZATION.href('id'),
    current: false,
  },
  [pageRouters.TAGS_MANAGEMENT.href]: {
    ...pageRouters.TAGS_MANAGEMENT,
    current: false,
  },
  [pageRouters.CREATE_TAG.href]: {
    ...pageRouters.CREATE_TAG,
    current: false,
  },
  [pageRouters.EDIT_TAG.href('id')]: {
    ...pageRouters.EDIT_TAG,
    href: pageRouters.EDIT_TAG.href('id'),
    current: false,
    removeBefore: true,
  },
  [pageRouters.DETAIL_TAG.href('id')]: {
    ...pageRouters.DETAIL_TAG,
    href: pageRouters.DETAIL_TAG.href('id'),
    current: false,
  },
};
