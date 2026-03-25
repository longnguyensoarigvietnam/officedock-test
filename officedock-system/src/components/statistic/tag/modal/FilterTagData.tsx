import Button from '@components/common/Button';
import Checkbox from '@components/common/Checkbox';
import ImageRound from '@components/common/ImageRound';
import { NO_DATA_AVAILABLE } from '@constants';
import { OptionDropdownType } from '@interfaces/common';
import { StatisticTagStateContext } from '@providers/StatisticProviderTag';
import React, { useEffect, useRef, useState, useContext } from 'react';
import { isEqualOptions } from '@utils/date';

type Props = {
  open: boolean;
  close: () => void;
  onPreviewChange: (tags: OptionDropdownType[]) => void;
};

const FilterTagData = ({ open, close, onPreviewChange }: Props) => {
  const {
    isHasLoading,
    tagsOptions,
    selectedTags,
    isCheckCompare,
    setCurrentPage,
    setSelectedTags,
    setIsLoadingLarge,
    setIsLoadingMedium,
    setIsLoadingOrganization,
    setIsLoadingSmall,
    setIsLoadingLargeCompare,
    setIsLoadingMediumCompare,
    setIsLoadingOrganizationCompare,
    setIsLoadingSmallCompare,
  } = useContext(StatisticTagStateContext);

  const [selectedOption, setSelectedOption] = useState<OptionDropdownType[]>(
    [],
  );

  const actionRef = useRef<'none' | 'confirm' | 'cancel'>('none');
  const selectedOptionRef = useRef<OptionDropdownType[]>([]);
  const tagsOptionsRef = useRef<OptionDropdownType[]>([]);
  const isCheckCompareRef = useRef(isCheckCompare);

  useEffect(() => {
    selectedOptionRef.current = selectedOption;
  }, [selectedOption]);

  useEffect(() => {
    tagsOptionsRef.current = tagsOptions;
  }, [tagsOptions]);

  useEffect(() => {
    isCheckCompareRef.current = isCheckCompare;
  }, [isCheckCompare]);

  useEffect(() => {
    if (!open) return;
    setSelectedOption(selectedTags);
    onPreviewChange(selectedTags);
  }, [open, selectedTags, onPreviewChange]);

  const handleChangeTag = (selected: OptionDropdownType) => {
    const foundItemIndex = selectedOption.findIndex(
      (tag) => tag.value == selected.value,
    );
    if (foundItemIndex == -1) {
      const updated = [...selectedOption, selected];
      setSelectedOption(updated);
      onPreviewChange(updated);
    } else {
      const updated = selectedOption.filter(
        (op) => op.value != selected.value,
      );
      setSelectedOption(updated);
      onPreviewChange(updated);
    }
  };

  const handleReset = () => {
    setSelectedOption([]);
    onPreviewChange([]);
  };

  const applyFilter = () => {
    const nextSelected = selectedOptionRef.current;

    if (tagsOptionsRef.current.length === 0) return;

    setSelectedTags((prev) => {
      const prevTags = prev || [];
      const hasChanged = !isEqualOptions(prevTags, nextSelected);
      if (!hasChanged) return prev;

      setCurrentPage(1);
      setIsLoadingLarge(true);
      setIsLoadingMedium(true);
      setIsLoadingOrganization(true);
      setIsLoadingSmall(true);

      if (isCheckCompareRef.current) {
        setIsLoadingLargeCompare(true);
        setIsLoadingMediumCompare(true);
        setIsLoadingOrganizationCompare(true);
        setIsLoadingSmallCompare(true);
      }

      return nextSelected;
    });
  };

  const handleCancel = () => {
    actionRef.current = 'cancel';
    setSelectedOption(selectedTags);
    onPreviewChange(selectedTags);
    close();
  };

  const handleConfirm = () => {
    actionRef.current = 'confirm';
    applyFilter();
    close();
  };

  const handleMouseLeave = () => {
    actionRef.current = 'confirm';
    applyFilter();
    close();
  };
  return (
    <div
      onMouseLeave={handleMouseLeave}
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
            onClick={handleCancel}
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
          {/*  tag */}
          {tagsOptions.length ? (
            tagsOptions.map((option) => (
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
        <Button variant="outline" onClick={handleCancel} className="h-9">
          キャンセル
        </Button>
        <Button
          onClick={handleConfirm}
          className="h-9"
          disabled={isHasLoading || tagsOptions.length == 0}>
          絞り込む
        </Button>
      </div>
    </div>
  );
};

export default FilterTagData;
