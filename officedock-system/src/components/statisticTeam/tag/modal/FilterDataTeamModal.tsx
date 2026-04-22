import React, { useState, useContext, useEffect, useRef } from 'react';

import Button from '@components/common/Button';
import ImageRound from '@components/common/ImageRound';
import Checkbox from '@components/common/Checkbox';
import InputSearch from '@components/common/InputSearch';

import { StatisticTeamTagsStateContext } from '@providers/StatisticTeamProviderTag';
import { OptionDropdownType } from '@interfaces/common';
import { NO_DATA_AVAILABLE } from '@constants';
import { isEqualOptions } from '@utils/date';

type Props = {
  open: boolean;
  close: () => void;
};

const FilterDataTeamModal = ({ open, close }: Props) => {
  const {
    isHasLoading,
    tagsOptions,
    isCheckCompare,
    orderingOptions,
    setOrderingOptions,
    orderingPreviewOptions,
    setOrderingPreviewOptions,
    setIsLoadingOrganizationCompare,
    setIsLoadingLargeCompare,
    setIsLoadingMediumCompare,
    setIsLoadingSmallCompare,
    setIsLoadingLarge,
    setIsLoadingMedium,
    setIsLoadingSmall,
    setIsLoadingOrganization,
  } = useContext(StatisticTeamTagsStateContext);

  const [selectedOption, setSelectedOption] = useState<OptionDropdownType[]>(
    [],
  );
  const [searchInput, setSearchInput] = useState('');
  const modalRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (orderingPreviewOptions && orderingPreviewOptions.tag_ids) {
      setSelectedOption(orderingPreviewOptions.tag_ids);
    } else if (orderingOptions) {
      setSelectedOption(orderingOptions.tag_ids);
    } else {
      setSelectedOption([]);
    }
  }, [orderingOptions, orderingPreviewOptions, open]);

  useEffect(() => {
    if (!open) return;
    setSearchInput('');
  }, [open]);

  const normalizedSearchInput = searchInput.toLowerCase().trim();
  const filteredTagsOptions = tagsOptions.filter((option) => {
    if (!normalizedSearchInput) return true;
    const label = option.label?.toLowerCase() || '';
    const furigana = option.furigana?.toLowerCase() || '';
    return (
      label.includes(normalizedSearchInput) ||
      furigana.includes(normalizedSearchInput)
    );
  });

  const handleChangeTag = (selected: OptionDropdownType) => {
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
      tag_ids: newSelected,
      user_ids: prev?.user_ids || orderingOptions?.user_ids || [],
    }));
  };

  const handleReset = () => {
    setSelectedOption([]);
    setOrderingPreviewOptions((prev) => ({
      tag_ids: [],
      user_ids: prev?.user_ids || orderingOptions?.user_ids || [],
    }));
  };

  const commitFilter = () => {
    setOrderingOptions((prev) => {
      const prevTagIds = prev?.tag_ids || [];

      // Check if tag_ids has actually changed
      const hasChanged = !isEqualOptions(prevTagIds, selectedOption);

      // No change → return previous state and skip all loading updates
      if (!hasChanged) {
        return prev;
      }

      // Change detected → trigger loading states
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

      // Update only the changed values
      return {
        tag_ids: selectedOption || [],
        user_ids: prev?.user_ids || [],
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
        <span>集計対象のタグを選択</span>
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
      <div className="px-5 mt-2">
        <InputSearch
          value={searchInput}
          placeholder="検索"
          onChange={(e) => setSearchInput(e.target.value)}
          inputClassName="!h-9 !rounded-md"
          onKeyDown={(e) => {
            if (e.key === ' ') {
              e.stopPropagation();
            }
          }}
        />
      </div>
      <div className="px-5">
        <div className="mt-[10px] flex max-h-64 overflow-y-auto   px-1 border border-[#77858F] rounded-md  flex-col  ">
          {/*  tag */}
          {filteredTagsOptions.length ? (
            filteredTagsOptions.map((option) => (
              <>
                <div
                  key={option.value}
                  className={`relative hover:cursor-pointer flex items-start justify-between  select-none hover:bg-[#f8fafc] py-2 pl-2 pr-3 border-b-[1px] border-gray-100`}
                  onClick={() => handleChangeTag(option)}>
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
                    <div className="flex-grow">
                      <span
                        className={` w-full text-sm font-medium break-words max-w-[300px] line-clamp-3 `}>
                        {option.label}
                      </span>
                    </div>
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

export default FilterDataTeamModal;
