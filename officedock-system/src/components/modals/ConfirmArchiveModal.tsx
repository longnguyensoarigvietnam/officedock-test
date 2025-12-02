import { memo } from 'react';

import Modal from '../common/Modal';
import Button from '../common/Button';

export type ConfirmArchiveModalProps = {
  open: boolean;
  name?: string;
  question: string;
  message?: string;
  onConfirm: () => void;
  onClose: () => void;
};

const ConfirmArchiveModal = memo(
  ({
    open,
    name,
    question,
    message,
    onConfirm,
    onClose,
  }: ConfirmArchiveModalProps) => {
    return (
      <Modal
        open={open}
        className="font-primary bg-white w-[500px] !rounded-[20px] pt-[34px] pb-[30px] !px-20"
        isOutSideAction={false}
        onClose={onClose}>
        <p className="text-black font-medium break-all line-clamp-3 text-base text-center mb-[30px]">
          {name}
        </p>
        <div className="text-center mb-10">
          {question ? (
            <p className="text-sm text-black leading-[22px] text-neutral-02">
              {question}
            </p>
          ) : (
            <></>
          )}
          {message ? (
            <p className="text-[#77858F] font-normal text-[13px] mt-[14px]">
              {message}
            </p>
          ) : (
            <></>
          )}
        </div>
        <div className="flex justify-center gap-[10px] items-center">
          <Button
            variant="outline"
            onClick={onClose}
            className="w-[100px] h-[36px] text-sm !px-0">
            キャンセル
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              onConfirm();
            }}
            className={`w-[100px] h-[36px] text-sm !px-0`}>
            OK
          </Button>
        </div>
      </Modal>
    );
  },
);

export default ConfirmArchiveModal;
