import React from 'react';

import Button from '@components/common/Button';
import Modal from '@components/common/Modal';

type Props = {
  open: boolean;
  type?: string;
  onClose: () => void;
};

const SuccessMVPVotingModal = ({ open, onClose }: Props) => {
  return (
    <Modal
      open={open}
      className="font-primary bg-white w-[400px] !rounded-[20px] h-[130px] !py-10"
      isOutSideAction={false}
      onClose={onClose}>
      <div className="flex flex-col gap-[30px]">
        <p className="leading-none text-sm text-black text-center">
          投票しました
        </p>
        <div className="flex justify-center">
          <Button
            variant="text"
            onClick={onClose}
            className="bg-transparent !text-[#B58F42] !leading-none w-[100px] rounded-lg !p-0">
            閉じる
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default SuccessMVPVotingModal;
