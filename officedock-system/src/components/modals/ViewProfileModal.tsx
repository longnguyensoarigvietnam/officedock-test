'use client';
import { memo } from 'react';

import Modal from '@components/common/Modal';
import { User } from '@interfaces/user';
import ImageRound from '@components/common/ImageRound';
import Button from '@components/common/Button';
import CustomUserAvatar from '@components/common/AvatarIcon/CustomUserAvatar';

export type ViewProfileModalProps = {
  open: boolean;
  onClose: () => void;
  authenticatedUser: User | undefined;
  openEditModal: () => void;
};

const ViewProfileModal = memo(
  ({
    open,
    onClose,
    authenticatedUser,
    openEditModal,
  }: ViewProfileModalProps) => {
    return (
      <Modal
        open={open}
        isOutSideAction={false}
        className="font-primary !rounded-[20px] text-gray-700 !p-0 w-[700px] "
        titleClassName="!text-[14px] !text-[#5B6770] !font-medium"
        headerClassName="bg-[#EBF1F7] !rounded-t-[20px] !rounded-b-none px-6 py-4"
        closeIconClassName="!bg-white !rounded-full !p-2 !hover:cursor-pointer !shadow-sm"
        closeClassName="!mt-0 opacity-70 !w-4 !h-4 !hover:cursor-pointer"
        contentClass="!w-[700px] !rounded-[20px]"
        onClose={() => {
          onClose();
        }}
        title="プロフィール">
        <div className="mx-8 mb-5">
          <div className="flex justify-between items-center mb-5">
            <div className="flex items-center gap-3 max-w-[calc(100%_-_100px)]">
              <div className="min-w-[70px]">
                {authenticatedUser ? (
                  <CustomUserAvatar
                    avatarUrl={authenticatedUser?.avatar || ''}
                    avatarColor={authenticatedUser?.avatarColor || ''}
                    size={70}
                  />
                ) : (
                  <ImageRound
                    className="w-[70px] h-[70px] hover:opacity-70"
                    src="/images/avatar-default.svg"
                    border="full"
                    name="Avatar user"
                  />
                )}
              </div>

              <div className="flex gap-3 items-center pr-3 border-r-[1px] border-r-[#D2DBE1]">
                <p className="text-[#77858F] text-sm font-medium whitespace-nowrap">
                  名前
                </p>
                <p className="text-black text-[16px] font-medium max-w-full break-all text-justify">
                  {authenticatedUser?.profile?.fullName || ''}
                </p>
              </div>
              <div className="flex gap-2 items-center">
                <p className="text-[#77858F] text-sm font-medium">ID</p>
                <p className="text-black text-[16px] font-medium">
                  {authenticatedUser?.id || ''}
                </p>
              </div>
            </div>
            <Button
              className="w-[56px] min-w-[56px] !py-2 !px-0"
              onClick={openEditModal}>
              編集
            </Button>
          </div>

          <div className="flex gap-3 items-center pb-3 mb-3 border-b-[1px] border-b-[#D2DBE1]">
            <p className="text-[#77858F] text-sm font-medium w-[130px] text-left">
              ID｜メールアドレス
            </p>
            <p className="text-black text-[16px] text-justify font-medium break-all max-w-[calc(100%_-_142px)]">
              {authenticatedUser?.email || authenticatedUser?.username || ''}
            </p>
          </div>
          <div className="flex gap-3 items-center pb-3 mb-3 border-b-[1px] border-b-[#D2DBE1]">
            <p className="text-[#77858F] text-sm font-medium w-[130px] text-left">
              パスワード
            </p>
            <p className="text-black text-[16px] text-left font-medium">
              ********
            </p>
          </div>
          <div className="flex gap-3 items-center pb-3 mb-3 border-b-[1px] border-b-[#D2DBE1]">
            <p className="text-[#77858F] text-sm font-medium w-[130px] text-left">
              メインチーム
            </p>
            <p className="text-black text-[16px] text-justify font-medium break-all max-w-[calc(100%_-_142px)]">
              {authenticatedUser?.organizations?.find((org) => org.isMain)
                ?.name || ''}
            </p>
          </div>
          <div className="flex gap-3 items-center pb-3">
            <p className="text-[#77858F] text-sm font-medium w-[130px] text-left">
              サブチーム
            </p>
            <p className="text-black text-[16px] font-medium break-all max-w-[calc(100%_-_142px)] text-justify">
              {authenticatedUser?.organizations
                ?.filter((org) => !org.isMain)
                ?.map((org) => org.name)
                ?.join('/ ') || ''}
            </p>
          </div>
        </div>
      </Modal>
    );
  },
);

export default ViewProfileModal;
