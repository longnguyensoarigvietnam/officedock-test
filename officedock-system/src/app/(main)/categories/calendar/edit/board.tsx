'use client';

import {
  Dispatch,
  SetStateAction,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  useTransition,
} from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from 'react-query';
import { v4 as uuidv4, validate as isUUID } from 'uuid';

import { AxiosError } from 'axios';

import Button from '@components/common/Button';
import WarningCloseTaskModal from '@components/modals/WarningCloseTaskModal';
import ImageRound from '@components/common/ImageRound';
import Switch from '@components/common/Switch';

import { useErrorToast } from '@hooks/useErrorToast';
import useCalendarCategoryHierarchyDetail from '@hooks/useCalendarCategoryDetail';
import useCreationDataCommon from '@hooks/common/useCreationDataCommon';

import { OptionDropdownType } from '@interfaces/common';
import {
  CalendarCategory,
  CalendarCategoryRow,
  CalendarHierarchyCategoryUpdatePayload,
  SelectedCalendarCategoryRow,
} from '@interfaces/hierarchy';

import { AddCategoryHierarchyType, PermissionsSystem } from '@constants/enums';
import { apiRouters, pageRouters } from '@constants/routers';
import {
  ERROR_COMMON_MESSAGE,
  ERROR_UPDATE_MESSAGE,
  SUCCESS_UPDATE_MESSAGE,
} from '@constants/message';

