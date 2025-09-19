import React from 'react';
import Button from '@components/common/Button';
import Modal from '@components/common/Modal';

type Props = {
  open: boolean;
};

const ActionModalSuccessItem = ({ open }: Props) => {
  if (!open) return null;

  const handleReload = () => {
    window.location.reload();
  };
  return (
    <Modal
      open={open}
      className="font-primary bg-white w-[400px]  text-black overflow-y-auto !rounded-[20px] !py-8 px-[47px]"
      isOutSideAction={false}
      onClose={() => {}}>
      <div className="flex justify-center flex-col ">
        <p className="text-center text-sm font-normal">
          接続が一時的に中断されました。
        </p>
        <p className="text-center text-sm  font-normal">
          ページをリロードしてください。
        </p>
      </div>

      <div className="mt-6 flex justify-center gap-[10px]">
        <Button
          onClick={handleReload}
          variant="primary"
          className="w-[100px] h-9 !px-0">
          リロード
        </Button>
      </div>
    </Modal>
  );
};

export default ActionModalSuccessItem;
