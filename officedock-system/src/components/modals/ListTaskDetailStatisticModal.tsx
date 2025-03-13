'use client';
import React, { useState } from 'react';
import Image from 'next/image';

import Modal from '@components/common/Modal';
import { Table, TableBody, TableHeader } from '@components/common/Table';
import ImageRound from '@components/common/ImageRound';
import Pagination from '@components/common/Pagination';
import Dropdown from '@components/common/Dropdown';

import { EventWorkCategory, OrderingDataType } from '@constants/enums';
import { formatDateToYMD, formatTimeToJapanese } from '@utils/date';
import { DataTaskListStatisticListType } from '@interfaces/statistic';
import { OptionDropdownType } from '@interfaces/common';
import useStatisticTask from '@hooks/useStatisticTask';

type Props = {
  detailCategory: {
    id: number | null;
    totalDuration: string;
    type: string;
  } | null;
  selectedOrganization: OptionDropdownType | null;
  open: boolean;
  startDate: Date;
  endDate: Date | null;
  onClose: () => void;
  handleScroll: () => void;
};

const ListTaskDetailStatisticModal = ({
  open,
  startDate,
  endDate,
  detailCategory,
  selectedOrganization,
  onClose,
  handleScroll,
}: Props) => {
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [count, setCount] = useState<number>(0);
  const [pageSize, setPageSize] = useState<number>(5);

  const [taskList, setTaskList] = useState<DataTaskListStatisticListType[]>([]);
  const [ordering, setOrdering] = useState<string>('');

  useStatisticTask({
    filter: {
      fromDate: formatDateToYMD(startDate) || '',
      endDate: formatDateToYMD(`${endDate}`) || '',
      organizationIds: String(selectedOrganization?.value || ''),
      largeCategoryId:
        detailCategory && detailCategory.type === EventWorkCategory.LARGE
          ? (detailCategory.id as number)
          : undefined,
      mediumCategoryId:
        detailCategory && detailCategory.type === EventWorkCategory.MEDIUM
          ? (detailCategory.id as number)
          : undefined,
      page: currentPage,
      totalDuration: detailCategory?.totalDuration,
      ordering: ordering,
      pageSize: pageSize,
    },
    onSuccess: (data) => {
      if (data) {
        setTotalPages(data.numPages);
        setCount(data.count);
        if (data.results) {
          setTaskList(data.results);
        }
      }
    },
  });

  const optionList = [
    {
      label: '5',
      value: 5,
    },
    {
      label: '10',
      value: 10,
    },
    {
      label: '20',
      value: 20,
    },
  ];
  return (
    <Modal
      open={open}
      className="font-primary bg-white w-[556px] !rounded-xl !pb-5 !pt-0 !px-0 z-50"
      onClose={onClose}
      title={''}>
      <div className="p-5 bg-[#EBF1F7] flex items-center justify-between !rounded-t-xl text-sm text-[#5B6770] font-medium">
        <span>上位タスク</span>
        <div className="h-[30px] w-[30px] rounded-full bg-white flex items-center justify-center">
          <ImageRound
            className={`w-5 h-5 hover:cursor-pointer `}
            src="/icons/close.svg"
            name="Close modal"
            onClick={onClose}
          />
        </div>
      </div>
      <div className="p-5">
        <Table
          classCustom="bg-white rounded-md !p-0 "
          className="bg-white !rounded-md relative !p-0 border border-[#D2DBE1]">
          <TableHeader className="h-10 border-b border-[#D2DBE1]">
            <th className="w-[332px] ">
              <span className="!text-[#77858F]">タスク名</span>
            </th>
            <th className="w-[110px] border-l !px-0 border-[#D2DBE1]">
              <div className="flex gap-[25px] items-center justify-center">
                <p className="!text-xs font-medium !text-[#77858F]">計測時間</p>
                <div
                  onClick={() => {
                    if (ordering === OrderingDataType.TOTAL_DURATION) {
                      setOrdering('');
                    } else {
                      setOrdering(OrderingDataType.TOTAL_DURATION);
                    }
                  }}
                  className=" relative flex flex-col">
                  <Image
                    src="/icons/sort-down.svg"
                    alt="Sort down"
                    width={9}
                    height={10}
                    className={`cursor-pointer justify-self-end  ${ordering === OrderingDataType.TOTAL_DURATION && 'rotate-180'} `}
                  />
                </div>
              </div>
            </th>
            <th className="w-[72px] border-l !px-0 border-[#D2DBE1]">
              <div className="flex gap-2 items-center justify-center">
                <p className="!text-xs font-medium !text-[#77858F]">割合</p>
                <div
                  onClick={() => {
                    if (ordering === OrderingDataType.PERCENT) {
                      setOrdering('');
                    } else {
                      setOrdering(OrderingDataType.PERCENT);
                    }
                  }}
                  className=" relative flex flex-col">
                  <Image
                    src="/icons/sort-down.svg"
                    alt="Sort down"
                    width={9}
                    height={10}
                    className={`cursor-pointer justify-self-end  ${ordering === OrderingDataType.PERCENT && 'rotate-180'} `}
                  />
                </div>
              </div>
            </th>
          </TableHeader>
          <TableBody>
            {taskList.length > 0 ? (
              taskList.map((item, index) => {
                return (
                  <tr key={index} className="font-medium text-base text-black">
                    <td className="w-[332px] text-left !px-4  ">
                      <p className="break-all line-clamp-2"> {item.title}</p>
                    </td>

                    <td className="border-l text-sm !px-0 border-[#D2DBE1] w-[110px] max-w-[110px] truncate">
                      {item.totalDuration &&
                        formatTimeToJapanese(item.totalDuration)}
                    </td>

                    <td className="border-l text-sm !px-0 border-[#D2DBE1] max-w-[72px] truncate">
                      {item.percent}%
                    </td>
                  </tr>
                );
              })
            ) : (
              <></>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="relative justify-center">
        <div className="flex justify-center relative left-5">
          {taskList && taskList.length ? (
            <Pagination
              sz="xs"
              className="!px-2 !py-0"
              onChange={(pageNumber) => setCurrentPage(pageNumber)}
              currentPage={currentPage}
              totalPages={totalPages}
            />
          ) : null}
          <div className=" absolute top-[-12px] right-[39px] w-fit  flex gap-[6px] items-center mt-2">
            <div className="min-w-[56px] flex items-center">
              <Dropdown
                selectedOption={optionList.find(
                  (item) => item.value === pageSize,
                )}
                options={optionList}
                onChange={(e) => {
                  setPageSize(e.value as number);
                }}
                classTextOption="justify-center"
                labelOptionClass="!px-0 flex justify-center !ml-0"
                className="h-[20px]  
                  !text-xs !py-0 !pl-[7px] !pr-0 !text-[#6B7280] mt-1 !bg-white !border-[#77858F]"
                classNameOption="[&>li]:!pl-0 [&>li]:!pr-0 [&>li]:!text-sm text-sm [&>li]:!text-black top-[-115px] "
              />
            </div>
            <span className="font-normal text-[10px] text-[#6B7280]">
              件ずつ表示
            </span>
          </div>
        </div>
      </div>
      <div className="text-[#77858F] text-xs px-5 font-medium flex mt-3 items-end justify-between">
        <div className="w-fit  text-[#77858F] left-0 text-xs font-normal">
          タスク数 {count}
        </div>
        <div>
          <div className="bg-white flex items-center  justify-center gap-2 text-sm text-[#77858F]  font-medium  h-[20px] rounded-md">
            <span className="text-xs">タスク一覧へ</span>
            <div className="flex items-center justify-center w-[18px] h-[18px] bg-[#EBF1F7] rounded-full">
              <ImageRound
                onClick={handleScroll}
                className=" h-[8px] w-fit cursor-pointer relative left-[0.5px]"
                src="/icons/right-statistic.svg"
                name="right"
              />
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default ListTaskDetailStatisticModal;
