import { memo } from 'react';

import Modal from '../common/Modal';
import AvatarIconWithDynamicColor from '@components/common/AvatarIcon';
import Button from '@components/common/Button';
import ImageRound from '@components/common/ImageRound';

export type DetailProfileMemberProps = {
  open: boolean;
  type: string;
  onConfirm: () => void;
  onClose: () => void;
};

const ViewDetail = ({ label, value }: { label: string; value: string }) => {
  return (
    <div className={`w-full flex items-start`}>
      <label className="font-normal text-[#77858F] text-sm w-[120px]">
        {label}
      </label>
      <div className="text-black font-medium text-sm flex-1 ">
        <span className="line-clamp-3 break-all">{value}</span>
      </div>
    </div>
  );
};

const DetailProfileMemberModal = memo(
  ({ onClose }: DetailProfileMemberProps) => {
    return (
      <Modal
        open={true}
        className="font-primary bg-[#F8FAFC] w-[540px] !rounded-lg !p-10"
        onClose={onClose}
        title="">
        <div className="relative">
          <div
            className={`absolute top-[-20px] right-[-20px] w-[30px] h-[30px] flex items-center justify-center rounded-full bg-white`}>
            <ImageRound
              className={`mt-1 w-5 h-5 hover:cursor-pointer `}
              src="/icons/close.svg"
              name="Close modal"
              onClick={onClose}
            />
          </div>
          <div className="flex items-start gap-[10px]">
            {AvatarIconWithDynamicColor({
              color: '#0068B6',
              size: 36,
            })}
            <p className="text-black font-medium text-[18px] line-clamp-3 break-all pt-1">
              安藤 優希
            </p>
          </div>
          <div className="flex">
            <div className="flex flex-1 flex-col gap-4 mt-[22px]">
              <ViewDetail label="メインチーム" value={'マーケティング部'} />
              <ViewDetail label="サブチーム" value={'制作部 / 営業部'} />
              <ViewDetail label="現在の予定" value={'打ち合わせ'} />
              <ViewDetail label="メールアドレス" value={'○○○○○＠○○○○○'} />
            </div>
            <div className="w-[136px] flex flex-col gap-1 justify-end">
              <Button className="!py-0 !pl-[14px] !pr-0 !justify-start w-[136px] h-9 flex items-center  gap-2">
                <ImageRound
                  src="/icons/chat.svg"
                  name="Extend box"
                  className={`!w-[18px] !h-4 `}
                />
                <span>チャット</span>
              </Button>
              <Button className="!py-0 !pl-[14px] !pr-0 !justify-start w-[136px] h-9 flex items-center  gap-2">
                <ImageRound
                  src="/icons/skill-map.svg"
                  name="Extend box"
                  className={`!w-4 !h-4 `}
                />
                <span>スキルマップ</span>
              </Button>
              <Button className="!py-0 !pl-[14px] !pr-0 !justify-start w-[136px] h-9 flex items-center  gap-2 ">
                <ImageRound
                  src="/icons/daily-report.svg"
                  name="Extend box"
                  className={`!w-4 !h-4 `}
                />
                <span>日報</span>
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    );
  },
);

export default DetailProfileMemberModal;
