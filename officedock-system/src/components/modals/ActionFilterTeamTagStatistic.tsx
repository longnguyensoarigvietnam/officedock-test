import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';

import ImageRound from '@components/common/ImageRound';
import MultiSelectUserDropdown from '@components/common/MultiSelectDropdown/MultiSelectUserDropdown';
import Button from '@components/common/Button';

import { OptionDropdownType } from '@interfaces/common';

import { StatisticTeamTagsStateContext } from '@providers/StatisticTeamProviderTag';

type ActionTaskFilterProp = {
  listMemberTeam: {
    id: number;
    fullName: string;
    color: string;
    avatarUrl: string;
  }[];
  handleClose: () => void;
};

const ActionFilterTeamTagStatistic = ({
  listMemberTeam,
  handleClose,
}: ActionTaskFilterProp) => {
  const boxListRef = useRef<HTMLDivElement | null>(null);

  const { orderingOptions, isHasLoading, setOrderingOptions } = useContext(
    StatisticTeamTagsStateContext,
  );
  const [_isOpen, setIsOpen] = useState(false);

  const [dataOptionsUserIds, setDataOptionsUserIds] = useState<
    OptionDropdownType[]
  >([]);

  const { getValues, watch, setValue, reset } = useForm<{
    userIds: OptionDropdownType[];
  }>({
    mode: 'onSubmit',
    defaultValues: {},
  });

  const defaultValues = useMemo<{
    userIds: OptionDropdownType[];
  }>(() => {
    const value: {
      userIds: OptionDropdownType[];
    } = {
      userIds: [],
    };

    if (orderingOptions) {
      if (orderingOptions.user_ids) {
        value.userIds = orderingOptions.user_ids.map((user) => {
          return {
            value: user.value,
            label: user.label,
            avatarUrl: user?.avatarUrl || '',
            color: user?.color || '',
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
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSearch = () => {
    setOrderingOptions({
      user_ids: getValues('userIds'),
    });
    handleClose();
  };

  const handleReset = () => {
    setOrderingOptions({
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
        </div>
        <div className="flex justify-center gap-[10px] mt-4 ">
          <Button variant="outline" onClick={handleClose} className="h-9">
            キャンセル
          </Button>
          <Button onClick={handleSearch} className="h-9" disabled={isHasLoading}>
            絞り込む
          </Button>
        </div>
      </div>
    </>
  );
};

export default ActionFilterTeamTagStatistic;
