'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

import Button from '@components/common/Button';
import ImageRound from '@components/common/ImageRound';

import { ItemUser, ShopItem } from '@interfaces/shop';

interface Props {
  group: ShopItem;
  totalPearl: number;
  handleBuyDataItem: (item: ItemUser) => void;
  handlePreviewItem: (item: ItemUser, isFirst?: boolean) => void;
}

const ItemGroupCard = ({
  group,
  totalPearl,
  handleBuyDataItem,
  handlePreviewItem,
}: Props) => {
  const [selectedItem, setSelectedItem] = useState<ItemUser | null>(null);

  useEffect(() => {
    if (group && !selectedItem) {
      const itemEquipped = group.items.find((item) => item.isEquipped);
      setSelectedItem(itemEquipped || null);
      itemEquipped && handlePreviewItem(itemEquipped, true);
    }
  }, [group, handlePreviewItem, selectedItem]);

  const actionItem = group.items.find((item) => item.id == selectedItem?.id);

  const isHasBuy =
    (selectedItem && totalPearl < selectedItem?.price) || selectedItem?.isOwned;

  const isCheckAllOwned =
    group.isAllOwned || group.items.every((item) => item.isOwned);

  return (
    <>
      <div
        className={`flex items-center justify-between px-4 py-4 hover:bg-[#F6F6F6] group rounded-[20px] ${isCheckAllOwned && 'opacity-50'}`}>
        {/* Left: icon + tên */}
        <div className={`flex gap-4 items-center ${isHasBuy && 'opacity-50'}`}>
          <div className="flex w-[72px] h-[72px] items-center justify-center bg-white rounded-[10px] border border-[#D2DBE1]">
            <Image
              alt={`${group.name} icon`}
              src={selectedItem?.cropFile || group.items[0].cropFile}
              width={56}
              height={56}
              className="rounded-full object-contain"
            />
          </div>
          <div className="w-[84px]">
            <p className="text-[13px] font-medium text-[#77858F]">
              {group.itemType}
            </p>
            <p className="text-[15px] font-medium text-black">{group.name}</p>
          </div>
        </div>

        {/* Right: colors + price */}
        <div className="flex items-center justify-between gap-3 flex-grow flex-shrink-0">
          <div className="grid grid-cols-5 gap-[3px] w-[132px] flex-shrink-0">
            {group.items.map((item) => {
              return selectedItem?.id === item.id ? (
                <div className="w-fit h-fit rounded-full flex items-center justify-center border-[2px] border-[#0068B6] ">
                  <button
                    key={item.id}
                    onClick={() => {
                      setSelectedItem(item);
                      handlePreviewItem(item);
                    }}
                    className={`w-5 h-5 flex items-center justify-center rounded-full border-[2px] border-white group-hover:border-[#F6F6F6] `}
                    style={{ backgroundColor: item.color }}>
                    {item.isOwned && (
                      <ImageRound
                        name="tick icon"
                        src={'/icons/ticket-item.svg'}
                        className={`w-fit h-fit `}
                      />
                    )}
                  </button>
                </div>
              ) : (
                <div
                  className={`w-fit h-fit rounded-full flex items-center justify-center border-[2px] border-white group-hover:border-[#F6F6F6] ${item.isOwned && 'opacity-50'}`}>
                  <button
                    key={item.id}
                    onClick={() => {
                      setSelectedItem(item);
                      handlePreviewItem(item);
                    }}
                    className={`w-5 h-5 rounded-full  border-[2px] flex items-center justify-center border-white group-hover:border-[#F6F6F6] `}
                    style={{ backgroundColor: item.color }}>
                    {item.isOwned && (
                      <ImageRound
                        name="tick icon"
                        src={'/icons/ticket-item.svg'}
                        className={`w-fit h-fit `}
                      />
                    )}
                  </button>
                </div>
              );
            })}
          </div>
          <div className="flex flex-col flex-shrink-0 items-center gap-2">
            {actionItem && !actionItem?.isOwned && (
              <div className="flex items-center gap-[9px] text-black">
                <Image
                  alt="Pearl icon"
                  src={'/icons/pearl.svg'}
                  width={20}
                  height={20}
                />
                <p
                  className={`font-bold text-base ${isHasBuy && 'text-[#E95062]'}`}>
                  {selectedItem?.price || group.items[0].price}
                </p>
              </div>
            )}
            {!selectedItem && (
              <div className="flex items-center gap-[9px] text-black">
                <Image
                  alt="Pearl icon"
                  src={'/icons/pearl.svg'}
                  width={20}
                  height={20}
                />
                <p className="font-bold text-base">{group.items[0].price}</p>
              </div>
            )}
            {actionItem && actionItem?.isOwned && (
              <div className="flex items-center justify-center text-xs font-semibold text-center w-[56px] h-[22px] bg-[#EBF1F7] rounded-[3px] text-black">
                所持済
              </div>
            )}
            {actionItem &&
              !actionItem.isOwned &&
              totalPearl >= actionItem?.price && (
                <Button
                  onClick={() => handleBuyDataItem(actionItem)}
                  className="w-[48px] h-[21px] !text-xs !py !px-0 !rounded"
                  variant="post">
                  交換
                </Button>
              )}
          </div>
        </div>
      </div>
      <div className="w-full h-[1px] border-t border-[#D2DBE1]"></div>
    </>
  );
};

export default ItemGroupCard;
