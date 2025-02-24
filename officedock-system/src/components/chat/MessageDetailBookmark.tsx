import { format } from 'date-fns';
import { Fragment } from 'react';
import { useSession } from 'next-auth/react';

import AvatarIconWithDynamicColor from '@components/common/AvatarIcon';
import ImageRound from '@components/common/ImageRound';
import { MessageHoverBookmark } from './MessageHoverBookmark';

import {
  ADD_MEMBER_TASK_MESSAGE,
  CREATION_TASK_MESSAGE,
  DATE_FORMAT,
  EVENT_BEFORE_EDITED,
  EVENT_CREATED,
  EVENT_DELETED,
  EVENT_EDITED,
  MENTION_ALL_MEMBERS,
  MESSAGE_DELETED,
  NO_SETTING,
  REMOVE_MEMBER_TASK_MESSAGE,
  TASK_DELETED,
} from '@constants';
import { MessageType } from '@constants/enums';
import { MENTION_NAME_REGEX } from '@constants/regex';

import { ChatDashboardMember, ChatMessageResponse } from '@interfaces/chat';
import { Profile } from '@interfaces/user';

import { formatWithParagraphTags } from '@utils';
import {
  convertToCurrentTimezone,
  convertToTimeString,
  formatCheckDate,
  getFormattedDateTime,
  getJapaneseDayName,
} from '@utils/date';

export type MessageDetailProps = {
  isLastItem: boolean;
  messageDetail: ChatMessageResponse;
  dashboardMembers: ChatDashboardMember[];
  dashboardMemberList: Omit<Profile, 'birthday' | 'gender'>[];
  onGotoMessage: () => void;
  handleRemoveItemBookmark: (uuid: string) => void;
};

