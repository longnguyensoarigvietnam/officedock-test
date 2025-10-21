import { memo } from 'react';

import Modal from '../common/Modal';
import Button from '../common/Button';
import CustomUserAvatar from '@components/common/AvatarIcon/CustomUserAvatar';

import useChatRoomDetail from '@hooks/useChatRoomDetail';

import { Profile } from '@interfaces/user';

export type ConfirmDeleteModalProps = {
  open: boolean;
  onConfirm: (memberIds: number[]) => void;
  onClose: () => void;
  dashboardMemberList: Omit<Profile, 'birthday' | 'gender'>[];
  selectedRemoveMemberId: number | undefined;
  code: string;
};

const ConfirmRemoveChatMemberModal = memo(
  ({
    open,
    onConfirm,
    onClose,
    dashboardMemberList,
    selectedRemoveMemberId,
    code,
  }: ConfirmDeleteModalProps) => {
    const { chatRoomDetail } = useChatRoomDetail({
      code,
    });

    const renderAvatar = (memberId: number) => {
      const memberInfo = dashboardMemberList.find((member) => {
        return member.id == memberId;
      });

      return (
        <div className="flex justify-center">
          <CustomUserAvatar
            avatarUrl={memberInfo?.avatar || ''}
            avatarColor={memberInfo?.avatarColor || ''}
            size={30}
          />
        </div>
      );
    };

    return (
      <Modal
        open={open}
        className="font-primary !rounded-[20px] text-black !py-[30px] w-[500px]"
        titleClassName="!text-[14px] !text-[#5B6770] !font-medium"
        contentClass="!rounded-[20px]"
        isOutSideAction={false}
        onClose={onClose}>
        <div className="mb-[30px] flex gap-[10px] justify-center items-center">
          {selectedRemoveMemberId && renderAvatar(selectedRemoveMemberId)}
          <p className="text-black text-[15px] font-medium max-w-full break-all">
            {
              dashboardMemberList.find((member) => {
                return member.id == selectedRemoveMemberId;
              })?.fullName
            }{' '}
            <span className="ml-[6px] text-xs text-[#77858F]">
              {
                dashboardMemberList.find((member) => {
                  return member.id == selectedRemoveMemberId;
                })?.organizations?.name
              }
            </span>
          </p>
        </div>
        <p className="text-[#000000] font-normal text-[14px] text-center leading-none">
          このメンバーを本当に退室させますか？
        </p>
        <div className="flex justify-center gap-[10px] mt-10 items-center">
          <Button
            variant="outline"
            onClick={onClose}
            className="!w-[100px] !h-[36px] !p-0">
            キャンセル
          </Button>
          <Button
            variant="primary"
            className="!w-[100px] !h-[36px] !p-0 !border-none"
            onClick={() => {
              const participantList = chatRoomDetail
                ? chatRoomDetail.participants
                : [];
              const filterParticipantList = participantList
                .filter(
                  (participant) => participant.id != selectedRemoveMemberId,
                )
                .map((participant) => Number(participant.id));
              onConfirm(filterParticipantList || []);
            }}>
            OK
          </Button>
        </div>
      </Modal>
    );
  },
);

export default ConfirmRemoveChatMemberModal;
