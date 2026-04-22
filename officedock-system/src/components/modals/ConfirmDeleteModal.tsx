import { memo } from 'react';

import Modal from '../common/Modal';
import Button from '../common/Button';
import CustomUserAvatar from '@components/common/AvatarIcon/CustomUserAvatar';

export type ConfirmDeleteModalProps = {
  open: boolean;
  name?: string;
  type?: string;
  classNameMsg?: string;
  classNameMsg2?: string;
  message?: string;
  message2?: string;
  userColor?: string;
  userAvatarUrl?: string | undefined;
  onConfirm: () => void;
  onClose: () => void;
};

const ConfirmDeleteModal = memo(
  ({
    open,
    name,
    type,
    userColor,
    userAvatarUrl,
    message,
    message2,
    classNameMsg,
    classNameMsg2,
    onConfirm,
    onClose,
  }: ConfirmDeleteModalProps) => {
    return (
      <Modal
        open={open}
        className="font-primary bg-white w-[500px] !rounded-[20px] py-[30px]"
        isOutSideAction={false}
        onClose={onClose}>
        {name && (
          <div className="flex items-center justify-center gap-[5px] mb-[30px]">
            {userColor && (
              <div className="w-[34px] h-[34px] min-w-[34px]">
                <CustomUserAvatar
                  avatarUrl={userAvatarUrl || ''}
                  avatarColor={userColor || ''}
                  size={34}
                  customClassName={`${!userAvatarUrl && 'relative top-[0px]'}`}
                />
              </div>
            )}
            <p className="text-black font-medium break-all line-clamp-3 text-[16px] text-center leading-[1]">
              {name}
            </p>
          </div>
        )}
        <div className="text-center mb-10">
          {type && (
            <p className="text-sm text-black leading-6 text-neutral-02">{`この${type}を本当に削除しますか？`}</p>
          )}
          <p
            className={`text-[#77858F] font-normal text-[13px] mt-[10px] ${classNameMsg}`}>
            {message}
          </p>
          {message2 && (
            <p
              className={`text-[#77858F] font-normal text-[13px] ${classNameMsg2}`}>
              {message2}
            </p>
          )}
        </div>
        <div className="flex justify-center gap-3  items-center">
          <Button
            variant="outline"
            onClick={onClose}
            className="w-[100px] h-[36px] text-[13px] !px-0">
            キャンセル
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              onConfirm();
            }}
            className={`w-[100px] h-[36px]`}>
            OK
          </Button>
        </div>
      </Modal>
    );
  },
);

export default ConfirmDeleteModal;
