'use client';
import { memo, useContext, useState } from 'react';
import { useMutation } from 'react-query';
import { useSession } from 'next-auth/react';
import { AxiosError } from 'axios';
import { Controller, useForm } from 'react-hook-form';

import Modal from '../common/Modal';
import InputSearch from '@components/common/InputSearch';
import Button from '@components/common/Button';
import Checkbox from '@components/common/Checkbox';
import AvatarIconWithDynamicColor from '@components/common/AvatarIcon';

import { apiRouters } from '@constants/routers';
import { NO_OPTIONS } from '@constants';
import { PermissionsSystem } from '@constants/enums';
import {
  ERROR_UPDATE_MESSAGE,
  SUCCESS_UPDATE_MESSAGE,
} from '@constants/message';

import useDashboardMemberList from '@hooks/useDashBoardMemberList';
import { useErrorToast } from '@hooks/useErrorToast';

import { useToast } from '@providers/ToastProvider';
import { LoadingContext } from '@providers/LoadingProvider';

import { hasPermissionInArray } from '@utils';
import { ChatDashboardMember } from '@interfaces/chat';
import api from '@base/api';

export type ActionsChatMembersModalProps = {
  open: boolean;
  onClose: () => void;
  participantsList: number[] | undefined;
  dashboardMembers: ChatDashboardMember[];
  code: string;
};

const ActionsChatMembersModal = memo(
  ({
    open,
    onClose,
    participantsList,
    code,
    dashboardMembers,
  }: ActionsChatMembersModalProps) => {
    const [searchName, setSearchName] = useState<string>('');
    const { dashboardMemberList } = useDashboardMemberList();
    const { showToast } = useToast();
    const showErrorToast = useErrorToast();
    const { setIsLoading } = useContext(LoadingContext);
    const { setValue, watch, control } = useForm<{
      groupParticipant: number[];
    }>({
      defaultValues: {
        groupParticipant: [],
      },
    });

    const { data: session } = useSession();

    const handleUpdateMemberList = async (participantList: number[]) => {
      setIsLoading(true);
      const response = await api.patch(apiRouters.CHAT_DETAIL(code), {
        participantIds: participantList,
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

    const handleConfirmUpdateMemberList = () => {
      const groupParticipantList = watch('groupParticipant');
      const joinedParticipantList = [
        ...groupParticipantList,
        ...(participantsList || []),
      ];
      updateMemberList(joinedParticipantList);
    };

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
                  inputClassName="!py-2 text-[14px]"
                  onChange={(e) => setSearchName(e.target.value)}
                />
              </div>
              <div className="px-6 mb-7">
                <div className="flex gap-4 my-3">
                  <p
                    className="text-[#77858F] font-medium text-[12px] hover:cursor-pointer"
                    onClick={() => {
                      const updatedParticipantList =
                        Array.isArray(participantsList) &&
                        dashboardMemberList
                          ?.filter(
                            (member) =>
                              participantsList?.findIndex(
                                (item) => item === member.id,
                              ) === -1,
                          )
                          ?.filter((member) =>
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
                    {watch('groupParticipant') &&
                    watch('groupParticipant').length
                      ? watch('groupParticipant').length
                      : 0}
                    人を選択中
                  </p>
                </div>
                <div className="pt-3 max-h-[300px] overflow-y-auto overflow-x-hidden scrollbar-gutter-stable">
                  {Array.isArray(participantsList) &&
                    dashboardMemberList
                      ?.filter(
                        (member) =>
                          participantsList?.findIndex(
                            (item) => item === member.id,
                          ) === -1,
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
                  {Array.isArray(participantsList) &&
                    dashboardMemberList
                      ?.filter(
                        (member) =>
                          participantsList?.findIndex(
                            (item) => item === member.id,
                          ) === -1,
                      )
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
                                        (participant) =>
                                          participant == member.id,
                                      )
                                        ? true
                                        : false
                                    }
                                    onChange={() => {
                                      const currentParticipantList =
                                        watch('groupParticipant') || [];
                                      const foundParticipantIndex =
                                        currentParticipantList.findIndex(
                                          (participant) =>
                                            participant == member.id,
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
                                          (participant) =>
                                            participant != member.id,
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
