'use client';
import React, { Fragment, useContext, useState } from 'react';
import { AxiosError } from 'axios';
import Link from 'next/link';

import Button from '@components/common/Button';

import { pageRouters } from '@constants/routers';
import { AddCategoryHierarchyType, PermissionsSystem } from '@constants/enums';
import { ERROR_COMMON_MESSAGE } from '@constants/message';

import { CalendarCategoryRow } from '@interfaces/hierarchy';

import { hasPermissionInArray } from '@utils';

import { useSessionCache } from '@providers/SessionCacheProvider';
import { LoadingContext } from '@providers/LoadingProvider';

import useCalendarCategoryHierarchyDetail from '@hooks/useCalendarCategoryDetail';
import { useErrorToast } from '@hooks/useErrorToast';

import HierarchyTable from './table';

interface HierarchyDetail {
  id: number | string;
  name: string;
  statisticCategories: CalendarCategoryRow[];
}

const ListHierarchy = () => {
  const { data: session } = useSessionCache();
  const { setIsLoading } = useContext(LoadingContext);
  const showErrorToast = useErrorToast();

  const [hierarchyDetail, setHierarchyDetail] =
    useState<HierarchyDetail | null>(null);

  useCalendarCategoryHierarchyDetail({
    onSuccess: (data) => {
      const calendarCategoryHierarchy = data[0];

      // Step 1: filter out rows whose large is hidden
      const rows = calendarCategoryHierarchy.statisticCategories.filter(
        (category) => !category.largeStatisticCategory.isHidden,
      );

      // Step 2: group by large
      const groupedByLarge = rows.reduce(
        (acc, category) => {
          const largeUuid = category.largeStatisticCategory.uuid;
          if (!acc[largeUuid]) acc[largeUuid] = [];
          acc[largeUuid].push(category);
          return acc;
        },
        {} as Record<string, typeof rows>,
      );

      const finalList: any[] = [];

      Object.values(groupedByLarge).forEach((group) => {
        // Check if all medium are hidden
        const allMediumHidden = group.every(
          (item) => item.mediumStatisticCategory?.isHidden,
        );

        if (allMediumHidden) {
          // Keep only one row, with empty medium
          const base = group[0];
          finalList.push({
            id: base.id,
            large: {
              label: base.largeStatisticCategory?.name || '',
              value: base.largeStatisticCategory?.uuid || '',
              isHidden: false,
              showBy: AddCategoryHierarchyType.PULLDOWN,
            },
            medium: {
              label: '',
              value: '',
              isHidden: false,
              showBy: AddCategoryHierarchyType.PULLDOWN,
            },
            color: base.color,
          });
        } else {
          // Keep all rows but only those whose medium is NOT hidden
          group
            .filter((item) => !item.mediumStatisticCategory?.isHidden)
            .forEach((item) => {
              finalList.push({
                id: item.id,
                large: {
                  label: item.largeStatisticCategory?.name || '',
                  value: item.largeStatisticCategory?.uuid || '',
                  isHidden: item.largeStatisticCategory?.isHidden || false,
                  showBy: AddCategoryHierarchyType.PULLDOWN,
                },
                medium: {
                  label: item.mediumStatisticCategory?.name || '',
                  value: item.mediumStatisticCategory?.uuid || '',
                  isHidden: item.mediumStatisticCategory?.isHidden || false,
                  showBy: AddCategoryHierarchyType.PULLDOWN,
                },
                color: item.color,
              });
            });
        }
      });

      setHierarchyDetail({
        id: calendarCategoryHierarchy.id,
        name: 'カレンダー',
        statisticCategories: finalList,
      });
    },
    onError: (error: AxiosError) => {
      showErrorToast(error, ERROR_COMMON_MESSAGE);
    },
    onSettled: () => setIsLoading(false),
  });

  return (
    <Fragment>
      <div className="sticky z-[21] top-[0px] px-10 pt-8 pb-3 bg-[#E6F3FB]">
        <div className="flex gap-5 items-center mb-5">
          <p className="text-black font-medium text-[26px] leading-[1]">
            業務カテゴリー設定
          </p>
          <div className="flex gap-[6px] bg-white w-fit p-[6px] rounded-[20px]">
            <Link href={pageRouters.CATEGORY_MANAGEMENT.href}>
              <Button
                variant="outline"
                className={`w-[140px] !p-0 text-xs h-[28px] !font-bold !text-[#77858F] !bg-[#EBF1F7] border-none !rounded-[20px]`}>
                社内共通カテゴリー
              </Button>
            </Link>

            <Link href={pageRouters.TEAM_CATEGORY_MANAGEMENT.href}>
              <Button
                variant="outline"
                className={`w-[140px] !p-0 text-xs h-[28px] !font-bold !text-[#77858F] !bg-[#EBF1F7] border-none !rounded-[20px]`}>
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
                  className={`w-[140px] !p-0 text-xs h-[28px] !font-bold text-white border-none !rounded-[20px]`}>
                  カレンダーカテゴリー
                </Button>
              )}
          </div>
        </div>
        <div className="flex justify-end">
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
