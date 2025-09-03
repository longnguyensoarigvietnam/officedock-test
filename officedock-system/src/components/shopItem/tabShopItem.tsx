import ImageRound from '@components/common/ImageRound';
import React from 'react';

const TabShopItem = () => {
  const listColor = [
    '#F86683',
    '#F89A7E',
    '#51C4B6',
    '#6C92F4',
    '#A992FF',
    '#FA81C1',
    '#FFCC40',
    '#86DA91',
    '#82C5F1',
    '#B0B8F2',
  ];
  return (
    <div className="h-full w-full">
      <div className="w-full h-full overflow-y-auto">
        <div className="flex items-center justify-between px-4">
          <div className="flex gap-4 items-center">
            <div className="flex w-[72px] h-[72px] items-center justify-center bg-white rounded-[10px] border border-[#D2DBE1]">
              <ImageRound
                name="Shop icon"
                src={`/images/users/hat-demo.png`}
                className={`w-fit h-fit`}
              />
            </div>
            <div className="w-[84px]">
              <p className="text-[13px] font-medium text-[#77858F]">帽子</p>
              <p className="text-[15px] font-medium text-black">
                マイルくんの帽子
              </p>
            </div>
          </div>
          <div className="flex items-center gap-[42px]">
            <div className="grid grid-cols-5 gap-[6px] w-fit">
              {listColor.map((color, index) => (
                <div
                  key={index}
                  className="w-5 h-5 rounded-full"
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
            <div className="flex items-center gap-[9px] text-black">
              <ImageRound
                name="Pearl icon"
                src={'/icons/pearl.svg'}
                className={`w-fit h-fit `}
              />
              <p className="font-bold text-base">10</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TabShopItem;
