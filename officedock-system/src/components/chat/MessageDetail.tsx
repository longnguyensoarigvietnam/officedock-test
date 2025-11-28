import { useMutation } from 'react-query';
import { Dispatch, Fragment, MutableRefObject, SetStateAction } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

import { format } from 'date-fns';
import { Editor } from '@tiptap/react';

import ImageRound from '@components/common/ImageRound';
import Button from '@components/common/Button';
import { ProgressBar } from '@components/common/ProgressBar';
import CustomUserAvatar from '@components/common/AvatarIcon/CustomUserAvatar';
import GroupIconWithDynamicColor from '@components/common/GroupIcon';
import { MessageHoverOptions } from './MessageHoverOptions';
import DetailReactionChat from './DetailReactionChat';
import { MessageDetailQuote } from './quote/MessageDetailQuote';
import MessageDetailQuoteText from './quote/MessageDetailQuoteText';
import RenderFiles from './renderFiles/RenderFiles';

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
import { apiRouters, pageRouters } from '@constants/routers';
import { DELETED_EVENT_TITLE } from '@constants/message';

import {
  ChatDashboardMember,
  ChatFileDetailResponse,
  ChatFileResponse,
  ChatMessageResponse,
  ChatParticipant,
  ChatRoomDetail,
} from '@interfaces/chat';
import { Profile } from '@interfaces/user';

import { useSessionCache } from '@providers/SessionCacheProvider';

import {
  displayRepetitiveEventTime,
  formatWithParagraphTags,
  handleDownloadFile,
  renderEventDatetimeInChat,
  renderScheduleChangeInCalendarRoom,
} from '@utils';
import {
  convertToCurrentTimezone,
  formatCheckDate,
  getFormattedDateTime,
} from '@utils/date';

import api from '@base/api';

export type MessageDetailProps = {
  chatRoomDetail: ChatRoomDetail | undefined;
  uploadFileStatus: Record<
    string,
    {
      progress: number;
      errorMsg?: string;
    }
  >;
  onGotoMessage: (data: { messageId: string | number }) => void;
  messageDetail: ChatMessageResponse;
  msgEditing?: string;
  dashboardMemberList: Omit<Profile, 'birthday' | 'gender'>[];
  editor: Editor | null;
  highlightedMessageId: string | null;
  handleReplyMsg: ({
    user,
    replyId,
  }: {
    user: {
      id: number;
      name: string;
    };
    replyId: string;
  }) => void;
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
  setDataPreviewFile: Dispatch<
    SetStateAction<{
      msgId: string;
      file: ChatFileResponse;
      user: ChatDashboardMember;
      createAt: string;
    } | null>
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
  handleQuoteMsgIcon: (data: {
    data: ChatMessageResponse;
    title: string;
  }) => void;
  chatContainerRef: MutableRefObject<HTMLDivElement | null>;
};

