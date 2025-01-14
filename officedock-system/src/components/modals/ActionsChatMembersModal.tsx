'use client';
import { memo, useState } from 'react';
import { useMutation } from 'react-query';
import { useSession } from 'next-auth/react';

import Modal from '../common/Modal';
import InputSearch from '@components/common/InputSearch';
import ImageRound from '@components/common/ImageRound';
import Button from '@components/common/Button';

import { apiRouters } from '@constants/routers';
import { NO_OPTIONS } from '@constants';

import useDashboardMemberList from '@hooks/useDashBoardMemberList';
import api from '@base/api';
import { hasPermissionInArray } from '@utils';
import { PermissionsSystem } from '@constants/enums';

export type ActionsChatMembersModalProps = {
  open: boolean;
  onClose: () => void;
  participantsList: number[] | undefined;
  code: string;
};

const ActionsChatMembersModal = memo(
  ({ open, onClose, participantsList, code }: ActionsChatMembersModalProps) => {
    const [searchName, setSearchName] = useState<string>('');
    const [isCall, setIsCall] = useState(false);
    const { dashboardMemberList } = useDashboardMemberList();

    const { data: session } = useSession();

    const handleUpdateMemberList = async (data: {
      code: string;
      newList: number[];
    }) => {
      const response = await api.patch(apiRouters.CHAT_DETAIL(data.code), {
        participantIds: data.newList,
      });
      return response;
    };

    const { mutate: updateMemberList } = useMutation(
      'updateMemberList',
      handleUpdateMemberList,
      {
        onSettled: () => {
          setIsCall(false);
        },
      },
    );

    const handleConfirmUpdateMemberList = (type: string, id: number) => {
      if (participantsList) {
        let newList = [...participantsList];
        if (type === 'remove') {
          newList = newList.filter((member) => member !== id);
        } else {
          newList = [...participantsList, id];
        }
        const data = { code, newList };
        setIsCall(true);
        updateMemberList(data);
      }
    };

    return (
      <Modal
        open={open}
        className="font-primary bg-white !rounded-2xl !p-7 w-[450px] !mr-0 text-gray-700"
        onClose={onClose}
        title="メンバー招待">
        <div className="mt-2">
          <p className="text-sm font-semibold">チャットルームのメンバー</p>
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
                      <p className="font-normal text-sm truncate max-w-[200px] text-black">
                        {member.fullName}
                      </p>
                      {member.id !== session?.user.id &&
                        session?.user.permissions &&
                        hasPermissionInArray(
                          session?.user.permissions,
                          PermissionsSystem.CHAT_UPDATE,
                        ) && (
                          <Button
                            sz="sm"
                            variant="outline"
                            className="w-20 h-8 text-xs ml-auto !border-[#EF4444] !text-[#EF4444]"
                            type="button"
                            name="Remove"
                            disabled={isCall}
                            onClick={() =>
                              handleConfirmUpdateMemberList('remove', member.id)
                            }>
                            削除
                          </Button>
                        )}
                    </div>
                  );
                })}
          </div>
        </div>
        {session?.user.permissions &&
          hasPermissionInArray(
            session?.user.permissions,
            PermissionsSystem.CHAT_UPDATE,
          ) && (
            <>
              <InputSearch
                placeholder="メンバー検索"
                className="w-[100%]"
                inputClassName="!py-2 mb-3"
                onChange={(e) => setSearchName(e.target.value)}
              />
              <div className="">
                <p className="text-sm font-semibold">ユーザー一覧</p>
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
                            className={`flex gap-5 items-center p-1.5 hover:cursor-pointer`}
                            key={member.id}
                            onClick={() =>
                              handleConfirmUpdateMemberList('add', member.id)
                            }>
                            <ImageRound
                              className="w-8 h-8"
                              src="/images/avatar-default.svg"
                              border="full"
                              name="Avatar user"
                            />
                            <p className="font-normal text-sm truncate max-w-[200px] text-black">
                              {member.fullName}
                            </p>
                            <Button
                              sz="sm"
                              variant="outline"
                              className="w-20 h-8 text-xs ml-auto"
                              disabled={isCall}
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
            </>
          )}
      </Modal>
    );
  },
);

export default ActionsChatMembersModal;
