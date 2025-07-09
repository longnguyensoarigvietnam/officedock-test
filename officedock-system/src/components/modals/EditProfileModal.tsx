'use client';
import {
  ChangeEvent,
  Dispatch,
  memo,
  SetStateAction,
  useEffect,
  useRef,
  useState,
} from 'react';
import { SubmitHandler, useForm } from 'react-hook-form';

import Modal from '@components/common/Modal';
import Button from '@components/common/Button';
import ErrorMessage from '@components/common/ErrorMessage';
import Input from '@components/common/Input';
import CustomUserAvatar from '@components/common/AvatarIcon/CustomUserAvatar';

import { User, UserProfileFormData } from '@interfaces/user';

import { passwordRegisterRules } from '@utils/validators';

import { ALLOWED_IMAGE_TYPES, MAX_AVATAR_IMAGE_FILE_SIZE } from '@constants';

export type EditProfileModalProps = {
  open: boolean;
  editProfileErrorMessages: {
    password?: string;
    fullName?: string;
  };
  authenticatedUser: User | undefined;
  onClose: () => void;
  setEditProfileErrorMessages: Dispatch<
    SetStateAction<{
      password?: string;
      fullName?: string;
    }>
  >;
  onEdit: (data: UserProfileFormData) => void;
  setOpenErrorUploadFileModal: Dispatch<SetStateAction<boolean>>;
};

const EditProfileModal = memo(
  ({
    open,
    editProfileErrorMessages,
    authenticatedUser,
    onClose,
    setEditProfileErrorMessages,
    onEdit,
    setOpenErrorUploadFileModal,
  }: EditProfileModalProps) => {
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const { reset, handleSubmit, register, getValues } =
      useForm<UserProfileFormData>();
    const [previewAvatarUrl, setPreviewAvatarUrl] = useState<string | null>(
      null,
    );
    const [avatarImgFile, setAvatarImgFile] = useState<File | null>(null);

    useEffect(() => {
      if (authenticatedUser) {
        reset({
          email: authenticatedUser.email || '',
          fullName: authenticatedUser.profile.fullName || '',
          password: '',
          id: authenticatedUser.id,
          avatarUrl: authenticatedUser.avatar,
          username: authenticatedUser.username || '',
        });
        setPreviewAvatarUrl(authenticatedUser?.avatar || '');
      }
    }, [authenticatedUser, reset]);

    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;

      if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
        e.target.value = '';
        return;
      }

      if (file.size > MAX_AVATAR_IMAGE_FILE_SIZE) {
        setOpenErrorUploadFileModal(true);
        return;
      }

      const newFile = new File([file], file.name, {
        type: file.type,
      });

      setAvatarImgFile(newFile);

      const url = URL.createObjectURL(newFile);
      setPreviewAvatarUrl(url);
    };

    const onSubmit: SubmitHandler<UserProfileFormData> = (data) => {
      onEdit &&
        onEdit({
          ...data,
          avatar: avatarImgFile,
        });
    };

    return (
      <Modal
        open={open}
        isOutSideAction={false}
        className="font-primary !rounded-xl text-gray-700 !p-0 w-[700px] "
        titleClassName="!text-[14px] !text-[#5B6770] !font-medium"
        headerClassName="bg-[#EBF1F7] !rounded-t-xl !rounded-b-none px-6 py-4"
        closeIconClassName="!bg-white !rounded-full !p-2 !hover:cursor-pointer !shadow-sm"
        closeClassName="!mt-0 opacity-70 !w-4 !h-4 !hover:cursor-pointer"
        contentClass="!w-[700px]"
        onClose={() => {
          onClose();
        }}
        title="プロフィール 編集">
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="mx-8 mb-5">
            <div className="flex items-center mb-5">
              <div className="w-[170px]">
                <input
                  type="file"
                  accept={ALLOWED_IMAGE_TYPES.join(',')}
                  ref={fileInputRef}
                  className="hidden"
                  onChange={(e) => {
                    handleFileChange(e);
                  }}
                />
                <div className="w-[70px] h-[70px] relative">
                  <CustomUserAvatar
                    avatarUrl={previewAvatarUrl || ''}
                    avatarColor={authenticatedUser?.avatarColor || ''}
                    size={70}
                  />
                  <div
                    className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-white text-xs bg-[#77858F] w-[36px] flex items-center justify-center py-1 rounded-[3px] hover:cursor-pointer"
                    onClick={() => {
                      fileInputRef.current?.click();
                    }}>
                    変更
                  </div>
                </div>
              </div>
              <div className="!w-full">
                <p className="text-sm font-medium mb-2">名前</p>
                <Input
                  className={`shadow-none text-[22px] leading-[56px] font-medium !pl-3 flex items-center !py-0 h-[42px] focus:!shadow-none focus:border !border-[#77858F] !border-[1px] rounded-md ${editProfileErrorMessages.fullName && '!border-error'}`}
                  register={register('fullName', {
                    required: true,
                    onChange: () => {
                      setEditProfileErrorMessages((prev) => {
                        return {
                          ...prev,
                          fullName: '',
                        };
                      });
                    },
                  })}
                />
                {editProfileErrorMessages.fullName && (
                  <ErrorMessage
                    error={editProfileErrorMessages.fullName}
                    className="mt-[5px] mb-[5px] text-xs"
                  />
                )}
              </div>
            </div>

            <div className="flex items-center pb-3 mb-3">
              <p className="text-sm font-medium w-[170px] text-left whitespace-nowrap">
                ID｜メールアドレス
              </p>
              <Input
                className="shadow-none text-sm leading-[56px] font-normal !pl-3 flex items-center !py-0 h-[34px] focus:!shadow-none focus:border !border-[#77858F] !border-[1px] rounded-md !opacity-100 hover:cursor-not-allowed"
                value={getValues('username') || getValues('email')}
                disabled={true}
              />
            </div>
            <div className="flex items-center pb-3 mb-3">
              <p className="text-sm font-medium w-[170px] text-left">
                パスワード
              </p>
              <div className="flex flex-col !w-full">
                <Input
                  className={`shadow-none text-sm leading-[56px] font-normal !pl-3 flex items-center !py-0 h-[34px] focus:!shadow-none focus:border !border-[#77858F] !border-[1px] rounded-md ${editProfileErrorMessages.password && '!border-error'}`}
                  register={register('password', {
                    ...passwordRegisterRules(false),
                    onChange: () => {
                      setEditProfileErrorMessages((prev) => {
                        return {
                          ...prev,
                          password: '',
                        };
                      });
                    },
                  })}
                />
                {editProfileErrorMessages.password && (
                  <ErrorMessage
                    error={editProfileErrorMessages.password}
                    className="mt-[5px] mb-[5px] text-xs"
                  />
                )}
              </div>
            </div>
            <div className="flex justify-center gap-3 my-7 items-center">
              <Button variant="outline" onClick={onClose} className="w-[110px]">
                キャンセル
              </Button>
              <Button className="w-[110px] !py-2 !px-0" type="submit">
                保存する
              </Button>
            </div>
          </div>
        </form>
      </Modal>
    );
  },
);

export default EditProfileModal;
