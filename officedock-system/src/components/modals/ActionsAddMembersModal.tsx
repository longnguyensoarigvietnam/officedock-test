'use client';

import { memo, useState } from 'react';
import { UseMutationResult } from 'react-query';
import { useSession } from 'next-auth/react';

import Modal from '../common/Modal';
import InputSearch from '@components/common/InputSearch';
import ImageRound from '@components/common/ImageRound';
import Button from '@components/common/Button';
import Input from '@components/common/Input';

import { NO_OPTIONS } from '@constants';
import { Profile } from '@interfaces/user';
import { ChatDashboardMember, ChatRoomItem } from '@interfaces/chat';
import AvatarIconWithDynamicColor from '@components/common/AvatarIcon';
import { Controller, useForm } from 'react-hook-form';
import Checkbox from '@components/common/Checkbox';

export type ActionsAddMembersModalProps = {
  open: boolean;
  onClose: () => void;
  dashboardMemberList: Omit<Profile, 'birthday' | 'gender'>[];
  dashboardMembers: ChatDashboardMember[];
  createChatMutation: UseMutationResult<
    ChatRoomItem,
    unknown,
    {
      name: string;
      participantIds: number[];
    },
    unknown
  >;
};

const ActionsAddMembersModal = memo(
  ({
    open,
    onClose,
    dashboardMemberList,
    dashboardMembers,
    createChatMutation,
  }: ActionsAddMembersModalProps) => {
    const { data: session } = useSession();

    const [searchName, setSearchName] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { register, setValue, watch, control } = useForm<{
      groupParticipant: number[];
      groupName: string;
    }>({
      defaultValues: {
        groupParticipant: [],
      },
    });

    // Handle save
    const handleSave = async () => {
      if (isSubmitting) return;
      setIsSubmitting(true);
      try {
        if (
          watch('groupParticipant').length === 1 &&
          watch('groupParticipant')[0] === session?.user.id
        ) {
          const participantId = watch('groupParticipant')[0];
          const participant = dashboardMemberList.find(
            (user) => user.id === participantId,
          );
          const participantName = participant ? participant.fullName : '';
          await createChatMutation.mutateAsync({
            name: participantName,
            participantIds: [participantId],
          });
        } else {
          if (watch('groupParticipant').length >= 2) {
            if (!watch('groupName').trim()) return;
            await createChatMutation.mutateAsync({
              name: watch('groupName'),
              participantIds: watch('groupParticipant'),
            });
          } else if (watch('groupParticipant').length === 1) {
            const participantId = watch('groupParticipant')[0];
            const participant = dashboardMemberList.find(
              (user) => user.id === participantId,
            );
            const participantName = participant ? participant.fullName : '';
            await createChatMutation.mutateAsync({
              name: participantName,
              participantIds: [participantId],
            });
          }
        }
      } finally {
        setIsSubmitting(false);
      }
    };

    const isSaveButtonDisabled =
      watch('groupParticipant').length >= 2 && ((watch('groupName') && !watch('groupName').trim() )|| !watch('groupName'));

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
        title="グループチャットを新規作成">
        <div className="mt-2 px-6">
          {watch('groupParticipant').length >= 2 && (
            <div className="text-sm text-gray-700">
              <div className="flex gap-4 items-center pb-3">
                <ImageRound
                  className="w-20 h-20"
                  src="/icons/multi-users.svg"
                  border="full"
                  name="Multi users"
                />
                <div className="!w-full">
                  <p className="text-[#77858F] font-medium text-[12px] mb-1.5">
                    グループ名
                  </p>
                  <Input
                    className="!py-1.5 !pl-1.5 !w-full !border-[#77858F] text-sm"
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
          )}
        </div>
        <div className="px-6">
          <p className="text-[12px] text-[#77858F] font-medium mb-3">
            メンバーを選択
          </p>
          <InputSearch
            placeholder="名前を検索"
            className="w-full"
            inputClassName="!py-2 text-[14px]"
            onChange={(e) => setSearchName(e.target.value)}
          />
        </div>
        <div className="px-6 mb-7">
          <div className="flex gap-4 my-3">
            <p
              className="text-[#77858F] font-medium text-[12px] hover:cursor-pointer"
              onClick={() => {
                const updatedParticipantList = dashboardMemberList?.filter(
                  (member) =>
                    member.fullName
                      .toLowerCase()
                      .includes(searchName.toLowerCase()),
                );
                let newParticipantList: number[] = [];
                if (updatedParticipantList) {
                  newParticipantList = updatedParticipantList.map(
                    (participant) => participant.id,
                  );
                }
                setValue('groupParticipant', newParticipantList);
              }}>
              全てをチェック
            </p>
            <p
              className="text-[#77858F] font-medium text-[12px] hover:cursor-pointer"
              onClick={() => {
                setValue('groupParticipant', []);
              }}>
              全てのチェックをクリア
            </p>
            <p className="ml-auto text-[#0068B6] font-medium text-[12px]">
              {watch('groupParticipant') && watch('groupParticipant').length
                ? watch('groupParticipant').length
                : 0}
              人を選択中
            </p>
          </div>
          <div className="pt-3 max-h-[300px] overflow-y-auto overflow-x-hidden scrollbar-gutter-stable">
            {dashboardMemberList?.filter((member) =>
              member.fullName.toLowerCase().includes(searchName.toLowerCase()),
            ).length === 0 && (
              <p className="text-gray-500 text-center text-sm">{NO_OPTIONS}</p>
            )}
            {dashboardMemberList
              ?.filter((member) =>
                member.fullName
                  .toLowerCase()
                  .includes(searchName.toLowerCase()),
              )
              .map((member) => {
                return (
                  <div
                    className={`flex gap-2 items-center p-1.5 hover:cursor-pointer ${
                      watch('groupParticipant') &&
                      watch('groupParticipant').find(
                        (participant) => participant == member.id,
                      ) &&
                      'bg-[#EBF1F7]'
                    }`}
                    key={member.id}>
                    <div>
                      <Controller
                        control={control}
                        name="groupParticipant"
                        render={() => (
                          <Checkbox
                            isChecked={
                              watch('groupParticipant') &&
                              watch('groupParticipant').find(
                                (participant) => participant == member.id,
                              )
                                ? true
                                : false
                            }
                            onChange={() => {
                              const currentParticipantList =
                                watch('groupParticipant') || [];
                              const foundParticipantIndex =
                                currentParticipantList.findIndex(
                                  (participant) => participant == member.id,
                                );
                              let updatedParticipantList = [];
                              if (foundParticipantIndex == -1) {
                                updatedParticipantList = [
                                  ...currentParticipantList,
                                  member.id,
                                ];
                              } else {
                                updatedParticipantList = [
                                  ...currentParticipantList,
                                ].filter(
                                  (participant) => participant != member.id,
                                );
                              }

                              setValue(
                                'groupParticipant',
                                updatedParticipantList,
                              );
                            }}
                          />
                        )}
                      />
                    </div>

                    {renderAvatar(member.id)}
                    <p className="font-normal text-sm truncate max-w-[350px] text-black">
                      {member.fullName}
                    </p>
                  </div>
                );
              })}
          </div>
        </div>
        <div className="flex justify-center gap-3 my-7 items-center">
          <Button
            variant="primary"
            className="w-[110px]"
            onClick={handleSave}
            disabled={isSaveButtonDisabled}>
            作成する
          </Button>
          <Button variant="outline" onClick={onClose} className="w-[110px]">
            キャンセル
          </Button>
        </div>
      </Modal>
    );
  },
);
export default ActionsAddMembersModal;
