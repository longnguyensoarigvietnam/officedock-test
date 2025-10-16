import Image from 'next/image';

import CustomUserAvatar from '@components/common/AvatarIcon/CustomUserAvatar';

import { showSkillMapImageByTime } from '@utils';

import { SkillMapInfo } from '@interfaces/skills';
import ImageRound from '@components/common/ImageRound';

export const SkillMapBanner = ({
  skillMapInfo,
  hasNavigateOtherSkillMap = false,
  handleNavigateUser,
}: {
  skillMapInfo: SkillMapInfo | undefined;
  hasNavigateOtherSkillMap?: boolean;
  handleNavigateUser?: (userId: number | undefined) => void;
}) => {
  return (
    <div className="w-full h-[210px] relative mb-5">
      <Image
        alt="Map"
        src={showSkillMapImageByTime()}
        fill
        style={{ height: '100%', width: '100%' }}
        className=" rounded-[14px]"
      />

      <div className="absolute w-full h-full top-0 left-0 flex items-center justify-between gap-5 px-[50px] text-white">
        <div className="h-full flex gap-5 items-center w-[395px]">
          <CustomUserAvatar
            avatarUrl={skillMapInfo?.user?.avatar || ''}
            avatarColor={skillMapInfo?.user?.avatarColor || ''}
            size={70}
          />
          <div className="flex flex-col items-start justify-center">
            <p className="text-sm font-medium max-w-full break-all line-clamp-2">
              {skillMapInfo?.user?.organizations?.name || ''}
            </p>
            <p className="font-medium text-[26px] max-w-[300px] break-all line-clamp-2">
              {skillMapInfo?.user.fullName}
            </p>
          </div>
        </div>
        <div className="text-xs font-medium w-fit flex-grow flex-shrink-0">
          <div className="bg-[#FFFFFF40] w-full h-[104px] rounded-[10px] px-[30px] py-[25px] flex flex-col gap-2">
            <div className="flex items-center gap-[10px] font-medium text-base">
              <Image
                src="/icons/completed.svg"
                width={12}
                height={12}
                alt="completed-icon"
              />
              <p>直近1ヶ月で大カテゴリーAのタスクを60時間行いました</p>
            </div>
            <div className="flex items-center gap-[10px] font-medium text-base">
              <Image
                src="/icons/completed.svg"
                width={12}
                height={12}
                alt="completed-icon"
              />
              <p>企画提案力のレベルアップが近づいています！</p>
            </div>
          </div>
        </div>
      </div>

      {hasNavigateOtherSkillMap ? (
        <>
          <div
            className={`absolute z-20 top-1/2 -translate-y-1/2 left-[-16px] h-[30px] w-[30px] flex items-center justify-center rounded-full bg-white
              ${skillMapInfo?.prevUser ? 'hover:cursor-pointer' : 'hover:cursor-not-allowed'}`}
            onClick={() =>
              handleNavigateUser && handleNavigateUser(skillMapInfo?.prevUser)
            }>
            <ImageRound
              src="/icons/chevron-left-calendar.svg"
              name={'left'}
              className="h-fit w-fit"
            />
          </div>
          <div
            className={`absolute z-20 top-1/2 -translate-y-1/2 rotate-180 right-[-16px] h-[30px] w-[30px] flex items-center justify-center rounded-full bg-white
              ${skillMapInfo?.nextUser ? 'hover:cursor-pointer' : 'hover:cursor-not-allowed'}`}
            onClick={() =>
              handleNavigateUser && handleNavigateUser(skillMapInfo?.nextUser)
            }>
            <ImageRound
              src="/icons/chevron-left-calendar.svg"
              name={'right'}
              className="h-fit w-fit"
            />
          </div>
        </>
      ) : (
        <></>
      )}
    </div>
  );
};
