import { useMutation } from 'react-query';
import React, { useState } from 'react';

import Button from '@components/common/Button';
import ImageRound from '@components/common/ImageRound';
import TextAreaLink from '@components/common/TextAreaLink';
import './style.css';

import { apiRouters } from '@constants/routers';
import { ERROR_CREATE_MESSAGE } from '@constants/message';

import api from '@base/api';
import { useToast } from '@providers/ToastProvider';
import { ChatRoomDetail } from '@interfaces/chat';

interface TabMemoChatProps {
  chatRoomCode: string;
  memoDetail: string | undefined;
  setChatRoomDetail: React.Dispatch<
    React.SetStateAction<ChatRoomDetail | undefined>
  >;
}

const TabMemoChat = ({
  chatRoomCode,
  memoDetail,
  setChatRoomDetail,
}: TabMemoChatProps) => {
  const { showToast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [dataText, setDataText] = useState<string>('');

  //Function call api create memo
  const handleCreateMemo = async (data: string) => {
    return await api.patch(apiRouters.MEMO_CHAT_ACTION(chatRoomCode), {
      memo: data,
    });
  };

  const { mutate: createMemoChat } = useMutation(
    'postCreateMemoChat',
    handleCreateMemo,
    {
      onSuccess: () => {
        setChatRoomDetail((prev) =>
          prev ? { ...prev, memo: dataText } : prev,
        );
      },
      onError: () => {
        showToast({
          variant: 'error',
          description: ERROR_CREATE_MESSAGE,
        });
      },
      onSettled: () => {
        setIsSaving(false);
      },
    },
  );

  const handleSave = async () => {
    if (!dataText) return;
    setIsSaving(true);
    await createMemoChat(dataText);
  };
  const handleCancel = () => {
    setDataText(memoDetail || '');
  };

  return (
    <div>
      <div className="flex w-full justify-end">
        <ImageRound
          src="/icons/edit-chat.svg"
          name="edit-chat"
          className="!text-transparent h-fit w-fit cursor-pointer"
        />
      </div>
      <TextAreaLink
        className="rounded-[4px] p-[10px] min-h-[100px] !border-none h-auto whitespace-pre-wrap leading-[22px] tracking-[0] focus:border-none mt-1 max-h-[calc(100vh_-_386px)] overflow-y-auto focus-visible:border-none focus-visible:outline-none text-sm font-normal"
        initialValue={memoDetail || ''}
        onChange={(data) => setDataText(data)}
      />
      <div className="w-full border-b border-[#CED8DE] mt-3"></div>
      <div className="flex gap-[14px] items-center mt-4">
        <Button
          onClick={handleCancel}
          variant="outline"
          className="w-[123px] h-[34px] !py-1">
          キャンセル
        </Button>
        <Button
          onClick={handleSave}
          disabled={isSaving}
          variant="primary"
          className="w-[123px] h-[34px] !py-1">
          保存
        </Button>
      </div>
    </div>
  );
};

export default TabMemoChat;
