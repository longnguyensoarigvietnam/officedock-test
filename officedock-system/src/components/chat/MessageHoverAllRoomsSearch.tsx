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
      className={`bg-white group-hover:flex hidden rounded-3xl px-3 py-1.5 shadow-md absolute left-1/2 transform -translate-x-1/2 items-center gap-2`}>
      <DynamicTooltip content={'メッセージに移動'} placement="top">
        <div
          onClick={onGotoMessage}
          className="bg-[#f0f1f1] hover:bg-[#dbdbdb] rounded-full w-[30px] h-[30px] flex items-center justify-center hover:cursor-pointer">
          <ImageRound
            name="Go to message"
            src={'/icons/go-to-message.svg'}
            className="w-[15px] h-[13px] hover:cursor-pointer"
          />
        </div>
      </DynamicTooltip>
      <DynamicTooltip content={messageDetail.isBookmark ? 'ブックマークを外す' : 'ブックマーク'} placement="top">
        <div
          onClick={() => {
            handleBookmark &&
              handleBookmark({
                uuid: messageDetail.uuid,
                isBookmark: !messageDetail.isBookmark,
              });
          }}
          className="bg-[#f0f1f1] hover:bg-[#dbdbdb] rounded-full w-[30px] h-[30px] flex items-center justify-center hover:cursor-pointer">
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
