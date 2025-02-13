import ImageRound from '@components/common/ImageRound';
import { DataActualDetail } from '@interfaces/statistic';
import { formatTime24h } from '@utils/date';
import React, { MutableRefObject } from 'react';

type Props = {
  popoverInfo: DataActualDetail | null;
  popoverRef: MutableRefObject<HTMLDivElement | null>;
  onClose: () => void;
};

const DetailActualItemDailyModal = ({
  popoverInfo,
  popoverRef,
  onClose,
}: Props) => {
  return (
    <>
      {popoverInfo && (
        <div
          className={`w-[250px] z-[10] h-fit rounded-md pl-5 pr-[10px] pt-[10px] pb-5 bg-white`}
          ref={popoverRef}
          style={{
            position: 'absolute',
            top: `${popoverInfo ? popoverInfo.top : 0}px`,
            left: `${popoverInfo ? popoverInfo.left : 0}px`,
            boxShadow: '0px 2px 8px 0px #0000001A',
          }}>
          <div className="flex justify-between items-center">
            <span>実績</span>
            <div className="flex gap-x-[6px] items-center justify-center">
              <div className={`rounded-full cursor-pointer w-fit h-fit `}>
                <ImageRound
                  src={`/icons/more-black.svg`}
                  name="more"
                  className="w-fit h-fit"
                />
              </div>
              <div
                style={{
                  padding: '5px',
                }}
                onClick={onClose}
                className={`rounded-full cursor-pointer w-6 h-6 bg-[#E3EAED]`}>
                <ImageRound
                  src={`/icons/close-black.svg`}
                  name="close"
                  className="w-fit h-fit"
                />
              </div>
            </div>
          </div>
          <div className="flex gap-x-1 items-center mt-[10px]">
            <div
              style={{
                backgroundColor: popoverInfo.largeColor,
              }}
              className="w-3 h-3 rounded-sm"></div>
            <span className="text-black font-bold text-base">
              {popoverInfo.title}
            </span>
          </div>
          <div className="text-[#77858F] text-xs  font-medium flex items-center gap-x-[6px] mt-4">
            <div className="flex gap-1 items-center">
              <span>開始</span>
              <span className="text-base font-normal text-black">
                {formatTime24h(popoverInfo.start)}
              </span>
            </div>
            <p>~</p>
            <div className="flex gap-1 items-center">
              <span>開始</span>
              <span className="text-base font-normal text-black">
                {formatTime24h(popoverInfo.end)}
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default DetailActualItemDailyModal;
