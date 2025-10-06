import { memo } from 'react';

import Modal from '../common/Modal';
import Button from '../common/Button';

export type ConfirmLeaveGroupModalProps = {
  open: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

const ConfirmLeaveGroupModal = memo(
  ({ open, onConfirm, onClose }: ConfirmLeaveGroupModalProps) => {
    return (
      <Modal
        open={open}
        className="font-primary bg-white w-[400px] !rounded-lg py-[30px]"
        isOutSideAction={false}
        onClose={onClose}>
        <div className="text-center mb-10">
          <p className="text-sm text-black leading-6 text-neutral-02">{`"本当にグループを退会しますか？`}</p>
        </div>
        <div className="flex justify-center gap-3  items-center">
          <Button
            variant="outline"
            onClick={onClose}
            className="w-[100px] h-[36px] text-[13px] !px-0">
            いいえ
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              onConfirm();
            }}
            className={`w-[100px] h-[36px]`}>
            はい
          </Button>
        </div>
      </Modal>
    );
  },
);

export default ConfirmLeaveGroupModal;
