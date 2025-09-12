import CustomUserAvatar from '@components/common/AvatarIcon/CustomUserAvatar';
import Button from '@components/common/Button';
import Modal from '@components/common/Modal';
import TextAreaLink from '@components/common/TextAreaLink';

export const VotingReasonModal = ({
  open,
  userInfo,
  votingReason,
  setVotingReason,
  onSubmit,
  onClose,
}: {
  open: boolean;
  userInfo: {
    id: number;
    fullName: string;
    avatarColor: string;
    avatar: string | null;
  };
  votingReason: string;
  setVotingReason: React.Dispatch<React.SetStateAction<string>>;
  onSubmit: () => void;
  onClose: () => void;
}) => {
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
      }}>
      <div className="w-[500px] h-[363px] bg-white rounded-[20px] shadow py-[40px] px-[30px] text-sm">
        <div className="flex items-center justify-center gap-2 w-full">
          <CustomUserAvatar
            avatarUrl={userInfo?.avatar || ''}
            avatarColor={userInfo?.avatarColor || ''}
            size={30}
          />
          <p className="text-black text-[15px] font-medium max-w-[calc(100%_-_40px)] break-all line-clamp-2">
            {userInfo.fullName}
            <span className="text-xs ml-1">さんへ投票</span>
          </p>
        </div>
        <div className="my-[30px]">
          <p className="text-sm font-medium mb-2 text-black">投票理由</p>
          <TextAreaLink
            className="w-[440px] h-[130px] rounded-[6px] tweet-form"
            onChange={(data) => setVotingReason && setVotingReason(data)}
            initialValue={votingReason}
          />
        </div>

        <div className="flex items-center justify-center gap-3">
          <Button
            variant="outline"
            className="bg-transparent !border-[#B58F42] !text-[#B58F42] w-[100px] rounded-[8px] h-[36px] !p-0"
            onClick={onClose}>
            キャンセル
          </Button>
          <Button
            variant="secondary"
            className={`w-[100px] rounded-[8px] !text-white h-[36px]`}
            style={{
              background: 'linear-gradient(180deg, #C59941 0%, #D0AA5A 100%)',
            }}
            onClick={onSubmit}>
            投票する
          </Button>
        </div>
      </div>
    </Modal>
  );
};
