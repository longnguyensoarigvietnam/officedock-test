import { useSessionCache } from '@providers/SessionCacheProvider';

import React, { useContext, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation } from 'react-query';
import { AxiosError } from 'axios';

import EventActionTypeModal from '@components/modals/EventActionTypeModal';
import ConfirmActionsEventModal from '@components/modals/ConfirmActionsEventModal';
import InputSearch from '@components/common/InputSearch';
import ImageRound from '@components/common/ImageRound';
import ActionsEventModal from '@components/modals/ActionsEventModal';
import { MessageDetailBookmark } from '@components/chat/MessageDetailBookmark';
import RowSkeleton from '@components/skeleton/RowSkeleton';
import { SearchMessagesModal } from '@components/modals/SearchMessagesModal';
import FilePreview from '@components/custom/FilePreview';

import { apiRouters } from '@constants/routers';
import {
  ActionsEvent,
  ActionTask,
  ChatRoomType,
  EventActionType,
  EventWorkCategory,
  ItemStartType,
  PermissionsSystem,
  ServerStatusCode,
  TaskRepetitiveValue,
} from '@constants/enums';
import {
  DEFAULT_END_TIME,
  DEFAULT_START_TIME,
  NO_SETTING,
  PAGINATION_PAGE_SIZE_MEDIUM,
} from '@constants';
import {
  ERROR_DELETE_MESSAGE,
  ERROR_NOT_FOUND_EVENT,
  ERROR_UPDATE_MESSAGE,
  SUCCESS_DELETE_MESSAGE,
  SUCCESS_UPDATE_MESSAGE,
} from '@constants/message';

import { useErrorToast } from '@hooks/useErrorToast';
import useBookMarkList from '@hooks/useBookMarkList';

import {
  ChatDashboardMember,
  ChatFileResponse,
  ChatMessageResponse,
} from '@interfaces/chat';
import { Profile } from '@interfaces/user';
import { BasePagination, OptionDropdownType } from '@interfaces/common';
import { EventEditFormData, EventRequest } from '@interfaces/calendar';

import { hasPermissionInArray } from '@utils';
import { addTimeToDate } from '@utils/date';

import { LoadingContext } from '@providers/LoadingProvider';
import { useToast } from '@providers/ToastProvider';

import api from '@base/api';

interface BookmarkListProps {
  searchChatMsg: string;
  dashboardMemberList: Omit<Profile, 'birthday' | 'gender'>[];
  setSearchChatMsg: React.Dispatch<React.SetStateAction<string>>;
}

