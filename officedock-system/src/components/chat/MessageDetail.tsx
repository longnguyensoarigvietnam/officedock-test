import Image from 'next/image';
import { format } from 'date-fns';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Dispatch, Fragment, MutableRefObject, SetStateAction } from 'react';
import { Editor } from '@tiptap/react';

import ImageRound from '@components/common/ImageRound';
import Button from '@components/common/Button';
import { ProgressBar } from '@components/common/ProgressBar';
import CustomUserAvatar from '@components/common/AvatarIcon/CustomUserAvatar';

import {
  ADD_MEMBER_TASK_MESSAGE,
  CREATION_TASK_MESSAGE,
  DATE_FORMAT,
  DELETED_SKILL_UP_MESSAGE,
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
import {
  ChatRoomType,
  MessageType,
  SubmitLevelStatus,
  TaskRepetitiveValue,
} from '@constants/enums';
import { pageRouters } from '@constants/routers';

import {
  ChatDashboardMember,
  ChatMessageResponse,
  ChatParticipant,
  ChatRoomDetail,
} from '@interfaces/chat';

import {
  displayRepetitiveEventTime,
  formatWithParagraphTags,
  getFileURL,
  renderEventDatetimeInChat,
  renderScheduleChangeInCalendarRoom,
} from '@utils';
import {
  convertToCurrentTimezone,
  formatCheckDate,
  getFormattedDateTime,
} from '@utils/date';

import { MessageHoverOptions } from './MessageHoverOptions';
import DetailReactionChat from './DetailReactionChat';

export type MessageDetailProps = {
  chatRoomDetail: ChatRoomDetail | undefined;
  uploadFileStatus: Record<
    string,
    {
      progress: number;
      errorMsg?: string;
    }
  >;
  messageDetail: ChatMessageResponse;
  msgEditing?: string;
  dashboardMembers: ChatDashboardMember[];
  editor: Editor | null;
  highlightedMessageId: string | null;
  setPreserveFiles: Dispatch<
    SetStateAction<
      {
        uuid: string;
        file: {
          name: string;
        };
      }[]
    >
  >;
  setOpenUploadFilesModal: Dispatch<SetStateAction<boolean>>;
  setUploadFiles: Dispatch<
    SetStateAction<
      {
        uuid: string;
        file: File;
      }[]
    >
  >;
  setMessage: Dispatch<SetStateAction<string>>;
  setMentionMembers: Dispatch<SetStateAction<ChatParticipant[]>>;
  setMsgIdUpdated?: Dispatch<SetStateAction<string | undefined>>;
  setOpenConfirmDeleteModal: Dispatch<SetStateAction<boolean>>;
  setMsgIdDeleted?: Dispatch<SetStateAction<string | undefined>>;
  setMsgEditing?: Dispatch<SetStateAction<string | undefined>>;
  handleActionEditTask: (id: number) => void;
  handleConfirmUpdateMsg: (uuid: string) => void;
  handleConfirmGetDataDetailEvent: (id: string) => void;
  handleUpdateBookmark: (dataUuid: string) => void;
  handleReactionClick: (msgUuid: string, icon: string) => void;
  handleRemoveReactionClick: (msgUuid: string, icon: string) => void;
  handleResetChatRoomNotification: () => void;
  chatContainerRef: MutableRefObject<HTMLDivElement | null>;
};

export const MessageDetail = ({
  chatRoomDetail,
  uploadFileStatus,
  messageDetail,
  dashboardMembers,
  editor,
  chatContainerRef,
  highlightedMessageId,
  setPreserveFiles,
  setOpenUploadFilesModal,
  setUploadFiles,
  setMessage,
  setMentionMembers,
  setMsgIdUpdated,
  setOpenConfirmDeleteModal,
  setMsgIdDeleted,
  handleUpdateBookmark,
  handleActionEditTask,
  handleConfirmGetDataDetailEvent,
  handleReactionClick,
  handleRemoveReactionClick,
  handleResetChatRoomNotification,
}: MessageDetailProps) => {
  const { data: session } = useSession();
  const router = useRouter();

  // Delete message
  const handleOpenDeleteMsgModal = (id: string) => {
    setOpenConfirmDeleteModal(true);
    if (setMsgIdDeleted) {
      setMsgIdDeleted(id);
    }
  };

  // Edit message
  const handleOpenEditForm = async (id: string) => {
    if (setMsgIdUpdated) {
      setMsgIdUpdated(id);
    }
    if (setMessage) {
      setMessage(messageDetail.message);
    }
    if (setMentionMembers) {
      const mentionIds = messageDetail.mentions || [];
      const mentionMembers = mentionIds.map((mentionId) => {
        return {
          id: Number(mentionId),
          fullName:
            dashboardMembers.find((member) => member.id == mentionId)
              ?.fullName || '',
        };
      });
      if (messageDetail.message.includes(`@${MENTION_ALL_MEMBERS}`)) {
        setMentionMembers([
          {
            id: null,
            fullName: MENTION_ALL_MEMBERS,
          },
          ...mentionMembers,
        ]);
      } else {
        setMentionMembers(mentionMembers || []);
      }
    }
    if (messageDetail.chatFiles.length > 0) {
      const preserveFiles = messageDetail.chatFiles.map((file) => {
        return {
          uuid: file.uuid,
          file: {
            name: file.fileName,
          },
        };
      });
      setPreserveFiles(preserveFiles);
      setUploadFiles([]);
      setOpenUploadFilesModal(true);
    } else {
      const cleanedMessage = cleanTaskQuoteHTML(messageDetail.message);
      editor && editor.commands.setContent(cleanedMessage);
    }
  };

  function cleanTaskQuoteHTML(html: string): string {
    const container = document.createElement('div');
    container.innerHTML = html;

    container.querySelectorAll('.inline-task-quote').forEach((el) => {
      const outer = el as HTMLElement;

      const id = outer.getAttribute('data-task-id');
      const title = outer.getAttribute('data-title');

      const contentText = `[タスク] ${title}`;

      const cleanedSpan = document.createElement('span');
      cleanedSpan.className = 'inline-task-quote';
      cleanedSpan.setAttribute('data-task-id', id || '');
      cleanedSpan.setAttribute('data-title', title || '');
      cleanedSpan.textContent = contentText;

      outer.replaceWith(cleanedSpan);
    });

    return container.innerHTML;
  }

  // Render avatar
  const renderAvatar = (senderId: number) => {
    const memberInfo = dashboardMembers.find(
      (member) => member.id === senderId,
    );

    return (
      <div className="h-6">
        <CustomUserAvatar
          avatarUrl={memberInfo?.avatarUrl || ''}
          avatarColor={memberInfo?.avatarColor || ''}
          size={36}
        />
      </div>
    );
  };

  // Convert icon to image content
  const parseReactionsToImages = (message: string): string => {
    const div = document.createElement('div');
    div.innerHTML = message;

    div.querySelectorAll('span[data-custom-reaction]').forEach((span) => {
      const src = span.getAttribute('src');
      const name = span.getAttribute('name');

      if (src) {
        const img = document.createElement('img');
        img.setAttribute('src', src);
        img.setAttribute('alt', name || 'reaction');
        img.setAttribute('title', name || 'reaction');

        img.style.width = '20px';
        img.style.height = '20px';
        img.style.display = 'inline-block';
        img.style.verticalAlign = 'text-bottom';

        img.style.margin = '0 4px';

        span.replaceWith(img);
      }
    });

    return div.innerHTML;
  };

  // Highlight mentions
  const highlightMentions = (message: string, mentions: number[]) => {
    if (!mentions || mentions.length === 0)
      return parseReactionsToImages(message);

    const parser = new DOMParser();
    const doc = parser.parseFromString(message, 'text/html');

    doc.querySelectorAll('.mention').forEach((mention) => {
      let mentionName = mention.textContent?.trim() || '';

      if (mentionName.startsWith('@')) {
        mentionName = mentionName.slice(1);
      }

      const matchedUser = dashboardMembers.find(
        (member) => member.fullName === mentionName,
      );

      const color =
        matchedUser?.id === session?.user.id ||
        mentionName === MENTION_ALL_MEMBERS
          ? '#0068B7'
          : '#77858F';
      mention.setAttribute('style', `color: ${color};`);
    });

    return parseReactionsToImages(doc.body.innerHTML);
  };

  const processMessage = (message: string, mentions: number[]) => {
    const highlightedMessage = highlightMentions(message, mentions);

    const dom = new DOMParser().parseFromString(
      highlightedMessage,
      'text/html',
    );

    const nodes = Array.from(dom.body.childNodes);

    const processNode = (node: ChildNode, index: number) => {
      if (node.nodeType === 1) {
        const element = node as HTMLElement;

        if (element.tagName === 'P') {
          const taskQuote = element.querySelector('span[data-task-id]');

          if (taskQuote) {
            const taskId = taskQuote.getAttribute('data-task-id');
            const restOfContent = element.innerHTML.replace(
              taskQuote.outerHTML,
              '',
            );

            const parser = new DOMParser();
            const doc = parser.parseFromString(
              taskQuote.innerHTML,
              'text/html',
            );

            const spans = doc.querySelectorAll('span');

            const targetSpan = spans[1]?.outerHTML || '';

            return (
              <>
                <div
                  key={`${index}-quote`}
                  id={taskId || undefined}
                  onClick={() => {
                    if (taskId) {
                      handleActionEditTask(Number(taskId));
                    }
                  }}
                  className="flex mb-2 items-center w-full rounded-[6px] h-[42px] border-[1px] border-[#D2DBE1] bg-white px-4 gap-3 hover:cursor-pointer">
                  <ImageRound
                    className="w-[14px] h-[14px]"
                    name="Task icon"
                    src="/icons/gray-checkbox.svg"
                  />
                  <span
                    className="text-sm font-medium"
                    dangerouslySetInnerHTML={{ __html: targetSpan }}
                  />
                </div>

                {restOfContent.trim() && (
                  <p
                    key={`${index}-rest`}
                    className="text-chat-box font-normal text-sm -ml-1 p-1 rounded-[5px]"
                    dangerouslySetInnerHTML={{ __html: restOfContent }}
                  />
                )}
              </>
            );
          }

          return (
            <p
              key={index}
              className="text-chat-box font-normal text-sm -ml-1 p-1 rounded-[5px]">
              <span dangerouslySetInnerHTML={{ __html: element.innerHTML }} />
            </p>
          );
        }
      } else if (node.nodeType === 3) {
        return node.textContent?.trim() ? (
          <span key={index}>{node.textContent}</span>
        ) : null;
      }
      return null;
    };

    return nodes.map((node, index) => processNode(node, index));
  };

  // Render submit level message
  const renderSubmitLevelMessage = (
    type: string,
    status: string,
    skillName: string,
  ) => {
    if (type == MessageType.CREATE_SUBMIT_LEVEL_SKILL) {
      return (
        <p className="text-black text-sm">レベルアップ申請が届きました。</p>
      );
    } else {
      if (status == SubmitLevelStatus.APPROVAL) {
        return (
          <div className="flex gap-2">
            <p className="text-[#0068B6] font-medium text-sm max-w-full break-all">
              {skillName}{' '}
              <span className="text-black text-sm font-normal">
                のスキルがレベルアップしました！
              </span>
            </p>
          </div>
        );
      } else {
        return (
          <div className="flex gap-2">
            <p className="text-[#0068B6] font-medium text-sm max-w-full break-all">
              {skillName}{' '}
              <span className="text-black text-sm font-normal">
                のレベルアップの申請についてコメントが届いています。
              </span>
            </p>
          </div>
        );
      }
    }
  };

  // React message
  const handleReactionClickDetail = (icon: string) => {
    if (messageDetail) {
      handleReactionClick(messageDetail?.uuid, icon);
      handleResetChatRoomNotification();
    }
  };

  // Remove reactions
  const handleRemoveReactionClickDetail = (icon: string) => {
    if (messageDetail) {
      handleRemoveReactionClick(messageDetail?.uuid, icon);
      handleResetChatRoomNotification();
    }
  };

  const renderParticipantsContent = (messageDetail: ChatMessageResponse) => {
    return (
      <>
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
              ?.filter((participant) => !participant.isCreator)
              ?.slice(0, 3)
              .map((participant) => (
                <p key={participant.id}>{participant.name} </p>
              ))
          : messageDetail.scheduleChanges?.participants
              ?.slice(0, 4)
              .map((participant) => (
                <p key={participant.id}>{participant.name} </p>
              ))}
        {messageDetail.scheduleChanges?.participants &&
          messageDetail.scheduleChanges?.participants?.length > 4 && (
            <p>その他</p>
          )}
      </>
    );
  };

  return (
    <Fragment>
      {messageDetail && (
        <div className="group my-2">
          {(chatRoomDetail?.type === ChatRoomType.PRIVATE ||
            chatRoomDetail?.type === ChatRoomType.GROUP ||
            chatRoomDetail?.type === ChatRoomType.SELF) && (
            <div
              className={`flex !box-border group-hover:bg-[#FFFFFF] ${String(messageDetail.id) == highlightedMessageId && 'bg-white'} py-3 ml-5 mr-3 group-hover:rounded-md`}>
              {renderAvatar(messageDetail.sender.id)}
              <div className={`ml-3 !w-full`}>
                <div className="flex w-full justify-between items-baseline pb-2">
                  <div className="flex flex-grow  gap-2 items-baseline font-semibold text-[15px] pr-2">
                    <div className="flex-grow min-w-0 break-all whitespace-normal line-clamp-3">
                      {messageDetail.sender.fullName}
                      <span className="font-medium text-xs text-[#77858F]">
                        {' '}
                        {messageDetail.sender?.organizations?.name}
                      </span>
                    </div>

                    {messageDetail.isBookmark && (
                      <ImageRound
                        name="Save"
                        src="/icons/save-active.svg"
                        className="w-[10px] h-[12px] hover:cursor-pointer flex-shrink-0"
                      />
                    )}
                  </div>
                  <div className={`flex items-start w-fit flex-shrink-0`}>
                    <p className="font-medium text-xs text-[#77858F] text-right min-w-[90px]">
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
                        <p className="font-normal text-xs ml-2 text-nowrap">
                          編集済
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                <div className="relative !box-border">
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
                            <div className="break-all">
                              {processMessage(
                                messageDetail.message,
                                messageDetail.mentions || [],
                              )}
                              {messageDetail?.chatFiles &&
                              messageDetail?.chatFiles.length > 0 &&
                              uploadFileStatus[messageDetail.uuid]?.progress >=
                                0 &&
                              uploadFileStatus[messageDetail.uuid]?.progress <
                                100 ? (
                                <ProgressBar
                                  value={
                                    uploadFileStatus[messageDetail.uuid]
                                      .progress
                                  }
                                />
                              ) : (
                                <div className="flex flex-col gap-2 !w-[100%]">
                                  {messageDetail?.chatFiles &&
                                    messageDetail?.chatFiles.length > 0 &&
                                    messageDetail?.chatFiles.map(
                                      (file, index) => {
                                        return (
                                          <div
                                            key={index}
                                            className="flex justify-between items-center !w-[100%]">
                                            <div className="bg-white border-[#D2DBE1] border-[1px] rounded-[6px] p-[14px] flex gap-2 items-center !w-[calc(100%_-_100px)]">
                                              {file.fileType.includes(
                                                'image',
                                              ) && (
                                                <div>
                                                  <Image
                                                    src={getFileURL(
                                                      file?.compressedFile ||
                                                        '',
                                                    )}
                                                    alt="Image"
                                                    unoptimized={true}
                                                    width={150}
                                                    height={100}
                                                  />
                                                </div>
                                              )}
                                              <p
                                                className={`text-[#0068B6] font-medium text-[14px] break-all max-w-full ${
                                                  file.fileType.includes(
                                                    'image',
                                                  )
                                                    ? 'max-w-[calc(100%_-_200px)]'
                                                    : 'max-w-[calc(100%)]'
                                                }`}>
                                                {file.fileName}
                                              </p>
                                            </div>
                                            <Button
                                              className="font-medium w-[84px] h-[30px] !rounded-[6px] text-xs !px-0"
                                              variant="outline">
                                              プレビュー
                                            </Button>
                                          </div>
                                        );
                                      },
                                    )}
                                </div>
                              )}
                            </div>
                          )}
                          {messageDetail.type ===
                            MessageType.REMOVE_SCHEDULE && (
                            <div className={`w-full flex justify-start`}>
                              <div
                                className={`text-xs font-normal bg-[#eaf8ff] !w-[100%] p-4 `}>
                                <div className={`flex flex-col items-start`}>
                                  <p className="w-fit font-semibold text-black max-w-full break-all">
                                    {messageDetail.sender.fullName}{' '}
                                    {EVENT_DELETED}
                                  </p>
                                  <p className="font-semibold mt-2">日時</p>
                                  <div className={`text-left`}>
                                    <p>
                                      {' '}
                                      {messageDetail.scheduleChanges?.new &&
                                        (messageDetail.scheduleChanges?.new
                                          .repeatType ==
                                        TaskRepetitiveValue.ONCE
                                          ? renderEventDatetimeInChat(
                                              messageDetail.scheduleChanges
                                                ?.new,
                                            )
                                          : displayRepetitiveEventTime(
                                              messageDetail.scheduleChanges
                                                ?.new,
                                            ))}
                                    </p>
                                  </div>
                                  <p className="font-semibold mt-2">参加者</p>
                                  {renderParticipantsContent(messageDetail)}
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
                                  <p className="w-fit font-semibold text-black max-w-full break-all">
                                    {messageDetail.sender.fullName}{' '}
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
                                      {' '}
                                      {messageDetail.scheduleChanges?.new &&
                                        (messageDetail.scheduleChanges?.new
                                          .repeatType ==
                                        TaskRepetitiveValue.ONCE
                                          ? renderEventDatetimeInChat(
                                              messageDetail.scheduleChanges
                                                ?.new,
                                            )
                                          : displayRepetitiveEventTime(
                                              messageDetail.scheduleChanges
                                                ?.new,
                                            ))}
                                    </p>
                                    {messageDetail.scheduleChanges?.old && (
                                      <p>
                                        {'('}
                                        {EVENT_BEFORE_EDITED}
                                        {messageDetail.scheduleChanges?.old &&
                                          (messageDetail.scheduleChanges?.old
                                            .repeatType ==
                                          TaskRepetitiveValue.ONCE
                                            ? renderEventDatetimeInChat(
                                                messageDetail.scheduleChanges
                                                  ?.old,
                                              )
                                            : displayRepetitiveEventTime(
                                                messageDetail.scheduleChanges
                                                  ?.old,
                                              ))}
                                        {')'}
                                      </p>
                                    )}
                                  </div>
                                  <p className="font-semibold mt-2">参加者</p>
                                  {renderParticipantsContent(messageDetail)}
                                  {messageDetail.schedule?.id ? (
                                    <p
                                      className="hover:cursor-pointer mt-2"
                                      onClick={() =>
                                        handleConfirmGetDataDetailEvent(
                                          `${messageDetail.schedule?.id}`,
                                        )
                                      }>
                                      予定を確認する
                                    </p>
                                  ) : (
                                    <p className="mt-2 italic text-gray-600">
                                      {messageDetail.sender.fullName}{' '}
                                      {EVENT_DELETED}
                                    </p>
                                  )}
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
                                  <p className="font-semibold text-black max-w-full break-all">
                                    {messageDetail.sender.fullName}{' '}
                                    {EVENT_CREATED}
                                  </p>
                                  <p className="font-semibold mt-2">日時</p>
                                  <p>
                                    {' '}
                                    {messageDetail.scheduleChanges?.new &&
                                      (messageDetail.scheduleChanges?.new
                                        .repeatType == TaskRepetitiveValue.ONCE
                                        ? renderEventDatetimeInChat(
                                            messageDetail.scheduleChanges?.new,
                                          )
                                        : displayRepetitiveEventTime(
                                            messageDetail.scheduleChanges?.new,
                                          ))}
                                  </p>
                                  <p className="font-semibold mt-2">参加者</p>
                                  {renderParticipantsContent(messageDetail)}
                                  {messageDetail.schedule?.id ? (
                                    <p
                                      className="hover:cursor-pointer mt-2"
                                      onClick={() =>
                                        handleConfirmGetDataDetailEvent(
                                          `${messageDetail.schedule?.id}`,
                                        )
                                      }>
                                      予定を確認する
                                    </p>
                                  ) : (
                                    <p className="mt-2 italic text-gray-600">
                                      {messageDetail.sender.fullName}{' '}
                                      {EVENT_DELETED}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                          {(messageDetail.type === MessageType.CREATION_TASK ||
                            messageDetail.type ===
                              MessageType.REMOVE_MEMBER_TASK ||
                            messageDetail.type ===
                              MessageType.ADD_MEMBER_TASK) &&
                            (messageDetail.task ? (
                              <div className={`w-full flex justify-start`}>
                                <div
                                  className={`text-xs font-normal bg-[#eaf8ff] w-full p-4 `}>
                                  <div className={`flex flex-col items-start`}>
                                    <h4 className="text-sm w-fit font-medium text-black h-5 max-w-full break-all">
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
                                  className={`text-sm font-normal bg-[#eaf8ff] p-1 w-full`}>
                                  <div className={`flex flex-col items-start`}>
                                    <div
                                      className={`font-normal w-full  text-sm hover:cursor-pointer text-start -ml-1 p-1 rounded-[5px] text-gray-600 italic`}>
                                      {TASK_DELETED}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                    <>
                      {!messageDetail.deletedAt &&
                        !(
                          uploadFileStatus[messageDetail.uuid]?.progress >= 0 &&
                          uploadFileStatus[messageDetail.uuid]?.progress < 100
                        ) && (
                          <MessageHoverOptions
                            messageDetail={messageDetail}
                            chatRoomDetail={chatRoomDetail}
                            handleOpenEditForm={handleOpenEditForm}
                            handleOpenDeleteMsgModal={handleOpenDeleteMsgModal}
                            handleUpdateBookmark={handleUpdateBookmark}
                            handleReactionClick={handleReactionClickDetail}
                            handleRemoveReactionClick={
                              handleRemoveReactionClickDetail
                            }
                          />
                        )}
                    </>
                  </div>
                </div>
                {/* Data reaction */}
                {!messageDetail.deletedAt && (
                  <div>
                    <DetailReactionChat
                      dataMsgDetail={messageDetail}
                      handleReactionClick={handleReactionClickDetail}
                      handleRemoveReactionClick={
                        handleRemoveReactionClickDetail
                      }
                      chatContainerRef={chatContainerRef}
                    />
                  </div>
                )}
              </div>
            </div>
          )}
          {chatRoomDetail?.type === ChatRoomType.TASK && (
            <div
              className={`flex !box-border ${String(messageDetail.id) == highlightedMessageId && 'bg-white'} group-hover:bg-[#FFFFFF] py-3 ml-5 mr-3 group-hover:rounded-md`}>
              {messageDetail.type !== MessageType.MESSAGE ? (
                <ImageRound
                  className="w-10 h-10"
                  src="/icons/document.svg"
                  border="full"
                  name="Task"
                />
              ) : (
                <div>{renderAvatar(messageDetail.sender.id)}</div>
              )}
              <div className={`ml-3 !w-full`}>
                <div className="flex justify-between items-baseline pb-2">
                  <div className="flex gap-2 items-baseline font-semibold text-[15px] pr-2">
                    {messageDetail.type !== MessageType.MESSAGE ? (
                      <p className="font-semibold text-sm">タスクカード</p>
                    ) : (
                      <p className="max-w-full break-all">
                        {messageDetail.sender.fullName}{' '}
                        <span className="font-medium text-xs text-[#77858F]">
                          {messageDetail.sender?.organizations?.name}
                        </span>
                      </p>
                    )}

                    {messageDetail.isBookmark && (
                      <ImageRound
                        name="Save"
                        src="/icons/save-active.svg"
                        className="w-[10px] h-[12px] hover:cursor-pointer"
                      />
                    )}
                  </div>

                  <div className={`flex items-start`}>
                    <p className="font-medium text-xs text-[#77858F] text-right min-w-[90px]">
                      {messageDetail.createdAt &&
                        formatCheckDate(
                          getFormattedDateTime(
                            convertToCurrentTimezone(messageDetail.createdAt),
                          ),
                        )}
                    </p>
                  </div>
                </div>
                <div className="relative">
                  <div className={`!w-[100%]`}>
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
                              className={`text-chat-box font-normal text-sm hover:cursor-pointer max-w-full -ml-1 p-1 rounded-[5px]  `}
                              dangerouslySetInnerHTML={{
                                __html: messageDetail.message,
                              }}></p>
                          )}
                          {messageDetail.type !== MessageType.MESSAGE &&
                            (messageDetail.task ? (
                              <div className={`w-full flex justify-start`}>
                                <div
                                  className={`text-xs font-normal bg-[#eaf8ff] w-full p-4 `}>
                                  <div className={`flex flex-col items-start`}>
                                    <h4 className="text-sm w-fit font-medium text-black h-5 max-w-full break-all">
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
                              <div className={`w-full flex justify-start `}>
                                <div
                                  className={`text-sm font-normal bg-[#eaf8ff] p-1`}>
                                  <div className={`flex flex-col items-end`}>
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
                        <MessageHoverOptions
                          messageDetail={messageDetail}
                          chatRoomDetail={chatRoomDetail}
                          handleOpenEditForm={handleOpenEditForm}
                          handleOpenDeleteMsgModal={handleOpenDeleteMsgModal}
                          handleUpdateBookmark={handleUpdateBookmark}
                          handleReactionClick={handleReactionClickDetail}
                          handleRemoveReactionClick={
                            handleRemoveReactionClickDetail
                          }
                        />
                      )}
                    </>
                  </div>
                </div>
                {/* Data reaction */}
                {!messageDetail.deletedAt && (
                  <div>
                    <DetailReactionChat
                      dataMsgDetail={messageDetail}
                      handleReactionClick={handleReactionClickDetail}
                      handleRemoveReactionClick={
                        handleRemoveReactionClickDetail
                      }
                      chatContainerRef={chatContainerRef}
                    />
                  </div>
                )}
              </div>
            </div>
          )}
          {chatRoomDetail?.type === ChatRoomType.SKILL && (
            <div
              className={`flex !box-border  ${String(messageDetail.id) == highlightedMessageId && 'bg-white'} group-hover:bg-[#FFFFFF] py-3 ml-5 mr-3 group-hover:rounded-md`}>
              <div>{renderAvatar(messageDetail.sender.id)}</div>
              <div className={`ml-3 w-full`}>
                <div className="flex justify-between items-baseline pb-2">
                  <div className="flex gap-2 items-baseline font-semibold text-[15px] pr-2">
                    <p className="max-w-full break-all">
                      {messageDetail.sender.fullName}{' '}
                      <span className="font-medium text-xs text-[#77858F]">
                        {messageDetail.sender?.organizations?.name}
                      </span>
                    </p>

                    {messageDetail.isBookmark && (
                      <ImageRound
                        name="Save"
                        src="/icons/save-active.svg"
                        className="w-[10px] h-[12px] hover:cursor-pointer"
                      />
                    )}
                  </div>
                  <div className={`flex items-start`}>
                    <p className="font-medium text-xs text-[#77858F] text-right min-w-[90px]">
                      {messageDetail.createdAt &&
                        formatCheckDate(
                          getFormattedDateTime(
                            convertToCurrentTimezone(messageDetail.createdAt),
                          ),
                        )}
                    </p>
                  </div>
                </div>
                <div className="relative">
                  <div className={`!w-[100%]`}>
                    <div className="flex flex-col">
                      {messageDetail.deletedAt ||
                      (!messageDetail.submitLevel && !messageDetail.message) ? (
                        <p
                          className={`font-normal text-sm hover:cursor-pointer -ml-1 p-1 rounded-[5px] text-gray-600 italic bg-[#f0f1f1] w-[220px]`}>
                          {messageDetail.type == MessageType.MESSAGE
                            ? MESSAGE_DELETED
                            : DELETED_SKILL_UP_MESSAGE}
                        </p>
                      ) : (
                        <div>
                          {messageDetail.type === MessageType.MESSAGE && (
                            <p
                              className={`text-chat-box font-normal text-sm hover:cursor-pointer !w-[100%] -ml-1 p-1 rounded-[5px]`}
                              dangerouslySetInnerHTML={{
                                __html: messageDetail.message,
                              }}></p>
                          )}
                          {messageDetail.type !== MessageType.MESSAGE && (
                            <div className="w-full flex justify-start">
                              <div className={`text-xs font-normal !w-[100%] `}>
                                <div className={`flex gap-5 items-center`}>
                                  <h4 className="text-sm w-fit text-black h-5 max-w-full break-all">
                                    {renderSubmitLevelMessage(
                                      messageDetail.type,
                                      messageDetail.submitLevel?.status || '',
                                      messageDetail.submitLevel?.skill?.name ||
                                        '',
                                    )}
                                  </h4>
                                  <Button
                                    className="!text-black !font-medium !text-xs !bg-[#CED8DE] !rounded-[100px] !w-[86px] !h-[30px] !px-0"
                                    onClick={() => {
                                      if (
                                        messageDetail.type ==
                                        MessageType.CREATE_SUBMIT_LEVEL_SKILL
                                      ) {
                                        router.push(
                                          pageRouters.LEVEL_UP_TEAM.href,
                                        );
                                      } else {
                                        router.push(
                                          `${pageRouters.SKILL_MAP.href}?submitLevelId=${messageDetail.submitLevel?.id}`,
                                        );
                                      }
                                    }}>
                                    確認する
                                    <ImageRound
                                      name="Filter extend icon"
                                      src={'/icons/arrow-down.svg'}
                                      className={`w-4 h-4 cursor-pointer -rotate-90`}
                                    />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <>
                      {!messageDetail.deletedAt && (
                        <MessageHoverOptions
                          messageDetail={messageDetail}
                          chatRoomDetail={chatRoomDetail}
                          handleOpenEditForm={handleOpenEditForm}
                          handleOpenDeleteMsgModal={handleOpenDeleteMsgModal}
                          handleUpdateBookmark={handleUpdateBookmark}
                          handleReactionClick={handleReactionClickDetail}
                          handleRemoveReactionClick={
                            handleRemoveReactionClickDetail
                          }
                        />
                      )}
                    </>
                  </div>
                </div>
                {/* Data reaction */}

                {!messageDetail.deletedAt && (
                  <div>
                    <DetailReactionChat
                      dataMsgDetail={messageDetail}
                      handleReactionClick={handleReactionClickDetail}
                      handleRemoveReactionClick={
                        handleRemoveReactionClickDetail
                      }
                      chatContainerRef={chatContainerRef}
                    />
                  </div>
                )}
              </div>
            </div>
          )}
          {chatRoomDetail?.type === ChatRoomType.CALENDAR && (
            <div
              className={`flex !box-border ${String(messageDetail.id) == highlightedMessageId && 'bg-white'} group-hover:bg-[#FFFFFF] py-3 ml-5 mr-3 group-hover:rounded-md`}>
              <div>{renderAvatar(messageDetail.sender.id)}</div>
              <div className={`ml-3 w-full`}>
                <div className="flex justify-between items-baseline pb-2">
                  <div className="flex gap-2 items-baseline font-semibold text-[15px] pr-2">
                    <p className="max-w-full break-all">
                      {messageDetail.sender.fullName}
                      <span className="font-medium text-xs text-[#77858F]">
                        {messageDetail.sender?.organizations?.name}
                      </span>
                    </p>

                    {messageDetail.isBookmark && (
                      <ImageRound
                        name="Save"
                        src="/icons/save-active.svg"
                        className="w-[10px] h-[12px] hover:cursor-pointer"
                      />
                    )}
                  </div>

                  <p className="font-medium text-xs text-[#77858F] text-right min-w-[90px]">
                    {messageDetail.createdAt &&
                      formatCheckDate(
                        getFormattedDateTime(
                          convertToCurrentTimezone(messageDetail.createdAt),
                        ),
                      )}
                  </p>
                </div>
                <div className="relative">
                  <div className={`!w-[100%]`}>
                    <div className="flex flex-col gap-3">
                      <div
                        className="flex items-center w-full rounded-[6px] h-[42px] border-[1px] border-[#D2DBE1] bg-white px-4 gap-3 hover:cursor-pointer"
                        onClick={() => {
                          handleConfirmGetDataDetailEvent(
                            `${messageDetail.schedule?.id}`,
                          );
                        }}>
                        <ImageRound
                          className={`w-[15px] h-[14px]`}
                          name="Calendar icon"
                          src="/icons/calendar-time.svg"
                        />
                        <p className="text-[#0068B6] text-sm font-medium">
                          {messageDetail.schedule?.title}
                        </p>
                      </div>
                      <div className="flex gap-1 text-sm font-medium">
                        <p className="text-[#0068B6] break-all max-w-full">
                          {messageDetail.sender.fullName}
                          <span className="text-black">
                            {messageDetail.type === MessageType.REMOVE_SCHEDULE
                              ? EVENT_DELETED
                              : messageDetail.type === MessageType.EDIT_SCHEDULE
                                ? EVENT_EDITED
                                : EVENT_CREATED}
                          </span>
                        </p>
                      </div>
                      <div className="text-[#5B6770] font-normal text-sm">
                        <p>
                          {messageDetail.scheduleChanges?.new &&
                            (messageDetail.scheduleChanges?.new.repeatType ==
                            TaskRepetitiveValue.ONCE
                              ? renderScheduleChangeInCalendarRoom(
                                  messageDetail,
                                )
                              : displayRepetitiveEventTime(
                                  messageDetail.scheduleChanges?.new,
                                ))}
                        </p>
                      </div>
                      <p className="text-[#5B6770] font-normal text-sm">
                        {messageDetail.message}
                      </p>
                    </div>
                    <>
                      {!messageDetail.deletedAt && (
                        <MessageHoverOptions
                          messageDetail={messageDetail}
                          chatRoomDetail={chatRoomDetail}
                          handleOpenEditForm={handleOpenEditForm}
                          handleOpenDeleteMsgModal={handleOpenDeleteMsgModal}
                          handleUpdateBookmark={handleUpdateBookmark}
                          handleReactionClick={handleReactionClickDetail}
                          handleRemoveReactionClick={
                            handleRemoveReactionClickDetail
                          }
                        />
                      )}
                    </>
                  </div>
                </div>
                {/* Data reaction */}
                {!messageDetail.deletedAt && (
                  <div>
                    <DetailReactionChat
                      dataMsgDetail={messageDetail}
                      handleReactionClick={handleReactionClickDetail}
                      handleRemoveReactionClick={
                        handleRemoveReactionClickDetail
                      }
                      chatContainerRef={chatContainerRef}
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </Fragment>
  );
};
