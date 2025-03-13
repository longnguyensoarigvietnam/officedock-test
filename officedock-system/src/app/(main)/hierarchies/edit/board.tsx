'use client';

import { useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from 'react-query';
import Link from 'next/link';
import { validate as isUUID } from 'uuid';

import Dropdown from '@components/common/Dropdown';
import Button from '@components/common/Button';

import useCreationDataStatisticOrganization from '@hooks/useCreationDataStatisticOrganization';
import useAuthenticatedUser from '@hooks/useAuthenticatedUser';

import { OptionDropdownType } from '@interfaces/common';
import {
  OrganizationCategoryHierarchyDetail,
  StatisticCategory,
} from '@interfaces/hierarchy';

import { apiRouters, pageRouters } from '@constants/routers';
import { LoadingContext } from '@providers/LoadingProvider';
import TableComponent from './form';
import api from '@base/api';
import useCreationDataSkill from '@hooks/useCreationDataSkill';
import { ScreenName } from '@constants/enums';

interface rowDataType {
  id: number | string;
  large: OptionDropdownType;
  medium: OptionDropdownType;
  small: OptionDropdownType;
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
      organizationId: number | string,
      skills: {
        value: number;
        label: string;
      }[]
    }[]
  >([]);
  const [selectedOrganizationOption, setSelectedOrganizationOption] =
    useState<OptionDropdownType>({
      label: 'すべてのチーム',
      value: '',
    });
  const { creationDataCategoryData } = useCreationDataStatisticOrganization({});
  const { creationDataSkillData } = useCreationDataSkill({
    organizationId: String(selectedOrganizationOption.value),
    current_screen: ScreenName.CATEGORY_HIERARCHY,
  });
  const { authenticatedUser } = useAuthenticatedUser();
  const { setIsLoading } = useContext(LoadingContext);
  const router = useRouter();

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
      setDataOptionsSkill(
        creationDataSkillData.map((item) => {
          return {
            organizationId: item.organization.id,
            skills: item.skills.map((skill) => {
              return {
                value: skill.id,
                label: skill.name
              }
            })
          };
        }),
      );
    }
  }, [creationDataSkillData]);

  useEffect(() => {
    if (authenticatedUser) {
      const organizationList = authenticatedUser.organizations.map((org) => {
        return {
          value: org.id,
          label: org.name,
        };
      });
      setOrganizationList([
        {
          label: 'すべてのチーム',
          value: '',
        },
        ...organizationList,
      ]);
    }
  }, [authenticatedUser]);

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
    updateOrganizationCategoryHierarchy({
      ids: selectedHierarchiesToDelete || [],
      items: tempSelectedHierarchiesToUpdate,
    });
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
      },
      medium: {
        label: org.mediumStatisticCategory?.name || '',
        value: org.mediumStatisticCategory?.uuid || '',
      },
      small: {
        label: org.smallStatisticCategory?.name || '',
        value: org.smallStatisticCategory?.uuid || '',
      },
      skills: org.skills.map((skill) => {
        return {
          label: skill.name,
          value: skill.id
        }
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
          },
          medium: {
            label: org.mediumStatisticCategory?.name || '',
            value: org.mediumStatisticCategory?.uuid || '',
          },
          small: {
            label: org.smallStatisticCategory?.name || '',
            value: org.smallStatisticCategory?.uuid || '',
          },
          skills: org.skills.map((skill) => {
            return {
              label: skill.name,
              value: skill.id
            }
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
            <Button variant="outline" className="w-[100px] !p-0 !h-[34px]">
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
              dataOptionsSkill={dataOptionsSkill.find((options) => options.organizationId == data.id)?.skills || []}
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
          dataOptionsSkill={dataOptionsSkill.find((options) => options.organizationId == hierarchyList[0].id)?.skills || []}
          setHierarchyList={setHierarchyList}
          setSelectedHierarchiesToDelete={setSelectedHierarchiesToDelete}
          setSelectedHierarchiesToUpdate={setSelectedHierarchiesToUpdate}
        />
      )}
    </div>
  );
};

export default EditHierarchyForm;