const BookmarkList = ({
  searchChatMsg,
  dashboardMemberList,
  setSearchChatMsg,
}: BookmarkListProps) => {
  const chatContainerRef = useRef<HTMLDivElement | null>(null);

  const { data: session } = useSessionCache();
  const { setIsLoading } = useContext(LoadingContext);

  const router = useRouter();
  const { showToast } = useToast();
  const showErrorToast = useErrorToast();

  const [page, setPage] = useState<number>(1);

  const [initialLoad, setInitialLoad] = useState<boolean>(false);

  const [hasMoreDetail, setHasMoreDetail] = useState(false);

  const [dataMessageDetail, setDataMessageDetail] = useState<
    ChatMessageResponse[]
  >([]);
  // Preview files
  const [dataPreviewFile, setDataPreviewFile] = useState<{
    msgId: string;
    file: ChatFileResponse;
    user: ChatDashboardMember;
    createAt: string;
  } | null>(null);

  // Params
  const searchParams = useSearchParams();
  const params = new URLSearchParams(searchParams);

  // Event
  const [dataEventEdit, setDataEventEdit] = useState<EventEditFormData>();
  const [openEditEventModal, setOpenEditEventModal] = useState<boolean>(false);
  const [backToEditing, setBackToEditing] = useState(false);
  const [confirmEventDataToEdit, setConfirmEventDataToEdit] =
    useState<EventEditFormData>();
  const [openConfirmEditEventModal, setOpenConfirmEditEventModal] =
    useState(false);
  const [openConfirmDeleteEventModal, setOpenConfirmDeleteEventModal] =
    useState(false);
  const [actionsEventMessage, setActionsEventMessage] = useState<string>('');
  const [openEventActionTypeModal, setOpenEventActionTypeModal] = useState<{
    status: boolean;
    type: ActionsEvent | null;
    showThisEventOption?: boolean;
  }>({
    status: false,
    type: ActionsEvent.EDIT,
    showThisEventOption: true,
  });
  const [eventActionType, setEventActionType] =
    useState<EventActionType | null>(null);
  const [isEditingRepetitiveFields, setIsEditingRepetitiveFields] =
    useState<boolean>(false);

  // Search
  const [openSearchMessagesModal, setOpenSearchMessagesModal] = useState(false);
  const [searchResultsPage, setSearchResultsPage] = useState<number>(1);
  const [hasMoreSearchResultDetail, setHasMoreSearchResultDetail] =
    useState(false);
  const [searchMessageResults, setSearchMessageResults] = useState<{
    count: number;
    numPages: number;
    results: ChatMessageResponse[];
    hasNext?: boolean;
  }>();
  const isSearchingMessagesRef = useRef(false);

  useBookMarkList({
    page: page,
    setLoadingState: () => {
      setInitialLoad(true);
    },
    onSuccess: (bookmark) => {
      setHasMoreDetail(bookmark.hasNext as boolean);
      setDataMessageDetail((prev) => {
        const newMessages = bookmark.results.filter(
          (newMsg) =>
            !(prev || []).some((existingMsg) => existingMsg.id === newMsg.id),
        );
        return [...(prev || []), ...newMessages];
      });
      setInitialLoad(false);
    },
  });

  useEffect(() => {
    const handleScroll = () => {
      const chatContainer = chatContainerRef.current;
      if (
        chatContainer &&
        hasMoreDetail &&
        chatContainer.clientHeight + Math.abs(chatContainer.scrollTop) ===
          chatContainer.scrollHeight
      ) {
        setPage(page + 1);
      }
    };

    const chatContainer = chatContainerRef.current;

    if (chatContainer) {
      chatContainer.addEventListener('scroll', handleScroll);
    }

    return () => {
      if (chatContainer) {
        chatContainer.removeEventListener('scroll', handleScroll);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMoreDetail]);

  const handleChangeRoom = (data: { roomCode: string; messageId: string }) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('room', data.roomCode);
    params.set('messageId', data.messageId);

    router.push(`/chat?${params.toString()}`, { scroll: false });
  };

  const handleRemoveItemBookmark = (uuid: string) => {
    setDataMessageDetail(
      dataMessageDetail.filter((item) => item.uuid !== uuid),
    );
  };

  const handleSearchMessagesInChatRoom = async (data: {
    searchChatMsg: string;
    pageNumber: number;
  }) => {
    if (data.pageNumber == 1) setIsLoading(true);
    const encodedQuery = encodeURIComponent(data.searchChatMsg);
    const apiUrl = `${apiRouters.BOOKMARK_LIST}?is_bookmark=true&page_size=${PAGINATION_PAGE_SIZE_MEDIUM}&message=${encodedQuery}&page=${data.pageNumber}`;

    return await api.get<BasePagination<ChatMessageResponse[]>>(apiUrl);
  };

  const { mutate: searchMessagesInChatRoom } = useMutation(
    'searchMessagesInChatRoom',
    handleSearchMessagesInChatRoom,
    {
      onMutate: () => {
        isSearchingMessagesRef.current = true;
      },
      onSuccess: (data) => {
        if (data) {
          setSearchMessageResults((prev) => {
            return {
              count: data.data.count,
              numPages: data.data.numPages,
              results: [...(prev?.results || []), ...data.data.results],
              hasNext: data.data.hasNext,
            };
          });
          setHasMoreSearchResultDetail(data.data.hasNext || false);
          isSearchingMessagesRef.current = false;
        }
      },
      onError: () => {
        isSearchingMessagesRef.current = false;
      },
      onSettled: () => {
        setIsLoading(false);
      },
    },
  );

  const handleBookMarkMsg = async (data: {
    uuid: string;
    isBookmark: boolean;
  }) => {
    const { data: response } = await api.post(
      apiRouters.BOOKMARK_MESSAGE(`${data.uuid}`),
      {
        bookmarkAt: data.isBookmark ? new Date() : null,
      },
    );
    return response;
  };

  const { mutate: bookMarkMsg } = useMutation(
    'bookMarkMsg',
    handleBookMarkMsg,
    {
      onSuccess: async (data, bookmark) => {
        setSearchMessageResults((prev) =>
          prev
            ? {
                ...prev,
                results: prev.results.map((item) => {
                  return item.uuid == bookmark.uuid
                    ? { ...item, isBookmark: bookmark.isBookmark }
                    : item;
                }),
              }
            : prev,
        );
      },
      onError: () => {},
      onSettled: () => {},
    },
  );

  const handleGetDataDetailEvent = async (id: string) => {
    setIsLoading(true);
    const { data: response } = await api.get(apiRouters.SCHEDULE_DETAIL(id));
    return response;
  };

  const { mutate: getDataDetailEvent } = useMutation(
    'getDetailEventCalendar',
    handleGetDataDetailEvent,
    {
      onSuccess: async (data) => {
        setOpenEditEventModal(true);
        setDataEventEdit(data);
      },
      onError: (error: AxiosError) => {
        if (error.response?.status === ServerStatusCode.NOT_FOUND) {
          showToast({
            variant: 'error',
            description: ERROR_NOT_FOUND_EVENT,
          });
        }
      },
      onSettled: () => {
        setIsLoading(false);
      },
    },
  );

  const handleConfirmGetDataDetailEvent = (id: string) => {
    getDataDetailEvent(id);
  };

  const handleConfirmEditEventCalendar = (
    data: EventEditFormData,
    sendToChat: boolean,
  ) => {
    const newWorkCategories = [];
    const newTagIds: number[] = [];
    let newType = '';
    let newStartDate = null;
    let newEndDate = null;

    if (data.tagIds) {
      data.tagIds
        .filter((item) => `${item.value}` !== '')
        .map((item) => newTagIds.push(item.value as number));
    }
    if (data.largeCategory && data.largeCategory?.value !== 'undefined') {
      newWorkCategories.push({
        categoryId:
          `${data.largeCategory.value}` == NO_SETTING
            ? null
            : `${data.largeCategory.value}`,
        type: EventWorkCategory.LARGE,
      });
    }
    if (data.mediumCategory && data.mediumCategory?.value !== 'undefined') {
      newWorkCategories.push({
        categoryId:
          `${data.mediumCategory.value}` == NO_SETTING
            ? null
            : `${data.mediumCategory.value}`,
        type: EventWorkCategory.MEDIUM,
      });
    }
    if (data.type) {
      newType = (data.type as OptionDropdownType).value as string;
    }
    if (data.isAllDay) {
      newStartDate = addTimeToDate(
        (data.startDate as Date) || new Date(),
        DEFAULT_START_TIME,
      );
      newEndDate = addTimeToDate(
        (data.endDate as Date) || new Date(),
        DEFAULT_END_TIME,
      );
    } else {
      if (data.startTime) {
        newStartDate = addTimeToDate(
          (data.startDate as Date) || new Date(),
          data.startTime,
        );
      }
      if (data.endTime) {
        newEndDate = addTimeToDate(
          (data.endDate as Date) || new Date(),
          data.endTime,
        );
      }
    }
    editEventCalendar({
      id: data.id,
      title: data.title || '',
      startDate: newStartDate,
      endDate: newEndDate,
      isAllDay: data.isAllDay || false,
      tagIds: newTagIds,
      participantIds: data.participantIds || [],
      selectOrganizations: data.selectOrganizations || [],
      locationId: data.location
        ? String((data.location as OptionDropdownType).value)
        : '',
      memo: data.memo || '',
      type: newType,
      sendToChat,
      message: actionsEventMessage,
      categoryIds: newWorkCategories,
      repeatType:
        data.repeatType && (data.repeatType as OptionDropdownType).value
          ? String((data.repeatType as OptionDropdownType).value)
          : null,
      repeatInterval:
        data.repeatInterval && (data.repeatInterval as OptionDropdownType).value
          ? Number((data.repeatInterval as OptionDropdownType).value)
          : null,
      weekDay:
        data.weekDay && (data.weekDay as OptionDropdownType).label != ''
          ? Number((data.weekDay as OptionDropdownType).value)
          : null,
      monthDay:
        data.monthDay && (data.monthDay as OptionDropdownType).value != ''
          ? Number((data.monthDay as OptionDropdownType).value)
          : null,
      month:
        data.month && (data.month as OptionDropdownType).value != ''
          ? Number((data.month as OptionDropdownType).value)
          : null,
      recurringEventOption: eventActionType || EventActionType.THIS_EVENT,
    });
  };

  const handleEditEventCalendar = async (data: EventRequest) => {
    return await api.patch(apiRouters.SCHEDULE_DETAIL(`${data.id}`), data);
  };

  const { mutate: editEventCalendar } = useMutation(
    'editEventCalendar',
    handleEditEventCalendar,
    {
      onSuccess: async () => {
        setOpenConfirmEditEventModal(false);
        setBackToEditing(false);
        setConfirmEventDataToEdit(undefined);
        setActionsEventMessage('');
        showToast({
          description: SUCCESS_UPDATE_MESSAGE,
        });
      },
      onError: (error: AxiosError<any>) => {
        showErrorToast(error, ERROR_UPDATE_MESSAGE);
      },
      onSettled: () => {
        setIsLoading(false);
        setEventActionType(null);
      },
    },
  );

  const handleConfirmDeleteEventCalendar = (sendToChat: boolean) => {
    if (dataEventEdit) {
      deleteEventCalendar({ id: `${dataEventEdit.id}`, sendToChat });
      return;
    }
  };

  const handleDeleteEventCalendar = async (data: {
    id: string;
    sendToChat: boolean;
  }) => {
    return await api.delete(
      `${apiRouters.SCHEDULE_DETAIL(data.id)}?message=${encodeURIComponent(actionsEventMessage)}${eventActionType ? `&recurring_event_option=${eventActionType}` : ''}${data.sendToChat ? '&send_to_chat=true' : ''}`,
    );
  };

  const { mutate: deleteEventCalendar } = useMutation(
    'deleteEventCalendar',
    handleDeleteEventCalendar,
    {
      onSuccess: () => {
        setOpenConfirmDeleteEventModal(false);
        setConfirmEventDataToEdit(undefined);
        setBackToEditing(false);
        setActionsEventMessage('');
        showToast({
          description: SUCCESS_DELETE_MESSAGE,
        });
      },
      onError: (error: AxiosError<any>) => {
        showErrorToast(error, ERROR_DELETE_MESSAGE);
      },
      onSettled: () => {
        setIsLoading(false);
        setEventActionType(null);
      },
    },
  );

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
    <>
      <div className="w-full !bg-[#F8FAFC]">
        <div
          className="flex justify-between items-center px-5 py-4 min-h-[78px] !w-[calc(100%_-_20px)] ml-auto border-b-[2px] rounded-bl-[24px] text-white"
          style={{
            background: 'linear-gradient(to right, #289BF2, #73CCDF)',
          }}>
          <div className={`flex items-center w-[60%] gap-[10px]`}>
            <div className="">
              <ImageRound
                name="Save"
                src={`/icons/save-white.svg`}
                className="w-[14px] h-[18px]"
              />
            </div>
            <p
              className={`text-[20px] font-semibold text-ellipsis break-all overflow-hidden w-full `}>
              ブックマーク
            </p>
          </div>

          <div className="flex gap-5 items-center">
            <InputSearch
              placeholder="チャットルーム内のキーワードを検索"
              customSearchIconUrl="/icons/search-white.svg"
              inputClassName="!w-[290px] !py-2 !rounded-[30px] text-sm !bg-[#F6F9FA4D] border-none placeholder-white"
              value={searchChatMsg}
              onChange={(e) => setSearchChatMsg(e.target.value)}
              onKeyDown={(e: any) => {
                if (e.keyCode == 13 && e.target.value !== '') {
                  searchMessagesInChatRoom({ searchChatMsg, pageNumber: 1 });
                  setOpenSearchMessagesModal(true);
                }
              }}
            />
            {session?.user.permissions &&
              hasPermissionInArray(
                session?.user.permissions,
                PermissionsSystem.CHAT_UPDATE,
              ) && (
                <>
                  <div>
                    <ImageRound
                      className="w-[26px] h-[26px]"
                      src="/icons/setting-chat.svg"
                      border="full"
                      name="Setting icon"
                    />
                  </div>
                </>
              )}
          </div>
        </div>
        <div
          ref={chatContainerRef}
          className={` h-[calc(100vh_-_170px)] pt-4 pb-3 ${dataMessageDetail.length > 0 && !initialLoad ? 'overflow-y-auto' : 'overflow-y-hidden'}  overflow-x-hidden scrollbar-gutter-stable flex flex-col-reverse scroll-smooth`}>
          <div className="h-[calc(100vh)] mt-3 w-full bg-[rgb(229, 231, 235)] relative">
            <div>
              {initialLoad ? (
                <div className="flex flex-col items-start ml-3">
                  <RowSkeleton className="!h-[100px] w-[500px] mb-2" />
                  <RowSkeleton className="!h-[200px] w-[600px] mb-2" />
                  <RowSkeleton className="!h-[100px] w-[500px] mb-2" />
                  <RowSkeleton className="!h-[200px] w-[600px] mb-2" />
                  <RowSkeleton
                    numberOfRows={4}
                    className="!h-[50px] w-[700px]"
                  />
                </div>
              ) : (
                <div className="w-full"></div>
              )}
            </div>
          </div>
          {dataMessageDetail.map((item, index) => (
            <div key={item.id}>
              <MessageDetailBookmark
                isLastItem={dataMessageDetail.length - 1 === index}
                messageDetail={item}
                dashboardMemberList={dashboardMemberList}
                chatRoomInfo={item.chatRoom}
                handleConfirmGetDataDetailEvent={
                  handleConfirmGetDataDetailEvent
                }
                setDataPreviewFile={setDataPreviewFile}
                handleActionEditTask={handleActionEditTask}
                onGotoMessage={() => {
                  handleChangeRoom({
                    roomCode: String(item.chatRoom?.code),
                    messageId: String(item.id),
                  });
                }}
                onGotoMessageReply={(data: {
                  messageId: string | number;
                  chatRoomCode: string;
                }) => {
                  handleChangeRoom({
                    roomCode: String(data.chatRoomCode),
                    messageId: String(data.messageId),
                  });
                }}
                handleRemoveItemBookmark={handleRemoveItemBookmark}
              />
            </div>
          ))}
        </div>
      </div>

      {openEditEventModal && (
        <ActionsEventModal
          open={openEditEventModal}
          dataEvent={dataEventEdit}
          action={ActionsEvent.EDIT}
          isEditDisabled={true}
          setIsEditingRepetitiveFields={setIsEditingRepetitiveFields}
          onClose={() => {
            setDataEventEdit(undefined);
            setOpenEditEventModal(false);
            setBackToEditing(false);
          }}
          onEdit={(data) => {
            setConfirmEventDataToEdit(data);
            setOpenEditEventModal(false);
            if (
              String((data.repeatType as OptionDropdownType).value) !=
              TaskRepetitiveValue.ONCE
            ) {
              isEditingRepetitiveFields
                ? setEventActionType(EventActionType.THIS_AND_FOLLOWING_EVENTS)
                : setEventActionType(EventActionType.THIS_EVENT);
              setOpenEventActionTypeModal({
                status: true,
                type: ActionsEvent.EDIT,
                showThisEventOption: !isEditingRepetitiveFields,
              });
            } else {
              setOpenConfirmEditEventModal(true);
            }
          }}
          onDelete={(data) => {
            setConfirmEventDataToEdit(data);
            setOpenEditEventModal(false);
            if (
              String((data.repeatType as OptionDropdownType).value) !=
              TaskRepetitiveValue.ONCE
            ) {
              setEventActionType(EventActionType.THIS_EVENT);
              setOpenEventActionTypeModal({
                status: true,
                type: ActionsEvent.DELETE,
                showThisEventOption: true,
              });
            } else {
              setOpenConfirmDeleteEventModal(true);
            }
          }}
          backToEditing={backToEditing}
        />
      )}
      {dataPreviewFile && (
        <FilePreview
          isBookmark
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
            setOpenSearchMessagesModal(false);

            handleChangeRoom({
              roomCode: String(data.roomCode),
              messageId: String(data.messageId),
            });
            setDataPreviewFile(null);
          }}
        />
      )}
      {openEventActionTypeModal.status && openEventActionTypeModal.type && (
        <EventActionTypeModal
          open={openEventActionTypeModal.status}
          openEventActionTypeModal={openEventActionTypeModal}
          eventActionType={eventActionType}
          setEventActionType={setEventActionType}
          onCancel={() => {
            setOpenEditEventModal(true);
            setOpenConfirmEditEventModal(false);
            setDataEventEdit(confirmEventDataToEdit);
            setBackToEditing(true);
            setActionsEventMessage('');
            setEventActionType(EventActionType.THIS_EVENT);
            setOpenEventActionTypeModal({
              status: false,
              type: null,
            });
          }}
          onConfirm={() => {
            setOpenEventActionTypeModal({
              status: false,
              type: null,
            });
            if (openEventActionTypeModal.type == ActionsEvent.EDIT) {
              setOpenConfirmEditEventModal(true);
            } else {
              setOpenConfirmDeleteEventModal(true);
            }
          }}
        />
      )}
      {openConfirmEditEventModal && (
        <ConfirmActionsEventModal
          open={openConfirmEditEventModal}
          type={ActionsEvent.EDIT}
          setActionsEventMessage={setActionsEventMessage}
          onSend={() => {
            setIsLoading(true);
            handleConfirmEditEventCalendar(
              confirmEventDataToEdit as EventEditFormData,
              true,
            );
          }}
          onRejectSend={() => {
            setIsLoading(true);
            handleConfirmEditEventCalendar(
              confirmEventDataToEdit as EventEditFormData,
              false,
            );
          }}
          onClose={() => {
            setDataEventEdit(undefined);
            setConfirmEventDataToEdit(undefined);
            setOpenConfirmEditEventModal(false);
            setBackToEditing(false);
            setActionsEventMessage('');
          }}
          onBackToEditModal={() => {
            setOpenEditEventModal(true);
            setOpenConfirmEditEventModal(false);
            setDataEventEdit(confirmEventDataToEdit);
            setBackToEditing(true);
            setActionsEventMessage('');
          }}
        />
      )}
      {openConfirmDeleteEventModal && (
        <ConfirmActionsEventModal
          open={openConfirmDeleteEventModal}
          type={ActionsEvent.DELETE}
          setActionsEventMessage={setActionsEventMessage}
          onSend={() => {
            setIsLoading(true);
            handleConfirmDeleteEventCalendar(true);
          }}
          onRejectSend={() => {
            setIsLoading(true);
            handleConfirmDeleteEventCalendar(false);
          }}
          onClose={() => {
            setDataEventEdit(undefined);
            setConfirmEventDataToEdit(undefined);
            setOpenConfirmDeleteEventModal(false);
            setBackToEditing(false);
            setActionsEventMessage('');
          }}
          onBackToEditModal={() => {
            setOpenEditEventModal(true);
            setOpenConfirmDeleteEventModal(false);
            setDataEventEdit(confirmEventDataToEdit);
            setBackToEditing(true);
            setActionsEventMessage('');
          }}
        />
      )}
      {openSearchMessagesModal && (
        <SearchMessagesModal
          open={true}
          chatRoomDetail={undefined}
          highlightedMessageId={null}
          handleActionEditTask={() => {}}
          isSearchingMessagesRef={isSearchingMessagesRef}
          chatRoomType={ChatRoomType.BOOKMARK}
          dashboardMemberList={dashboardMemberList}
          searchMessageResults={searchMessageResults}
          searchChatMsg={searchChatMsg}
          setSearchChatMsg={setSearchChatMsg}
          searchResultsPage={searchResultsPage}
          setSearchMessageResults={setSearchMessageResults}
          setSearchResultsPage={setSearchResultsPage}
          hasMoreSearchResultDetail={hasMoreSearchResultDetail}
          handleConfirmGetDataDetailEvent={handleConfirmGetDataDetailEvent}
          onSubmit={(searchChatMsg: string, page: number) => {
            searchMessagesInChatRoom({ searchChatMsg, pageNumber: page });
          }}
          onClose={() => {
            setOpenSearchMessagesModal(false);
            setSearchResultsPage(1);
            setSearchMessageResults(undefined);
          }}
          onGotoMessage={(data: {
            messageId: string | number;
            chatRoomCode: string;
          }) => {
            handleChangeRoom({
              roomCode: String(data.chatRoomCode),
              messageId: String(data.messageId),
            });
          }}
          handleBookmark={(data: { uuid: string; isBookmark: boolean }) => {
            bookMarkMsg(data);
          }}
        />
      )}
    </>
  );
};

export default BookmarkList;
