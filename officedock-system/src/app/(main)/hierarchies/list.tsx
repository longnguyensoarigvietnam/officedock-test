'use client';
import React, { Fragment, useContext, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useMutation } from 'react-query';
import Link from 'next/link';

import Button from '@components/common/Button';
import Dropdown from '@components/common/Dropdown';

import { apiRouters, pageRouters } from '@constants/routers';
import { ALL_TEAMS_OPTION } from '@constants';
import { PermissionsSystem } from '@constants/enums';

import { hasPermissionInArray } from '@utils';

import { OptionDropdownType } from '@interfaces/common';
import {
  OrganizationCategoryHierarchyDetail,
  StatisticCategory,
} from '@interfaces/hierarchy';

import useCreationOrganization from '@hooks/useCreationOrganization';
import { LoadingContext } from '@providers/LoadingProvider';
import HierarchyTable from './table';

import api from '@base/api';

interface rowDataType {
  id: number | string;
  large: {
    value: string | number;
    label: string;
    showBy: string;
    isValid: boolean;
  };
  medium: {
    value: string | number;
    label: string;
    showBy: string;
    isValid: boolean;
  };
  small: {
    value: string | number;
    label: string;
    showBy: string;
    isValid: boolean;
  };
  skills: OptionDropdownType[];
  color: string;
}

interface HierarchyDetail {
  id: number | string;
  name: string;
  statisticCategories: rowDataType[];
}

const ListHierarchy = () => {
  const { data: session } = useSession();

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
  const { creationOrganization } = useCreationOrganization({});

  useEffect(() => {
    if (creationOrganization) {
      const organizationList = creationOrganization.map((org) => {
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
  }, [creationOrganization]);

  const handleGetOrganizationCategoryHierarchyList = async () => {
    setIsLoading(true);
    const apiUrl = `${apiRouters.ORGANIZATION_CATEGORY_HIERARCHY_LIST}`;

    const { data } =
      await api.get<OrganizationCategoryHierarchyDetail[]>(apiUrl);
    return data;
  };

  const { mutate: getOrganizationCategoryHierarchyList } = useMutation(
    'getOrganizationCategoryHierarchyList',
    handleGetOrganizationCategoryHierarchyList,
    {
      onSuccess: async (data) => {
        const receivedHierarchyList = data.map((result) => ({
          id: result.id,
          name: result.name,
          statisticCategories: mapStatisticCategories(
            result.statisticCategories,
          ),
        }));

        setHierarchyList(receivedHierarchyList);
      },
      onSettled: () => setIsLoading(false),
    },
  );

  const mapStatisticCategories = (categories: StatisticCategory[]) => {
    return categories.map((org) => ({
      id: org.id,
      large: {
        label: org.largeStatisticCategory?.name || '',
        value: org.largeStatisticCategory?.uuid || '',
        showBy: 'pulldown',
        isValid: true,
      },
      medium: {
        label: org.mediumStatisticCategory?.name || '',
        value: org.mediumStatisticCategory?.uuid || '',
        showBy: 'pulldown',
        isValid: true,
      },
      small: {
        label: org.smallStatisticCategory?.name || '',
        value: org.smallStatisticCategory?.uuid || '',
        showBy: 'pulldown',
        isValid: true,
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

  const handleGetOrganizationCategoryHierarchyDetail = async (
    organizationId: number,
  ) => {
    setIsLoading(true);
    const apiUrl = `${apiRouters.ORGANIZATION_CATEGORY_HIERARCHY_DETAIL(organizationId)}`;

    const { data } = await api.get<OrganizationCategoryHierarchyDetail>(apiUrl);
    return data;
  };

  const { mutate: getOrganizationCategoryHierarchyDetail } = useMutation(
    'getOrganizationCategoryHierarchyDetail',
    handleGetOrganizationCategoryHierarchyDetail,
    {
      onSuccess: async (data) => {
        const statisticCategories = data.statisticCategories.map((org) => ({
          id: org.id,
          large: {
            label: org.largeStatisticCategory?.name || '',
            value: org.largeStatisticCategory?.uuid || '',
            showBy: 'pulldown',
            isValid: true,
          },
          medium: {
            label: org.mediumStatisticCategory?.name || '',
            value: org.mediumStatisticCategory?.uuid || '',
            showBy: 'pulldown',
            isValid: true,
          },
          small: {
            label: org.smallStatisticCategory?.name || '',
            value: org.smallStatisticCategory?.uuid || '',
            showBy: 'pulldown',
            isValid: true,
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
    },
  );

  useEffect(() => {
    if (selectedOrganizationOption.value == '') {
      getOrganizationCategoryHierarchyList();
    } else {
      getOrganizationCategoryHierarchyDetail(
        Number(selectedOrganizationOption.value),
      );
    }
  }, [
    getOrganizationCategoryHierarchyDetail,
    getOrganizationCategoryHierarchyList,
    selectedOrganizationOption.value,
  ]);

  return (
    <Fragment>
      <div className="sticky z-[21] top-[0px] px-8 pt-8 pb-3 bg-[#EBF1F7]">
        <div className="flex gap-4 items-center mb-5">
          <p className="text-black font-medium text-[26px]">
            業務カテゴリー設定
          </p>
          <div className="flex gap-2">
            <Link href={pageRouters.CATEGORY_MANAGEMENT.href}>
              <Button
                variant="outline"
                className={`w-[152px] !p-0 text-xs h-[28px] !text-[#77858F] !bg-transparent !border-[#77858F] border-[1px] !rounded-[20px]`}>
                社内共通カテゴリー
              </Button>
            </Link>

            <Link href={pageRouters.HIERARCHY_MANAGEMENT.href}>
              <Button
                variant="primary"
                className={`w-[152px] !p-0 text-xs h-[28px] !border-transparent text-white !rounded-[20px]`}>
                チームカテゴリー
              </Button>
            </Link>
          </div>
        </div>
        <div className="flex justify-between">
          <Dropdown
            options={organizationList}
            className="!w-[220px] !h-[34px] !py-0 !border-[1px] !border-[#77858F]"
            classNameOption="!w-[220px]"
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
                  className="w-[100px] h-[34px] !p-0 bg-white text-[#0068B6]">
                  インポート
                </Button>
              )}
            {session?.user.permissions &&
              hasPermissionInArray(
                session?.user.permissions,
                PermissionsSystem.CATEGORY_HIERARCHY_UPDATE,
              ) && (
                <Link href={pageRouters.EDIT_HIERARCHY.href}>
                  <Button className="w-[100px] h-[34px]">編集</Button>
                </Link>
              )}
          </div>
        </div>
      </div>
      <div className="px-8 mt-5">
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
