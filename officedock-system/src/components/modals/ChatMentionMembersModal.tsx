import { Dispatch, SetStateAction, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { Editor } from '@tiptap/react';

import AvatarIconWithDynamicColor from '@components/common/AvatarIcon';
import Checkbox from '@components/common/Checkbox';
import ImageRound from '@components/common/ImageRound';
import InputSearch from '@components/common/InputSearch';

import { MENTION_ALL_MEMBERS, NO_OPTIONS } from '@constants';
import { ChatDashboardMember, ChatParticipant } from '@interfaces/chat';

interface ChatMentionMembersModalProps {
  editor: Editor | null,
  mentionMembers: ChatParticipant[];
  mentionMemberOptions: ChatParticipant[];
  searchMentionMembers: string;
  mentionMemberModalPosition: {
    left: number;
    top?: number;
    bottom?: number;
  };
  dashboardMembers: ChatDashboardMember[];
  setMentionMembers: Dispatch<SetStateAction<ChatParticipant[]>>;
  handleCheckboxClick: (editor: Editor, member: ChatParticipant, type: string) => void
  setSearchMentionMembers: Dispatch<SetStateAction<string>>;
  onClose: () => void;
}

export const ChatMentionMembersModal = ({
  editor,
  mentionMemberOptions,
  searchMentionMembers,
  mentionMembers,
  mentionMemberModalPosition,
  dashboardMembers,
  setMentionMembers,
  handleCheckboxClick,
  setSearchMentionMembers,
  onClose,
}: ChatMentionMembersModalProps) => {
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const { data: session } = useSession();

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const handleClosePopover = (event: MouseEvent) => {
    if (
      popoverRef.current &&
      !popoverRef.current.contains(event.target as Node)
    ) {
      onClose();
    }
  };

  useEffect(() => {
    document.addEventListener('click', handleClosePopover, true);
    return () => {
      document.removeEventListener('click', handleClosePopover, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handleClosePopover]);

  return (
    <div className="z-50 flex items-center justify-center">
      <div
        ref={popoverRef}
        className="relative bottom-10 -translate-x-1/2 z-10 shadow-md transform bg-white w-[280px] h-[300px] rounded-[8px] p-[10px]"
        style={{
          position: 'absolute',
          top: `${mentionMemberModalPosition.top ? `${mentionMemberModalPosition.top}px` : 'auto'}`,
          bottom: `${mentionMemberModalPosition.top ? 'auto' : '250px'}`,
          left: `${mentionMemberModalPosition.left + 15}px`,
        }}>
        {mentionMemberModalPosition.top ? (
          <div className="absolute left-1/2 -translate-x-1/2 -top-2.5 w-4 h-4 bg-white shadow-sm z-50 border-l border-t rotate-45"></div>
        ) : (
          <div className="absolute left-1/2 -translate-x-1/2 -bottom-2 w-4 h-4 bg-white shadow-sm z-50 border-r border-b rotate-45"></div>
        )}

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
                        (mentionMember) => mentionMember.id === participant.id,
                      )}
                      onChange={() => {
                        let updatedMentionMembers = [...mentionMembers];
                        const foundMentionMember = updatedMentionMembers.find(
                          (member) => member.id === participant.id,
                        );

                        if (foundMentionMember) {
                          updatedMentionMembers = updatedMentionMembers.filter(
                            (member) => member.id !== participant.id,
                          );
                          handleCheckboxClick(editor as Editor, participant, 'remove');
                        } else {
                          handleCheckboxClick(editor as Editor, participant, 'insert');
                          updatedMentionMembers = [
                            ...updatedMentionMembers,
                            participant,
                          ];
                        }

                        setMentionMembers(updatedMentionMembers);
                      }}
                    />
                  </div>
                  <div className="flex gap-2 items-center p-1.5 hover:cursor-pointer">
                    {participant.id == null &&
                    participant.fullName == MENTION_ALL_MEMBERS ? (
                      <ImageRound
                        className="w-8 h-8"
                        src="/icons/multi-users.svg"
                        border="full"
                        name="Avatar user"
                      />
                    ) : dashboardMembers &&
                      dashboardMembers.find(
                        (memberWithAvatar) =>
                          memberWithAvatar.id === participant.id,
                      ) ? (
                      <>
                        {AvatarIconWithDynamicColor({
                          color:
                            dashboardMembers?.find(
                              (memberWithAvatar) =>
                                memberWithAvatar.id === participant.id,
                            )?.avatarColor || '#0068B6',
                          size: 33,
                        })}
                      </>
                    ) : (
                      <ImageRound
                        className="w-8 h-8"
                        src="/images/avatar-default.svg"
                        border="full"
                        name="Avatar user"
                      />
                    )}
                    <p className="font-medium text-[14px] text-black !break-words max-w-[160px]">
                      {participant.fullName}
                    </p>
                  </div>
                </div>
              ))
          )}
        </div>
      </div>
    </div>
  );
};
