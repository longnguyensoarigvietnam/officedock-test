'use client';
import { useMutation } from 'react-query';
import Tippy from '@tippyjs/react';
import 'tippy.js/dist/tippy.css';

import ImageRound from '@components/common/ImageRound';

import api from '@base/api';
import { apiRouters } from '@constants/routers';

interface MessageHoverOptionsProps {
  uuid: string;
  onGotoMessage: () => void;
  handleRemoveItemBookmark: (uuid: string) => void;
}

export const MessageHoverBookmark = ({
  uuid,
  onGotoMessage,
  handleRemoveItemBookmark,
}: MessageHoverOptionsProps) => {
  // Handle bookmark msg
  const handleBookMarkMsg = async () => {
    const { data: response } = await api.post(
      apiRouters.BOOKMARK_MESSAGE(`${uuid}`),
      {
        bookmarkAt: null,
      },
    );
    return response;
  };

  const { mutate: bookMarkMsg } = useMutation(
    'bookMarkMsg',
    handleBookMarkMsg,
    {
      onSuccess: async () => {
        handleRemoveItemBookmark(uuid);
      },
      onError: () => {},
      onSettled: () => {},
    },
  );

  return (
    <div
      className={`bg-white group-hover:flex hidden rounded-3xl px-3 py-1.5 shadow-md absolute left-1/2 transform -translate-x-1/2 items-center gap-2`}>
      <Tippy
        content={'リアクション'}
        arrow={false}
        delay={1000}
        placement="top"
        offset={[0, 5]}>
        <div
          onClick={onGotoMessage}
          className="bg-[#f0f1f1] hover:bg-[#dbdbdb] rounded-full w-[30px] h-[30px] flex items-center justify-center hover:cursor-pointer">
          <ImageRound
            name="go"
            src={'/icons/go.svg'}
            className="w-[16px] h-[14px] hover:cursor-pointer"
          />
        </div>
      </Tippy>
      <Tippy
        content={'ブックマーク'}
        arrow={false}
        delay={1000}
        placement="top"
        offset={[0, 5]}>
        <div
          onClick={() => {
            bookMarkMsg();
          }}
          className="bg-[#f0f1f1] hover:bg-[#dbdbdb] rounded-full w-[30px] h-[30px] flex items-center justify-center hover:cursor-pointer">
          <ImageRound
            name="Save"
            src={`/icons/save-un-list.svg`}
            className="w-[10px] h-[12px] hover:cursor-pointer"
          />
        </div>
      </Tippy>
    </div>
  );
};
