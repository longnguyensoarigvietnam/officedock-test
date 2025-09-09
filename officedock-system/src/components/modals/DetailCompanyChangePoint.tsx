import React from 'react';
import Button from '@components/common/Button';
import ImageRound from '@components/common/ImageRound';
import Modal from '@components/common/Modal';

type Props = {
  open: boolean;
  onClose: () => void;
};

const DataCompanyPointChangeModal = ({ open, onClose }: Props) => {
  return (
    <Modal
      open={open}
      className="font-primary bg-white w-[678px]  text-black overflow-y-auto !rounded-[20px] !py-7 px-[47px]"
      isOutSideAction={false}
      onClose={onClose}>
      <div className="flex justify-center">
        <ImageRound
          name="Badge icon"
          src={'/icons/badge.svg'}
          className={`w-7 h-7`}
        />
      </div>
      <p className="text-sm font-normal text-center mt-5">
        コインを交換しますか？
      </p>
      <p className="text-sm font-normal text-center mt-1">
        様々なポイントに交換できます！
      </p>
      <div
        style={{
          boxShadow: '0px 0px 10px 0px #00000040',
        }}
        className="mt-10 w-fit h-fit !rounded-md">
        <ImageRound
          name="demo total coin"
          src={'/images/company-point.png'}
          className={`w-fit h-fit !rounded-md`}
        />
      </div>

      <div className="mt-10 flex justify-center gap-[10px]">
        <Button onClick={onClose} variant="outline" className="w-[128px] h-9">
          キャンセル
        </Button>
        <Button onClick={onClose} variant="post" className="w-[128px] h-9">
          交換する
        </Button>
      </div>
    </Modal>
  );
};

export default DataCompanyPointChangeModal;
