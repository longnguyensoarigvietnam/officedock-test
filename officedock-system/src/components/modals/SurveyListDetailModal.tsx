import React, { useContext, useState } from 'react';

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
  type Option = {
    label: string;
    votes: number;
  };

  const [options] = useState<Option[]>([
    { label: 'ちょうど良い', votes: 8 },
    { label: '少し寒い', votes: 2 },
    { label: '少し暑い', votes: 0 },
    {
      label:
        '季節や時間帯によって極端に暑すぎたり寒すぎたりすることがあり、体調を崩しやすいと感じる',
      votes: 0,
    },
  ]);
  const totalVotes = options.reduce((sum, o) => sum + o.votes, 0);

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
          {options.map((opt, idx) => {
            const percent = totalVotes
              ? Math.round((opt.votes / totalVotes) * 100)
              : 0;

            const isSelected = idx === 0;

            return (
              <div
                key={idx}
                className={`relative min-h-[44px] flex items-center justify-between rounded-md border border-[#77858F] overflow-hidden`}>
                {/* Background color bar */}
                <div
                  className={`absolute top-0 left-0 h-full ${
                    isSelected ? 'bg-[#A7D4F5]' : 'bg-gray-200'
                  }`}
                  style={{ width: `${percent}%` }}></div>

                {/* Content */}
                <div className="relative flex-1 p-3 flex items-center justify-between z-10">
                  <span
                    className={`text-sm ${
                      opt.votes === 0 ? 'text-gray-400' : 'text-black'
                    }`}>
                    {opt.label}
                  </span>
                  <span
                    className={`text-sm ${
                      opt.votes === 0 ? 'text-gray-400' : 'text-black'
                    }`}>
                    {opt.votes}票
                  </span>
                </div>
              </div>
            );
          })}{' '}
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
