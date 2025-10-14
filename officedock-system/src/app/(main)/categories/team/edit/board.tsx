'use client';

import { useContext, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from 'react-query';
import Link from 'next/link';
import { validate as isUUID } from 'uuid';

import { AxiosError } from 'axios';

import Dropdown from '@components/common/Dropdown';
import Button from '@components/common/Button';

import useCreationDataCommon from '@hooks/common/useCreationDataCommon';
import { useErrorToast } from '@hooks/useErrorToast';
import useOrganizationCategoryHierarchyDetail from '@hooks/useOrganizationCategoryHierarchyDetail';
import useOrganizationCategoryHierarchyList from '@hooks/useOrganizationCategoryHierarchyList';

import { OptionDropdownType } from '@interfaces/common';
import {
  OrganizationCategoryRow,
  StatisticCategory,
} from '@interfaces/hierarchy';
import { CreationDataSkill, Skill } from '@interfaces/skills';

import { AddCategoryHierarchyType, PermissionsSystem } from '@constants/enums';
import { apiRouters, pageRouters } from '@constants/routers';
import { ALL_TEAMS_OPTION } from '@constants';
import {
  ERROR_UPDATE_MESSAGE,
  SUCCESS_UPDATE_MESSAGE,
} from '@constants/message';

import { useSessionCache } from '@providers/SessionCacheProvider';
import { LoadingContext } from '@providers/LoadingProvider';
import { useToast } from '@providers/ToastProvider';

import { hasPermissionInArray } from '@utils';

import TableComponent from './form';

import api from '@base/api';

interface HierarchyDetail {
  id: number | string;
  name: string;
  statisticCategories: OrganizationCategoryRow[];
}

const EditHierarchyForm = () => {
  const { data: session } = useSessionCache();
  const [hierarchyList, setHierarchyList] = useState<HierarchyDetail[]>([]);
  const [categoryList, setCategoryList] = useState<OptionDropdownType[]>([]);
  const [selectedHierarchiesToDelete, setSelectedHierarchiesToDelete] =
    useState<string[]>([]);
  const [selectedHierarchiesToUpdate, setSelectedHierarchiesToUpdate] =
    useState<
      {
        organizationStatisticCategoryId: string | number | null;
        organizationId: number;
        largeStatisticCategory: {
          name: string;
          uuid: string;
        } | null;
        mediumStatisticCategory: {
          name: string;
          uuid: string;
        } | null;
        smallStatisticCategory: {
          name: string;
          uuid: string;
        } | null;
        color: string;
        skillIds: number[];
      }[]
    >([]);
  const [organizationList, setOrganizationList] = useState<
    OptionDropdownType[]
  >([]);
  const [dataOptionsSkill, setDataOptionsSkill] = useState<
    {
      organizationId: number | string;
      skills: {
        value: number;
        label: string;
      }[];
    }[]
  >([]);
  const [selectedOrganizationOption, setSelectedOrganizationOption] =
    useState<OptionDropdownType>({
      label: ALL_TEAMS_OPTION,
      value: '',
    });

  const { setIsLoading } = useContext(LoadingContext);
  const router = useRouter();
  const { showToast } = useToast();
  const showErrorToast = useErrorToast();
  const [isTyping, setIsTyping] = useState<boolean>(false);

  useCreationDataCommon({
    options: {
      get_statistic_categories: true,
      get_organization_skills: true,
      get_all_organizations: true,
    },
    screenName: 'category_hierarchy',
    onSuccess: (data) => {
      if (data.statisticCategories) {
        const options = data.statisticCategories.map((category) => {
          return {
            value: category.uuid,
            label: category.name,
            teamId: category.team,
          };
        });
        setCategoryList([...options]);
      }
      if (data.organizationSkills) {
        if (selectedOrganizationOption.label == ALL_TEAMS_OPTION) {
          setDataOptionsSkill(
            data.organizationSkills.map((item) => {
              return {
                organizationId: item.organization.id as number,
                skills: item.skills?.map((skill: Skill) => {
                  return {
                    value: skill.id,
                    label: skill.name,
                  };
                }),
              };
            }),
          );
        } else {
          const foundCreationData = (
            data.organizationSkills as CreationDataSkill[]
          ).find(
            (data) => data.organization.id == selectedOrganizationOption.value,
          );
          setDataOptionsSkill([
            {
              organizationId: selectedOrganizationOption.value,
              skills: foundCreationData?.skills
                ? foundCreationData?.skills.map((skill: Skill) => {
                    return {
                      value: skill.id,
                      label: skill.name,
                    };
                  })
                : [],
            },
          ]);
        }
      }
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

  const handleConfirmUpdateOrganizationCategoryHierarchy = () => {
    const tempSelectedHierarchiesToUpdate = selectedHierarchiesToUpdate.map(
      (hierarchy) => {
        return {
          ...hierarchy,
          organizationStatisticCategoryId: isUUID(
            hierarchy.organizationStatisticCategoryId as string,
          )
            ? null
            : hierarchy.organizationStatisticCategoryId,
        };
      },
    );
    if (
      selectedHierarchiesToDelete.length == 0 &&
      tempSelectedHierarchiesToUpdate.length == 0
    ) {
      router.push(pageRouters.TEAM_CATEGORY_MANAGEMENT.href);
    } else {
      updateOrganizationCategoryHierarchy({
        ids: selectedHierarchiesToDelete
          ? selectedHierarchiesToDelete
              .map((hierarchyId) =>
                !isUUID(hierarchyId) ? hierarchyId : undefined,
              )
              .filter((id): id is string => id !== undefined)
          : [],
        items: tempSelectedHierarchiesToUpdate,
      });
    }
  };

  const handleUpdateOrganizationCategoryHierarchyList = async ({
    items,
    ids,
  }: {
    items: {
      organizationStatisticCategoryId: string | number | null;
      organizationId: number;
      largeStatisticCategory: {
        name: string;
        uuid: string;
      } | null;
      mediumStatisticCategory: {
        name: string;
        uuid: string;
      } | null;
      smallStatisticCategory: {
        name: string;
        uuid: string;
      } | null;
      color: string;
      skillIds: number[];
    }[];
    ids: string[];
  }) => {
    setIsLoading(true);
    const { data } = await api.post(
      apiRouters.ORGANIZATION_CATEGORY_HIERARCHY_LIST,
      {
        items,
        ids,
      },
    );
    return data;
  };

  const { mutate: updateOrganizationCategoryHierarchy } = useMutation(
    'updateOrganizationCategoryHierarchy',
    handleUpdateOrganizationCategoryHierarchyList,
    {
      onSuccess: async () => {
        setSelectedHierarchiesToDelete([]);
        setSelectedHierarchiesToUpdate([]);
        showToast({
          description: SUCCESS_UPDATE_MESSAGE,
        });
        router.push(pageRouters.TEAM_CATEGORY_MANAGEMENT.href);
      },
      onError: (error: AxiosError<any>) => {
        showErrorToast(error, ERROR_UPDATE_MESSAGE);
      },
      onSettled: () => {
        setIsLoading(false);
      },
    },
  );

  // Helper function for mapping statistic categories
  const mapStatisticCategories = (categories: StatisticCategory[]) => {
    return categories.map((org) => ({
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
      small: {
        label: org.smallStatisticCategory?.name || '',
        value: org.smallStatisticCategory?.uuid || '',
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
    conditions: [Boolean(selectedOrganizationOption.value)],
    onSuccess: async (data) => {
      const statisticCategories = data.statisticCategories.map((org) => ({
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
        small: {
          label: org.smallStatisticCategory?.name || '',
          value: org.smallStatisticCategory?.uuid || '',
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
    <div className="flex flex-col h-full">
      <div className="sticky z-[21] top-[0px] px-10 pt-8 pb-3 bg-[#E6F3FB]">
        <div className="flex gap-4 items-center mb-5">
          <p className="text-black font-medium text-[26px]">
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

        <div className="flex justify-between items-center">
          <div>
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
          </div>

          <div className="flex justify-center gap-3 items-center">
            <Link href={pageRouters.TEAM_CATEGORY_MANAGEMENT.href}>
              <Button
                variant="outline"
                className="w-[100px] !p-0 !h-[34px]"
                onClick={() => {
                  setSelectedHierarchiesToUpdate([]);
                  setSelectedHierarchiesToDelete([]);
                }}>
                キャンセル
              </Button>
            </Link>
            <Button
              variant="primary"
              className="w-[100px] !p-0 !h-[34px] border-none"
              style={{ boxShadow: '0px 1px 5px 0px #00000033' }}
              disabled={isTyping}
              onClick={handleConfirmUpdateOrganizationCategoryHierarchy}>
              保存
            </Button>
          </div>
        </div>
      </div>
      <div className="px-10 mt-5">
        {selectedOrganizationOption.value === '' ? (
          <div className="flex flex-col gap-5">
            {hierarchyList.map((data) => (
              <TableComponent
                key={data.id}
                hierarchyList={data}
                categoryList={categoryList}
                dataOptionsSkill={
                  dataOptionsSkill.find(
                    (options) => options.organizationId == data.id,
                  )?.skills || []
                }
                organizationName={data.name}
                setIsTyping={setIsTyping}
                setHierarchyList={setHierarchyList}
                setSelectedHierarchiesToDelete={setSelectedHierarchiesToDelete}
                setSelectedHierarchiesToUpdate={setSelectedHierarchiesToUpdate}
              />
            ))}
          </div>
        ) : (
          <TableComponent
            hierarchyList={hierarchyList[0]}
            organizationName={hierarchyList[0].name}
            categoryList={categoryList}
            dataOptionsSkill={
              dataOptionsSkill.find(
                (options) => options.organizationId == hierarchyList[0].id,
              )?.skills || []
            }
            setIsTyping={setIsTyping}
            setHierarchyList={setHierarchyList}
            setSelectedHierarchiesToDelete={setSelectedHierarchiesToDelete}
            setSelectedHierarchiesToUpdate={setSelectedHierarchiesToUpdate}
          />
        )}
      </div>
    </div>
  );
};

export default EditHierarchyForm;
