'use client';

import { memo } from 'react';

import Modal from '../common/Modal';
import Button from '@components/common/Button';
import CustomUserAvatar from '@components/common/AvatarIcon/CustomUserAvatar';

export type ViewVotingMemberListProps = {
  candidateList: {
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
  open: boolean;
  onClose: () => void;
};

const ViewVotingMemberListModal = memo(
  ({ candidateList, open, onClose }: ViewVotingMemberListProps) => {
    return (
      <Modal
        open={open}
        isOutSideAction={false}
        className="font-primary !rounded-[20px] text-gray-700 !p-0 w-[500px]"
        titleClassName="!text-[14px] !text-[#5B6770] !font-medium"
        headerClassName="bg-[#EBF1F7] !rounded-t-[20px] !rounded-b-none px-6 py-4 !mb-0"
        contentClass="!rounded-[20px]"
        closeIconClassName="!bg-white !rounded-full !p-2 !hover:cursor-pointer !shadow-sm"
        closeClassName="!mt-0 opacity-70 !w-4 !h-4 !hover:cursor-pointer"
        onClose={() => {
          onClose();
        }}
        title="選択メンバー">
        <div className="pt-5 pb-[30px] px-5 w-full">
          {candidateList.length > 0 ? (
            <div className="max-h-[346px] overflow-y-auto border-[1px] border-[#D2DBE1] rounded-[6px]">
              {candidateList.map((candidate) => (
                <div
                  key={candidate.id}
                  className="flex items-center justify-between border-b-[1px] border-[#D2DBE1] last:border-b-[0px]">
                  <div className="flex items-center px-5 py-2 gap-[10px] w-full">
                    <CustomUserAvatar
                      avatarUrl={candidate?.avatar || ''}
                      avatarColor={candidate?.avatarColor || ''}
                      size={30}
                    />
                    <p className="text-black text-[15px] font-medium max-w-[calc(100%_-_80px)] truncate text-nowrap">
                      {candidate.fullName}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p></p>
          )}
          <div className="flex justify-center mt-[30px]">
            <Button
              variant="text"
              className="!text-[13px] !p-0 font-medium"
              onClick={onClose}>
              閉じる
            </Button>
          </div>
        </div>
      </Modal>
    );
  },
);
export default ViewVotingMemberListModal;
