import { memo } from 'react';

import Modal from '../common/Modal';
import Button from '../common/Button';
import CustomUserAvatar from '@components/common/AvatarIcon/CustomUserAvatar';

export type WarningUncheckSkillModalProps = {
  open: boolean;
  warningUncheckSkillDetail: {
    avatarColor: string;
    avatarUrl: string;
    fullName: string;
    skillName: string;
    organizationName: string;
  } | null;
  onConfirm: () => void;
  onClose: () => void;
};

const WarningUncheckSkillModal = memo(
  ({
    open,
    warningUncheckSkillDetail,
    onConfirm,
    onClose,
  }: WarningUncheckSkillModalProps) => {
    const renderAvatar = () => {
      return (
        <div className="flex justify-center">
          <CustomUserAvatar
            avatarUrl={warningUncheckSkillDetail?.avatarUrl || ''}
            avatarColor={warningUncheckSkillDetail?.avatarColor || ''}
            size={30}
          />
        </div>
      );
    };

    return (
      <Modal
        open={open}
        className="font-primary !rounded-[20px] text-black !py-[30px] w-[500px]"
        isOutSideAction={false}
        onClose={onClose}>
        <div className="mb-5 flex gap-2 justify-center items-center">
          {renderAvatar()}
          <p className="text-black text-[15px] font-medium max-w-[350px] break-all">
            {warningUncheckSkillDetail?.fullName || ''}
            <span className="text-[#77858F] text-xs font-medium ml-[10px]">
              {warningUncheckSkillDetail?.organizationName || ''}
            </span>
          </p>
        </div>
        <p className="text-[#000000] font-medium text-[16px] max-w-[480px] break-all text-center mb-[14px]">
          {warningUncheckSkillDetail?.skillName || ''}
        </p>
        <p className="text-[#000000] font-normal text-sm text-center mb-6 leading-none">
          のスキルの割り当てを外しますか？
        </p>
        <p className="text-[#77858F] font-normal text-[13px] text-center mb-10 leading-none">
          紐づいているタスクを完了してもスキルに反映されません。
        </p>
        <div className="flex justify-center gap-[10px] items-center">
          <Button
            variant="outline"
            onClick={onClose}
            className="w-[100px] h-[36px] !p-0">
            キャンセル
          </Button>
          <Button
            variant="primary"
            className="w-[100px] h-[36px] !p-0"
            onClick={onConfirm}>
            OK
          </Button>
        </div>
      </Modal>
    );
  },
);

export default WarningUncheckSkillModal;
