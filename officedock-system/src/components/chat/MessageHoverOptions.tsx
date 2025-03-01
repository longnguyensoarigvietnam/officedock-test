'use client';
import { useSession } from 'next-auth/react';
import Tippy from '@tippyjs/react';
import { useMutation } from 'react-query';
import { useEffect, useRef, useState } from 'react';
import 'tippy.js/dist/tippy.css';

import ImageRound from '@components/common/ImageRound';

import { ChatRoomType, MessageType, PermissionsSystem } from '@constants/enums';
import { apiRouters } from '@constants/routers';
import { REACTION_LIST } from '@constants';
import { ChatMessageResponse, ChatRoomDetail } from '@interfaces/chat';
import { hasPermissionInArray } from '@utils';
import api from '@base/api';

interface MessageHoverOptionsProps {
  messageDetail: ChatMessageResponse;
  chatRoomDetail: ChatRoomDetail;
  handleOpenEditForm: (id: string) => void;
  handleOpenDeleteMsgModal: (id: string) => void;
  setDataMessageDetail: ({
    uuid,
    isBookmark,
  }: {
    uuid: string;
    isBookmark: boolean;
  }) => void;
  handleReactionClick: (icon: string) => void;
  handleRemoveReactionClick: (icon: string) => void;
}

export const MessageHoverOptions = ({
  messageDetail,
  chatRoomDetail,
  handleReactionClick,
  handleRemoveReactionClick,
  handleOpenEditForm,
  handleOpenDeleteMsgModal,
}: MessageHoverOptionsProps) => {
  const optionRef = useRef<HTMLDivElement | null>(null);
  const { data: session } = useSession();
  const [isShowReaction, setShowReaction] = useState(false);

  const [isBookmark, setIsBookmark] = useState(messageDetail.isBookmark);

  const [dataReactionMsg, setDataReactionMsg] = useState<
    {
      icon: string;
      users: number[];
    }[]
  >([]);

  useEffect(() => {
    if (messageDetail && messageDetail.reactions) {
      setDataReactionMsg(messageDetail.reactions);
    }
  }, [messageDetail]);

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

  // Handle reaction icon
  const handleReactionIcon = async (icon: string) => {
    const { data: response } = await api.post(
      apiRouters.REACTION_MESSAGE(`${messageDetail.uuid}`),
      {
        icon,
      },
    );
    return response;
  };

  const { mutate: reactionIcon } = useMutation(
    'reactionIconMsg',
    handleReactionIcon,
    {
      onSuccess: async () => {},
      onError: () => {},
      onSettled: () => {},
    },
  );

  // Handle reaction icon
  const handleMoveReactionIcon = async (icon: string) => {
    const { data: response } = await api.post(
      apiRouters.REACTION_MESSAGE(`${messageDetail.uuid}`),
      {
        icon,
      },
    );
    return response;
  };

  const { mutate: moveReactionIcon } = useMutation(
    'moveReactionIcon',
    handleMoveReactionIcon,
    {
      onSuccess: async () => {},
      onError: () => {},
      onSettled: () => {},
    },
  );

  useEffect(() => {
    const handleClickOutside = (event: any) => {
      if (optionRef.current && !optionRef.current.contains(event.target)) {
        setShowReaction(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div
      ref={optionRef}
      className={`bg-white ${isShowReaction ? '!flex' : ''}   group-hover:flex hidden rounded-3xl px-3 py-1.5 shadow-md absolute left-[70%] transform -translate-x-1/2 items-center gap-2`}>
      <div className="relative">
        <Tippy
          content={'返信'}
          arrow={false}
          delay={1000}
          placement="top"
          offset={[0, 5]}>
          <div className="bg-[#f0f1f1] relative  hover:bg-[#dbdbdb] rounded-full p-[7px] hover:cursor-pointer">
            <ImageRound
              name="Reply"
              src={'/icons/reply.svg'}
              className="w-[17px] h-[15px] hover:cursor-pointer"
            />
          </div>
        </Tippy>
        {isShowReaction && (
          <div
            style={{
              boxShadow: '0px 4px 8px 0px #0000000F',
            }}
            className="w-[190px] h-[44px] absolute rounded-lg top-[-54px] bg-white flex items-center gap-1 justify-center left-[-24px]">
            {REACTION_LIST.map((icon) => {
              // Check Icon
              const exists =
                dataReactionMsg &&
                dataReactionMsg.some((item) => item.icon === `${icon.value}`);
              return (
                <div
                  onClick={(e) => {
                    e.stopPropagation();

                    if (exists) {
                      handleRemoveReactionClick(`${icon.value}`);
                      moveReactionIcon(`${icon.value}`);
                    } else {
                      handleReactionClick(`${icon.value}`);
                      reactionIcon(`${icon.value}`);
                    }
                  }}
                  key={icon.name}
                  className={`p-[6px] rounded-full ${exists && 'bg-gray-200'}`}>
                  <ImageRound
                    name={icon.name}
                    src={icon.src}
                    className="w-fit h-fit hover:cursor-pointer hover:opacity-60"
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
      <Tippy
        content={'リアクション'}
        arrow={false}
        delay={1000}
        placement="top"
        offset={[0, 5]}>
        <div
          onClick={(e) => {
            e.stopPropagation();
            setShowReaction(!isShowReaction);
          }}
          className="bg-[#f0f1f1] hover:bg-[#dbdbdb] rounded-full p-[7px] hover:cursor-pointer">
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
        content={isBookmark ? 'ブックマークを外す' : 'ブックマーク'}
        arrow={false}
        delay={1000}
        placement="top"
        offset={[0, 5]}>
        <div
          onClick={(e) => {
            e.stopPropagation();
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
