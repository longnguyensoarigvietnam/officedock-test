'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import React, { useContext, useEffect, useRef, useState } from 'react';
import { useMutation, useQueryClient } from 'react-query';

import ImageRound from '@components/common/ImageRound';
import Button from '@components/common/Button';
import ItemGroupCard from '@components/shopItem/ItemDetail';
import RowSkeleton from '@components/skeleton/RowSkeleton';
import ConfirmBuyItemUserModal from '@components/modals/ConfirmBuyItemUserModal';
import { RenderAccessoriesPreview } from '@components/custom/UserCustomizePreview';
import ActionModalSuccessItem from '@components/modals/ActionModalSuccessItem';
import { TwinklingIcon } from '@components/common/TwinklingIcon';

import { apiRouters, pageRouters } from '@constants/routers';
import { ItemAvatarType, TabTypeShopItem } from '@constants/enums';
import { ERROR_BUY_ITEM_USER } from '@constants/message';

import useListShopItem from '@hooks/useListShopItem';
import useCreationDataCommon from '@hooks/common/useCreationDataCommon';
import { useUpdateShopItemCache } from '@hooks/CacheQuery/useUpdateShopItems';

import { LoadingContext } from '@providers/LoadingProvider';
import { useToast } from '@providers/ToastProvider';
import api from '@base/api';
import { AvatarItemUser, ItemUser, ShopItemResponse } from '@interfaces/shop';
import { updateAvatarUrl } from '@utils';

const ShopItemPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setIsLoading } = useContext(LoadingContext);
  const { showToast } = useToast();

  const tabParam = searchParams.get('tab') as TabTypeShopItem | null;
  const [totalPearl, setTotalPearl] = useState(0);

  // Confirm buy
  const [openConfirmModal, setOpenConfirmModal] = useState(false);
  const [dataItemBuy, setDataItemBuy] = useState<ItemUser | null>(null);
  const [openModalSuccess, setOpenModalSuccess] = useState(false);

  const [selectedItemType, setSelectedItemType] = useState<string | null>(null);

  // State
  const [activeTab, setActiveTab] = useState<TabTypeShopItem>(
    tabParam || TabTypeShopItem.ALL,
  );

  const defaultItemsPreview: AvatarItemUser[] = [
    { name: 'body', type: ItemAvatarType.BODY, url: '' },
    { name: 'head-full', type: 'head', url: '' },
    { name: 'hat', type: ItemAvatarType.HAT, url: '' },
    { name: 'shoes', type: ItemAvatarType.SHOES, url: '' },
  ];

  const [itemsPreview, setItemsPreview] =
    useState<AvatarItemUser[]>(defaultItemsPreview);

  const queryClient = useQueryClient();

  const tabSideShop = [
    { name: TabTypeShopItem.ALL, value: TabTypeShopItem.ALL },
    { name: TabTypeShopItem.HAT, value: TabTypeShopItem.HAT },
    { name: TabTypeShopItem.CLOTHES, value: TabTypeShopItem.CLOTHES },
    { name: TabTypeShopItem.SHOES, value: TabTypeShopItem.SHOES },
    { name: TabTypeShopItem.BACKGROUND, value: TabTypeShopItem.BACKGROUND },
  ];

  useEffect(() => {
    return () => {
      queryClient.removeQueries(['getListShopItem']);
    };
  }, [queryClient]);

  const {
    shopItemList,
    fetchNextPage,
    hasNextPage,
    isLoadingList,
    isFetchingNextPage,
  } = useListShopItem({
    type: activeTab === TabTypeShopItem.ALL ? '' : activeTab,
  });

  const resultsContainerRef = useRef<HTMLDivElement | null>(null);

  const { isFetchingCreationDataCommon, refetchCreationDataCommon } =
    useCreationDataCommon({
      options: {
        get_balances_of_user: true,
        get_items_of_user: true,
      },
      onSuccess: (data) => {
        setTotalPearl(data?.balancesOfUser?.pearl || 0);
        if (data.itemsOfUser) {
          const updates = data.itemsOfUser.map((item) => ({
            type: item.itemType,
            url: item.fullFile,
          }));

          const merged = updateAvatarUrl(itemsPreview, updates);
          setItemsPreview(merged);
        }
      },
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

  const { updateItemOwned } = useUpdateShopItemCache();

  // Handle buy item
  const handleBuyItem = async (data: ShopItemResponse) => {
    const { data: response } = await api.post(apiRouters.USER_BUY_ITEM, data);
    return response;
  };

  const { mutate: buyItemUser } = useMutation('buyItemsUser', handleBuyItem, {
    onSuccess: async () => {
      setOpenConfirmModal(false);
      setDataItemBuy(null);
      setOpenModalSuccess(true);
      updateItemOwned({
        id: dataItemBuy?.id as number,
        isOwned: true,
        type: activeTab === TabTypeShopItem.ALL ? '' : activeTab,
        screenName: undefined,
      });
      if (dataItemBuy?.itemType == selectedItemType) {
        setSelectedItemType(null);
      }
      refetchCreationDataCommon();
    },
    onError: () => {
      showToast({
        variant: 'error',
        description: ERROR_BUY_ITEM_USER,
      });
    },
    onSettled: () => {
      setTimeout(() => {
        setIsLoading(false);
      }, 500);
    },
  });
  const handleBuyDataItem = (item: ItemUser) => {
    setDataItemBuy(item);
    setOpenConfirmModal(true);
  };
  const handleConfirmBuyItem = () => {
    if (!dataItemBuy) return;
    setIsLoading(true);
    buyItemUser({
      itemType: dataItemBuy.itemType,
      item: dataItemBuy.id,
      isEquipped: true,
    });
  };

  const handlePreviewItem = (item: ItemUser, isFirst?: boolean) => {
    setItemsPreview((prev) =>
      prev.map((avatar) =>
        avatar.type === item.itemType
          ? { ...avatar, url: item.fullFile, name: item.name }
          : avatar,
      ),
    );
    if (isFirst) return;
    setSelectedItemType(item.itemType);
  };

  return (
    <>
      <div className="h-full w-full">
        <div
          style={{
            backgroundImage: 'url("/images/bg-shop.jpg")',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            width: '100%',
            height: '100%',
          }}
          className=" relative  h-[calc(100vh-120px)] w-full">
          <div className="flex absolute top-0 left-0 ">
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
              <ImageRound
                name="Shop icon"
                src={'/icons/shop.svg'}
                className={`w-fit h-fit ml-[10px]`}
              />
              <span className="text-[22px] text-black ml-1">
                アイテムショップ
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
                <p className="text-[18px] text-black">アイテム一覧</p>
                <div className="flex items-center gap-[4px] !w-fit  p-[6px] bg-white rounded-[20px]">
                  {tabSideShop.map((tab) => {
                    const isActive = activeTab === tab.value;

                    return (
                      <Button
                        key={tab.value}
                        onClick={() => setActiveTab(tab.value)}
                        disabled={isLoadingList}
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
                <div className="h-full w-full">
                  <div
                    ref={resultsContainerRef}
                    className="w-full  flex flex-col gap-[6px] overflow-y-auto">
                    {!isLoadingList &&
                      shopItemList.map((item, index) => (
                        <ItemGroupCard
                          key={`${index}${activeTab}`}
                          group={item}
                          totalPearl={totalPearl}
                          handleBuyDataItem={handleBuyDataItem}
                          handlePreviewItem={handlePreviewItem}
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
            <div className="flex-shrink-0  flex-grow flex items-center justify-center h-full">
              <div className="h-[424px] w-[336px] mt-20 ml-20  relative">
                <RenderAccessoriesPreview
                  itemsPreview={itemsPreview}
                  isFetchingCreationDataCommon={isFetchingCreationDataCommon}
                />

                <div className="">
                  {selectedItemType == ItemAvatarType.HAT && (
                    <>
                      {/* RIGHT 1 */}
                      <TwinklingIcon
                        className="absolute top-[-10px] left-[-10px] !w-8 !h-8"
                        delay={0}
                        iconUrl="/icons/star-new.svg"
                      />
                      {/* RIGHT 2 */}
                      <TwinklingIcon
                        className="absolute top-[35px] left-[-55px] !w-8 !h-8"
                        delay={1.2}
                        iconUrl="/icons/star-new-main.svg"
                      />
                      {/* RIGHT 3 */}
                      <TwinklingIcon
                        className="absolute top-[95px] left-[-25px] !w-8 !h-8"
                        delay={1}
                        iconUrl="/icons/star-new.svg"
                      />
                      {/* LEFT 1 */}
                      <TwinklingIcon
                        className="absolute top-[-10px] right-[15px] !w-8 !h-8"
                        delay={0.8}
                        iconUrl="/icons/star-new.svg"
                      />
                      {/* LEFT 2 */}
                      <TwinklingIcon
                        className="absolute top-[35px] right-[-30px] !w-8 !h-8"
                        delay={0.5}
                        iconUrl="/icons/star-new-main.svg"
                      />
                      {/* LEFT 3 */}
                      <TwinklingIcon
                        className="absolute top-[95px] right-[0px] !w-8 !h-8"
                        delay={1.5}
                        iconUrl="/icons/star-new.svg"
                      />
                    </>
                  )}
                  {selectedItemType == ItemAvatarType.BODY && (
                    <>
                      {/* RIGHT 1 */}
                      <TwinklingIcon
                        className="absolute top-[180px] left-[-10px] !w-8 !h-8"
                        delay={0}
                        iconUrl="/icons/star-new.svg"
                      />
                      {/* RIGHT 2 */}
                      <TwinklingIcon
                        className="absolute top-[250px] left-[-55px] !w-8 !h-8"
                        delay={1.2}
                        iconUrl="/icons/star-new-main.svg"
                      />
                      {/* RIGHT 3 */}
                      <TwinklingIcon
                        className="absolute top-[320px] left-[-25px] !w-8 !h-8"
                        delay={1}
                        iconUrl="/icons/star-new.svg"
                      />
                      {/* LEFT 1 */}
                      <TwinklingIcon
                        className="absolute top-[180px] right-[15px] !w-8 !h-8"
                        delay={0.8}
                        iconUrl="/icons/star-new.svg"
                      />
                      {/* LEFT 2 */}
                      <TwinklingIcon
                        className="absolute top-[250px] right-[-30px] !w-8 !h-8"
                        delay={0.5}
                        iconUrl="/icons/star-new-main.svg"
                      />
                      {/* LEFT 3 */}
                      <TwinklingIcon
                        className="absolute top-[320px] right-[0px] !w-8 !h-8"
                        delay={1.5}
                        iconUrl="/icons/star-new.svg"
                      />
                    </>
                  )}
                  {selectedItemType == ItemAvatarType.BODY && (
                    <>
                      {/* RIGHT 1 */}
                      <TwinklingIcon
                        className="absolute top-[180px] left-[-10px] !w-8 !h-8"
                        delay={0}
                        iconUrl="/icons/star-new.svg"
                      />
                      {/* RIGHT 2 */}
                      <TwinklingIcon
                        className="absolute top-[250px] left-[-55px] !w-8 !h-8"
                        delay={1.2}
                        iconUrl="/icons/star-new-main.svg"
                      />
                      {/* RIGHT 3 */}
                      <TwinklingIcon
                        className="absolute top-[320px] left-[-25px] !w-8 !h-8"
                        delay={1}
                        iconUrl="/icons/star-new.svg"
                      />
                      {/* LEFT 1 */}
                      <TwinklingIcon
                        className="absolute top-[180px] right-[15px] !w-8 !h-8"
                        delay={0.8}
                        iconUrl="/icons/star-new.svg"
                      />
                      {/* LEFT 2 */}
                      <TwinklingIcon
                        className="absolute top-[250px] right-[-30px] !w-8 !h-8"
                        delay={0.5}
                        iconUrl="/icons/star-new-main.svg"
                      />
                      {/* LEFT 3 */}
                      <TwinklingIcon
                        className="absolute top-[320px] right-[0px] !w-8 !h-8"
                        delay={1.5}
                        iconUrl="/icons/star-new.svg"
                      />
                    </>
                  )}{' '}
                  {selectedItemType == ItemAvatarType.SHOES && (
                    <>
                      {/* RIGHT 1 */}
                      <TwinklingIcon
                        className="absolute bottom-[50px] left-[25px] !w-8 !h-8"
                        delay={0}
                        iconUrl="/icons/star-new.svg"
                      />
                      {/* RIGHT 2 */}
                      <TwinklingIcon
                        className="absolute bottom-[5px] left-[5px] !w-8 !h-8"
                        delay={1.2}
                        iconUrl="/icons/star-new-main.svg"
                      />
                      {/* RIGHT 3 */}
                      <TwinklingIcon
                        className="absolute bottom-[-45px] left-[55px] !w-8 !h-8"
                        delay={1}
                        iconUrl="/icons/star-new.svg"
                      />
                      {/* LEFT 1 */}
                      <TwinklingIcon
                        className="absolute bottom-[50px] right-[55px] !w-8 !h-8"
                        delay={0.8}
                        iconUrl="/icons/star-new.svg"
                      />
                      {/* LEFT 2 */}
                      <TwinklingIcon
                        className="absolute bottom-[5px] right-[35px] !w-8 !h-8"
                        delay={0.5}
                        iconUrl="/icons/star-new-main.svg"
                      />
                      {/* LEFT 3 */}
                      <TwinklingIcon
                        className="absolute bottom-[-45px] right-[95px] !w-8 !h-8"
                        delay={1.5}
                        iconUrl="/icons/star-new.svg"
                      />
                    </>
                  )}
                </div>
              </div>
            </div>
            {/* Customize */}
            <div
              style={{
                background: 'linear-gradient(180deg, #355AC9 0%, #5282FC 100%)',
              }}
              onClick={() => router.push(pageRouters.CUSTOMIZE_ITEM.href)}
              className="h-[52px]  absolute top-[110px] px-[22px] right-9 w-fit rounded-[10px] text-[13px] font-bold text-white flex items-center gap-[10px] cursor-pointer hover:opacity-95">
              <ImageRound
                name="Shop icon"
                src={'/icons/shop.svg'}
                className={`w-7 h-7`}
              />
              <div>
                <p>所持アイテムで</p>
                <p>服装や背景をカスタマイズ</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      {openConfirmModal && dataItemBuy && (
        <ConfirmBuyItemUserModal
          dataItemBuy={dataItemBuy}
          open={openConfirmModal}
          onClose={() => {
            setOpenConfirmModal(false);
            setDataItemBuy(null);
          }}
          onConfirm={handleConfirmBuyItem}
        />
      )}
      {openModalSuccess && (
        <ActionModalSuccessItem
          open={openModalSuccess}
          onClose={() => setOpenModalSuccess(false)}
        />
      )}
    </>
  );
};

export default ShopItemPage;
