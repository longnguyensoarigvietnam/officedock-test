import React from 'react';

import Button from '@components/common/Button';
import Modal from '@components/common/Modal';

type Props = {
  open: boolean;
  type?: string;
  onClose: () => void;
  onTwice: () => void;
};

const SuccessSurveyActionModal = ({ open, onClose, onTwice }: Props) => {
  return (
    <Modal
      open={open}
      className="font-primary bg-white w-[400px] !rounded-2xl !py-10"
      onClose={onClose}>
      <div className="text-sm text-black">
        <p className="leading-6 text-neutral-02 text-center">{`アンケートを投稿しました`}</p>
      </div>
      <div className=" mt-7 gap-[10px] flex justify-center">
        <Button
          variant="outline"
          onClick={onClose}
          className="bg-transparent w-[100px] rounded-lg h-9">
          閉じる
        </Button>
        <Button
          variant="post"
          onClick={onTwice}
          className={`w-[147px] rounded-lg h-9`}>
          つぶやきでシェア
        </Button>
      </div>
    </Modal>
  );
};

export default SuccessSurveyActionModal;
