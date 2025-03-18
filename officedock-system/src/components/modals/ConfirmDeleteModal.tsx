import { memo } from 'react';

import Modal from '../common/Modal';
import Button from '../common/Button';

export type ConfirmDeleteModalProps = {
  open: boolean;
  name?: string;
  type: string;
  message?: string;
  onConfirm: () => void;
  onClose: () => void;
};

const ConfirmDeleteModal = memo(
  ({ open, name, type, message, onConfirm, onClose }: ConfirmDeleteModalProps) => {
    return (
      <Modal
        open={open}
        className="font-primary bg-white w-[515px] !rounded-xl py-4"
        isOutSideAction={false}
        onClose={onClose}>
        <p className="text-black font-medium text-[16px] mb-5 text-center">{name}</p>
        <div className="text-center mb-10">
          <p className="text-sm text-black leading-6 text-neutral-02 mb-1">{`この${type}を本当に削除しますか？`}</p>
          <p className="text-[#77858F] font-normal text-[13px]">
            {message}
          </p>
        </div>

        <div className="flex justify-center gap-3 mb-3 items-center">
          <Button variant="outline" onClick={onClose} className="w-[110px]">
            キャンセル
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              onConfirm();
            }}
            className={`w-[110px]`}>
            OK
          </Button>
        </div>
      </Modal>
    );
  },
);

export default ConfirmDeleteModal;
