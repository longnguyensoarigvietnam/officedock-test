import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import ImageRound from '@components/common/ImageRound';

import { OptionDropdownType } from '@interfaces/common';
import MultiSelectUserDropdown from '@components/common/MultiSelectDropdown/MultiSelectUserDropdown';
import MultiSelectDropdown from '@components/common/MultiSelectDropdown';
import Button from '@components/common/Button';
import { StatisticTeamStateContext } from '@providers/StatisticTeamProvider';

type ActionTaskFilterProp = {
  listMemberTeam: {
    id: number;
    fullName: string;
    color: string;
    avatarUrl: string;
  }[];
  tagsOptions: OptionDropdownType[];
  handleClose: () => void;
};

const ActionFilterStatisticTeam = ({
  listMemberTeam,
  handleClose,
  tagsOptions,
}: ActionTaskFilterProp) => {
  const boxListRef = useRef<HTMLDivElement | null>(null);

  const {
    orderingOptions,
    isCheckCompare,
    isHasLoading,
    setOrderingOptions,
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

    if (orderingOptions) {
      if (orderingOptions.tag_ids) {
        value.tagIds = orderingOptions.tag_ids.map((tag) => {
          return {
            value: tag.value,
            label: tag.label,
          };
        });
      }
      if (orderingOptions.user_ids) {
        value.userIds = orderingOptions.user_ids.map((tag) => {
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
  }, [orderingOptions]);

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

  useEffect(() => {
    const handleClickOutside = (event: any) => {
      if (boxListRef.current && !boxListRef.current.contains(event.target)) {
        handleClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [handleClose]);

  const handleSearch = () => {
    setIsLoadingLarge(true);
    setIsLoadingMedium(true);
    setIsLoadingOrganization(true);
    if (isCheckCompare) {
      setIsLoadingLargeCompare(true);
      setIsLoadingMediumCompare(true);
      setIsLoadingOrganizationCompare(true);
    }
    setOrderingOptions({
      tag_ids: getValues('tagIds'),
      user_ids: getValues('userIds'),
    });
    handleClose();
  };

  const handleReset = () => {
    setOrderingOptions({
      tag_ids: [],
      user_ids: [],
    });
  };

  return (
    <>
      <div className="w-full pt-[10px] pl-5 pr-[10px] pb-5 bg-white rounded-lg shadow-common p-1 flex flex-col gap-1 text-sm">
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
              onClick={() => handleClose()}
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
          <div>
            <MultiSelectUserDropdown
              className="!h-[34px] !rounded-md"
              labelClass="!min-h-0 !text-sm font-medium"
              valueClassName="!border-[1px] !border-[#77858F] !py-0 flex items-center !rounded-md"
              optionClassName="!border-[1px] !border-[#77858F]"
              labelOptionClass="break-words max-w-[300px] line-clamp-3 !text-sm"
              options={dataOptionsUserIds}
              selectedOptions={watch('userIds') ?? []}
              customLabel="メンバー"
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
              }}
            />
          </div>
          {/* TagIds */}
          <div>
            <MultiSelectDropdown
              className="!h-[34px] !rounded-md"
              labelClass="!min-h-0 !text-sm font-medium"
              valueClassName="!border-[1px] !border-[#77858F] !py-0 flex items-center !rounded-md"
              optionClassName="!border-[1px] !border-[#77858F] w-full"
              labelOptionClass="break-words max-w-[300px] line-clamp-2 !text-sm"
              options={dataOptionsTagIds}
              selectedOptions={watch('tagIds') ?? []}
              customLabel="タグ"
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
              }}
            />
          </div>
        </div>
        <div className="flex justify-center gap-[10px] mt-4 ">
          <Button variant="outline" onClick={handleClose} className="h-9">
            キャンセル
          </Button>
          <Button
            onClick={handleSearch}
            className="h-9"
            disabled={isHasLoading}>
            絞り込む
          </Button>
        </div>
      </div>
    </>
  );
};

export default ActionFilterStatisticTeam;
