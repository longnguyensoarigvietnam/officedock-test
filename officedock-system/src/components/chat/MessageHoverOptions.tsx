'use client';
import { useSessionCache } from '@providers/SessionCacheProvider';

import { useMutation } from 'react-query';
import { useEffect, useRef, useState } from 'react';

import ImageRound from '@components/common/ImageRound';
import { DynamicTooltip } from '@components/tooltip/DynamicTooltip';

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
  handleUpdateBookmark: (dataUuid: string) => void;
  handleReactionClick: (icon: string) => void;
  handleRemoveReactionClick: (icon: string) => void;
  handleReplyMsg: ({
    user,
    replyId,
  }: {
    user: {
      id: number;
      name: string;
    };
    replyId: string;
  }) => void;
  handleQuoteMsgIcon: (data: {
    data: ChatMessageResponse;
    title: string;
  }) => void;
}

export const MessageHoverOptions = ({
  messageDetail,
  chatRoomDetail,
  handleUpdateBookmark,
  handleReactionClick,
  handleRemoveReactionClick,
  handleOpenEditForm,
  handleOpenDeleteMsgModal,
  handleReplyMsg,
  handleQuoteMsgIcon,
}: MessageHoverOptionsProps) => {
  const optionRef = useRef<HTMLDivElement | null>(null);
  const { data: session } = useSessionCache();
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
        handleUpdateBookmark(messageDetail.uuid);
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
      onSettled: () => {
        setShowReaction(false);
      },
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
      onSettled: () => {
        setShowReaction(false);
      },
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
      className={`bg-white ${isShowReaction ? '!flex' : ''}   group-hover:flex hidden rounded-[100px] p-[6px] absolute left-1/2 -bottom-[22px] transform -translate-x-1/2 items-center gap-[6px]`}
      style={{ boxShadow: '0px 4px 8px 0px #0000000F' }}>
      {(chatRoomDetail?.type === ChatRoomType.PRIVATE ||
        chatRoomDetail?.type === ChatRoomType.GROUP ||
        chatRoomDetail?.type === ChatRoomType.SELF) && (
        <>
          <div className="relative">
            <DynamicTooltip content={'返信'} placement="top">
              <div
                onClick={() => {
                  handleReplyMsg({
                    user: {
                      id: messageDetail.sender.id,
                      name: messageDetail.sender.fullName,
                    },
                    replyId: String(messageDetail.id) || '',
                  });
                }}
                className="bg-[#EBF1F7] hover:opacity-90 rounded-full w-[30px] h-[30px] flex items-center justify-center hover:cursor-pointer">
                <ImageRound
                  name="Reply"
                  src={'/icons/reply.svg'}
                  className="w-[14px] h-[12px] hover:cursor-pointer"
                />
              </div>
            </DynamicTooltip>
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
                    dataReactionMsg.some(
                      (item) => item.icon === `${icon.value}`,
                    );
                  const existsForMe =
                    dataReactionMsg &&
                    session?.user.id &&
                    dataReactionMsg.some(
                      (item) =>
                        item.icon === `${icon.value}` &&
                        item.users.includes(session?.user.id as number),
                    );
                  return (
                    <div
                      onClick={(e) => {
                        e.stopPropagation();

                        if (exists) {
                          handleRemoveReactionClick(`${icon.value}`);
                          setShowReaction(false);
                          moveReactionIcon(`${icon.value}`);
                        } else {
                          handleReactionClick(`${icon.value}`);
                          setShowReaction(false);

                          reactionIcon(`${icon.value}`);
                        }
                      }}
                      key={icon.name}
                      className={`p-[6px] rounded-full ${existsForMe && 'bg-gray-200'}`}>
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
          <DynamicTooltip content={'リアクション'} placement="top">
            <div
              onClick={(e) => {
                e.stopPropagation();
                setShowReaction(!isShowReaction);
              }}
              className="bg-[#EBF1F7] hover:opacity-90 rounded-full w-[30px] h-[30px] flex items-center justify-center hover:cursor-pointer">
              <ImageRound
                name="Reaction"
                src={'/icons/reaction.svg'}
                className="w-[15px] h-[15px] hover:cursor-pointer"
              />
            </div>
          </DynamicTooltip>

          <DynamicTooltip content={'引用'} placement="top">
            <div
              onClick={() => {
                handleQuoteMsgIcon({
                  data: messageDetail,
                  title: '',
                });
              }}
              className="bg-[#EBF1F7] hover:opacity-90 rounded-full w-[30px] h-[30px] flex items-center justify-center hover:cursor-pointer">
              <ImageRound
                name="Quotation"
                src={'/icons/quotation.svg'}
                className="w-[14px] h-[10px] hover:cursor-pointer"
              />
            </div>
          </DynamicTooltip>
        </>
      )}

      <DynamicTooltip
        content={isBookmark ? 'ブックマークを外す' : 'ブックマーク'}
        placement="top">
        <div
          onClick={(e) => {
            e.stopPropagation();
            bookMarkMsg();
          }}
          className="bg-[#EBF1F7] hover:opacity-90 rounded-full w-[30px] h-[30px] flex items-center justify-center hover:cursor-pointer">
          <ImageRound
            name="Save"
            src={`/icons/${isBookmark ? 'save-active.svg' : 'save.svg'}`}
            className="w-[10px] h-[12px] hover:cursor-pointer"
          />
        </div>
      </DynamicTooltip>

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
                <DynamicTooltip content={'編集'} placement="top">
                  <div
                    className="bg-[#EBF1F7] hover:opacity-90 rounded-full w-[30px] h-[30px] flex items-center justify-center hover:cursor-pointer"
                    onClick={() => handleOpenEditForm(messageDetail.uuid)}>
                    <ImageRound
                      name="Edit"
                      src={'/icons/edit-chat.svg'}
                      className="w-[13px] h-[13px] hover:cursor-pointer"
                    />
                  </div>
                </DynamicTooltip>
              )}
            {session?.user.permissions &&
              hasPermissionInArray(
                session?.user.permissions,
                PermissionsSystem.CHAT_DELETE,
              ) && (
                <DynamicTooltip content={'削除'} placement="top">
                  <div
                    className="bg-[#EBF1F7] hover:opacity-90 rounded-full w-[30px] h-[30px] flex items-center justify-center hover:cursor-pointer"
                    onClick={() => {
                      handleOpenDeleteMsgModal(messageDetail.uuid);
                    }}>
                    <ImageRound
                      name="Delete"
                      src={'/icons/delete-chat.svg'}
                      className="w-[14px] h-[14px] hover:cursor-pointer"
                    />
                  </div>
                </DynamicTooltip>
              )}
          </>
        )}
    </div>
  );
};
