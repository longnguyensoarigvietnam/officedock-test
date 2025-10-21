'use client';
import {
  ChangeEvent,
  Dispatch,
  memo,
  SetStateAction,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useMutation } from 'react-query';
import { AxiosError } from 'axios';

import Modal from '../common/Modal';
import ImageRound from '@components/common/ImageRound';
import Button from '@components/common/Button';
import InputSearch from '@components/common/InputSearch';
import TableDropdown from '@components/common/Dropdown/TableDropdown';
import { DynamicTooltip } from '@components/tooltip/DynamicTooltip';
import CustomUserAvatar from '@components/common/AvatarIcon/CustomUserAvatar';
import Input from '@components/common/Input';
import GroupIconWithDynamicColor from '@components/common/GroupIcon';

import { apiRouters } from '@constants/routers';
import {
  ALLOWED_IMAGE_TYPES,
  MAX_AVATAR_IMAGE_FILE_SIZE,
  NO_OPTIONS,
} from '@constants';
import { ChatRoomType, PermissionsSystem } from '@constants/enums';
import {
  ERROR_LONG_FIELD_MESSAGE,
  ERROR_UPDATE_MESSAGE,
  SUCCESS_UPDATE_MESSAGE,
  UPLOAD_AVATAR_FILE_MAXIMUM_SIZE,
} from '@constants/message';

import { ChatParticipant, ChatRoomDetail } from '@interfaces/chat';
import { Profile } from '@interfaces/user';
import { OptionDropdownType } from '@interfaces/common';

import { useErrorToast } from '@hooks/useErrorToast';

import { useSessionCache } from '@providers/SessionCacheProvider';
import { useToast } from '@providers/ToastProvider';
import { LoadingContext } from '@providers/LoadingProvider';

import { hasPermissionInArray } from '@utils';

import api from '@base/api';

export type ChatSettingModalProps = {
  open: boolean;
  chatRoomDetail: ChatRoomDetail | undefined;
  code: string;
  dashboardMemberList: Omit<Profile, 'birthday' | 'gender'>[];
  setOpenErrorUploadFileModal: Dispatch<
    SetStateAction<{
      status: boolean;
      message: string;
    }>
  >;
  onClose: () => void;
  openAddMemberModal: () => void;
  openConfirmRemoveModal: (id: number) => void;
};

