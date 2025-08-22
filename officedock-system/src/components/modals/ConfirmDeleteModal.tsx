import { memo } from 'react';

import Modal from '../common/Modal';
import Button from '../common/Button';
import CustomUserAvatar from '@components/common/AvatarIcon/CustomUserAvatar';

export type ConfirmDeleteModalProps = {
  open: boolean;
  name?: string;
  type: string;
  message?: string;
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
    onConfirm,
    onClose,
  }: ConfirmDeleteModalProps) => {
    return (
      <Modal
        open={open}
        className="font-primary bg-white w-[500px] !rounded-[14px] py-[30px]"
        isOutSideAction={false}
        onClose={onClose}>
        {name && (
          <div className="flex items-center justify-center gap-[5px] mb-7">
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
            <p className="text-black font-medium break-all line-clamp-3 text-[15px] text-center">
              {name}
            </p>
          </div>
        )}
        <div className="text-center mb-10">
          <p className="text-sm text-black leading-6 text-neutral-02">{`この${type}を本当に削除しますか？`}</p>
          <p className="text-[#77858F] font-normal text-[13px] mt-[10px]">
            {message}
          </p>
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
