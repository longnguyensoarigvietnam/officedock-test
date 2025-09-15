'use client';
import React, { useContext, useEffect, useState } from 'react';
import { useQueryClient } from 'react-query';
import { useRouter } from 'next/navigation';

import ImageRound from '@components/common/ImageRound';
import DataCountPointChangeModal from '@components/modals/DataCountPointChangeModal';
import DataCompanyPointChangeModal from '@components/modals/DetailCompanyChangePoint';
import Button from '@components/common/Button';
import { HistoryTable } from '@components/pointHistory/HistoryTable';

import { apiRouters, pageRouters } from '@constants/routers';
import { PointHistoryActiveTab } from '@constants/enums';

import useHistoryPointList from '@hooks/useListHistoryPoint';
import useCurrentPoint from '@hooks/useCurrentPoint';

import { useSessionCache } from '@providers/SessionCacheProvider';
import { MyPageStateContext } from '@providers/MyPageProvider';

import api from '@base/api';

const HistoryListPage = () => {
  const router = useRouter();
  const { data: session } = useSessionCache();
  const [isShowTotalPointChangeModal, setIsShowTotalPointChangeModal] =
    useState(false);
  const [isShowDetailCompanyChangeCoin, setIsShowDetailCompanyChangeCoin] =
    useState(false);
  const [activeTab, setActiveTab] = useState<PointHistoryActiveTab>(
    PointHistoryActiveTab.COIN,
  );
  const { pointDetail, setPointDetail } = useContext(MyPageStateContext);

  const queryClient = useQueryClient();
  const {
    historyPointList,
    fetchNextPage,
    hasNextPage,
    isLoadingList,
    isFetchingNextPage,
  } = useHistoryPointList({
    type: activeTab,
  });

  // Current coin + pearl
  useCurrentPoint({
    conditions: [Boolean(!pointDetail)],
    onSuccess: (data) => {
      setPointDetail(data);
    },
  });

  useEffect(() => {
    return () => {
      queryClient.removeQueries(['getHistoryPointList']);
    };
  }, [queryClient]);

  const navigateToDotMoney = async () => {
    const { data: me } = await api.get(`${apiRouters.LOGIN_EXCHANGE}`, {
      headers: {
        Authorization: `Bearer ${session?.accessToken}`,
      },
    });
    if (me.exchangeUrl) {
      router.push(me.exchangeUrl);
    }
  };

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
          {/* Page title */}
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
          <div className="relative pr-[30px] flex w-full h-full">
            {/* User */}
            <div className="w-[calc(100%_-_720px)] flex-shrink-0 flex-grow h-full flex items-center justify-center">
              <div className="w-[402px] h-[383px] flex flex-col items-center justify-between bg-white shadow-common rounded-3xl p-[6px] pb-[48px]">
                <div className="flex items-center gap-[6px] justify-center">
                  <Button
                    variant={`${activeTab == PointHistoryActiveTab.COIN ? 'post' : 'secondary'}`}
                    className="flex w-[192px] h-[50px]  items-center gap-[10px] !rounded-[40px]"
                    onClick={() => setActiveTab(PointHistoryActiveTab.COIN)}>
                    <ImageRound
                      name="Badge icon"
                      src={'/icons/badge.svg'}
                      className={`w-7 h-7`}
                    />
                    <p className="text-[18px]">コイン</p>
                  </Button>
                  <Button
                    variant={`${activeTab == PointHistoryActiveTab.PEARL ? 'post' : 'secondary'}`}
                    className="flex w-[192px] h-[50px]  items-center gap-[10px] !rounded-[40px]"
                    onClick={() => setActiveTab(PointHistoryActiveTab.PEARL)}>
                    <ImageRound
                      name="Pearl icon"
                      src={'/icons/pearl.svg'}
                      className={`w-fit h-fit ml-[10px]`}
                    />
                    <p className="text-[18px]">パール</p>
                  </Button>
                </div>
                <div className="">
                  <div className="flex justify-center">
                    <ImageRound
                      name="Badge icon"
                      src={
                        activeTab == PointHistoryActiveTab.COIN
                          ? '/icons/badge.svg'
                          : '/icons/pearl.svg'
                      }
                      className={`w-[60px] h-[60px]`}
                    />
                  </div>
                  <div className="flex items-end justify-center mt-[10px] gap-2 text-black font-medium">
                    <p className="text-[40px] leading-10">
                      {activeTab == PointHistoryActiveTab.COIN
                        ? pointDetail?.coin
                        : pointDetail?.pearl}
                    </p>
                    <p className="text-[22px] leading-[22px]  relative">
                      {activeTab == PointHistoryActiveTab.COIN
                        ? 'コイン'
                        : 'パール'}
                    </p>
                  </div>
                  {activeTab == PointHistoryActiveTab.COIN ? (
                    <div
                      className="flex items-center gap-[10px] justify-end mt-6 pr-3"
                      onClick={() => setIsShowTotalPointChangeModal(true)}>
                      <div className="flex items-center gap-3 py-[6px] px-3 rounded-lg bg-[#EBF1F7]">
                        <p className="text-[13px] font-normal">
                          今月交換可能なコイン数
                        </p>
                        <div className="flex items-center gap-1">
                          <ImageRound
                            name="Badge icon"
                            src={'/icons/badge.svg'}
                            className={`w-[18px] h-[18px]`}
                          />
                          <p className="text-base font-medium">
                            {pointDetail?.exchangeableCoin || 0}
                          </p>
                        </div>
                      </div>
                      <div className="text-xs text-[#77858F] flex items-center justify-center w-[22px] h-[22px] rounded-full bg-[#EBF1F7] hover:cursor-pointer">
                        ?
                      </div>
                    </div>
                  ) : (
                    <></>
                  )}

                  
                </div>
                <div className="flex justify-center">
                    <Button
                      onClick={() =>
                        activeTab == PointHistoryActiveTab.COIN
                          ? setIsShowDetailCompanyChangeCoin(true)
                          : router.push(pageRouters.SHOP_ITEM.href)
                      }
                      variant="post"
                      className="w-[200px] h-[46px] text-sm font-medium rounded-md">
                      {activeTab == PointHistoryActiveTab.COIN
                        ? '交換する'
                        : 'アイテムと交換する'}
                    </Button>
                  </div>
              </div>
            </div>
            {/* List history  */}
            <div className="relative w-[720px]">
              <HistoryTable
                key={activeTab}
                historyList={historyPointList}
                hasNextPage={hasNextPage}
                isFetchingNextPage={isFetchingNextPage}
                isLoadingList={isLoadingList}
                fetchNextPage={fetchNextPage}
              />
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
          onNavigateToDotMoney={navigateToDotMoney}
        />
      )}
    </>
  );
};

export default HistoryListPage;
