import React, { useContext, useEffect, useRef, useState } from 'react';

import Button from '@components/common/Button';
import Checkbox from '@components/common/Checkbox';
import MultiDatePickerCustom from '@components/common/DatePicker/MultiDatePickerCustom';
import ImageRound from '@components/common/ImageRound';
import { DynamicTooltip } from '@components/tooltip/DynamicTooltip';

import { TimeCompareOptionsType, TimeOptionsType } from '@constants/enums';

import {
  formatShowDateJapanese,
  handleSetStartDateAfter,
  handleSetStartDateBefore,
} from '@utils/date';
import {
  getCompareLineChartEnableViews,
  getLineChartEnableViews,
} from '@utils';

import { StatisticTeamStateContext } from '@providers/StatisticTeamProvider';

function StatisticTeamCalendar() {
  const {
    startDate,
    endDate,
    endDateCompare,
    startDateCompare,
    isCheckCompare,
    isLoadingLarge,
    isLoadingLargeCompare,
    isLoadingMedium,
    isLoadingMediumCompare,
    isLoadingOrganization,
    isLoadingOrganizationCompare,
    setIsCheckCompare,
    setStartDate,
    setEndDate,
    setStartDateCompare,
    setEndDateCompare,
    setIsLoadingLarge,
    setIsLoadingMedium,
    setIsLoadingOrganization,
    setIsLoadingLargeCompare,
    setIsLoadingMediumCompare,
    setIsLoadingOrganizationCompare,
    setLineChartViewBy,
    setAreaTableData,
    setLineChartTableData,
    setMergedTableData,
  } = useContext(StatisticTeamStateContext);
  const modalRef = useRef<HTMLDivElement | null>(null);
  const buttonPrev = useRef<HTMLDivElement | null>(null);
  const buttonNext = useRef<HTMLDivElement | null>(null);

  const [isTypeTime, setIsTypeTime] = useState<TimeOptionsType>(
    TimeOptionsType.MONTH,
  );

  const [isOpenModal, setIsOpenModal] = useState(false);
  const [isEndButtonClicked, setIsEndButtonClicked] = useState(false);
  const [isStartButtonClicked, setIsStartButtonClicked] = useState(false);

  // Default is the full previous month
  const [dataStartDate, setDataStartDate] = useState(() => {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const lastMonthIndexRaw = currentMonth - 1;
    const lastMonthYear = currentYear + Math.floor(lastMonthIndexRaw / 12);
    const lastMonthIndex = ((lastMonthIndexRaw % 12) + 12) % 12;
    return new Date(lastMonthYear, lastMonthIndex, 1);
  });
  const [dataEndDate, setDataEndDate] = useState<Date | null>(() => {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const lastMonthIndexRaw = currentMonth - 1;
    const lastMonthYear = currentYear + Math.floor(lastMonthIndexRaw / 12);
    const lastMonthIndex = ((lastMonthIndexRaw % 12) + 12) % 12;
    return new Date(lastMonthYear, lastMonthIndex + 1, 0);
  });
  const [isDataCheckCompare, setIsDataCheckCompare] = useState(false);
  const [isErrorData, setIsErrorData] = useState({
    start: false,
    end: false,
  });
  const [isErrorDataCompare, setIsErrorDataCompare] = useState({
    start: false,
    end: false,
  });
  const [compareMode, setCompareMode] = useState<TimeCompareOptionsType>(
    TimeCompareOptionsType.PREVIOUS_PERIOD,
  );

  // Compare

  const [dataStartDateCompare, setDataStartDateCompare] = useState(new Date());
  const [dataEndDateCompare, setDataEndDateCompare] = useState<Date | null>(
    null,
  );
  const [isEndButtonClickedCompare, setIsEndButtonClickedCompare] =
    useState(false);
  const [isStartButtonClickedCompare, setIsStartButtonClickedCompare] =
    useState(false);

  useEffect(() => {
    if (startDate) {
      setDataStartDate(startDate);
    }
    if (endDate) {
      setDataEndDate(endDate);
    }
  }, [endDate, startDate]);

  useEffect(() => {
    if (isCheckCompare) {
      setIsDataCheckCompare(isCheckCompare);
    } else {
      setIsDataCheckCompare(false);
    }
  }, [isCheckCompare]);

  // Update data date

  useEffect(() => {
    if (startDateCompare) {
      setDataStartDateCompare(startDateCompare);
    }
    if (endDateCompare) {
      setDataEndDateCompare(endDateCompare);
    }
  }, [endDateCompare, startDateCompare]);

  // Update data compare

  useEffect(() => {
    if (startDate) {
      setDataStartDate(startDate);
    }
    if (endDate) {
      setDataEndDate(endDate);
    }
  }, [endDate, startDate]);

  useEffect(() => {
    const handleClickOutside = (event: any) => {
      if (
        modalRef.current &&
        !modalRef.current.contains(event.target) &&
        !buttonPrev.current?.contains(event.target) &&
        !buttonNext.current?.contains(event.target)
      ) {
        setIsOpenModal(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Reset table data
  const handleResetTableData = () => {
    setMergedTableData([]);
    setAreaTableData([]);
    setLineChartTableData([]);
  };

  // Selection option time
  const handleSelectTimeOption = (option: TimeOptionsType) => {
    setIsTypeTime(option);
    setIsErrorData({
      start: false,
      end: false,
    });

    const today = new Date();
    let newStartDate: Date;
    let newEndDate: Date;

    switch (option) {
      case TimeOptionsType.YESTERDAY: {
        const yesterday = new Date(
          today.getFullYear(),
          today.getMonth(),
          today.getDate() - 1,
        );
        newStartDate = yesterday;
        newEndDate = yesterday;
        // Compare calendar stays interactive; keep flags only
        break;
      }
      case TimeOptionsType.WEEK: {
        // Previous week: Monday-Sunday
        const current = new Date(
          today.getFullYear(),
          today.getMonth(),
          today.getDate(),
        );
        const day = current.getDay(); // 0: Sun ... 6: Sat
        const offsetToMonday = (day + 6) % 7;
        const startOfThisWeek = new Date(current);
        startOfThisWeek.setDate(current.getDate() - offsetToMonday);

        const startOfLastWeek = new Date(startOfThisWeek);
        startOfLastWeek.setDate(startOfThisWeek.getDate() - 7);
        const endOfLastWeek = new Date(startOfThisWeek);
        endOfLastWeek.setDate(startOfThisWeek.getDate() - 1);

        newStartDate = startOfLastWeek;
        newEndDate = endOfLastWeek;

        // Compare calendar stays interactive; keep flags only
        break;
      }
      case TimeOptionsType.MONTH: {
        // Full previous month
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();
        const lastMonthIndexRaw = currentMonth - 1;
        const lastMonthYear = currentYear + Math.floor(lastMonthIndexRaw / 12);
        const lastMonthIndex = ((lastMonthIndexRaw % 12) + 12) % 12;

        newStartDate = new Date(lastMonthYear, lastMonthIndex, 1);
        newEndDate = new Date(lastMonthYear, lastMonthIndex + 1, 0);

        // Compare calendar stays interactive; keep flags only
        break;
      }
      case TimeOptionsType.HALF_YEAR: {
        // Last 6 full months ending at previous month
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();

        const endMonthIndexRaw = currentMonth - 1;
        const endMonthYear = currentYear + Math.floor(endMonthIndexRaw / 12);
        const endMonthIndex = ((endMonthIndexRaw % 12) + 12) % 12;

        const startMonthIndexRaw = endMonthIndexRaw - 5;
        const startMonthYear =
          currentYear + Math.floor(startMonthIndexRaw / 12);
        const startMonthIndex = ((startMonthIndexRaw % 12) + 12) % 12;

        newStartDate = new Date(startMonthYear, startMonthIndex, 1);
        newEndDate = new Date(endMonthYear, endMonthIndex + 1, 0);

        // Compare calendar stays interactive; keep flags only
        break;
      }
      case TimeOptionsType.YEAR: {
        // Full previous year
        const lastYear = today.getFullYear() - 1;
        newStartDate = new Date(lastYear, 0, 1);
        newEndDate = new Date(lastYear, 11, 31);

        // Compare calendar stays interactive; keep flags only
        break;
      }
      case TimeOptionsType.MORE: {
        setIsEndButtonClicked(false);
        setIsStartButtonClicked(false);
        if (isDataCheckCompare) {
          setIsEndButtonClickedCompare(false);
          setIsStartButtonClickedCompare(false);
        }
        return;
      }
      default:
        return;
    }

    setDataStartDate(newStartDate);
    setDataEndDate(newEndDate);

    if (isDataCheckCompare) {
      // Update compare dates based on compare mode
      if (compareMode === TimeCompareOptionsType.CUSTOM) return;

      setIsErrorDataCompare({
        start: false,
        end: false,
      });

      if (compareMode === TimeCompareOptionsType.PREVIOUS_PERIOD) {
        const compareStart = handleSetStartDateBefore(
          option,
          newStartDate,
        ) as Date;
        const compareEnd = handleSetStartDateBefore(option, newEndDate) as Date;
        setDataStartDateCompare(compareStart);
        setDataEndDateCompare(compareEnd);
      } else if (compareMode === TimeCompareOptionsType.PREVIOUS_YEAR) {
        const compareStart = new Date(newStartDate);
        compareStart.setFullYear(compareStart.getFullYear() - 1);
        const compareEnd = new Date(newEndDate);
        compareEnd.setFullYear(compareEnd.getFullYear() - 1);
        setDataStartDateCompare(compareStart);
        setDataEndDateCompare(compareEnd);
      }
    }
  };

  // Change data time calendar
  const handleChangeCalendar = (startDate: Date, endDate: Date | null) => {
    if (isTypeTime !== TimeOptionsType.MORE) {
      setIsTypeTime(TimeOptionsType.MORE);
    }

    setDataStartDate(startDate);
    if (startDate) {
      setIsErrorData({
        ...isErrorData,
        start: false,
      });
    }
    // When switching to custom by picking on calendar, reset end date
    setDataEndDate(isTypeTime !== TimeOptionsType.MORE ? null : endDate);
    if (endDate) {
      setIsErrorData({
        ...isErrorData,
        end: false,
      });
    }
  };

  // Save data time
  const handleSaveCalendar = () => {
    setIsOpenModal(false);

    if (!dataEndDate) {
      setIsErrorData({
        ...isErrorData,
        end: true,
      });
      return;
    }
    if (!dataStartDate) {
      setIsErrorData({
        ...isErrorData,
        start: true,
      });
      return;
    }
    if (
      dataEndDate.toDateString() !== endDate?.toDateString() ||
      dataStartDate.toDateString() !== startDate.toDateString()
    ) {
      setIsLoadingLarge(true);
      setIsLoadingMedium(true);
      setIsLoadingOrganization(true);
    }
    setStartDate(dataStartDate);
    setEndDate(dataEndDate);
    setIsCheckCompare(isDataCheckCompare);
    handleResetTableData();
    const enableViews = getLineChartEnableViews(
      dataStartDate,
      dataEndDate as Date,
    ) as string[];
    if (enableViews.length > 0) {
      setLineChartViewBy({
        value: enableViews[0],
        label: enableViews[0],
      });
    } else {
      setLineChartViewBy({
        value: '',
        label: '',
      });
    }
  };

  // Change data time calendar compare
  const handleChangeCalendarCompare = (
    startDate: Date,
    endDate: Date | null,
  ) => {
    // If user edits compare dates while not in CUSTOM, switch to CUSTOM and clear end date
    if (compareMode !== TimeCompareOptionsType.CUSTOM) {
      setCompareMode(TimeCompareOptionsType.CUSTOM);
      setDataStartDateCompare(startDate);
      setDataEndDateCompare(null);
    } else {
      setDataStartDateCompare(startDate);
      setDataEndDateCompare(endDate);
    }

    if (startDate) {
      setIsErrorDataCompare((prev) => ({
        ...prev,
        start: false,
      }));
    }
    if (endDate) {
      setIsErrorDataCompare((prev) => ({
        ...prev,
        end: false,
      }));
    }
  };

  // Save data time compare
  const handleSaveCalendarCompare = () => {
    setIsOpenModal(false);

    if (!dataEndDate) {
      setIsErrorData({
        ...isErrorData,
        end: true,
      });
      return;
    }
    if (!dataStartDate) {
      setIsErrorData({
        ...isErrorData,
        start: true,
      });
      return;
    }
    if (!dataEndDateCompare) {
      setIsErrorDataCompare({
        ...isErrorData,
        end: true,
      });
      return;
    }
    // Loading
    if (
      dataEndDate.toDateString() !== endDate?.toDateString() ||
      dataStartDate.toDateString() !== startDate.toDateString()
    ) {
      setIsLoadingLarge(true);
      setIsLoadingMedium(true);
      setIsLoadingOrganization(true);
    }
    if (
      dataEndDateCompare.toDateString() !== endDateCompare?.toDateString() ||
      dataStartDateCompare.toDateString() !== startDateCompare.toDateString()
    ) {
      setIsLoadingLargeCompare(true);
      setIsLoadingMediumCompare(true);
      setIsLoadingOrganizationCompare(true);
    }
    // Data
    setStartDate(dataStartDate);
    setEndDate(dataEndDate);
    setStartDateCompare(dataStartDateCompare);
    setEndDateCompare(dataEndDateCompare);
    setIsCheckCompare(isDataCheckCompare);
    setIsOpenModal(false);
    handleResetTableData();

    const enableViews = getCompareLineChartEnableViews(
      dataStartDate,
      dataEndDate as Date,
      dataStartDateCompare,
      dataEndDateCompare as Date,
    ) as string[];
    if (enableViews.length > 0) {
      setLineChartViewBy({
        value: enableViews[0],
        label: enableViews[0],
      });
    } else {
      setLineChartViewBy({
        value: '',
        label: '',
      });
    }
  };
  const handleReset = () => {
    setIsOpenModal(false);
  };

  const handleChangeCompareMode = (mode: TimeCompareOptionsType) => {
    setCompareMode(mode);

    if (!isDataCheckCompare) return;
    if (!dataStartDate || !dataEndDate) return;

    if (mode === TimeCompareOptionsType.CUSTOM) {
      // Keep current compare values; no auto-update
      return;
    }

    setIsErrorDataCompare({
      start: false,
      end: false,
    });

    if (mode === TimeCompareOptionsType.PREVIOUS_PERIOD) {
      if (isTypeTime === TimeOptionsType.MORE) {
        // For custom ranges, compare against the immediately preceding range
        const msPerDay = 24 * 60 * 60 * 1000;
        const durationDays =
          Math.floor(
            (dataEndDate.getTime() - dataStartDate.getTime()) / msPerDay,
          ) + 1;

        const compareStart = new Date(dataStartDate);
        compareStart.setDate(compareStart.getDate() - durationDays);
        const compareEnd = new Date(dataEndDate);
        compareEnd.setDate(compareEnd.getDate() - durationDays);

        setDataStartDateCompare(compareStart);
        setDataEndDateCompare(compareEnd);
      } else {
        const compareStart = handleSetStartDateBefore(
          isTypeTime,
          dataStartDate,
        ) as Date;
        const compareEnd = handleSetStartDateBefore(
          isTypeTime,
          dataEndDate,
        ) as Date;
        setDataStartDateCompare(compareStart);
        setDataEndDateCompare(compareEnd);
      }
    } else if (mode === TimeCompareOptionsType.PREVIOUS_YEAR) {
      const compareStart = new Date(dataStartDate);
      compareStart.setFullYear(compareStart.getFullYear() - 1);
      const compareEnd = new Date(dataEndDate);
      compareEnd.setFullYear(compareEnd.getFullYear() - 1);
      setDataStartDateCompare(compareStart);
      setDataEndDateCompare(compareEnd);
    }
  };

  const handlePrevCalendar = () => {
    const dataPrevDateStart = handleSetStartDateBefore(
      isTypeTime,
      dataStartDate,
    );
    setDataStartDate(dataPrevDateStart as Date);

    if (dataEndDate) {
      const dataPrevDateEnd = handleSetStartDateBefore(isTypeTime, dataEndDate);
      setDataEndDate(dataPrevDateEnd as Date);
    }
    if (isDataCheckCompare) {
      const dataPrevDateStartCompare = handleSetStartDateBefore(
        isTypeTime,
        dataStartDateCompare,
      );
      setDataStartDateCompare(dataPrevDateStartCompare as Date);

      if (dataEndDateCompare) {
        const dataPrevDateEndCompare = handleSetStartDateBefore(
          isTypeTime,
          dataEndDateCompare,
        );
        setDataEndDate(dataPrevDateEndCompare as Date);
      }
    }
  };
  const handlePrevCalendarClose = () => {
    setIsLoadingLarge(true);
    setIsLoadingMedium(true);
    setIsLoadingOrganization(true);
    const dataPrevDateStart = handleSetStartDateBefore(
      isTypeTime,
      dataStartDate,
    );
    setDataStartDate(dataPrevDateStart as Date);
    setStartDate(dataPrevDateStart as Date);

    if (dataEndDate) {
      const dataPrevDateEnd = handleSetStartDateBefore(isTypeTime, dataEndDate);
      setDataEndDate(dataPrevDateEnd as Date);
      setEndDate(dataPrevDateEnd as Date);
    }
    if (isDataCheckCompare) {
      setIsLoadingLargeCompare(true);
      setIsLoadingMediumCompare(true);
      setIsLoadingOrganizationCompare(true);
      const dataPrevDateStartCompare = handleSetStartDateBefore(
        isTypeTime,
        dataStartDateCompare,
      );
      setDataStartDateCompare(dataPrevDateStartCompare as Date);
      setStartDateCompare(dataPrevDateStartCompare as Date);

      if (dataEndDateCompare) {
        const dataPrevDateEndCompare = handleSetStartDateBefore(
          isTypeTime,
          dataEndDateCompare,
        );
        setDataEndDate(dataPrevDateEndCompare as Date);
        setEndDateCompare(dataPrevDateEndCompare as Date);
      }
      const enableViews = getCompareLineChartEnableViews(
        dataStartDate,
        dataEndDate as Date,
        dataStartDateCompare,
        dataEndDateCompare as Date,
      ) as string[];
      if (enableViews.length > 0) {
        setLineChartViewBy({
          value: enableViews[0],
          label: enableViews[0],
        });
      } else {
        setLineChartViewBy({
          value: '',
          label: '',
        });
      }
    } else {
      const enableViews = getLineChartEnableViews(
        dataStartDate,
        dataEndDate as Date,
      ) as string[];
      if (enableViews.length > 0) {
        setLineChartViewBy({
          value: enableViews[0],
          label: enableViews[0],
        });
      } else {
        setLineChartViewBy({
          value: '',
          label: '',
        });
      }
    }
  };
  const handleNextCalendar = () => {
    const dataPrevDateStart = handleSetStartDateAfter(
      isTypeTime,
      dataStartDate,
    );
    setDataStartDate(dataPrevDateStart as Date);

    if (dataEndDate) {
      const dataPrevDateEnd = handleSetStartDateAfter(isTypeTime, dataEndDate);
      setDataEndDate(dataPrevDateEnd as Date);
    }
    if (isDataCheckCompare) {
      const dataPrevDateStartCompare = handleSetStartDateAfter(
        isTypeTime,
        dataStartDateCompare,
      );
      setDataStartDateCompare(dataPrevDateStartCompare as Date);

      if (dataEndDateCompare) {
        const dataPrevDateEndCompare = handleSetStartDateAfter(
          isTypeTime,
          dataEndDateCompare,
        );
        setDataEndDate(dataPrevDateEndCompare as Date);
      }
    }
  };
  const handleNextCalendarClose = () => {
    setIsOpenModal(false);
    setIsLoadingLarge(true);
    setIsLoadingMedium(true);
    setIsLoadingOrganization(true);
    const dataPrevDateStart = handleSetStartDateAfter(
      isTypeTime,
      dataStartDate,
    );

    setDataStartDate(dataPrevDateStart as Date);
    setStartDate(dataPrevDateStart as Date);

    if (dataEndDate) {
      const dataPrevDateEnd = handleSetStartDateAfter(isTypeTime, dataEndDate);
      setDataEndDate(dataPrevDateEnd as Date);
      setEndDate(dataPrevDateEnd as Date);
    }
    if (isDataCheckCompare) {
      setIsLoadingLargeCompare(true);
      setIsLoadingMediumCompare(true);
      setIsLoadingOrganizationCompare(true);
      const dataPrevDateStartCompare = handleSetStartDateAfter(
        isTypeTime,
        dataStartDateCompare,
      );
      setDataStartDateCompare(dataPrevDateStartCompare as Date);
      setStartDateCompare(dataPrevDateStartCompare as Date);

      if (dataEndDateCompare) {
        const dataPrevDateEndCompare = handleSetStartDateAfter(
          isTypeTime,
          dataEndDateCompare,
        );
        setDataEndDate(dataPrevDateEndCompare as Date);
        setEndDateCompare(dataPrevDateEndCompare as Date);
      }
      const enableViews = getCompareLineChartEnableViews(
        dataStartDate,
        dataEndDate as Date,
        dataStartDateCompare,
        dataEndDateCompare as Date,
      ) as string[];
      if (enableViews.length > 0) {
        setLineChartViewBy({
          value: enableViews[0],
          label: enableViews[0],
        });
      } else {
        setLineChartViewBy({
          value: '',
          label: '',
        });
      }
    } else {
      const enableViews = getLineChartEnableViews(
        dataStartDate,
        dataEndDate as Date,
      ) as string[];
      if (enableViews.length > 0) {
        setLineChartViewBy({
          value: enableViews[0],
          label: enableViews[0],
        });
      } else {
        setLineChartViewBy({
          value: '',
          label: '',
        });
      }
    }
  };

  return (
    <div className="relative">
      {/* Input data */}
      <div className="flex items-center gap-3">
        <div
          onClick={(e) => {
            if (
              isLoadingLarge ||
              isLoadingLargeCompare ||
              isLoadingMedium ||
              isLoadingMediumCompare ||
              isLoadingOrganization ||
              isLoadingOrganizationCompare
            )
              return;
            e.preventDefault();
            if (isOpenModal) {
              handlePrevCalendar();
            } else {
              handlePrevCalendarClose();
            }
          }}
          ref={buttonPrev}>
          <ImageRound
            className="h-fit w-fit cursor-pointer"
            src="/icons/left-statistic.svg"
            name="left"
          />
        </div>
        <div
          onClick={() => {
            if (
              isLoadingLarge ||
              isLoadingLargeCompare ||
              isLoadingMedium ||
              isLoadingMediumCompare ||
              isLoadingOrganization ||
              isLoadingOrganizationCompare
            )
              return;
            setIsOpenModal(!isOpenModal);
          }}
          className="w-fit h-fit min-h-[34px] cursor-pointer flex flex-col gap-[6px]  px-3 py-2 border border-[#77858F] bg-white rounded-md  ">
          <div className="grid grid-cols-[max-content_1fr] gap-x-[10px] gap-y-[6px]">
            <div className="text-xs font-medium text-primary px-[14px] h-[18px] inline-flex items-center justify-center bg-[#EBF1F7] rounded-sm self-center text-nowrap">
              {isTypeTime}
            </div>
            <div className="text-[13px] text-black font-normal flex items-center gap-[6px] text-nowrap">
              <span>{startDate && formatShowDateJapanese(startDate)}</span>
              <div className="h-[20px] flex items-center text-[#77858F]">
                〜
              </div>
              <span>{endDate && formatShowDateJapanese(endDate)}</span>
              <div className="w-fit h-full flex items-center">
                <ImageRound
                  className={`w-[14px] h-[14px]  hover:cursor-pointer relative top-[1px]`}
                  name="Calendar icon"
                  src={`/icons/calendar-time.svg`}
                />
              </div>
            </div>
            {isCheckCompare && (
              <>
                <div className="text-xs font-medium text-[#E95062] px-[14px] h-[18px] inline-flex items-center justify-center bg-[#F9EAEA] rounded-sm self-center">
                  {compareMode}
                </div>
                <div className="text-[13px] text-black font-normal flex items-center gap-[6px]">
                  <span>
                    {startDateCompare &&
                      formatShowDateJapanese(startDateCompare)}
                  </span>
                  <div className="h-[20px] flex items-center text-[#77858F]">
                    〜
                  </div>
                  <span>
                    {endDateCompare && formatShowDateJapanese(endDateCompare)}
                  </span>
                  <div className="w-fit h-full flex items-center">
                    <ImageRound
                      className={`w-[14px] h-[14px]  hover:cursor-pointer relative top-[2px]`}
                      name="Calendar icon"
                      src={`/icons/calendar-time.svg`}
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        <div
          ref={buttonNext}
          onClick={(e) => {
            if (
              isLoadingLarge ||
              isLoadingLargeCompare ||
              isLoadingMedium ||
              isLoadingMediumCompare ||
              isLoadingOrganization ||
              isLoadingOrganizationCompare
            )
              return;
            e.preventDefault();
            if (isOpenModal) {
              handleNextCalendar();
            } else {
              handleNextCalendarClose();
            }
          }}>
          <ImageRound
            className=" h-fit w-fit cursor-pointer"
            src="/icons/right-statistic.svg"
            name="right"
          />
        </div>
      </div>

      {/* Modal */}

      {isOpenModal && (
        <div
          ref={modalRef}
          style={{
            boxShadow: '0px 2px 8px 0px #0000001A',
          }}
          className="absolute z-20 top-[40px] right-0 w-[540px] h-fit rounded-md bg-white p-[30px]">
          <div className="flex justify-center mb-[30px]">
            <div className="text-xs font-medium text-[#77858F] bg-[#EBF1F7] w-fit py-1 px-[6px] rounded-[20px] flex">
              {Object.values(TimeOptionsType).map((option) => (
                <div
                  key={option}
                  onClick={() => handleSelectTimeOption(option)}
                  className={`${option == TimeOptionsType.YESTERDAY && '!hidden'} ${isTypeTime === option && 'bg-button rounded-[20px] !text-white'} cursor-pointer h-[24px] px-5 flex items-center`}>
                  {option}
                </div>
              ))}
            </div>
          </div>
          {/* Value 1 */}
          <div className="flex text-xs font-normal text-black">
            <div className="flex-1">
              <div className="w-[58px] rounded-sm bg-[#EBF1F7] text-xs text-primary font-medium flex justify-center py-1">
                表示期間
              </div>
              <div>
                <div
                  onClick={() => {
                    setIsEndButtonClicked(false);
                    setIsStartButtonClicked(true);
                  }}
                  className="gap-3 flex items-center mt-[6px]">
                  <span>開始日</span>
                  <div
                    className={`w-[135px] h-[34px] flex items-center justify-center cursor-pointer rounded-md border ${isStartButtonClicked ? 'border-primary' : 'border-[#77858F]'} ${isErrorData.start && '!border-red-500'}`}>
                    {formatShowDateJapanese(dataStartDate)}
                  </div>
                  <div className="h-[34px] flex items-center text-[#77858F]">
                    〜
                  </div>
                </div>
                <div
                  onClick={() => {
                    setIsStartButtonClicked(false);

                    setIsEndButtonClicked(true);
                  }}
                  className="gap-3 flex items-center mt-[6px]">
                  <span>終了日</span>
                  <div
                    className={`w-[135px] h-[34px] flex items-center justify-center cursor-pointer rounded-md border ${isEndButtonClicked ? 'border-primary' : 'border-[#77858F]'} ${isErrorData.end && '!border-red-500'}`}>
                    {dataEndDate && formatShowDateJapanese(dataEndDate)}
                  </div>
                </div>
                <div className="mt-[30px]">
                  <Checkbox
                    isChecked={isDataCheckCompare}
                    onChange={(e) => {
                      if (e) {
                        if (isTypeTime !== TimeOptionsType.MORE) {
                          setCompareMode(
                            TimeCompareOptionsType.PREVIOUS_PERIOD,
                          );
                        } else {
                          setCompareMode(TimeCompareOptionsType.CUSTOM);
                        }
                        setIsErrorDataCompare({
                          start: false,
                          end: false,
                        });
                        const dateStart = handleSetStartDateBefore(
                          isTypeTime,
                          dataStartDate,
                        );
                        setDataStartDateCompare(dateStart as Date);
                        if (dataEndDate) {
                          const dateEnd = handleSetStartDateBefore(
                            isTypeTime,
                            dataEndDate,
                          );
                          setDataEndDateCompare(dateEnd as Date);
                        } else {
                          setDataEndDateCompare(null);
                        }
                      }

                      setIsDataCheckCompare(e);
                    }}
                    label="過去の期間と比較する"
                  />
                </div>
                {!isDataCheckCompare ? (
                  <div className="flex gap-[10px] mt-[60px]">
                    <Button
                      variant="outline"
                      onClick={handleReset}
                      className="!py-0 !px-0 w-[100px] h-9 rounded-md text-[13px] font-medium">
                      キャンセル
                    </Button>
                    <Button
                      disabled={!dataStartDate || !dataEndDate}
                      onClick={handleSaveCalendar}
                      className="!py-0 !px-0 w-[100px] h-9 rounded-md text-[13px] font-medium">
                      適応
                    </Button>
                  </div>
                ) : (
                  <div className="mt-[60px] h-8"></div>
                )}
              </div>
            </div>
            <div className="flex-1">
              <MultiDatePickerCustom
                isTypeTime={TimeOptionsType.MORE}
                initialStartDate={dataStartDate}
                initialEndDate={dataEndDate}
                isEndButtonClicked={
                  isTypeTime === TimeOptionsType.MORE
                    ? isEndButtonClicked
                    : false
                }
                isStartButtonClicked={
                  isTypeTime === TimeOptionsType.MORE
                    ? isStartButtonClicked
                    : true
                }
                resetEndClick={() => {
                  setIsEndButtonClicked(false);
                }}
                resetStartClick={() => {
                  setIsStartButtonClicked(false);
                }}
                clickStartButton={() => {
                  setIsStartButtonClicked(true);
                }}
                clickEndButton={() => {
                  setIsEndButtonClicked(true);
                }}
                resetStartClickCustom={() => {
                  setIsStartButtonClicked(false);
                }}
                onChange={handleChangeCalendar}
              />
            </div>
          </div>
          {/* Value compare */}
          {isDataCheckCompare && (
            <div className="flex mt-[30px] text-xs font-normal text-black">
              <div className="flex-1">
                <div className="w-[58px] rounded-sm bg-[#F9EAEA] text-xs text-[#E95062] font-medium flex justify-center py-1">
                  比較期間
                </div>
                <div>
                  <div
                    onClick={() => {
                      setIsStartButtonClickedCompare(true);
                    }}
                    className="gap-3 flex items-center mt-[6px]">
                    <span>開始日</span>
                    <div
                      className={`w-[135px] h-[34px] flex items-center justify-center cursor-pointer rounded-md border ${isStartButtonClickedCompare ? 'border-primary' : 'border-[#77858F]'} ${isErrorDataCompare.start && '!border-red-500'}`}>
                      {dataStartDateCompare &&
                        formatShowDateJapanese(dataStartDateCompare)}
                    </div>
                    <div className="h-[34px] flex items-center text-[#77858F]">
                      〜
                    </div>
                  </div>
                  <div
                    onClick={() => {
                      setIsEndButtonClickedCompare(true);
                    }}
                    className="gap-3 flex items-center mt-[6px]">
                    <span>終了日</span>
                    <div
                      className={`w-[135px] h-[34px] flex items-center justify-center cursor-pointer rounded-md border ${isEndButtonClickedCompare ? 'border-primary' : 'border-[#77858F]'} ${isErrorDataCompare.end && '!border-red-500'}`}>
                      {dataEndDateCompare &&
                        formatShowDateJapanese(dataEndDateCompare)}
                    </div>
                  </div>
                  <div className="mt-[14px] space-y-2">
                    <DynamicTooltip
                      content="終了日を選択すると比較できます"
                      placement="right"
                      disabled={!!(dataStartDate && dataEndDate)}>
                      <div className="inline-block">
                        <Checkbox
                          id="compare-mode-previous-period"
                          disable={
                            compareMode ===
                              TimeCompareOptionsType.PREVIOUS_PERIOD ||
                            !dataStartDate ||
                            !dataEndDate
                          }
                          label={TimeCompareOptionsType.PREVIOUS_PERIOD}
                          isChecked={
                            compareMode ===
                            TimeCompareOptionsType.PREVIOUS_PERIOD
                          }
                          onChange={() =>
                            handleChangeCompareMode(
                              TimeCompareOptionsType.PREVIOUS_PERIOD,
                            )
                          }
                          classSize="!w-4 !h-4 !opacity-100"
                          classLabel="text-xs mt-1"
                        />
                      </div>
                    </DynamicTooltip>
                    <DynamicTooltip
                      content="終了日を選択すると比較できます"
                      placement="right"
                      disabled={!!(dataStartDate && dataEndDate)}>
                      <div className="inline-block">
                        <Checkbox
                          id="compare-mode-previous-year"
                          label={TimeCompareOptionsType.PREVIOUS_YEAR}
                          disable={
                            compareMode ===
                              TimeCompareOptionsType.PREVIOUS_YEAR ||
                            !dataStartDate ||
                            !dataEndDate
                          }
                          isChecked={
                            compareMode === TimeCompareOptionsType.PREVIOUS_YEAR
                          }
                          onChange={() =>
                            handleChangeCompareMode(
                              TimeCompareOptionsType.PREVIOUS_YEAR,
                            )
                          }
                          classSize="!w-4 !h-4 !opacity-100"
                          classLabel="text-xs mt-1"
                        />
                      </div>
                    </DynamicTooltip>
                    <Checkbox
                      id="compare-mode-custom"
                      disable={compareMode === TimeCompareOptionsType.CUSTOM}
                      label={TimeCompareOptionsType.CUSTOM}
                      isChecked={compareMode === TimeCompareOptionsType.CUSTOM}
                      onChange={() =>
                        handleChangeCompareMode(TimeCompareOptionsType.CUSTOM)
                      }
                      classSize="!w-4 !h-4 !opacity-100"
                      classLabel="text-xs mt-1"
                    />
                  </div>
                  <div className="mt-[10px] h-8"></div>
                  <div className="flex gap-[10px] mt-[30px]">
                    <Button
                      variant="outline"
                      onClick={handleReset}
                      className="!py-0 !px-0 w-[100px] h-9 rounded-md text-[13px] font-medium">
                      キャンセル
                    </Button>
                    <Button
                      disabled={
                        !dataStartDate ||
                        !dataEndDate ||
                        (isDataCheckCompare &&
                          (!dataStartDateCompare || !dataEndDateCompare))
                      }
                      onClick={handleSaveCalendarCompare}
                      className="!py-0 !px-0 w-[100px] h-9 rounded-md text-[13px] font-medium">
                      適応
                    </Button>
                  </div>
                </div>
              </div>
              <div className="flex-1 multi-date-compare">
                <MultiDatePickerCustom
                  isCalendarCompare
                  isTypeTime={TimeOptionsType.MORE}
                  initialStartDate={dataStartDateCompare}
                  initialEndDate={dataEndDateCompare}
                  isDisable={false}
                  isEndButtonClicked={
                    compareMode === TimeCompareOptionsType.CUSTOM
                      ? isEndButtonClickedCompare
                      : false
                  }
                  isStartButtonClicked={
                    compareMode === TimeCompareOptionsType.CUSTOM
                      ? isStartButtonClickedCompare
                      : true
                  }
                  resetEndClick={() => {
                    setIsEndButtonClickedCompare(false);
                  }}
                  resetStartClick={() => {
                    setIsStartButtonClickedCompare(false);
                  }}
                  clickStartButton={() => {
                    setIsStartButtonClickedCompare(true);
                  }}
                  clickEndButton={() => {
                    setIsEndButtonClickedCompare(true);
                  }}
                  resetStartClickCustom={() => {
                    setIsStartButtonClickedCompare(false);
                  }}
                  onChange={handleChangeCalendarCompare}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default StatisticTeamCalendar;
