import Image from 'next/image';
import { format, isSameDay } from 'date-fns';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  Dispatch,
  Fragment,
  MutableRefObject,
  SetStateAction,
  useEffect,
  useState,
} from 'react';
import { Editor } from '@tiptap/react';

import AvatarIconWithDynamicColor from '@components/common/AvatarIcon';
import ImageRound from '@components/common/ImageRound';
import Button from '@components/common/Button';
import { ProgressBar } from '@components/common/ProgressBar';

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
import { ChatRoomType, MessageType, SubmitLevelStatus } from '@constants/enums';
import { pageRouters } from '@constants/routers';

import {
  ChatDashboardMember,
  ChatMessageResponse,
  ChatParticipant,
  ChatRoomDetail,
} from '@interfaces/chat';

import { formatWithParagraphTags, getChatFileURL } from '@utils';
import {
  convertToCurrentTimezone,
  convertToTimeString,
  formatCheckDate,
  formatHoursAndMinutesForDateTime,
  formatShowDeadline,
  getFormattedDateTime,
  getJapaneseDayName,
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

  const [dataMsgDetail, setDataMsgDetail] = useState<ChatMessageResponse>();

  useEffect(() => {
    if (messageDetail) {
      setDataMsgDetail(messageDetail);
    }
  }, [messageDetail]);

  const handleOpenDeleteMsgModal = (id: string) => {
    setOpenConfirmDeleteModal(true);
    if (setMsgIdDeleted) {
      setMsgIdDeleted(id);
    }
  };

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
        (matchedUser?.id === session?.user.id || mentionName === MENTION_ALL_MEMBERS) ? '#0068B7' : '#77858F';
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
            <p className="text-[#0068B6] font-medium text-sm">{skillName}</p>
            <p className="text-black text-sm">
              のスキルがレベルアップしました！
            </p>
          </div>
        );
      } else {
        return (
          <div className="flex gap-2">
            <p className="text-[#0068B6] font-medium text-sm">{skillName}</p>
            <p className="text-black text-sm">
              のレベルアップの申請についてコメントが届いています。
            </p>
          </div>
        );
      }
    }
  };

  const handleReactionClickDetail = (icon: string) => {
    if (dataMsgDetail) {
      handleReactionClick(dataMsgDetail?.uuid, icon);
      handleResetChatRoomNotification();
    }
  };

  const handleRemoveReactionClickDetail = (icon: string) => {
    if (dataMsgDetail) {
      handleRemoveReactionClick(dataMsgDetail?.uuid, icon);
      handleResetChatRoomNotification();
    }
  };

  return (
    <Fragment>
      {dataMsgDetail && (
        <div className="group my-2">
          {(chatRoomDetail?.type === ChatRoomType.PRIVATE ||
            chatRoomDetail?.type === ChatRoomType.GROUP ||
            chatRoomDetail?.type === ChatRoomType.SELF) && (
            <div
              className={`flex !box-border group-hover:bg-[#FFFFFF] ${String(dataMsgDetail.id) == highlightedMessageId && 'bg-white'} py-1 ml-5 mr-3 group-hover:rounded-md`}>
              {renderAvatar(dataMsgDetail.sender.id)}
              <div className={`ml-3 !w-[96%]`}>
                <div className="flex justify-between items-center pb-2">
                  <div className="flex gap-2 items-center font-semibold text-[15px]">
                    <p className="truncate max-w-[500px]">
                      {dataMsgDetail.sender.fullName}{' '}
                    </p>
                    <p className="font-medium text-xs truncate max-w-[200px] text-[#77858F]">
                      {dataMsgDetail.sender?.organizations?.name}
                    </p>
                    {dataMsgDetail.isBookmark && (
                      <ImageRound
                        name="Save"
                        src="/icons/save-active.svg"
                        className="w-[10px] h-[12px] hover:cursor-pointer"
                      />
                    )}
                  </div>
                  <div className={`flex items-start`}>
                    <p className="font-medium text-xs text-[#77858F] min-w-[80px]">
                      {dataMsgDetail.createdAt &&
                        formatCheckDate(
                          getFormattedDateTime(
                            convertToCurrentTimezone(dataMsgDetail.createdAt),
                          ),
                        )}
                    </p>
                    {dataMsgDetail.isEdited && !dataMsgDetail.deletedAt && (
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
                <div className="relative !box-border">
                  <div>
                    <div className="flex flex-col">
                      {dataMsgDetail.deletedAt ? (
                        <p
                          className={`font-normal text-sm hover:cursor-pointer -ml-1 p-1 rounded-[5px] text-gray-600 italic bg-[#f0f1f1] w-[220px]`}>
                          {MESSAGE_DELETED}
                        </p>
                      ) : (
                        <div>
                          {dataMsgDetail.type === MessageType.MESSAGE && (
                            <div className="break-words">
                              {processMessage(
                                dataMsgDetail.message,
                                dataMsgDetail.mentions || [],
                              )}
                              {dataMsgDetail?.chatFiles &&
                              dataMsgDetail?.chatFiles.length > 0 &&
                              uploadFileStatus[dataMsgDetail.uuid]?.progress >=
                                0 &&
                              uploadFileStatus[dataMsgDetail.uuid]?.progress <
                                100 ? (
                                <ProgressBar
                                  value={
                                    uploadFileStatus[dataMsgDetail.uuid]
                                      .progress
                                  }
                                />
                              ) : (
                                <div className="flex flex-col gap-2 !w-[100%]">
                                  {dataMsgDetail?.chatFiles &&
                                    dataMsgDetail?.chatFiles.length > 0 &&
                                    dataMsgDetail?.chatFiles.map(
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
                                                    src={getChatFileURL(
                                                      file?.compressedFile ||
                                                        '',
                                                    )}
                                                    alt="Image"
                                                    width={150}
                                                    height={100}
                                                  />
                                                </div>
                                              )}
                                              <p
                                                className={`text-[#0068B6] font-medium text-[14px] break-words break-all max-w-full ${
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
                          {dataMsgDetail.type ===
                            MessageType.REMOVE_SCHEDULE && (
                            <div className={`w-full flex justify-start`}>
                              <div
                                className={`text-xs font-normal bg-[#eaf8ff] !w-[100%] p-4 `}>
                                <div className={`flex flex-col items-start`}>
                                  <p className="w-fit font-semibold text-black">
                                    {dataMsgDetail.sender.fullName}{' '}
                                    {EVENT_DELETED}
                                  </p>
                                  <p className="font-semibold mt-2">日時</p>
                                  <p>
                                    {dataMsgDetail.scheduleChanges?.new &&
                                      `${format(
                                        dataMsgDetail.scheduleChanges?.new
                                          .startDate as string,
                                        DATE_FORMAT,
                                      )}(${getJapaneseDayName(
                                        dataMsgDetail.scheduleChanges?.new
                                          .startDate as string,
                                      )})`}{' '}
                                    {dataMsgDetail.scheduleChanges?.new &&
                                      convertToTimeString(
                                        `${dataMsgDetail.scheduleChanges?.new.startDate}`,
                                      )}{' '}
                                    ~{' '}
                                    {dataMsgDetail.scheduleChanges?.new &&
                                      String(
                                        format(
                                          dataMsgDetail.scheduleChanges?.new
                                            .startDate as string,
                                          DATE_FORMAT,
                                        ),
                                      ) !==
                                        String(
                                          format(
                                            dataMsgDetail.scheduleChanges?.new
                                              .endDate as string,
                                            DATE_FORMAT,
                                          ),
                                        ) &&
                                      `${format(
                                        dataMsgDetail.scheduleChanges?.new
                                          .endDate as string,
                                        DATE_FORMAT,
                                      )}(${getJapaneseDayName(
                                        dataMsgDetail.scheduleChanges?.new
                                          .endDate as string,
                                      )})`}{' '}
                                    {dataMsgDetail.scheduleChanges?.new &&
                                      convertToTimeString(
                                        `${dataMsgDetail.scheduleChanges?.new.endDate}`,
                                      )}
                                  </p>
                                  <p className="font-semibold mt-2">参加者</p>
                                  <p>
                                    {
                                      dataMsgDetail.scheduleChanges?.participants?.find(
                                        (participant) => participant.isCreator,
                                      )?.name
                                    }{' '}
                                    {dataMsgDetail.scheduleChanges?.participants?.find(
                                      (participant) => participant.isCreator,
                                    ) && '-主催者'}
                                  </p>
                                  {dataMsgDetail.scheduleChanges?.participants?.find(
                                    (participant) => participant.isCreator,
                                  )
                                    ? dataMsgDetail.scheduleChanges?.participants
                                        ?.filter(
                                          (participant) =>
                                            !participant.isCreator,
                                        )
                                        ?.slice(0, 3)
                                        .map((participant) => (
                                          <p key={participant.id}>
                                            {participant.name}{' '}
                                          </p>
                                        ))
                                    : dataMsgDetail.scheduleChanges?.participants
                                        ?.slice(0, 4)
                                        .map((participant) => (
                                          <p key={participant.id}>
                                            {participant.name}{' '}
                                          </p>
                                        ))}
                                  {dataMsgDetail.scheduleChanges
                                    ?.participants &&
                                    dataMsgDetail.scheduleChanges?.participants
                                      ?.length > 4 && <p>その他</p>}
                                  <p
                                    className={`mt-2 text-left`}
                                    dangerouslySetInnerHTML={{
                                      __html: formatWithParagraphTags(
                                        dataMsgDetail.message,
                                      ),
                                    }}></p>
                                </div>
                              </div>
                            </div>
                          )}
                          {dataMsgDetail.type === MessageType.EDIT_SCHEDULE && (
                            <div className={`w-full flex justify-start`}>
                              <div
                                className={`text-xs font-normal bg-[#eaf8ff] !w-[100%] p-4 `}>
                                <div className={`flex flex-col items-start`}>
                                  <p className="w-fit font-semibold text-black">
                                    {EVENT_EDITED}
                                  </p>
                                  <p className="mt-2">
                                    変更あり:{' '}
                                    {dataMsgDetail.scheduleChanges?.fieldChanges?.map(
                                      (field, index) => {
                                        return (
                                          <span key={index}>
                                            {field}
                                            {dataMsgDetail.scheduleChanges &&
                                              dataMsgDetail.scheduleChanges
                                                .fieldChanges &&
                                              index <
                                                dataMsgDetail.scheduleChanges
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
                                      {dataMsgDetail.scheduleChanges?.new &&
                                        `${format(
                                          dataMsgDetail.scheduleChanges?.new
                                            .startDate as string,
                                          DATE_FORMAT,
                                        )}(${getJapaneseDayName(
                                          dataMsgDetail.scheduleChanges?.new
                                            .startDate as string,
                                        )})`}{' '}
                                      {dataMsgDetail.scheduleChanges?.new &&
                                        convertToTimeString(
                                          `${dataMsgDetail.scheduleChanges?.new.startDate}`,
                                        )}{' '}
                                      ~{' '}
                                      {dataMsgDetail.scheduleChanges?.new &&
                                        String(
                                          format(
                                            dataMsgDetail.scheduleChanges?.new
                                              .startDate as string,
                                            DATE_FORMAT,
                                          ),
                                        ) !==
                                          String(
                                            format(
                                              dataMsgDetail.scheduleChanges?.new
                                                .endDate as string,
                                              DATE_FORMAT,
                                            ),
                                          ) &&
                                        `${format(
                                          dataMsgDetail.scheduleChanges?.new
                                            .endDate as string,
                                          DATE_FORMAT,
                                        )}(${getJapaneseDayName(
                                          dataMsgDetail.scheduleChanges?.new
                                            .endDate as string,
                                        )})`}{' '}
                                      {dataMsgDetail.scheduleChanges?.new &&
                                        convertToTimeString(
                                          `${dataMsgDetail.scheduleChanges?.new.endDate}`,
                                        )}
                                    </p>
                                    {dataMsgDetail.scheduleChanges?.old && (
                                      <p>
                                        {'('}
                                        {EVENT_BEFORE_EDITED}
                                        {dataMsgDetail.scheduleChanges?.old &&
                                          `${format(
                                            dataMsgDetail.scheduleChanges?.old
                                              .startDate as string,
                                            DATE_FORMAT,
                                          )}(${getJapaneseDayName(
                                            dataMsgDetail.scheduleChanges?.old
                                              .startDate as string,
                                          )})`}{' '}
                                        {dataMsgDetail.scheduleChanges?.old &&
                                          convertToTimeString(
                                            `${dataMsgDetail.scheduleChanges?.old.startDate}`,
                                          )}{' '}
                                        ~{' '}
                                        {dataMsgDetail.scheduleChanges?.old &&
                                          String(
                                            format(
                                              dataMsgDetail.scheduleChanges?.old
                                                .startDate as string,
                                              DATE_FORMAT,
                                            ),
                                          ) !==
                                            String(
                                              format(
                                                dataMsgDetail.scheduleChanges
                                                  ?.old.endDate as string,
                                                DATE_FORMAT,
                                              ),
                                            ) &&
                                          `${format(
                                            dataMsgDetail.scheduleChanges?.old
                                              .endDate as string,
                                            DATE_FORMAT,
                                          )}(${getJapaneseDayName(
                                            dataMsgDetail.scheduleChanges?.old
                                              .endDate as string,
                                          )})`}{' '}
                                        {dataMsgDetail.scheduleChanges?.old &&
                                          convertToTimeString(
                                            `${dataMsgDetail.scheduleChanges?.old.endDate}`,
                                          )}
                                        {')'}
                                      </p>
                                    )}
                                  </div>
                                  <p className="font-semibold mt-2">参加者</p>
                                  <p>
                                    {
                                      dataMsgDetail.scheduleChanges?.participants?.find(
                                        (participant) => participant.isCreator,
                                      )?.name
                                    }{' '}
                                    {dataMsgDetail.scheduleChanges?.participants?.find(
                                      (participant) => participant.isCreator,
                                    ) && '-主催者'}
                                  </p>
                                  {dataMsgDetail.scheduleChanges?.participants?.find(
                                    (participant) => participant.isCreator,
                                  )
                                    ? dataMsgDetail.scheduleChanges?.participants
                                        ?.filter(
                                          (participant) =>
                                            !participant.isCreator,
                                        )
                                        ?.slice(0, 3)
                                        .map((participant) => (
                                          <p key={participant.id}>
                                            {participant.name}{' '}
                                          </p>
                                        ))
                                    : dataMsgDetail.scheduleChanges?.participants
                                        ?.slice(0, 4)
                                        .map((participant) => (
                                          <p key={participant.id}>
                                            {participant.name}{' '}
                                          </p>
                                        ))}
                                  {dataMsgDetail.scheduleChanges
                                    ?.participants &&
                                    dataMsgDetail.scheduleChanges?.participants
                                      ?.length > 4 && <p>その他</p>}
                                  {dataMsgDetail.schedule?.id ? (
                                    <p
                                      className="hover:cursor-pointer mt-2"
                                      onClick={() =>
                                        handleConfirmGetDataDetailEvent(
                                          `${dataMsgDetail.schedule?.id}`,
                                        )
                                      }>
                                      予定を確認する
                                    </p>
                                  ) : (
                                    <p className="mt-2 italic text-gray-600">
                                      {EVENT_DELETED}
                                    </p>
                                  )}
                                  <p
                                    className={`mt-2 text-left`}
                                    dangerouslySetInnerHTML={{
                                      __html: formatWithParagraphTags(
                                        dataMsgDetail.message,
                                      ),
                                    }}></p>
                                </div>
                              </div>
                            </div>
                          )}
                          {dataMsgDetail.type ===
                            MessageType.CREATION_SCHEDULE && (
                            <div className={`w-full flex justify-start`}>
                              <div
                                className={`text-xs font-normal bg-[#eaf8ff] !w-[100%] p-4 `}>
                                <div className={`flex flex-col items-start`}>
                                  <p className="w-fit font-semibold text-black">
                                    {dataMsgDetail.sender.fullName}{' '}
                                    {EVENT_CREATED}
                                  </p>
                                  <p className="font-semibold mt-2">日時</p>
                                  <p>
                                    {dataMsgDetail.scheduleChanges?.new &&
                                      `${format(
                                        dataMsgDetail.scheduleChanges?.new
                                          .startDate as string,
                                        DATE_FORMAT,
                                      )}(${getJapaneseDayName(
                                        dataMsgDetail.scheduleChanges?.new
                                          .startDate as string,
                                      )})`}{' '}
                                    {dataMsgDetail.scheduleChanges?.new &&
                                      convertToTimeString(
                                        `${dataMsgDetail.scheduleChanges?.new.startDate}`,
                                      )}{' '}
                                    ~{' '}
                                    {dataMsgDetail.scheduleChanges?.new &&
                                      String(
                                        format(
                                          dataMsgDetail.scheduleChanges?.new
                                            .startDate as string,
                                          DATE_FORMAT,
                                        ),
                                      ) !==
                                        String(
                                          format(
                                            dataMsgDetail.scheduleChanges?.new
                                              .endDate as string,
                                            DATE_FORMAT,
                                          ),
                                        ) &&
                                      `${format(
                                        dataMsgDetail.scheduleChanges?.new
                                          .endDate as string,
                                        DATE_FORMAT,
                                      )}(${getJapaneseDayName(
                                        dataMsgDetail.scheduleChanges?.new
                                          .endDate as string,
                                      )})`}{' '}
                                    {dataMsgDetail.scheduleChanges?.new &&
                                      convertToTimeString(
                                        `${dataMsgDetail.scheduleChanges?.new.endDate}`,
                                      )}
                                  </p>
                                  <p className="font-semibold mt-2">参加者</p>
                                  <p>
                                    {
                                      dataMsgDetail.scheduleChanges?.participants?.find(
                                        (participant) => participant.isCreator,
                                      )?.name
                                    }{' '}
                                    {dataMsgDetail.scheduleChanges?.participants?.find(
                                      (participant) => participant.isCreator,
                                    ) && '-主催者'}
                                  </p>
                                  {dataMsgDetail.scheduleChanges?.participants?.find(
                                    (participant) => participant.isCreator,
                                  )
                                    ? dataMsgDetail.scheduleChanges?.participants
                                        ?.filter(
                                          (participant) =>
                                            !participant.isCreator,
                                        )
                                        ?.slice(0, 3)
                                        .map((participant) => (
                                          <p key={participant.id}>
                                            {participant.name}{' '}
                                          </p>
                                        ))
                                    : dataMsgDetail.scheduleChanges?.participants
                                        ?.slice(0, 4)
                                        .map((participant) => (
                                          <p key={participant.id}>
                                            {participant.name}{' '}
                                          </p>
                                        ))}
                                  {dataMsgDetail.scheduleChanges
                                    ?.participants &&
                                    dataMsgDetail.scheduleChanges?.participants
                                      ?.length > 4 && <p>その他</p>}
                                  {dataMsgDetail.schedule?.id ? (
                                    <p
                                      className="hover:cursor-pointer mt-2"
                                      onClick={() =>
                                        handleConfirmGetDataDetailEvent(
                                          `${dataMsgDetail.schedule?.id}`,
                                        )
                                      }>
                                      予定を確認する
                                    </p>
                                  ) : (
                                    <p className="mt-2 italic text-gray-600">
                                      {EVENT_DELETED}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                          {(dataMsgDetail.type === MessageType.CREATION_TASK ||
                            dataMsgDetail.type ===
                              MessageType.REMOVE_MEMBER_TASK ||
                            dataMsgDetail.type ===
                              MessageType.ADD_MEMBER_TASK) &&
                            (dataMsgDetail.task ? (
                              <div className={`w-full flex justify-start`}>
                                <div
                                  className={`text-xs font-normal bg-[#eaf8ff] w-[750px] p-4 `}>
                                  <div className={`flex flex-col items-start`}>
                                    <h4 className="text-sm w-fit font-medium text-black h-5">
                                      {dataMsgDetail.type ==
                                      MessageType.CREATION_TASK
                                        ? CREATION_TASK_MESSAGE
                                        : dataMsgDetail.type ==
                                            MessageType.REMOVE_MEMBER_TASK
                                          ? REMOVE_MEMBER_TASK_MESSAGE
                                          : ADD_MEMBER_TASK_MESSAGE}
                                    </h4>
                                    <h4 className="text-sm w-fit text-black h-5 truncate max-w-[500px]">
                                      タスクのタイトル:{' '}
                                      {dataMsgDetail.task.title || NO_SETTING}
                                    </h4>
                                    {dataMsgDetail.type !==
                                      MessageType.REMOVE_MEMBER_TASK && (
                                      <p className="w-fit mt-2">
                                        締切 :{' '}
                                        {(dataMsgDetail.task.deadline &&
                                          format(
                                            dataMsgDetail.task.deadline,
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
                      {!dataMsgDetail.deletedAt &&
                        !(
                          uploadFileStatus[dataMsgDetail.uuid]?.progress >= 0 &&
                          uploadFileStatus[dataMsgDetail.uuid]?.progress < 100
                        ) && (
                          <MessageHoverOptions
                            messageDetail={dataMsgDetail}
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
                      dataMsgDetail={dataMsgDetail}
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
              className={`flex !box-border  ${String(dataMsgDetail.id) == highlightedMessageId && 'bg-white'} group-hover:bg-[#FFFFFF] py-3 ml-5 mr-3 group-hover:rounded-md`}>
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
              <div className={`ml-3 w-full pr-5`}>
                <div className="flex justify-between items-center">
                  {messageDetail.type !== MessageType.MESSAGE ? (
                    <div className="flex gap-2 !items-center font-semibold text-[15px] pb-2">
                      <p className="font-semibold text-sm">タスクカード</p>
                      {messageDetail.isBookmark && (
                        <ImageRound
                          name="Save"
                          src="/icons/save-active.svg"
                          className="w-[10px] h-[12px] hover:cursor-pointer"
                        />
                      )}
                    </div>
                  ) : (
                    <div className="flex gap-2 items-center font-semibold text-[15px] pb-2">
                      <p className="truncate max-w-[500px]">
                        {messageDetail.sender.fullName}{' '}
                      </p>
                      <p className="font-medium text-xs truncate max-w-[200px] text-[#77858F]">
                        {messageDetail.sender?.organizations?.name}
                      </p>
                    </div>
                  )}

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
                              className={`text-chat-box font-normal text-sm hover:cursor-pointer max-w-[750px] -ml-1 p-1 rounded-[5px]  `}
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
                      dataMsgDetail={dataMsgDetail}
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
              className={`flex !box-border  ${String(dataMsgDetail.id) == highlightedMessageId && 'bg-white'} group-hover:bg-[#FFFFFF] py-1 ml-5 mr-3 group-hover:rounded-md`}>
              <div>
                {renderAvatar(
                  messageDetail.type == MessageType.CREATE_SUBMIT_LEVEL_SKILL
                    ? Number(session?.user.id)
                    : messageDetail.sender.id,
                )}
              </div>
              <div className={`ml-3 w-full pr-5`}>
                <div className="flex justify-between items-center">
                  <div className="flex gap-2 items-center font-semibold text-[15px] pb-2">
                    <p className="truncate max-w-[500px]">
                      {messageDetail.sender.fullName}{' '}
                    </p>
                    <p className="font-medium text-xs truncate max-w-[200px] text-[#77858F]">
                      {messageDetail.sender?.organizations?.name}
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
                                  <h4 className="text-sm w-fit text-black h-5">
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
                                          pageRouters.SUBMIT_LEVELS.href,
                                        );
                                      } else {
                                        router.push(
                                          pageRouters.DETAIL_SUBMIT_LEVELS.href(
                                            `${messageDetail.submitLevel?.id}`,
                                          ),
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
                      dataMsgDetail={dataMsgDetail}
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
              className={`flex !box-border ${String(dataMsgDetail.id) == highlightedMessageId && 'bg-white'} group-hover:bg-[#FFFFFF] py-3 ml-5 mr-3 group-hover:rounded-md`}>
              <div>{renderAvatar(messageDetail.sender.id)}</div>
              <div className={`ml-3 w-full pr-5`}>
                <div className="flex justify-between items-center">
                  <div className="flex gap-2 items-center font-semibold text-[15px] pb-2">
                    <p className="truncate max-w-[500px]">
                      {messageDetail.sender.fullName}
                    </p>
                    <p className="font-medium text-xs truncate max-w-[200px] text-[#77858F]">
                      {messageDetail.sender?.organizations?.name}
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
                    <p className="font-medium text-xs text-[#77858F]">
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
                        <p className="text-[#0068B6] max-w-[500px] truncate">
                          {messageDetail.sender.fullName}
                        </p>
                        <p>
                          {messageDetail.type === MessageType.REMOVE_SCHEDULE
                            ? EVENT_DELETED
                            : messageDetail.type === MessageType.EDIT_SCHEDULE
                              ? EVENT_EDITED
                              : EVENT_CREATED}
                        </p>
                      </div>
                      <div className="text-[#5B6770] font-normal text-sm">
                        <p>
                          {messageDetail.scheduleChanges?.new?.startDate &&
                            messageDetail.scheduleChanges?.new?.endDate &&
                            (isSameDay(
                              new Date(
                                messageDetail.scheduleChanges?.new?.startDate,
                              ),
                              new Date(
                                messageDetail.scheduleChanges?.new?.endDate,
                              ),
                            ) ? (
                              <p>
                                {formatShowDeadline(
                                  messageDetail.scheduleChanges?.new?.startDate,
                                )}{' '}
                                {messageDetail.schedule?.isAllDay ? (
                                  '終日'
                                ) : (
                                  <>
                                    {formatHoursAndMinutesForDateTime(
                                      new Date(
                                        messageDetail.scheduleChanges?.new?.startDate,
                                      ),
                                    )}{' '}
                                    ~{' '}
                                    {formatHoursAndMinutesForDateTime(
                                      new Date(
                                        messageDetail.scheduleChanges?.new?.endDate,
                                      ),
                                    )}
                                  </>
                                )}
                              </p>
                            ) : (
                              <p>
                                {messageDetail.schedule?.isAllDay ? (
                                  <>
                                    {formatShowDeadline(
                                      messageDetail.scheduleChanges?.new
                                        ?.startDate,
                                    )}{' '}
                                    ~{' '}
                                    {formatShowDeadline(
                                      messageDetail.scheduleChanges?.new
                                        ?.endDate,
                                    )}{' '}
                                    終日
                                  </>
                                ) : (
                                  <>
                                    {formatShowDeadline(
                                      messageDetail.scheduleChanges?.new
                                        ?.startDate,
                                    )}{' '}
                                    {formatHoursAndMinutesForDateTime(
                                      new Date(
                                        messageDetail.scheduleChanges?.new?.startDate,
                                      ),
                                    )}{' '}
                                    ~{' '}
                                    {formatShowDeadline(
                                      messageDetail.scheduleChanges?.new
                                        ?.endDate,
                                    )}{' '}
                                    {formatHoursAndMinutesForDateTime(
                                      new Date(
                                        messageDetail.scheduleChanges?.new?.endDate,
                                      ),
                                    )}
                                  </>
                                )}
                              </p>
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
                      dataMsgDetail={dataMsgDetail}
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
