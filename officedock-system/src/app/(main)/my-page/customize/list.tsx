'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import React, { useState } from 'react';

import ImageRound from '@components/common/ImageRound';
import { RenderAccessories } from '@components/custom/UserCustomize';

import { pageRouters } from '@constants/routers';
import { TabTypeShopItem } from '@constants/enums';
import Button from '@components/common/Button';

const CustomizeItemPage = () => {
  const router = useRouter();
  const listAvatar = ['body', 'head-full', 'hat', 'shoes'];
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab') as TabTypeShopItem | null;

  // State
  const [activeTab, setActiveTab] = useState<TabTypeShopItem>(
    tabParam || TabTypeShopItem.ALL,
  );

  const renderContent = () => {
    switch (activeTab) {
      case TabTypeShopItem.ALL:
        return <div></div>;
      case TabTypeShopItem.HAT:
        return <div>all</div>;
      case TabTypeShopItem.CLOTHES:
        return <div>all</div>;
      case TabTypeShopItem.SHOES:
        return <div>all</div>;
      default:
        return null;
    }
  };

  const tabSideShop = [
    { name: TabTypeShopItem.ALL, value: TabTypeShopItem.ALL },
    { name: TabTypeShopItem.HAT, value: TabTypeShopItem.HAT },
    { name: TabTypeShopItem.CLOTHES, value: TabTypeShopItem.CLOTHES },
    { name: TabTypeShopItem.SHOES, value: TabTypeShopItem.SHOES },
    { name: TabTypeShopItem.BACKGROUND, value: TabTypeShopItem.BACKGROUND },
  ];

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
                アイテムショップ
              </span>
            </div>
            <div className="w-fit mt-5 ml-5 px-5 z-[30] font-bold text-base bg-white rounded-full h-10 flex items-center justify-center gap-[9px]">
              <ImageRound
                name="Pearl icon"
                src={'/icons/pearl.svg'}
                className={`w-fit h-fit `}
              />
              <p>10</p>
              <p className="text-sm text-primary underline ml-[11px] cursor-pointer hover:opacity-80">
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
                {renderContent()}
              </div>
            </div>
            {/* User */}
            <div className="flex-shrink-0 flex-grow flex items-center justify-center h-full">
              <div className="h-[424px] w-[336px] mt-24 ml-20  relative">
                <RenderAccessories images={listAvatar} />
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
    </>
  );
};

export default CustomizeItemPage;
