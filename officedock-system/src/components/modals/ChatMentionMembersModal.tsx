import { Dispatch, SetStateAction, useEffect, useRef, useState } from 'react';
import { Editor } from '@tiptap/react';

import { useSessionCache } from '@providers/SessionCacheProvider';

import Checkbox from '@components/common/Checkbox';
import ImageRound from '@components/common/ImageRound';
import InputSearch from '@components/common/InputSearch';
import { DynamicTooltip } from '@components/tooltip/DynamicTooltip';
import CustomUserAvatar from '@components/common/AvatarIcon/CustomUserAvatar';

import { MENTION_ALL_MEMBERS, NO_OPTIONS } from '@constants';

import { ChatParticipant } from '@interfaces/chat';
import { Profile } from '@interfaces/user';

interface ChatMentionMembersListProps {
  editor: Editor | null;
  mentionMembers: ChatParticipant[];
  mentionMemberOptions: ChatParticipant[];
  searchMentionMembers: string;
  dashboardMemberList: Omit<Profile, "birthday" | "gender">[]
  customModalPosition: string;
  customArrowPosition: string;
  setMentionMembers: Dispatch<SetStateAction<ChatParticipant[]>>;
  handleCheckboxClick: (
    editor: Editor,
    member: ChatParticipant,
    type: string,
  ) => void;
  setSearchMentionMembers: Dispatch<SetStateAction<string>>;
}

export const ChatMentionMembersList = ({
  editor,
  mentionMemberOptions,
  searchMentionMembers,
  mentionMembers,
  dashboardMemberList,
  customModalPosition,
  customArrowPosition,
  setMentionMembers,
  handleCheckboxClick,
  setSearchMentionMembers,
}: ChatMentionMembersListProps) => {
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const [openMentionMembersModal, setOpenMentionMembersModal] =
    useState<boolean>(false);
  const { data: session } = useSessionCache();

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const handleClosePopover = (event: MouseEvent) => {
    if (
      popoverRef.current &&
      !popoverRef.current.contains(event.target as Node)
    ) {
      setOpenMentionMembersModal(false);
      setSearchMentionMembers('');
    }
  };

  useEffect(() => {
    document.addEventListener('click', handleClosePopover, true);
    return () => {
      document.removeEventListener('click', handleClosePopover, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handleClosePopover]);

  const renderAvatar = (participantId: number) => {
    const memberInfo = dashboardMemberList.find(
      (memberWithAvatar) => memberWithAvatar.id === participantId,
    );

    return (
      <div className="h-[24px]">
        <CustomUserAvatar
          avatarUrl={memberInfo?.avatar || ''}
          avatarColor={memberInfo?.avatarColor || ''}
          size={24}
        />
      </div>
    );
  };

  return (
    <div className="relative z-20">
      <DynamicTooltip content={'メンション'} placement="top">
        <div
          className="hover:bg-[#77858F26] rounded-full p-[7px] flex items-center justify-center hover:cursor-pointer"
          onClick={() => {
            setOpenMentionMembersModal(true);
          }}>
          <ImageRound
            name="Mention"
            src="/icons/mention.svg"
            className="w-[16px] h-[16px]"
          />
        </div>
      </DynamicTooltip>
      {openMentionMembersModal && (
        <div
          ref={popoverRef}
          className={`absolute after:content-[''] after:absolute ${customArrowPosition} after:left-1/2 after:-translate-x-1/2 after:border-8 after:border-transparent p-[10px] ${customModalPosition} w-[280px] h-[300px] rounded-lg bg-white`}
          style={{
            boxShadow: '0px 4px 8px 0px #0000000F',
          }}>
          <InputSearch
            placeholder="名前を検索"
            className="w-full mb-3"
            inputClassName="!py-2 !border-[#77858F]"
            onChange={(e) => setSearchMentionMembers(e.target.value)}
          />
          <div className="max-h-[230px] overflow-x-hidden overflow-y-auto">
            {mentionMemberOptions.length &&
            mentionMemberOptions
              .filter((participant) => participant.id !== session?.user.id)
              .filter((participant) =>
                participant.fullName
                  .toUpperCase()
                  .includes(searchMentionMembers.toUpperCase()),
              ).length == 0 ? (
              <p className="text-gray-500 text-center text-sm">{NO_OPTIONS}</p>
            ) : (
              mentionMemberOptions
                .filter((participant) => participant.id !== session?.user.id)
                .filter((participant) =>
                  participant.fullName
                    .toUpperCase()
                    .includes(searchMentionMembers.toUpperCase()),
                )
                .map((participant) => (
                  <div
                    key={participant.id}
                    className={`flex items-center px-3 ${
                      mentionMembers.find(
                        (mentionMember) => mentionMember.id === participant.id,
                      ) && 'bg-[#EBF1F7]'
                    }`}>
                    <div className="w-5">
                      <Checkbox
                        label=""
                        className="mr-2"
                        isChecked={mentionMembers.some(
                          (mentionMember) =>
                            mentionMember.id === participant.id,
                        )}
                        onChange={() => {
                          let updatedMentionMembers = [...mentionMembers];
                          const foundMentionMember = updatedMentionMembers.find(
                            (member) => member.id === participant.id,
                          );

                          if (foundMentionMember) {
                            updatedMentionMembers =
                              updatedMentionMembers.filter(
                                (member) => member.id !== participant.id,
                              );
                            handleCheckboxClick(
                              editor as Editor,
                              participant,
                              'remove',
                            );
                          } else {
                            handleCheckboxClick(
                              editor as Editor,
                              participant,
                              'insert',
                            );
                            updatedMentionMembers = [
                              ...updatedMentionMembers,
                              participant,
                            ];
                          }

                          setMentionMembers(updatedMentionMembers);
                        }}
                      />
                    </div>
                    <div className="flex gap-2 items-center p-2 hover:cursor-pointer">
                      {participant.id == null &&
                      participant.fullName == MENTION_ALL_MEMBERS ? (
                        <ImageRound
                          className="w-[24px] h-[24px]"
                          src="/icons/multi-users.svg"
                          border="full"
                          name="Avatar user"
                        />
                      ) : dashboardMemberList &&
                        dashboardMemberList.find(
                          (memberWithAvatar) =>
                            memberWithAvatar.id === participant.id,
                        ) ? (
                        <>{renderAvatar(participant.id as number)}</>
                      ) : (
                        <ImageRound
                          className="w-[24px] h-[24px]"
                          src="/images/avatar-default.svg"
                          border="full"
                          name="Avatar user"
                        />
                      )}
                      <p className="font-medium text-[14px] text-black !break-all max-w-[150px]">
                        {participant.fullName}
                      </p>
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
