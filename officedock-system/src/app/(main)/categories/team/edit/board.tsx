'use client';

import { useContext, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from 'react-query';
import Link from 'next/link';
import { v4 as uuidv4, validate as isUUID } from 'uuid';

import { AxiosError } from 'axios';

import Dropdown from '@components/common/Dropdown';
import Button from '@components/common/Button';
import ImageRound from '@components/common/ImageRound';
import Switch from '@components/common/Switch';

import useCreationDataCommon from '@hooks/common/useCreationDataCommon';
import { useErrorToast } from '@hooks/useErrorToast';
import useOrganizationCategoryHierarchyDetail from '@hooks/useOrganizationCategoryHierarchyDetail';
import useOrganizationCategoryHierarchyList from '@hooks/useOrganizationCategoryHierarchyList';

import { OptionDropdownType } from '@interfaces/common';
import {
  HierarchyCategoryUpdatePayload,
  OrganizationCategoryRow,
  SelectedOrganizationCategoryRow,
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
  const [selectedHierarchiesToUpdate, setSelectedHierarchiesToUpdate] =
    useState<SelectedOrganizationCategoryRow[]>([]);
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
  const [isHiddenList, setIsHiddenList] = useState<boolean>(false);
  const [_isPending, startTransition] = useTransition();

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
            deletedAt: category.deletedAt
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
                skills: item.skills
                  ?.filter((skill) => skill.deletedAt == null)
                  ?.map((skill: Skill) => {
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
    if (tempSelectedHierarchiesToUpdate.length == 0) {
      router.push(pageRouters.TEAM_CATEGORY_MANAGEMENT.href);
    } else {
      updateOrganizationCategoryHierarchy({
        itemsToDelete: [],
        items: tempSelectedHierarchiesToUpdate,
      });
    }
  };

  const handleUpdateOrganizationCategoryHierarchyList = async ({
    items,
    itemsToDelete,
  }: HierarchyCategoryUpdatePayload) => {
    setIsLoading(true);
    const { data } = await api.post(
      apiRouters.ORGANIZATION_CATEGORY_HIERARCHY_LIST,
      {
        items,
        itemsToDelete,
      },
    );
    return data;
  };

  const { mutate: updateOrganizationCategoryHierarchy } = useMutation(
    'updateOrganizationCategoryHierarchy',
    handleUpdateOrganizationCategoryHierarchyList,
    {
      onSuccess: async () => {
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
    const result: any[] = [];

    const mapRow = (
      row: StatisticCategory,
      overrides = {},
      addNewHierarchy: boolean,
    ) => ({
      id: addNewHierarchy ? uuidv4() : row.id,
      large: {
        label: row.largeStatisticCategory?.name || '',
        value: row.largeStatisticCategory?.uuid || '',
        isHidden: row.largeStatisticCategory?.isHidden || false,
        showBy: AddCategoryHierarchyType.PULLDOWN,
      },
      medium: {
        label: row.mediumStatisticCategory?.name || '',
        value: row.mediumStatisticCategory?.uuid || '',
        isHidden: row.mediumStatisticCategory?.isHidden || false,
        showBy: AddCategoryHierarchyType.PULLDOWN,
      },
      small: {
        label: row.smallStatisticCategory?.name || '',
        value: row.smallStatisticCategory?.uuid || '',
        isHidden: row.smallStatisticCategory?.isHidden || false,
        showBy: AddCategoryHierarchyType.PULLDOWN,
      },
      skills: row.skills.map((skill) => ({
        label: skill.name,
        value: skill.id,
      })),
      color: row.color,
      ...overrides,
    });

    const largeGroups = categories.reduce(
      (acc, row) => {
        const largeUuid = row.largeStatisticCategory.uuid;
        if (!acc[largeUuid]) acc[largeUuid] = [];
        acc[largeUuid].push(row);
        return acc;
      },
      {} as Record<string, StatisticCategory[]>,
    );

    Object.values(largeGroups).forEach((largeGroup) => {
      const base = largeGroup[0];
      const largeHidden = base.largeStatisticCategory?.isHidden;

      const allMediumHidden = largeGroup.every(
        (r) => r.mediumStatisticCategory?.isHidden,
      );

      const allSmallHidden = largeGroup.every(
        (r) => r.smallStatisticCategory?.isHidden,
      );

      // ===== RULE 1 (Apply only if large is NOT hidden) =====
      if (!largeHidden && allMediumHidden && allSmallHidden) {
        // Continue to include the original hidden rows
        largeGroup.forEach((row) => {
          result.push(mapRow(row, {}, false));
        });
        // Then push the fallback special row BELOW normal rows
        result.push(
          mapRow(
            base,
            {
              medium: {
                label: '',
                value: '',
                isHidden: false,
                showBy: AddCategoryHierarchyType.PULLDOWN,
              },
              small: {
                label: '',
                value: '',
                isHidden: false,
                showBy: AddCategoryHierarchyType.PULLDOWN,
              },
              skills: [],
            },
            true,
          ),
        );

        return;
      }

      // Group by medium
      const mediumGroups = largeGroup.reduce(
        (acc, row) => {
          const mediumUuid = row.mediumStatisticCategory?.uuid || '__none__';
          const key = `${row.largeStatisticCategory.uuid}-${mediumUuid}`;
          if (!acc[key]) acc[key] = [];
          acc[key].push(row);
          return acc;
        },
        {} as Record<string, StatisticCategory[]>,
      );

      Object.values(mediumGroups).forEach((mediumGroup) => {
        const baseMedium = mediumGroup[0];
        const mediumHidden = baseMedium.mediumStatisticCategory?.isHidden;

        const allSmallHidden = mediumGroup.every(
          (r) => r.smallStatisticCategory?.isHidden,
        );

        // ===== RULE 2 (Apply only if large + medium NOT hidden) =====
        if (!largeHidden && !mediumHidden && allSmallHidden) {
          mediumGroup.forEach((row) => {
            result.push(mapRow(row, {}, false));
          });

          result.push(
            mapRow(
              baseMedium,
              {
                small: {
                  label: '',
                  value: '',
                  isHidden: false,
                  showBy: AddCategoryHierarchyType.PULLDOWN,
                },
                skills: [],
              },
              true,
            ),
          );

          return;
        }

        // Otherwise add normal visible rows
        mediumGroup.forEach((row) => {
          result.push(mapRow(row, {}, false));
        });
      });
    });

    return result;
  };

  useOrganizationCategoryHierarchyDetail({
    organizationId: Number(selectedOrganizationOption.value),
    conditions: [Boolean(selectedOrganizationOption.value)],
    onSuccess: async (data) => {
      setHierarchyList([
        {
          id: data.id,
          name: data.name,
          statisticCategories: mapStatisticCategories(data.statisticCategories),
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
        <div className="flex justify-between mb-5">
          <div className="flex gap-5 items-center">
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

              <Button
                variant="primary"
                className={`w-[140px] !p-0 text-xs h-[28px] !font-bold text-white border-none !rounded-[20px]`}>
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
          <div className="flex gap-[10px] items-center">
            <div className="flex items-center text-steel text-xs font-medium">
              <p>「</p>
              <ImageRound
                name="Hide"
                src={'/icons/dark-close-eye.svg'}
                className="w-[16px] h-[13px] ml-[2px] mr-1 hover:cursor-pointer"
              />
              <p>非表示カテゴリー」を表示</p>
            </div>
            <Switch
              sizeClassName="!w-[48px] !h-[28px]"
              toggleClassName="!w-5 !h-5 !ml-[2px]"
              className="!gap-0"
              labelClassName="!gap-0"
              enableColor="#228CDB"
              disableColor="#CDD7DC"
              enable={isHiddenList}
              onChange={(e) => {
                startTransition(() => setIsHiddenList(e));
              }}
            />
          </div>
        </div>

        <div className="flex justify-between items-center">
          <div>
            <Dropdown
              options={organizationList}
              className="!w-[220px] !h-[34px] !text-sm !py-0 !border-[1px] !border-steel"
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
          </div>

          <div className="flex justify-center gap-[10px] items-center">
            <Link href={pageRouters.TEAM_CATEGORY_MANAGEMENT.href}>
              <Button
                variant="outline"
                className="w-[100px] !p-0 !h-[34px]"
                onClick={() => {
                  setSelectedHierarchiesToUpdate([]);
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
                isHiddenList={isHiddenList}
                categoryList={categoryList}
                dataOptionsSkill={
                  dataOptionsSkill.find(
                    (options) => options.organizationId == data.id,
                  )?.skills || []
                }
                organizationName={data.name}
                setIsTyping={setIsTyping}
                setHierarchyList={setHierarchyList}
                setSelectedHierarchiesToUpdate={setSelectedHierarchiesToUpdate}
              />
            ))}
          </div>
        ) : Boolean(selectedOrganizationOption.value != '') &&
          hierarchyList[0] ? (
          <TableComponent
            hierarchyList={hierarchyList[0]}
            organizationName={hierarchyList[0]?.name}
            isHiddenList={isHiddenList}
            categoryList={categoryList}
            dataOptionsSkill={
              dataOptionsSkill.find(
                (options) => options.organizationId == hierarchyList[0]?.id,
              )?.skills || []
            }
            setIsTyping={setIsTyping}
            setHierarchyList={setHierarchyList}
            setSelectedHierarchiesToUpdate={setSelectedHierarchiesToUpdate}
          />
        ) : (
          <></>
        )}
      </div>
    </div>
  );
};

export default EditHierarchyForm;
