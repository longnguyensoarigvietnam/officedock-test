import { memo } from 'react';
import Modal from '@components/common/Modal';
import Button from '@components/common/Button';

export type ConfirmDeleteModalProps = {
  open: boolean;
  name: string;
  onConfirm: () => void;
  onClose: () => void;
};

const ConfirmDeletePaymentModal = memo(
  ({ open, name, onConfirm, onClose }: ConfirmDeleteModalProps) => {
    return (
      <Modal
        open={open}
        className="font-primary bg-white w-[500px] !rounded-[20px] py-[30px]"
        isOutSideAction={false}
        onClose={onClose}>
        <div className="text-center mb-10">
          <p className="text-base font-medium text-black leading-6 text-neutral-02">{`カード番号：************${name}`}</p>
          <p className="text-black font-normal text-sm mt-6">
            このカード情報を本当に削除しますか？
          </p>
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

export default ConfirmDeletePaymentModal;
