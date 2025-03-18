import React, { memo, useEffect, useState } from 'react';

import Dropdown from '@components/common/Dropdown';
import ImageRound from '@components/common/ImageRound';
import ProgressBarStatistic from './ProgressBarStatistic';

import { StatisticsCategories } from '@interfaces/statistic';
import { OptionDropdownType } from '@interfaces/common';
import { formatTimeToJapanese } from '@utils/date';
import { EventWorkCategory } from '@constants/enums';

type Props = {
  startDate: Date;
  endDate: Date | null;
  totalDurationLarge: string;
  totalDurationMedium: string;
  totalDurationSmall: string;
  statisticCategoryList: StatisticsCategories | undefined;
  listOptionsOrganization: OptionDropdownType[];
  largeOptions: OptionDropdownType[];
  selectedOrganization: OptionDropdownType | null;
  selectedLarge: OptionDropdownType | null;
  mediumOptions: OptionDropdownType[];
  selectedMedium: OptionDropdownType | null;
  handleSelectOrganization: (data: OptionDropdownType) => void;
  handleSelectLarge: (data: OptionDropdownType) => void;
  handleSelectMedium: (data: OptionDropdownType) => void;
};
type ProgressDataType = {
  id: number;
  label: string;
  value: number;
  color: string;
  duration: string;
  optionData: string[];
};

