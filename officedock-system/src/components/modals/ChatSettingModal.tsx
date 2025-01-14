'use client';
import { memo, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation } from 'react-query';

import Modal from '../common/Modal';
import ImageRound from '@components/common/ImageRound';
import TextAreaAutosize from '@components/common/TextAreaAutosize';
import Button from '@components/common/Button';

import { apiRouters } from '@constants/routers';

import useDashboardMemberList from '@hooks/useDashBoardMemberList';
import useChatRoomDetail from '@hooks/useChatRoomDetail';
import { trimUnnecessaryLineBreaks } from '@utils';
import api from '@base/api';

export type ChatSettingModalProps = {
  open: boolean;
  onClose: () => void;
  code: string;
};

const ChatSettingModal = memo(
  ({ open, onClose, code }: ChatSettingModalProps) => {
    const [showListMembers, setShowListMembers] = useState<boolean>(false);
    const { dashboardMemberList } = useDashboardMemberList();
    const { chatRoomDetail } = useChatRoomDetail({
      code,
    });
    const [roomNameEditing, setRoomNameEditing] = useState<string>('');
    const { register, setValue } = useForm();

    const handleUpdateGroupName = async (groupName: string) => {
      const response = await api.patch(apiRouters.CHAT_DETAIL(code), {
        name: groupName,
      });
      return response;
    };

    const { mutate: updateGroupName } = useMutation(
      'updateGroupName',
      handleUpdateGroupName,
    );

    const handleConfirmUpdateGroupName = () => {
      updateGroupName(roomNameEditing as string);
      onClose();
    };

    useEffect(() => {
      if (chatRoomDetail?.name) {
        setValue('groupName', chatRoomDetail.name);
      }
    }, [chatRoomDetail, setValue]);

    return (
      <Modal
        open={open}
        isOutSideAction={false}
        className="font-primary bg-white !rounded-2xl text-gray-700 !p-6 w-[400px]"
        onClose={() => {
          onClose();
        }}
        title="トークルーム設定">
        <div className="text-sm text-gray-700 border-b-[1px]">
          <div className="flex justify-between items-center pb-3 gap-4">
            <div className="relative w-[70px]">
              <ImageRound
                className="w-14 h-14"
                src="/icons/multi-users.svg"
                border="full"
                name="Multi users"
              />
              <ImageRound
                className="w-4 h-4 absolute right-2 bottom-0"
                src="/icons/active.svg"
                border="full"
                name="Active"
              />
            </div>
            <TextAreaAutosize
              className="!border-none rounded-none ml-auto !p-0 font-bold text-[14px] w-[80%] resize-none overflow-hidden focus:border-none focus:!rounded-none focus:shadow-none focus:!ring-offset-0 focus:!ring-0 focus:!ring-white"
              register={register('groupName', {
                onChange: (e) => {
                  setRoomNameEditing(e.target.value);
                },
                onBlur: (e) => {
                  if (e.target.value === '') {
                    setValue('groupName', '');
                  }
                },
              })}
              defaultText={chatRoomDetail?.name}
              placeholderValue="グループ名を入力してください"
            />
          </div>
        </div>
        <p className="font-bold text-[14px] mt-2">
          メンバー（{chatRoomDetail?.participants?.length}人）
        </p>
        <p className="text-xs mb-4">
          メンバー管理はグループマスターのみ行えます
        </p>
        <ImageRound
          className="w-14 h-14 mb-4"
          src="/images/avatar-default.svg"
          border="full"
          name="Avatar user"
        />
        <p
          className="text-xs hover:cursor-pointer hover:text-[#727272]"
          onClick={() => setShowListMembers(!showListMembers)}>
          ↓以下メンバー表示
        </p>
        {showListMembers && (
          <div className="pt-3 max-h-[170px] overflow-y-auto overflow-x-hidden scrollbar-gutter-stable">
            {dashboardMemberList
              ?.filter(
                (member) =>
                  chatRoomDetail &&
                  chatRoomDetail.participants.find(
                    (item) => item.id === member.id,
                  ),
              )
              .map((member) => {
                return (
                  <div
                    className={`flex gap-5 items-center p-1.5 hover:cursor-pointer`}
                    key={member.id}>
                    <ImageRound
                      className="w-8 h-8"
                      src="/images/avatar-default.svg"
                      border="full"
                      name="Avatar user"
                    />
                    <p className="font-normal text-sm truncate max-w-[220px] text-black">
                      {member.fullName}
                    </p>
                  </div>
                );
              })}
          </div>
        )}
        <div className="flex flex-row-reverse">
          <Button
            variant="primary"
            onClick={handleConfirmUpdateGroupName}
            className="mt-2 ml-auto"
            disabled={
              (roomNameEditing &&
                trimUnnecessaryLineBreaks(roomNameEditing as string) === '') ||
              roomNameEditing?.length === 0
            }>
            保存
          </Button>
        </div>
      </Modal>
    );
  },
);

export default ChatSettingModal;
