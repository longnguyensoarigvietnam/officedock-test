'use client';
import React, { Fragment, useContext, useState } from 'react';
import { useSessionCache } from '@providers/SessionCacheProvider';

import Link from 'next/link';

import Button from '@components/common/Button';
import ImageRound from '@components/common/ImageRound';

import { pageRouters } from '@constants/routers';
import { AddCategoryHierarchyType, PermissionsSystem } from '@constants/enums';

import { CalendarCategoryRow } from '@interfaces/hierarchy';

import { hasPermissionInArray } from '@utils';

import { LoadingContext } from '@providers/LoadingProvider';

import useCalendarCategoryHierarchyDetail from '@hooks/useCalendarCategoryDetail';

import HierarchyTable from './table';

interface HierarchyDetail {
  id: number | string;
  name: string;
  statisticCategories: CalendarCategoryRow[];
}

const ListHierarchy = () => {
  const { data: session } = useSessionCache();
  const { setIsLoading } = useContext(LoadingContext);

  const [hierarchyDetail, setHierarchyDetail] =
    useState<HierarchyDetail | null>(null);

  useCalendarCategoryHierarchyDetail({
    onSuccess: (data) => {
      const calendarCategoryHierarchy = data[0];
      const statisticCategories =
        calendarCategoryHierarchy.statisticCategories.map((org) => ({
          id: org.id,
          large: {
            label: org.largeStatisticCategory?.name || '',
            value: org.largeStatisticCategory?.uuid || '',
            showBy: AddCategoryHierarchyType.PULLDOWN,
          },
          medium: {
            label: org.mediumStatisticCategory?.name || '',
            value: org.mediumStatisticCategory?.uuid || '',
            showBy: AddCategoryHierarchyType.PULLDOWN,
          },
          color: org.color,
        }));
      setHierarchyDetail({
        id: calendarCategoryHierarchy.id,
        name: 'カレンダー',
        statisticCategories,
      });
    },
    onSettled: () => setIsLoading(false),
  });

  return (
    <Fragment>
      <div className="sticky z-[21] top-[0px] px-10 pt-8 pb-3 bg-[#E6F3FB]">
        <div className="flex gap-4 items-center mb-5">
          <p className="text-black font-medium text-[26px]">
            業務カテゴリー設定
          </p>
          <div className="flex gap-2">
            <Link href={pageRouters.CATEGORY_MANAGEMENT.href}>
              <Button
                variant="outline"
                className={`w-[128px] !p-0 text-xs h-[28px] !text-[#77858F] !bg-transparent !border-[#77858F] border-[1px] !rounded-[20px]`}>
                社内共通カテゴリー
              </Button>
            </Link>

            <Link href={pageRouters.TEAM_CATEGORY_MANAGEMENT.href}>
              <Button
                variant="outline"
                className={`w-[128px] !p-0 text-xs h-[28px] !text-[#77858F] !bg-transparent !border-[#77858F] border-[1px] !rounded-[20px]`}>
                チームカテゴリー
              </Button>
            </Link>

            {session?.user.permissions &&
              hasPermissionInArray(
                session?.user.permissions,
                PermissionsSystem.CATEGORY_HIERARCHY_VIEW,
              ) && (
                <Button
                  variant="primary"
                  className={`w-[140px] !p-0 text-xs h-[28px] !border-transparent text-white !rounded-[20px]`}>
                  カレンダーカテゴリー
                </Button>
              )}
          </div>
        </div>
        <div className="flex justify-end gap-2">
          {session?.user.permissions &&
            hasPermissionInArray(
              session?.user.permissions,
              PermissionsSystem.CATEGORY_HIERARCHY_ADD,
            ) && (
              <Button
                variant="outline"
                className="w-[120px] h-[34px] !p-0 !text-white !bg-[#77858F] !border-none">
                ダウンロード{' '}
                <ImageRound
                  name="Arrow down icon"
                  src={'/icons/white-arrow-down.svg'}
                  className="w-2 h-2 cursor-pointer ml-1"
                />
              </Button>
            )}
          {session?.user.permissions &&
            hasPermissionInArray(
              session?.user.permissions,
              PermissionsSystem.CATEGORY_HIERARCHY_UPDATE,
            ) && (
              <Link href={pageRouters.EDIT_CALENDAR_CATEGORY.href}>
                <Button className="w-[100px] h-[34px]">編集</Button>
              </Link>
            )}
        </div>
      </div>
      <div className="px-10 mt-5">
        {hierarchyDetail && (
          <HierarchyTable hierarchyDetail={hierarchyDetail} />
        )}
      </div>
    </Fragment>
  );
};

export default ListHierarchy;
