'use client';

import { useState } from 'react';

import CustomUserAvatar from '@components/common/AvatarIcon/CustomUserAvatar';
import Button from '@components/common/Button';
import ImageRound from '@components/common/ImageRound';
import { SkillMapProgressBar } from '@components/common/ProgressBar/SkillMapProgressBar';

export default function CandidateList({
  detail,
  isVotingStatusPage,
  isOpen,
  onOpenViewVotingReasonList,
}: {
  detail:
    | {
        candidates: {
          id: number;
          fullName: string;
          avatar: string | null;
          avatarColor: string;
          mainOrganization: {
            id: number;
            name: string;
            uuid: string;
          };
          voteCount: number | null;
          mvpCandidateId: number | null;
        }[];
        totalVoters?: number | undefined;
      }
    | null
    | undefined;
  isVotingStatusPage?: boolean;
  isOpen: boolean | undefined;
  onOpenViewVotingReasonList?: (mvpCandidateId: number) => void;
}) {
  const [visibleCount, setVisibleCount] = useState(3);

  const candidates = detail?.candidates || [];
  const hasMore = candidates.length > visibleCount;

  const handleShowMore = () => {
    setVisibleCount(candidates.length);
  };

  return (
    <div className={`${isOpen ? 'block' : 'hidden'}`}>
      {!isVotingStatusPage ? (
        <p className="text-sm font-medium mb-2 mt-[30px]">投票結果</p>
      ) : (
        <></>
      )}
      <div className="flex flex-col">
        {candidates.slice(0, visibleCount).map((candidate) => (
          <div
            key={candidate.id}
            className="flex items-center gap-[20px] w-full py-4 border-b-[1px] border-[#D2DBE1] last:border-none">
            <div className="flex items-center gap-[6px] w-[136px]">
              <CustomUserAvatar
                avatarUrl={candidate?.avatar || ''}
                avatarColor={candidate?.avatarColor || ''}
                size={30}
              />
              <div className="space-y-1 w-[96px]">
                <p className="text-[#77858F] font-medium text-xs max-w-full break-all">
                  {candidate?.mainOrganization?.name || ''}
                </p>
                <p className="text-black font-medium text-sm max-w-full break-all line-clamp-2">
                  {candidate?.fullName || ''}
                </p>
              </div>
            </div>
            <div className="w-[calc(100%_-_300px)] flex gap-4 items-center">
              <div className="w-full">
                <SkillMapProgressBar
                  value={
                    (100 * (candidate?.voteCount ?? 0)) /
                    Number(detail?.totalVoters)
                  }
                  strokeColor={'#F86683'}
                  trailColor={'#EBF1F7'}
                  height={'20px'}
                  className="!rounded-[4px]"
                />
              </div>

              <p className="text-nowrap font-medium text-sm">
                {candidate.voteCount}票
              </p>
            </div>
            <Button
              variant="primary"
              className="!text-sm !font-medium !w-[100px] !h-[36px] !text-nowrap"
              onClick={() =>
                candidate.mvpCandidateId &&
                onOpenViewVotingReasonList &&
                onOpenViewVotingReasonList(candidate.mvpCandidateId)
              }>
              投票理由
            </Button>
          </div>
        ))}
      </div>

      {hasMore && (
        <div
          className="flex gap-[6px] mt-4 justify-center items-center hover:cursor-pointer"
          onClick={handleShowMore}>
          <p className="text-xs font-medium text-[#77858F]">
            メンバーをさらに表示
          </p>
          <ImageRound
            name="Arrow down"
            src={`/icons/arrow-down.svg`}
            className="w-[16px] h-[12px] hover:cursor-pointer"
          />
        </div>
      )}
    </div>
  );
}
