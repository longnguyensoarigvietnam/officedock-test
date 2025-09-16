'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import React, { useContext, useEffect, useRef, useState } from 'react';
import { useMutation, useQueryClient } from 'react-query';

import ImageRound from '@components/common/ImageRound';
import { RenderAccessories } from '@components/custom/UserCustomize';
import Button from '@components/common/Button';
import RowSkeleton from '@components/skeleton/RowSkeleton';
import ConfirmBuyItemUserModal from '@components/modals/ConfirmBuyItemUserModal';
import ItemPreviewCustomize from '@components/customize/ItemPreviewCustomize';

import { apiRouters, pageRouters } from '@constants/routers';
import { TabTypeShopItem } from '@constants/enums';
import { ERROR_COMMON_MESSAGE } from '@constants/message';

import useGetListItemCustomize from '@hooks/useGetListItemCustomize';
import useCreationDataCommon from '@hooks/common/useCreationDataCommon';

import { CustomizeItemResponse, ItemUser } from '@interfaces/shop';
import api from '@base/api';
import { LoadingContext } from '@providers/LoadingProvider';
import { useToast } from '@providers/ToastProvider';

const CustomizeItemPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const resultsContainerRef = useRef<HTMLDivElement | null>(null);
  const { setIsLoading } = useContext(LoadingContext);
  const { showToast } = useToast();
  const [totalPearl, setTotalPearl] = useState(0);

  const tabParam = searchParams.get('tab') as TabTypeShopItem | null;

  // State
  const [activeTab, setActiveTab] = useState<TabTypeShopItem>(
    tabParam || TabTypeShopItem.ALL,
  );

  // Confirm wear
  const [openConfirmModal, setOpenConfirmModal] = useState(false);
  const [dataItemWear, setDataItemWear] = useState<ItemUser | null>(null);

  const tabSideShop = [
    { name: TabTypeShopItem.ALL, value: TabTypeShopItem.ALL },
    { name: TabTypeShopItem.HAT, value: TabTypeShopItem.HAT },
    { name: TabTypeShopItem.CLOTHES, value: TabTypeShopItem.CLOTHES },
    { name: TabTypeShopItem.SHOES, value: TabTypeShopItem.SHOES },
    { name: TabTypeShopItem.BACKGROUND, value: TabTypeShopItem.BACKGROUND },
  ];
  useCreationDataCommon({
    options: {
      get_balances_of_user: true,
    },
    onSuccess: (data) => {
      setTotalPearl(data?.balancesOfUser?.pearl || 0);
    },
  });

  useEffect(() => {
    return () => {
      queryClient.removeQueries(['getListShopItem']);
    };
  }, [queryClient]);

  const {
    listItemCustomize,
    fetchNextPage,
    hasNextPage,
    isLoadingList,
    isFetchingNextPage,
  } = useGetListItemCustomize({
    type: activeTab === TabTypeShopItem.ALL ? '' : activeTab,
  });

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

  // Handle choose item
  const handleWearItem = async (data: CustomizeItemResponse) => {
    const { data: response } = await api.post(apiRouters.USER_WEAR_ITEM, data);
    return response;
  };

  const { mutate: wearItemUser } = useMutation(
    'wearItemsUser',
    handleWearItem,
    {
      onSuccess: async () => {
        setOpenConfirmModal(false);
        setDataItemWear(null);
      },
      onError: () => {
        showToast({
          variant: 'error',
          description: ERROR_COMMON_MESSAGE,
        });
      },
      onSettled: () => {
        setTimeout(() => {
          setIsLoading(false);
        }, 500);
      },
    },
  );

  const handleWearDataItem = (item: ItemUser) => {
    setDataItemWear(item);
    setOpenConfirmModal(true);
  };
  const handleConfirmBuyItem = () => {
    if (!dataItemWear) return;
    setIsLoading(true);
    wearItemUser({
      itemType: dataItemWear.itemType,
      item: dataItemWear.id,
      isEquipped: true,
    });
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
          className=" relative  h-[calc(100vh-120px)] w-full">
          <div className="flex absolute top-0 left-0 ">
            <div className="h-20 z-[30] bg-white w-fit px-10 py-4 text-[#77858F] font-medium flex items-center gap-[10px] rounded-br-[30px]">
              <div
                onClick={() => router.push(pageRouters.SHOP_ITEM.href)}
                className="flex items-center gap-[10px]">
                <ImageRound
                  name="Left icon"
                  src={'/icons/chevron-left.svg'}
                  className={`w-fit h-fit !cursor-pointer`}
                />
                <span className="text-sm text-black cursor-pointer">戻る</span>
              </div>
              <ImageRound
                name="Shop icon"
                src={'/icons/shop.svg'}
                className={`w-fit h-fit ml-[10px]`}
              />
              <span className="text-[22px] text-black ml-1">
                所持アイテムをカスタマイズ
              </span>
            </div>
            <div className="w-fit mt-5 ml-5 px-5 z-[30] font-bold text-base bg-white rounded-full h-10 flex items-center justify-center gap-[9px]">
              <ImageRound
                name="Pearl icon"
                src={'/icons/pearl.svg'}
                className={`w-fit h-fit `}
              />
              <p>{totalPearl}</p>
              <p
                onClick={() => router.push(pageRouters.HISTORY_POINT.href)}
                className="text-sm text-primary underline ml-[11px] cursor-pointer hover:opacity-80">
                ポイント履歴
              </p>
            </div>
          </div>
          <div className="relative  px-[30px] flex w-full justify-between items-center h-full">
            {/* List shop  */}
            <div
              style={{
                boxShadow: '0px 4px 10px 0px #0000000D',
              }}
              className="w-[510px] bg-white mt-[60px]  h-[calc(100vh_-_290px)] font-medium text-white border border-white rounded-3xl py-[30px]">
              {/* Button switch */}
              <div className="flex px-[30px] items-center justify-between">
                <p className="text-[18px] text-black">所持アイテム</p>
                <div className="flex items-center gap-[4px] !w-fit  p-[6px] bg-white rounded-[20px]">
                  {tabSideShop.map((tab) => {
                    const isActive = activeTab === tab.value;

                    return (
                      <Button
                        key={tab.value}
                        onClick={() => setActiveTab(tab.value)}
                        style={{
                          background: isActive
                            ? 'linear-gradient(180deg, #355AC9 0%, #5282FC 100%)'
                            : '#EBF1F7',
                        }}
                        variant={isActive ? 'primary' : 'outline'}
                        className={`font-bold  !border-none w-fit h-[30px] text-xs  !rounded-[20px] !py-0 !px-[18px] ${
                          isActive ? '' : '!text-[#77858F]  !border-none'
                        }`}>
                        {tab.name}
                      </Button>
                    );
                  })}
                </div>
              </div>
              <div className="h-full w-full px-[30px] mt-5">
                <div className="h-full w-full overflow-y-auto ">
                  <div
                    ref={resultsContainerRef}
                    className="w-full h-full  flex flex-col gap-[6px] overflow-y-auto">
                    {!isLoadingList &&
                      listItemCustomize.map((item, index) => (
                        <ItemPreviewCustomize
                          key={`${index}${activeTab}`}
                          group={item}
                          handleWearDataItem={handleWearDataItem}
                        />
                      ))}
                    {isLoadingList && (
                      <div className="w-full h-[calc(100vh_-_400px)] flex flex-col gap-[6px] overflow-hidden">
                        <RowSkeleton numberOfRows={5} className="h-[90px]" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            {/* User */}
            <div className="flex-shrink-0 flex-grow flex items-center justify-center h-full">
              <div className="h-[424px] w-[336px] mt-20 ml-20  relative">
                <RenderAccessories />
              </div>
            </div>
            {/* Customize */}
            <div
              style={{
                background: 'linear-gradient(180deg, #355AC9 0%, #5282FC 100%)',
              }}
              onClick={() => router.push(pageRouters.SHOP_ITEM.href)}
              className="h-[52px]  absolute top-[110px] px-[22px] right-9 w-fit rounded-[10px] text-[13px] font-bold text-white flex items-center gap-[10px] cursor-pointer hover:opacity-95">
              <ImageRound
                name="Shop icon"
                src={'/icons/shop.svg'}
                className={`w-7 h-7`}
              />
              <div>
                <p>新しいアイテムを</p>
                <p>見に行く</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      {openConfirmModal && dataItemWear && (
        <ConfirmBuyItemUserModal
          dataItemBuy={dataItemWear}
          open={openConfirmModal}
          isWear={true}
          onClose={() => {
            setOpenConfirmModal(false);
            setDataItemWear(null);
          }}
          onConfirm={handleConfirmBuyItem}
        />
      )}
    </>
  );
};

export default CustomizeItemPage;
