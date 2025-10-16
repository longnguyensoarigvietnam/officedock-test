import Modal from '@components/common/Modal';
import { memo } from 'react';

export type LevelUpCompletionModalProps = {
  open: boolean;
  selectRejectOption: boolean;
  onClose: () => void;
};

const LevelUpCompletionModal = memo(
  ({ open, selectRejectOption, onClose }: LevelUpCompletionModalProps) => {
    return (
      <Modal
        open={open}
        className="font-primary !rounded-[20px] text-gray-700 !p-0 w-[400px] "
        onClose={onClose}>
        <div className="py-[40px] px-[20px] flex flex-col gap-[30px] items-center">
          <div>
            <p className="text-sm font-modal leading-none">
              {selectRejectOption
                ? 'スキルのレベルアップを差し戻しました。'
                : 'スキルのレベルアップを承認しました。'}
            </p>
          </div>
          <p
            className="text-primary text-[13px] leading-none font-medium flex justify-center hover:cursor-pointer"
            onClick={onClose}>
            閉じる
          </p>
        </div>
      </Modal>
    );
  },
);

export default LevelUpCompletionModal;
