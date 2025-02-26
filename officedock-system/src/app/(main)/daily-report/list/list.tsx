'use client';
import React, { useContext, useEffect, useState } from 'react';
import AvatarIconWithDynamicColor from '@components/common/AvatarIcon';
import Button from '@components/common/Button';
import Checkbox from '@components/common/Checkbox';
import DatePicker from '@components/common/DatePicker';
import Dropdown from '@components/common/Dropdown';
import ImageRound from '@components/common/ImageRound';
import { DATE_TEXT_FORMAT } from '@constants';
import useListDailyReport from '@hooks/useListDailyReport';
import { DataListDailyType } from '@interfaces/statistic';
import { GlobalStateContext } from '@providers/GlobalStateProvider';
import { LoadingContext } from '@providers/LoadingProvider';
import {
  convertToJapaneseTime,
  formatDateServer,
  isTodaySchedule,
  isYesterdaySchedule,
} from '@utils/date';
import api from '@base/api';
import { apiRouters, pageRouters } from '@constants/routers';
import { useMutation } from 'react-query';
import { useRouter } from 'next/navigation';

const ListData = () => {
  const { setIsLoading } = useContext(LoadingContext);

  const router = useRouter();

  const { dashboardMembersWithAvatars } = useContext(GlobalStateContext);

  const [currentDate, setCurrentDate] = useState<Date>(new Date());

  const [dataListDailyReport, setDataListDailyReport] = useState<
    DataListDailyType[]
  >([]);

  const { listDailyReport } = useListDailyReport({
    date: formatDateServer(currentDate),
  });

  useEffect(() => {
    if (listDailyReport) {
      setDataListDailyReport(listDailyReport);
    }
  }, [listDailyReport]);

  //  Handle call api confirm user daily
  const handleActionConfirmUserDaily = async (dataUser: {
    id: number;
    isConfirmed: boolean;
    categoryId: number;
  }) => {
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
      onSuccess: async (data, request) => {
        const newData = dataListDailyReport.map((organization) =>
          organization.organization.id === request.categoryId
            ? {
                ...organization,
                users: organization.users.map((user) =>
                  user.id === request.id
                    ? { ...user, isConfirmed: request.isConfirmed }
                    : user,
                ),
              }
            : organization,
        );

        setDataListDailyReport(newData);
      },
      onError: () => {},
      onSettled: () => {},
    },
  );

  const handlePrevDay = () => {
    setIsLoading(true);

    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() - 1);
    setCurrentDate(newDate);
  };
  const handleNextDay = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + 1);
    if (!isSameDate(newDate, currentDate)) {
      setIsLoading(true);
    }
    setCurrentDate(newDate);
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
      if (!isSameDate(newDate, currentDate)) {
        setIsLoading(true);
      }
      setCurrentDate(newDate);
      if (date) {
        const newDate = new Date(date);
        if (!isSameDate(newDate, currentDate)) {
          setIsLoading(true);
        }
        setCurrentDate(newDate);
      }
    }
  };
  function getMinDateOfYear(year: number): Date {
    return new Date(year, 0, 1);
  }
  const handleYesterDay = () => {
    const newDate = new Date();
    newDate.setDate(new Date().getDate() - 1);
    if (!isSameDate(newDate, currentDate)) {
      setIsLoading(true);
    }
    setCurrentDate(newDate);
  };
  const handleCurrentDay = () => {
    const newDate = new Date();
    newDate.setDate(new Date().getDate());

    if (!isSameDate(newDate, currentDate)) {
      setIsLoading(true);
    }
    setCurrentDate(newDate);
  };

  return (
    <div>
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
                selected={currentDate}
                maxDate={new Date()}
                dateFormat={DATE_TEXT_FORMAT}
                minDate={getMinDateOfYear(2023)}
                onChange={(e) => {
                  handleChooseDay(e as Date);
                }}
              />
            </div>

            <ImageRound
              onClick={() => handleNextDay()}
              className=" h-fit w-fit cursor-pointer"
              src="/icons/right-statistic.svg"
              name="right"
            />
          </div>
          <div className="flex gap-4">
            <Button
              variant="outline"
              className="border-none h-[34px] w-[48px] !px-0 !py-0"
              onClick={() => {
                if (!isYesterdaySchedule(currentDate)) {
                  handleYesterDay();
                }
              }}>
              昨日
            </Button>
            <Button
              variant="outline"
              className="border-none h-[34px] w-[48px] !px-0 !py-0"
              onClick={() => {
                if (!isTodaySchedule(currentDate)) {
                  handleCurrentDay();
                }
              }}>
              今日
            </Button>
          </div>
        </div>
      </header>
      <div className="w-[220px] mb-[30px]">
        <Dropdown options={[]} className="!h-[34px]" />
      </div>
      <div>
        {dataListDailyReport &&
          dataListDailyReport.map((item, index) => {
            return (
              <div
                key={index}
                style={{
                  boxShadow: '0px 4px 10px 0px #0000000D',
                }}
                className="p-[30px] rounded-[14px] bg-[#F8FAFC] w-full h-fit">
                <p className="text-base font-medium text-[#77858F] mb-[30px]">
                  {item.organization.name}
                </p>
                <div className="grid grid-cols-2 gap-[10px]">
                  {item.users.map((user) => {
                    const avatarColor =
                      dashboardMembersWithAvatars.find(
                        (member) => member.id == user.id,
                      )?.avatarColor || '';

                    const isConfirm = user.isConfirmed;

                    return (
                      <div
                        key={user.id}
                        style={{
                          boxShadow: '0px 2px 8px 0px #0000001A',
                        }}
                        className="bg-white p-4 rounded-md font-medium flex gap-3 justify-between">
                        <div className="flex gap-5 items-center">
                          <div className="flex flex-col gap-1 items-center w-10 text-xs  text-[#0068B6]">
                            {isConfirm ? (
                              <span>確認済</span>
                            ) : (
                              <span className="text-[#77858F]">未確認</span>
                            )}
                            <Checkbox
                              isChecked={isConfirm}
                              onChange={(e) => {
                                confirmUserDaily({
                                  id: user.id,
                                  isConfirmed: e,
                                  categoryId: item.organization.id,
                                });
                              }}
                              className="flex justify-center"
                              classSize="w-4 h-4"
                              boxLabelClass="!m-0"
                            />
                          </div>

                          <div className="flex items-center gap-[10px]">
                            <AvatarIconWithDynamicColor
                              color={avatarColor}
                              size={33}
                            />
                            <span className="text-black">{user.fullName}</span>
                          </div>
                        </div>
                        <div className="text-xs font-medium flex items-center gap-[14px]">
                          <span className="text-[#77858F]">合計時間</span>
                          <span className="text-black">
                            {user.totalDuration &&
                              convertToJapaneseTime(user.totalDuration)}
                          </span>
                          <Button
                            onClick={() => {
                              router.push(
                                `${pageRouters.DAILY_REPORT_DETAIL.href(
                                  String(user.id),
                                )}?organization=${item.organization.id}`,
                              );
                            }}
                            className="!px-0 !py-0 h-9 w-[98px] items-center justify-center ml-[6px]">
                            日報を見る
                          </Button>
                        </div>
                      </div>
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
