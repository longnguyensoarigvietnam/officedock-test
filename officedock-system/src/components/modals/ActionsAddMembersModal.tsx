'use client';

import { Dispatch, memo, SetStateAction, useState } from 'react';
import { UseMutationResult } from 'react-query';
import { useSession } from 'next-auth/react';

import Modal from '../common/Modal';
import InputSearch from '@components/common/InputSearch';
import ImageRound from '@components/common/ImageRound';
import Button from '@components/common/Button';
import Input from '@components/common/Input';

import { NO_OPTIONS } from '@constants';
import { Profile } from '@interfaces/user';
import { ChatRoomItem } from '@interfaces/chat';

export type ActionsAddMembersModalProps = {
  open: boolean;
  onClose: () => void;
  participantsList: number[];
  dashboardMemberList: Omit<Profile, 'birthday' | 'gender'>[];
  setParticipantsList: Dispatch<SetStateAction<number[]>>;
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
    participantsList,
    dashboardMemberList,
    setParticipantsList,
    createChatMutation,
  }: ActionsAddMembersModalProps) => {
    const { data: session } = useSession();

    const [searchName, setSearchName] = useState<string>('');
    const [groupName, setGroupName] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Handle confirm update member list
    const handleConfirmUpdateMemberList = (type: string, id: number) => {
      let newList = [...participantsList];
      if (type === 'remove') {
        newList = newList.filter((member) => member !== id);
      } else {
        newList = [...participantsList, id];
      }
      setParticipantsList(newList);
    };

    // Handle save
    const handleSave = async () => {
      if (isSubmitting) return;
      setIsSubmitting(true);
      try {
        if (
          participantsList.length === 1 &&
          participantsList[0] === session?.user.id
        ) {
          const participantId = participantsList[0];
          const participant = dashboardMemberList.find(
            (user) => user.id === participantId,
          );
          const participantName = participant ? participant.fullName : '';
          await createChatMutation.mutateAsync({
            name: participantName,
            participantIds: [participantId],
          });
        } else {
          if (participantsList.length >= 2) {
            if (!groupName.trim()) return;
            await createChatMutation.mutateAsync({
              name: groupName,
              participantIds: participantsList,
            });
          } else if (participantsList.length === 1) {
            const participantId = participantsList[0];
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
      participantsList.length >= 2 && !groupName.trim();
    return (
      <Modal
        open={open}
        isOutSideAction={false}
        className="font-primary bg-white text-gray-700 !rounded-2xl !p-7 w-[450px] !mr-0"
        onClose={() => {
          onClose();
          setParticipantsList([]);
        }}
        title="新規トークルーム作成">
        <div className="mt-2">
          {participantsList.length >= 2 && (
            <div className="mt-4">
              <label className="block text-sm font-semibold">グループ名</label>
              <Input
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="w-full mt-1 p-2 border rounded"
                placeholder="グループ名を入力してください"
              />
            </div>
          )}
          <p className="text-sm font-bold text-gray-700 mt-3">
            トークルームのメンバー
          </p>
          <div className="pt-3 mb-3 max-h-[170px] overflow-y-auto overflow-x-hidden scrollbar-gutter-stable">
            {Array.isArray(participantsList) &&
              dashboardMemberList
                ?.filter((member) =>
                  participantsList.find((item) => item === member.id),
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
                      <p className="font-normal truncate  text-black max-w-[220px] text-sm">
                        {member?.fullName}
                      </p>

                      <Button
                        sz="sm"
                        variant="outline"
                        className="w-20 h-8 text-xs ml-auto !border-[#EF4444] !text-[#EF4444]"
                        type="button"
                        name="Remove"
                        onClick={() =>
                          handleConfirmUpdateMemberList('remove', member?.id)
                        }>
                        削除
                      </Button>
                    </div>
                  );
                })}
          </div>
        </div>
        <InputSearch
          placeholder="メンバー検索"
          className="w-[100%]"
          inputClassName="!py-2 mb-3"
          onChange={(e) => setSearchName(e.target.value)}
        />
        <div className="">
          <p className="text-sm font-bold">ユーザー</p>
          <div className="pt-3 max-h-[170px] overflow-y-auto overflow-x-hidden scrollbar-gutter-stable">
            {Array.isArray(participantsList) &&
              dashboardMemberList
                ?.filter(
                  (member) =>
                    participantsList?.findIndex(
                      (item) => item === member.id,
                    ) === -1,
                )
                ?.filter((member) =>
                  member?.fullName
                    .toLowerCase()
                    .includes(searchName.toLowerCase()),
                ).length === 0 && (
                <p className="text-gray-500 text-center text-sm">
                  {NO_OPTIONS}
                </p>
              )}
            {Array.isArray(participantsList) &&
              dashboardMemberList
                ?.filter(
                  (member) =>
                    participantsList?.findIndex(
                      (item) => item === member?.id,
                    ) === -1,
                )
                ?.filter((member) =>
                  member?.fullName
                    .toLowerCase()
                    .includes(searchName.toLowerCase()),
                )
                .map((member) => {
                  return (
                    <div
                      className={`flex gap-5 items-center p-1.5 hover:cursor-pointer`}
                      key={member?.id}
                      onClick={() =>
                        handleConfirmUpdateMemberList('add', member?.id)
                      }>
                      <ImageRound
                        className="w-8 h-8"
                        src="/images/avatar-default.svg"
                        border="full"
                        name="Avatar user"
                      />
                      <p className="font-normal truncate max-w-[220px] text-sm">
                        {member?.fullName}
                      </p>
                      <Button
                        sz="sm"
                        variant="outline"
                        className="w-20 h-8 text-xs ml-auto"
                        type="button">
                        <ImageRound
                          src="/icons/plus.svg"
                          name="Add organization"
                          className="mr-3 h-2 w-2"
                        />
                        追加
                      </Button>
                    </div>
                  );
                })}
          </div>
        </div>

        <div className="flex items-center justify-end mt-4">
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={isSaveButtonDisabled}>
            保存
          </Button>
        </div>
      </Modal>
    );
  },
);
export default ActionsAddMembersModal;
