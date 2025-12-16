import React, {
  MutableRefObject,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { AxiosError } from 'axios';
import { useSessionCache } from '@providers/SessionCacheProvider';

import { useMutation } from 'react-query';
import { createPortal } from 'react-dom';

import ImageRound from '@components/common/ImageRound';
import CustomUserAvatar from '@components/common/AvatarIcon/CustomUserAvatar';
import { DynamicTooltip } from '@components/tooltip/DynamicTooltip';

import { apiRouters } from '@constants/routers';
import { REACTION_LIST_SMALL } from '@constants';
import { ERROR_COMMON_MESSAGE } from '@constants/message';
import { useErrorToast } from '@hooks/useErrorToast';

import { ChatMessageResponse } from '@interfaces/chat';

import api from '@base/api';
import { ChatContext } from '@providers/ChatProvider';

type Props = {
  dataMsgDetail: ChatMessageResponse;
  handleReactionClick: (icon: string) => void;
  handleRemoveReactionClick: (icon: string) => void;
  chatContainerRef: MutableRefObject<HTMLDivElement | null>;
};

const DetailReactionChat = ({
  dataMsgDetail,
  chatContainerRef,
  handleReactionClick,
  handleRemoveReactionClick,
}: Props) => {
  const { listAllMember } = useContext(ChatContext);

  const optionRef = useRef<HTMLDivElement | null>(null);

  const { data: session } = useSessionCache();
  const showErrorToast = useErrorToast();

  const [isShowModalDetail, setIsShowModalDetail] = useState(false);

  const reactionSummary =
    dataMsgDetail?.reactions?.map((reaction) => ({
      icon: reaction.icon,
      count: reaction.users.length,
      users: reaction.users,
      hasReacted: reaction.users.includes(session?.user.id as number),
    })) || [];

  const [selectedIcon, setSelectedIcon] = useState(
    reactionSummary[0]?.icon || '',
  );
  useEffect(() => {
    if (reactionSummary) {
      setSelectedIcon(reactionSummary[0]?.icon);
    }
  }, [isShowModalDetail]);

  const selectedUsers =
    reactionSummary.find((reaction) => reaction.icon === selectedIcon)?.users ||
    [];

  const getReactionSrc = (value: string) => {
    return (
      REACTION_LIST_SMALL.find((icon) => `${icon.value}` === value)?.src || ''
    );
  };

  useEffect(() => {
    const handleClickOutside = (event: any) => {
      if (optionRef.current && !optionRef.current.contains(event.target)) {
        setIsShowModalDetail(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Handle reaction icon
  const handleReactionIcon = async (icon: string) => {
    const { data: response } = await api.post(
      apiRouters.REACTION_MESSAGE(`${dataMsgDetail.uuid}`),
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
      onError: (error: AxiosError) => {
        showErrorToast(error, ERROR_COMMON_MESSAGE);
      },
      onSettled: () => {},
    },
  );

  // Handle reaction icon
  const handleMoveReactionIcon = async (icon: string) => {
    const { data: response } = await api.post(
      apiRouters.REACTION_MESSAGE(`${dataMsgDetail.uuid}`),
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
      onError: (error: AxiosError) => {
        showErrorToast(error, ERROR_COMMON_MESSAGE);
      },
      onSettled: () => {},
    },
  );

  const [modalPosition, setModalPosition] = useState({ top: 0, left: 0 });
  const imageRef = useRef<HTMLDivElement | null>(null);

  const handleShowModal = () => {
    if (imageRef.current) {
      const rect = imageRef.current.getBoundingClientRect();
      setModalPosition({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
      });
      setIsShowModalDetail(true);
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      setIsShowModalDetail(false);
    };

    if (isShowModalDetail && chatContainerRef.current) {
      chatContainerRef.current.addEventListener('scroll', handleScroll);
    }

    return () => {
      if (chatContainerRef.current) {
        chatContainerRef.current.removeEventListener('scroll', handleScroll);
      }
    };
  }, [isShowModalDetail]);

  return (
    <div className="mt-5 flex items-center gap-[6px]">
      <div className="flex items-center gap-[6px]">
        {reactionSummary.map((reaction) => {
          const iconSrc = getReactionSrc(reaction.icon);
          return (
            <DynamicTooltip
              content={
                reaction.hasReacted
                  ? 'リアクションを外す'
                  : '同じリアクションをする'
              }
              key={reaction.icon}
              placement="top">
              <div
                onClick={() => {
                  if (reaction.hasReacted) {
                    handleRemoveReactionClick(reaction.icon);

                    moveReactionIcon(reaction.icon);
                  } else {
                    handleReactionClick(reaction.icon);

                    reactionIcon(reaction.icon);
                  }
                }}
                className={`flex cursor-pointer gap-[6px] pl-2 pr-[11px] h-8 items-center bg-white rounded border border-[#D2DBE1] ${reaction.hasReacted && '!border-[#0068B6] !bg-[#EBF1F7]'}`}>
                <ImageRound
                  name={reaction.icon}
                  src={iconSrc}
                  className="w-fit h-fit hover:cursor-pointer hover:opacity-60"
                />
                <span className="text-[13px] font-medium text-[#77858F]">
                  {reaction.count}
                </span>
              </div>
            </DynamicTooltip>
          );
        })}
      </div>
      <div>
        {reactionSummary.length > 0 && (
          <div
            ref={imageRef}
            onClick={handleShowModal}
            className="h-8 w-8 relative flex items-center justify-center rounded-full  hover:bg-[#EBF1F7]">
            <DynamicTooltip
              content={'リアクションしている人を確認'}
              placement="top"
              customOffset={{ top: -8 }}>
              <ImageRound
                name={'user'}
                src="/icons/user-default.svg"
                className="w-fit h-fit hover:cursor-pointer hover:opacity-60"
              />
            </DynamicTooltip>

            {isShowModalDetail &&
              createPortal(
                <div
                  ref={optionRef}
                  style={{
                    boxShadow: '0px 4px 8px 0px #0000000F',
                    position: 'absolute',
                    top: `${modalPosition.top}px`,
                    left: `${modalPosition.left}px`,
                    zIndex: 9999,
                  }}
                  className="absolute top-0 left-10 min-w-[250px] w-fit h-[200px] rounded-lg bg-white p-[14px]">
                  <div className="flex gap-[6px] items-center">
                    {reactionSummary.map((reaction) => {
                      const iconSrc = REACTION_LIST_SMALL.find(
                        (icon) => `${icon.value}` === reaction.icon,
                      )?.src;
                      return (
                        <div
                          key={reaction.icon}
                          className={`${selectedIcon === reaction.icon ? 'bg-[#EBF1F7]' : 'bg-white'} h-8 min-w-[48px] px-2 flex items-center justify-center gap-[6px] rounded`}
                          onClick={() => setSelectedIcon(reaction.icon)}>
                          {iconSrc && (
                            <ImageRound
                              name={reaction.icon}
                              src={iconSrc}
                              className="w-fit h-fit hover:cursor-pointer hover:opacity-60"
                            />
                          )}
                          <span className="text-[13px] font-medium text-[#77858F]">
                            {reaction.count}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-[14px] flex flex-col overflow-y-auto h-[130px] gap-[10px]">
                    {selectedUsers.length > 0 &&
                      selectedUsers.map((id) => {
                        const memberInfo = listAllMember.find(
                          (member) => member.id == id,
                        );

                        const name =
                          listAllMember.find((member) => member.id == id)
                            ?.fullName || '';
                        return (
                          <div key={id} className="flex items-center gap-2">
                            <CustomUserAvatar
                              avatarUrl={memberInfo?.avatar || ''}
                              avatarColor={memberInfo?.avatarColor || ''}
                              size={29}
                            />
                            <span className="text-sm font-medium text-black relative top-[-1px] max-w-[170px] break-all line-clamp-3">
                              {name}
                            </span>
                          </div>
                        );
                      })}
                  </div>
                </div>,
                document.body,
              )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DetailReactionChat;
