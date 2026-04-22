import React from 'react';

import CustomUserAvatar from '@components/common/AvatarIcon/CustomUserAvatar';
import { ThanksListResultItem } from '@interfaces/thank';

type Props = {
  item: ThanksListResultItem;
  onUserClick: (id: {
    avatar: string;
    avatarColor: string;
    fullName: string;
    id: number;
    orgName: string;
  }) => void;
};

const GroupMemberThank = ({ item, onUserClick }: Props) => {
  return (
    <div
      style={{
        boxShadow: '0px 4px 10px 0px #0000000D',
      }}
      className="p-[30px] rounded-[30px] bg-[#F8FAFC] w-full h-fit">
      <p className="text-base max-w-full break-all font-medium text-[#77858F] line-clamp-3 mb-[30px]">
        {item.name}
      </p>
      <div className="grid grid-cols-4 gap-[10px]">
        {item.users.map((user) => {
          return (
            <div
              key={user.id}
              onClick={() =>
                onUserClick({
                  ...user,
                  orgName: item.name,
                })
              }
              className="flex items-center gap-[10px] p-5 cursor-pointer shadow-common bg-white rounded-[14px]">
              <CustomUserAvatar
                avatarUrl={user?.avatar || ''}
                avatarColor={user?.avatarColor || ''}
                size={33}
              />
              <span className="text-black break-all line-clamp-2 ">
                {user.fullName}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default GroupMemberThank;
