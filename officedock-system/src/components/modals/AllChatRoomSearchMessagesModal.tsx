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

import { useRouter, useSearchParams } from 'next/navigation';

import Button from '@components/common/Button';
import InputSearch from '@components/common/InputSearch';
import Modal from '@components/common/Modal';
import Spinner from '@components/common/Spinner';
import { MessageDetailBookmark } from '@components/chat/MessageDetailBookmark';

import { NO_DATA_AVAILABLE } from '@constants';

import {
  ChatDashboardMember,
  ChatFileResponse,
  ChatMessageResponse,
} from '@interfaces/chat';
import { Profile } from '@interfaces/user';

import { LoadingContext } from '@providers/LoadingProvider';
import FilePreview from '@components/custom/FilePreview';
import { ActionTask, ItemStartType } from '@constants/enums';

interface AllChatRoomSearchMessagesModalProps {
  open: boolean;
  isSearchingMessagesRef?: MutableRefObject<boolean>;
  allRoomChatMsgSearch: string;
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
  setRoomNameSearch: Dispatch<SetStateAction<string>>;
  handleConfirmGetDataDetailEvent: (id: string) => void;
  setAllRoomChatMsgSearch: Dispatch<SetStateAction<string>>;
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
  onClose: () => void;
  handleBookmark: (data: { uuid: string; isBookmark: boolean }) => void;
}

