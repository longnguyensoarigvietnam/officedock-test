'use client';
import React, { useEffect, useRef, useState } from 'react';
import { useQueryClient } from 'react-query';
import { useRouter } from 'next/navigation';

import ImageRound from '@components/common/ImageRound';
import DataCountPointChangeModal from '@components/modals/DataCountPointChangeModal';
import DataCompanyPointChangeModal from '@components/modals/DetailCompanyChangePoint';
import Button from '@components/common/Button';

import { pageRouters } from '@constants/routers';
import useHistoryPointList from '@hooks/useListHistoryPoint';

const HistoryListPage = () => {
  const router = useRouter();
  const [isShowTotalPointChangeModal, setIsShowTotalPointChangeModal] =
    useState(false);
  const [isShowDetailCompanyChangeCoin, setIsShowDetailCompanyChangeCoin] =
    useState(false);

  const resultsContainerRef = useRef<HTMLDivElement | null>(null);

  const queryClient = useQueryClient();
  const {
    historyPointList,
    fetchNextPage,
    hasNextPage,
    isLoadingList,
    isFetchingNextPage,
  } = useHistoryPointList({
    type: 'COIN',
  });

  useEffect(() => {
    return () => {
      queryClient.removeQueries(['getHistoryPontList']);
    };
  }, [queryClient]);

  useEffect(() => {
    const handleScroll = () => {
      const surveyContainer = resultsContainerRef.current;
      if (
        surveyContainer &&
        hasNextPage &&
        !isFetchingNextPage &&
        surveyContainer.clientHeight + Math.abs(surveyContainer.scrollTop) >=
          surveyContainer.scrollHeight - 10
      ) {
        fetchNextPage();
      }
    };

    const surveyContainer = resultsContainerRef.current;

    if (surveyContainer) {
      surveyContainer.addEventListener('scroll', handleScroll);
    }

    return () => {
      if (surveyContainer) {
        surveyContainer.removeEventListener('scroll', handleScroll);
      }
    };
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  return (
    <>
      <div className="h-full w-full">
        <div
          style={{
            backgroundImage: 'url("/images/bg-profile.jpg")',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            width: '100%',
            height: '100%',
          }}
          className="rounded-bl-[30px] relative rounded-tr-[30px] rounded-br-[30px] h-[calc(100vh-120px)] w-full">
          <div className="flex absolute top-0 left-0 shadow-common rounded-br-[30px]">
            <div className="h-20 z-[30] bg-white w-fit px-10 py-4 text-[#77858F] font-medium flex items-center gap-[10px] rounded-br-[30px]">
              <div
                onClick={() => router.push(pageRouters.MY_PAGE.href)}
                className="flex items-center gap-[10px]">
                <ImageRound
                  name="Left icon"
                  src={'/icons/chevron-left.svg'}
                  className={`w-fit h-fit !cursor-pointer`}
                />
                <span className="text-sm text-black cursor-pointer">戻る</span>
              </div>
              <span className="text-[22px] text-black ml-1">
                {pageRouters.HISTORY_POINT.name}
              </span>
            </div>
          </div>
          <div className="relative  pr-[30px] flex w-full justify-between items-center h-full">
            {/* User */}
            <div className="flex-shrink-0 flex-grow h-full flex items-center justify-center ">
              <div className="w-[402px] bg-white shadow-common rounded-3xl p-[6px]">
                <div className="flex items-center gap-[6px] justify-center">
                  <Button
                    variant="post"
                    className="flex w-[192px] h-[50px]  items-center gap-[10px] !rounded-[40px] ">
                    <ImageRound
                      name="Badge icon"
                      src={'/icons/badge.svg'}
                      className={`w-7 h-7`}
                    />
                    <p className="text-[18px]">コイン</p>
                  </Button>
                  <Button
                    variant="secondary"
                    className="flex w-[192px] h-[50px]  items-center gap-[10px] !rounded-[40px] ">
                    <ImageRound
                      name="Pearl icon"
                      src={'/icons/pearl.svg'}
                      className={`w-fit h-fit ml-[10px]`}
                    />
                    <p className="text-[18px]">パール</p>
                  </Button>
                </div>
                <div className="m-10">
                  <div className="flex justify-center">
                    <ImageRound
                      name="Badge icon"
                      src={'/icons/badge.svg'}
                      className={`w-[60px] h-[60px]`}
                    />
                  </div>
                  <div className="flex items-end justify-center mt-[10px] gap-2 text-black font-medium">
                    <p className="text-[40px] leading-10">2000</p>
                    <p className="text-[22px] leading-[22px]  relative">
                      コイン
                    </p>
                  </div>
                  <div className="flex items-center gap-[10px] justify-end mt-6 pr-3">
                    <div
                      onClick={() => setIsShowTotalPointChangeModal(true)}
                      className="flex items-center gap-3 py-[6px] px-3 rounded-lg bg-[#EBF1F7]">
                      <p className="text-[13px] font-normal">
                        今月交換可能なコイン数
                      </p>
                      <div className="flex items-center gap-1">
                        <ImageRound
                          name="Badge icon"
                          src={'/icons/badge.svg'}
                          className={`w-[18px] h-[18px]`}
                        />
                        <p className="text-base font-medium">100</p>
                      </div>
                    </div>
                    <div className="text-xs text-[#77858F] flex items-center justify-center w-[22px] h-[22px] rounded-full bg-[#EBF1F7]">
                      ?
                    </div>
                  </div>
                  <div className="flex justify-center mt-[30px]">
                    <Button
                      onClick={() => setIsShowDetailCompanyChangeCoin(true)}
                      variant="post"
                      className="w-[200px] h-[46px] text-sm font-medium rounded-md">
                      交換する
                    </Button>
                  </div>
                </div>
              </div>
            </div>
            {/* List history  */}
            <div
              style={{
                background: 'rgba(53, 153, 216, 0.8)',
                boxShadow: '0px 4px 10px 0px #0000000D',
              }}
              className="w-[720px] h-[calc(100vh_-_260px)] flex-shrink-0 font-medium text-white border border-white rounded-3xl py-[30px]">
              {/* form */}
              <div className="flex px-[30px] items-center gap-3 ">
                <ImageRound
                  name="Badge icon"
                  src={'/icons/badge.svg'}
                  className={`w-[30px] h-[30px]`}
                />
                <p className="text-[18px]">ポイント履歴</p>
              </div>
              <div className="h-full w-full pl-[30px] mt-5">
                <div className="pr-5 h-full">
                  {/* Header */}
                  <div className="h-fit flex items-center  text-white text-xs font-medium">
                    <div className="w-[134px]">日付</div>
                    <div className="w-[129px]  flex justify-between items-center">
                      <div className="h-[9px] w-[1px] border-l border-[#D2DBE1]"></div>
                      <div className="flex-grow px-5">質問</div>
                      <div className="h-[9px] w-[1px] border-l border-[#D2DBE1]"></div>
                    </div>
                    <div className="w-[129px]  flex justify-between items-center">
                      <div className="h-[9px] w-[1px] border-l border-[#D2DBE1]"></div>
                      <div className="flex-grow px-5">獲得</div>
                      <div className="h-[9px] w-[1px] border-l border-[#D2DBE1]"></div>
                    </div>
                    <div className="w-[129px]  flex justify-between items-center">
                      <div className="h-[9px] w-[1px] border-l border-[#D2DBE1]"></div>
                      <div className="flex-grow px-5">差引残高</div>
                      <div className="h-[9px] w-[1px] border-l border-[#D2DBE1]"></div>
                    </div>
                    <div className="flex-grow px-5">メモ</div>
                  </div>
                  {/* Table */}
                  <div
                    ref={resultsContainerRef}
                    className="h-full max-h-[calc(100vh_-_415px)]  pr-[10px]  overflow-y-auto   mt-[14px]">
                    <div className="w-full bg-white h-full py-[14px] rounded-[14px]">
                      {historyPointList.length &&
                        !isLoadingList &&
                        historyPointList.map((item, index) => {
                          return (
                            <div
                              key={index}
                              className={`flex rounded-br-[14px] text-xs rounded-bl-[14px] items-stretch  bg-white text-black  font-normal py-[14px]`}>
                              {/* Date column */}
                              <div className="w-[134px] pl-5 pr-2 flex items-center">
                                {/* TODO: Format time  */}
                                {/* {item. &&
                                  formatShowDateJapanese(item.createdAt)} */}
                              </div>
                              <div className="w-[1px] border-l border-[#D2DBE1] -my-[10px]"></div>
                              <div className="w-[129px] px-[15px] flex items-center justify-between">
                                5
                              </div>
                              <div className="w-[1px] border-l border-[#D2DBE1] -my-[10px]"></div>
                              <div className="w-[129px] px-[15px] flex items-center justify-between">
                                5
                              </div>
                              <div className="w-[1px] border-l border-[#D2DBE1] -my-[10px]"></div>
                              <div className="w-[129px] px-[15px] flex items-center justify-between">
                                5
                              </div>
                              <div className="w-[1px] border-l border-[#D2DBE1] -my-[10px]"></div>

                              <div className="flex-grow flex items-center justify-center text-sm">
                                スキルアップ
                              </div>
                            </div>
                          );
                        })}
                      <div className="bg-[#409EDE] w-full my-[14px] h-[2px]"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {isShowTotalPointChangeModal && (
        <DataCountPointChangeModal
          open={isShowTotalPointChangeModal}
          onClose={() => setIsShowTotalPointChangeModal(false)}
        />
      )}
      {isShowDetailCompanyChangeCoin && (
        <DataCompanyPointChangeModal
          open={isShowDetailCompanyChangeCoin}
          onClose={() => setIsShowDetailCompanyChangeCoin(false)}
        />
      )}
    </>
  );
};

export default HistoryListPage;
