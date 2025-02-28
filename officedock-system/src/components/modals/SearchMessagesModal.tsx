'use client';
import { Dispatch, SetStateAction, useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';

import AvatarIconWithDynamicColor from '@components/common/AvatarIcon';
import Button from '@components/common/Button';
import ImageRound from '@components/common/ImageRound';
import InputSearch from '@components/common/InputSearch';
import Modal from '@components/common/Modal';

import { MENTION_ALL_MEMBERS, NO_DATA_AVAILABLE } from '@constants';
import { ChatDashboardMember, ChatMessageResponse } from '@interfaces/chat';
import {
  convertToCurrentTimezone,
  formatCheckDate,
  getFormattedDateTime,
} from '@utils/date';
import { HIGHLIGHT_SEARCH_TERM_REGEX } from '@constants/regex';

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
  onSubmit: (searchChatMsg: string, page: number) => void;
  onGotoMessage: (data: { messageId: string | number; chatRoomCode: string }) => void;
  onClose: () => void;
  handleBookmark: (data: { uuid: string; isBookmark: boolean }) => void;
}

export const SearchMessagesModal = ({
  open,
  searchChatMsg,
  searchMessageResults,
  hasMoreSearchResultDetail,
  searchResultsPage,
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

  useEffect(() => {
    const handleScroll = () => {
      const resultsContainer = resultsContainerRef.current;
      if (
        resultsContainer &&
        hasMoreSearchResultDetail &&
        resultsContainer.clientHeight + Math.abs(resultsContainer.scrollTop) ===
          resultsContainer.scrollHeight
      ) {
        const updatedSearchResultsPage = searchResultsPage + 1;
        onSubmit(searchChatMsg, updatedSearchResultsPage);
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
                onSubmit(searchChatMsg, 1);
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
                    {renderAvatar(messageDetail.sender.id)}
                  </div>
                  <div className="flex justify-between !w-full items-start">
                    <div className="w-[88%]">
                      <div className="flex gap-2 font-semibold text-sm pb-2">
                        <p>{messageDetail.sender.fullName} </p>
                        <p className="font-normal text-[10px] truncate max-w-[400px] text-[#77858F]">
                          {messageDetail.sender?.organizations?.name}
                        </p>
                      </div>
                      <p
                        className="text-chat-box font-normal text-sm hover:cursor-pointer -ml-1 p-1 rounded-[5px]"
                        dangerouslySetInnerHTML={{
                          __html: highlightTextSafely(
                            messageDetail.message,
                            searchChatMsg,
                          ),
                        }}></p>
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
                          chatRoomCode: String(messageDetail.chatRoomCode),
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