const ChatSettingModal = memo(
  ({
    open,
    chatRoomDetail,
    code,
    dashboardMemberList,
    setOpenErrorUploadFileModal,
    onClose,
    openAddMemberModal,
    openConfirmRemoveModal,
  }: ChatSettingModalProps) => {
    const { data: session } = useSessionCache();

    const fileInputRef = useRef<HTMLInputElement | null>(null);

    const [previewAvatarUrl, setPreviewAvatarUrl] = useState<string | null>(
      chatRoomDetail?.avatar || null,
    );
    const [avatarImgFile, setAvatarImgFile] = useState<File | null>(null);
    const [searchName, setSearchName] = useState<string>('');
    const { showToast } = useToast();
    const showErrorToast = useErrorToast();
    const { setIsLoading } = useContext(LoadingContext);
    const { register, setValue, watch, control } = useForm<{
      groupName: string;
      groupParticipant: ChatParticipant[];
      role: OptionDropdownType;
    }>({
      defaultValues: {
        role: {
          label: '管理者',
          value: '管理者',
        },
      },
    });
    const roleOptions = [
      {
        label: '管理者',
        value: '管理者',
      },
      {
        label: '一般',
        value: '一般',
      },
    ];

    const handleUpdateGroupDetail = async (data: {
      name: string;
      avatar: File | null;
    }) => {
      setIsLoading(true);
      const formData = new FormData();
      formData.append('name', data.name);
      if (data.avatar) formData.append('avatar', data.avatar);
      const response = await api.patch(apiRouters.CHAT_DETAIL(code), formData);
      return response;
    };

    const { mutate: updateGroupDetail } = useMutation(
      'updateGroupDetail',
      handleUpdateGroupDetail,
      {
        onSuccess: () => {
          showToast({
            description: SUCCESS_UPDATE_MESSAGE,
          });
        },
        onError: (error: AxiosError<any>) => {
          showErrorToast(error, ERROR_UPDATE_MESSAGE);
        },
        onSettled: () => {
          onClose();
          setIsLoading(false);
        },
      },
    );

    const handleConfirmUpdateGroupDetail = () => {
      updateGroupDetail({
        name: watch('groupName') as string,
        avatar: avatarImgFile,
      });
    };

    useEffect(() => {
      if (chatRoomDetail?.name) {
        setValue('groupName', chatRoomDetail.name);
      }
    }, [chatRoomDetail, setValue]);

    const renderAvatar = (memberId: number) => {
      const memberInfo = dashboardMemberList.find((member) => {
        return member.id == memberId;
      });

      return (
        <div>
          <CustomUserAvatar
            avatarUrl={memberInfo?.avatar || ''}
            avatarColor={memberInfo?.avatarColor || ''}
            size={30}
          />
        </div>
      );
    };

    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;

      if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
        e.target.value = '';
        return;
      }

      if (file.size > MAX_AVATAR_IMAGE_FILE_SIZE) {
        setOpenErrorUploadFileModal({
          status: true,
          message: UPLOAD_AVATAR_FILE_MAXIMUM_SIZE,
        });
        return;
      }

      const newFile = new File([file], file.name, {
        type: file.type,
      });

      setAvatarImgFile(newFile);

      const url = URL.createObjectURL(newFile);
      setPreviewAvatarUrl(url);
    };

    return (
      <Modal
        open={open}
        isOutSideAction={false}
        className="font-primary !rounded-[20px] text-black !p-0 w-[500px]"
        titleClassName="!text-[14px] !text-[#5B6770] !font-medium"
        contentClass="!rounded-[20px]"
        headerClassName="bg-[#EBF1F7] !rounded-t-[20px] !rounded-b-none px-5 !py-[10px]"
        closeIconClassName="!bg-white !rounded-full !p-[7px] !hover:cursor-pointer"
        closeClassName="!mt-0 !w-4 !h-4 !hover:cursor-pointer"
        onClose={() => {
          onClose();
        }}
        title="グループチャットの編集">
        <div className="text-sm text-black px-5">
          <div className="flex gap-5 items-center mb-5">
            <div className="w-[70px] min-w-[70px] h-[70px] relative">
              <input
                type="file"
                accept={ALLOWED_IMAGE_TYPES.join(',')}
                ref={fileInputRef}
                className="hidden"
                onChange={(e) => {
                  handleFileChange(e);
                }}
              />
              {previewAvatarUrl ? (
                <CustomUserAvatar
                  avatarUrl={previewAvatarUrl || ''}
                  avatarColor={chatRoomDetail?.avatarColor || ''}
                  size={70}
                />
              ) : (
                <GroupIconWithDynamicColor
                  color={chatRoomDetail?.avatarColor || '#228CDB'}
                  size={70}
                />
              )}

              <div
                className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-white text-xs bg-[#77858F] w-[36px] h-5 flex items-center justify-center rounded-[3px] hover:cursor-pointer"
                onClick={() => {
                  fileInputRef.current?.click();
                }}>
                変更
              </div>
            </div>

            <div className="!w-full">
              <p className="text-[#77858F] font-medium text-[12px] mb-[10px] leading-none">
                グループ名
              </p>
              <Input
                className="!py-1.5 !pl-1.5 !w-full !border-[#77858F] text-sm"
                placeholder="グループ名を入力してください"
                register={register('groupName', {
                  maxLength: {
                    value: 255,
                    message: ERROR_LONG_FIELD_MESSAGE,
                  },
                  onBlur: (e) => {
                    if (e.target.value === '') {
                      setValue('groupName', '');
                    }
                  },
                })}
              />
            </div>
          </div>
        </div>
        <p className="text-[12px] mb-[10px] text-[#77858F] px-5 leading-none font-medium">
          メンバーの編集
        </p>
        <div className="px-5">
          <InputSearch
            placeholder="名前を検索"
            className="w-full"
            inputClassName="!py-1 !h-[36px] text-[14px] !border-[#77858F] !placeholder-[#BABABA]"
            onChange={(e) => setSearchName(e.target.value)}
          />
        </div>
        <div className="my-[10px] px-5 max-h-[276px] overflow-y-auto overflow-x-hidden scrollbar-gutter-stable">
          {chatRoomDetail?.participants &&
            dashboardMemberList
              ?.filter((member) =>
                chatRoomDetail?.participants.find(
                  (item: ChatParticipant) => item.id === member.id,
                ),
              )
              ?.filter((member) =>
                member?.fullName
                  .toLowerCase()
                  .includes(searchName.toLowerCase()),
              ).length === 0 && (
              <p className="text-gray-500 text-center text-sm">{NO_OPTIONS}</p>
            )}
          {chatRoomDetail?.participants &&
            dashboardMemberList
              ?.filter((member) =>
                chatRoomDetail?.participants.find(
                  (item: ChatParticipant) => item.id === member.id,
                ),
              )
              ?.filter((member) =>
                member?.fullName
                  .toLowerCase()
                  .includes(searchName.toLowerCase()),
              )
              .map((member) => {
                return (
                  <div
                    className={`flex items-center justify-between gap-2 py-2 px-5 hover:cursor-pointer hover:bg-[#EBF1F7]`}
                    key={member.id}>
                    <div className="flex gap-[10px] items-center">
                      {renderAvatar(member.id)}
                      <p
                        className={`truncate font-medium text-[15px] max-w-[210px] text-black`}>
                        <span className="font-normal text-sm text-black">
                          {member.fullName}
                        </span>
                        <span className="font-normal text-xs text-[#77858F] ml-[6px]">
                          {member?.organizations?.name}
                        </span>
                      </p>
                    </div>
                    <div className="flex gap-5 items-center">
                      <Controller
                        control={control}
                        name="role"
                        render={({ field: { value } }) => (
                          <TableDropdown
                            options={roleOptions}
                            labelClass="!text-xs !min-h-[15px] font-medium"
                            labelOptionClass="!text-xs !min-h-[15px] font-medium"
                            className="!w-[100px] !h-[25px] !rounded-[4px]"
                            valueClassName="!border-[#77858F]"
                            selectedOption={roleOptions.find(
                              (element) => element.value === value?.value,
                            )}
                          />
                        )}
                      />
                      {session?.user.id != member.id ? (
                        <DynamicTooltip
                          content={'このメンバーを退会させる'}
                          placement="top">
                          <div>
                            <ImageRound
                              className="w-[18px] h-[18px] hover:cursor-pointer"
                              src="/icons/close.svg"
                              name="Close modal"
                              onClick={() => openConfirmRemoveModal(member.id)}
                            />
                          </div>
                        </DynamicTooltip>
                      ) : (
                        <div className="w-[18px]"></div>
                      )}
                    </div>
                  </div>
                );
              })}
        </div>
        {session?.user.permissions &&
          hasPermissionInArray(
            session?.user.permissions,
            PermissionsSystem.CHAT_ADD,
          ) &&
          chatRoomDetail?.type == ChatRoomType.GROUP && (
            <div
              className="flex justify-center gap-[6px] mb-[30px] items-center hover:cursor-pointer"
              onClick={openAddMemberModal}>
              <ImageRound
                src="/icons/add-chat.svg"
                name="Add icon"
                className="!w-[18px] !h-[18px] text-gray-400 hover:cursor-pointer cursor-pointer"
              />
              <p className="text-[#77858F] text-[14px] font-medium">
                メンバーを追加
              </p>
            </div>
          )}

        <div className="flex justify-center gap-[10px] mb-[30px] items-center">
          <Button
            variant="outline"
            onClick={onClose}
            className="w-[100px] !h-[36px] !p-0">
            キャンセル
          </Button>
          <Button
            variant="primary"
            className="w-[100px] !h-[36px] !p-0"
            disabled={
              (watch('groupName') && !watch('groupName').trim()) ||
              !watch('groupName')
            }
            onClick={handleConfirmUpdateGroupDetail}>
            保存する
          </Button>
        </div>
      </Modal>
    );
  },
);

export default ChatSettingModal;
