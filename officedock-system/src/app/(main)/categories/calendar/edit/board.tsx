'use client';

import {
  Dispatch,
  SetStateAction,
  useContext,
  useEffect,
  useState,
} from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from 'react-query';
import Link from 'next/link';
import { validate as isUUID } from 'uuid';

import { AxiosError } from 'axios';

import Button from '@components/common/Button';

import useCreationDataStatisticOrganization from '@hooks/useCreationDataStatisticOrganization';
import { useErrorToast } from '@hooks/useErrorToast';
import useCalendarCategoryHierarchyDetail from '@hooks/useCalendarCategoryDetail';

import { OptionDropdownType } from '@interfaces/common';
import { CalendarCategoryRow } from '@interfaces/hierarchy';

import { AddCategoryHierarchyType, PermissionsSystem } from '@constants/enums';
import { apiRouters, pageRouters } from '@constants/routers';
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
  statisticCategories: CalendarCategoryRow[];
}

const EditHierarchyBoard = () => {
  const { data: session } = useSessionCache();

  const [hierarchyDetail, setHierarchyDetail] =
    useState<HierarchyDetail | null>(null);
  const [categoryList, setCategoryList] = useState<OptionDropdownType[]>([]);

  // Actions
  const [selectedHierarchiesToDelete, setSelectedHierarchiesToDelete] =
    useState<string[]>([]);
  const [selectedHierarchiesToUpdate, setSelectedHierarchiesToUpdate] =
    useState<
      {
        organizationStatisticCategoryId: string | number | null;
        largeStatisticCategory: {
          name: string;
          uuid: string;
        } | null;
        mediumStatisticCategory: {
          name: string;
          uuid: string;
        } | null;
        color: string;
      }[]
    >([]);

  const { setIsLoading } = useContext(LoadingContext);

  const router = useRouter();
  const { showToast } = useToast();
  const showErrorToast = useErrorToast();

  const [isTyping, setIsTyping] = useState<boolean>(false);

  // Hooks
  const { creationDataCategoryData } = useCreationDataStatisticOrganization({});
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

  useEffect(() => {
    if (creationDataCategoryData && creationDataCategoryData?.length > 0) {
      const options = creationDataCategoryData.map((category) => {
        return {
          value: category.uuid,
          label: category.name,
          teamId: category.team,
        };
      });
      setCategoryList([...options]);
    }
  }, [creationDataCategoryData]);

  const handleConfirmUpdateCalendarCategoryHierarchy = () => {
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
      router.push(pageRouters.CALENDAR_CATEGORY_MANAGEMENT.href);
    } else {
      updateCalendarCategoryHierarchy({
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

  const handleUpdateCalendarCategoryHierarchyList = async ({
    items,
    ids,
  }: {
    items: {
      organizationStatisticCategoryId: string | number | null;
      largeStatisticCategory: {
        name: string;
        uuid: string;
      } | null;
      mediumStatisticCategory: {
        name: string;
        uuid: string;
      } | null;
      color: string;
    }[];
    ids: string[];
  }) => {
    setIsLoading(true);
    const { data } = await api.post(
      `${apiRouters.ORGANIZATION_CATEGORY_HIERARCHY_LIST}?is_only_calendar=true`,
      {
        items: items.map((item) => {
          return {
            ...item,
            organizationId: hierarchyDetail?.id,
          };
        }),
        ids,
      },
    );
    return data;
  };

  const { mutate: updateCalendarCategoryHierarchy } = useMutation(
    'updateOrganizationCategoryHierarchy',
    handleUpdateCalendarCategoryHierarchyList,
    {
      onSuccess: async () => {
        setSelectedHierarchiesToDelete([]);
        setSelectedHierarchiesToUpdate([]);
        showToast({
          description: SUCCESS_UPDATE_MESSAGE,
        });
        router.push(pageRouters.CALENDAR_CATEGORY_MANAGEMENT.href);
      },
      onError: (error: AxiosError<any>) => {
        showErrorToast(error, ERROR_UPDATE_MESSAGE);
      },
      onSettled: () => {
        setIsLoading(false);
      },
    },
  );

  return (
    <div className="flex flex-col h-full">
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
                PermissionsSystem.CATEGORY_HIERARCHY_UPDATE,
              ) && (
                <Button
                  variant="primary"
                  className={`w-[140px] !p-0 text-xs h-[28px] !border-transparent text-white !rounded-[20px]`}>
                  カレンダーカテゴリー
                </Button>
              )}
          </div>
        </div>

        <div className="flex justify-end gap-3 items-center">
          <Link href={pageRouters.CALENDAR_CATEGORY_MANAGEMENT.href}>
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
            disabled={isTyping}
            onClick={handleConfirmUpdateCalendarCategoryHierarchy}>
            保存
          </Button>
        </div>
      </div>
      <div className="px-10 mt-5">
        {hierarchyDetail && (
          <TableComponent
            hierarchyDetail={hierarchyDetail}
            categoryList={categoryList}
            setIsTyping={setIsTyping}
            setHierarchyDetail={
              setHierarchyDetail as Dispatch<SetStateAction<HierarchyDetail>>
            }
            setSelectedHierarchiesToDelete={setSelectedHierarchiesToDelete}
            setSelectedHierarchiesToUpdate={setSelectedHierarchiesToUpdate}
          />
        )}
      </div>
    </div>
  );
};

export default EditHierarchyBoard;
