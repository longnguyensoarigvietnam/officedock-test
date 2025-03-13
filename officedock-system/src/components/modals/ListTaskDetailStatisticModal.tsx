'use client';
import React, { useState } from 'react';
import Image from 'next/image';

import Modal from '@components/common/Modal';
import { Table, TableBody, TableHeader } from '@components/common/Table';
import ImageRound from '@components/common/ImageRound';
import Pagination from '@components/common/Pagination';

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
      <div className="text-[#77858F] text-xs px-5 font-medium flex items-center justify-between">
        <div className="w-fit">タスク数 {count}</div>
        <div className="flex justify-center">
          {taskList && taskList.length ? (
            <Pagination
              onChange={(pageNumber) => setCurrentPage(pageNumber)}
              currentPage={currentPage}
              totalPages={totalPages}
            />
          ) : null}
        </div>
        <div
          onClick={handleScroll}
          className="bg-white flex items-center  justify-center gap-2 text-sm text-[#77858F] font-medium  h-[34px] rounded-md">
          <span className="text-sm">タスク一覧へ</span>
          <div className="flex items-center justify-center w-[18px] h-[18px] bg-[#EBF1F7] rounded-full">
            <ImageRound
              className=" h-[8px] w-fit cursor-pointer relative left-[0.5px]"
              src="/icons/right-statistic.svg"
              name="right"
            />
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default ListTaskDetailStatisticModal;