const AllocationCategory = memo(
  ({
    totalDurationLarge,
    totalDurationMedium,
    totalDurationSmall,
    listOptionsOrganization,
    selectedOrganization,
    largeOptions,
    mediumOptions,
    selectedLarge,
    selectedMedium,
    statisticCategoryList,
    handleSelectLarge,
    handleSelectMedium,
    handleSelectOrganization,
  }: Props) => {
    const [isExtendData, setIsExtendData] = useState(true);
    const [_isShowModal, setIsShowModal] = useState(false);
    const [_detailCategory, setDetailCategory] = useState<{
      id: number | null;
      type: string;
      totalDuration: string;
    } | null>(null);

    const [progressDataLarge, setProgressDataLarge] = useState<
      ProgressDataType[]
    >([]);
    const [progressDataMedium, setProgressDataMedium] = useState<
      ProgressDataType[]
    >([]);
    const [progressDataSmall, setProgressDataSmall] = useState<
      ProgressDataType[]
    >([]);

    useEffect(() => {
      if (statisticCategoryList) {
        if (statisticCategoryList.largeCategories) {
          // Get list options

          const listDataLarge = statisticCategoryList.largeCategories.map(
            (item) => ({
              id: item.categoryId,
              label: item.categoryName,
              value: item.percent,
              color: item.categoryColor,
              duration: item.duration,
              optionData: item.tasks.slice(0, 3).map((task) => task.title),
            }),
          );
          setProgressDataLarge(listDataLarge);
        }
        if (statisticCategoryList.mediumCategories) {
          const listDataMedium = statisticCategoryList.mediumCategories.map(
            (item) => ({
              label: item.categoryName,
              value: item.percent,
              color: item.categoryColor,
              duration: item.duration,
              optionData: item.tasks.slice(0, 3).map((task) => task.title),
              id: item.categoryId,
            }),
          );
          setProgressDataMedium(listDataMedium);
        }
        if (statisticCategoryList.smallCategories) {
          const listDataSmall = statisticCategoryList.smallCategories.map(
            (item) => ({
              id: item.categoryId,
              label: item.categoryName,
              value: item.percent,
              color: item.categoryColor,
              duration: item.duration,
              optionData: item.tasks.slice(0, 3).map((task) => task.title),
            }),
          );

          setProgressDataSmall(listDataSmall);
        }
      }
    }, [statisticCategoryList]);

    const _handleScroll = () => {
      const element = document.getElementById('task-list-statistic');
      setIsShowModal(false);

      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    };

    const handleClickTooltip = (id: number | null, type: string) => {
      let duration: string = '00:00:00';

      if (type === EventWorkCategory.LARGE) {
        duration =
          statisticCategoryList?.largeCategories.find(
            (item) => item.categoryId == id,
          )?.duration || '00:00:00';
      }
      if (type === EventWorkCategory.MEDIUM) {
        duration =
          statisticCategoryList?.mediumCategories?.find(
            (item) => item.categoryId == id,
          )?.duration || '00:00:00';
      }
      if (type === EventWorkCategory.SMALL) {
        duration =
          statisticCategoryList?.smallCategories?.find(
            (item) => item.categoryId == id,
          )?.duration || '00:00:00';
      }
      setDetailCategory({
        id: id,
        type: type,
        totalDuration: duration,
      });

      setIsShowModal(true);
    };

    return (
      <>
        <div
          style={{
            boxShadow: '0px 4px 10px 0px #0000000D',
          }}
          className="p-[30px] bg-[#F8FAFC] mt-5 rounded-[14px]">
          {/* Header & sort */}
          <div className="flex justify-between">
            <div className="flex items-center gap-x-5">
              <div className="flex items-center gap-[10px] ">
                <ImageRound
                  className={`w-5 h-5  hover:cursor-pointer relative top-[2px]`}
                  name="allocation icon"
                  src={`/icons/allocation.svg`}
                />
                <span className="text-black font-semibold text-[18px] relative top-[2px]">
                  各カテゴリーの時間配分
                </span>
              </div>
              <div className="flex items-center gap-1 ">
                <ImageRound
                  className={`w-[14px] h-[14px]  hover:cursor-pointer relative top-[2px]`}
                  name="Sort icon"
                  src={`/icons/sort.svg`}
                />
                <span className="text-xs text-[#77858F] relative top-[2px]">
                  タグの絞り込み
                </span>
              </div>
            </div>
            <ImageRound
              src="/icons/extend-calendar.svg"
              name="Extend calendar"
              className={`!w-3 !h-3 hover:cursor-pointer ${
                isExtendData ? '-rotate-90' : 'rotate-90'
              }`}
              onClick={() => {
                setIsExtendData(!isExtendData);
              }}
            />
          </div>
          {isExtendData && (
            <>
              {/* Line */}
              <div className="w-full border-t border-[#D2DBE1] my-[30px]"></div>
              <div>
                <div className="flex gap-[41px] justify-center px-[30px] text-sm font-medium">
                  {/* Column Chart 1 */}
                  <div className="w-[280px]">
                    <div className="w-full h-[34px] bg-[#EBF1F7] text-[#0068B6] rounded-md flex items-center justify-center">
                      大カテゴリー
                    </div>
                    <div className="mt-4">
                      <Dropdown
                        label="チーム選択"
                        placeholder="-"
                        placeholderClass="!text-black text-sm font-normal"
                        className="!h-[34px] !rounded-md !border text-sm font-normal !py-0 !border-[#77858F] "
                        labelTextClass="!text-[#77858F] !text-xs !font-medium"
                        options={listOptionsOrganization}
                        selectedOption={selectedOrganization || undefined}
                        onChange={(data) => handleSelectOrganization(data)}
                      />
                      <p className="text-sm text-black my-[26px]">
                        合計{' '}
                        {totalDurationLarge &&
                          formatTimeToJapanese(totalDurationLarge)}
                      </p>
                      <div className="flex flex-col gap-4">
                        {progressDataLarge.map((item, index) => (
                          <ProgressBarStatistic
                            key={index}
                            classProgressClass="h-5 !rounded "
                            handleClickTooltip={(id: number | null) => {
                              handleClickTooltip(id, EventWorkCategory.LARGE);
                            }}
                            {...item}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                  <div>
                    <ImageRound
                      className={`w-fit h-fit `}
                      src="/icons/drawer-blue.svg"
                      name="icon chevron right"
                    />
                  </div>
                  {/* Column Chart 2 */}
                  <div className="w-[280px]">
                    <div className="w-full h-[34px] bg-[#EBF1F7] text-[#0068B6] rounded-md flex items-center justify-center">
                      中カテゴリー
                    </div>
                    <div className="mt-4">
                      <Dropdown
                        label="大カテゴリー選択"
                        placeholder="-"
                        placeholderClass="!text-black text-sm font-normal"
                        className="!h-[34px] !rounded-md  text-sm font-normal  !border !border-[#77858F]"
                        labelTextClass="!text-[#77858F] !text-xs !font-medium"
                        options={largeOptions}
                        selectedOption={selectedLarge || undefined}
                        onChange={(data) => handleSelectLarge(data)}
                        disabled={!selectedOrganization}
                      />
                      <p className="text-sm text-black my-[26px]">
                        合計{' '}
                        {totalDurationMedium &&
                          formatTimeToJapanese(totalDurationMedium)}
                      </p>
                      <div className="flex flex-col gap-4">
                        {progressDataMedium.map((item, index) => (
                          <ProgressBarStatistic
                            key={index}
                            classProgressClass="h-5 !rounded "
                            handleClickTooltip={(id: number | null) => {
                              handleClickTooltip(id, EventWorkCategory.MEDIUM);
                            }}
                            {...item}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                  <div>
                    <ImageRound
                      className={`w-fit h-fit `}
                      src="/icons/drawer-blue.svg"
                      name="icon chevron right"
                    />
                  </div>
                  {/* Column Chart 3 */}
                  <div className="w-[280px]">
                    <div className="w-full h-[34px] bg-[#EBF1F7] text-[#0068B6] rounded-md flex items-center justify-center">
                      小カテゴリー
                    </div>
                    <div className="mt-4">
                      <Dropdown
                        label="中カテゴリー選択"
                        placeholder="-"
                        placeholderClass="!text-black text-sm font-normal"
                        className="!h-[34px] !rounded-md  text-sm font-normal  !border !border-[#77858F]"
                        labelTextClass="!text-[#77858F] !text-xs !font-medium"
                        options={mediumOptions}
                        selectedOption={selectedMedium || undefined}
                        onChange={(data) => handleSelectMedium(data)}
                        disabled={!selectedLarge}
                      />
                      <p className="text-sm text-black my-[26px]">
                        合計{' '}
                        {totalDurationSmall &&
                          formatTimeToJapanese(totalDurationSmall)}
                      </p>
                      <div className="flex flex-col gap-4">
                        {progressDataSmall.map((item, index) => (
                          <ProgressBarStatistic
                            key={index}
                            classProgressClass="h-5 !rounded "
                            handleClickTooltip={(id: number | null) => {
                              handleClickTooltip(id, EventWorkCategory.SMALL);
                            }}
                            {...item}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </>
    );
  },
);

export default AllocationCategory;
