'use client';
import { memo, useContext, useState } from 'react';
import {
  QueryObserverResult,
  RefetchOptions,
  RefetchQueryFilters,
  useMutation,
} from 'react-query';

import { AxiosError } from 'axios';
import { Controller, useForm } from 'react-hook-form';

import Modal from '../common/Modal';
import InputSearch from '@components/common/InputSearch';
import Button from '@components/common/Button';
import Checkbox from '@components/common/Checkbox';
import CustomUserAvatar from '@components/common/AvatarIcon/CustomUserAvatar';
import GroupIconWithDynamicColor from '@components/common/GroupIcon';

import { apiRouters } from '@constants/routers';
import { NO_OPTIONS } from '@constants';
import { ChatParticipantType, PermissionsSystem } from '@constants/enums';
import {
  ERROR_UPDATE_MESSAGE,
  SUCCESS_UPDATE_MESSAGE,
} from '@constants/message';

import { useErrorToast } from '@hooks/useErrorToast';

import { useToast } from '@providers/ToastProvider';
import { LoadingContext } from '@providers/LoadingProvider';
import { useSessionCache } from '@providers/SessionCacheProvider';

import {
  checkIsParticipantSelected,
  hasPermissionInArray,
  sortChatParticipants,
} from '@utils';

import { ChatParticipant, ChatRoomDetail } from '@interfaces/chat';
import { Profile } from '@interfaces/user';

import api from '@base/api';

export type ActionsChatMembersModalProps = {
  open: boolean;
  participantsList: number[] | undefined;
  dashboardMemberList: Omit<Profile, 'birthday' | 'gender'>[];
  dataOptionsParticipants: ChatParticipant[];
  code: string;
  selectedOrganizations: number[];
  onClose: () => void;
  refetchChatRoomDetail: <TPageData>(
    options?: (RefetchOptions & RefetchQueryFilters<TPageData>) | undefined,
  ) => Promise<QueryObserverResult<ChatRoomDetail, AxiosError<unknown, any>>>;
};

