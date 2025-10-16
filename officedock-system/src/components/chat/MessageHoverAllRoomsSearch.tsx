'use client';
import ImageRound from '@components/common/ImageRound';
import { DynamicTooltip } from '@components/tooltip/DynamicTooltip';

import { ChatMessageResponse } from '@interfaces/chat';

interface MessageHoverAllRoomsSearchProps {
  messageDetail: ChatMessageResponse;
  onGotoMessage: () => void;
  handleBookmark:
    | ((data: { uuid: string; isBookmark: boolean }) => void)
    | undefined;
}

export const MessageHoverAllRoomsSearch = ({
  messageDetail,
  onGotoMessage,
  handleBookmark,
}: MessageHoverAllRoomsSearchProps) => {
  return (
    <div
      className={`bg-white group-hover:flex hidden rounded-[100px] p-[6px] shadow-md absolute left-1/2 -bottom-[22px] transform -translate-x-1/2 items-center gap-[6px]`}
      style={{ boxShadow: '0px 4px 8px 0px #0000000F' }}>
      <DynamicTooltip content={'メッセージに移動'} placement="top">
        <div
          onClick={onGotoMessage}
          className="bg-[#EBF1F7] hover:opacity-90 rounded-full w-[30px] h-[30px] flex items-center justify-center hover:cursor-pointer">
          <ImageRound
            name="Go to message"
            src={'/icons/go-to-message.svg'}
            className="w-[16px] h-[14px] hover:cursor-pointer"
          />
        </div>
      </DynamicTooltip>
      <DynamicTooltip
        content={
          messageDetail.isBookmark ? 'ブックマークを外す' : 'ブックマーク'
        }
        placement="top">
        <div
          onClick={() => {
            handleBookmark &&
              handleBookmark({
                uuid: messageDetail.uuid,
                isBookmark: !messageDetail.isBookmark,
              });
          }}
          className="bg-[#EBF1F7] hover:opacity-90 rounded-full w-[30px] h-[30px] flex items-center justify-center hover:cursor-pointer">
          <ImageRound
            name="Book mark"
            src={`/icons/${messageDetail.isBookmark ? 'save-active.svg' : 'save-chat.svg'}`}
            className="w-[10px] h-[12px] hover:cursor-pointer"
          />
        </div>
      </DynamicTooltip>
    </div>
  );
};
