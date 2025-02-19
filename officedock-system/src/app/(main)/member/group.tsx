import React, { useContext, useState } from 'react';

import AvatarIconWithDynamicColor from '@components/common/AvatarIcon';
import GroupIconWithDynamicColor from '@components/common/GroupIcon';
import { GlobalStateContext } from '@providers/GlobalStateProvider';
import { UserOrganization } from '@interfaces/user';
import ImageRound from '@components/common/ImageRound';

type DataGroupMemberProps = {
  item: UserOrganization;
  color: string;
};

const GroupMember = ({ item, color }: DataGroupMemberProps) => {
  const { dashboardMembersWithAvatars, expanded } =
    useContext(GlobalStateContext);

  const [isExpandedGroup, setIsExpandedGroup] = useState(false);

  const renderBoxUser = (userId: string) => {
    const avatarColor =
      dashboardMembersWithAvatars.find((member) => member.id == userId)
        ?.avatarColor || '';

    return <AvatarIconWithDynamicColor color={avatarColor} size={36} />;
  };
  return (
    <div>
      <div className="flex justify-between">
        <div className="flex items-center gap-[10px] w-fit">
          <GroupIconWithDynamicColor color={color} />

          <p className="text-[18px]">{item.name}</p>
          <span className="text-[#77858F] text-[13px] ml-[10px]">
            メンバー{item.users.length}人
          </span>
        </div>
        <ImageRound
          onClick={() => setIsExpandedGroup(!isExpandedGroup)}
          src="/icons/extend-calendar.svg"
          name="Extend box"
          className={`!w-3.5 !h-3.5 min-w-2 ${isExpandedGroup ? '-rotate-90' : 'rotate-90'} `}
        />
      </div>
      {isExpandedGroup && (
        <div
          style={{
            marginTop: item.users.length > 0 ? '16px' : '0',
            width: expanded ? '1100px' : '1296px',
          }}
          className="grid grid-cols-4 gap-x-4 gap-y-[10px] ">
          {item.users.map((user) => (
            <div
              key={user.id}
              style={{
                boxShadow: '0px 2px 8px 0px #0000001A',
                width: expanded ? '265px' : '316px',
              }}
              className=" h-[76px] bg-white flex items-center gap-[10px]  p-5 justify-start  rounded-lg">
              {renderBoxUser(`${user.id}`)}
              <p className="text-[18px]">{user.fullName}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default GroupMember;
