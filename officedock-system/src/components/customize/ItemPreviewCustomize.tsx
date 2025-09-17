'use client';
import { useContext, useState } from 'react';
import Image from 'next/image';

import { ItemUser, ShopItem } from '@interfaces/shop';
import Button from '@components/common/Button';
import { GlobalStateContext } from '@providers/GlobalStateProvider';

interface Props {
  group: ShopItem;
  handleWearDataItem: (item: ItemUser) => void;
}

const ItemPreviewCustomize = ({ group, handleWearDataItem }: Props) => {
  const { setDataItem } = useContext(GlobalStateContext);

  const [selectedItem, setSelectedItem] = useState<ItemUser | null>(null);

  return (
    <>
      <div className="flex items-center justify-between px-4 py-4 group hover:bg-[#F6F6F6] rounded-[20px]">
        {/* Left: icon + tên */}
        <div className="flex gap-4 items-center">
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
                    }}
                    className={`w-5 h-5 flex items-center justify-center rounded-full border-[2px] border-white  `}
                    style={{ backgroundColor: item.color }}
                  />
                </div>
              ) : (
                <div className="w-fit h-fit rounded-full flex items-center justify-center border-[2px] border-white group-hover:border-[#F6F6F6]">
                  <button
                    key={item.id}
                    onClick={() => {
                      setSelectedItem(item);
                      setDataItem((prev) =>
                        prev.map((avatar) =>
                          avatar.type === item.itemType
                            ? {
                                ...avatar,
                                url: item.fullFile,
                                name: item.name,
                              }
                            : avatar,
                        ),
                      );
                    }}
                    className={`w-5 h-5 rounded-full  border-[2px] flex items-center justify-center border-white  group-hover:border-[#F6F6F6]`}
                    style={{ backgroundColor: item.color }}
                  />
                </div>
              );
            })}
          </div>
          <div className="flex-shrink-0">
            {selectedItem && !selectedItem.isEquipped ? (
              <Button
                onClick={() => handleWearDataItem(selectedItem)}
                className="w-[48px] h-[21px] !text-xs !py !px-0 !rounded"
                variant="post">
                交換
              </Button>
            ) : selectedItem && selectedItem.isEquipped ? (
              <div className="flex items-center justify-center text-xs font-semibold text-center w-[56px] h-[22px] bg-[#EBF1F7] rounded-[3px] text-black">
                使用中
              </div>
            ) : (
              <div className="w-[48px]"></div>
            )}
          </div>
        </div>
      </div>
      <div className="w-full h-[1px] border-t border-[#D2DBE1]"></div>
    </>
  );
};

export default ItemPreviewCustomize;
