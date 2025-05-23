import Modal from '@components/common/Modal';
import { memo } from 'react';

export type LevelUpCompletionModalProps = {
  open: boolean;
  selectRejectOption: boolean
  onClose: () => void;
};

const LevelUpCompletionModal = memo(
  ({ open, selectRejectOption, onClose }: LevelUpCompletionModalProps) => {
    return (
      <Modal
        open={open}
        className="font-primary !rounded-[8px] text-gray-700 !p-0 w-[400px] "
        contentClass="!w-[400px] !rounded-[8px]"
        onClose={onClose}>
        <div className="py-[40px] px-[20px] flex flex-col gap-5 items-center">
          <div>
            <p className="text-sm font-modal">
              {selectRejectOption
                ? 'スキルのレベルアップを差し戻しました。'
                : 'スキルのレベルアップを承認しました。'}
            </p>
          </div>
          <p
            className="text-[#0068B6] text-[13px] font-medium flex justify-center hover:cursor-pointer"
            onClick={onClose}>
            閉じる
          </p>
        </div>
      </Modal>
    );
  },
);

export default LevelUpCompletionModal
