import { Dispatch, Fragment, SetStateAction } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

import { format } from 'date-fns';

import ImageRound from '@components/common/ImageRound';
import Button from '@components/common/Button';
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
  ChatFileResponse,
  ChatMessageResponse,
  ChatRoomDetail,
} from '@interfaces/chat';

import { useSessionCache } from '@providers/SessionCacheProvider';

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
import { MessageDetailQuoteChild } from './MessageDetailQuoteChild';
import MessageDetailQuoteText from './MessageDetailQuoteText';

export type MessageDetailProps = {
  chatRoomDetail: ChatRoomDetail | undefined;
  messageDetail: ChatMessageResponse;
  uuidQuote: string;
  msgEditing?: string;
  dashboardMembers: ChatDashboardMember[];
  highlightedMessageId: string | null;

  setDataPreviewFile: Dispatch<
    SetStateAction<{
      msgId: string;
      file: ChatFileResponse;
      user: ChatDashboardMember;
      createAt: string;
    } | null>
  >;

  handleActionEditTask: (id: number) => void;
};

export const MessageDetailQuote = ({
  chatRoomDetail,
  messageDetail,
  dashboardMembers,
  highlightedMessageId,
  uuidQuote,
  setDataPreviewFile,
  handleActionEditTask,
}: MessageDetailProps) => {
  const { data: session } = useSessionCache();
  const router = useRouter();

  // Render avatar
  const renderAvatar = (senderId: number) => {
    const memberInfo = dashboardMembers.find(
      (member) => member.id === senderId,
    );

    return (
      <div className="h-6 flex items-center gap-2">
        <ImageRound
          className="w-fit h-fit"
          name="Quote icon"
          src="/icons/quotation.svg"
        />
        <CustomUserAvatar
          avatarUrl={memberInfo?.avatarUrl || ''}
          avatarColor={memberInfo?.avatarColor || ''}
          size={22}
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
            const targetSpan = spans[1]?.outerHTML || '';

            children.push(
              <div
                key={`${index}-${i}-task`}
                id={taskId}
                onClick={() => {
                  if (taskId) handleActionEditTask(Number(taskId));
                }}
                className="flex mb-2 items-center w-full rounded-[6px] h-[42px] border border-[#D2DBE1] bg-white px-4 gap-3 hover:cursor-pointer">
                <ImageRound
                  className="w-[14px] h-[14px]"
                  name="Task icon"
                  src="/icons/gray-checkbox.svg"
                />
                <span
                  className="text-sm font-medium"
                  dangerouslySetInnerHTML={{ __html: targetSpan }}
                />
              </div>,
            );
          }

          if (el.dataset.quoteMsg) {
            const msgId = el.dataset.msgId;
            const foundQuote = messageDetail.quote?.find(
              (q) => q.uuid === msgId,
            );
            if (foundQuote) {
              children.push(
                <div className={``}>
                  <MessageDetailQuoteChild
                    key={`${index}-${i}-msg`}
                    chatRoomDetail={chatRoomDetail}
                    messageDetail={foundQuote}
                    uuidQuote={uuidQuote}
                    dashboardMembers={dashboardMembers}
                    highlightedMessageId={highlightedMessageId}
                    setDataPreviewFile={setDataPreviewFile}
                    handleActionEditTask={handleActionEditTask}
                  />
                </div>,
              );
            }
          }
          if (el.dataset.quoteText) {
            const msgId = el.dataset.msgId;
            const dataTitle = el.dataset.title || '';
            const foundQuote = messageDetail.quote?.find(
              (q) => q.uuid === msgId,
            );
            if (foundQuote) {
              children.push(
                <div className={`${index !== 0 && 'mt-5'}`}>
                  <MessageDetailQuoteText
                    key={`${index}-${i}-textquote`}
                    uuidQuote={uuidQuote}
                    messageDetail={foundQuote}
                    dashboardMembers={dashboardMembers}
                    title={dataTitle}
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
                    className="w-[14px] h-[12px] hover:cursor-pointer"
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
                  className="mention text-primary"
                  data-type="mention"
                  data-id={el.dataset.id}>
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

  return (
    <Fragment>
      {messageDetail && (
        <div className="group my-2 bg-white border border-[#D2DBE1] rounded-md">
          {(chatRoomDetail?.type === ChatRoomType.PRIVATE ||
            chatRoomDetail?.type === ChatRoomType.GROUP ||
            chatRoomDetail?.type === ChatRoomType.SELF) && (
            <div
              className={`flex !box-border group-hover:bg-[#FFFFFF] ${String(messageDetail.id) == highlightedMessageId && 'bg-white'} py-3 ml-5 mr-3 group-hover:rounded-md`}>
              {renderAvatar(messageDetail.sender.id)}
              <div className={`ml-3 !w-full`}>
                <div className="flex w-full gap-2 items-baseline pb-2">
                  <div className="flex w-fit  gap-2 items-baseline font-semibold text-[15px] pr-2">
                    <div className="w-fit min-w-0 break-all text-[13px] text-[#77858F] whitespace-normal line-clamp-3">
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
                                                    file?.compressedFile || '',
                                                  )}
                                                  alt="Image"
                                                  unoptimized={true}
                                                  width={150}
                                                  height={100}
                                                />
                                              </div>
                                            )}
                                            <p
                                              className={`text-primary font-medium text-[14px] break-all max-w-full ${
                                                file.fileType.includes('image')
                                                  ? 'max-w-[calc(100%_-_200px)]'
                                                  : 'max-w-[calc(100%)]'
                                              }`}>
                                              {file.fileName}
                                            </p>
                                          </div>
                                          {(file.fileType.includes('image') ||
                                            file.fileType.includes('pdf')) && (
                                            <Button
                                              onClick={() => {
                                                const memberInfo =
                                                  dashboardMembers.find(
                                                    (member) =>
                                                      member.id ===
                                                      messageDetail.sender.id,
                                                  );
                                                setDataPreviewFile({
                                                  msgId:
                                                    String(messageDetail.id) ||
                                                    '',
                                                  createAt: String(
                                                    messageDetail.createdAt,
                                                  ),
                                                  user: {
                                                    id: messageDetail.sender
                                                      ?.id,
                                                    avatarColor:
                                                      memberInfo?.avatarColor ||
                                                      '',
                                                    avatarUrl:
                                                      memberInfo?.avatarUrl ||
                                                      '',
                                                    fullName:
                                                      messageDetail.sender
                                                        ?.fullName,
                                                  },
                                                  file: file,
                                                });
                                              }}
                                              className="font-medium w-[84px] h-[30px] !rounded-[6px] text-xs !px-0"
                                              variant="outline">
                                              プレビュー
                                            </Button>
                                          )}
                                        </div>
                                      );
                                    },
                                  )}
                              </div>
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
                                    <p className="hover:cursor-pointer mt-2">
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
                                    <p className="hover:cursor-pointer mt-2">
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
                  </div>
                </div>
                {/* Data reaction */}
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
                  </div>
                </div>
              </div>
            </div>
          )}
          {chatRoomDetail?.type === ChatRoomType.SKILL && (
            <div
              className={`flex !box-border  ${String(messageDetail.id) == highlightedMessageId && 'bg-white'} group-hover:bg-[#FFFFFF] py-3 ml-5 mr-3 group-hover:rounded-md`}>
              <div>{renderAvatar(messageDetail.sender.id)}</div>
              <div className={`ml-3 w-full`}>
                <div className="flex gap-2 items-baseline pb-2">
                  <div className="flex gap-2 items-baseline font-semibold text-[15px] pr-2">
                    <p className="max-w-full break-all text-[13px] text-[#77858F]">
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
                  </div>
                </div>
              </div>
            </div>
          )}
          {chatRoomDetail?.type === ChatRoomType.CALENDAR && (
            <div
              className={`flex !box-border ${String(messageDetail.id) == highlightedMessageId && 'bg-white'} group-hover:bg-[#FFFFFF] py-3 ml-5 mr-3 group-hover:rounded-md`}>
              <div>{renderAvatar(messageDetail.sender.id)}</div>
              <div className={`ml-3 w-full`}>
                <div className="flex gap-2 items-baseline pb-2">
                  <div className="flex gap-2 items-baseline font-semibold text-[15px] pr-2">
                    <p className="max-w-full break-all text-[13px] text-[#77858F]">
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
                      <div className="flex items-center w-full rounded-[6px] h-[42px] border-[1px] border-[#D2DBE1] bg-white px-4 gap-3 hover:cursor-pointer">
                        <ImageRound
                          className={`w-[15px] h-[14px]`}
                          name="Calendar icon"
                          src="/icons/calendar-time.svg"
                        />
                        <p className="text-primary text-sm font-medium">
                          {messageDetail.schedule?.title}
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
              </div>
            </div>
          )}
        </div>
      )}
    </Fragment>
  );
};
