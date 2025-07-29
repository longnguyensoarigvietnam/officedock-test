import React from 'react';

import CustomUserAvatar from '@components/common/AvatarIcon/CustomUserAvatar';
import { ChatRoomDetail } from '@interfaces/chat';

type Props = {
  chatRoomDetail: ChatRoomDetail | undefined;
};

const TabParticipantsChat = ({ chatRoomDetail }: Props) => {
  return (
    <div className="overflow-y-auto max-h-[calc(100vh_-_286px)] ">
      <p className="text-xs text-[#77858F] font-medium mb-2">
        メンバー{chatRoomDetail?.participants.length}人
      </p>
      {chatRoomDetail?.participants.map((people) => {
        return (
          <div
            key={people.id}
            className="flex items-center border-b py-[10px] border-[#CED8DE] ">
            <CustomUserAvatar
              avatarUrl={people.avatar || ''}
              avatarColor={people.avatarColor || ''}
              size={36}
            />
            <div className="ml-[10px] max-w-[100px] truncate">
              {people.fullName}
            </div>
            <div className="ml-[6px] mt-[3px] text-xs text-[#77858F] font-medium">
              {people.organizations?.name}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default TabParticipantsChat;
