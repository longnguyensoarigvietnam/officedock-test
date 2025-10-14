'use client';

import { memo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { UseMutationResult } from 'react-query';

import Modal from '../common/Modal';
import InputSearch from '@components/common/InputSearch';
import ImageRound from '@components/common/ImageRound';
import Button from '@components/common/Button';
import CustomUserAvatar from '@components/common/AvatarIcon/CustomUserAvatar';
import Checkbox from '@components/common/Checkbox';
import Input from '@components/common/Input';
import GroupIconWithDynamicColor from '@components/common/GroupIcon';

import { useSessionCache } from '@providers/SessionCacheProvider';

import { ChatParticipantType } from '@constants/enums';
import { NO_OPTIONS } from '@constants';

import { Profile } from '@interfaces/user';
import { ChatParticipant, ChatRoomItem } from '@interfaces/chat';

import { checkIsParticipantSelected, sortChatParticipants } from '@utils';
import { ERROR_LONG_FIELD_MESSAGE } from '@constants/message';

export type ActionsAddMembersModalProps = {
  open: boolean;
  dashboardMemberList: Omit<Profile, 'birthday' | 'gender'>[];
  dataOptionsParticipants: ChatParticipant[];
  onClose: () => void;
  createChatMutation: UseMutationResult<
    ChatRoomItem,
    unknown,
    {
      name: string;
      participantIds: number[];
      selectOrganizations: string;
    },
    unknown
  >;
};

const ActionsAddMembersModal = memo(
  ({
    open,
    dashboardMemberList,
    dataOptionsParticipants,
    onClose,
    createChatMutation,
  }: ActionsAddMembersModalProps) => {
    const { data: session } = useSessionCache();

    const [searchName, setSearchName] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { register, setValue, watch, control } = useForm<{
      members: number[];
      groupName: string;
      organizations: number[];
    }>({
      defaultValues: {
        members: [],
        organizations: [],
      },
    });

    // Handle save
    const handleSave = async () => {
      if (isSubmitting) return;

      setIsSubmitting(true);

      const groupName = watch('groupName')?.trim();
      const memberList = watch('members') || [];
      const organizationList = watch('organizations') || [];
      const participantIds = memberList;
      const selectOrganizations = organizationList.join(',');

      try {
        const isGroupChat =
          organizationList.length > 0 || memberList.length >= 2;
        const isSelfChat =
          memberList.length === 1 && memberList[0] === session?.user.id;
        const isSingleOther = memberList.length === 1 && !isSelfChat;

        if (isGroupChat) {
          if (!groupName) return;

          await createChatMutation.mutateAsync({
            name: groupName,
            participantIds,
            selectOrganizations,
          });
        } else if (isSelfChat) {
          await createChatMutation.mutateAsync({
            name: session?.user.profile.fullName,
            participantIds: [session?.user.id],
            selectOrganizations,
          });
        } else if (isSingleOther) {
          const participantId = memberList[0];
          const participant = dashboardMemberList.find(
            (u) => u.id === participantId,
          );
          const participantName = participant?.fullName || '';

          await createChatMutation.mutateAsync({
            name: participantName,
            participantIds: [participantId],
            selectOrganizations,
          });
        }
      } finally {
        setIsSubmitting(false);
      }
    };

    const isSaveButtonDisabled =
      !watch('members').length ||
      (watch('members').length >= 2 &&
        ((watch('groupName') && !watch('groupName').trim()) ||
          !watch('groupName')));

    const renderAvatar = (memberId: string) => {
      const actualMemberId = Number(memberId.split('-')[1]);
      const memberInfo = dashboardMemberList.find(
        (memberWithAvatar) => memberWithAvatar.id == actualMemberId,
      );

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

    // Handle select chat participant
    const handleSelectChatParticipant = (
      member: ChatParticipant,
      dataOptionsParticipants: ChatParticipant[],
    ) => {
      const isUser = member.type === ChatParticipantType.USER;
      const isOrganization = member.type === ChatParticipantType.ORGANIZATION;
      const currentParticipantList = watch('members') || [];
      const currentOrganizationList = watch('organizations') || [];
      const memberId = Number(String(member.id).split('-')[1]);

      let updatedParticipantList = [...currentParticipantList];
      let updatedOrganizationList = [...currentOrganizationList];

      if (isUser) {
        const isAlreadySelected = currentParticipantList.includes(memberId);

        if (isAlreadySelected) {
          // Remove the user
          updatedParticipantList = updatedParticipantList.filter(
            (id) => id !== memberId,
          );

          // Remove any org that includes the removed user
          const belongedOrganizations = dataOptionsParticipants
            .filter(
              (participant) =>
                participant.type == ChatParticipantType.ORGANIZATION &&
                participant.userIds?.includes(memberId),
            )
            .map((org) => Number(String(org.id).split('-')[1]));

          updatedOrganizationList = updatedOrganizationList.filter(
            (org) => !belongedOrganizations.includes(org),
          );
        } else {
          updatedParticipantList.push(memberId);
        }

        setValue('members', updatedParticipantList);
        setValue('organizations', updatedOrganizationList);
      } else if (isOrganization) {
        const isAlreadySelected = currentOrganizationList.includes(memberId);
        const organizationMembers = member.userIds || [];

        if (isAlreadySelected) {
          updatedOrganizationList = updatedOrganizationList.filter(
            (id) => id !== memberId,
          );
          // Collect member IDs that should be removed (if not in any other selected org)
          const removeMemberIds = organizationMembers.filter((memberId) => {
            return !updatedOrganizationList.some((orgId) => {
              const org = dataOptionsParticipants.find(
                (item) =>
                  Number(item.id) === orgId &&
                  item.type === ChatParticipantType.ORGANIZATION,
              );
              return org?.userIds?.includes(memberId);
            });
          });

          // Remove the filtered member IDs from selected users
          updatedParticipantList = updatedParticipantList.filter(
            (id) => !removeMemberIds.includes(id),
          );
        } else {
          updatedOrganizationList.push(memberId);
          updatedParticipantList = Array.from(
            new Set([...updatedParticipantList, ...organizationMembers]),
          );
        }

        setValue('organizations', updatedOrganizationList);
        setValue('members', updatedParticipantList);
      }
    };

    // Handle select all chat participants
    const handleSelectAllChatParticipants = (
      dataOptionsParticipants: ChatParticipant[],
    ) => {
      const updatedParticipantList = dataOptionsParticipants?.filter((member) =>
        member.fullName.toLowerCase().includes(searchName.toLowerCase()),
      );
      const updatedSelectedUserIds = updatedParticipantList
        .filter((participant) => participant.type === ChatParticipantType.USER)
        .map((participant) => Number(String(participant.id).split('-')[1]));
      const updatedSelectedOrgIds = updatedParticipantList
        .filter(
          (participant) =>
            participant.type === ChatParticipantType.ORGANIZATION,
        )
        .map((participant) => Number(String(participant.id).split('-')[1]));

      // Use Set for uniqueness
      const updatedSelectedUsersBelongToOrgIds = new Set<number>();

      updatedParticipantList
        .filter(
          (participant) =>
            participant.type === ChatParticipantType.ORGANIZATION,
        )
        .forEach((org) => {
          (org.userIds || []).forEach((userId) => {
            if (!updatedSelectedUserIds.includes(userId)) {
              updatedSelectedUsersBelongToOrgIds.add(userId);
            }
          });
        });
      setValue(
        'members',
        Array.from(
          new Set([
            ...(watch('members') || []),
            ...updatedSelectedUserIds,
            ...Array.from(updatedSelectedUsersBelongToOrgIds),
          ]),
        ),
      );

      setValue(
        'organizations',
        Array.from(
          new Set([
            ...(watch('organizations') || []),
            ...updatedSelectedOrgIds,
          ]),
        ),
      );
    };

    // Handle remove all chat participants
    const handleRemoveAllChatParticipants = (
      dataOptionsParticipants: ChatParticipant[],
    ) => {
      const matchingParticipantList = dataOptionsParticipants?.filter(
        (member) =>
          member.fullName.toLowerCase().includes(searchName.toLowerCase()),
      );
      const currentParticipantIds = watch('members') || [];
      const currentOrganizationIds = watch('organizations') || [];

      const matchingUserIds = matchingParticipantList
        .filter((participant) => participant.type === ChatParticipantType.USER)
        .map((participant) => Number(String(participant.id).split('-')[1]));
      const matchingOrgIds = matchingParticipantList
        .filter(
          (participant) =>
            participant.type === ChatParticipantType.ORGANIZATION,
        )
        .map((participant) => Number(String(participant.id).split('-')[1]));

      // Use Set for uniqueness
      const matchingUsersBelongToOrgIds = new Set<number>();

      matchingParticipantList
        .filter(
          (participant) =>
            participant.type === ChatParticipantType.ORGANIZATION,
        )
        .forEach((org) => {
          (org.userIds || []).forEach((userId) => {
            if (!matchingUserIds.includes(userId)) {
              matchingUsersBelongToOrgIds.add(userId);
            }
          });
        });

      const filteredParticipantIds = currentParticipantIds.filter(
        (participantId) =>
          !Array.from(
            new Set([
              ...matchingUserIds,
              ...Array.from(matchingUsersBelongToOrgIds),
            ]),
          ).find((userId) => userId == participantId),
      );
      const filteredOrganizationIds = currentOrganizationIds.filter(
        (participantId) =>
          !matchingOrgIds.find((orgId) => orgId == participantId),
      );

      setValue('members', filteredParticipantIds);

      setValue('organizations', filteredOrganizationIds);
    };

    return (
      <Modal
        open={open}
        isOutSideAction={false}
        className="font-primary !rounded-[20px] text-gray-700 !p-0 w-[500px]"
        titleClassName="!text-[14px] !text-[#5B6770] !font-medium"
        headerClassName="bg-[#EBF1F7] !rounded-t-[20px] !rounded-b-none px-6 py-4"
        contentClass="!rounded-[20px]"
        closeIconClassName="!bg-white !rounded-full !p-2 !hover:cursor-pointer !shadow-sm"
        closeClassName="!mt-0 opacity-70 !w-4 !h-4 !hover:cursor-pointer"
        onClose={() => {
          onClose();
        }}
        title="グループチャットを新規作成">
        <div className="mt-2 px-6">
          {watch('members').length >= 2 || watch('organizations').length ? (
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
          ) : (
            <></>
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
                handleSelectAllChatParticipants(dataOptionsParticipants || []);
              }}>
              全てをチェック
            </p>
            <p
              className="text-[#77858F] font-medium text-[12px] hover:cursor-pointer"
              onClick={() => {
                handleRemoveAllChatParticipants(dataOptionsParticipants || []);
              }}>
              全てのチェックをクリア
            </p>
            <p className="ml-auto text-primary font-medium text-[12px]">
              {watch('members') && watch('members').length
                ? watch('members').length
                : 0}
              人を選択中
            </p>
          </div>
          <div className="pt-3 max-h-[300px] overflow-y-auto overflow-x-hidden scrollbar-gutter-stable">
            {dataOptionsParticipants?.filter((member) =>
              member.fullName.toLowerCase().includes(searchName.toLowerCase()),
            ).length === 0 && (
              <p className="text-gray-500 text-center text-sm">{NO_OPTIONS}</p>
            )}
            {dataOptionsParticipants
              ?.filter((member) =>
                member.fullName
                  .toLowerCase()
                  .includes(searchName.toLowerCase()),
              )
              .sort((prev: ChatParticipant, next: ChatParticipant) => {
                return sortChatParticipants(
                  prev,
                  next,
                  Number(session?.user.id),
                  watch('members').filter(Boolean) ?? [],
                  watch('organizations').filter(Boolean) ?? [],
                );
              })
              .map((member) => {
                return (
                  <div
                    className={`flex gap-2 items-center p-1.5 hover:cursor-pointer ${
                      watch('members') &&
                      watch('members').find(
                        (participant) => participant == member.id,
                      ) &&
                      'bg-[#EBF1F7]'
                    }`}
                    key={member.id}>
                    <div>
                      <Controller
                        control={control}
                        name="members"
                        render={() => (
                          <Checkbox
                            isChecked={checkIsParticipantSelected(
                              member,
                              watch('members').filter(Boolean) ?? [],
                              watch('organizations').filter(Boolean) ?? [],
                            )}
                            onChange={() =>
                              handleSelectChatParticipant(
                                member,
                                dataOptionsParticipants,
                              )
                            }
                          />
                        )}
                      />
                    </div>

                    {member.type == ChatParticipantType.USER && (
                      <>{renderAvatar(member.id as string)}</>
                    )}
                    {member.type == ChatParticipantType.ORGANIZATION && (
                      <>
                        {member.avatarUrl ? (
                          <CustomUserAvatar
                            avatarUrl={member?.avatarUrl || ''}
                            avatarColor={member?.color || ''}
                            size={30}
                          />
                        ) : (
                          <GroupIconWithDynamicColor
                            color={member.color || '#228CDB'}
                            size={30}
                          />
                        )}
                      </>
                    )}
                    <p
                      className={`break-all font-medium text-[15px] max-w-[430px] text-black`}>
                      <span className="text-sm text-black">
                        {member.fullName}
                      </span>
                      <span className="text-xs text-[#77858F] ml-2">
                        {member.type == ChatParticipantType.USER &&
                          member?.mainOrganization}
                      </span>
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
