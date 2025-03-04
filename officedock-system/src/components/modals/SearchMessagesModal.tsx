'use client';
import { Dispatch, SetStateAction, useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { format, isSameDay } from 'date-fns';
import Image from 'next/image';

import AvatarIconWithDynamicColor from '@components/common/AvatarIcon';
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
import { HIGHLIGHT_SEARCH_TERM_REGEX } from '@constants/regex';
import { ChatRoomType, MessageType, SubmitLevelStatus } from '@constants/enums';
import { pageRouters } from '@constants/routers';

import {
  ChatDashboardMember,
  ChatMessageResponse,
  ChatRoomDetail,
} from '@interfaces/chat';
import {
  convertToCurrentTimezone,
  convertToTimeString,
  formatCheckDate,
  formatHoursAndMinutesForDateTime,
  formatShowDeadline,
  getFormattedDateTime,
  getJapaneseDayName,
} from '@utils/date';
import { formatWithParagraphTags, getChatFileURL } from '@utils';

interface SearchMessagesModalProps {
  open: boolean;
  searchChatMsg: string;
  dashboardMembers: ChatDashboardMember[];
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
  chatRoomDetail: ChatRoomDetail | undefined;
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
  searchChatMsg,
  searchMessageResults,
  hasMoreSearchResultDetail,
  searchResultsPage,
  chatRoomDetail,
  handleConfirmGetDataDetailEvent,
  setSearchMessageResults,
  setSearchResultsPage,
  setSearchChatMsg,
  dashboardMembers,
  onGotoMessage,
  onSubmit,
  onClose,
  handleBookmark,
}: SearchMessagesModalProps) => {
  const { data: session } = useSession();
  const router = useRouter();

  const resultsContainerRef = useRef<HTMLDivElement | null>(null);

  const [dataSearch, setDataSearch] = useState<ChatMessageResponse[]>([]);

  useEffect(() => {
    if (searchMessageResults) {
      setDataSearch(searchMessageResults.results);
    }
  }, [searchMessageResults]);

  const renderAvatar = (senderId: number) => {
    const avatarColor =
      dashboardMembers.find((member) => member.id === senderId)?.avatarColor ||
      '';

    return (
      <div className="h-6">
        {AvatarIconWithDynamicColor({
          color: avatarColor,
          size: 33,
        })}
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
            <p className="text-[#0068B6] font-medium text-sm">
              {highlightTitleBySearchTerm(skillName, searchChatMsg)}
            </p>
            <p className="text-black text-sm">
              のスキルがレベルアップしました！
            </p>
          </div>
        );
      } else {
        return (
          <div className="flex gap-2">
            <p className="text-[#0068B6] font-medium text-sm">
              {highlightTitleBySearchTerm(skillName, searchChatMsg)}
            </p>
            <p className="text-black text-sm">
              のレベルアップの申請についてコメントが届いています。
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
        Math.round(
          resultsContainer.clientHeight + Math.abs(resultsContainer.scrollTop),
        ) === resultsContainer.scrollHeight
      ) {
        const updatedSearchResultsPage = searchResultsPage + 1;
        onSubmit(
          searchChatMsg,
          updatedSearchResultsPage,
          chatRoomDetail?.type == ChatRoomType.CALENDAR ||
            chatRoomDetail?.type == ChatRoomType.SKILL ||
            chatRoomDetail?.type == ChatRoomType.TASK
            ? chatRoomDetail?.type || ''
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
  }, [hasMoreSearchResultDetail, searchResultsPage]);

  const highlightTextSafely = (htmlString: string, term: string) => {
    const escapedTerm = term.replace(HIGHLIGHT_SEARCH_TERM_REGEX, '\\$&');
    const regex = new RegExp(escapedTerm, 'gi');

    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, 'text/html');

    const processNode = (node: Node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        if (node.textContent) {
          node.textContent = node.textContent?.replace(
            regex,
            (match) => `[[HIGHLIGHT]]${match}[[/HIGHLIGHT]]`,
          );
        }
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as HTMLElement;

        if (element.classList.contains('mention')) {
          const mentionName = element.textContent?.trim() || '';

          if (
            mentionName == `@${session?.user.profile.fullName}` ||
            mentionName == `@${MENTION_ALL_MEMBERS}`
          ) {
            element.classList.remove('text-[#0068B6]');
            element.classList.add('text-[#0068B7]');
          } else {
            element.classList.remove('text-[#0068B6]');
            element.classList.add('text-[#77858F]');
          }
        }
        node.childNodes.forEach(processNode);
      }
    };

    doc.body.childNodes.forEach(processNode);

    const processedHTML = doc.body.innerHTML.replace(
      /\[\[HIGHLIGHT\]\](.*?)\[\[\/HIGHLIGHT\]\]/g,
      `<mark class="bg-[#0068B633]">$1</mark>`,
    );

    return processedHTML;
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

  return (
    <Modal
      open={open}
      isOutSideAction={false}
      className="font-primary !rounded-xl text-gray-700 !p-0 !w-[800px] !min-w-[800px] h-[790px]"
      titleClassName="!text-[14px] !text-[#5B6770] !font-medium"
      headerClassName="bg-[#EBF1F7] !rounded-t-xl !rounded-b-none px-6 py-4"
      closeIconClassName="!bg-white !rounded-full !p-2 !hover:cursor-pointer !shadow-sm"
      closeClassName="!mt-0 opacity-70 !w-4 !h-4 !hover:cursor-pointer"
      contentClass="!w-[800px]"
      onClose={() => {
        onClose();
      }}
      title="検索">
      <div className="px-6">
        <div className="flex justify-between items-center mb-5">
          <div className="flex items-center gap-2">
            <InputSearch
              placeholder="名前を検索"
              className="w-[400px]"
              inputClassName="!py-1 text-[14px] !border-[#77858F]"
              value={searchChatMsg}
              onChange={(e) => setSearchChatMsg(e.target.value)}
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
                  chatRoomDetail?.type == ChatRoomType.CALENDAR ||
                    chatRoomDetail?.type == ChatRoomType.SKILL ||
                    chatRoomDetail?.type == ChatRoomType.TASK
                    ? chatRoomDetail?.type || ''
                    : '',
                );
              }}>
              検索
            </Button>
          </div>
          <div className="flex gap-2 items-center font-medium text-sm">
            <p className="text-[#77858F]">検索結果</p>
            <p className="text-[#0068B6]">
              {searchMessageResults?.count || 0}件
            </p>
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
                    {chatRoomDetail?.type === ChatRoomType.TASK ? (
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
                  <div className="flex justify-between !w-full items-start">
                    <div className="w-[88%]">
                      <div className="flex items-center gap-2 font-semibold text-sm pb-2">
                        <p>
                          {chatRoomDetail?.type === ChatRoomType.TASK ? (
                            messageDetail.type !== MessageType.MESSAGE ? (
                              'タスクカード'
                            ) : (
                              <div>{messageDetail.sender.fullName}</div>
                            )
                          ) : (
                            messageDetail.sender.fullName
                          )}{' '}
                        </p>
                        <p className="font-normal text-[10px] truncate max-w-[400px] text-[#77858F]">
                          {chatRoomDetail?.type != ChatRoomType.TASK && messageDetail.sender?.organizations?.name}
                        </p>
                        {messageDetail.isBookmark && (
                          <ImageRound
                            name="Book mark"
                            src={`/icons/${messageDetail.isBookmark ? 'save-active.svg' : 'save-chat.svg'}`}
                            className="w-[10px] h-[12px] hover:cursor-pointer"
                          />
                        )}
                      </div>
                      {(chatRoomDetail?.type === ChatRoomType.PRIVATE ||
                        chatRoomDetail?.type === ChatRoomType.GROUP ||
                        chatRoomDetail?.type === ChatRoomType.SELF) && (
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
                                  <p
                                    className="text-chat-box font-normal text-sm hover:cursor-pointer -ml-1 p-1 rounded-[5px]"
                                    dangerouslySetInnerHTML={{
                                      __html: highlightTextSafely(
                                        messageDetail.message,
                                        searchChatMsg,
                                      ),
                                    }}></p>
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
                                                messageDetail.scheduleChanges
                                                  ?.new.endDate as string,
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
                                      <p className="font-semibold mt-2">
                                        参加者
                                      </p>
                                      <p>
                                        {
                                          messageDetail.scheduleChanges?.participants?.find(
                                            (participant) =>
                                              participant.isCreator,
                                          )?.name
                                        }{' '}
                                        {messageDetail.scheduleChanges?.participants?.find(
                                          (participant) =>
                                            participant.isCreator,
                                        ) && '-主催者'}
                                      </p>
                                      {messageDetail.scheduleChanges?.participants?.find(
                                        (participant) => participant.isCreator,
                                      )
                                        ? messageDetail.scheduleChanges?.participants
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
                                        : messageDetail.scheduleChanges?.participants
                                            ?.slice(0, 4)
                                            .map((participant) => (
                                              <p key={participant.id}>
                                                {participant.name}{' '}
                                              </p>
                                            ))}
                                      {messageDetail.scheduleChanges
                                        ?.participants &&
                                        messageDetail.scheduleChanges
                                          ?.participants?.length > 4 && (
                                          <p>その他</p>
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
                                MessageType.EDIT_SCHEDULE && (
                                <div className={`w-full flex justify-start`}>
                                  <div
                                    className={`text-xs font-normal bg-[#eaf8ff] !w-[100%] p-4 `}>
                                    <div
                                      className={`flex flex-col items-start`}>
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
                                                messageDetail.scheduleChanges
                                                  ?.new.startDate as string,
                                                DATE_FORMAT,
                                              ),
                                            ) !==
                                              String(
                                                format(
                                                  messageDetail.scheduleChanges
                                                    ?.new.endDate as string,
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
                                            {messageDetail.scheduleChanges
                                              ?.old &&
                                              `${format(
                                                messageDetail.scheduleChanges
                                                  ?.old.startDate as string,
                                                DATE_FORMAT,
                                              )}(${getJapaneseDayName(
                                                messageDetail.scheduleChanges
                                                  ?.old.startDate as string,
                                              )})`}{' '}
                                            {messageDetail.scheduleChanges
                                              ?.old &&
                                              convertToTimeString(
                                                `${messageDetail.scheduleChanges?.old.startDate}`,
                                              )}{' '}
                                            ~{' '}
                                            {messageDetail.scheduleChanges
                                              ?.old &&
                                              String(
                                                format(
                                                  messageDetail.scheduleChanges
                                                    ?.old.startDate as string,
                                                  DATE_FORMAT,
                                                ),
                                              ) !==
                                                String(
                                                  format(
                                                    messageDetail
                                                      .scheduleChanges?.old
                                                      .endDate as string,
                                                    DATE_FORMAT,
                                                  ),
                                                ) &&
                                              `${format(
                                                messageDetail.scheduleChanges
                                                  ?.old.endDate as string,
                                                DATE_FORMAT,
                                              )}(${getJapaneseDayName(
                                                messageDetail.scheduleChanges
                                                  ?.old.endDate as string,
                                              )})`}{' '}
                                            {messageDetail.scheduleChanges
                                              ?.old &&
                                              convertToTimeString(
                                                `${messageDetail.scheduleChanges?.old.endDate}`,
                                              )}
                                            {')'}
                                          </p>
                                        )}
                                      </div>
                                      <p className="font-semibold mt-2">
                                        参加者
                                      </p>
                                      <p>
                                        {
                                          messageDetail.scheduleChanges?.participants?.find(
                                            (participant) =>
                                              participant.isCreator,
                                          )?.name
                                        }{' '}
                                        {messageDetail.scheduleChanges?.participants?.find(
                                          (participant) =>
                                            participant.isCreator,
                                        ) && '-主催者'}
                                      </p>
                                      {messageDetail.scheduleChanges?.participants?.find(
                                        (participant) => participant.isCreator,
                                      )
                                        ? messageDetail.scheduleChanges?.participants
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
                                        : messageDetail.scheduleChanges?.participants
                                            ?.slice(0, 4)
                                            .map((participant) => (
                                              <p key={participant.id}>
                                                {participant.name}{' '}
                                              </p>
                                            ))}
                                      {messageDetail.scheduleChanges
                                        ?.participants &&
                                        messageDetail.scheduleChanges
                                          ?.participants?.length > 4 && (
                                          <p>その他</p>
                                        )}
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
                                                messageDetail.scheduleChanges
                                                  ?.new.endDate as string,
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
                                      <p className="font-semibold mt-2">
                                        参加者
                                      </p>
                                      <p>
                                        {
                                          messageDetail.scheduleChanges?.participants?.find(
                                            (participant) =>
                                              participant.isCreator,
                                          )?.name
                                        }{' '}
                                        {messageDetail.scheduleChanges?.participants?.find(
                                          (participant) =>
                                            participant.isCreator,
                                        ) && '-主催者'}
                                      </p>
                                      {messageDetail.scheduleChanges?.participants?.find(
                                        (participant) => participant.isCreator,
                                      )
                                        ? messageDetail.scheduleChanges?.participants
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
                                        : messageDetail.scheduleChanges?.participants
                                            ?.slice(0, 4)
                                            .map((participant) => (
                                              <p key={participant.id}>
                                                {participant.name}{' '}
                                              </p>
                                            ))}
                                      {messageDetail.scheduleChanges
                                        ?.participants &&
                                        messageDetail.scheduleChanges
                                          ?.participants?.length > 4 && (
                                          <p>その他</p>
                                        )}
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
                                          {messageDetail.task.title ||
                                            NO_SETTING}
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
                      {chatRoomDetail?.type === ChatRoomType.TASK && (
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
                                  className={`text-chat-box font-normal text-sm hover:cursor-pointer max-w-[700px] -ml-1 p-1 rounded-[5px]  `}
                                  dangerouslySetInnerHTML={{
                                    __html: messageDetail.message,
                                  }}></p>
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
                      {chatRoomDetail?.type === ChatRoomType.SKILL && (
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
                              {messageDetail.type === MessageType.MESSAGE && (
                                <p
                                  className="text-chat-box font-normal text-sm hover:cursor-pointer -ml-1 p-1 rounded-[5px]"
                                  dangerouslySetInnerHTML={{
                                    __html: highlightTextSafely(
                                      messageDetail.message,
                                      searchChatMsg,
                                    ),
                                  }}></p>
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
                      )}
                      {chatRoomDetail?.type === ChatRoomType.CALENDAR && (
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
                              {highlightTitleBySearchTerm(
                                messageDetail.schedule?.title || '',
                                searchChatMsg,
                              )}
                            </p>
                          </div>
                          <div className="flex gap-1 text-sm font-medium">
                            <p className="text-[#0068B6]">
                              {messageDetail.sender.fullName}
                            </p>
                            <p>
                              {messageDetail.type ===
                              MessageType.REMOVE_SCHEDULE
                                ? EVENT_DELETED
                                : messageDetail.type ===
                                    MessageType.EDIT_SCHEDULE
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
                                      messageDetail.scheduleChanges?.new
                                        ?.startDate,
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
                          <p
                            className="text-chat-box font-normal text-sm hover:cursor-pointer -ml-1 p-1 rounded-[5px]"
                            dangerouslySetInnerHTML={{
                              __html: highlightTextSafely(
                                messageDetail.message || '',
                                searchChatMsg,
                              ),
                            }}></p>
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
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-sm text-center text-[#77858F]">
              {NO_DATA_AVAILABLE}
            </p>
          )}
        </div>
      </div>
    </Modal>
  );
};