export const MessageDetailBookmark = ({
  isLastItem,
  messageDetail,
  dashboardMembers,
  dashboardMemberList,
  onGotoMessage,
  handleRemoveItemBookmark,
}: MessageDetailProps) => {
  const { data: session } = useSession();

  const renderAvatar = (senderId: number) => {
    const avatarColor =
      dashboardMembers.find((member) => member.id === senderId)?.avatarColor ||
      '';

    return (
      <div className="h-6">
        {AvatarIconWithDynamicColor({
          color: avatarColor,
          size: 36,
        })}
      </div>
    );
  };

  const highlightMentions = (message: string, mentions: number[]) => {
    if (!mentions || mentions.length === 0) return message;

    let processedHtml = '';
    let i = 0;

    while (i < message.length) {
      if (message[i] == '@') {
        let j = i + 1;
        while (j < message.length && MENTION_NAME_REGEX.test(message[j])) j++;

        const mentionName = message.substring(i + 1, j).trim();
        if (
          mentionName == MENTION_ALL_MEMBERS &&
          dashboardMemberList.every((participant) =>
            [...mentions, Number(session?.user.id)].includes(
              Number(participant.id),
            ),
          )
        ) {
          processedHtml += `<span style="color: #0068B7;">@${mentionName}</span>`;
          i = j;
          continue;
        }

        const matchedUser = dashboardMembers.find(
          (member) => member.fullName === mentionName,
        );

        if (matchedUser) {
          const color =
            matchedUser.id == session?.user.id ? '#0068B7' : '#77858F';
          processedHtml += `<span style="color: ${color};">@${mentionName}</span>`;
          i = j;
          continue;
        }
      }

      processedHtml += message[i];
      i++;
    }

    return processedHtml;
  };

  return (
    <Fragment>
      <div className="group  ">
        {
          <div
            className={`flex !box-border ${!isLastItem && 'border-b border-[#D2DBE1]'}  py-[14px] group-hover:bg-[#FFFFFF] ml-[30px] mr-3 group-hover:rounded-md`}>
            {renderAvatar(messageDetail.sender.id)}
            <div className={`ml-[10px] w-full pr-5 pt-2`}>
              <div className="flex justify-between items-center">
                <div className="flex gap-2 font-semibold items-center text-sm pb-2">
                  <p className="text-[15px] font-medium text-black">
                    {messageDetail.sender.fullName}{' '}
                  </p>
                  <p className="font-medium text-xs truncate max-w-[400px] text-[#77858F]">
                    {messageDetail.sender?.organizations?.name}
                  </p>
                  <ImageRound
                    name="Save"
                    src={`/icons/save-active.svg`}
                    className="w-[10px] h-[12px] hover:cursor-pointer"
                  />
                </div>
                <div className={`flex items-start`}>
                  <p className="font-medium text-xs text-[#77858F]">
                    {messageDetail.createdAt &&
                      formatCheckDate(
                        getFormattedDateTime(
                          convertToCurrentTimezone(messageDetail.createdAt),
                        ),
                      )}
                  </p>
                  {messageDetail.isEdited && !messageDetail.deletedAt && (
                    <div className="flex items-center">
                      <ImageRound
                        name="Dot"
                        src={'/icons/dot.svg'}
                        className="w-[4px] h-[4px] hover:cursor-pointer ml-2"
                      />
                      <p className="font-normal text-xs ml-2">編集済</p>
                    </div>
                  )}
                </div>
              </div>
              <div className="relative">
                <div>
                  <div className="flex flex-col">
                    {messageDetail.deletedAt ? (
                      <p
                        className={`font-normal text-sm hover:cursor-pointer -ml-1 p-1 rounded-[5px] text-gray-600 italic bg-[#f0f1f1] w-[220px]`}>
                        {MESSAGE_DELETED}
                      </p>
                    ) : (
                      <div>
                        {messageDetail.type === MessageType.MESSAGE && (
                          <p
                            className={` font-normal text-sm hover:cursor-pointer -ml-1 p-1 rounded-[5px]  `}
                            dangerouslySetInnerHTML={{
                              __html: highlightMentions(
                                messageDetail.message,
                                messageDetail.mentions || [],
                              ),
                            }}></p>
                        )}
                        {messageDetail.type === MessageType.REMOVE_SCHEDULE && (
                          <div className={`w-full flex justify-start`}>
                            <div
                              className={`text-xs font-normal bg-[#eaf8ff] !w-[100%] p-4 `}>
                              <div className={`flex flex-col items-start`}>
                                <p className="w-fit font-semibold text-black">
                                  {EVENT_DELETED}
                                </p>
                                <p className="font-semibold mt-2">日時</p>
                                <p>
                                  {messageDetail.scheduleChanges?.new &&
                                    `${format(
                                      messageDetail.scheduleChanges?.new
                                        .startDate as string,
                                      DATE_FORMAT,
                                    )}(${getJapaneseDayName(
                                      messageDetail.scheduleChanges?.new
                                        .startDate as string,
                                    )})`}{' '}
                                  {messageDetail.scheduleChanges?.new &&
                                    convertToTimeString(
                                      `${messageDetail.scheduleChanges?.new.startDate}`,
                                    )}{' '}
                                  ~{' '}
                                  {messageDetail.scheduleChanges?.new &&
                                    String(
                                      format(
                                        messageDetail.scheduleChanges?.new
                                          .startDate as string,
                                        DATE_FORMAT,
                                      ),
                                    ) !==
                                      String(
                                        format(
                                          messageDetail.scheduleChanges?.new
                                            .endDate as string,
                                          DATE_FORMAT,
                                        ),
                                      ) &&
                                    `${format(
                                      messageDetail.scheduleChanges?.new
                                        .endDate as string,
                                      DATE_FORMAT,
                                    )}(${getJapaneseDayName(
                                      messageDetail.scheduleChanges?.new
                                        .endDate as string,
                                    )})`}{' '}
                                  {messageDetail.scheduleChanges?.new &&
                                    convertToTimeString(
                                      `${messageDetail.scheduleChanges?.new.endDate}`,
                                    )}
                                </p>
                                <p className="font-semibold mt-2">参加者</p>
                                <p>
                                  {
                                    messageDetail.scheduleChanges?.participants?.find(
                                      (participant) => participant.isCreator,
                                    )?.name
                                  }{' '}
                                  {messageDetail.scheduleChanges?.participants?.find(
                                    (participant) => participant.isCreator,
                                  ) && '-主催者'}
                                </p>
                                {messageDetail.scheduleChanges?.participants?.find(
                                  (participant) => participant.isCreator,
                                )
                                  ? messageDetail.scheduleChanges?.participants
                                      ?.filter(
                                        (participant) => !participant.isCreator,
                                      )
                                      ?.slice(0, 3)
                                      .map((participant) => (
                                        <p key={participant.id}>
                                          {participant.name}{' '}
                                        </p>
                                      ))
                                  : messageDetail.scheduleChanges?.participants
                                      ?.slice(0, 4)
                                      .map((participant) => (
                                        <p key={participant.id}>
                                          {participant.name}{' '}
                                        </p>
                                      ))}
                                {messageDetail.scheduleChanges?.participants &&
                                  messageDetail.scheduleChanges?.participants
                                    ?.length > 4 && <p>その他</p>}
                                <p
                                  className={`mt-2 text-left`}
                                  dangerouslySetInnerHTML={{
                                    __html: formatWithParagraphTags(
                                      messageDetail.message,
                                    ),
                                  }}></p>
                              </div>
                            </div>
                          </div>
                        )}
                        {messageDetail.type === MessageType.EDIT_SCHEDULE && (
                          <div className={`w-full flex justify-start`}>
                            <div
                              className={`text-xs font-normal bg-[#eaf8ff] !w-[100%] p-4 `}>
                              <div className={`flex flex-col items-start`}>
                                <p className="w-fit font-semibold text-black">
                                  {EVENT_EDITED}
                                </p>
                                <p className="mt-2">
                                  変更あり:{' '}
                                  {messageDetail.scheduleChanges?.fieldChanges?.map(
                                    (field, index) => {
                                      return (
                                        <span key={index}>
                                          {field}
                                          {messageDetail.scheduleChanges &&
                                            messageDetail.scheduleChanges
                                              .fieldChanges &&
                                            index <
                                              messageDetail.scheduleChanges
                                                .fieldChanges.length -
                                                1 &&
                                            '、'}
                                        </span>
                                      );
                                    },
                                  )}
                                </p>
                                <p className="font-semibold mt-2">日時</p>
                                <div className={`text-left`}>
                                  <p>
                                    {messageDetail.scheduleChanges?.new &&
                                      `${format(
                                        messageDetail.scheduleChanges?.new
                                          .startDate as string,
                                        DATE_FORMAT,
                                      )}(${getJapaneseDayName(
                                        messageDetail.scheduleChanges?.new
                                          .startDate as string,
                                      )})`}{' '}
                                    {messageDetail.scheduleChanges?.new &&
                                      convertToTimeString(
                                        `${messageDetail.scheduleChanges?.new.startDate}`,
                                      )}{' '}
                                    ~{' '}
                                    {messageDetail.scheduleChanges?.new &&
                                      String(
                                        format(
                                          messageDetail.scheduleChanges?.new
                                            .startDate as string,
                                          DATE_FORMAT,
                                        ),
                                      ) !==
                                        String(
                                          format(
                                            messageDetail.scheduleChanges?.new
                                              .endDate as string,
                                            DATE_FORMAT,
                                          ),
                                        ) &&
                                      `${format(
                                        messageDetail.scheduleChanges?.new
                                          .endDate as string,
                                        DATE_FORMAT,
                                      )}(${getJapaneseDayName(
                                        messageDetail.scheduleChanges?.new
                                          .endDate as string,
                                      )})`}{' '}
                                    {messageDetail.scheduleChanges?.new &&
                                      convertToTimeString(
                                        `${messageDetail.scheduleChanges?.new.endDate}`,
                                      )}
                                  </p>
                                  {messageDetail.scheduleChanges?.old && (
                                    <p>
                                      {'('}
                                      {EVENT_BEFORE_EDITED}
                                      {messageDetail.scheduleChanges?.old &&
                                        `${format(
                                          messageDetail.scheduleChanges?.old
                                            .startDate as string,
                                          DATE_FORMAT,
                                        )}(${getJapaneseDayName(
                                          messageDetail.scheduleChanges?.old
                                            .startDate as string,
                                        )})`}{' '}
                                      {messageDetail.scheduleChanges?.old &&
                                        convertToTimeString(
                                          `${messageDetail.scheduleChanges?.old.startDate}`,
                                        )}{' '}
                                      ~{' '}
                                      {messageDetail.scheduleChanges?.old &&
                                        String(
                                          format(
                                            messageDetail.scheduleChanges?.old
                                              .startDate as string,
                                            DATE_FORMAT,
                                          ),
                                        ) !==
                                          String(
                                            format(
                                              messageDetail.scheduleChanges?.old
                                                .endDate as string,
                                              DATE_FORMAT,
                                            ),
                                          ) &&
                                        `${format(
                                          messageDetail.scheduleChanges?.old
                                            .endDate as string,
                                          DATE_FORMAT,
                                        )}(${getJapaneseDayName(
                                          messageDetail.scheduleChanges?.old
                                            .endDate as string,
                                        )})`}{' '}
                                      {messageDetail.scheduleChanges?.old &&
                                        convertToTimeString(
                                          `${messageDetail.scheduleChanges?.old.endDate}`,
                                        )}
                                      {')'}
                                    </p>
                                  )}
                                </div>
                                <p className="font-semibold mt-2">参加者</p>
                                <p>
                                  {
                                    messageDetail.scheduleChanges?.participants?.find(
                                      (participant) => participant.isCreator,
                                    )?.name
                                  }{' '}
                                  {messageDetail.scheduleChanges?.participants?.find(
                                    (participant) => participant.isCreator,
                                  ) && '-主催者'}
                                </p>
                                {messageDetail.scheduleChanges?.participants?.find(
                                  (participant) => participant.isCreator,
                                )
                                  ? messageDetail.scheduleChanges?.participants
                                      ?.filter(
                                        (participant) => !participant.isCreator,
                                      )
                                      ?.slice(0, 3)
                                      .map((participant) => (
                                        <p key={participant.id}>
                                          {participant.name}{' '}
                                        </p>
                                      ))
                                  : messageDetail.scheduleChanges?.participants
                                      ?.slice(0, 4)
                                      .map((participant) => (
                                        <p key={participant.id}>
                                          {participant.name}{' '}
                                        </p>
                                      ))}
                                {messageDetail.scheduleChanges?.participants &&
                                  messageDetail.scheduleChanges?.participants
                                    ?.length > 4 && <p>その他</p>}

                                <p
                                  className={`mt-2 text-left`}
                                  dangerouslySetInnerHTML={{
                                    __html: formatWithParagraphTags(
                                      messageDetail.message,
                                    ),
                                  }}></p>
                              </div>
                            </div>
                          </div>
                        )}
                        {messageDetail.type ===
                          MessageType.CREATION_SCHEDULE && (
                          <div className={`w-full flex justify-start`}>
                            <div
                              className={`text-xs font-normal bg-[#eaf8ff] !w-[100%] p-4 `}>
                              <div className={`flex flex-col items-start`}>
                                <p className="w-fit font-semibold text-black">
                                  {messageDetail.sender.fullName}{' '}
                                  {EVENT_CREATED}
                                </p>
                                <p className="font-semibold mt-2">日時</p>
                                <p>
                                  {messageDetail.scheduleChanges?.new &&
                                    `${format(
                                      messageDetail.scheduleChanges?.new
                                        .startDate as string,
                                      DATE_FORMAT,
                                    )}(${getJapaneseDayName(
                                      messageDetail.scheduleChanges?.new
                                        .startDate as string,
                                    )})`}{' '}
                                  {messageDetail.scheduleChanges?.new &&
                                    convertToTimeString(
                                      `${messageDetail.scheduleChanges?.new.startDate}`,
                                    )}{' '}
                                  ~{' '}
                                  {messageDetail.scheduleChanges?.new &&
                                    String(
                                      format(
                                        messageDetail.scheduleChanges?.new
                                          .startDate as string,
                                        DATE_FORMAT,
                                      ),
                                    ) !==
                                      String(
                                        format(
                                          messageDetail.scheduleChanges?.new
                                            .endDate as string,
                                          DATE_FORMAT,
                                        ),
                                      ) &&
                                    `${format(
                                      messageDetail.scheduleChanges?.new
                                        .endDate as string,
                                      DATE_FORMAT,
                                    )}(${getJapaneseDayName(
                                      messageDetail.scheduleChanges?.new
                                        .endDate as string,
                                    )})`}{' '}
                                  {messageDetail.scheduleChanges?.new &&
                                    convertToTimeString(
                                      `${messageDetail.scheduleChanges?.new.endDate}`,
                                    )}
                                </p>
                                <p className="font-semibold mt-2">参加者</p>
                                <p>
                                  {
                                    messageDetail.scheduleChanges?.participants?.find(
                                      (participant) => participant.isCreator,
                                    )?.name
                                  }{' '}
                                  {messageDetail.scheduleChanges?.participants?.find(
                                    (participant) => participant.isCreator,
                                  ) && '-主催者'}
                                </p>
                                {messageDetail.scheduleChanges?.participants?.find(
                                  (participant) => participant.isCreator,
                                )
                                  ? messageDetail.scheduleChanges?.participants
                                      ?.filter(
                                        (participant) => !participant.isCreator,
                                      )
                                      ?.slice(0, 3)
                                      .map((participant) => (
                                        <p key={participant.id}>
                                          {participant.name}{' '}
                                        </p>
                                      ))
                                  : messageDetail.scheduleChanges?.participants
                                      ?.slice(0, 4)
                                      .map((participant) => (
                                        <p key={participant.id}>
                                          {participant.name}{' '}
                                        </p>
                                      ))}
                                {messageDetail.scheduleChanges?.participants &&
                                  messageDetail.scheduleChanges?.participants
                                    ?.length > 4 && <p>その他</p>}
                              </div>
                            </div>
                          </div>
                        )}
                        {(messageDetail.type === MessageType.CREATION_TASK ||
                          messageDetail.type ===
                            MessageType.REMOVE_MEMBER_TASK ||
                          messageDetail.type === MessageType.ADD_MEMBER_TASK) &&
                          (messageDetail.task ? (
                            <div className={`w-full flex justify-start`}>
                              <div
                                className={`text-xs font-normal bg-[#eaf8ff] w-[750px] p-4 `}>
                                <div className={`flex flex-col items-start`}>
                                  <h4 className="text-sm w-fit font-medium text-black h-5">
                                    {messageDetail.type ==
                                    MessageType.CREATION_TASK
                                      ? CREATION_TASK_MESSAGE
                                      : messageDetail.type ==
                                          MessageType.REMOVE_MEMBER_TASK
                                        ? REMOVE_MEMBER_TASK_MESSAGE
                                        : ADD_MEMBER_TASK_MESSAGE}
                                  </h4>
                                  <h4 className="text-sm w-fit text-black h-5 truncate max-w-[500px]">
                                    タスクのタイトル:{' '}
                                    {messageDetail.task.title || NO_SETTING}
                                  </h4>
                                  {messageDetail.type !==
                                    MessageType.REMOVE_MEMBER_TASK && (
                                    <p className="w-fit mt-2">
                                      締切 :{' '}
                                      {(messageDetail.task.deadline &&
                                        format(
                                          messageDetail.task.deadline,
                                          DATE_FORMAT,
                                        )) ||
                                        NO_SETTING}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className={`w-full flex justify-start`}>
                              <div
                                className={`text-sm font-normal bg-[#eaf8ff] p-1`}>
                                <div className={`flex flex-col items-start`}>
                                  <p
                                    className={`font-normal w-[500px]  text-sm hover:cursor-pointer text-start -ml-1 p-1 rounded-[5px] text-gray-600 italic`}>
                                    {TASK_DELETED}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                  <>
                    {!messageDetail.deletedAt && (
                      <MessageHoverBookmark
                        uuid={messageDetail.uuid}
                        onGotoMessage={onGotoMessage}
                        handleRemoveItemBookmark={handleRemoveItemBookmark}
                      />
                    )}
                  </>
                </div>
              </div>
            </div>
          </div>
        }
      </div>
    </Fragment>
  );
};
