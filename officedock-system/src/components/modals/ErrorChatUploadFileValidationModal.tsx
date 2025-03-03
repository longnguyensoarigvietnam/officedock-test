import { memo } from 'react';

import Modal from '../common/Modal';
import Button from '../common/Button';

export type ErrorChatUploadFileValidationModalProps = {
  open: boolean;
  message: string;
  onClose: () => void;
};

const ErrorChatUploadFileValidationModal = memo(
  ({
    open,
    message,
    onClose,
  }: ErrorChatUploadFileValidationModalProps) => {
    return (
      <Modal
      open={open}
      className="font-primary bg-white w-[515px] !rounded-2xl py-4"
      onClose={onClose}
      title="エラー">
      <div className="text-sm text-gray-700">
        <p className="leading-6 text-neutral-02">{message}</p>
      </div>
      <div className="border-t mt-4 pt-2 border-solid border-gray-100 gap-4 flex justify-end">
        <Button
          variant="primary"
          onClick={onClose}
          className="w-[107px] rounded-xl h-10">
          OK
        </Button>
      </div>
    </Modal>
    );
  },
);

export default ErrorChatUploadFileValidationModal;