const ActionsChatMembersModal = memo(
  ({
    open,
    participantsList,
    dataOptionsParticipants,
    code,
    dashboardMemberList,
    selectedOrganizations,
    onClose,
    refetchChatRoomDetail,
  }: ActionsChatMembersModalProps) => {
    const [searchName, setSearchName] = useState<string>('');
    const { showToast } = useToast();
    const showErrorToast = useErrorToast();
    const { setIsLoading } = useContext(LoadingContext);
    const { setValue, watch, control } = useForm<{
      members: number[];
      organizations: number[];
    }>({
      defaultValues: {
        members: [],
        organizations: [],
      },
    });

    const { data: session } = useSessionCache();

    const handleUpdateMemberList = async (data: {
      participantList: number[];
      selectOrganizations: string;
    }) => {
      setIsLoading(true);
      const response = await api.patch(apiRouters.CHAT_DETAIL(code), {
        participantIds: data.participantList,
        selectOrganizations: data.selectOrganizations,
      });
      return response;
    };

    const { mutate: updateMemberList } = useMutation(
      'updateMemberList',
      handleUpdateMemberList,
      {
        onSuccess: () => {
          showToast({
            description: SUCCESS_UPDATE_MESSAGE,
          });
          onClose();
          refetchChatRoomDetail();
        },
        onError: (error: AxiosError<any>) => {
          showErrorToast(error, ERROR_UPDATE_MESSAGE);
        },
        onSettled: () => {
          setIsLoading(false);
        },
      },
    );

    const handleConfirmUpdateMemberList = () => {
      const memberList = watch('members');
      const organizationList = watch('organizations');
      const joinedMemberList = [...memberList, ...(participantsList || [])];
      const joinedOrganizationList = [
        ...organizationList,
        ...(selectedOrganizations || []),
      ];

      updateMemberList({
        participantList: joinedMemberList,
        selectOrganizations: joinedOrganizationList.join(','),
      });
    };

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

        setValue('members', updatedParticipantList, { shouldDirty: true });
        setValue('organizations', updatedOrganizationList, {
          shouldDirty: true,
        });
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

        setValue('organizations', updatedOrganizationList, {
          shouldDirty: true,
        });
        setValue('members', updatedParticipantList, { shouldDirty: true });
      }
    };

    // Handle select all chat participants
    const handleSelectAllChatParticipants = (
      dataOptionsParticipants: ChatParticipant[],
    ) => {
      const allParticipantIds = dataOptionsParticipants
        ?.filter(
          (member) =>
            member.type == ChatParticipantType.USER &&
            (participantsList || [])?.findIndex(
              (item) => item == Number(String(member.id).split('-')[1]),
            ) == -1,
        )
        ?.filter((member) =>
          member.fullName.toLowerCase().includes(searchName.toLowerCase()),
        )
        ?.map((participant) => Number(String(participant.id).split('-')[1]));

      const allOrganizationIds = dataOptionsParticipants
        ?.filter(
          (member) =>
            member.type == ChatParticipantType.ORGANIZATION &&
            (selectedOrganizations || [])?.findIndex(
              (item) => item == Number(String(member.id).split('-')[1]),
            ) == -1,
        )
        ?.filter((member) =>
          member.fullName.toLowerCase().includes(searchName.toLowerCase()),
        )
        ?.map((participant) => Number(String(participant.id).split('-')[1]));

      // Use Set for uniqueness
      const updatedSelectedUsersBelongToOrgIds = new Set<number>();

      dataOptionsParticipants
        ?.filter(
          (member) =>
            member.type == ChatParticipantType.ORGANIZATION &&
            (selectedOrganizations || [])?.findIndex(
              (item) => item == Number(String(member.id).split('-')[1]),
            ) == -1,
        )
        ?.filter((member) =>
          member.fullName.toLowerCase().includes(searchName.toLowerCase()),
        )
        .forEach((org) => {
          (org.userIds || []).forEach((userId) =>
            updatedSelectedUsersBelongToOrgIds.add(userId),
          );
        });

      const uniqueMemberIds = Array.from(
        new Set([
          ...(watch('members') || []),
          ...(allParticipantIds || []),
          ...Array.from(updatedSelectedUsersBelongToOrgIds),
        ]),
      );

      const uniqueOrganizationIds = Array.from(
        new Set([
          ...(watch('organizations') || []),
          ...(allOrganizationIds || []),
        ]),
      );

      setValue('members', uniqueMemberIds);
      setValue('organizations', uniqueOrganizationIds);
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

    const countChatParticipants = () => {
      return watch('members').filter(
        (memberId) =>
          (participantsList || [])?.findIndex((item) => item == memberId) == -1,
      ).length;
    };

    return (
      <Modal
        open={open}
        isOutSideAction={false}
        className="font-primary !rounded-[20px] text-black !p-0 w-[500px]"
        titleClassName="!text-[14px] !text-[#5B6770] !font-medium"
        contentClass="!rounded-[20px]"
        headerClassName="bg-[#EBF1F7] !rounded-t-xl !rounded-b-none px-5 !py-[10px]"
        closeIconClassName="!bg-white !rounded-full !p-[7px] !hover:cursor-pointer"
        closeClassName="!mt-0 !w-4 !h-4 !hover:cursor-pointer"
        onClose={() => {
          onClose();
        }}
        title="グループチャットに招待する">
        {session?.user.permissions &&
          hasPermissionInArray(
            session?.user.permissions,
            PermissionsSystem.CHAT_UPDATE,
          ) && (
            <>
              <div className="px-5">
                <InputSearch
                  placeholder="名前を検索"
                  className="w-full"
                  inputClassName="!py-1 !h-[36px] text-[14px] !border-[#77858F] !placeholder-[#BABABA]"
                  onChange={(e) => setSearchName(e.target.value)}
                />
              </div>
              <div className="px-5 mb-[30px]">
                <div className="flex gap-6 my-[10px]">
                  <p
                    className="text-[#77858F] font-medium text-[12px] hover:cursor-pointer"
                    onClick={() => {
                      handleSelectAllChatParticipants(
                        dataOptionsParticipants || [],
                      );
                    }}>
                    全てをチェック
                  </p>
                  <p
                    className="text-[#77858F] font-medium text-[12px] hover:cursor-pointer"
                    onClick={() => {
                      handleRemoveAllChatParticipants(
                        dataOptionsParticipants || [],
                      );
                    }}>
                    全てのチェックをクリア
                  </p>
                  <p className="ml-auto text-primary font-medium text-[12px]">
                    {watch('members') && watch('members').length
                      ? countChatParticipants()
                      : 0}
                    人を選択中
                  </p>
                </div>
                <div className="max-h-[276px] overflow-y-auto overflow-x-hidden scrollbar-gutter-stable">
                  {dataOptionsParticipants
                    ?.filter((member) =>
                      member.type == ChatParticipantType.USER
                        ? (participantsList || [])?.findIndex(
                            (item) =>
                              item == Number(String(member.id).split('-')[1]),
                          ) == -1
                        : (selectedOrganizations || [])?.findIndex(
                            (item) =>
                              item == Number(String(member.id).split('-')[1]),
                          ) == -1,
                    )
                    ?.filter((member) =>
                      member.fullName
                        .toLowerCase()
                        .includes(searchName.toLowerCase()),
                    ).length === 0 && (
                    <p className="text-gray-500 text-center text-sm">
                      {NO_OPTIONS}
                    </p>
                  )}
                  {dataOptionsParticipants
                    ?.filter((member) =>
                      member.type == ChatParticipantType.USER
                        ? (participantsList || [])?.findIndex(
                            (item) =>
                              item == Number(String(member.id).split('-')[1]),
                          ) == -1
                        : (selectedOrganizations || [])?.findIndex(
                            (item) =>
                              item == Number(String(member.id).split('-')[1]),
                          ) == -1,
                    )
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
                          className={`flex gap-[10px] items-center py-2 px-5 hover:cursor-pointer ${
                            checkIsParticipantSelected(
                              member,
                              watch('members').filter(Boolean) ?? [],
                              watch('organizations').filter(Boolean) ?? [],
                            ) && 'bg-[#EBF1F7]'
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
                                    watch('organizations').filter(Boolean) ??
                                      [],
                                  )}
                                  boxLabelClass="!ml-[4px]"
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
                            <span className="text-[15px] text-black">
                              {member.fullName}
                            </span>
                            <span className="text-xs text-[#77858F] ml-[6px]">
                              {member.type == ChatParticipantType.USER &&
                                member?.mainOrganization}
                            </span>
                          </p>
                        </div>
                      );
                    })}
                </div>
              </div>
              <div className="flex justify-center gap-[10px] my-[30px] items-center">
                <Button
                  variant="primary"
                  className="w-[100px] !h-[36px] !p-0"
                  disabled={watch('members').length == 0}
                  onClick={handleConfirmUpdateMemberList}>
                  招待する
                </Button>
                <Button
                  variant="outline"
                  onClick={onClose}
                  className="w-[100px] !h-[36px] !p-0">
                  キャンセル
                </Button>
              </div>
            </>
          )}
      </Modal>
    );
  },
);

export default ActionsChatMembersModal;
