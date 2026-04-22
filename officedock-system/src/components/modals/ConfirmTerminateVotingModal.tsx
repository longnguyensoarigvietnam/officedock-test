import { memo } from 'react';

import Modal from '../common/Modal';
import Button from '../common/Button';

export type ConfirmTerminateVotingModalProps = {
  open: boolean;
  message?: string;
  onConfirm: () => void;
  onClose: () => void;
};

const ConfirmTerminateVotingModal = memo(
  ({
    open,
    message,
    onConfirm,
    onClose,
  }: ConfirmTerminateVotingModalProps) => {
    return (
      <Modal
        open={open}
        className="font-primary bg-white w-[500px] !rounded-[20px] py-[30px]"
        isOutSideAction={false}
        onClose={onClose}>
        <div className="text-center mb-7">
          <p className="text-sm text-black leading-6 text-neutral-02">{message}</p>
        </div>
        <div className="flex justify-center gap-3  items-center">
          <Button
            variant="outline"
            onClick={onClose}
            className="w-[100px] h-[36px] text-[13px] !px-0">
            キャンセル
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              onConfirm();
            }}
            className={`w-[100px] h-[36px]`}>
            OK
          </Button>
        </div>
      </Modal>
    );
  },
);

export default ConfirmTerminateVotingModal;
