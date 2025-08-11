'use client';

import Button from '@components/common/Button';
import Modal from '@components/common/Modal';

interface CompletedActionsSettingSkillModalProps {
  open: boolean;
  completedMessage: string;
  onClose: () => void;
}

export const CompletedActionsSettingSkillModal = ({
  open,
  completedMessage,
  onClose,
}: CompletedActionsSettingSkillModalProps) => {
  return (
    <Modal
      open={open}
      className={`font-primary bg-white w-[400px] h-[130px] !rounded-[20px] !py-[40px] !px-[20px]`}
      contentClass="!rounded-[20px]"
      isOutSideAction={false}
      onClose={onClose}>
      <div className="flex flex-col items-center space-y-3">
        <p className="text-sm">{completedMessage}</p>
        <Button variant="text" className="pb-0" onClick={onClose}>
          閉じる
        </Button>
      </div>
    </Modal>
  );
};
