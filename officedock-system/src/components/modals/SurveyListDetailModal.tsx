import Button from '@components/common/Button';
import Modal from '@components/common/Modal';
import React from 'react';

type Props = {
  open: boolean;
  onClose: () => void;
};

const SurveyListDetailModal = ({ open, onClose }: Props) => {
  return (
    <Modal
      open={open}
      className="font-primary bg-white w-[500px] !rounded-lg py-[30px]"
      isOutSideAction={false}
      onClose={onClose}>
      <div className="flex justify-center gap-3  items-center">
        <Button variant="text" onClick={onClose} className="">
          閉じる
        </Button>
      </div>
    </Modal>
  );
};

export default SurveyListDetailModal;
