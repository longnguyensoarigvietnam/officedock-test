'use client';
import { memo } from 'react';

import Modal from '@components/common/Modal';
import ImageRound from '@components/common/ImageRound';
import Button from '@components/common/Button';
import CustomUserAvatar from '@components/common/AvatarIcon/CustomUserAvatar';
import {
  SkeletonContainer,
  SkeletonElement,
} from '@components/common/SkeletonLoading';

import useAuthenticatedUser from '@hooks/useAuthenticatedUser';

import { hasFullPaymentPermissions } from '@utils';

import { useSessionCache } from '@providers/SessionCacheProvider';

export type ViewProfileModalProps = {
  open: boolean;
  onClose: () => void;
  openEditModal: () => void;
};

const ViewProfileModal = memo(
  ({ open, onClose, openEditModal }: ViewProfileModalProps) => {
    const { authenticatedUser, isFetchingAuthenticatedUser } =
      useAuthenticatedUser({});
    const { data: session } = useSessionCache();

    return (
      <Modal
        open={open}
        isOutSideAction={false}
        className="font-primary !rounded-[20px] text-black !p-0 w-[700px]"
        titleClassName="!text-[14px] !text-[#5B6770] !font-medium"
        contentClass="!rounded-[20px]"
        headerClassName="bg-[#EBF1F7] !rounded-t-[20px] !rounded-b-none px-5 !py-[10px]"
        closeIconClassName="!bg-white !rounded-full !p-[7px] !hover:cursor-pointer"
        closeClassName="!mt-0 !w-4 !h-4 !hover:cursor-pointer"
        fixedClass="!z-[60]"
        onClose={() => {
          onClose();
        }}
        title="プロフィール">
        {isFetchingAuthenticatedUser ? (
          <SkeletonContainer className="w-full !bg-[#F8FAFC] !px-8 !pb-5">
            <div className="flex items-center gap-2">
              <SkeletonElement className="!w-12 !h-12 !rounded-full" />
              <div className="flex flex-col gap-2">
                <SkeletonElement className="!w-[103px]" />
                <SkeletonElement className="!w-[248px]" />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <SkeletonElement className="!h-10" />
              <SkeletonElement className="!h-10" />
            </div>
            <div className="flex flex-col gap-2">
              <SkeletonElement className="!h-10" />
              <SkeletonElement className="!h-10" />
            </div>
          </SkeletonContainer>
        ) : (
          <div className="mx-8 mb-5">
            <div className="flex justify-between items-center mb-5">
              <div className="flex items-center gap-5 max-w-[calc(100%_-_100px)]">
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

                <div className="flex gap-[10px] items-center ">
                  <p className="text-[#77858F] text-sm font-medium whitespace-nowrap">
                    名前
                  </p>
                  <p className="text-black text-[16px] font-medium max-w-full break-all text-justify">
                    {authenticatedUser?.profile?.fullName || ''}
                  </p>
                </div>
                <div className="w-[1px] h-[16px] bg-[#D2DBE1]"></div>

                <div className="flex gap-[10px] items-center">
                  <p className="text-[#77858F] text-sm font-medium">ID</p>
                  <p className="text-black text-[16px] font-medium">
                    {authenticatedUser?.id || ''}
                  </p>
                </div>
              </div>
              {session &&
              hasFullPaymentPermissions(session.user.permissions) ? (
                <></>
              ) : (
                <Button
                  className="w-[56px] min-w-[56px] !h-[30px] !py-2 !px-0"
                  onClick={openEditModal}>
                  編集
                </Button>
              )}
            </div>

            <div className="flex gap-3 items-center pb-5 mb-5 border-b-[1px] border-b-[#D2DBE1] leading-[1]">
              <p className="text-[#77858F] text-sm font-medium w-[130px] text-left">
                ID｜メールアドレス
              </p>
              <p className="text-black text-[16px] text-justify font-medium break-all max-w-[calc(100%_-_142px)]">
                {authenticatedUser?.email || authenticatedUser?.username || ''}
              </p>
            </div>
            <div className="flex gap-3 items-center pb-5 mb-5 border-b-[1px] border-b-[#D2DBE1] leading-[1]">
              <p className="text-[#77858F] text-sm font-medium w-[130px] text-left">
                パスワード
              </p>
              <p className="text-black text-[16px] text-left font-medium">
                ********
              </p>
            </div>
            <div className="flex gap-3 items-center pb-5 mb-5 border-b-[1px] border-b-[#D2DBE1] leading-[1]">
              <p className="text-[#77858F] text-sm font-medium w-[130px] text-left">
                メインチーム
              </p>
              <p className="text-black text-[16px] text-justify font-medium break-all max-w-[calc(100%_-_142px)]">
                {authenticatedUser?.organizations?.find((org) => org.isMain)
                  ?.name || ''}
              </p>
            </div>
            <div className="flex gap-3 items-center pb-1 leading-[1]">
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
        )}
      </Modal>
    );
  },
);

export default ViewProfileModal;
