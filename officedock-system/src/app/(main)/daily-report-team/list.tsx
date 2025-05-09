'use client';
import React, { useContext, useEffect, useState } from 'react';
import { useMutation } from 'react-query';

import Button from '@components/common/Button';
import DatePicker from '@components/common/DatePicker';
import Dropdown from '@components/common/Dropdown';
import ImageRound from '@components/common/ImageRound';
import ItemListDaily from '@components/daily/ItemListDaily';

import { DATE_TEXT_FORMAT } from '@constants';
import { apiRouters } from '@constants/routers';
import useListDailyReport from '@hooks/useListDailyReport';
import {
  DataListDailyType,
  dataRequestConfirmType,
} from '@interfaces/statistic';
import { LoadingContext } from '@providers/LoadingProvider';
import { TeamDailyStateContext } from '@providers/TeamDailyReportProvider';
import {
  formatDateServer,
  isTodaySchedule,
  isYesterdaySchedule,
} from '@utils/date';
import api from '@base/api';
import { OptionDropdownType } from '@interfaces/common';
import useTeamList from '@hooks/useListTeam';

const ListData = () => {
  const { setIsLoading } = useContext(LoadingContext);
  const { dataDatePicker, setDataDatePicker } = useContext(
    TeamDailyStateContext,
  );

  const [dataListDailyReport, setDataListDailyReport] = useState<
    DataListDailyType[]
  >([]);

  const [organizationTeamList, setOrganizationList] = useState<
    OptionDropdownType[]
  >([]);

  const [selectedOrganization, setSelectedOrganization] =
    useState<OptionDropdownType>({
      label: 'すべて',
      value: 'ALL',
    });

  useTeamList({
    screenName: 'team_daily_report',
    onSuccess: (data) => {
      setOrganizationList([
        ...data.map((item) => ({
          label: item.name,
          value: item.id as number,
        })),
      ]);
    },
  });

  const { listDailyReport } = useListDailyReport({
    date: formatDateServer(dataDatePicker),
    organization_ids:
      selectedOrganization.value !== 'ALL'
        ? [selectedOrganization]
        : organizationTeamList,
  });

  useEffect(() => {
    if (listDailyReport) {
      setDataListDailyReport(listDailyReport);
    }
  }, [listDailyReport]);

  //  Handle call api confirm user daily
  const handleActionConfirmUserDaily = async (
    dataUser: dataRequestConfirmType,
  ) => {
    const { data } = await api.post(
      `${apiRouters.CONFIRM_USER_DAILY(dataUser.id)}`,
      {
        isConfirmed: dataUser.isConfirmed,
        date: formatDateServer(new Date()),
      },
    );
    return data;
  };
  const { mutate: confirmUserDaily } = useMutation(
    'postConfirmUserDaily',
    handleActionConfirmUserDaily,
    {
      onSuccess: async (data, variant) => {
        setDataListDailyReport((prevData) =>
          prevData.map((item) => ({
            ...item,
            users: item.users.map((user) =>
              user.id === variant.id
                ? { ...user, isConfirmed: variant.isConfirmed }
                : user,
            ),
          })),
        );
      },
      onError: () => {},
      onSettled: () => {},
    },
  );

  const handlePrevDay = () => {
    setIsLoading(true);

    const newDate = new Date(dataDatePicker);
    newDate.setDate(newDate.getDate() - 1);
    setDataDatePicker(newDate);
  };
  const handleNextDay = () => {
    const newDate = new Date(dataDatePicker);
    newDate.setDate(newDate.getDate() + 1);
    if (!isSameDate(newDate, dataDatePicker)) {
      setIsLoading(true);
    }
    setDataDatePicker(newDate);
  };

  // Check current day with now
  const isSameDate = (current: Date, now: Date) => {
    return (
      current.getFullYear() === now.getFullYear() &&
      current.getMonth() === now.getMonth() &&
      current.getDate() === now.getDate()
    );
  };
  const handleChooseDay = (date?: Date) => {
    if (date) {
      const newDate = new Date(date);
      if (!isSameDate(newDate, dataDatePicker)) {
        setIsLoading(true);
      }
      setDataDatePicker(newDate);
      if (date) {
        const newDate = new Date(date);
        if (!isSameDate(newDate, dataDatePicker)) {
          setIsLoading(true);
        }
        setDataDatePicker(newDate);
      }
    }
  };
  function getMinDateOfYear(year: number): Date {
    return new Date(year, 0, 1);
  }
  const handleYesterDay = () => {
    const newDate = new Date();
    newDate.setDate(new Date().getDate() - 1);
    if (!isSameDate(newDate, dataDatePicker)) {
      setIsLoading(true);
    }
    setDataDatePicker(newDate);
  };
  const handleCurrentDay = () => {
    const newDate = new Date();
    newDate.setDate(new Date().getDate());

    if (!isSameDate(newDate, dataDatePicker)) {
      setIsLoading(true);
    }
    setDataDatePicker(newDate);
  };

  return (
    <div className="mb-10">
      <header className="flex justify-between my-[30px] pr-10 ">
        <div className="flex gap-5 items-center">
          <span className="text-2xl font-medium ">日報</span>
          <div className="w-fit z-20 flex gap-x-3 items-center">
            <ImageRound
              onClick={() => handlePrevDay()}
              className="h-fit w-fit cursor-pointer"
              src="/icons/left-statistic.svg"
              name="left"
            />
            <div className="w-[159px]">
              <DatePicker
                className="h-[34px] border text-sm font-normal !py-1 !border-[#77858F]"
                selected={dataDatePicker}
                maxDate={new Date()}
                dateFormat={DATE_TEXT_FORMAT}
                minDate={getMinDateOfYear(2023)}
                onChange={(e) => {
                  handleChooseDay(e as Date);
                }}
              />
            </div>
            {!isTodaySchedule(dataDatePicker) && (
              <ImageRound
                onClick={() => handleNextDay()}
                className=" h-fit w-fit cursor-pointer"
                src="/icons/right-statistic.svg"
                name="right"
              />
            )}
          </div>
          <div className="flex gap-[10px]">
            <Button
              variant="outline"
              className="border-none h-[34px] !rounded-md w-[48px] !px-0 !py-0"
              onClick={() => {
                if (!isYesterdaySchedule(dataDatePicker)) {
                  handleYesterDay();
                }
              }}>
              昨日
            </Button>
            <Button
              variant="outline"
              className="border-none h-[34px] w-[48px] !rounded-md !px-0 !py-0"
              onClick={() => {
                if (!isTodaySchedule(dataDatePicker)) {
                  handleCurrentDay();
                }
              }}>
              今日
            </Button>
          </div>
        </div>
      </header>
      <div className="w-[220px] mb-[30px]">
        <Dropdown
          options={[
            {
              label: 'すべて',
              value: 'ALL',
            },
            ...organizationTeamList.map((item) => ({
              label: item.label,
              value: item.value,
            })),
          ]}
          selectedOption={selectedOrganization}
          className="!h-[34px] !py-0"
          onChange={(e) => {
            setSelectedOrganization(e);
          }}
        />
      </div>
      <div className="flex flex-col gap-5">
        {dataListDailyReport &&
          dataListDailyReport.map((item, index) => {
            return (
              <div
                key={index}
                style={{
                  boxShadow: '0px 4px 10px 0px #0000000D',
                }}
                className="p-[30px] rounded-[14px] bg-[#F8FAFC] w-full h-fit">
                <p className="text-base font-medium text-[#77858F] line-clamp-3 mb-[30px]">
                  {item.organization.name}
                </p>
                <div className="grid grid-cols-2 gap-[10px]">
                  {item.users.map((user) => {
                    return (
                      <ItemListDaily
                        key={user.id}
                        userData={user}
                        organization={item.organization}
                        handleConfirm={(dataUser: dataRequestConfirmType) => {
                          confirmUserDaily(dataUser);
                        }}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
};

export default ListData;
