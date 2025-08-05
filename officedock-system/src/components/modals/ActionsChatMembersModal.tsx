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

import {
  ChatDashboardMember,
  ChatParticipant,
  ChatRoomDetail,
} from '@interfaces/chat';

import api from '@base/api';

export type ActionsChatMembersModalProps = {
  open: boolean;
  participantsList: number[] | undefined;
  dashboardMembers: ChatDashboardMember[];
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
    dashboardMembers,
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
      const memberInfo = dashboardMembers.find(
        (memberWithAvatar) => memberWithAvatar.id == actualMemberId,
      );

      return (
        <div>
          <CustomUserAvatar
            avatarUrl={memberInfo?.avatarUrl || ''}
            avatarColor={memberInfo?.avatarColor || ''}
            size={33}
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

      const uniqueMemberIds = Array.from(
        new Set([...(watch('members') || []), ...(allParticipantIds || [])]),
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

      const filteredParticipantIds = currentParticipantIds.filter(
        (participantId) =>
          !matchingParticipantList.find(
            (matchingParticipant) =>
              String(matchingParticipant.id).split('-')[1] ===
                String(participantId) &&
              matchingParticipant.type == ChatParticipantType.USER,
          ),
      );
      const filteredOrganizationIds = currentOrganizationIds.filter(
        (participantId) =>
          !matchingParticipantList.find(
            (matchingParticipant) =>
              String(matchingParticipant.id).split('-')[1] ===
                String(participantId) &&
              matchingParticipant.type == ChatParticipantType.ORGANIZATION,
          ),
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
        className="font-primary !rounded-[20px] text-gray-700 !p-0 w-[500px]"
        titleClassName="!text-[14px] !text-[#5B6770] !font-medium"
        headerClassName="bg-[#EBF1F7] !rounded-t-[20px] !rounded-b-none px-6 py-4"
        contentClass='!rounded-[20px]'
        closeIconClassName="!bg-white !rounded-full !p-2 !hover:cursor-pointer !shadow-sm"
        closeClassName="!mt-0 opacity-70 !w-4 !h-4 !hover:cursor-pointer"
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
              <div className="px-6">
                <InputSearch
                  placeholder="名前を検索"
                  className="w-full"
                  inputClassName="!py-2 text-[14px] !border-[#77858F]"
                  onChange={(e) => setSearchName(e.target.value)}
                />
              </div>
              <div className="px-6 mb-7">
                <div className="flex gap-4 my-3">
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
                  <p className="ml-auto text-[#0068B6] font-medium text-[12px]">
                    {watch('members') && watch('members').length
                      ? countChatParticipants()
                      : 0}
                    人を選択中
                  </p>
                </div>
                <div className="pt-3 max-h-[300px] overflow-y-auto overflow-x-hidden scrollbar-gutter-stable">
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
                                    watch('organizations').filter(Boolean) ??
                                      [],
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
                            <div className="scale-110 min-w-[33px]">
                              <GroupIconWithDynamicColor
                                color={member.color || '#0068B6'}
                              />
                            </div>
                          )}
                          <p
                            className={`truncate font-medium text-[15px] max-w-[430px] text-black`}>
                            <span className="font-normal text-sm text-black">
                              {member.fullName}
                            </span>
                            <span className="font-normal text-xs text-[#77858F] ml-2">
                              {member?.organizations?.name}
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
                  disabled={watch('members').length == 0}
                  onClick={handleConfirmUpdateMemberList}>
                  招待する
                </Button>
                <Button
                  variant="outline"
                  onClick={onClose}
                  className="w-[110px]">
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
