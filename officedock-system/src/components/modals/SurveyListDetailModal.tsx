import React, { useContext } from 'react';

import CustomUserAvatar from '@components/common/AvatarIcon/CustomUserAvatar';
import Button from '@components/common/Button';
import Modal from '@components/common/Modal';
import { GlobalStateContext } from '@providers/GlobalStateProvider';
import { useSessionCache } from '@providers/SessionCacheProvider';

type Props = {
  open: boolean;
  onClose: () => void;
};

const SurveyListDetailModal = ({ open, onClose }: Props) => {
  const { data: session } = useSessionCache();

  const { dashboardMembersWithAvatars } = useContext(GlobalStateContext);

  const renderBoxUser = (userId: string) => {
    const memberInfo = dashboardMembersWithAvatars.find(
      (member) => member.id == userId,
    );

    return (
      <CustomUserAvatar
        avatarUrl={memberInfo?.avatar || ''}
        avatarColor={memberInfo?.avatarColor || ''}
        size={36}
      />
    );
  };
  return (
    <Modal
      open={open}
      className="font-primary bg-white w-[500px] !rounded-lg py-10 px-[30px]"
      isOutSideAction={false}
      onClose={onClose}>
      <div className="text-center text-[18px] font-medium">アンケート</div>
      <div className="mt-[30px]">
        <div className="text-[#77858F] text-[13px] font-medium flex items-center gap-[6px]">
          <p>実施日</p>
          <p className="text-black mr-[6px]">2025年10月11日</p>
          <Button
            variant="outline"
            className="w-[104px] h-[22px] !px-0 !bg-[#EBF1F7] !rounded-[3px] hover:opacity-80 !text-black text-xs font-normal !border-none ]">
            受付終了
          </Button>
        </div>
      </div>
      <div className="flex items-center gap-2 mt-[26px]">
        <div>{session?.user.id && renderBoxUser(`${session?.user.id}`)}</div>
        <p className="break-all max-w-[100px] line-clamp-2 text-base font-medium">
          {session?.user.profile.fullName}
        </p>
      </div>
      {/* Question */}
      <div className="mt-4 font-medium text-base">
        <p>明日のランチで食べたいものは何ですか</p>
        <div className="flex flex-col gap-[6px] mt-4">
          <div className="h-fit p-3  flex items-center gap-2 justify-between rounded-md border border-[#77858F]"></div>
        </div>
      </div>
      <div className="flex justify-center gap-3  items-center">
        <Button variant="text" onClick={onClose} className="">
          閉じる
        </Button>
      </div>
    </Modal>
  );
};

export default SurveyListDetailModal;
