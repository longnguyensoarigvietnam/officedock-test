import { Dispatch, Fragment, SetStateAction } from 'react';
import { AxiosError } from 'axios';
import { format } from 'date-fns';
import { useSessionCache } from '@providers/SessionCacheProvider';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

import CustomUserAvatar from '@components/common/AvatarIcon/CustomUserAvatar';
import ImageRound from '@components/common/ImageRound';
import Button from '@components/common/Button';
import { MessageHoverBookmark } from './MessageHoverBookmark';

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
import { DELETED_EVENT_TITLE, ERROR_COMMON_MESSAGE } from '@constants/message';

import {
  ChatDashboardMember,
  ChatFileDetailResponse,
  ChatFileResponse,
  ChatMessageResponse,
  ChatParticipant,
} from '@interfaces/chat';
import { Profile } from '@interfaces/user';

import {
  displayRepetitiveEventTime,
  formatWithParagraphTags,
  handleDownloadFile,
  highlightTextSafely,
  renderEventDatetimeInChat,
  renderScheduleChangeInCalendarRoom,
} from '@utils';
import {
  convertToCurrentTimezone,
  formatCheckDate,
  getFormattedDateTime,
} from '@utils/date';
import { MessageHoverAllRoomsSearch } from './MessageHoverAllRoomsSearch';
import RenderFiles from './renderFiles/RenderFiles';
import api from '@base/api';
import { useMutation } from 'react-query';
import MessageDetailQuoteText from './quote/MessageDetailQuoteText';
import { MessageDetailQuote } from './quote/MessageDetailQuote';
import { useErrorToast } from '@hooks/useErrorToast';

export type MessageDetailProps = {
  isLastItem: boolean;
  isSearchingMessages?: boolean;
  allRoomChatMsgSearch?: string;
  messageDetail: ChatMessageResponse;
  dashboardMemberList: Omit<Profile, 'birthday' | 'gender'>[];
  chatRoomInfo?:
    | {
        id: number;
        name: string;
        code: string;
        type: string;
        participants: ChatParticipant[];
      }
    | undefined;
  setDataPreviewFile: Dispatch<
    SetStateAction<{
      msgId: string;
      file: ChatFileResponse;
      user: ChatDashboardMember;
      createAt: string;
    } | null>
  >;
  handleActionEditTask: (id: number) => void;
  handleConfirmGetDataDetailEvent: (id: string) => void;
  onGotoMessage: () => void;
  onGotoMessageReply: (data: {
    messageId: string | number;
    chatRoomCode: string;
  }) => void;
  handleRemoveItemBookmark?: (uuid: string) => void;
  handleBookmark?: (data: { uuid: string; isBookmark: boolean }) => void;
};

