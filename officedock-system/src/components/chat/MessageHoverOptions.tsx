'use client';
import { useSession } from 'next-auth/react';
import Tippy from '@tippyjs/react';
import 'tippy.js/dist/tippy.css';

import ImageRound from '@components/common/ImageRound';

import { ChatRoomType, MessageType, PermissionsSystem } from '@constants/enums';
import { ChatMessageResponse, ChatRoomDetail } from '@interfaces/chat';
import { hasPermissionInArray } from '@utils';
import { useEffect, useState } from 'react';
import api from '@base/api';
import { apiRouters } from '@constants/routers';
import { useMutation } from 'react-query';

interface MessageHoverOptionsProps {
  messageDetail: ChatMessageResponse;
  chatRoomDetail: ChatRoomDetail;
  handleOpenEditForm: (id: string) => void;
  handleOpenDeleteMsgModal: (id: string) => void;
  setDataMessageDetail: ({
    uuid,
    isBookMark,
  }: {
    uuid: string;
    isBookMark: boolean;
  }) => void;
}

export const MessageHoverOptions = ({
  messageDetail,
  chatRoomDetail,
  handleOpenEditForm,
  handleOpenDeleteMsgModal,
}: MessageHoverOptionsProps) => {
  const { data: session } = useSession();

  const [isBookmark, setIsBookmark] = useState(messageDetail.isBookmark);
  useEffect(() => {
    if (messageDetail) {
      setIsBookmark(messageDetail.isBookmark);
    }
  }, [messageDetail]);

  // Handle bookmark msg
  const handleBookMarkMsg = async () => {
    const { data: response } = await api.post(
      apiRouters.BOOKMARK_MESSAGE(`${messageDetail.uuid}`),
      {
        bookmarkAt: isBookmark ? null : new Date(),
      },
    );
    return response;
  };

  const { mutate: bookMarkMsg } = useMutation(
    'bookMarkMsg',
    handleBookMarkMsg,
    {
      onSuccess: async () => {
        setIsBookmark(!isBookmark);
      },
      onError: () => {},
      onSettled: () => {},
    },
  );

  return (
    <div
      className={`bg-white group-hover:flex hidden rounded-3xl px-3 py-1.5 shadow-md absolute left-1/2 transform -translate-x-1/2 items-center gap-2`}>
      <Tippy
        content={'返信'}
        arrow={false}
        delay={1000}
        placement="top"
        offset={[0, 5]}>
        <div className="bg-[#f0f1f1] hover:bg-[#dbdbdb] rounded-full p-[7px] hover:cursor-pointer">
          <ImageRound
            name="Reply"
            src={'/icons/reply.svg'}
            className="w-[17px] h-[15px] hover:cursor-pointer"
          />
        </div>
      </Tippy>
      <Tippy
        content={'リアクション'}
        arrow={false}
        delay={1000}
        placement="top"
        offset={[0, 5]}>
        <div className="bg-[#f0f1f1] hover:bg-[#dbdbdb] rounded-full p-[7px] hover:cursor-pointer">
          <ImageRound
            name="Reaction"
            src={'/icons/reaction.svg'}
            className="w-[15px] h-[15px] hover:cursor-pointer"
          />
        </div>
      </Tippy>

      <Tippy
        content={'引用'}
        arrow={false}
        delay={1000}
        placement="top"
        offset={[0, 5]}>
        <div className="bg-[#f0f1f1] hover:bg-[#dbdbdb] rounded-full px-[7px] py-[9px] hover:cursor-pointer">
          <ImageRound
            name="Quotation"
            src={'/icons/quotation.svg'}
            className="w-[15px] h-[10px] hover:cursor-pointer"
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
          className="bg-[#f0f1f1] hover:bg-[#dbdbdb] rounded-full px-[8px] py-[7px] hover:cursor-pointer">
          <ImageRound
            name="Save"
            src={`/icons/${isBookmark ? 'save-active.svg' : 'save.svg'}`}
            className="w-[12px] h-[14px] hover:cursor-pointer"
          />
        </div>
      </Tippy>

      {(chatRoomDetail?.type === ChatRoomType.PRIVATE ||
        chatRoomDetail?.type === ChatRoomType.GROUP ||
        chatRoomDetail?.type === ChatRoomType.SELF) &&
        Number(session?.user.id) === Number(messageDetail.sender.id) &&
        !messageDetail.deletedAt &&
        session?.user.permissions &&
        ((messageDetail.type == MessageType.MESSAGE &&
          hasPermissionInArray(
            session?.user.permissions,
            PermissionsSystem.CHAT_UPDATE,
          )) ||
          hasPermissionInArray(
            session?.user.permissions,
            PermissionsSystem.CHAT_DELETE,
          )) && (
          <>
            {messageDetail.type == MessageType.MESSAGE &&
              session?.user.permissions &&
              hasPermissionInArray(
                session?.user.permissions,
                PermissionsSystem.CHAT_UPDATE,
              ) && (
                <Tippy
                  content={'編集'}
                  arrow={false}
                  delay={1000}
                  placement="top"
                  offset={[0, 5]}>
                  <div
                    className="bg-[#f0f1f1] hover:bg-[#dbdbdb] rounded-full p-[7px] hover:cursor-pointer"
                    onClick={() => handleOpenEditForm(messageDetail.uuid)}>
                    <ImageRound
                      name="Edit"
                      src={'/icons/edit-chat.svg'}
                      className="w-[14px] h-[14px] hover:cursor-pointer"
                    />
                  </div>
                </Tippy>
              )}
            {session?.user.permissions &&
              hasPermissionInArray(
                session?.user.permissions,
                PermissionsSystem.CHAT_DELETE,
              ) && (
                <Tippy
                  content={'削除'}
                  arrow={false}
                  delay={1000}
                  placement="top"
                  offset={[0, 5]}>
                  <div
                    className="bg-[#f0f1f1] hover:bg-[#dbdbdb] rounded-full p-[7px] hover:cursor-pointer"
                    onClick={() => {
                      handleOpenDeleteMsgModal(messageDetail.uuid);
                    }}>
                    <ImageRound
                      name="Delete"
                      src={'/icons/delete-chat.svg'}
                      className="w-[15px] h-[15px] hover:cursor-pointer"
                    />
                  </div>
                </Tippy>
              )}
          </>
        )}
    </div>
  );
};
