import CustomUserAvatar from '@components/common/AvatarIcon/CustomUserAvatar';
import ImageRound from '@components/common/ImageRound';

export const EnvelopeContent = ({
  userInfo,
  content,
}: {
  userInfo: {
    id: number;
    fullName: string;
    avatarColor: string;
    avatar: string | null;
  };
  content: string;
}) => {
  return (
    <div className="w-[500px] h-[250px] bg-white rounded-[20px] pt-[50px] pb-[30px] px-[60px] text-sm space-y-5">
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
          <CustomUserAvatar
            avatarUrl={userInfo?.avatar || ''}
            avatarColor={userInfo?.avatarColor || ''}
            size={24}
          />
          <p className="text-black text-[15px] font-medium max-w-[calc(100%_-_40px)] break-all line-clamp-2">
            {userInfo.fullName}
            <span className="text-xs text-[#77858F] font-medium ml-1">さんからサンクスメッセージが届きました！</span>
          </p>
        </div>
      </p>
      <p className="overflow-y-auto max-h-[60px] break-all max-w-full text-sm">
        {content}
      </p>
    </div>
  );
};