export const MessageDetail = ({
  chatRoomDetail,
  uploadFileStatus,
  messageDetail,
  dashboardMemberList,
  editor,
  chatContainerRef,
  highlightedMessageId,
  handleQuoteMsgIcon,
  setDataPreviewFile,
  handleReplyMsg,
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
  const { data: session } = useSessionCache();
  const router = useRouter();
  let uuidListMain = [];
  const parser = new DOMParser();
  const doc = parser.parseFromString(messageDetail?.message, 'text/html');
  const pEl = doc.querySelector('p');

  if (pEl) {
    const raw = pEl.getAttribute('data-uuid');
    uuidListMain = raw ? JSON.parse(raw) : [];
  }
  const uuidList = messageDetail?.chatFiles;

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
            dashboardMemberList.find((member) => member.id == mentionId)
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
      const preserveFiles = messageDetail.chatFiles
        .map((file) => ({
          uuid: file.uuid,
          file: {
            name: file.fileName,
          },
        }))
        .filter((item) => uuidListMain.includes(item.uuid));
      setPreserveFiles(preserveFiles);
      setUploadFiles([]);
      setOpenUploadFilesModal(true);
    } else {
      const cleanedMessage = cleanTaskQuoteHTML(messageDetail.message);
      editor && editor.commands.setContent(cleanedMessage);
    }
  };

  const cleanTaskQuoteHTML = (html: string): string => {
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
  };

  // Render avatar
  const renderAvatar = (senderId: number) => {
    const memberInfo = dashboardMemberList.find(
      (member) => member.id === senderId,
    );

    return (
      <div className="h-[30px] relative top-[-3px]">
        <CustomUserAvatar
          avatarUrl={memberInfo?.avatar || ''}
          avatarColor={memberInfo?.avatarColor || ''}
          size={30}
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

      const matchedUser = dashboardMemberList.find(
        (member) => member.fullName === mentionName,
      );

      const color =
        matchedUser?.id === session?.user.id ||
        mentionName === MENTION_ALL_MEMBERS
          ? '#228CDB'
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

    const processPElement = (element: HTMLElement, index: number) => {
      const children: React.ReactNode[] = [];

      element.childNodes.forEach((child, i) => {
        if (child.nodeType === Node.TEXT_NODE) {
          const text = child.textContent?.trim();
          if (text) {
            children.push(
              <span key={`${index}-${i}-text`} className="whitespace-pre-wrap">
                {text}
              </span>,
            );
          }
        }

        if (child.nodeType === Node.ELEMENT_NODE) {
          const el = child as HTMLElement;
          if (el.dataset.taskId) {
            const taskId = el.dataset.taskId;
            const parser = new DOMParser();
            const doc = parser.parseFromString(el.innerHTML, 'text/html');
            const spans = doc.querySelectorAll('span');
            const targetSpan = spans[1]?.innerHTML || '';

            children.push(
              <div
                key={`${index}-${i}-task`}
                id={taskId}
                onClick={() => {
                  if (taskId) handleActionEditTask(Number(taskId));
                }}
                className="flex mb-2 items-center w-full rounded-[6px] min-h-[42px] border border-[#D2DBE1] bg-white px-4 gap-3 hover:cursor-pointer">
                <ImageRound
                  className="w-[14px] h-[14px]"
                  name="Task icon"
                  src="/icons/gray-checkbox.svg"
                />
                <span
                  className="text-sm font-medium  line-clamp-1 overflow-hidden text-[#228CDB]  break-all"
                  dangerouslySetInnerHTML={{ __html: targetSpan }}
                />
              </div>,
            );
          }

          if (el.dataset.quoteMsg) {
            const raw = el.dataset.msgData;
            const foundQuote: ChatMessageResponse = raw
              ? JSON.parse(raw)
              : null;
            if (foundQuote) {
              children.push(
                <div className={``}>
                  <MessageDetailQuote
                    key={`${index}-${i}-msg`}
                    chatRoomDetail={chatRoomDetail}
                    messageDetail={foundQuote}
                    uuidQuote={foundQuote.uuid}
                    uuidList={uuidList}
                    dashboardMemberList={dashboardMemberList}
                    highlightedMessageId={highlightedMessageId}
                    setDataPreviewFile={setDataPreviewFile}
                    handleActionEditTask={handleActionEditTask}
                  />
                </div>,
              );
            }
          }

          if (el.dataset.quoteText) {
            const dataTitle = el.dataset.title || '';
            const raw = el.dataset.msgTextData;
            const foundQuote: ChatMessageResponse = raw
              ? JSON.parse(raw)
              : null;
            if (foundQuote) {
              children.push(
                <div className={`${index !== 0 && 'mt-5'}`}>
                  <MessageDetailQuoteText
                    key={`${index}-${i}-textquote`}
                    messageDetail={foundQuote}
                    dashboardMemberList={dashboardMemberList}
                    title={dataTitle}
                    uuidQuote={foundQuote.uuid}
                  />
                </div>,
              );
            }
          }
          if (el.dataset.msgReplyId) {
            const title = el.dataset.title || '';
            children.push(
              <p key={`${index}-msg-reply`}>
                <span
                  className="inline-msg-quote flex items-center gap-[6px]"
                  contentEditable={false}>
                  <ImageRound
                    name="Reply"
                    src={'/icons/reply.svg'}
                    className="w-[14px] h-[12px]"
                    onClick={() => {
                      // TODO: Handle go to reply msg
                      // onGotoMessage({
                      //   messageId: el.dataset.msgReplyId || '',
                      // });
                    }}
                  />
                  <span style={{ color: '#77858F' }}>{title}</span>
                </span>
              </p>,
            );
          }
          if (
            el.classList.contains('mention') ||
            el.dataset.type === 'mention'
          ) {
            const mentionText = el.textContent?.trim() || el.innerText || '';
            if (mentionText) {
              children.push(
                <span
                  key={`${index}-${i}-mention`}
                  className="mention"
                  data-type="mention"
                  data-id={el.dataset.id}
                  style={{ color: el.style.color }}>
                  {mentionText}
                </span>,
              );
            }
          }
          if (
            el.tagName === 'SPAN' &&
            el.getAttribute('data-src')?.includes('/icons/')
          ) {
            const src = el.getAttribute('data-src');
            const name = el.getAttribute('alt') ?? '';
            children.push(
              <Image
                key={`${index}-${i}-reaction`}
                src={src!}
                alt={name}
                title={name}
                width={20}
                height={20}
                className="inline-block align-middle mx-[2px] w-[20px] h-[20px]"
              />,
            );
          }
          // Fallback for unhandled inline tags
          if (
            !el.dataset.taskId &&
            !el.dataset.quoteMsg &&
            !el.dataset.quoteText &&
            !el.dataset.msgReplyId &&
            !el.classList.contains('mention')
          ) {
            children.push(
              <span
                key={`${index}-${i}-inline`}
                dangerouslySetInnerHTML={{ __html: el.outerHTML }}
              />,
            );
          }
        }
      });

      return (
        <div
          key={`p-${index}`}
          data-id={messageDetail.uuid}
          className="text-chat-box font-normal text-sm -ml-1 p-1 rounded-[5px] ">
          {children}
        </div>
      );
    };

    const processNode = (node: ChildNode, index: number) => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as HTMLElement;
        if (element.tagName === 'P') {
          return processPElement(element, index);
        }
      } else if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent?.trim();
        return text ? <span key={`text-${index}`}>{text}</span> : null;
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
            <p className="text-primary font-medium text-sm max-w-full break-all">
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
            <p className="text-primary font-medium text-sm max-w-full break-all">
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

  // Render participants content
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

  const handleDownloadFileName = async (fileUuid: string) => {
    const apiUrl = apiRouters.FILE_DETAIL(`${fileUuid}`);

    const { data } = await api.get<ChatFileDetailResponse>(apiUrl);
    return data;
  };

  const { mutate: downloadFileName } = useMutation(
    'downloadFileName',
    handleDownloadFileName,
    {
      onSuccess: (data) => {
        if (data.originalFile) {
          handleDownloadFile(data?.originalFile || '', data?.fileName || '');
        }
      },
      onError: () => {},
      onSettled: () => {},
    },
  );

  return (
    <Fragment>
      {messageDetail && (
        <div className="group px-4">
          {(chatRoomDetail?.type === ChatRoomType.PRIVATE ||
            chatRoomDetail?.type === ChatRoomType.GROUP ||
            chatRoomDetail?.type === ChatRoomType.SELF) && (
            <div
              className={`flex relative !box-border group-hover:bg-[#FFFFFF] ${String(messageDetail.id) == highlightedMessageId && 'bg-white'} p-[14px] group-hover:rounded-md`}>
              {renderAvatar(messageDetail.sender.id)}
              <div className={`ml-[10px] !w-full`}>
                <div className="flex w-full justify-between items-baseline pb-[10px]">
                  <div className="flex flex-grow  gap-2 items-baseline font-semibold text-[15px] pr-2">
                    <div
                      data-id={messageDetail.uuid}
                      className="flex-grow min-w-0 gap-1 break-all whitespace-normal line-clamp-3">
                      {messageDetail.sender.fullName}
                      <span
                        data-id={messageDetail.uuid}
                        className="font-medium text-xs text-[#77858F] ml-2">
                        {' '}
                        {messageDetail.sender?.organizations?.name}
                      </span>
                    </div>
                    {messageDetail.isBookmark && (
                      <ImageRound
                        name="Save"
                        src="/icons/save-active.svg"
                        className="w-[10px] h-[12px] relative top-[2px] hover:cursor-pointer flex-shrink-0"
                      />
                    )}
                  </div>
                  <div className={`flex items-start w-fit flex-shrink-0`}>
                    <p
                      data-id={messageDetail.uuid}
                      className="font-medium text-xs text-[#77858F] text-right min-w-[90px]">
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
                        <p
                          data-id={messageDetail.uuid}
                          className="font-normal text-xs ml-2 text-nowrap">
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
                          data-id={messageDetail.uuid}
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
                                <div className="flex flex-col gap-2 !w-[100%] mt-3">
                                  {messageDetail?.chatFiles &&
                                    messageDetail?.chatFiles.length > 0 && (
                                      <RenderFiles
                                        dashboardMemberList={
                                          dashboardMemberList
                                        }
                                        uuidList={uuidList}
                                        uuidMain={uuidListMain}
                                        messageDetail={messageDetail}
                                        downloadFileName={downloadFileName}
                                        setDataPreviewFile={setDataPreviewFile}
                                      />
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
                                  <p
                                    data-id={messageDetail.uuid}
                                    className="w-fit font-semibold text-black max-w-full break-all">
                                    {messageDetail.sender.fullName}{' '}
                                    {EVENT_DELETED}
                                  </p>
                                  <p className="font-semibold mt-2">日時</p>
                                  <div className={`text-left`}>
                                    <p data-id={messageDetail.uuid}>
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
                                  <p
                                    data-id={messageDetail.uuid}
                                    className="font-semibold mt-2">
                                    参加者
                                  </p>
                                  {renderParticipantsContent(messageDetail)}
                                  <p
                                    data-id={messageDetail.uuid}
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
                                  <p
                                    data-id={messageDetail.uuid}
                                    className="w-fit font-semibold text-black max-w-full break-all">
                                    {messageDetail.sender.fullName}{' '}
                                    {EVENT_EDITED}
                                  </p>
                                  <p
                                    data-id={messageDetail.uuid}
                                    className="mt-2">
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
                                  <p
                                    data-id={messageDetail.uuid}
                                    className="font-semibold mt-2">
                                    日時
                                  </p>
                                  <div className={`text-left`}>
                                    <p data-id={messageDetail.uuid}>
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
                                      <p data-id={messageDetail.uuid}>
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
                                  <p
                                    data-id={messageDetail.uuid}
                                    className="font-semibold mt-2">
                                    参加者
                                  </p>
                                  {renderParticipantsContent(messageDetail)}
                                  {messageDetail.schedule?.id ? (
                                    <p
                                      data-id={messageDetail.uuid}
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
                                    data-id={messageDetail.uuid}
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
                                  <p
                                    data-id={messageDetail.uuid}
                                    className="font-semibold text-black max-w-full break-all">
                                    {messageDetail.sender.fullName}{' '}
                                    {EVENT_CREATED}
                                  </p>
                                  <p
                                    data-id={messageDetail.uuid}
                                    className="font-semibold mt-2">
                                    日時
                                  </p>
                                  <p data-id={messageDetail.uuid}>
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
                                  <p
                                    data-id={messageDetail.uuid}
                                    className="font-semibold mt-2">
                                    参加者
                                  </p>
                                  {renderParticipantsContent(messageDetail)}
                                  {messageDetail.schedule?.id ? (
                                    <p
                                      data-id={messageDetail.uuid}
                                      className="hover:cursor-pointer mt-2"
                                      onClick={() =>
                                        handleConfirmGetDataDetailEvent(
                                          `${messageDetail.schedule?.id}`,
                                        )
                                      }>
                                      予定を確認する
                                    </p>
                                  ) : (
                                    <p
                                      data-id={messageDetail.uuid}
                                      className="mt-2 italic text-gray-600">
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
                                    <h4
                                      data-id={messageDetail.uuid}
                                      className="text-sm w-fit font-medium text-black h-5 max-w-full break-all">
                                      {messageDetail.type ==
                                      MessageType.CREATION_TASK
                                        ? CREATION_TASK_MESSAGE
                                        : messageDetail.type ==
                                            MessageType.REMOVE_MEMBER_TASK
                                          ? REMOVE_MEMBER_TASK_MESSAGE
                                          : ADD_MEMBER_TASK_MESSAGE}
                                    </h4>
                                    <h4
                                      data-id={messageDetail.uuid}
                                      className="text-sm w-fit text-black h-5 truncate max-w-[500px]">
                                      タスクのタイトル:{' '}
                                      {messageDetail.task.title || NO_SETTING}
                                    </h4>
                                    {messageDetail.type !==
                                      MessageType.REMOVE_MEMBER_TASK && (
                                      <p
                                        data-id={messageDetail.uuid}
                                        className="w-fit mt-2">
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
                                      data-id={messageDetail.uuid}
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
                      handleQuoteMsgIcon={handleQuoteMsgIcon}
                      handleReplyMsg={handleReplyMsg}
                    />
                  )}
              </>
            </div>
          )}
          {chatRoomDetail?.type === ChatRoomType.TASK && (
            <div
              className={`flex relative !box-border ${String(messageDetail.id) == highlightedMessageId && 'bg-white'} group-hover:bg-[#FFFFFF] py-3 ml-[30px] mr-3 group-hover:rounded-md`}>
              <div>
                {messageDetail?.organization?.icon ? (
                  <CustomUserAvatar
                    avatarUrl={messageDetail?.organization.icon}
                    avatarColor={
                      messageDetail?.organization?.iconColor || '#228CDB'
                    }
                    size={28}
                  />
                ) : (
                  <GroupIconWithDynamicColor
                    color={messageDetail?.organization?.iconColor || '#228CDB'}
                  />
                )}
              </div>
              <div className={`ml-[10px] mt-[6px] !w-full`}>
                <div className="flex justify-between items-baseline pb-[10px]">
                  <div className="flex gap-2 items-baseline font-semibold text-[15px] pr-2">
                    <p className="max-w-full font-medium break-all">
                      {messageDetail?.organization?.name}
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
                            (messageDetail.type !== MessageType.REMOVE_TASK ? (
                              <div className={`w-full  flex flex-col gap-5`}>
                                <div
                                  onClick={() => {
                                    if (
                                      messageDetail.scheduleChanges?.task?.id
                                    ) {
                                      handleActionEditTask(
                                        Number(
                                          messageDetail.scheduleChanges.task
                                            ?.id,
                                        ),
                                      );
                                    }
                                  }}
                                  className={`text-xs font-normal bg-white border border-[#D2DBE1] rounded-lg w-full p-4 `}>
                                  <div className={`flex flex-col items-start`}>
                                    <div className="flex items-start gap-[10px]">
                                      <ImageRound
                                        name="Save"
                                        src="/icons/gray-checkbox.svg"
                                        className="w-fit h-fit relative top-[3px] "
                                      />
                                      <h4 className="text-sm w-fit font-medium text-[#228CDB] h-5 truncate max-w-[500px]">
                                        {messageDetail.task ? (
                                          messageDetail.scheduleChanges?.task
                                            ?.title
                                        ) : (
                                          <span className="text-gray-300">
                                            {TASK_DELETED}
                                          </span>
                                        )}
                                      </h4>
                                    </div>
                                  </div>
                                </div>
                                <h4 className="text-sm w-fit font-medium text-black h-5 max-w-full break-all">
                                  {messageDetail.type ==
                                    MessageType.REMOVE_MEMBER_TASK && (
                                    <p>
                                      <span className="text-[#228CDB]">
                                        {messageDetail.sender.fullName}
                                      </span>
                                      があなたのタスクカードを
                                      <span className="text-[#228CDB]">
                                        {
                                          messageDetail.scheduleChanges
                                            ?.newMember?.fullName
                                        }
                                      </span>
                                      に移動しました。
                                    </p>
                                  )}
                                  {messageDetail.type ==
                                    MessageType.CREATION_TASK && (
                                    <p>
                                      <span className="text-[#228CDB]">
                                        {messageDetail.sender?.fullName}
                                      </span>
                                      があなたに割り当てました。
                                    </p>
                                  )}
                                  {messageDetail.type ==
                                    MessageType.EDIT_TASK && (
                                    <p>
                                      <span className="text-[#228CDB]">
                                        {messageDetail.sender?.fullName}
                                      </span>
                                      があなたのタスクカードを編集しました。
                                    </p>
                                  )}
                                  {messageDetail.type ==
                                    MessageType.ADD_MEMBER_TASK && (
                                    <p>
                                      <span className="text-[#228CDB]">
                                        {messageDetail.sender.fullName}
                                      </span>
                                      が{' '}
                                      <span className="text-[#228CDB]">
                                        {
                                          messageDetail.scheduleChanges
                                            ?.oldMember?.fullName
                                        }
                                      </span>
                                      のタスクカードをあなたに移動しました。
                                    </p>
                                  )}
                                </h4>
                              </div>
                            ) : (
                              <div className={`w-full flex justify-start `}>
                                <div
                                  className={`text-sm w-full font-normal bg-transparent p-4 !pt-1 !px-0`}>
                                  <div className={``}>
                                    <p
                                      className={`font-normal w-full text-sm hover:cursor-pointer text-start -ml-1 p-1 rounded-[5px] text-black italic`}>
                                      {messageDetail.type ==
                                      MessageType.REMOVE_TASK ? (
                                        <p className="w-full">
                                          <span className="text-[#228CDB] w-fit">
                                            {' '}
                                            {messageDetail.sender.fullName}
                                          </span>
                                          があなたのタスクカードを削除しました。
                                        </p>
                                      ) : (
                                        TASK_DELETED
                                      )}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
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
              <>
                {!messageDetail.deletedAt && (
                  <MessageHoverOptions
                    messageDetail={messageDetail}
                    chatRoomDetail={chatRoomDetail}
                    handleReplyMsg={handleReplyMsg}
                    handleOpenEditForm={handleOpenEditForm}
                    handleOpenDeleteMsgModal={handleOpenDeleteMsgModal}
                    handleUpdateBookmark={handleUpdateBookmark}
                    handleReactionClick={handleReactionClickDetail}
                    handleRemoveReactionClick={handleRemoveReactionClickDetail}
                    handleQuoteMsgIcon={handleQuoteMsgIcon}
                  />
                )}
              </>
            </div>
          )}
          {chatRoomDetail?.type === ChatRoomType.SKILL && (
            <div
              className={`flex relative !box-border  ${String(messageDetail.id) == highlightedMessageId && 'bg-white'} group-hover:bg-[#FFFFFF] py-3 ml-[30px] mr-3 group-hover:rounded-md`}>
              <div>{renderAvatar(messageDetail.sender.id)}</div>
              <div className={`ml-[10px] w-full`}>
                <div className="flex justify-between items-baseline pb-[10px]">
                  <div className="flex gap-2 items-baseline font-semibold text-[15px] pr-2">
                    <p className="max-w-full break-all">
                      {messageDetail.sender.fullName}{' '}
                      <span className="font-medium text-xs text-[#77858F] ml-2">
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
                                    variant="outline"
                                    className="!font-medium !text-xs !rounded-[8px] !w-[86px] !h-[30px] !px-0"
                                    onClick={() => {
                                      if (
                                        messageDetail.type ==
                                        MessageType.CREATE_SUBMIT_LEVEL_SKILL
                                      ) {
                                        router.push(
                                          `${pageRouters.LEVEL_UP_TEAM.href}?tabId=1`,
                                        );
                                      } else {
                                        router.push(
                                          `${pageRouters.SKILL_MAP.href}?submitLevelId=${messageDetail.submitLevel?.id}`,
                                        );
                                      }
                                    }}>
                                    確認する
                                  </Button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
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
              <>
                {!messageDetail.deletedAt && (
                  <MessageHoverOptions
                    messageDetail={messageDetail}
                    chatRoomDetail={chatRoomDetail}
                    handleReplyMsg={handleReplyMsg}
                    handleOpenEditForm={handleOpenEditForm}
                    handleOpenDeleteMsgModal={handleOpenDeleteMsgModal}
                    handleUpdateBookmark={handleUpdateBookmark}
                    handleReactionClick={handleReactionClickDetail}
                    handleRemoveReactionClick={handleRemoveReactionClickDetail}
                    handleQuoteMsgIcon={handleQuoteMsgIcon}
                  />
                )}
              </>
            </div>
          )}
          {chatRoomDetail?.type === ChatRoomType.CALENDAR && (
            <div
              className={`flex relative !box-border ${String(messageDetail.id) == highlightedMessageId && 'bg-white'} group-hover:bg-[#FFFFFF] py-3 ml-[30px] mr-3 group-hover:rounded-md`}>
              <div>{renderAvatar(messageDetail.sender.id)}</div>
              <div className={`ml-[10px] w-full`}>
                <div className="flex justify-between items-baseline pb-[10px]">
                  <div className="flex gap-2 items-baseline font-semibold text-[15px] pr-2">
                    <p className="max-w-full break-all">
                      {messageDetail.sender.fullName}{' '}
                      <span className="font-medium text-xs text-[#77858F] ml-2">
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
                          messageDetail.schedule?.id &&
                            handleConfirmGetDataDetailEvent(
                              `${messageDetail.schedule?.id}`,
                            );
                        }}>
                        <ImageRound
                          className={`w-[15px] h-[14px]`}
                          name="Calendar icon"
                          src="/icons/calendar-time.svg"
                        />
                        <p
                          className={`${messageDetail.schedule ? 'text-primary' : 'text-gray-300'} text-sm font-medium`}>
                          {messageDetail.schedule
                            ? messageDetail.schedule?.title
                            : DELETED_EVENT_TITLE}
                        </p>
                      </div>
                      <div className="flex gap-1 text-sm font-medium">
                        <p className="text-primary break-all max-w-full">
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
              <>
                {!messageDetail.deletedAt && (
                  <MessageHoverOptions
                    messageDetail={messageDetail}
                    chatRoomDetail={chatRoomDetail}
                    handleReplyMsg={handleReplyMsg}
                    handleOpenEditForm={handleOpenEditForm}
                    handleOpenDeleteMsgModal={handleOpenDeleteMsgModal}
                    handleUpdateBookmark={handleUpdateBookmark}
                    handleReactionClick={handleReactionClickDetail}
                    handleRemoveReactionClick={handleRemoveReactionClickDetail}
                    handleQuoteMsgIcon={handleQuoteMsgIcon}
                  />
                )}
              </>
            </div>
          )}
        </div>
      )}
    </Fragment>
  );
};
