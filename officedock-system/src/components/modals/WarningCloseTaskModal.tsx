import { memo } from 'react';

import Modal from '../common/Modal';
import Button from '../common/Button';

export type WarningCloseTaskModalProps = {
  open: boolean;
  onConfirm: () => void;
  onClose: () => void;
  onCloseByIcon: () => void;
  confirmText?: string;
  cancelText?: string;
  hideCancel?: boolean;
};

const WarningCloseTaskModal = memo(
  ({
    open,
    onConfirm,
    onClose,
    onCloseByIcon,
    confirmText = 'はい',
    cancelText = 'いいえ',
    hideCancel = false,
  }: WarningCloseTaskModalProps) => {
    return (
      <Modal
        open={open}
        className="font-primary bg-white w-[515px] !rounded-2xl py-4"
        onClose={onCloseByIcon}
        isOutSideAction={false}
        title="確認">
        <div className="text-sm text-gray-700">
          <p className="leading-6 text-neutral-02">変更を保存しますか？</p>
        </div>
        <div className="border-t mt-4 pt-2  border-solid border-gray-100 gap-4 flex justify-end">
          {!hideCancel && (
            <Button
              variant="secondary"
              onClick={onClose}
              className="bg-transparent w-[107px] rounded-xl h-10">
              {cancelText}
            </Button>
          )}
          <Button
            variant="primary"
            onClick={onConfirm}
            className={`w-[107px] rounded-xl h-10`}>
            {confirmText}
          </Button>
        </div>
      </Modal>
    );
  },
);

export default WarningCloseTaskModal;
