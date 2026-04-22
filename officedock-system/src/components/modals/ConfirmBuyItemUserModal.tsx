import React from 'react';
import Button from '@components/common/Button';
import ImageRound from '@components/common/ImageRound';
import Modal from '@components/common/Modal';
import { ItemUser } from '@interfaces/shop';

type Props = {
  open: boolean;
  dataItemBuy: ItemUser;
  isWear?: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

const ConfirmBuyItemUserModal = ({
  open,
  isWear = false,
  dataItemBuy,
  onClose,
  onConfirm,
}: Props) => {
  return (
    <Modal
      open={open}
      className="font-primary bg-white w-[678px]  text-black overflow-y-auto !rounded-[20px] !py-7 px-[47px]"
      isOutSideAction={false}
      onClose={onClose}>
      <div className="flex justify-center items-center gap-1">
        {!isWear && (
          <>
            <ImageRound
              name="Badge icon"
              src={'/icons/pearl-confirm.svg'}
              className={`!w-fit !h-fit`}
            />
            <p className="text-[15px] font-bold text-primary">
              {dataItemBuy.price}
            </p>
            <p className="text-sm font-normal">を</p>
          </>
        )}
        <p className="text-[15px] font-bold text-primary">{dataItemBuy.name}</p>
        <p className="text-sm font-normal">
          {' '}
          {isWear ? 'に変更しますか？' : 'に交換しますか？'}
        </p>
      </div>
      <div className="flex justify-center mt-8">
        <div className="flex w-[220px] p-[22px] h-[220px] items-center justify-center bg-white rounded-[20px] border border-[#D2DBE1]">
          <ImageRound
            name={`buy icon`}
            src={dataItemBuy.cropFile || '/images/users/hat-demo.png'}
            width={56}
            height={56}
            className="rounded-full !w-full !h-auto object-contain"
          />
        </div>
      </div>

      <div className="mt-8 flex justify-center gap-[10px]">
        <Button
          onClick={onClose}
          variant="outline"
          className="w-[100px] h-9 !px-0">
          キャンセル
        </Button>
        <Button
          onClick={onConfirm}
          variant="post"
          className="w-[100px] h-9 !px-0">
          {isWear ? '変更する' : '交換する'}
        </Button>
      </div>
    </Modal>
  );
};

export default ConfirmBuyItemUserModal;
