'use client';

import {
  Dispatch,
  SetStateAction,
  useContext,
  useEffect,
  useState,
  useTransition,
} from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from 'react-query';
import Link from 'next/link';
import { validate as isUUID } from 'uuid';

import { AxiosError } from 'axios';

import Button from '@components/common/Button';
import ImageRound from '@components/common/ImageRound';
import Switch from '@components/common/Switch';

import { useErrorToast } from '@hooks/useErrorToast';
import useCalendarCategoryHierarchyDetail from '@hooks/useCalendarCategoryDetail';
import useCreationDataCommon from '@hooks/common/useCreationDataCommon';

import { OptionDropdownType } from '@interfaces/common';
import {
  CalendarCategoryRow,
  CalendarHierarchyCategoryUpdatePayload,
  SelectedCalendarCategoryRow,
} from '@interfaces/hierarchy';

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
  const [isHiddenList, setIsHiddenList] = useState<boolean>(false);
  const [isPending, startTransition] = useTransition();

  // Actions
  const [selectedHierarchiesToUpdate, setSelectedHierarchiesToUpdate] =
    useState<SelectedCalendarCategoryRow[]>([]);

  const { setIsLoading } = useContext(LoadingContext);

  const router = useRouter();
  const { showToast } = useToast();
  const showErrorToast = useErrorToast();

  const [isTyping, setIsTyping] = useState<boolean>(false);

  // Hooks
  useCreationDataCommon({
    options: {
      get_statistic_categories: true,
    },
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
    },
  });

  useCalendarCategoryHierarchyDetail({
    onSuccess: (data) => {
      const calendarCategoryHierarchy = data[0];
      const statisticCategories =
        calendarCategoryHierarchy.statisticCategories.map((org) => ({
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
      tempSelectedHierarchiesToUpdate.length == 0
    ) {
      router.push(pageRouters.CALENDAR_CATEGORY_MANAGEMENT.href);
    } else {
      updateCalendarCategoryHierarchy({
        itemsToDelete: [],
        items: tempSelectedHierarchiesToUpdate,
      });
    }
  };

  const handleUpdateCalendarCategoryHierarchyList = async ({
    items,
    itemsToDelete,
  }: CalendarHierarchyCategoryUpdatePayload) => {
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
        itemsToDelete,
      },
    );
    return data;
  };

  const { mutate: updateCalendarCategoryHierarchy } = useMutation(
    'updateOrganizationCategoryHierarchy',
    handleUpdateCalendarCategoryHierarchyList,
    {
      onSuccess: async () => {
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

  useEffect(() => {
    setIsLoading(Boolean(isPending));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPending]);

  return (
    <div className="flex flex-col h-full">
      <div className="sticky z-[21] top-[0px] px-10 pt-8 pb-3 bg-[#E6F3FB]">
        <div className="flex justify-between mb-5">
          <div className="flex gap-4 items-center">
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

              <Link href={pageRouters.TEAM_CATEGORY_MANAGEMENT.href}>
                <Button
                  variant="outline"
                  className={`w-[128px] !p-0 text-xs h-[28px] !font-bold !text-[#77858F] !bg-[#EBF1F7] border-none !rounded-[20px]`}>
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
                    className={`w-[140px] !p-0 text-xs h-[28px] !font-bold text-white border-none !rounded-[20px]`}>
                    カレンダーカテゴリー
                  </Button>
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
              enableColor="#228CDB"
              disableColor="#CDD7DC"
              enable={isHiddenList}
              onChange={(e) => {
                startTransition(() => setIsHiddenList(e));
              }}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 items-center">
          <Link href={pageRouters.CALENDAR_CATEGORY_MANAGEMENT.href}>
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
            onClick={handleConfirmUpdateCalendarCategoryHierarchy}>
            保存
          </Button>
        </div>
      </div>
      <div className="px-10 mt-5">
        {hierarchyDetail && (
          <TableComponent
            hierarchyDetail={hierarchyDetail}
            isHiddenList={isHiddenList}
            categoryList={categoryList}
            setIsTyping={setIsTyping}
            setHierarchyDetail={
              setHierarchyDetail as Dispatch<SetStateAction<HierarchyDetail>>
            }
            setSelectedHierarchiesToUpdate={setSelectedHierarchiesToUpdate}
          />
        )}
      </div>
    </div>
  );
};

export default EditHierarchyBoard;
