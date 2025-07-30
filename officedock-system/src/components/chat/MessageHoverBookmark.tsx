'use client';
import { useMutation } from 'react-query';

import ImageRound from '@components/common/ImageRound';
import { DynamicTooltip } from '@components/tooltip/DynamicTooltip';

import api from '@base/api';
import { apiRouters } from '@constants/routers';

interface MessageHoverOptionsProps {
  uuid: string;
  onGotoMessage: () => void;
  handleRemoveItemBookmark: ((uuid: string) => void) | undefined;
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
        handleRemoveItemBookmark && handleRemoveItemBookmark(uuid);
      },
      onError: () => {},
      onSettled: () => {},
    },
  );

  return (
    <div
      className={`bg-white group-hover:flex hidden rounded-3xl px-3 py-1.5 shadow-md absolute left-1/2 transform -translate-x-1/2 items-center gap-2`}>
      <DynamicTooltip content={'メッセージに移動'} placement="top">
        <div
          onClick={onGotoMessage}
          className="bg-[#f0f1f1] hover:bg-[#dbdbdb] rounded-full w-[30px] h-[30px] flex items-center justify-center hover:cursor-pointer">
          <ImageRound
            name="go"
            src={'/icons/go.svg'}
            className="w-[16px] h-[14px] hover:cursor-pointer"
          />
        </div>
      </DynamicTooltip>
      <DynamicTooltip content={'ブックマークを外す'} placement="top">
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
      </DynamicTooltip>
    </div>
  );
};
