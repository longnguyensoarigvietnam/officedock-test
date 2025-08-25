'use client';

import { useContext } from 'react';

import CustomUserAvatar from '@components/common/AvatarIcon/CustomUserAvatar';
import ImageRound from '@components/common/ImageRound';

import { GlobalStateContext } from '@providers/GlobalStateProvider';
import { useSessionCache } from '@providers/SessionCacheProvider';

export const EnvelopeContent = ({
  userInfo,
  content,
  isSendThanksMessage,
}: {
  userInfo: {
    id: number;
    fullName: string;
    avatarColor: string;
    avatar: string | null;
  };
  content: string;
  isSendThanksMessage?: boolean;
}) => {
  const { dashboardMembersWithAvatars } = useContext(GlobalStateContext);
  const { data: session } = useSessionCache();

  // Render user's avatar
  const renderUserAvatar = (userId: number) => {
    const memberInfo = dashboardMembersWithAvatars.find(
      (member) => member.id == userId,
    );

    return (
      <CustomUserAvatar
        avatarUrl={memberInfo?.avatar || ''}
        avatarColor={memberInfo?.avatarColor || ''}
        size={24}
      />
    );
  };

  return (
    <div className="w-[500px] h-[282px] bg-white rounded-[20px] pt-[50px] pb-[10px] px-[60px] text-sm space-y-5">
      <div className="flex items-center gap-3 justify-center">
        <ImageRound
          name="Heart icon"
          src={'/icons/blue-heart.svg'}
          className={`w-[24px] h-[22px]`}
        />

        <p className="font-medium text-[22px]">サンクスメッセージ</p>
      </div>
      <p>
        <div className="flex items-center justify-center gap-2 w-full">
          {isSendThanksMessage ? (
            renderUserAvatar(session?.user.id as number)
          ) : (
            <CustomUserAvatar
              avatarUrl={userInfo?.avatar || ''}
              avatarColor={userInfo?.avatarColor || ''}
              size={24}
            />
          )}

          <p className="text-black text-sm font-medium max-w-[calc(100%_-_40px)] break-all line-clamp-3">
            {isSendThanksMessage
              ? session?.user.profile.fullName
              : userInfo.fullName}
            <span className="text-xs text-[#77858F] font-medium ml-1">
              さんからサンクスメッセージが届きました！
            </span>
          </p>
        </div>
      </p>
      <p className="overflow-y-auto max-h-[96px] break-all max-w-full text-sm">
        {content}
      </p>
    </div>
  );
};
