'use client';
import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';

import Modal from '@components/common/Modal';
import ImageRound from '@components/common/ImageRound';
import {
  SkeletonContainer,
  SkeletonElement,
} from '@components/common/SkeletonLoading';
import { Table, TableBody } from '@components/common/Table';

import { PAGINATION_PAGE_SIZE_SMALL } from '@constants';
import { EventWorkCategory, OrderingDataType } from '@constants/enums';

import { formatDateToYMD, formatTimeToJapanese } from '@utils/date';
import {
  DataTaskListStatisticListType,
  StatisticsCategories,
} from '@interfaces/statistic';
import { OptionDropdownType } from '@interfaces/common';
import useStatisticTask from '@hooks/useStatisticTask';
import Spinner from '@components/common/Spinner';

type Props = {
  detailCategory: {
    id: number | null;
    totalDuration: string;
    type: string;
  } | null;
  selectedOrganization: OptionDropdownType | null;
  statisticTagsListTeam: StatisticsCategories | undefined;

  selectedLarge: OptionDropdownType | null;
  selectedMedium: OptionDropdownType | null;
  selectedSmall: OptionDropdownType | null;
  open: boolean;
  startDate: Date;
  endDate: Date | null;
  onClose: () => void;
  handleScroll: () => void;
};

const ListTaskDetailStatisticTagModal = ({
  open,
  startDate,
  endDate,
  selectedMedium,
  selectedLarge,
  selectedSmall,
  detailCategory,
  selectedOrganization,
  onClose,
  handleScroll,
  statisticTagsListTeam,
}: Props) => {
  const listContainerRef = useRef<HTMLDivElement | null>(null);

  const [count, setCount] = useState<number>(0);
  const [lastCreateAt, setLastCreateAt] = useState<string>('');
  const [hastMore, setHasMore] = useState(false);

  const [taskList, setTaskList] = useState<DataTaskListStatisticListType[]>([]);
  const [ordering, setOrdering] = useState<string>('');
  const [isSkeletonLoading, setIsSkeletonLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);

  const { refetchStatisticCategoryList } = useStatisticTask({
    parentData: statisticTagsListTeam,
    filter: {
      fromDate: formatDateToYMD(startDate) || '',
      endDate: formatDateToYMD(`${endDate}`) || '',
      organizationIds: String(selectedOrganization?.value || ''),
      largeCategoryId:
        detailCategory && detailCategory.type === EventWorkCategory.LARGE
          ? (selectedLarge?.value as number)
          : undefined,
      mediumCategoryId:
        detailCategory && detailCategory.type === EventWorkCategory.MEDIUM
          ? (selectedMedium?.value as number)
          : undefined,
      smallCategoryId:
        detailCategory && detailCategory.type === EventWorkCategory.SMALL
          ? (selectedSmall?.value as number)
          : undefined,
      page: 1,
      totalDuration: detailCategory?.totalDuration,
      ordering: ordering,
      pageSize: PAGINATION_PAGE_SIZE_SMALL,
      tagIds: [
        {
          label: '',
          value: detailCategory?.id as number,
        },
      ],
    },
    created_at: lastCreateAt,
    onSuccess: (data) => {
      setIsSkeletonLoading(false);
      setIsFetching(false);
      if (data) {
        if (!lastCreateAt) {
          setCount(data.count);
        }
        setHasMore(data.hasNext as boolean);
        if (data.results) {
          setTaskList((prev) => {
            const newMessages = data.results.filter(
              (newMsg) =>
                !(prev || []).some(
                  (existingMsg) => existingMsg.id === newMsg.id,
                ),
            );
            return [...(prev || []), ...newMessages];
          });
          if (data.results.length > 0) {
            const lastItem = data.results[data.results.length - 1];
            setLastCreateAt(lastItem.createdAt);
          }
        }
      }
    },
  });
  useEffect(() => {
    const handleScroll = () => {
      const chatContainer = listContainerRef.current;
      if (
        chatContainer &&
        hastMore &&
        chatContainer.clientHeight + Math.abs(chatContainer.scrollTop) ===
          chatContainer.scrollHeight
      ) {
        setIsFetching(true);
        refetchStatisticCategoryList();
      }
    };

    const chatContainer = listContainerRef.current;

    if (chatContainer) {
      chatContainer.addEventListener('scroll', handleScroll);
    }

    return () => {
      if (chatContainer) {
        chatContainer.removeEventListener('scroll', handleScroll);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hastMore]);

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
        {isSkeletonLoading ? (
          <div>
            <SkeletonContainer className="!p-0 !rounded-sm !gap-0 w-full border-[1px] border-gray-200">
              <div className="">
                <Table className="!ring-0 !rounded-none !border-transparent">
                  <TableBody className="!divide-y-0 [&>tr:nth-child(even)]:bg-gray-100 [&>tr:nth-child(even)]:rounded-lg [&>tr>td:first-child]:rounded-l-lg [&>tr>td:last-child]:rounded-r-lg [&>tr>td]:!py-5">
                    {[...Array(4)].map((_, index) => (
                      <tr key={index}>
                        <td>
                          <SkeletonElement className="!w-[250px]" />
                        </td>
                        <td>
                          <SkeletonElement className="!w-[90px]" />
                        </td>
                        <td>
                          <SkeletonElement className="!w-[72px]" />
                        </td>
                      </tr>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </SkeletonContainer>
          </div>
        ) : (
          <div
            ref={listContainerRef}
            className="bg-white !rounded-md min-h-[300px] relative max-h-[300px] overflow-y-auto !p-0 border border-[#D2DBE1]">
            <div className="h-10 border-b sticky top-0 border-[#D2DBE1]  flex items-center">
              <div className="w-[332px] h-full flex bg-[#F8FAFC] items-center px-[18px] ">
                <span className="!text-[#77858F]">タスク名</span>
              </div>
              <div className="w-[110px] h-full flex bg-[#F8FAFC] items-center border-l pl-[14px]  border-[#D2DBE1]">
                <div className="flex gap-[25px] items-center justify-center">
                  <p className="!text-xs font-medium !text-[#77858F]">
                    計測時間
                  </p>
                  <div
                    onClick={() => {
                      setTaskList([]);
                      setLastCreateAt('');
                      if (ordering === OrderingDataType.TOTAL_DURATION) {
                        setIsSkeletonLoading(true);
                        setOrdering('');
                      } else {
                        setIsSkeletonLoading(true);

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
              </div>
              <div className="w-[72px] h-full flex bg-[#F8FAFC] items-center border-l pl-[14px] border-[#D2DBE1]">
                <div className="flex gap-2 items-center justify-center">
                  <p className="!text-xs font-medium !text-[#77858F]">割合</p>
                  <div
                    onClick={() => {
                      setTaskList([]);
                      setLastCreateAt('');

                      if (ordering === OrderingDataType.PERCENT) {
                        setIsSkeletonLoading(true);

                        setOrdering('');
                      } else {
                        setIsSkeletonLoading(true);

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
              </div>
            </div>
            <div>
              {taskList.length > 0 ? (
                taskList.map((item, index) => {
                  return (
                    <div
                      key={index}
                      className="font-medium border-b text-base text-black flex min-h-[50px] items-stretch">
                      {/* First column - Full text */}
                      <div className="w-[332px] flex items-center text-left px-4">
                        <p className="break-all">{item.title}</p>
                      </div>

                      {/* Second column */}
                      <div className="border-l w-[110px] max-w-[110px] flex items-center justify-center text-sm px-0 border-[#D2DBE1]">
                        {item.totalDuration &&
                          formatTimeToJapanese(item.totalDuration)}
                      </div>

                      {/* Third column */}
                      <div className="border-l w-[72px] max-w-[72px] flex items-center justify-center text-sm px-0 border-[#D2DBE1]">
                        {item.percent}%
                      </div>
                    </div>
                  );
                })
              ) : (
                <></>
              )}
              {taskList.length > 9 && (
                <div>
                  {hastMore && isFetching && (
                    <div className="h-7">
                      <Spinner
                        className="!h-fit py-3"
                        iconClassName="h-6 w-6"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="text-[#77858F] text-xs px-5 font-medium flex items-end justify-between">
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

export default ListTaskDetailStatisticTagModal;