export const MessageDetailBookmark = ({
  isSearchingMessages = false,
  allRoomChatMsgSearch,
  messageDetail,
  dashboardMemberList,
  chatRoomInfo,
  setDataPreviewFile,
  handleActionEditTask,
  handleConfirmGetDataDetailEvent,
  onGotoMessage,
  handleRemoveItemBookmark,
  handleBookmark,
}: MessageDetailProps) => {
  const { data: session } = useSessionCache();
  const router = useRouter();
  const showErrorToast = useErrorToast();

  let uuidListMain = [];
  const parser = new DOMParser();
  const doc = parser.parseFromString(messageDetail?.message, 'text/html');
  const pEl = doc.querySelector('p');

  if (pEl) {
    const raw = pEl.getAttribute('data-uuid');
    uuidListMain = raw ? JSON.parse(raw) : [];
  }
  const uuidList = messageDetail?.chatFiles;

  // Render user avatar
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

  const highlightTitleBySearchTerm = (text: string, searchTerm: string) => {
    const safeText = text || '';

    if (!searchTerm) return safeText;

    const regex = new RegExp(`(${searchTerm})`, 'gi');
    const parts = safeText.split(regex);

    return parts.map((part, index) =>
      part.toLowerCase() === searchTerm.toLowerCase() ? (
        <span key={index} className="bg-[#0068B633]">
          {part}
        </span>
      ) : (
        part
      ),
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
        img.style.verticalAlign = 'middle';
        img.style.margin = '0 4px';
        img.style.verticalAlign = 'text-bottom';

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
                className="flex mb-2 items-center w-full rounded-[6px] min-h-[42px] border border-[#D2DBE1] bg-white px-4 gap-3 ">
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
                    messageDetail={foundQuote}
                    uuidQuote={foundQuote.uuid}
                    uuidList={uuidList}
                    isBookMark
                    chatRoomDetail={undefined}
                    highlightedMessageId={null}
                    dashboardMemberList={dashboardMemberList}
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
                      // onGotoMessageReply({
                      //   messageId: el.dataset.msgReplyId || '',
                      //   chatRoomCode: messageDetail?.chatRoom?.code || '',
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
            el.tagName === 'IMG' &&
            el.getAttribute('src')?.includes('/icons/') &&
            el.getAttribute('alt') &&
            el.getAttribute('title')
          ) {
            const src = el.getAttribute('src');
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
              {isSearchingMessages && allRoomChatMsgSearch
                ? highlightTitleBySearchTerm(skillName, allRoomChatMsgSearch)
                : skillName}{' '}
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
              {isSearchingMessages && allRoomChatMsgSearch
                ? highlightTitleBySearchTerm(skillName, allRoomChatMsgSearch)
                : skillName}{' '}
              <span className="text-black text-sm font-normal">
                のレベルアップの申請についてコメントが届いています。
              </span>
            </p>
          </div>
        );
      }
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
      onError: (error: AxiosError) => {
        showErrorToast(error, ERROR_COMMON_MESSAGE);
      },
      onSettled: () => {},
    },
  );

  return (
    <Fragment>
      <div className="group px-4">
        {(chatRoomInfo?.type === ChatRoomType.PRIVATE ||
          chatRoomInfo?.type === ChatRoomType.GROUP ||
          chatRoomInfo?.type === ChatRoomType.SELF) && (
          <div
            className={`flex relative !box-border border-b border-[#D2DBE1] group-hover:bg-[#FFFFFF] p-[14px] group-hover:rounded-md`}>
            {renderAvatar(messageDetail.sender.id)}
            <div className={`ml-[10px] !w-full`}>
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
                      src={`/icons/save-active.svg`}
                      className="w-[10px] h-[12px] relative top-[2px] "
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
              <div className="relative !box-border">
                <div>
                  <div className="flex flex-col">
                    {messageDetail.deletedAt ? (
                      <p
                        className={`font-normal text-sm  -ml-1 p-1 rounded-[5px] text-gray-600 italic bg-[#f0f1f1] w-[220px]`}>
                        {MESSAGE_DELETED}
                      </p>
                    ) : (
                      <div>
                        {messageDetail.type === MessageType.MESSAGE && (
                          <div className="!w-[100%] break-all">
                            {processMessage(
                              isSearchingMessages && allRoomChatMsgSearch
                                ? highlightTextSafely(
                                    messageDetail.message,
                                    allRoomChatMsgSearch,
                                    session?.user.profile.fullName || '',
                                  )
                                : messageDetail.message,
                              messageDetail.mentions || [],
                            )}
                            {setDataPreviewFile &&
                              messageDetail?.chatFiles &&
                              messageDetail?.chatFiles.length > 0 && (
                                <RenderFiles
                                  dashboardMemberList={dashboardMemberList}
                                  uuidList={uuidList}
                                  uuidMain={uuidListMain}
                                  messageDetail={messageDetail}
                                  downloadFileName={downloadFileName}
                                  setDataPreviewFile={setDataPreviewFile}
                                />
                              )}
                          </div>
                        )}
                        {messageDetail.type === MessageType.REMOVE_SCHEDULE && (
                          <div className={`w-full flex justify-start`}>
                            <div
                              className={`text-xs font-normal bg-[#eaf8ff] !w-[100%] p-4 `}>
                              <div className={`flex flex-col items-start`}>
                                <p className="w-fit font-semibold text-black">
                                  {messageDetail.sender.fullName}
                                  {EVENT_DELETED}
                                </p>
                                <p className="font-semibold mt-2">日時</p>
                                <div className={`text-left`}>
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
                                <p className="w-fit font-semibold max-w-full break-all text-black">
                                  {messageDetail.sender.fullName} {EVENT_EDITED}
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
                                        .repeatType == TaskRepetitiveValue.ONCE
                                        ? renderEventDatetimeInChat(
                                            messageDetail.scheduleChanges?.new,
                                          )
                                        : displayRepetitiveEventTime(
                                            messageDetail.scheduleChanges?.new,
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
                                    {messageDetail.sender.fullName}
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
                                  {messageDetail.sender.fullName}
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
                          messageDetail.type === MessageType.ADD_MEMBER_TASK) &&
                          (messageDetail.task ? (
                            <div className={`w-full flex justify-start`}>
                              <div
                                className={`text-xs font-normal bg-[#eaf8ff] w-[750px] p-4 `}>
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
                                className={`text-sm font-normal bg-[#eaf8ff] p-1`}>
                                <div className={`flex flex-col items-start`}>
                                  <p
                                    className={`font-normal w-[500px]  text-sm  text-start -ml-1 p-1 rounded-[5px] text-gray-600 italic`}>
                                    {TASK_DELETED}
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
            </div>
            <>
              {!messageDetail.deletedAt &&
                (isSearchingMessages ? (
                  <MessageHoverAllRoomsSearch
                    messageDetail={messageDetail}
                    onGotoMessage={onGotoMessage}
                    handleBookmark={handleBookmark}
                  />
                ) : (
                  <MessageHoverBookmark
                    uuid={messageDetail.uuid}
                    onGotoMessage={onGotoMessage}
                    handleRemoveItemBookmark={handleRemoveItemBookmark}
                  />
                ))}
            </>
          </div>
        )}
        {chatRoomInfo?.type === ChatRoomType.TASK && (
          <div
            className={`flex relative !box-border border-b border-[#D2DBE1] group-hover:bg-[#FFFFFF] p-[14px] group-hover:rounded-md`}>
            {messageDetail.type !== MessageType.MESSAGE ? (
              <ImageRound
                className="w-[30px] h-[30px]"
                src="/icons/document.svg"
                border="full"
                name="Task"
              />
            ) : (
              <div>{renderAvatar(messageDetail.sender.id)}</div>
            )}
            <div className={`ml-[10px] !w-full`}>
              <div className="flex justify-between items-baseline pb-[10px]">
                <div className="flex gap-2 items-baseline font-semibold text-[15px] pr-2">
                  {messageDetail.type !== MessageType.MESSAGE ? (
                    <p className="font-semibold text-sm">タスクカード</p>
                  ) : (
                    <p className="max-w-full break-all">
                      {messageDetail.sender.fullName}{' '}
                      <span className="font-medium text-xs text-[#77858F] ml-2">
                        {messageDetail.sender?.organizations?.name}
                      </span>
                    </p>
                  )}

                  {messageDetail.isBookmark && (
                    <ImageRound
                      name="Save"
                      src={`/icons/save-active.svg`}
                      className="w-[10px] h-[12px]"
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
                        className={`font-normal text-sm  -ml-1 p-1 rounded-[5px] text-gray-600 italic bg-[#f0f1f1] w-[220px]`}>
                        {MESSAGE_DELETED}
                      </p>
                    ) : (
                      <div>
                        {messageDetail.type === MessageType.MESSAGE && (
                          <p
                            className={`text-chat-box font-normal text-sm  max-w-[750px] -ml-1 p-1 rounded-[5px]  `}
                            dangerouslySetInnerHTML={{
                              __html: messageDetail.message,
                            }}></p>
                        )}
                        {messageDetail.type !== MessageType.MESSAGE &&
                          (messageDetail.task ? (
                            <div className={`w-full flex justify-start`}>
                              <div
                                className={`text-xs font-normal bg-[#eaf8ff] w-[750px] p-4 `}>
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
                                    className={`font-normal w-[500px]  text-sm  text-start -ml-1 p-1 rounded-[5px] text-gray-600 italic`}>
                                    {TASK_DELETED}
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
            </div>
            <>
              {!messageDetail.deletedAt &&
                (isSearchingMessages ? (
                  <MessageHoverAllRoomsSearch
                    messageDetail={messageDetail}
                    onGotoMessage={onGotoMessage}
                    handleBookmark={handleBookmark}
                  />
                ) : (
                  <MessageHoverBookmark
                    uuid={messageDetail.uuid}
                    onGotoMessage={onGotoMessage}
                    handleRemoveItemBookmark={handleRemoveItemBookmark}
                  />
                ))}
            </>
          </div>
        )}
        {chatRoomInfo?.type === ChatRoomType.SKILL && (
          <div
            className={`flex relative !box-border border-b border-[#D2DBE1] group-hover:bg-[#FFFFFF] p-[14px] group-hover:rounded-md`}>
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
                      src={`/icons/save-active.svg`}
                      className="w-[10px] h-[12px]"
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
                        className={`font-normal text-sm  -ml-1 p-1 rounded-[5px] text-gray-600 italic bg-[#f0f1f1] w-[220px]`}>
                        {messageDetail.type == MessageType.MESSAGE
                          ? MESSAGE_DELETED
                          : DELETED_SKILL_UP_MESSAGE}
                      </p>
                    ) : (
                      <div>
                        {messageDetail.type === MessageType.MESSAGE && (
                          <p
                            className={`text-chat-box font-normal text-sm  !w-[100%] -ml-1 p-1 rounded-[5px]`}
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
                                    router.push(
                                      `${pageRouters.LEVEL_UP_TEAM.href}?tabId=1`,
                                    );
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
            </div>
            <>
              {!messageDetail.deletedAt &&
                (isSearchingMessages ? (
                  <MessageHoverAllRoomsSearch
                    messageDetail={messageDetail}
                    onGotoMessage={onGotoMessage}
                    handleBookmark={handleBookmark}
                  />
                ) : (
                  <MessageHoverBookmark
                    uuid={messageDetail.uuid}
                    onGotoMessage={onGotoMessage}
                    handleRemoveItemBookmark={handleRemoveItemBookmark}
                  />
                ))}
            </>
          </div>
        )}
        {chatRoomInfo?.type === ChatRoomType.CALENDAR && (
          <div
            className={`flex relative !box-border border-b border-[#D2DBE1] group-hover:bg-[#FFFFFF] p-[14px] group-hover:rounded-md`}>
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
                      src={`/icons/save-active.svg`}
                      className="w-[10px] h-[12px]"
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
                    <div className="flex gap-3 w-full">
                      <div className="flex flex-row  gap-3 text-sm font-medium">
                        <p className="text-primary max-w-full break-all">
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
                    </div>
                    <div className="text-[#5B6770] font-normal text-sm">
                      <p>
                        {messageDetail.scheduleChanges?.new &&
                          (messageDetail.scheduleChanges?.new.repeatType ==
                          TaskRepetitiveValue.ONCE
                            ? renderScheduleChangeInCalendarRoom(messageDetail)
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
            </div>
            <>
              {!messageDetail.deletedAt &&
                (isSearchingMessages ? (
                  <MessageHoverAllRoomsSearch
                    messageDetail={messageDetail}
                    onGotoMessage={onGotoMessage}
                    handleBookmark={handleBookmark}
                  />
                ) : (
                  <MessageHoverBookmark
                    uuid={messageDetail.uuid}
                    onGotoMessage={onGotoMessage}
                    handleRemoveItemBookmark={handleRemoveItemBookmark}
                  />
                ))}
            </>
          </div>
        )}
      </div>
    </Fragment>
  );
};
