import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useForm } from 'react-hook-form';
import ImageRound from '@components/common/ImageRound';

import { OptionDropdownType } from '@interfaces/common';
import MultiSelectUserDropdown from '@components/common/MultiSelectDropdown/MultiSelectUserDropdown';
import MultiSelectDropdown from '@components/common/MultiSelectDropdown';
import Button from '@components/common/Button';
import { StatisticTeamStateContext } from '@providers/StatisticTeamProvider';
import { isEqualOptions } from '@utils/date';

type ActionTaskFilterProp = {
  listMemberTeam: {
    id: number;
    fullName: string;
    color: string;
    avatarUrl: string;
  }[];
  tagsOptions: OptionDropdownType[];
  isFilterMember?: boolean;
  handleClose: () => void;
};

const ActionFilterStatisticTeam = ({
  listMemberTeam,
  isFilterMember,
  handleClose,
  tagsOptions,
}: ActionTaskFilterProp) => {
  const boxListRef = useRef<HTMLDivElement | null>(null);
  const [forceCloseKey, setForceCloseKey] = useState(0);
  const actionRef = useRef<
    'none' | 'confirm' | 'cancel' | 'ignore' | 'outside'
  >('none');

  const handleMouseLeave = useCallback(() => {
    setForceCloseKey((prev) => prev + 1);
  }, []);

  const {
    orderingOptions,
    orderingPreviewOptions,
    isCheckCompare,
    isHasLoading,
    setOrderingOptions,
    setOrderingPreviewOptions,
    setIsLoadingLarge,
    setIsLoadingMedium,
    setIsLoadingOrganization,
    setIsLoadingLargeCompare,
    setIsLoadingMediumCompare,
    setIsLoadingOrganizationCompare,
  } = useContext(StatisticTeamStateContext);

  const [dataOptionsTagIds, setDataOptionsTagIds] = useState<
    OptionDropdownType[]
  >([]);
  const [dataOptionsUserIds, setDataOptionsUserIds] = useState<
    OptionDropdownType[]
  >([]);

  const { getValues, watch, setValue, reset } = useForm<{
    tagIds: OptionDropdownType[];
    userIds: OptionDropdownType[];
  }>({
    mode: 'onSubmit',
    defaultValues: {},
  });

  const defaultValues = useMemo<{
    tagIds: OptionDropdownType[];
    userIds: OptionDropdownType[];
  }>(() => {
    const value: {
      tagIds: OptionDropdownType[];
      userIds: OptionDropdownType[];
    } = {
      tagIds: [],
      userIds: [],
    };

    if (orderingPreviewOptions) {
      if (orderingPreviewOptions.tag_ids) {
        value.tagIds = orderingPreviewOptions.tag_ids.map((tag) => {
          return {
            value: tag.value,
            label: tag.label,
          };
        });
      }
      if (orderingPreviewOptions.user_ids) {
        value.userIds = orderingPreviewOptions.user_ids.map((tag) => {
          return {
            value: tag.value,
            label: tag.label,
            avatarUrl: tag?.avatarUrl || '',
            color: tag?.color || '',
          };
        });
      }
    }
    return value;
  }, [orderingPreviewOptions]);

  useEffect(() => {
    reset(defaultValues);
  }, [defaultValues, reset]);
  useEffect(() => {
    if (tagsOptions) {
      setDataOptionsTagIds(tagsOptions);
    }
  }, [tagsOptions]);

  useEffect(() => {
    if (listMemberTeam) {
      setDataOptionsUserIds(
        listMemberTeam.map((org) => ({
          label: String(org.fullName),
          value: String(org.id),
          imgUrl: org.avatarUrl,
          iconColor: org.color,
          color: org?.color || '',
          avatarUrl: org?.avatarUrl || '',
        })),
      );
    }
  }, [listMemberTeam]);

  const isSameOrdering = (
    prev: {
      tag_ids: OptionDropdownType[];
      user_ids: OptionDropdownType[];
    } | null,
    next: { tag_ids: OptionDropdownType[]; user_ids: OptionDropdownType[] },
  ) => {
    if (!prev) return false;

    return (
      isEqualOptions(prev.tag_ids, next.tag_ids) &&
      isEqualOptions(prev.user_ids, next.user_ids)
    );
  };

  const applyFilter = () => {
    const newOptions = {
      tag_ids: getValues('tagIds'),
      user_ids: getValues('userIds'),
    };

    if (!isSameOrdering(orderingOptions, newOptions)) {
      setIsLoadingLarge(true);
      setIsLoadingMedium(true);
      setIsLoadingOrganization(true);
      if (isCheckCompare) {
        setIsLoadingLargeCompare(true);
        setIsLoadingMediumCompare(true);
        setIsLoadingOrganizationCompare(true);
      }
      setOrderingPreviewOptions(newOptions);
      setOrderingOptions(newOptions);
    }
  };

  const handleSearch = () => {
    actionRef.current = 'confirm';
    applyFilter();
    handleClose();
  };

  const handleReset = () => {
    const clearedOptions = {
      tag_ids: [],
      user_ids: [],
    };
    reset({
      tagIds: [],
      userIds: [],
    });
    setOrderingPreviewOptions(clearedOptions);
  };

  const updatePreviewUserIds = (nextUserIds: OptionDropdownType[]) => {
    const base = orderingPreviewOptions ||
      orderingOptions || {
        tag_ids: [],
        user_ids: [],
      };
    setOrderingPreviewOptions({
      tag_ids: base.tag_ids || [],
      user_ids: nextUserIds,
    });
  };

  const updatePreviewTagIds = (nextTagIds: OptionDropdownType[]) => {
    const base = orderingPreviewOptions ||
      orderingOptions || {
        tag_ids: [],
        user_ids: [],
      };
    setOrderingPreviewOptions({
      tag_ids: nextTagIds,
      user_ids: base.user_ids || [],
    });
  };

  useEffect(() => {
    return () => {
      if (actionRef.current === 'none' || actionRef.current === 'outside') {
        applyFilter();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <div
        ref={boxListRef}
        onMouseLeave={handleMouseLeave}
        className="w-full pt-[10px] pl-5 pr-[10px] pb-5 bg-white rounded-lg shadow-common p-1 flex flex-col gap-1 text-sm">
        <div className="text-xs font-medium text-[#77858F] flex justify-between items-center">
          <span>絞り込み</span>
          <div className="flex items-center gap-x-[10px]">
            <span onClick={handleReset} className="cursor-pointer">
              選択をクリア
            </span>
            <div
              style={{
                padding: '5px',
              }}
              onClick={() => {
                actionRef.current = 'cancel';
                setOrderingPreviewOptions(orderingOptions);
                handleClose();
              }}
              className={`rounded-full cursor-pointer w-6 h-6 bg-[#E3EAED]`}>
              <ImageRound
                src={`/icons/close-black.svg`}
                name="close"
                className="w-fit h-fit"
              />
            </div>
          </div>
        </div>
        <div className="mt-[10px] flex  flex-col gap-[14px] ">
          {/*  User */}
          {isFilterMember && (
            <div>
              <MultiSelectUserDropdown
                className="!h-[34px] !rounded-md"
                labelClass="!min-h-0 !text-sm font-medium"
                valueClassName="!border-[1px] !border-[#77858F] !py-0 flex items-center !rounded-md"
                optionClassName="!border-[1px] !border-[#77858F] !mt-0"
                labelOptionClass="break-words max-w-[300px] line-clamp-3 !text-sm"
                closeOnMouseLeave
                options={dataOptionsUserIds}
                selectedOptions={watch('userIds') ?? []}
                customLabel="メンバー"
                forceClose={forceCloseKey}
                onChange={(selected) => {
                  let updatedUserIds = [];
                  const currentUserIds = getValues('userIds') || [];
                  const foundItemIndex = currentUserIds.findIndex(
                    (tag) => tag.value == selected.value,
                  );
                  if (foundItemIndex == -1) {
                    updatedUserIds = [...currentUserIds, selected];
                  } else {
                    updatedUserIds = currentUserIds.filter(
                      (tag) => tag.value != selected.value,
                    );
                  }
                  setValue('userIds', updatedUserIds);
                  updatePreviewUserIds(updatedUserIds);
                }}
              />
            </div>
          )}
          {/* TagIds */}
          <div>
            <MultiSelectDropdown
              className="!h-[34px] !rounded-md"
              labelClass="!min-h-0 !text-sm font-medium"
              valueClassName="!border-[1px] !border-[#77858F] !py-0 flex items-center !rounded-md"
              optionClassName="!border-[1px] !border-[#77858F] w-full !mt-0"
              labelOptionClass="break-words max-w-[300px] line-clamp-2 !text-sm"
              closeOnMouseLeave
              options={dataOptionsTagIds}
              selectedOptions={watch('tagIds') ?? []}
              customLabel="タグ"
              forceClose={forceCloseKey}
              onChange={(selected) => {
                let updatedTagIds = [];
                const currentTagIds = getValues('tagIds') || [];
                const foundItemIndex = currentTagIds.findIndex(
                  (tag) => tag.value == selected.value,
                );
                if (foundItemIndex == -1) {
                  updatedTagIds = [...currentTagIds, selected];
                } else {
                  updatedTagIds = currentTagIds.filter(
                    (tag) => tag.value != selected.value,
                  );
                }
                setValue('tagIds', updatedTagIds);
                updatePreviewTagIds(updatedTagIds);
              }}
            />
          </div>
        </div>
        <div className="flex justify-center gap-[10px] mt-4 ">
          <Button
            variant="outline"
            onClick={() => {
              actionRef.current = 'cancel';
              setOrderingPreviewOptions(orderingOptions);
              handleClose();
            }}
            className="h-9">
            キャンセル
          </Button>
          <Button
            onClick={handleSearch}
            className="h-9"
            disabled={
              isHasLoading ||
              (dataOptionsTagIds.length == 0 &&
                getValues('userIds') &&
                getValues('userIds').length == 0 &&
                orderingOptions?.user_ids?.length == 0)
            }>
            絞り込む
          </Button>
        </div>
      </div>
    </>
  );
};

export default ActionFilterStatisticTeam;
