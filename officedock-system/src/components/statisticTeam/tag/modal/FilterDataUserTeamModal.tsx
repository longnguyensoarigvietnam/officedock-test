import React, { useEffect, useState, useContext, useRef } from 'react';

import CustomUserAvatar from '@components/common/AvatarIcon/CustomUserAvatar';
import Checkbox from '@components/common/Checkbox';
import Button from '@components/common/Button';
import ImageRound from '@components/common/ImageRound';

import { OptionDropdownType } from '@interfaces/common';
import { StatisticTeamTagsStateContext } from '@providers/StatisticTeamProviderTag';
import { NO_DATA_AVAILABLE } from '@constants';
import { isEqualOptions } from '@utils/date';

type Props = {
  open: boolean;
  close: () => void;
};

const FilterDataUserTeam = ({ open, close }: Props) => {
  const {
    orderingOptions,
    orderingPreviewOptions,
    setOrderingPreviewOptions,
    listMemberTeam,
    isCheckCompare,
    isHasLoading,
    setOrderingOptions,
    setIsLoadingLarge,
    setIsLoadingMedium,
    setIsLoadingSmall,
    setIsLoadingSmallCompare,
    setIsLoadingOrganization,
    setIsLoadingLargeCompare,
    setIsLoadingMediumCompare,
    setIsLoadingOrganizationCompare,
  } = useContext(StatisticTeamTagsStateContext);

  const [dataOptionsUserIds, setDataOptionsUserIds] = useState<
    OptionDropdownType[]
  >([]);
  const [selectedOption, setSelectedOption] = useState<OptionDropdownType[]>(
    [],
  );
  const modalRef = useRef<HTMLDivElement | null>(null);

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
    if (orderingPreviewOptions && orderingPreviewOptions.user_ids) {
      setSelectedOption(orderingPreviewOptions.user_ids);
    } else if (orderingOptions) {
      setSelectedOption(orderingOptions.user_ids);
    } else {
      setSelectedOption([]);
    }
  }, [orderingOptions, orderingPreviewOptions, open]);

  const handleChangeUser = (selected: OptionDropdownType) => {
    const foundItemIndex = selectedOption.findIndex(
      (tag) => tag.value == selected.value,
    );
    let newSelected: OptionDropdownType[] = [];
    if (foundItemIndex == -1) {
      newSelected = [...selectedOption, selected];
    } else {
      newSelected = selectedOption.filter((op) => op.value != selected.value);
    }
    setSelectedOption(newSelected);
    setOrderingPreviewOptions((prev) => ({
      user_ids: newSelected,
      tag_ids: prev?.tag_ids || orderingOptions?.tag_ids || [],
    }));
  };

  const handleReset = () => {
    setSelectedOption([]);
    setOrderingPreviewOptions((prev) => ({
      user_ids: [],
      tag_ids: prev?.tag_ids || orderingOptions?.tag_ids || [],
    }));
  };
  const commitFilter = () => {
    setOrderingOptions((prev) => {
      const prevUserIds = prev?.user_ids || [];

      // Check if there is any change
      const hasChanged = !isEqualOptions(prevUserIds, selectedOption);

      if (!hasChanged) {
        //  No change → no loading, keep the same
        return prev;
      }

      // Changes → new loading enabled
      setIsLoadingLarge(true);
      setIsLoadingMedium(true);
      setIsLoadingSmall(true);
      setIsLoadingOrganization(true);

      if (isCheckCompare) {
        setIsLoadingLargeCompare(true);
        setIsLoadingMediumCompare(true);
        setIsLoadingSmallCompare(true);
        setIsLoadingOrganizationCompare(true);
      }

      // Và return state mới
      return {
        tag_ids: prev?.tag_ids || [],
        user_ids: selectedOption,
      };
    });
  };

  const handleSearch = () => {
    commitFilter();

    close();
  };

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target || !modalRef.current) return;

      if (!modalRef.current.contains(target)) {
        commitFilter();
        close();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, commitFilter]);

  return (
    <div
      ref={modalRef}
      className="w-full pt-[10px]  pb-5 bg-white rounded-[14px] shadow-common p-1 flex flex-col gap-1 text-sm">
      <div className="text-xs pl-5 pr-[10px] font-medium text-[#77858F] flex justify-between items-center">
        <span>メンバーの絞り込み</span>
        <div className="flex items-center gap-x-[10px]">
          <span onClick={handleReset} className="cursor-pointer">
            選択をクリア
          </span>
          <div
            style={{
              padding: '5px',
            }}
            onClick={() => {
              setOrderingPreviewOptions(orderingOptions);
              close();
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
      <div className="px-5">
        <div className="mt-[10px] flex max-h-64 overflow-y-auto   px-1 border border-[#77858F] rounded-md  flex-col  ">
          {/*  User */}
          {dataOptionsUserIds.length ? (
            dataOptionsUserIds.map((option) => (
              <>
                <div
                  key={option.value}
                  className={`relative hover:cursor-pointer flex items-start justify-between  select-none hover:bg-[#f8fafc] py-2 pl-2 pr-3 border-b-[1px] border-gray-100`}
                  onClick={() => handleChangeUser(option)}>
                  <div className="max-w-[80%] flex items-center gap-2">
                    <div className="w-5">
                      <Checkbox
                        classLabel={`break-words max-w-[300px] line-clamp-3 !text-sm `}
                        disable={isHasLoading}
                        isChecked={
                          selectedOption.find(
                            (selectedOption) =>
                              selectedOption.value == option.value,
                          )
                            ? true
                            : false
                        }
                      />
                    </div>
                    <div className="min-w-[30px]">
                      <CustomUserAvatar
                        avatarUrl={option?.imgUrl || ''}
                        avatarColor={option?.iconColor || ''}
                        size={30}
                        customClassName={`${!option?.imgUrl && 'mt-[2px]'}`}
                      />
                    </div>
                    <span
                      className={` text-sm font-medium break-words max-w-[300px] line-clamp-3 `}>
                      {option.label}
                    </span>
                  </div>
                </div>
              </>
            ))
          ) : (
            <div className="block py-2 px-3 text-sm text-gray-500">
              {NO_DATA_AVAILABLE}
            </div>
          )}
        </div>
      </div>
      <div className="flex justify-center gap-[10px] mt-4 ">
        <Button
          variant="outline"
          onClick={() => {
            setOrderingPreviewOptions(orderingOptions);
            close();
          }}
          className="h-9">
          キャンセル
        </Button>
        <Button onClick={handleSearch} className="h-9" disabled={isHasLoading}>
          絞り込む
        </Button>
      </div>
    </div>
  );
};

export default FilterDataUserTeam;
