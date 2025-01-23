import { memo } from 'react';

import Modal from '../common/Modal';
import Button from '../common/Button';

export type WarningCloseTaskModalProps = {
  open: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

const WarningCloseTaskModal = memo(
  ({ open, onConfirm, onClose }: WarningCloseTaskModalProps) => {

    return (
      <Modal
        open={open}
        className="font-primary bg-white w-[515px] !rounded-2xl py-4"
        onClose={onClose}
        isOutSideAction={false}
        title="確認">
        <div className="text-sm text-gray-700">
          <p className="leading-6 text-neutral-02">閉じると保存しませんが、本当によろしいでしょうか？</p>
        </div>
        <div className="border-t mt-4 pt-2  border-solid border-gray-100 gap-4 flex justify-end">
          <Button
            variant="secondary"
            onClick={onClose}
            className="bg-transparent w-[107px] rounded-xl h-10">
            いいえ
          </Button>
          <Button
            variant="primary"
            onClick={onConfirm}
            className={`w-[107px] rounded-xl h-10`}>
            はい
          </Button>
        </div>
      </Modal>
    );
  },
);

export default WarningCloseTaskModal;
