'use client';

import { useState } from 'react';
import Image from 'next/image';
import { ItemUser, ShopItem } from '@interfaces/shop';

interface Props {
  group: ShopItem;
}

const ItemGroupCard = ({ group }: Props) => {
  const [selectedItem, setSelectedItem] = useState<ItemUser | null>(
    group.items[0] || null,
  );

  return (
    <>
      <div className="flex items-center justify-between px-4 py-4">
        {/* Left: icon + tên */}
        <div className="flex gap-4 items-center">
          <div className="flex w-[72px] h-[72px] items-center justify-center bg-white rounded-[10px] border border-[#D2DBE1]">
            <Image
              alt={`${group.name} icon`}
              src={selectedItem?.cropFile || '/images/users/hat-demo.png'}
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
        <div className="flex items-center gap-[42px]">
          <div className="grid grid-cols-5 gap-[3px] w-fit">
            {group.items.map((item) => {
              return selectedItem?.id === item.id ? (
                <div className="w-fit h-fit rounded-full flex items-center justify-center border-[3px] border-[#0068B6]">
                  <button
                    key={item.id}
                    onClick={() => setSelectedItem(item)}
                    className={`w-5 h-5 rounded-full border-[2px] border-white  `}
                    style={{ backgroundColor: item.color }}
                  />
                </div>
              ) : (
                <div className="w-fit h-fit rounded-full flex items-center justify-center border-[3px] border-white">
                  <button
                    key={item.id}
                    onClick={() => setSelectedItem(item)}
                    className={`w-5 h-5 rounded-full  border-[2px] border-white`}
                    style={{ backgroundColor: item.color }}
                  />
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-[9px] text-black">
            <Image
              alt="Pearl icon"
              src={'/icons/pearl.svg'}
              width={20}
              height={20}
            />
            <p className="font-bold text-base">{selectedItem?.price ?? 0}</p>
          </div>
        </div>
      </div>
      <div className="w-full h-[1px] border-t border-[#D2DBE1]"></div>
    </>
  );
};

export default ItemGroupCard;
