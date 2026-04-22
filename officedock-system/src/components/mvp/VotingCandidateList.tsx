'use client';

import { Dispatch, SetStateAction } from 'react';

import CustomUserAvatar from '@components/common/AvatarIcon/CustomUserAvatar';
import ImageRound from '@components/common/ImageRound';

import { CurrentMVPVotingDetail, MVPOrganization } from '@interfaces/mvp';

import { useSessionCache } from '@providers/SessionCacheProvider';

import {
  convertDateToJapaneseFormat,
  formatShowDateJapanese,
} from '@utils/date';
import RowSkeleton from '@components/skeleton/RowSkeleton';

interface VotingCandidateListProps {
  memberListByOrganization: {
    orgInfo: MVPOrganization;
    collapseStatus: boolean;
  }[];
  currentMVPVotingDetail: CurrentMVPVotingDetail | undefined;
  isLoadingMVPVotingDetail: boolean;
  setOpenVotingCommentModal: Dispatch<
    SetStateAction<{
      status: boolean;
      userInfo: {
        id: number;
        fullName: string;
        avatarColor: string;
        avatar: string | null;
        organizationName: string | null;
      } | null;
    }>
  >;
  setMemberListByOrganization: React.Dispatch<
    React.SetStateAction<
      {
        orgInfo: MVPOrganization;
        collapseStatus: boolean;
      }[]
    >
  >;
  setOpenVotingReasonForm: Dispatch<
    SetStateAction<{
      status: boolean;
      userInfo: {
        id: number;
        fullName: string;
        avatarColor: string;
        avatar: string | null;
      } | null;
      votingInfo: {
        mvpVoteManagement: number | null;
        mvpCandidate: number | null;
      };
    }>
  >;
}

export const VotingCandidateList = ({
  memberListByOrganization,
  currentMVPVotingDetail,
  isLoadingMVPVotingDetail,
  setOpenVotingCommentModal,
  setMemberListByOrganization,
  setOpenVotingReasonForm,
}: VotingCandidateListProps) => {
  const { data: session } = useSessionCache();
  return (
    <div
      style={{
        background: '#DFAEAECC',
        boxShadow: '0px 4px 10px 0px #0000000D',
      }}
      className="w-[720px] h-[calc(100%_-_60px)] p-[30px] pr-[12px] absolute top-1/2 -translate-y-1/2 right-[30px] font-medium text-white border border-white rounded-3xl">
      <div className="space-y-[14px] mb-10">
        {currentMVPVotingDetail ? (
          <>
            <p className="bg-white leading-none w-fit py-[9px] px-3 rounded-[6px] font-semibold text-[15px] text-[#B58F42]">
              投票期間
              <span className="ml-[10px]">
                {formatShowDateJapanese(
                  String(currentMVPVotingDetail?.startDate),
                )}{' '}
                ~{' '}
                {convertDateToJapaneseFormat(
                  new Date(currentMVPVotingDetail?.endDate || new Date()),
                )}
              </span>
            </p>
            <p className="text-[24px] font-semibold">
              {currentMVPVotingDetail?.title || ''}
            </p>
          </>
        ) : (
          <></>
        )}
      </div>
      <div
        className={`flex flex-col ${isLoadingMVPVotingDetail ? 'max-h-[calc(100%_-_35px)]' : 'max-h-[calc(100%_-_130px)]'} gap-[26px] overflow-y-auto customized-scrollbar`}>
        {isLoadingMVPVotingDetail ? (
          <div className="">
            <RowSkeleton
              numberOfRows={6}
              className="h-[125px] !rounded-[14px] w-[calc(100%)]"
            />
          </div>
        ) : (
          memberListByOrganization?.map((organization) => {
            return (
              <div
                key={organization.orgInfo.id}
                className="border-b-[1px] border-white pb-[26px]">
                <div
                  className={`flex items-center justify-between ${!organization.collapseStatus || (organization.collapseStatus && organization.orgInfo.candidates.length == 0) ? 'mb-0' : 'mb-5'}`}>
                  <p className="font-medium text-base max-w-full break-all leading-none">
                    {organization.orgInfo.name}
                    <span
                      className={`text-xs font-medium ${organization.orgInfo.name && 'ml-[18px]'}`}>
                      メンバー{organization.orgInfo.candidates.length}人
                    </span>
                  </p>
                  <ImageRound
                    name="Collapse icon"
                    src={'/icons/white-collapse.svg'}
                    className={`w-[12px] h-[12px] hover:cursor-pointer ${!organization.collapseStatus && 'rotate-180'}`}
                    onClick={() =>
                      setMemberListByOrganization((prev) => {
                        return prev.map((org) =>
                          org.orgInfo.id == organization.orgInfo.id
                            ? { ...org, collapseStatus: !org.collapseStatus }
                            : org,
                        );
                      })
                    }
                  />
                </div>

                <div className="flex gap-[10px] flex-wrap">
                  {organization.collapseStatus &&
                    organization.orgInfo.candidates.map((candidate) => {
                      return (
                        <div
                          key={`${organization.orgInfo.id}-${candidate.id}`}
                          style={{
                            boxShadow: candidate.isVoted
                              ? '0px 2px 8px 0px #0000001A'
                              : 'none',
                          }}
                          className={`w-[157px] ${candidate.isVoted ? 'bg-[#FFE9CD] !border-[2px] !border-[#C69B44]' : 'bg-white'} ${candidate.id == session?.user.id || (currentMVPVotingDetail?.isVoted && !candidate.isVoted) ? 'hover:cursor-not-allowed' : 'hover:cursor-pointer'} rounded-[14px] h-[50px] px-[14px] py-[10px] flex items-center gap-[10px]`}
                          onClick={() => {
                            session?.user.id != candidate.id &&
                              !currentMVPVotingDetail?.isVoted &&
                              setOpenVotingReasonForm({
                                status: true,
                                userInfo: candidate,
                                votingInfo: {
                                  mvpVoteManagement: currentMVPVotingDetail
                                    ? currentMVPVotingDetail.id
                                    : null,
                                  mvpCandidate: candidate.mvpCandidateId,
                                },
                              });

                            candidate.isVoted &&
                              currentMVPVotingDetail?.isVoted &&
                              setOpenVotingCommentModal({
                                status: true,
                                userInfo: {
                                  id: Number(candidate.mvpCandidateId),
                                  fullName: candidate.fullName,
                                  avatarColor: candidate.avatarColor,
                                  avatar: candidate.avatar,
                                  organizationName: organization.orgInfo.name,
                                },
                              });
                          }}>
                          <CustomUserAvatar
                            avatarUrl={candidate?.avatar || ''}
                            avatarColor={candidate?.avatarColor || ''}
                            size={30}
                          />
                          <p className="text-black text-[15px] font-medium max-w-[calc(100%_-_30px)] truncate text-nowrap">
                            {candidate.fullName}
                          </p>
                        </div>
                      );
                    })}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
