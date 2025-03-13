import React, { useEffect, useRef, useState } from 'react';

import Button from '@components/common/Button';
import Checkbox from '@components/common/Checkbox';
import MultiDatePickerCustom from '@components/common/DatePicker/MultiDatePickerCustom';
import ImageRound from '@components/common/ImageRound';

import { TimeOptionsType } from '@constants/enums';
import { formatShowDateJapanese } from '@utils/date';

interface StatisticCalendarProps {
  startDate: Date;
  endDate: Date | null;
  setStartDate: React.Dispatch<React.SetStateAction<Date>>;
  setEndDate: React.Dispatch<React.SetStateAction<Date | null>>;
}

function StatisticCalendar({
  startDate,
  endDate,
  setStartDate,
  setEndDate,
}: StatisticCalendarProps) {
  const modalRef = useRef<HTMLDivElement | null>(null);

  const [isTypeTime, setIsTypeTime] = useState<TimeOptionsType>(
    TimeOptionsType.MONTH,
  );
  const [isDisableCalendar, setIsDisableCalendar] = useState(true);

  const [isOpenModal, setIsOpenModal] = useState(false);
  const [isEndButtonClicked, setIsEndButtonClicked] = useState(false);
  const [isStartButtonClicked, setIsStartButtonClicked] = useState(true);

  const [dataStartDate, setDataStartDate] = useState(new Date());
  const [dataEndDate, setDataEndDate] = useState<Date | null>(null);

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
      if (modalRef.current && !modalRef.current.contains(event.target)) {
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

    if (!endDate) return;

    const newStartDate: Date = new Date(endDate);

    switch (option) {
      case TimeOptionsType.WEEK:
        newStartDate.setDate(newStartDate.getDate() - 7);
        setIsDisableCalendar(true);

        break;
      case TimeOptionsType.MONTH:
        newStartDate.setMonth(newStartDate.getMonth() - 1);
        setIsDisableCalendar(true);

        break;
      case TimeOptionsType.HALF_YEAR:
        newStartDate.setMonth(newStartDate.getMonth() - 6);
        setIsDisableCalendar(true);

        break;
      case TimeOptionsType.YEAR:
        newStartDate.setFullYear(newStartDate.getFullYear() - 1);
        setIsDisableCalendar(true);

        break;
      case TimeOptionsType.MORE:
        setIsDisableCalendar(false);
        return;
    }

    setDataStartDate(newStartDate);
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
  };

  return (
    <div className="relative">
      {/* Input data */}
      <div
        onClick={() => {
          setIsOpenModal(!isOpenModal);
        }}
        className="flex items-center gap-3">
        <ImageRound
          className="h-fit w-fit cursor-pointer"
          src="/icons/left-statistic.svg"
          name="left"
        />
        <div className="w-fit h-[34px] px-3 border border-[#77858F] bg-white rounded-md flex items-center">
          <div className="text-xs font-medium text-[#0068B6] px-[14px] flex items-center h-[18px] bg-[#EBF1F7] rounded-sm">
            {isTypeTime}
          </div>
          <div className="text-sm text-black font-normal flex items-center gap-[6px]">
            <span>{startDate && formatShowDateJapanese(startDate)}</span>
            <div className="h-[34px] flex items-center text-[#77858F]">〜</div>
            <span>{endDate && formatShowDateJapanese(endDate)}</span>
            <div className="w-fit h-full flex items-center">
              <ImageRound
                className={`w-[14px] h-[14px]  hover:cursor-pointer relative top-[2px]`}
                name="Calendar icon"
                src={`/icons/calendar-time.svg`}
              />
            </div>
          </div>
        </div>
        <ImageRound
          className=" h-fit w-fit cursor-pointer"
          src="/icons/right-statistic.svg"
          name="right"
        />
      </div>

      {/* Modal */}

      {isOpenModal && (
        <div
          ref={modalRef}
          style={{
            boxShadow: '0px 2px 8px 0px #0000001A',
          }}
          className="absolute z-20 top-[40px] right-0 w-[540px] h-[362px] rounded-md bg-white p-[30px]">
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
          <div className="flex text-xs font-normal text-black">
            <div className="flex-1">
              <div className="w-[58px] rounded-sm bg-[#EBF1F7] text-xs text-[#0068B6] font-medium flex justify-center py-1">
                表示期間
              </div>
              <div>
                <div
                  onClick={() => {
                    setIsDisableCalendar(false);
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
                    setIsEndButtonClicked(true);
                  }}
                  className="gap-3 flex items-center mt-[6px]">
                  <span>終了日</span>
                  <div className="w-[135px] h-[34px] flex items-center justify-center rounded-md border border-[#77858F]">
                    {dataEndDate && formatShowDateJapanese(dataEndDate)}
                  </div>
                </div>
                <div className="mt-[30px]">
                  <Checkbox label="過去の期間と比較する" />
                </div>
                <div className="flex gap-[10px] mt-[60px]">
                  <Button
                    variant="outline"
                    onClick={() => {}}
                    className="!py-0 !px-0 w-[100px] h-9 rounded-md text-[13px] font-medium">
                    キャンセル
                  </Button>
                  <Button
                    onClick={handleSaveCalendar}
                    className="!py-0 !px-0 w-[100px] h-9 rounded-md text-[13px] font-medium">
                    適応
                  </Button>
                </div>
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
        </div>
      )}
    </div>
  );
}

export default StatisticCalendar;