import { useSessionCache } from '@providers/SessionCacheProvider';
import { LoadingContext } from '@providers/LoadingProvider';
import { GlobalStateContext } from '@providers/GlobalStateProvider';
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
  const [_isPending, startTransition] = useTransition();

  // Actions
  const [selectedHierarchiesToUpdate, setSelectedHierarchiesToUpdate] =
    useState<SelectedCalendarCategoryRow[]>([]);

  const { setIsLoading } = useContext(LoadingContext);
  const {
    setHasUnsavedChanges,
    pendingGlobalNavigationHref,
    setPendingGlobalNavigationHref,
  } = useContext(GlobalStateContext);

  const router = useRouter();
  const { showToast } = useToast();
  const showErrorToast = useErrorToast();

  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [pendingNavigationHref, setPendingNavigationHref] = useState<
    string | null
  >(null);
  const navigateAfterSaveRef = useRef<string | null>(null);

  const hasUnsavedChanges = selectedHierarchiesToUpdate.length > 0;

  useEffect(() => {
    setHasUnsavedChanges(hasUnsavedChanges);
    return () => setHasUnsavedChanges(false);
  }, [hasUnsavedChanges, setHasUnsavedChanges]);

  useEffect(() => {
    if (pendingGlobalNavigationHref !== null) {
      setPendingNavigationHref(pendingGlobalNavigationHref);
      setPendingGlobalNavigationHref(null);
      setShowUnsavedModal(true);
    }
  }, [pendingGlobalNavigationHref, setPendingGlobalNavigationHref]);

  const handleNavigate = useCallback(
    (href: string) => {
      if (hasUnsavedChanges) {
        setPendingNavigationHref(href);
        setShowUnsavedModal(true);
      } else {
        router.push(href);
      }
    },
    [hasUnsavedChanges, router],
  );

  const handleConfirmLeave = useCallback(() => {
    setShowUnsavedModal(false);
    setSelectedHierarchiesToUpdate([]);
    setHasUnsavedChanges(false);
    if (pendingNavigationHref) {
      router.push(pendingNavigationHref);
      setPendingNavigationHref(null);
    }
  }, [pendingNavigationHref, router, setHasUnsavedChanges]);

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
            deletedAt: category.deletedAt,
          };
        });
        setCategoryList([...options]);
      }
    },
    onError: (error: AxiosError) => {
      showErrorToast(error, ERROR_COMMON_MESSAGE);
    },
  });

  // Helper function for mapping statistic categories
  const mapStatisticCategories = (categories: CalendarCategory[]) => {
    const result: any[] = [];

    //
    // Helper to map a row OR create a new hierarchy
    //
    const mapRow = (
      row: CalendarCategory,
      overrides = {},
      isNewHierarchy: boolean,
    ) => ({
      id: isNewHierarchy ? uuidv4() : row.id,
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
      color: row.color,
      ...overrides,
    });

    //
    // 1. Group by large
    //
    const largeGroups = categories.reduce(
      (acc, row) => {
        const key = row.largeStatisticCategory.uuid;
        if (!acc[key]) acc[key] = [];
        acc[key].push(row);
        return acc;
      },
      {} as Record<string, CalendarCategory[]>,
    );

    //
    // 2. Process each large group
    //
    Object.values(largeGroups).forEach((largeGroup) => {
      const base = largeGroup[0]; // representative row
      const largeHidden = base.largeStatisticCategory?.isHidden;

      // Check if all medium are hidden
      const allMediumHidden = largeGroup.every(
        (row) => row.mediumStatisticCategory?.isHidden,
      );

      //
      // === RULE 1: Large is NOT hidden && All its medium are hidden ===
      //
      if (!largeHidden && allMediumHidden) {
        // Push existing rows (do NOT remove them)
        largeGroup.forEach((row) => {
          result.push(mapRow(row, {}, false));
        });

        // Push the fallback special row BELOW the existing rows
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
            },
            true,
          ),
        );

        return; // skip normal medium grouping logic
      }

      //
      // === DEFAULT: group by medium ===
      //
      const mediumGroups = largeGroup.reduce(
        (acc, row) => {
          const mediumUuid = row.mediumStatisticCategory?.uuid || '__none__';
          const key = `${row.largeStatisticCategory.uuid}-${mediumUuid}`;

          if (!acc[key]) acc[key] = [];
          acc[key].push(row);

          return acc;
        },
        {} as Record<string, CalendarCategory[]>,
      );

      // Push each medium group normally
      Object.values(mediumGroups).forEach((mediumGroup) => {
        mediumGroup.forEach((row) => result.push(mapRow(row, {}, false)));
      });
    });

    return result;
  };

  useCalendarCategoryHierarchyDetail({
    onSuccess: (data) => {
      const calendarCategoryHierarchy = data[0];
      setHierarchyDetail({
        id: calendarCategoryHierarchy.id,
        name: 'カレンダー',
        statisticCategories: mapStatisticCategories(
          calendarCategoryHierarchy.statisticCategories,
        ),
      });
    },
    onError: (error: AxiosError) => {
      showErrorToast(error, ERROR_COMMON_MESSAGE);
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
    if (tempSelectedHierarchiesToUpdate.length == 0) {
      router.push(pageRouters.CALENDAR_CATEGORY_MANAGEMENT.href);
    } else {
      updateCalendarCategoryHierarchy({
        itemsToDelete: [],
        items: tempSelectedHierarchiesToUpdate,
      });
    }
  };

  const handleConfirmSaveAndLeave = () => {
    navigateAfterSaveRef.current = pendingNavigationHref;
    setShowUnsavedModal(false);
    setPendingNavigationHref(null);
    handleConfirmUpdateCalendarCategoryHierarchy();
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
        setHasUnsavedChanges(false);
        showToast({
          description: SUCCESS_UPDATE_MESSAGE,
        });
        const targetHref = navigateAfterSaveRef.current;
        navigateAfterSaveRef.current = null;
        router.push(
          targetHref || pageRouters.CALENDAR_CATEGORY_MANAGEMENT.href,
        );
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
        <div className="flex justify-between mb-5">
          <div className="flex gap-4 items-center">
            <p className="text-black font-medium text-[26px] leading-[1]">
              業務カテゴリー設定
            </p>
            <div className="flex gap-[6px] bg-white w-fit p-[6px] rounded-[20px]">
              <Button
                variant="outline"
                className={`w-[140px] !p-0 text-xs h-[28px] !font-bold !text-[#77858F] !bg-[#EBF1F7] border-none !rounded-[20px]`}
                onClick={() =>
                  handleNavigate(pageRouters.CATEGORY_MANAGEMENT.href)
                }>
                社内共通カテゴリー
              </Button>

              <Button
                variant="outline"
                className={`w-[140px] !p-0 text-xs h-[28px] !font-bold !text-[#77858F] !bg-[#EBF1F7] border-none !rounded-[20px]`}
                onClick={() =>
                  handleNavigate(pageRouters.TEAM_CATEGORY_MANAGEMENT.href)
                }>
                チームカテゴリー
              </Button>

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

        <div className="flex justify-end gap-3 items-center">
          <Button
            variant="outline"
            className="w-[100px] !p-0 !h-[34px]"
            onClick={() =>
              handleNavigate(pageRouters.CALENDAR_CATEGORY_MANAGEMENT.href)
            }>
            キャンセル
          </Button>
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

      <WarningCloseTaskModal
        open={showUnsavedModal}
        onConfirm={handleConfirmSaveAndLeave}
        onClose={handleConfirmLeave}
        onCloseByIcon={() => setShowUnsavedModal(false)}
      />
    </div>
  );
};

export default EditHierarchyBoard;
