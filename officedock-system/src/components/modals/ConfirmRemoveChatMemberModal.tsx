import { memo } from 'react';

import Modal from '../common/Modal';
import Button from '../common/Button';
import { ChatDashboardMember } from '@interfaces/chat';
import CustomUserAvatar from '@components/common/AvatarIcon/CustomUserAvatar';
import useChatRoomDetail from '@hooks/useChatRoomDetail';

export type ConfirmDeleteModalProps = {
  open: boolean;
  onConfirm: (memberIds: number[]) => void;
  onClose: () => void;
  dashboardMembers: ChatDashboardMember[];
  selectedRemoveMemberId: number | undefined;
  code: string;
};

const ConfirmRemoveChatMemberModal = memo(
  ({
    open,
    onConfirm,
    onClose,
    dashboardMembers,
    selectedRemoveMemberId,
    code,
  }: ConfirmDeleteModalProps) => {
    const { chatRoomDetail } = useChatRoomDetail({
      code,
    });

    const renderAvatar = (memberId: number) => {
      const memberInfo = dashboardMembers.find((member) => {
        return member.id == memberId;
      });

      return (
        <div className="flex justify-center">
          <CustomUserAvatar
            avatarUrl={memberInfo?.avatarUrl || ''}
            avatarColor={memberInfo?.avatarColor || ''}
            size={36}
          />
        </div>
      );
    };

    return (
      <Modal
        open={open}
        className="font-primary bg-white w-[515px] !rounded-xl py-4"
        isOutSideAction={false}
        onClose={onClose}>
        <div className="mb-5 flex gap-2 justify-center items-center">
          {selectedRemoveMemberId && renderAvatar(selectedRemoveMemberId)}
          <p className="text-black text-[15px] font-medium max-w-full break-all">
            {
              dashboardMembers.find((member) => {
                return member.id == selectedRemoveMemberId;
              })?.fullName
            }
          </p>
        </div>
        <p className="text-[#000000] font-normal text-[14px] text-center">
          このメンバーを本当に退会させますか？
        </p>
        <p className="text-[#77858F] font-normal text-[13px] text-center">
          退会したメンバーに通知されます。
        </p>
        <div className="flex justify-center gap-3 my-3 items-center">
          <Button variant="outline" onClick={onClose} className="w-[110px]">
            キャンセル
          </Button>
          <Button
            variant="primary"
            className="w-[110px]"
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
