import React, { Dispatch, SetStateAction, useEffect, useState } from 'react';

import Button from '@components/common/Button';
import ImageRound from '@components/common/ImageRound';

import { ChatMemoType } from '@constants/enums';
import TabMemoChat from './memo/TabMemoChat';
import {
  ChatMessageResponse,
  ChatRoomDetail,
  DataChatFileMemo,
} from '@interfaces/chat';
import TabFileChat from './memo/TabFileChat';
import TabParticipantsChat from './memo/TabParticipantsChat';

interface MemoDataProps {
  initialLoad: boolean;
  chatRoomCode: string;
  chatRoomDetail: ChatRoomDetail | undefined;
  dataFileAddList: DataChatFileMemo[];
  setDataFileAddList: Dispatch<SetStateAction<DataChatFileMemo[]>>;
  setChatRoomDetail: Dispatch<SetStateAction<ChatRoomDetail | undefined>>;
  setDataMessageDetail: Dispatch<SetStateAction<ChatMessageResponse[]>>;
  onGotoMessage: (data: { messageId: string | number }) => void;
  onClose: () => void;
}

const MemoDataChat = ({
  chatRoomCode,
  chatRoomDetail,
  dataFileAddList,
  initialLoad,
  setDataFileAddList,
  setChatRoomDetail,
  setDataMessageDetail,
  onGotoMessage,
  onClose,
}: MemoDataProps) => {
  const [activeTab, setActiveTab] = useState<ChatMemoType>(ChatMemoType.MEMO);

  const renderContent = () => {
    switch (activeTab) {
      case ChatMemoType.MEMO:
        return (
          <TabMemoChat
            chatRoomCode={chatRoomCode}
            memoDetail={chatRoomDetail?.memo}
            setChatRoomDetail={setChatRoomDetail}
          />
        );
      case ChatMemoType.FILE:
        return (
          <TabFileChat
            chatRoomCode={chatRoomCode}
            dataFileAddList={dataFileAddList}
            initialLoad={initialLoad}
            setDataMessageDetail={setDataMessageDetail}
            onGotoMessage={onGotoMessage}
            setDataFileAddList={setDataFileAddList}
          />
        );
      case ChatMemoType.MEMBER:
        return <TabParticipantsChat chatRoomDetail={chatRoomDetail} />;
      default:
        return null;
    }
  };

  const tabItems = [
    { label: 'メモ', value: ChatMemoType.MEMO },
    { label: 'ファイル', value: ChatMemoType.FILE },
    { label: 'メンバー', value: ChatMemoType.MEMBER },
  ];

  useEffect(() => {
    if (dataFileAddList && activeTab !== ChatMemoType.FILE) {
      setDataFileAddList([]);
    }
  }, [activeTab, dataFileAddList, setDataFileAddList]);

  return (
    <div className="px-4 pt-5">
      {/* Button switch */}
      <div className="flex items-center gap-2 ">
        {tabItems.map((tab) => {
          const isActive = activeTab === tab.value;

          return (
            <Button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              variant={isActive ? 'primary' : 'outline'}
              className={`font-bold w-[70px] h-6 text-xs !rounded-[20px] !py-0 !px-0 ${
                isActive
                  ? ''
                  : '!text-[#77858F] !bg-transparent !border-[#77858F]'
              }`}>
              {tab.label}
            </Button>
          );
        })}

        <div className="ml-3">
          <ImageRound
            onClick={onClose}
            src="/icons/close-memo-chat.svg"
            name="close"
            className="!text-transparent h-fit w-fit cursor-pointer hover:opacity-60"
          />
        </div>
      </div>
      <div className="mt-4 px-1">{renderContent()}</div>
    </div>
  );
};

export default MemoDataChat;
