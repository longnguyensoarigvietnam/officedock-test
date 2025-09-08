import CustomUserAvatar from '@components/common/AvatarIcon/CustomUserAvatar';
import Button from '@components/common/Button';
import Modal from '@components/common/Modal';

import { MVPVotingComment } from '@interfaces/mvp';

export const ViewMVPVotingCommentModal = ({
  open,
  userInfo,
  votingComment,
  onClose,
}: {
  open: boolean;
  userInfo: {
    id: number;
    fullName: string;
    avatarColor: string;
    avatar: string | null;
    organizationName: string | null;
  };
  votingComment: MVPVotingComment;
  onClose: () => void;
}) => {
  return (
    <Modal
      open={open}
      isOutSideAction={false}
      className="font-primary !rounded-[20px] !p-0 w-[500px]"
      titleClassName="!text-[14px] !text-[#5B6770] !font-medium"
      headerClassName="bg-[#EBF1F7] !rounded-t-[20px] !rounded-b-none px-6 py-4 !mb-0"
      contentClass="!rounded-[20px] w-[500px]"
      closeIconClassName="!bg-white !rounded-full !p-2 !hover:cursor-pointer !shadow-sm"
      closeClassName="!mt-0 opacity-70 !w-4 !h-4 !hover:cursor-pointer"
      onClose={() => {
        onClose();
      }}>
      <div className="w-[500px] h-fit bg-white rounded-[20px] shadow p-[30px] text-sm">
        <div className="flex items-center justify-center gap-[30px] mb-5">
          <div className="relative">
            <CustomUserAvatar
              avatarUrl={userInfo?.avatar || ''}
              avatarColor={userInfo?.avatarColor || ''}
              size={100}
            />
          </div>
          <div className="font-medium !leading-none w-full">
            <p className="text-base break-all mb-2">{userInfo?.organizationName}</p>
            <p className="text-[20px] break-all">
              {userInfo?.fullName} <span className="text-xs">さん</span>
            </p>
          </div>
        </div>
        <p className="text-xs text-[#B58F42] font-medium mb-3">
          送信した投票理由
        </p>
        <div className="border-[1px] border-[#E1DBD2] rounded-[6px] h-[88px] overflow-y-auto px-4 py-[14px] text-black w-[440px] break-all">
          <p
            dangerouslySetInnerHTML={{
              __html: votingComment.comment,
            }}></p>
        </div>

        <div className="flex justify-center mt-5">
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
};
