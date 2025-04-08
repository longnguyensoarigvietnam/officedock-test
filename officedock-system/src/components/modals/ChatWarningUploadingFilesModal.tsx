import { memo } from 'react';

import Modal from '../common/Modal';
import Button from '../common/Button';

export type ChatWarningUploadingFilesModalProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

const ChatWarningUploadingFilesModal = memo(
  ({ open, onClose, onConfirm }: ChatWarningUploadingFilesModalProps) => {
    return (
      <Modal
        open={open}
        className="font-primary bg-white w-[515px] !rounded-2xl py-4"
        onClose={onClose}
        title="確認">
        <div className="text-sm text-gray-700">
          <p className="leading-6 text-neutral-02">
            他のページに遷移すると、現在アップロード中のファイルが中止されますが、よろしいでしょうか？
          </p>
        </div>
        <div className="flex justify-center gap-3 mb-3 mt-5 items-center">
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

export default ChatWarningUploadingFilesModal;
