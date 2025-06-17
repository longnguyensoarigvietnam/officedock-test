import { useMutation } from 'react-query';
import React, { useEffect, useRef, useState } from 'react';

import Button from '@components/common/Button';
import ImageRound from '@components/common/ImageRound';

import { apiRouters } from '@constants/routers';
import { ERROR_CREATE_MESSAGE } from '@constants/message';

import api from '@base/api';
import { useToast } from '@providers/ToastProvider';
import { changeTextAreaFormatLink, convertLinksToHTML } from '@utils';

interface TabMemoChatProps {
  chatRoomCode: string;
  memoDetail: string | undefined;
}

const TabMemoChat = ({ chatRoomCode, memoDetail }: TabMemoChatProps) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const { showToast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (memoDetail && editorRef.current) {
      editorRef.current.innerHTML = convertLinksToHTML(memoDetail);
    }
  }, [memoDetail]);

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
      onSuccess: () => {},
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

  const handleInput = () => {
    changeTextAreaFormatLink({
      editorRef,
      onChange: () => {},
    });
  };

  // Prevent browser from capturing links inside contentEditable
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'A') {
      e.preventDefault();
      const href = target.getAttribute('href');
      if (href) {
        window.open(href, '_blank', 'noopener,noreferrer');
      }
    }
  };
  const handleSave = async () => {
    if (!editorRef.current) return;

    const content = editorRef.current.innerText;
    if (!content) return;

    setIsSaving(true);
    await createMemoChat(content);
  };
  const handleCancel = () => {
    if (editorRef.current && memoDetail) {
      const html = convertLinksToHTML(memoDetail);
      editorRef.current.innerHTML = html;
    }
  };

  return (
    <div>
      <div className="flex w-full justify-end">
        <ImageRound
          onClick={() => editorRef.current?.focus()}
          src="/icons/edit-chat.svg"
          name="edit-chat"
          className="!text-transparent h-fit w-fit cursor-pointer"
        />
      </div>
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onClick={handleClick}
        style={{
          borderRadius: '4px',
          padding: '10px',
          minHeight: '100px',
          whiteSpace: 'pre-wrap',
          lineHeight: '22px',
          letterSpacing: '0',
        }}
        className="focus:border-none mt-1 max-h-[calc(100vh_-_386px)] overflow-y-auto focus-visible:!border-none focus-visible:outline-none text-sm font-normal"
        data-placeholder="Type or paste a URL here..."
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
