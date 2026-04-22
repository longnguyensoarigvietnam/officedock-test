import { Dispatch, SetStateAction } from 'react';
import Image from 'next/image';

import CustomUserAvatar from '@components/common/AvatarIcon/CustomUserAvatar';
import Button from '@components/common/Button';
import { TwinklingIcon } from '@components/common/TwinklingIcon';

import {
  HonoredUserInfoDirection,
  VotingCandidateRanking,
} from '@constants/enums';

import { Candidate } from '@interfaces/mvp';

export const HonoredUser = ({
  userInfo,
  avatarSize,
  direction,
  setOpenVotingReasonsModal,
}: {
  userInfo: Candidate;
  avatarSize: number;
  direction: HonoredUserInfoDirection;
  setOpenVotingReasonsModal: Dispatch<
    SetStateAction<{
      status: boolean;
      userInfo: Candidate | null
    }>
  >;
}) => {
  return (
    <div
      className={`flex ${direction == HonoredUserInfoDirection.VERTICAL ? 'flex-col gap-[12px]' : 'gap-[30px]'} items-center `}>
      <div className="relative">
        <Image
          src={`${userInfo.ranking == VotingCandidateRanking.FIRST ? '/icons/golden-crown.svg' : userInfo.ranking == VotingCandidateRanking.SECOND ? '/icons/silver-medal.svg' : '/icons/bronze-medal.svg'}`}
          width={userInfo.ranking == VotingCandidateRanking.FIRST ? 54 : 46}
          height={userInfo.ranking == VotingCandidateRanking.FIRST ? 54 : 52}
          alt="Prize icon"
          className={`absolute z-10 ${userInfo.ranking == VotingCandidateRanking.FIRST ? '-top-4 -rotate-12' : '-top-2'}`}
        />
        <CustomUserAvatar
          avatarUrl={userInfo?.avatar || ''}
          avatarColor={userInfo.avatarColor}
          size={avatarSize}
        />
        {userInfo.ranking == VotingCandidateRanking.FIRST ? (
          <>
            <Image
              src="/icons/mvp-icon.svg"
              width={63}
              height={49}
              alt="MVP icon"
              className={`absolute -bottom-8 left-1/2 -translate-x-1/2`}
            />
            <div>
              <TwinklingIcon
                className="absolute top-[45px] left-[0px] !w-5 !h-5"
                delay={0}
                iconUrl="/icons/golden-star.svg"
              />
              <TwinklingIcon
                className="absolute top-[75px] -left-[10px] !w-5 !h-5"
                delay={0.5}
                iconUrl="/icons/golden-star.svg"
              />
              <TwinklingIcon
                className="absolute top-[15px] right-[20px] !w-5 !h-5"
                delay={0.8}
                iconUrl="/icons/golden-star.svg"
              />
              <TwinklingIcon
                className="absolute bottom-[50px] -right-[5px] !w-5 !h-5"
                delay={1}
                iconUrl="/icons/golden-star.svg"
              />
              <TwinklingIcon
                className="absolute bottom-[15px] left-[20px] !w-5 !h-5"
                delay={1.2}
                iconUrl="/icons/golden-star.svg"
              />
            </div>
          </>
        ) : (
          <></>
        )}
      </div>
      <div className={`text-white font-medium !leading-none`}>
        <p
          className={`text-base w-[150px] max-w-[150px] truncate ${direction == HonoredUserInfoDirection.VERTICAL ? 'text-center mb-[6px]' : 'mb-[10px]'}`}>
          {userInfo?.mainOrganization?.name || ''}
        </p>
        <p
          className={`text-[20px] w-[158px] max-w-[158px] truncate mb-[20px] ${direction == HonoredUserInfoDirection.VERTICAL ? 'text-center mb-[12px]' : 'mb-[10px]'}`}>
          {userInfo.fullName} <span className="text-xs">さん</span>
        </p>
        <div
          className={`${direction == HonoredUserInfoDirection.VERTICAL && 'flex justify-center'}`}>
          <Button
            variant="secondary"
            style={{
              background: 'linear-gradient(180deg, #C59941 0%, #D0AA5A 100%)',
            }}
            className="!rounded-[3px] !border-0 text-white font-medium !text-xs w-[60px] h-[22px] !p-0"
            onClick={() => {
              setOpenVotingReasonsModal({
                status: true,
                userInfo,
              });
            }}>
            コメント
          </Button>
        </div>
      </div>
    </div>
  );
};
