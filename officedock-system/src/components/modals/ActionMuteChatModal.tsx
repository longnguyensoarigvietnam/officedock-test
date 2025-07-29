import { memo } from 'react';

import Modal from '../common/Modal';
import ImageRound from '@components/common/ImageRound';
import Checkbox from '@components/common/Checkbox';

export type ActionMuteChatModalProps = {
  open: boolean;
  isMuteChat: boolean;
  isLoadingMute: boolean;
  onConfirm: (check: boolean) => void;
  onClose: () => void;
};

const ActionMuteChatModal = memo(
  ({
    open,
    isMuteChat = false,
    isLoadingMute = false,
    onConfirm,
    onClose,
  }: ActionMuteChatModalProps) => {
    return (
      <Modal
        open={open}
        className="font-primary bg-white w-[500px] !rounded-lg !px-0 !py-0 overflow-hidden"
        isOutSideAction={false}
        onClose={onClose}>
        <header className="bg-[#EBF1F7] h-[50px] text-[#5B6770] text-sm font-medium px-5 flex items-center justify-between">
          <p>通知</p>
          <div
            className={` w-[30px] h-[30px] flex items-center justify-center rounded-full bg-white`}>
            <ImageRound
              className={` w-5 h-5 hover:cursor-pointer `}
              src="/icons/close.svg"
              name="Close modal"
              onClick={onClose}
            />
          </div>
        </header>
        <div className="px-10 py-[30px]">
          <div>
            <Checkbox
              label="このグループチャットをミュートする"
              isChecked={isMuteChat}
              disable={isLoadingMute}
              onChange={(data) => {
                onConfirm(data);
              }}
            />
          </div>
          <p className="text-[13px] font-normal text-[#77858F] mt-[14px]">
            ミュートにするとこのグループに届いたメッセージを通知しません。
          </p>
        </div>
      </Modal>
    );
  },
);

export default ActionMuteChatModal;
