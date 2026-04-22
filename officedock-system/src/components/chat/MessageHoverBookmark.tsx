'use client';
import { AxiosError } from 'axios';
import { useMutation } from 'react-query';

import ImageRound from '@components/common/ImageRound';
import { DynamicTooltip } from '@components/tooltip/DynamicTooltip';

import api from '@base/api';
import { apiRouters } from '@constants/routers';
import { useErrorToast } from '@hooks/useErrorToast';
import { ERROR_COMMON_MESSAGE } from '@constants/message';

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
  const showErrorToast = useErrorToast();

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
      onError: (error: AxiosError) => {
        showErrorToast(error, ERROR_COMMON_MESSAGE);
      },
      onSettled: () => {},
    },
  );

  return (
    <div
      className={`bg-white group-hover:flex hidden rounded-[100px] p-[6px] absolute left-1/2 -bottom-[22px] transform -translate-x-1/2 items-center gap-[6px]`}
      style={{ boxShadow: '0px 4px 8px 0px #0000000F' }}>
      <DynamicTooltip content={'メッセージに移動'} placement="top">
        <div
          onClick={onGotoMessage}
          className="bg-[#EBF1F7] hover:opacity-90 rounded-full w-[30px] h-[30px] flex items-center justify-center hover:cursor-pointer">
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
          className="bg-[#EBF1F7] hover:opacity-90 rounded-full w-[30px] h-[30px] flex items-center justify-center hover:cursor-pointer">
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
