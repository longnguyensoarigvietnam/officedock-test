'use client';
import { memo, useContext, useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useMutation } from 'react-query';
import { useSession } from 'next-auth/react';
import { AxiosError } from 'axios';
import Tippy from '@tippyjs/react';
import 'tippy.js/dist/tippy.css';

import Modal from '../common/Modal';
import ImageRound from '@components/common/ImageRound';
import Button from '@components/common/Button';
import InputSearch from '@components/common/InputSearch';
import TableDropdown from '@components/common/Dropdown/TableDropdown';
import AvatarIconWithDynamicColor from '@components/common/AvatarIcon';
import Input from '@components/common/Input';

import { apiRouters } from '@constants/routers';

import { ChatDashboardMember, ChatParticipant } from '@interfaces/chat';
import { OptionDropdownType } from '@interfaces/common';

import useDashboardMemberList from '@hooks/useDashBoardMemberList';
import useChatRoomDetail from '@hooks/useChatRoomDetail';
import { useErrorToast } from '@hooks/useErrorToast';

import { NO_OPTIONS } from '@constants';
import { ChatRoomType, PermissionsSystem } from '@constants/enums';
import {
  ERROR_UPDATE_MESSAGE,
  SUCCESS_UPDATE_MESSAGE,
} from '@constants/message';

import { useToast } from '@providers/ToastProvider';
import { LoadingContext } from '@providers/LoadingProvider';
import { hasPermissionInArray } from '@utils';
import api from '@base/api';

export type ChatSettingModalProps = {
  open: boolean;
  onClose: () => void;
  openAddMemberModal: () => void;
  openConfirmRemoveModal: (id: number) => void;
  code: string;
  dashboardMembers: ChatDashboardMember[];
};

const ChatSettingModal = memo(
  ({
    open,
    onClose,
    code,
    openAddMemberModal,
    openConfirmRemoveModal,
    dashboardMembers,
  }: ChatSettingModalProps) => {
    const { data: session } = useSession();
    const { dashboardMemberList } = useDashboardMemberList();
    const { chatRoomDetail } = useChatRoomDetail({
      code,
    });
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

    const handleUpdateGroupDetail = async (groupName: string) => {
      setIsLoading(true);
      const response = await api.patch(apiRouters.CHAT_DETAIL(code), {
        name: groupName,
      });
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
      const groupName = watch('groupName') as string;
      updateGroupDetail(groupName);
    };

    useEffect(() => {
      if (chatRoomDetail?.name) {
        setValue('groupName', chatRoomDetail.name);
      }
    }, [chatRoomDetail, setValue]);

    const renderAvatar = (memberId: number) => {
      const avatarColor =
        dashboardMembers.find((member) => {
          return member.id == memberId;
        })?.avatarColor || '';

      return (
        <div>
          {AvatarIconWithDynamicColor({
            color: avatarColor,
            size: 33,
          })}
        </div>
      );
    };

    return (
      <Modal
        open={open}
        isOutSideAction={false}
        className="font-primary !rounded-xl text-gray-700 !p-0 w-[500px]"
        titleClassName="!text-[14px] !text-[#5B6770] !font-medium"
        headerClassName="bg-[#EBF1F7] !rounded-t-xl !rounded-b-none px-6 py-4"
        closeIconClassName="!bg-white !rounded-full !p-2 !hover:cursor-pointer !shadow-sm"
        closeClassName="!mt-0 opacity-70 !w-4 !h-4 !hover:cursor-pointer"
        onClose={() => {
          onClose();
        }}
        title="グループチャットの編集">
        <div className="text-sm text-gray-700 px-6">
          <div className="flex gap-4 items-center pb-3">
            <ImageRound
              className="w-20 h-20"
              src={`${chatRoomDetail?.type == ChatRoomType.GROUP ? '/icons/multi-users.svg' : chatRoomDetail?.type == ChatRoomType.TASK ? '/icons/document.svg' : '/icons/skill-room.svg'}`}
              border="full"
              name="Multi users"
            />
            <div className="!w-full">
              <p className="text-[#77858F] font-medium text-[12px] mb-1.5">
                グループ名
              </p>
              <Input
                className="!py-1.5 !pl-1.5 !w-full !border-[#77858F]"
                placeholder="グループ名を入力してください"
                register={register('groupName', {
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
        <p className="text-[12px] my-2 text-[#77858F] px-6">メンバーの編集</p>
        <div className="px-6">
          <InputSearch
            placeholder="名前を検索"
            className="w-full"
            inputClassName="!py-2 text-[14px]"
            onChange={(e) => setSearchName(e.target.value)}
          />
        </div>
        <div className="pt-3 px-6 max-h-[300px] overflow-y-auto overflow-x-hidden scrollbar-gutter-stable">
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
                    className={`flex items-center justify-between py-2 px-4 hover:cursor-pointer hover:bg-[#EBF1F7]`}
                    key={member.id}>
                    <div className="flex gap-2 items-center">
                      {renderAvatar(member.id)}
                      <p className="font-medium text-[15px] truncate max-w-[220px] text-black">
                        {member.fullName}
                      </p>
                    </div>
                    <div className="flex gap-3 items-center">
                      <Controller
                        control={control}
                        name="role"
                        render={({ field: { value } }) => (
                          <TableDropdown
                            options={roleOptions}
                            className="!w-[120px] !h-[30px]"
                            selectedOption={roleOptions.find(
                              (element) => element.value === value?.value,
                            )}
                          />
                        )}
                      />
                      <Tippy
                        content={'このメンバーを退会させる'}
                        arrow={false}
                        delay={1000}
                        placement="top"
                        offset={[0, 5]}>
                        <div>
                          <ImageRound
                            className="w-[18px] h-[18px] opacity-50 hover:cursor-pointer"
                            src="/icons/close.svg"
                            name="Close modal"
                            onClick={() => openConfirmRemoveModal(member.id)}
                          />
                        </div>
                      </Tippy>
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
              className="flex justify-center gap-2 my-7 items-center hover:cursor-pointer"
              onClick={openAddMemberModal}>
              <ImageRound
                src="/icons/add-chat.svg"
                name="Add icon"
                className="!w-[20px] !h-[20px] text-gray-400 hover:cursor-pointer cursor-pointer"
              />
              <p className="text-[#77858F] text-[14px] font-medium">
                メンバーを追加
              </p>
            </div>
          )}

        <div className="flex justify-center gap-3 my-7 items-center">
          <Button variant="outline" onClick={onClose} className="w-[110px]">
            キャンセル
          </Button>
          <Button
            variant="primary"
            className="w-[110px]"
            onClick={handleConfirmUpdateGroupDetail}>
            保存する
          </Button>
        </div>
      </Modal>
    );
  },
);

export default ChatSettingModal;
