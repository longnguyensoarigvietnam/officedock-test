'use client';

import { useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from 'react-query';
import Link from 'next/link';
import { validate as isUUID } from 'uuid';

import Dropdown from '@components/common/Dropdown';
import Button from '@components/common/Button';

import useCreationDataStatisticOrganization from '@hooks/useCreationDataStatisticOrganization';
import useCreationOrganization from '@hooks/useCreationOrganization';
import useCreationDataSkill from '@hooks/useCreationDataSkill';

import { OptionDropdownType } from '@interfaces/common';
import {
  OrganizationCategoryHierarchyDetail,
  StatisticCategory,
} from '@interfaces/hierarchy';
import { CreationDataSkill, Skill } from '@interfaces/skills';

import { ScreenName } from '@constants/enums';
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
  const { creationOrganization } = useCreationOrganization({});
  const { setIsLoading } = useContext(LoadingContext);
  const router = useRouter();
  const { showToast } = useToast();

  useEffect(() => {
    if (creationDataCategoryData && creationDataCategoryData?.length > 0) {
      const options = creationDataCategoryData.map((category) => {
        return {
          value: category.uuid,
          label: category.name,
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
    if (creationOrganization) {
      const organizationList = creationOrganization.map((org) => {
        return {
          value: org.id,
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

  const hasInvalidCategory = (hierarchyList: HierarchyDetail[]): boolean => {
    return hierarchyList.some((org) =>
      org.statisticCategories.some(
        (category) =>
          (!category.large.isValid && !isUUID(category.large.label)) ||
          (!category.medium.isValid && !isUUID(category.medium.label)) ||
          (!category.small.isValid && !isUUID(category.small.label)),
      ),
    );
  };

  const handleConfirmUpdateOrganizationCategoryHierarchy = () => {
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
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center">
        <div>
          <Dropdown
            options={organizationList}
            className="!w-[220px] !h-[34px] !py-0 !border-[1px] !border-[#77858F]"
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

        <div className="flex justify-center gap-3 my-7 items-center">
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
          setHierarchyList={setHierarchyList}
          setSelectedHierarchiesToDelete={setSelectedHierarchiesToDelete}
          setSelectedHierarchiesToUpdate={setSelectedHierarchiesToUpdate}
        />
      )}
    </div>
  );
};

export default EditHierarchyForm;
