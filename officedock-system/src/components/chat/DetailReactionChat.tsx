import React, { useContext, useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useMutation } from 'react-query';

import ImageRound from '@components/common/ImageRound';
import AvatarIconWithDynamicColor from '@components/common/AvatarIcon';
import { GlobalStateContext } from '@providers/GlobalStateProvider';
import { apiRouters } from '@constants/routers';
import { REACTION_LIST_SMALL } from '@constants';
import { ChatMessageResponse } from '@interfaces/chat';
import api from '@base/api';

type Props = {
  dataMsgDetail: ChatMessageResponse;
  handleReactionClick: (icon: string) => void;
  handleRemoveReactionClick: (icon: string) => void;
};

const DetailReactionChat = ({
  dataMsgDetail,
  handleReactionClick,
  handleRemoveReactionClick,
}: Props) => {
  const { dashboardMembersWithAvatars } = useContext(GlobalStateContext);

  const optionRef = useRef<HTMLDivElement | null>(null);

  const { data: session } = useSession();

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
      onError: () => {},
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
      onError: () => {},
      onSettled: () => {},
    },
  );
  return (
    <div className="mt-5 flex items-center gap-[6px]">
      <div className="flex items-center gap-[6px]">
        {reactionSummary.map((reaction) => {
          const iconSrc = getReactionSrc(reaction.icon);
          return (
            <div
              key={reaction.icon}
              onClick={() => {
                if (reaction.hasReacted) {
                  handleRemoveReactionClick(reaction.icon);

                  moveReactionIcon(reaction.icon);
                } else {
                  handleReactionClick(reaction.icon);

                  reactionIcon(reaction.icon);
                }
              }}
              className={`flex cursor-pointer gap-[6px] pl-2 pr-[11px] h-8 items-center bg-[#EBF1F7] rounded border border-[#D2DBE1] ${reaction.hasReacted && '!border-[#0068B6]'}`}>
              <ImageRound
                name={reaction.icon}
                src={iconSrc}
                className="w-fit h-fit hover:cursor-pointer hover:opacity-60"
              />
              <span className="text-[13px] font-medium text-[#77858F]">
                {reaction.count}
              </span>
            </div>
          );
        })}
      </div>
      <div>
        {reactionSummary.length > 0 && (
          <div
            onClick={() => setIsShowModalDetail(true)}
            className="h-8 w-8 relative flex items-center justify-center rounded-full bg-[#EBF1F7]">
            <ImageRound
              name={'user'}
              src="/icons/user-default.svg"
              className="w-fit h-fit hover:cursor-pointer hover:opacity-60"
            />
            {isShowModalDetail && (
              <div
                ref={optionRef}
                style={{
                  boxShadow: '0px 4px 8px 0px #0000000F',
                }}
                className="absolute top-0 left-0 min-w-[250px] w-fit h-[200px] rounded-lg bg-white p-[14px]">
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
                      const avatarColor =
                        dashboardMembersWithAvatars.find(
                          (member) => member.id == id,
                        )?.avatarColor || '';
                      const name =
                        dashboardMembersWithAvatars.find(
                          (member) => member.id == id,
                        )?.fullName || '';
                      return (
                        <div key={id} className="flex items-center gap-2">
                          <AvatarIconWithDynamicColor
                            color={avatarColor}
                            size={29}
                            customClassName="w-6 h-6"
                          />
                          <span className="text-sm font-medium text-black relative top-[-1px]">
                            {name}
                          </span>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DetailReactionChat;
