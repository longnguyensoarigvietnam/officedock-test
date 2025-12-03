'use client';
import React, { Fragment, useContext, useState } from 'react';

import Link from 'next/link';

import Button from '@components/common/Button';
import Dropdown from '@components/common/Dropdown';

import { pageRouters } from '@constants/routers';
import { ALL_TEAMS_OPTION } from '@constants';
import {
  AddCategoryHierarchyType,
  PermissionsSystem,
  ScreenName,
} from '@constants/enums';

import { hasPermissionInArray } from '@utils';

import { OptionDropdownType } from '@interfaces/common';
import {
  OrganizationCategoryRow,
  StatisticCategory,
} from '@interfaces/hierarchy';

import { LoadingContext } from '@providers/LoadingProvider';
import { useSessionCache } from '@providers/SessionCacheProvider';

import HierarchyTable from './table';

import useCreationDataCommon from '@hooks/common/useCreationDataCommon';
import useOrganizationCategoryHierarchyDetail from '@hooks/useOrganizationCategoryHierarchyDetail';
import useOrganizationCategoryHierarchyList from '@hooks/useOrganizationCategoryHierarchyList';

interface HierarchyDetail {
  id: number | string;
  name: string;
  statisticCategories: OrganizationCategoryRow[];
}

const ListHierarchy = () => {
  const { data: session } = useSessionCache();

  const [hierarchyList, setHierarchyList] = useState<HierarchyDetail[]>([]);
  const { setIsLoading } = useContext(LoadingContext);

  const [organizationList, setOrganizationList] = useState<
    OptionDropdownType[]
  >([]);

  // TODO: Update logic sort for multi column
  const [selectedOrganizationOption, setSelectedOrganizationOption] =
    useState<OptionDropdownType>({
      label: ALL_TEAMS_OPTION,
      value: '',
    });

  useCreationDataCommon({
    options: {
      get_all_organizations: true,
    },
    onSuccess: (data) => {
      if (data.allOrganizations) {
        const organizationList = data.allOrganizations.map((org) => {
          return {
            value: Number(org.id),
            label: org.name,
          };
        });
        setOrganizationList([
          {
            label: ALL_TEAMS_OPTION,
            value: '',
          },
          ...organizationList,
        ]);
      }
    },
  });

  const mapStatisticCategories = (categories: StatisticCategory[]) => {
    return categories.map((org) => ({
      id: org.id,
      large: {
        label: org.largeStatisticCategory?.name || '',
        value: org.largeStatisticCategory?.uuid || '',
        isHidden: org.largeStatisticCategory?.isHidden || false,
        showBy: AddCategoryHierarchyType.PULLDOWN,
      },
      medium: {
        label: org.mediumStatisticCategory?.name || '',
        value: org.mediumStatisticCategory?.uuid || '',
        isHidden: org.mediumStatisticCategory?.isHidden || false,
        showBy: AddCategoryHierarchyType.PULLDOWN,
      },
      small: {
        label: org.smallStatisticCategory?.name || '',
        value: org.smallStatisticCategory?.uuid || '',
        isHidden: org.smallStatisticCategory?.isHidden || false,
        showBy: AddCategoryHierarchyType.PULLDOWN,
      },
      skills: org.skills.map((skill) => {
        return {
          label: skill.name,
          value: skill.id,
        };
      }),
      color: org.color,
    }));
  };

  useOrganizationCategoryHierarchyDetail({
    organizationId: Number(selectedOrganizationOption.value),
    currentScreen: ScreenName.ALL,
    conditions: [Boolean(selectedOrganizationOption.value)],
    onSuccess: async (data) => {
      const statisticCategories = data.statisticCategories.map((org) => ({
        id: org.id,
        large: {
          label: org.largeStatisticCategory?.name || '',
          value: org.largeStatisticCategory?.uuid || '',
          isHidden: org.largeStatisticCategory?.isHidden || false,
          showBy: AddCategoryHierarchyType.PULLDOWN,
        },
        medium: {
          label: org.mediumStatisticCategory?.name || '',
          value: org.mediumStatisticCategory?.uuid || '',
          isHidden: org.mediumStatisticCategory?.isHidden || false,
          showBy: AddCategoryHierarchyType.PULLDOWN,
        },
        small: {
          label: org.smallStatisticCategory?.name || '',
          value: org.smallStatisticCategory?.uuid || '',
          isHidden: org.smallStatisticCategory?.isHidden || false,
          showBy: AddCategoryHierarchyType.PULLDOWN,
        },
        skills: org.skills.map((skill) => {
          return {
            label: skill.name,
            value: skill.id,
          };
        }),
        color: org.color,
      }));
      setHierarchyList([
        {
          id: data.id,
          name: data.name,
          statisticCategories,
        },
      ]);
    },
    onSettled: () => {
      setIsLoading(false);
    },
  });

  useOrganizationCategoryHierarchyList({
    conditions: [Boolean(selectedOrganizationOption.value == '')],
    currentScreen: ScreenName.ALL,
    onSuccess: async (data) => {
      const receivedHierarchyList = data.map((result) => ({
        id: result.id,
        name: result.name,
        statisticCategories: mapStatisticCategories(result.statisticCategories),
      }));

      setHierarchyList(receivedHierarchyList);
    },
    onSettled: () => setIsLoading(false),
  });

  return (
    <Fragment>
      <div className="sticky z-[21] top-[0px] px-10 pt-8 pb-3 bg-[#E6F3FB]">
        <div className="flex gap-4 items-center mb-5">
          <p className="text-black font-medium text-[26px] leading-[1]">
            業務カテゴリー設定
          </p>
          <div className="flex gap-2 bg-white w-fit p-[6px] rounded-[20px]">
            <Link href={pageRouters.CATEGORY_MANAGEMENT.href}>
              <Button
                variant="outline"
                className={`w-[128px] !p-0 text-xs h-[28px] !font-bold !text-[#77858F] !bg-[#EBF1F7] border-none !rounded-[20px]`}>
                社内共通カテゴリー
              </Button>
            </Link>

            <Button
              variant="primary"
              className={`w-[128px] !p-0 text-xs h-[28px] !font-bold text-white border-none !rounded-[20px]`}>
              チームカテゴリー
            </Button>

            {session?.user.permissions &&
              hasPermissionInArray(
                session?.user.permissions,
                PermissionsSystem.CATEGORY_HIERARCHY_VIEW,
              ) && (
                <Link href={pageRouters.CALENDAR_CATEGORY_MANAGEMENT.href}>
                  <Button
                    variant="outline"
                    className={`w-[140px] !p-0 text-xs h-[28px] !font-bold !text-[#77858F] !bg-[#EBF1F7] border-none !rounded-[20px]`}>
                    カレンダーカテゴリー
                  </Button>
                </Link>
              )}
          </div>
        </div>
        <div className="flex justify-between">
          <Dropdown
            options={organizationList}
            className="!w-[220px] !h-[34px] !text-sm !py-0 !border-[1px] !border-[#77858F]"
            classNameOption="!w-[220px] !text-sm"
            selectedOption={organizationList.find(
              (element) => element.value == selectedOrganizationOption.value,
            )}
            onChange={(e) => {
              setSelectedOrganizationOption({
                label: e.label,
                value: e.value,
              });
            }}
          />
          <div className="flex gap-2">
            {session?.user.permissions &&
              hasPermissionInArray(
                session?.user.permissions,
                PermissionsSystem.CATEGORY_HIERARCHY_ADD,
              ) && (
                <Button
                  variant="outline"
                  className="w-[100px] h-[34px] !p-0 bg-white text-primary">
                  インポート
                </Button>
              )}
            {session?.user.permissions &&
              hasPermissionInArray(
                session?.user.permissions,
                PermissionsSystem.CATEGORY_HIERARCHY_UPDATE,
              ) && (
                <Link href={pageRouters.EDIT_TEAM_CATEGORY.href}>
                  <Button className="w-[100px] h-[34px]">編集</Button>
                </Link>
              )}
          </div>
        </div>
      </div>
      <div className="px-10 mt-5">
        {selectedOrganizationOption.value === '' ? (
          <div className="flex flex-col gap-5">
            {hierarchyList.map((data) => (
              <HierarchyTable
                key={data.id}
                hierarchyList={data}
                organizationName={data.name}
              />
            ))}
          </div>
        ) : (
          <HierarchyTable
            hierarchyList={hierarchyList[0]}
            organizationName={hierarchyList[0].name}
          />
        )}
      </div>
    </Fragment>
  );
};

export default ListHierarchy;
