'use client';

import { useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from 'react-query';
import Link from 'next/link';
import { validate as isUUID } from 'uuid';

import Dropdown from '@components/common/Dropdown';
import Button from '@components/common/Button';

import useCreationDataStatisticOrganization from '@hooks/useCreationDataStatisticOrganization';
import useCreationDataSkill from '@hooks/useCreationDataSkill';
import useTeamList from '@hooks/useListTeam';

import { OptionDropdownType } from '@interfaces/common';
import {
  OrganizationCategoryHierarchyDetail,
  StatisticCategory,
} from '@interfaces/hierarchy';
import { CreationDataSkill, Skill } from '@interfaces/skills';

import { AddCategoryHierarchyType, ScreenName } from '@constants/enums';
import { apiRouters, pageRouters } from '@constants/routers';
import { INVALID_CATEGORY_NAME } from '@constants/message';
import { ALL_TEAMS_OPTION } from '@constants';

import { LoadingContext } from '@providers/LoadingProvider';
import { useToast } from '@providers/ToastProvider';

import TableComponent from './form';
import api from '@base/api';

interface rowDataType {
  id: number | string;
  large: {
    value: string | number;
    label: string;
    showBy: string;
    isValid: boolean;
    errorMessage: string;
  };
  medium: {
    value: string | number;
    label: string;
    showBy: string;
    isValid: boolean;
    errorMessage: string;
  };
  small: {
    value: string | number;
    label: string;
    showBy: string;
    isValid: boolean;
    errorMessage: string;
  };
  skills: OptionDropdownType[];
  color: string;
}

interface HierarchyDetail {
  id: number | string;
  name: string;
  statisticCategories: rowDataType[];
}

const EditHierarchyForm = () => {
  const [hierarchyList, setHierarchyList] = useState<HierarchyDetail[]>([]);
  const [categoryList, setCategoryList] = useState<OptionDropdownType[]>([]);
  const [selectedHierarchiesToDelete, setSelectedHierarchiesToDelete] =
    useState<string[]>();
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
  const { creationDataCategoryData } = useCreationDataStatisticOrganization({});
  const { creationDataSkillData } = useCreationDataSkill({
    organizationId: String(selectedOrganizationOption.value),
    current_screen: ScreenName.CATEGORY_HIERARCHY,
  });
  const { teamList } = useTeamList({screenName: ScreenName.CATEGORY_HIERARCHY});
  const { setIsLoading } = useContext(LoadingContext);
  const router = useRouter();
  const { showToast } = useToast();
  const [newCategory, setNewCategory] = useState<{
    name: string;
    uuid: string;
    type: string;
    rowInfo: rowDataType;
  }>({
    name: '',
    uuid: '',
    type: '',
    rowInfo: {
      id: '',
      large: {
        value: '',
        label: '',
        showBy: '',
        isValid: false,
        errorMessage: '',
      },
      medium: {
        value: '',
        label: '',
        showBy: '',
        isValid: false,
        errorMessage: '',
      },
      small: {
        value: '',
        label: '',
        showBy: '',
        isValid: false,
        errorMessage: '',
      },
      skills: [],
      color: '',
    },
  });

  useEffect(() => {
    if (creationDataCategoryData && creationDataCategoryData?.length > 0) {
      const options = creationDataCategoryData.map((category) => {
        return {
          value: category.uuid,
          label: category.name,
          teamId: category.team
        };
      });
      setCategoryList([...options]);
    }
  }, [creationDataCategoryData]);

  useEffect(() => {
    if (creationDataSkillData) {
      if (selectedOrganizationOption.label == ALL_TEAMS_OPTION) {
        setDataOptionsSkill(
          (creationDataSkillData as CreationDataSkill[]).map((item) => {
            return {
              organizationId: item.organization.id,
              skills: item.skills.map((skill: Skill) => {
                return {
                  value: skill.id,
                  label: skill.name,
                };
              }),
            };
          }),
        );
      } else {
        setDataOptionsSkill([
          {
            organizationId: selectedOrganizationOption.value,
            skills: (creationDataSkillData as Skill[]).map((skill: Skill) => {
              return {
                value: skill.id,
                label: skill.name,
              };
            }),
          },
        ]);
      }
    }
  }, [creationDataSkillData, selectedOrganizationOption]);

  useEffect(() => {
    if (teamList) {
      const organizationList = teamList.map((org) => {
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
  }, [teamList]);

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

  const hasInvalidCategory = (hierarchyList: HierarchyDetail[]): boolean => {
    return hierarchyList.some((org) =>
      org.statisticCategories.some(
        (category) =>
          (!category.large.isValid && category.large.errorMessage && !isUUID(category.large.label)) ||
          (!category.medium.isValid && category.medium.errorMessage && !isUUID(category.medium.label)) ||
          (!category.small.isValid && category.small.errorMessage && !isUUID(category.small.label)),
      ),
    );
  };

  const handleConfirmUpdateOrganizationCategoryHierarchy = () => {
    if (newCategory.uuid || newCategory.name) {
      return;
    }
    if (!hasInvalidCategory(hierarchyList)) {
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
    } else {
      showToast({
        variant: 'error',
        description: INVALID_CATEGORY_NAME,
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
        router.push(pageRouters.HIERARCHY_MANAGEMENT.href);
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
        isValid: true,
        errorMessage: '',
      },
      medium: {
        label: org.mediumStatisticCategory?.name || '',
        value: org.mediumStatisticCategory?.uuid || '',
        showBy: AddCategoryHierarchyType.PULLDOWN,
        isValid: true,
        errorMessage: '',
      },
      small: {
        label: org.smallStatisticCategory?.name || '',
        value: org.smallStatisticCategory?.uuid || '',
        showBy: AddCategoryHierarchyType.PULLDOWN,
        isValid: true,
        errorMessage: '',
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
            showBy: AddCategoryHierarchyType.PULLDOWN,
            isValid: true,
            errorMessage: '',
          },
          medium: {
            label: org.mediumStatisticCategory?.name || '',
            value: org.mediumStatisticCategory?.uuid || '',
            showBy: AddCategoryHierarchyType.PULLDOWN,
            isValid: true,
            errorMessage: '',
          },
          small: {
            label: org.smallStatisticCategory?.name || '',
            value: org.smallStatisticCategory?.uuid || '',
            showBy: AddCategoryHierarchyType.PULLDOWN,
            isValid: true,
            errorMessage: '',
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
    <div className="flex flex-col h-full">
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
            <Link href={pageRouters.HIERARCHY_MANAGEMENT.href}>
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
              className="w-[100px] !p-0 !h-[34px]"
              onClick={handleConfirmUpdateOrganizationCategoryHierarchy}>
              保存
            </Button>
          </div>
        </div>
      </div>
      <div className="px-8 mt-5">
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
                newCategory={newCategory}
                setNewCategory={setNewCategory}
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
            newCategory={newCategory}
            setNewCategory={setNewCategory}
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
