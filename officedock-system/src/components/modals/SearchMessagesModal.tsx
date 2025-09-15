'use client';
import {
  Dispatch,
  MutableRefObject,
  SetStateAction,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import Image from 'next/image';

import { DynamicTooltip } from '@components/tooltip/DynamicTooltip';
import CustomUserAvatar from '@components/common/AvatarIcon/CustomUserAvatar';
import Button from '@components/common/Button';
import ImageRound from '@components/common/ImageRound';
import InputSearch from '@components/common/InputSearch';
import Modal from '@components/common/Modal';

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
  NO_DATA_AVAILABLE,
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

import { ChatMessageResponse } from '@interfaces/chat';
import { Profile } from '@interfaces/user';

import { useSessionCache } from '@providers/SessionCacheProvider';

import {
  convertToCurrentTimezone,
  formatCheckDate,
  getFormattedDateTime,
} from '@utils/date';
import {
  displayRepetitiveEventTime,
  formatWithParagraphTags,
  getFileURL,
  highlightTextSafely,
  renderEventDatetimeInChat,
  renderScheduleChangeInCalendarRoom,
} from '@utils';
import { DELETED_EVENT_TITLE } from '@constants/message';
import { LoadingContext } from '@providers/LoadingProvider';

interface SearchMessagesModalProps {
  open: boolean;
  isSearchingMessagesRef?: MutableRefObject<boolean>;
  searchChatMsg: string;
  dashboardMemberList: Omit<Profile, 'birthday' | 'gender'>[];
  hasMoreSearchResultDetail: boolean;
  searchResultsPage: number;
  searchMessageResults:
    | {
        count: number;
        numPages: number;
        results: ChatMessageResponse[];
        hasNext?: boolean;
      }
    | undefined;
  chatRoomType: string;
  handleConfirmGetDataDetailEvent: (id: string) => void;
  setSearchChatMsg: Dispatch<SetStateAction<string>>;
  setSearchResultsPage: Dispatch<SetStateAction<number>>;
  setSearchMessageResults: (
    value: SetStateAction<
      | {
          count: number;
          numPages: number;
          results: ChatMessageResponse[];
          hasNext?: boolean;
        }
      | undefined
    >,
  ) => void;
  onSubmit: (searchChatMsg: string, page: number, roomType: string) => void;
  onGotoMessage: (data: {
    messageId: string | number;
    chatRoomCode: string;
  }) => void;
  onClose: () => void;
  handleBookmark: (data: { uuid: string; isBookmark: boolean }) => void;
}

export const SearchMessagesModal = ({
  open,
  isSearchingMessagesRef,
  searchChatMsg,
  searchMessageResults,
  hasMoreSearchResultDetail,
  searchResultsPage,
  chatRoomType,
  dashboardMemberList,
  handleConfirmGetDataDetailEvent,
  setSearchMessageResults,
  setSearchResultsPage,
  setSearchChatMsg,
  onGotoMessage,
  onSubmit,
  onClose,
  handleBookmark,
}: SearchMessagesModalProps) => {
  const { data: session } = useSessionCache();
  const router = useRouter();
  const { isLoading } = useContext(LoadingContext);

  const resultsContainerRef = useRef<HTMLDivElement | null>(null);

  const [dataSearch, setDataSearch] = useState<ChatMessageResponse[]>([]);

  useEffect(() => {
    if (searchMessageResults) {
      setDataSearch(searchMessageResults.results);
    }
  }, [searchMessageResults]);

  const renderAvatar = (senderId: number) => {
    const memberInfo = dashboardMemberList.find(
      (member) => member.id === senderId,
    );

    return (
      <div className="h-6">
        <CustomUserAvatar
          avatarUrl={memberInfo?.avatar || ''}
          avatarColor={memberInfo?.avatarColor || ''}
          size={33}
        />
      </div>
    );
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
            <p className="text-primary font-medium text-sm max-w-full break-all">
              {highlightTitleBySearchTerm(skillName, searchChatMsg)}{' '}
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
              {highlightTitleBySearchTerm(skillName, searchChatMsg)}{' '}
              <span className="text-black text-sm font-normal">
                のレベルアップの申請についてコメントが届いています。
              </span>
            </p>
          </div>
        );
      }
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      const resultsContainer = resultsContainerRef.current;
      if (
        resultsContainer &&
        hasMoreSearchResultDetail &&
        searchResultsPage + 1 <= Number(searchMessageResults?.numPages) &&
        Math.round(
          resultsContainer.clientHeight + Math.abs(resultsContainer.scrollTop),
        ) >=
          0.9 * resultsContainer.scrollHeight
      ) {
        if (isSearchingMessagesRef && isSearchingMessagesRef.current) return;
        const updatedSearchResultsPage = searchResultsPage + 1;
        onSubmit(
          searchChatMsg,
          updatedSearchResultsPage,
          chatRoomType == ChatRoomType.CALENDAR ||
            chatRoomType == ChatRoomType.SKILL ||
            chatRoomType == ChatRoomType.TASK
            ? chatRoomType || ''
            : '',
        );
        setSearchResultsPage((prev) => prev + 1);
      }
    };

    const resultsContainer = resultsContainerRef.current;

    if (resultsContainer) {
      resultsContainer.addEventListener('scroll', handleScroll);
    }

    return () => {
      if (resultsContainer) {
        resultsContainer.removeEventListener('scroll', handleScroll);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    hasMoreSearchResultDetail,
    searchResultsPage,
    isSearchingMessagesRef,
    searchMessageResults,
  ]);

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

  return (
    <Modal
      open={open}
      isOutSideAction={false}
      className="font-primary !rounded-[20px] text-gray-700 !p-0 !w-[800px] !min-w-[800px] h-[790px]"
      titleClassName="!text-[14px] !text-[#5B6770] !font-medium"
      headerClassName="bg-[#EBF1F7] !rounded-t-[20px] !rounded-b-none px-6 py-4"
      closeIconClassName="!bg-white !rounded-full !p-2 !hover:cursor-pointer !shadow-sm"
      closeClassName="!mt-0 opacity-70 !w-4 !h-4 !hover:cursor-pointer"
      contentClass="!w-[800px] !rounded-[20px]"
      onClose={() => {
        onClose();
      }}
      title="検索">
      <div className="px-6">
        <div className="flex justify-between items-center mb-5">
          <div className="flex items-center gap-2">
            <InputSearch
              placeholder="チャットルーム内のキーワードを検索"
              className="w-[400px]"
              inputClassName="!py-1 text-[14px] !border-[#77858F]"
              value={searchChatMsg}
              onChange={(e) => setSearchChatMsg(e.target.value)}
              onKeyDown={(e: any) => {
                if (e.keyCode == 13 && e.target.value !== '') {
                  setSearchMessageResults(undefined);
                  setSearchResultsPage(1);
                  onSubmit(
                    searchChatMsg,
                    1,
                    chatRoomType == ChatRoomType.CALENDAR ||
                      chatRoomType == ChatRoomType.SKILL ||
                      chatRoomType == ChatRoomType.TASK
                      ? chatRoomType || ''
                      : '',
                  );
                }
              }}
            />
            <Button
              className="!w-[60px] rounded-[6px] h-[36px] !px-[12px] font-medium text-sm"
              disabled={!searchChatMsg}
              onClick={() => {
                setSearchMessageResults(undefined);
                setSearchResultsPage(1);
                onSubmit(
                  searchChatMsg,
                  1,
                  chatRoomType == ChatRoomType.CALENDAR ||
                    chatRoomType == ChatRoomType.SKILL ||
                    chatRoomType == ChatRoomType.TASK
                    ? chatRoomType || ''
                    : '',
                );
              }}>
              検索
            </Button>
          </div>
          <div className="flex gap-2 items-center font-medium text-sm">
            <p className="text-[#77858F]">検索結果</p>
            <p className="text-primary">{searchMessageResults?.count || 0}件</p>
          </div>
        </div>
        <div
          ref={resultsContainerRef}
          className="overflow-y-auto !max-h-[630px] h-[630px] bg-[#F8FAFC]">
          {dataSearch.length > 0 ? (
            dataSearch.map((messageDetail) => {
              return (
                <div
                  key={messageDetail.id}
                  className="flex gap-2 items-start group relative border-b-[1px] hover:bg-white hover:cursor-pointer border-[#D2DBE1] py-5 px-2">
                  <div className="">
                    {chatRoomType === ChatRoomType.TASK ||
                    (chatRoomType == ChatRoomType.BOOKMARK &&
                      messageDetail.chatRoom?.type == ChatRoomType.TASK) ? (
                      messageDetail.type !== MessageType.MESSAGE ? (
                        <ImageRound
                          className="w-10 h-10"
                          src="/icons/document.svg"
                          border="full"
                          name="Task"
                        />
                      ) : (
                        <div>{renderAvatar(messageDetail.sender.id)}</div>
                      )
                    ) : (
                      renderAvatar(messageDetail.sender.id)
                    )}
                  </div>
                  <div className="flex justify-between !w-full items-baseline">
                    <div className="w-[88%]">
                      <div className="flex items-baseline gap-2 font-semibold text-sm pb-2 pr-2">
                        <p className="max-w-full break-all line-clamp-3">
                          {chatRoomType === ChatRoomType.TASK ||
                          (chatRoomType == ChatRoomType.BOOKMARK &&
                            messageDetail.chatRoom?.type ==
                              ChatRoomType.TASK) ? (
                            messageDetail.type !== MessageType.MESSAGE ? (
                              'タスクカード'
                            ) : (
                              <div>{messageDetail.sender.fullName}</div>
                            )
                          ) : (
                            messageDetail.sender.fullName
                          )}{' '}
                          <span className="font-normal text-[10px] text-[#77858F]">
                            {chatRoomType != ChatRoomType.TASK &&
                              !(
                                chatRoomType == ChatRoomType.BOOKMARK &&
                                messageDetail.chatRoom?.type ==
                                  ChatRoomType.TASK
                              ) &&
                              messageDetail.sender?.organizations?.name}
                          </span>
                        </p>

                        {messageDetail.isBookmark && (
                          <ImageRound
                            name="Book mark"
                            src={`/icons/save-active.svg`}
                            className="w-[10px] h-[12px] hover:cursor-pointer"
                          />
                        )}
                      </div>
                      {(chatRoomType === ChatRoomType.PRIVATE ||
                        chatRoomType === ChatRoomType.GROUP ||
                        chatRoomType === ChatRoomType.SELF ||
                        (chatRoomType == ChatRoomType.BOOKMARK &&
                          messageDetail.chatRoom?.type ==
                            ChatRoomType.PRIVATE) ||
                        (chatRoomType == ChatRoomType.BOOKMARK &&
                          messageDetail.chatRoom?.type == ChatRoomType.GROUP) ||
                        (chatRoomType == ChatRoomType.BOOKMARK &&
                          messageDetail.chatRoom?.type ==
                            ChatRoomType.SELF)) && (
                        <div className="flex flex-col">
                          {messageDetail.deletedAt ? (
                            <p
                              className={`font-normal text-sm hover:cursor-pointer -ml-1 p-1 rounded-[5px] text-gray-600 italic bg-[#f0f1f1] w-[220px]`}>
                              {MESSAGE_DELETED}
                            </p>
                          ) : (
                            <div>
                              {messageDetail.type === MessageType.MESSAGE && (
                                <div className="break-words">
                                  {processMessage(
                                    highlightTextSafely(
                                      messageDetail.message,
                                      searchChatMsg,
                                      session?.user.profile.fullName || '',
                                    ),
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
                                              <div className="bg-white border-[#D2DBE1] border-[1px] rounded-[6px] p-[14px] flex gap-2 items-center !w-[calc(100%)]">
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
                                                      width={150}
                                                      height={100}
                                                    />
                                                  </div>
                                                )}
                                                <p
                                                  className={`text-primary font-medium text-[14px] break-words break-all max-w-full ${
                                                    file.fileType.includes(
                                                      'image',
                                                    )
                                                      ? 'max-w-[calc(100%_-_200px)]'
                                                      : 'max-w-[calc(100%)]'
                                                  }`}>
                                                  {file.fileName}
                                                </p>
                                              </div>
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
                                    <div
                                      className={`flex flex-col items-start`}>
                                      <p className="w-fit font-semibold text-black">
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
                                      <p className="font-semibold mt-2">
                                        参加者
                                      </p>
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
                              {messageDetail.type ===
                                MessageType.EDIT_SCHEDULE && (
                                <div className={`w-full flex justify-start`}>
                                  <div
                                    className={`text-xs font-normal bg-[#eaf8ff] !w-[100%] p-4 `}>
                                    <div
                                      className={`flex flex-col items-start`}>
                                      <p className="w-fit font-semibold text-black">
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
                                                    messageDetail
                                                      .scheduleChanges
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
                                            {messageDetail.scheduleChanges
                                              ?.old &&
                                              (messageDetail.scheduleChanges
                                                ?.old.repeatType ==
                                              TaskRepetitiveValue.ONCE
                                                ? renderEventDatetimeInChat(
                                                    messageDetail
                                                      .scheduleChanges?.old,
                                                  )
                                                : displayRepetitiveEventTime(
                                                    messageDetail
                                                      .scheduleChanges?.old,
                                                  ))}
                                            {')'}
                                          </p>
                                        )}
                                      </div>
                                      <p className="font-semibold mt-2">
                                        参加者
                                      </p>
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
                                    <div
                                      className={`flex flex-col items-start`}>
                                      <p className="max-w-full break-all font-semibold text-black">
                                        {messageDetail.sender.fullName}{' '}
                                        {EVENT_CREATED}
                                      </p>
                                      <p className="font-semibold mt-2">日時</p>
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
                                      <p className="font-semibold mt-2">
                                        参加者
                                      </p>
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
                              {(messageDetail.type ===
                                MessageType.CREATION_TASK ||
                                messageDetail.type ===
                                  MessageType.REMOVE_MEMBER_TASK ||
                                messageDetail.type ===
                                  MessageType.ADD_MEMBER_TASK) &&
                                (messageDetail.task ? (
                                  <div className={`w-full flex justify-start`}>
                                    <div
                                      className={`text-xs font-normal bg-[#eaf8ff] w-[750px] p-4 `}>
                                      <div
                                        className={`flex flex-col items-start`}>
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
                                          {highlightTitleBySearchTerm(
                                            messageDetail.task.title ||
                                              NO_SETTING,
                                            searchChatMsg,
                                          )}
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
                                      <div
                                        className={`flex flex-col items-start`}>
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
                      )}
                      {(chatRoomType === ChatRoomType.TASK ||
                        (chatRoomType == ChatRoomType.BOOKMARK &&
                          messageDetail.chatRoom?.type ==
                            ChatRoomType.TASK)) && (
                        <div className="flex flex-col">
                          {messageDetail.deletedAt ? (
                            <p
                              className={`font-normal text-sm hover:cursor-pointer -ml-1 p-1 rounded-[5px] text-gray-600 italic bg-[#f0f1f1] w-[220px]`}>
                              {MESSAGE_DELETED}
                            </p>
                          ) : (
                            <div>
                              {messageDetail.type === MessageType.MESSAGE &&
                                processMessage(
                                  highlightTextSafely(
                                    messageDetail.message,
                                    searchChatMsg,
                                    session?.user.profile.fullName || '',
                                  ),
                                  messageDetail.mentions || [],
                                )}
                              {messageDetail.type !== MessageType.MESSAGE &&
                                (messageDetail.task ? (
                                  <div className={`w-full flex justify-start`}>
                                    <div
                                      className={`text-xs font-normal bg-[#eaf8ff] w-[650px] p-4`}>
                                      <div
                                        className={`flex flex-col items-start`}>
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
                                          {highlightTitleBySearchTerm(
                                            messageDetail.task.title ||
                                              NO_SETTING,
                                            searchChatMsg,
                                          )}
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
                                      <div
                                        className={`flex flex-col items-end`}>
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
                      )}
                      {(chatRoomType === ChatRoomType.SKILL ||
                        (chatRoomType == ChatRoomType.BOOKMARK &&
                          messageDetail.chatRoom?.type ==
                            ChatRoomType.SKILL)) && (
                        <div className="flex flex-col">
                          {messageDetail.deletedAt ||
                          (!messageDetail.submitLevel &&
                            !messageDetail.message) ? (
                            <p
                              className={`font-normal text-sm hover:cursor-pointer -ml-1 p-1 rounded-[5px] text-gray-600 italic bg-[#f0f1f1] w-[220px]`}>
                              {messageDetail.type == MessageType.MESSAGE
                                ? MESSAGE_DELETED
                                : DELETED_SKILL_UP_MESSAGE}
                            </p>
                          ) : (
                            <div>
                              {messageDetail.type === MessageType.MESSAGE &&
                                processMessage(
                                  highlightTextSafely(
                                    messageDetail.message,
                                    searchChatMsg,
                                    session?.user.profile.fullName || '',
                                  ),
                                  messageDetail.mentions || [],
                                )}
                              {messageDetail.type !== MessageType.MESSAGE && (
                                <div className="w-full flex justify-start">
                                  <div
                                    className={`text-xs font-normal !w-[100%] `}>
                                    <div className={`flex gap-5 items-center`}>
                                      <h4 className="text-sm w-fit text-black h-5">
                                        {renderSubmitLevelMessage(
                                          messageDetail.type,
                                          messageDetail.submitLevel?.status ||
                                            '',
                                          messageDetail.submitLevel?.skill
                                            ?.name || '',
                                        )}
                                      </h4>
                                      <Button
                                        className="!text-black !font-medium !text-xs !bg-[#CED8DE] !rounded-[100px] !w-[86px] !h-[30px] !px-0"
                                        onClick={() => {
                                          router.push(
                                            pageRouters.LEVEL_UP_TEAM.href,
                                          );
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
                      )}
                      {(chatRoomType === ChatRoomType.CALENDAR ||
                        (chatRoomType == ChatRoomType.BOOKMARK &&
                          messageDetail.chatRoom?.type ==
                            ChatRoomType.CALENDAR)) && (
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
                              {highlightTitleBySearchTerm(
                                messageDetail.schedule
                                  ? messageDetail.schedule?.title
                                  : DELETED_EVENT_TITLE,
                                searchChatMsg,
                              )}
                            </p>
                          </div>
                          <div className="flex gap-1 text-sm font-medium">
                            <p className="text-primary max-w-full break-all">
                              {messageDetail.sender.fullName}{' '}
                              <span className="text-black">
                                {messageDetail.type ===
                                MessageType.REMOVE_SCHEDULE
                                  ? EVENT_DELETED
                                  : messageDetail.type ===
                                      MessageType.EDIT_SCHEDULE
                                    ? EVENT_EDITED
                                    : EVENT_CREATED}
                              </span>
                            </p>
                          </div>
                          <div className="text-[#5B6770] font-normal text-sm">
                            <p>
                              {messageDetail.scheduleChanges?.new &&
                                (messageDetail.scheduleChanges?.new
                                  .repeatType == TaskRepetitiveValue.ONCE
                                  ? renderScheduleChangeInCalendarRoom(
                                      messageDetail,
                                    )
                                  : displayRepetitiveEventTime(
                                      messageDetail.scheduleChanges?.new,
                                    ))}
                            </p>
                          </div>
                          {processMessage(
                            highlightTextSafely(
                              messageDetail.message,
                              searchChatMsg,
                              session?.user.profile.fullName || '',
                            ),
                            messageDetail.mentions || [],
                          )}
                        </div>
                      )}
                    </div>

                    <p className="font-medium text-xs w-[12%] text-[#77858F]">
                      {messageDetail.createdAt &&
                        formatCheckDate(
                          getFormattedDateTime(
                            convertToCurrentTimezone(messageDetail.createdAt),
                          ),
                        )}
                    </p>
                  </div>
                  <div className="bg-white group-hover:flex hidden rounded-3xl px-3 py-1.5 shadow-md absolute left-1/2 -bottom-4 transform -translate-x-1/2 items-center gap-2">
                    <DynamicTooltip
                      content={'メッセージに移動'}
                      placement="top">
                      <div
                        className="bg-[#f0f1f1] hover:bg-[#dbdbdb] rounded-full p-[7px] hover:cursor-pointer"
                        onClick={() => {
                          setSearchMessageResults(undefined);
                          setSearchResultsPage(1);
                          onGotoMessage({
                            messageId: Number(messageDetail.id),
                            chatRoomCode: String(messageDetail.chatRoom?.code),
                          });
                        }}>
                        <ImageRound
                          name="Go to message"
                          src={'/icons/go-to-message.svg'}
                          className="w-[15px] h-[13px] hover:cursor-pointer"
                        />
                      </div>
                    </DynamicTooltip>
                    <DynamicTooltip
                      content={
                        messageDetail.isBookmark
                          ? 'ブックマークを外す'
                          : 'ブックマーク'
                      }
                      placement="top">
                      <div
                        onClick={() => {
                          handleBookmark({
                            uuid: messageDetail.uuid,
                            isBookmark: !messageDetail.isBookmark,
                          });
                        }}
                        className="bg-[#f0f1f1] hover:bg-[#dbdbdb] rounded-full p-[7px] hover:cursor-pointer">
                        <ImageRound
                          name="Book mark"
                          src={`/icons/${messageDetail.isBookmark ? 'save-active.svg' : 'save-chat.svg'}`}
                          className="w-[10px] h-[12px] hover:cursor-pointer"
                        />
                      </div>
                    </DynamicTooltip>
                  </div>
                </div>
              );
            })
          ) : !isLoading ? (
            <p className="text-sm text-center text-[#77858F]">
              {NO_DATA_AVAILABLE}
            </p>
          ) : (
            <></>
          )}
        </div>
      </div>
    </Modal>
  );
};