export const AllChatRoomSearchMessagesModal = ({
  open,
  isSearchingMessagesRef,
  allRoomChatMsgSearch,
  searchMessageResults,
  hasMoreSearchResultDetail,
  searchResultsPage,
  dashboardMemberList,
  setRoomNameSearch,
  handleConfirmGetDataDetailEvent,
  setSearchMessageResults,
  setSearchResultsPage,
  setAllRoomChatMsgSearch,
  onSubmit,
  onClose,
  handleBookmark,
}: AllChatRoomSearchMessagesModalProps) => {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Params
  const params = new URLSearchParams(searchParams);
  const { isLoading } = useContext(LoadingContext);
  // Preview files
  const [dataPreviewFile, setDataPreviewFile] = useState<{
    msgId: string;
    file: ChatFileResponse;
    user: ChatDashboardMember;
    createAt: string;
  } | null>(null);

  const resultsContainerRef = useRef<HTMLDivElement | null>(null);

  const [dataSearch, setDataSearch] = useState<ChatMessageResponse[]>([]);

  useEffect(() => {
    if (searchMessageResults) {
      setDataSearch(searchMessageResults.results);
    }
  }, [searchMessageResults]);

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
        onSubmit(allRoomChatMsgSearch, updatedSearchResultsPage);
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

  const handleChangeRoom = (data: { roomCode: string; messageId: string }) => {
    onClose();
    const params = new URLSearchParams(searchParams.toString());
    params.set('room', data.roomCode);
    params.set('messageId', data.messageId);

    router.push(`/chat?${params.toString()}`, { scroll: false });
  };

  // Set param
  const handleSetParam = ({
    id,
    action,
  }: {
    id: string | null;
    action: string;
  }) => {
    if (id) {
      params.set('task', id);
    }
    params.set('action', action);
    params.set('type', ItemStartType.TASK);
    router.push(`?${params.toString()}`);
  };

  // Edit task
  const handleActionEditTask = (id: number) => {
    handleSetParam({
      id: `${id}`,
      action: ActionTask.EDIT,
    });
  };

  return (
    <Modal
      open={open}
      isOutSideAction={false}
      className="font-primary !rounded-[20px] text-black !p-0 !w-[1000px] !min-w-[1000px] h-[790px]"
      titleClassName="!text-[14px] !text-[#5B6770] !font-medium"
      headerClassName="bg-[#EBF1F7] !rounded-t-[20px] !rounded-b-none px-5 !py-[10px]"
      closeIconClassName="!bg-white !rounded-full !p-[7px] !hover:cursor-pointer"
      closeClassName="!mt-0 !w-4 !h-4 !hover:cursor-pointer"
      contentClass="!w-[1000px] !rounded-[20px]"
      onClose={() => {
        onClose();
      }}
      title="検索">
      <div className="px-5">
        <div className="flex justify-between items-center mb-5">
          <div className="flex items-center gap-2">
            <InputSearch
              placeholder="チャットルーム内のキーワードを検索"
              className="w-[400px]"
              inputClassName="!py-1 text-[14px] !border-[#77858F] !placeholder-[#BABABA]"
              value={allRoomChatMsgSearch}
              onChange={(e) => setAllRoomChatMsgSearch(e.target.value)}
              onKeyDown={(e: any) => {
                if (e.keyCode == 13 && e.target.value !== '') {
                  setRoomNameSearch(allRoomChatMsgSearch);
                  setSearchMessageResults(undefined);
                  setSearchResultsPage(1);
                  onSubmit(allRoomChatMsgSearch, 1);
                }
              }}
            />
            <Button
              className="!w-[60px] rounded-[6px] h-[36px] !px-[12px] font-medium text-sm"
              disabled={!allRoomChatMsgSearch}
              onClick={() => {
                setRoomNameSearch(allRoomChatMsgSearch);
                setSearchMessageResults(undefined);
                setSearchResultsPage(1);
                onSubmit(allRoomChatMsgSearch, 1);
              }}>
              検索
            </Button>
          </div>
          <div className="flex gap-2 items-center font-medium text-sm">
            <p className="text-[#77858F]">検索結果 AAA</p>
            <p className="text-primary">{searchMessageResults?.count || 0}件</p>
          </div>
        </div>
        <div
          ref={resultsContainerRef}
          className="overflow-y-auto !max-h-[630px] h-[630px] bg-[#F8FAFC] rounded-[6px] py-4">
          {dataSearch.length > 0 ? (
            dataSearch.map((messageDetail, index) => {
              return (
                <div key={messageDetail.uuid}>
                  <MessageDetailBookmark
                    isLastItem={dataSearch.length - 1 === index}
                    isSearchingMessages={true}
                    allRoomChatMsgSearch={allRoomChatMsgSearch}
                    messageDetail={messageDetail}
                    dashboardMemberList={dashboardMemberList}
                    chatRoomInfo={messageDetail.chatRoom}
                    handleConfirmGetDataDetailEvent={
                      handleConfirmGetDataDetailEvent
                    }
                    onGotoMessage={() => {
                      setSearchMessageResults(undefined);
                      setSearchResultsPage(1);
                      handleChangeRoom({
                        roomCode: String(messageDetail.chatRoom?.code),
                        messageId: String(messageDetail.id),
                      });
                    }}
                    onGotoMessageReply={(data: {
                      messageId: string | number;
                      chatRoomCode: string;
                    }) => {
                      handleChangeRoom({
                        roomCode: String(data.messageId),
                        messageId: String(data.messageId),
                      });
                    }}
                    setDataPreviewFile={setDataPreviewFile}
                    handleBookmark={handleBookmark}
                    handleActionEditTask={handleActionEditTask}
                  />
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
          {!isLoading &&
          isSearchingMessagesRef &&
          isSearchingMessagesRef.current ? (
            <Spinner className="!h-fit py-3" iconClassName="h-6 w-6" />
          ) : (
            <></>
          )}
        </div>
        {dataPreviewFile && (
          <FilePreview
            open={dataPreviewFile !== null}
            file={dataPreviewFile.file}
            user={dataPreviewFile.user}
            msgId={dataPreviewFile.msgId}
            createAt={dataPreviewFile.createAt}
            onClose={() => setDataPreviewFile(null)}
            onGotoMessage={(data: {
              messageId: string | number;
              roomCode?: string;
            }) => {
              handleChangeRoom({
                roomCode: String(data.roomCode),
                messageId: String(data.messageId),
              });
              setDataPreviewFile(null);
            }}
          />
        )}
      </div>
    </Modal>
  );
};
