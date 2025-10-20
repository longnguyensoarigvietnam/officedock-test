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
import { ERROR_LONG_FIELD_MESSAGE } from '@constants/message';

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
    const {
      reset,
      handleSubmit,
      register,
      getValues,
      formState: { errors, isDirty },
    } = useForm<UserProfileFormData>();
    const [previewAvatarUrl, setPreviewAvatarUrl] = useState<string | null>(
      null,
    );
    const [avatarImgFile, setAvatarImgFile] = useState<File | null>(null);
    const [isAvatarChanged, setIsAvatarChanged] = useState<boolean>(false);

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
      setIsAvatarChanged(true);

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
        className="font-primary !rounded-[20px] text-black !p-0 w-[700px]"
        titleClassName="!text-[14px] !text-[#5B6770] !font-medium"
        contentClass="!rounded-[20px]"
        headerClassName="bg-[#EBF1F7] !rounded-t-[20px] !rounded-b-none px-5 !py-[10px]"
        closeIconClassName="!bg-white !rounded-full !p-[7px] !hover:cursor-pointer"
        closeClassName="!mt-0 !w-4 !h-4 !hover:cursor-pointer"
        onClose={() => {
          onClose();
        }}
        title="プロフィール">
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="mx-[30px]">
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
                <p className="text-sm font-medium mb-3 leading-none">名前</p>
                <Input
                  className={`shadow-none text-[22px] leading-[56px] font-medium !pl-3 flex items-center !py-0 h-[42px] focus:!shadow-none focus:border !border-[#77858F] !border-[1px] rounded-md ${editProfileErrorMessages.fullName && '!border-error'}`}
                  register={register('fullName', {
                    required: true,
                    maxLength: {
                      value: 255,
                      message: ERROR_LONG_FIELD_MESSAGE,
                    },
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

            <div className="flex items-center mb-5">
              <p className="text-sm font-medium w-[170px] text-left whitespace-nowrap">
                ID｜メールアドレス
              </p>
              <Input
                className="shadow-none text-sm leading-[56px] font-normal !pl-3 flex items-center !py-0 h-[34px] focus:!shadow-none focus:border !border-[#77858F] !border-[1px] rounded-md !opacity-100 hover:cursor-not-allowed"
                value={getValues('username') || getValues('email')}
                disabled={true}
              />
            </div>
            <div className="flex items-center">
              <p className="text-sm font-medium w-[170px] text-left">
                パスワード
              </p>
              <div className="flex flex-col !w-full">
                <Input
                  className={`shadow-none text-sm leading-[56px] font-normal !pl-3 flex items-center !py-0 h-[34px] focus:!shadow-none focus:border !border-[1px] rounded-md ${errors?.password?.message || editProfileErrorMessages.password ? '!border-error' : '!border-[#77858F]'}`}
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
                {errors?.password?.message ||
                editProfileErrorMessages.password ? (
                  <ErrorMessage
                    error={
                      errors?.password?.message ||
                      editProfileErrorMessages.password
                    }
                    className="mt-[5px] mb-[5px] !text-xs"
                  />
                ) : (
                  <></>
                )}
              </div>
            </div>
            <div className="flex justify-center gap-[10px] my-[30px] items-center">
              <Button
                variant="outline"
                onClick={onClose}
                className="!w-[100px] !h-[36px] !p-0 !text-sm !font-medium">
                キャンセル
              </Button>
              <Button
                className="!w-[100px] !h-[36px] !p-0 !border-none !text-sm !font-medium"
                type="submit"
                disabled={!isDirty && !isAvatarChanged}>
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
