'use client';

import {
  ChangeEvent,
  Dispatch,
  memo,
  SetStateAction,
  useRef,
  useState,
} from 'react';
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

import { ERROR_LONG_FIELD_MESSAGE } from '@constants/message';
import { ChatParticipantType } from '@constants/enums';
import {
  ALLOWED_IMAGE_TYPES,
  MAX_AVATAR_IMAGE_FILE_SIZE,
  NO_OPTIONS,
} from '@constants';

import { Profile } from '@interfaces/user';
import { ChatParticipant, ChatRoomItem } from '@interfaces/chat';

import { checkIsParticipantSelected, sortChatParticipants } from '@utils';

export type ActionsAddMembersModalProps = {
  open: boolean;
  dashboardMemberList: Omit<Profile, 'birthday' | 'gender'>[];
  dataOptionsParticipants: ChatParticipant[];
  onClose: () => void;
  setOpenErrorUploadFileModal: Dispatch<SetStateAction<boolean>>;
  createChatMutation: UseMutationResult<
    ChatRoomItem,
    unknown,
    {
      name: string;
      avatar?: File | null | undefined;
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
    setOpenErrorUploadFileModal,
    onClose,
    createChatMutation,
  }: ActionsAddMembersModalProps) => {
    const { data: session } = useSessionCache();
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    const [previewAvatarUrl, setPreviewAvatarUrl] = useState<string | null>(
      null,
    );
    const [avatarImgFile, setAvatarImgFile] = useState<File | null>(null);

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
            avatar: avatarImgFile,
          });
        } else if (isSelfChat) {
          await createChatMutation.mutateAsync({
            name: session?.user.profile.fullName,
            participantIds: [session?.user.id],
            selectOrganizations,
            avatar: avatarImgFile,
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
            avatar: avatarImgFile,
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
        title="グループチャットを新規作成">
        <div className="mt-2 px-5">
          {watch('members').length >= 2 || watch('organizations').length ? (
            <div className="text-sm text-black">
              <div className="flex gap-5 items-center pb-3">
                <div className="w-[70px] h-[70px] relative">
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
                      avatarColor={''}
                      size={70}
                    />
                  ) : (
                    <ImageRound
                      className="w-[70px] min-w-[70px] h-[70px]"
                      src="/icons/multi-users.svg"
                      border="full"
                      name="Multi users"
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
        <div className="px-5">
          <p className="text-[12px] text-[#77858F] font-medium mb-[10px] leading-none">
            メンバーを選択
          </p>
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
          <div className="max-h-[276px] overflow-y-auto overflow-x-hidden scrollbar-gutter-stable">
            {dataOptionsParticipants?.filter((member) =>
              member.fullName.toLowerCase().includes(searchName.toLowerCase()),
            ).length === 0 && (
              <p className="text-gray-500 text-center text-sm">{NO_OPTIONS}</p>
            )}
            <div className="flex flex-col">
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
                  );
                })
                .map((member) => {
                  return (
                    <div
                      className={`flex gap-[10px] items-center py-2 px-5 hover:cursor-pointer hover:bg-[#EBF1F7] ${
                        checkIsParticipantSelected(
                          member,
                          watch('members').filter(Boolean) ?? [],
                          watch('organizations').filter(Boolean) ?? [],
                        ) && 'bg-[#EBF1F7]'
                      }`}
                      key={member.id}
                      style={{
                        order: checkIsParticipantSelected(
                          member,
                          watch('members').filter(Boolean) ?? [],
                          watch('organizations').filter(Boolean) ?? [],
                        )
                          ? 0
                          : 1, // Sort checked user/org first
                      }}
                      onClick={() => {
                        handleSelectChatParticipant(
                          member,
                          dataOptionsParticipants,
                        );
                      }}>
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
                              boxLabelClass="!ml-[4px]"
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
        </div>
        <div className="flex justify-center gap-[10px] mb-[30px] items-center">
          <Button
            variant="primary"
            className="w-[100px] !h-[36px] !p-0"
            onClick={handleSave}
            disabled={isSaveButtonDisabled}>
            作成する
          </Button>
          <Button
            variant="outline"
            onClick={onClose}
            className="w-[100px] !h-[36px] !p-0">
            キャンセル
          </Button>
        </div>
      </Modal>
    );
  },
);
export default ActionsAddMembersModal;
