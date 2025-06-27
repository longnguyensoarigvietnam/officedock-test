import { memo, useState } from 'react';
import { useMutation } from 'react-query';
import { useSessionCache } from '@providers/SessionCacheProvider';

import { useRouter } from 'next/navigation';

import Modal from '../common/Modal';
import Button from '@components/common/Button';
import CustomUserAvatar from '@components/common/AvatarIcon/CustomUserAvatar';
import ImageRound from '@components/common/ImageRound';
import {
  SkeletonContainer,
  SkeletonElement,
} from '@components/common/SkeletonLoading';

import { ItemStartType, PermissionsSystem } from '@constants/enums';
import { apiRouters, pageRouters } from '@constants/routers';
import { NO_EVENT_MEMBER, TASK_STARTING } from '@constants';

import useUserDetail from '@hooks/useUserDetail';
import { ChatRoomItem } from '@interfaces/chat';
import api from '@base/api';
import { hasPermissionInArray } from '@utils';

export type DetailProfileMemberProps = {
  userId: string;
  avatarColor: string;
  avatarUrl: string;
  open: boolean;
  type: string;
  organizationId: string;
  onConfirm: () => void;
  onClose: () => void;
};

const ViewDetail = ({ label, value }: { label: string; value: string }) => {
  return (
    <div className={`w-full flex items-start`}>
      <label className="font-normal text-[#77858F] text-sm w-[120px]">
        {label}
      </label>
      <div className="text-black font-medium text-sm flex-1 ">
        <span className="line-clamp-3 break-all">{value}</span>
      </div>
    </div>
  );
};

const DetailProfileMemberModal = memo(
  ({
    userId,
    avatarColor,
    avatarUrl,
    organizationId,
    onClose,
  }: DetailProfileMemberProps) => {
    const { data: session } = useSessionCache();
    const router = useRouter();
    const [isCalling, setIsCalling] = useState(true);
    const { userDetail } = useUserDetail({
      userId: userId,
      onSettled: () => {
        setIsCalling(false);
      },
    });

    const mainOrganization = userDetail?.organizations.find(
      (org) => org.isMain,
    );
    const differentOrganization = userDetail?.organizations
      .filter((org) => !org.isMain)
      .map((org) => org.name);

    // Handle create chat
    const handleCreateChat = async (data: {
      name: string;
      participantIds: number[];
    }): Promise<ChatRoomItem> => {
      const response = await api.post(apiRouters.CHAT_LIST, data);
      return response.data;
    };

    const { mutate: createChat } = useMutation(
      'handleCreateChat',
      handleCreateChat,
      {
        onSuccess: async (data) => {
          router.push(`${pageRouters.CHAT_MANAGEMENT.href}?room=${data.code}`);
        },
        onError: () => {},
        onSettled: () => {},
      },
    );
    const isPermissionChatView =
      session?.user.permissions &&
      hasPermissionInArray(
        session?.user.permissions,
        PermissionsSystem.CHAT_VIEW,
      );
    const isPermissionSkillMapView =
      session?.user.permissions &&
      hasPermissionInArray(
        session?.user.permissions,
        PermissionsSystem.SKILL_MAP_VIEW,
      );
    const isPermissionDailyTeamView =
      session?.user.permissions &&
      hasPermissionInArray(
        session?.user.permissions,
        PermissionsSystem.TEAM_DAILY_REPORT_VIEW,
      );

    return (
      <Modal
        open={true}
        className="font-primary bg-[#F8FAFC] w-[540px] !rounded-lg !p-10"
        onClose={onClose}
        title="">
        {isCalling ? (
          <SkeletonContainer className="w-full !bg-[#F8FAFC] !p-0">
            <div className="flex items-center gap-2">
              <SkeletonElement className="!w-12 !h-12 !rounded-full" />
              <div className="flex flex-col gap-2">
                <SkeletonElement className="!w-[103px]" />
                <SkeletonElement className="!w-[248px]" />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <SkeletonElement />
              <SkeletonElement className="!w-[260px]" />
            </div>
            <div className="flex flex-col gap-2">
              <SkeletonElement />
              <SkeletonElement className="!w-[260px]" />
            </div>
          </SkeletonContainer>
        ) : (
          <div className="relative">
            <div
              className={`absolute top-[-20px] right-[-20px] w-[30px] h-[30px] flex items-center justify-center rounded-full bg-white`}>
              <ImageRound
                className={`mt-1 w-5 h-5 hover:cursor-pointer `}
                src="/icons/close.svg"
                name="Close modal"
                onClick={onClose}
              />
            </div>
            <div className="flex items-start gap-[10px]">
              <CustomUserAvatar
                avatarUrl={avatarUrl || ''}
                avatarColor={avatarColor || ''}
                size={36}
              />
              <p className="text-black font-medium text-[18px] line-clamp-3 break-all pt-1">
                {userDetail?.profile.fullName}
              </p>
            </div>
            <div className="flex">
              <div className="flex flex-1 flex-col gap-4 mt-[22px]">
                <ViewDetail
                  label="メインチーム"
                  value={mainOrganization ? mainOrganization.name : ''}
                />
                <ViewDetail
                  label="サブチーム"
                  value={
                    differentOrganization
                      ? differentOrganization.join(' / ')
                      : ''
                  }
                />
                <ViewDetail
                  label="現在の予定"
                  value={
                    userDetail && userDetail.currentEvent
                      ? userDetail.currentEvent.type === ItemStartType.SCHEDULE
                        ? userDetail.currentEvent.title
                        : TASK_STARTING
                      : NO_EVENT_MEMBER
                  }
                />
                <ViewDetail
                  label="メールアドレス"
                  value={userDetail?.email || ''}
                />
              </div>
              <div className="w-[136px] flex flex-col gap-1 justify-end">
                {isPermissionChatView && (
                  <Button
                    onClick={() => {
                      if (userDetail && userDetail.id) {
                        createChat({
                          name: '',
                          participantIds: [userDetail?.id],
                        });
                      }
                    }}
                    className="!py-0 !pl-[14px] !pr-0 !justify-start w-[136px] h-9 flex items-center  gap-2">
                    <ImageRound
                      src="/icons/chat.svg"
                      name="Extend box"
                      className={`!w-[18px] !h-4 `}
                    />
                    <span>チャット</span>
                  </Button>
                )}

                {isPermissionSkillMapView && (
                  <Button
                    onClick={() => {
                      router.push(pageRouters.SKILL_MAP.href);
                    }}
                    className="!py-0 !pl-[14px] !pr-0 !justify-start w-[136px] h-9 flex items-center  gap-2">
                    <ImageRound
                      src="/icons/skill-map.svg"
                      name="Extend box"
                      className={`!w-4 !h-4 `}
                    />
                    <span>スキルマップ</span>
                  </Button>
                )}
                {isPermissionDailyTeamView && (
                  <Button
                    onClick={() => {
                      router.push(
                        `${pageRouters.DAILY_REPORT_TEAM_DETAIL.href(
                          String(userDetail?.id),
                        )}?organization=${organizationId}`,
                      );
                    }}
                    className="!py-0 !pl-[14px] !pr-0 !justify-start w-[136px] h-9 flex items-center  gap-2 ">
                    <ImageRound
                      src="/icons/daily-report.svg"
                      name="Extend box"
                      className={`!w-4 !h-4 `}
                    />
                    <span>日報</span>
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>
    );
  },
);

export default DetailProfileMemberModal;
