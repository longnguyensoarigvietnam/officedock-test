import { memo } from 'react';

import Modal from '../common/Modal';
import Button from '../common/Button';

export type WarningDeadlineTaskModalProps = {
  open: boolean;
  title: string;
  remindType?: string;
  remindCountdown?: number;
  onConfirm: () => void;
  onClose: () => void;
};

const WarningDeadlineTaskModal = memo(
  ({
    open,
    title,
    remindCountdown,
    remindType,
    onConfirm,
    onClose,
  }: WarningDeadlineTaskModalProps) => {
    return (
      <Modal
        open={open}
        contentClass="items-baseline"
        className="font-primary w-[375px] !rounded-2xl py-[30px] bg-[#5B6770] border-none "
        onClose={() => {}}
        title="">
        <div className="text-base font-medium text-white items-baseline">
          <p className="leading-6 text-neutral-02 text-center break-all">
            {title} 締切 {remindCountdown}
            {remindType} です
          </p>
        </div>
        <div className=" mt-3 pt-2 text-sm font-medium  gap-4 flex justify-center">
          <Button
            variant="secondary"
            onClick={onClose}
            className="bg-transparent text-[13px] text-white w-[100px] rounded-md h-9 hover:bg-transparent hover:opacity-70">
            閉じる
          </Button>
          <Button
            variant="secondary"
            onClick={onConfirm}
            className={`w-[100px] !text-[#5B6770] hover:opacity-80 !bg-white rounded-md h-9`}>
            確認する
          </Button>
        </div>
      </Modal>
    );
  },
);

export default WarningDeadlineTaskModal;
