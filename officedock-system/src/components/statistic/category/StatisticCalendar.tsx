import React, { useContext, useEffect, useRef, useState } from 'react';

import Button from '@components/common/Button';
import Checkbox from '@components/common/Checkbox';
import MultiDatePickerCustom from '@components/common/DatePicker/MultiDatePickerCustom';
import ImageRound from '@components/common/ImageRound';

import { TimeOptionsType } from '@constants/enums';
import {
  formatShowDateJapanese,
  getDaysFromTimeOption,
  handleSetStartDateAfter,
  handleSetStartDateBefore,
} from '@utils/date';
import { StatisticStateContext } from '@providers/StatisticProvider';
import { LoadingContext } from '@providers/LoadingProvider';

function StatisticCalendar() {
  const {
    startDate,
    endDate,
    endDateCompare,
    startDateCompare,
    isCheckCompare,
    setIsCheckCompare,
    setStartDate,
    setEndDate,
    setStartDateCompare,
    setEndDateCompare,
  } = useContext(StatisticStateContext);
  const modalRef = useRef<HTMLDivElement | null>(null);
  const buttonPrev = useRef<HTMLDivElement | null>(null);
  const buttonNext = useRef<HTMLDivElement | null>(null);

  const { setIsLoading } = useContext(LoadingContext);

  const [isTypeTime, setIsTypeTime] = useState<TimeOptionsType>(
    TimeOptionsType.MONTH,
  );
  const [isDisableCalendar, setIsDisableCalendar] = useState(true);

  const [isOpenModal, setIsOpenModal] = useState(false);
  const [isEndButtonClicked, setIsEndButtonClicked] = useState(false);
  const [isStartButtonClicked, setIsStartButtonClicked] = useState(true);

  const [dataStartDate, setDataStartDate] = useState(new Date());
  const [dataEndDate, setDataEndDate] = useState<Date | null>(null);
  const [isDataCheckCompare, setIsDataCheckCompare] = useState(false);

  // Compare

  const [dataStartDateCompare, setDataStartDateCompare] = useState(new Date());
  const [dataEndDateCompare, setDataEndDateCompare] = useState<Date | null>(
    null,
  );
  const [isDisableCalendarCompare, setIsDisableCalendarCompare] =
    useState(true);

  const [isEndButtonClickedCompare, setIsEndButtonClickedCompare] =
    useState(false);
  const [isStartButtonClickedCompare, setIsStartButtonClickedCompare] =
    useState(true);

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

  // Selection option time
  const handleSelectTimeOption = (option: TimeOptionsType) => {
    setIsTypeTime(option);
    if (!dataEndDate) {
      setDataEndDate(new Date());
    }
    const dataResource = dataEndDate || new Date();

    if (!dataResource) return;

    const newStartDate: Date = new Date(dataResource);

    switch (option) {
      case TimeOptionsType.WEEK: {
        const days = getDaysFromTimeOption(option, dataResource, true);
        newStartDate.setDate(newStartDate.getDate() - days + 1);
        setIsDisableCalendar(true);
        if (isCheckCompare) {
          setIsDisableCalendarCompare(true);
        }
        break;
      }

      case TimeOptionsType.MONTH: {
        const days = getDaysFromTimeOption(option, dataResource, true);

        newStartDate.setDate(newStartDate.getDate() - days + 1);
        setIsDisableCalendar(true);
        if (isCheckCompare) {
          setIsDisableCalendarCompare(true);
        }
        break;
      }

      case TimeOptionsType.HALF_YEAR: {
        const days = getDaysFromTimeOption(option, dataResource, true);
        newStartDate.setDate(newStartDate.getDate() - days + 1);
        setIsDisableCalendar(true);
        if (isCheckCompare) {
          setIsDisableCalendarCompare(true);
        }
        break;
      }

      case TimeOptionsType.YEAR: {
        const days = getDaysFromTimeOption(option, dataResource, true);
        newStartDate.setDate(newStartDate.getDate() - days + 1);
        setIsDisableCalendar(true);
        if (isCheckCompare) {
          setIsDisableCalendarCompare(true);
        }
        break;
      }

      case TimeOptionsType.MORE:
        setIsDisableCalendar(false);
        setIsEndButtonClicked(false);
        setIsStartButtonClicked(false);
        if (isDataCheckCompare) {
          setIsDisableCalendarCompare(false);
          setIsEndButtonClickedCompare(false);
          setIsStartButtonClickedCompare(false);
        }
        return;

      default:
        return;
    }

    setDataStartDate(newStartDate);

    if (isDataCheckCompare) {
      setDataStartDateCompare(
        handleSetStartDateBefore(option, newStartDate) as Date,
      );
      if (!dataEndDateCompare) {
        setDataEndDateCompare(new Date());
      } else {
        setDataEndDateCompare(
          handleSetStartDateBefore(option, dataEndDate || new Date()) as Date,
        );
      }
    }
  };

  // Change data time calendar
  const handleChangeCalendar = (startDate: Date, endDate: Date | null) => {
    setDataStartDate(startDate);
    setDataEndDate(endDate);
  };

  // Save data time
  const handleSaveCalendar = () => {
    setStartDate(dataStartDate);
    setEndDate(dataEndDate);
    setIsCheckCompare(isDataCheckCompare);
  };

  // Change data time calendar compare
  const handleChangeCalendarCompare = (
    startDate: Date,
    endDate: Date | null,
  ) => {
    setDataStartDateCompare(startDate);
    setDataEndDateCompare(endDate);
  };

  // Save data time compare
  const handleSaveCalendarCompare = () => {
    setIsLoading(true);
    setStartDate(dataStartDate);
    setEndDate(dataEndDate);
    setStartDateCompare(dataStartDateCompare);
    setEndDateCompare(dataEndDateCompare);
    setIsCheckCompare(isDataCheckCompare);
    setIsOpenModal(false);
  };
  const handleReset = () => {
    setIsOpenModal(false);
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

  return (
    <div className="relative">
      {/* Input data */}
      <div className="flex items-center gap-3">
        <div
          onClick={(e) => {
            e.preventDefault();
            setIsOpenModal(true);

            handlePrevCalendar();
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
            setIsOpenModal(!isOpenModal);
          }}
          className="w-fit h-fit min-h-[34px] flex flex-col gap-[6px]  px-3 py-2 border border-[#77858F] bg-white rounded-md  ">
          <div className="flex items-center gap-[10px] h-5">
            <div className="text-xs font-medium text-[#0068B6] px-[14px] h-[18px] flex items-center  bg-[#EBF1F7] rounded-sm">
              {isTypeTime}
            </div>
            <div className="text-sm text-black font-normal flex items-center gap-[6px]">
              <span>{startDate && formatShowDateJapanese(startDate)}</span>
              <div className="h-[34px] flex items-center text-[#77858F]">
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
          </div>
          {isCheckCompare && (
            <div className="flex items-center gap-[10px] h-5">
              <div className="text-xs font-medium text-[#C32E2E] px-[14px] flex items-center  bg-[#F9EAEA] rounded-sm">
                {isTypeTime}
              </div>
              <div className="text-sm text-black font-normal flex items-center gap-[6px]">
                <span>
                  {startDateCompare && formatShowDateJapanese(startDateCompare)}
                </span>
                <div className="h-[34px] flex items-center text-[#77858F]">
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
            </div>
          )}
        </div>
        <div
          ref={buttonNext}
          onClick={(e) => {
            e.preventDefault();
            setIsOpenModal(true);

            handleNextCalendar();
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
                  className={`${isTypeTime === option && 'bg-[#0068B6] rounded-[20px] !text-white'} cursor-pointer h-[24px] px-5 flex items-center`}>
                  {option}
                </div>
              ))}
            </div>
          </div>
          {/* Value 1 */}
          <div className="flex text-xs font-normal text-black">
            <div className="flex-1">
              <div className="w-[58px] rounded-sm bg-[#EBF1F7] text-xs text-[#0068B6] font-medium flex justify-center py-1">
                表示期間
              </div>
              <div>
                <div
                  onClick={() => {
                    setIsDisableCalendar(false);
                    setIsEndButtonClickedCompare(false);

                    setIsStartButtonClicked(true);
                  }}
                  className="gap-3 flex items-center mt-[6px]">
                  <span>開始日</span>
                  <div className="w-[135px] h-[34px] flex items-center justify-center rounded-md border border-[#77858F]">
                    {formatShowDateJapanese(dataStartDate)}
                  </div>
                  <div className="h-[34px] flex items-center text-[#77858F]">
                    〜
                  </div>
                </div>
                <div
                  onClick={() => {
                    setIsDisableCalendar(false);
                    setIsStartButtonClicked(false);

                    setIsEndButtonClicked(true);
                  }}
                  className="gap-3 flex items-center mt-[6px]">
                  <span>終了日</span>
                  <div className="w-[135px] h-[34px] flex items-center justify-center rounded-md border border-[#77858F]">
                    {dataEndDate && formatShowDateJapanese(dataEndDate)}
                  </div>
                </div>
                <div className="mt-[30px]">
                  <Checkbox
                    isChecked={isDataCheckCompare}
                    onChange={(e) => {
                      if (e) {
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
                isTypeTime={isTypeTime}
                initialStartDate={dataStartDate}
                initialEndDate={dataEndDate}
                isDisable={isDisableCalendar}
                isEndButtonClicked={isEndButtonClicked}
                isStartButtonClicked={isStartButtonClicked}
                resetEndClick={() => {
                  setIsDisableCalendar(true);
                  setIsEndButtonClicked(false);
                }}
                resetStartClick={() => {
                  setIsDisableCalendar(true);
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
                <div className="w-[58px] rounded-sm bg-[#F9EAEA] text-xs text-[#C32E2E] font-medium flex justify-center py-1">
                  比較期間
                </div>
                <div>
                  <div
                    onClick={() => {
                      setIsDisableCalendarCompare(false);
                      setIsStartButtonClickedCompare(true);
                    }}
                    className="gap-3 flex items-center mt-[6px]">
                    <span>開始日</span>
                    <div className="w-[135px] h-[34px] flex items-center justify-center rounded-md border border-[#77858F]">
                      {dataStartDateCompare &&
                        formatShowDateJapanese(dataStartDateCompare)}
                    </div>
                    <div className="h-[34px] flex items-center text-[#77858F]">
                      〜
                    </div>
                  </div>
                  <div
                    onClick={() => {
                      setIsDisableCalendarCompare(false);
                      setIsEndButtonClickedCompare(true);
                    }}
                    className="gap-3 flex items-center mt-[6px]">
                    <span>終了日</span>
                    <div className="w-[135px] h-[34px] flex items-center justify-center rounded-md border border-[#77858F]">
                      {dataEndDateCompare &&
                        formatShowDateJapanese(dataEndDateCompare)}
                    </div>
                  </div>
                  <div className="mt-[30px] h-8"></div>
                  <div className="flex gap-[10px] mt-[60px]">
                    <Button
                      variant="outline"
                      onClick={handleReset}
                      className="!py-0 !px-0 w-[100px] h-9 rounded-md text-[13px] font-medium">
                      キャンセル
                    </Button>
                    <Button
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
                  isTypeTime={isTypeTime}
                  initialStartDate={dataStartDateCompare}
                  initialEndDate={dataEndDateCompare}
                  isDisable={isDisableCalendarCompare}
                  isEndButtonClicked={isEndButtonClickedCompare}
                  isStartButtonClicked={isStartButtonClickedCompare}
                  resetEndClick={() => {
                    setIsDisableCalendarCompare(true);
                    setIsEndButtonClickedCompare(false);
                  }}
                  resetStartClick={() => {
                    setIsDisableCalendarCompare(true);
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

export default StatisticCalendar;
