import React, { useContext, useState } from 'react';

import GroupIconWithDynamicColor from '@components/common/GroupIcon';
import ImageRound from '@components/common/ImageRound';
import CustomUserAvatar from '@components/common/AvatarIcon/CustomUserAvatar';

import { GlobalStateContext } from '@providers/GlobalStateProvider';
import { UserOrganization } from '@interfaces/user';

type DataGroupMemberProps = {
  item: UserOrganization;
  onClickMember: (
    id: string,
    avatarColor: string,
    organizationId: string,
    avatarUrl: string,
  ) => void;
};

const GroupMember = ({ item, onClickMember }: DataGroupMemberProps) => {
  const { expanded } = useContext(GlobalStateContext);

  const [isExpandedGroup, setIsExpandedGroup] = useState(true);

  return (
    <div>
      <div className="flex justify-between">
        <div className="flex items-start gap-[10px] w-fit">
          {item.icon ? (
            <CustomUserAvatar
              avatarUrl={item?.icon || ''}
              avatarColor={item?.iconColor || ''}
              size={30}
            />
          ) : (
              <GroupIconWithDynamicColor color={item.iconColor || '#228CDB'} />
          )}

          <p className="text-[18px] break-all line-clamp-3 max-w-[500px]">
            {item.name}
          </p>
          <span className="text-[#77858F] text-[13px] ml-[10px] mt-[2px]">
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
              onClick={() => {
                onClickMember(
                  String(user.id),
                  user.avatarColor,
                  String(item.id),
                  user.avatar,
                );
              }}
              className=" h-[76px] bg-white flex items-center gap-[10px]  p-5 justify-start cursor-pointer  rounded-lg">
              <CustomUserAvatar
                avatarUrl={user?.avatar || ''}
                avatarColor={user?.avatarColor || ''}
                size={36}
              />
              <p className="text-[18px] break-all line-clamp-2">
                {user.fullName}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default GroupMember;
