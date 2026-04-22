import React from 'react';
import Button from '@components/common/Button';
import Modal from '@components/common/Modal';

type Props = {
  open: boolean;
  isWear?: boolean;
  onClose: () => void;
};

const ActionModalSuccessItem = ({ open, isWear = false, onClose }: Props) => {
  return (
    <Modal
      open={open}
      className="font-primary bg-white w-[400px]  text-black overflow-y-auto !rounded-[20px] !py-8 px-[47px]"
      isOutSideAction={false}
      onClose={onClose}>
      <div className="flex justify-center ">
        <p className="text-center text-sm font-normal">
          {isWear ? '変更しました' : '交換しました'}
        </p>
      </div>

      <div className="mt-6 flex justify-center gap-[10px]">
        <Button
          onClick={onClose}
          variant="text"
          className="w-[100px] h-9 !px-0">
          閉じる
        </Button>
      </div>
    </Modal>
  );
};

export default ActionModalSuccessItem;
