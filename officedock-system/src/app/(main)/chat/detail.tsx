'use client';

import { AxiosError } from 'axios';
import { useMutation } from 'react-query';
import {
  ChangeEvent,
  Fragment,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useSession } from 'next-auth/react';
import { v4 as uuidv4 } from 'uuid';
import { useRouter, useSearchParams } from 'next/navigation';
import { Document } from '@tiptap/extension-document';
import { Mention } from '@tiptap/extension-mention';
import { Paragraph } from '@tiptap/extension-paragraph';
import { Text } from '@tiptap/extension-text';
import { EditorContent, useEditor, Editor } from '@tiptap/react';
import { Placeholder } from '@tiptap/extension-placeholder';
import TextStyle from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Tippy from '@tippyjs/react';
import 'tippy.js/dist/tippy.css';

import RowSkeleton from '@components/skeleton/RowSkeleton';
import Button from '@components/common/Button';
import ImageRound from '@components/common/ImageRound';
import InputSearch from '@components/common/InputSearch';
import ActionsChatMembersModal from '@components/modals/ActionsChatMembersModal';
import ChatSettingModal from '@components/modals/ChatSettingModal';
import ConfirmDeleteModal from '@components/modals/ConfirmDeleteModal';
import ActionsTaskModal from '@components/modals/ActionsTaskModal';
import socketEventEmitter from '@components/socket/socketEventEmitter';
import ActionsEventModal from '@components/modals/ActionsEventModal';
import { ChatMentionMembersList } from '@components/modals/ChatMentionMembersModal';
import ConfirmActionsEventModal from '@components/modals/ConfirmActionsEventModal';
import AvatarIconWithDynamicColor from '@components/common/AvatarIcon';
import ConfirmRemoveChatMemberModal from '@components/modals/ConfirmRemoveChatMemberModal';
import WarningCloseTaskModal from '@components/modals/WarningCloseTaskModal';
import ChatUploadingFilesModal from '@components/modals/ChatUploadingFilesModal';
import ChatDroppingFileModal from '@components/modals/ChatDroppingFileModal';
import ErrorChatUploadFileValidationModal from '@components/modals/ErrorChatUploadFileValidationModal';
import { MessageDetail } from '@components/chat/MessageDetail';
import { SearchMessagesModal } from '@components/modals/SearchMessagesModal';
import ListTaskUserChat from '@components/chat/ListTaskUserChat';

import { apiRouters } from '@constants/routers';
import {
  DEFAULT_END_TIME,
  DEFAULT_START_TIME,
  MAX_FILE_SIZE,
  MENTION_ALL_MEMBERS,
  NO_OPTION_CATEGORY,
  PAGINATION_PAGE_SIZE_HIGHT,
} from '@constants';
import {
  SocketActions,
  ChatRoomType,
  ServerStatusCode,
  ActionTask,
  StatusValueTask,
  MessageType,
  ActionsEvent,
  EventWorkCategory,
  PermissionsSystem,
} from '@constants/enums';
import {
  ERROR_CREATE_MESSAGE,
  ERROR_DELETE_MESSAGE,
  ERROR_MESSAGE_OVERLAP_TASK,
  ERROR_NOT_FOUND_EVENT,
  ERROR_UPDATE_MESSAGE,
  SUCCESS_DELETE_MESSAGE,
  SUCCESS_UPDATE_MESSAGE,
  UPLOAD_FILE_MAXIMUM_SZIE,
} from '@constants/message';

import useChatRoomDetail from '@hooks/useChatRoomDetail';
import useCreationDataEventCalendar from '@hooks/useCreationDataEventCalendar';
import { useErrorToast } from '@hooks/useErrorToast';
import useAuthenticatedUser from '@hooks/useAuthenticatedUser';
import { addTimeToDate, getCurrentTimeInJapan } from '@utils/date';
import {
  getChatFileURL,
  hasPermissionInArray,
  trimUnnecessaryLineBreaks,
} from '@utils';
import {
  ChatDashboardMember,
  ChatMessageResponse,
  ChatParticipant,
  ChatRoomItem,
  WebSocketMessageData,
} from '@interfaces/chat';
import { BasePagination, OptionDropdownType } from '@interfaces/common';
import { EventEditFormData, EventRequest } from '@interfaces/calendar';
import { Profile, User } from '@interfaces/user';
import {
  CreationDataTask,
  Task,
  TaskFormData,
  TaskRequest,
} from '@interfaces/task';
import { ChatContext } from '@providers/ChatProvider';
import { LoadingContext } from '@providers/LoadingProvider';
import { useToast } from '@providers/ToastProvider';
import { GlobalStateContext } from '@providers/GlobalStateProvider';
import api from '@base/api';

interface dataProps {
  clientId: string;
  lastItemId: number | null | undefined;
  hasMoreDetail: boolean;
  dashboardMemberList: Omit<Profile, 'birthday' | 'gender'>[];
  dashboardMembers: ChatDashboardMember[];
  creationDataTaskData: CreationDataTask | undefined;
  setLastItemId: React.Dispatch<
    React.SetStateAction<number | null | undefined>
  >;
  setHasMoreDetail: React.Dispatch<React.SetStateAction<boolean>>;
  setDataChatList: React.Dispatch<React.SetStateAction<ChatRoomItem[]>>;
  hasMore: boolean;
  handleRemoveChatRoomParam: () => void;
  chatRoomCode: string;
  dataChatList: ChatRoomItem[];
  searchChatMsg: string;
  setSearchChatMsg: React.Dispatch<React.SetStateAction<string>>;
  setFilteredChatList: React.Dispatch<React.SetStateAction<ChatRoomItem[]>>;
}
const ChatDetail = ({
  clientId,
  lastItemId,
  creationDataTaskData,
  hasMoreDetail,
  dashboardMemberList,
  dashboardMembers,
  setFilteredChatList,
  setHasMoreDetail,
  setLastItemId,
  setDataChatList,
  handleRemoveChatRoomParam,
  chatRoomCode,
  dataChatList,
  searchChatMsg,
  setSearchChatMsg,
}: dataProps) => {
  const { data: session } = useSession();

  const searchParams = useSearchParams();
  const params = new URLSearchParams(searchParams);

  const messageBookmarkId = searchParams.get('messageId');

  const router = useRouter();
  const showErrorToast = useErrorToast();

  const [openSettingBox, setOpenSettingBox] = useState<boolean>(false);
  const [openConfirmRemoveMemberModal, setOpenConfirmRemoveMemberModal] =
    useState<boolean>(false);
  const [openAddMembersBox, setOpenAddMembersBox] = useState<boolean>(false);
  const [openAddMembersBoxFromSetting, setOpenAddMembersBoxFromSetting] =
    useState<boolean>(false);
  const [message, setMessage] = useState<string>('');
  const [page, _setPage] = useState<number>(1);
  const [isShowModalTask, setShowModalTask] = useState<boolean>(false);
  const [actionsEventMessage, setActionsEventMessage] = useState<string>('');
  const [dataMessageDetail, setDataMessageDetail] = useState<
    ChatMessageResponse[]
  >([]);
  const [selectedRemoveMemberId, setSelectedRemoveMemberId] =
    useState<number>();
  const {
    chatList,
    chatRoomNameEditing,
    chatRoomParticipantsEditing,
    chatRoomNotifications,
    setChatRoomParticipantsEditing,
    setChatRoomNameEditing,
    setChatRoomNotifications,
  } = useContext(ChatContext);
  const { setIsLoading } = useContext(LoadingContext);
  const { setTotalNotifications } = useContext(GlobalStateContext);
  const { showToast } = useToast();

  const [msgIdDeleted, setMsgIdDeleted] = useState<string>();
  const [openConfirmDeleteModal, setOpenConfirmDeleteModal] = useState(false);
  const [msgIdUpdated, setMsgIdUpdated] = useState<string>();
  const [msgEditing, setMsgEditing] = useState<string | undefined>();
  const [dataEventEdit, setDataEventEdit] = useState<EventEditFormData>();
  const [openEditEventModal, setOpenEditEventModal] = useState<boolean>(false);
  const [openConfirmEditEventModal, setOpenConfirmEditEventModal] =
    useState(false);
  const [openConfirmDeleteEventModal, setOpenConfirmDeleteEventModal] =
    useState(false);
  const [confirmEventDataToEdit, setConfirmEventDataToEdit] =
    useState<EventEditFormData>();
  const [backToEditing, setBackToEditing] = useState(false);
  const [initialLoad, setInitialLoad] = useState<boolean>(false);
  const { creationDataEventCalendar } = useCreationDataEventCalendar({});
  const { chatRoomDetail } = useChatRoomDetail({
    code: `${chatRoomCode}`,
  });
  const { authenticatedUser } = useAuthenticatedUser();
  const [loggedInUser, setLoggedInUser] = useState<User>();
  const [mentionMembers, setMentionMembers] = useState<ChatParticipant[]>([]);
  const [searchMentionMembers, setSearchMentionMembers] = useState<string>('');

  const [lastGotoMessageId, setLastGotoMessageId] = useState<number | null>();
  const [hasMoreDetailOnScrollDown, setHasMoreDetailOnScrollDown] =
    useState(false);
  const [gotoMessageId, setGotoMessageId] = useState<number | null>();
  const gotoMessageRef = useRef<HTMLDivElement | null>(null);

  // Upload files
  const [openUploadFilesModal, setOpenUploadFilesModal] =
    useState<boolean>(false);
  const [uploadFiles, setUploadFiles] = useState<
    { uuid: string; file: File }[]
  >([]);
  const [preserveFiles, setPreserveFiles] = useState<
    {
      uuid: string;
      file: {
        name: string;
      };
    }[]
  >([]);
  const [openDroppingFileModal, setOpenDroppingFileModal] =
    useState<boolean>(false);
  const [uploadFileStatus, setUploadFileStatus] = useState<
    Record<
      string,
      {
        progress: number;
        errorMsg?: string;
      }
    >
  >({});
  const [openErrorUploadFileModal, setOpenErrorUploadFileModal] =
    useState(false);

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

  //Task
  const [dataTaskEdit, setDataTaskEdit] = useState<Task | null>(null);
  const [openWarningCloseModal, setOpenWarningCloseModal] =
    useState<boolean>(false);
  const [resetFunctions, setResetFunctions] = useState<{
    resetDataCategoryOptions?: () => void;
    reset?: () => void;
  }>({});

  // Handle get list and more data message
  const handleGetDataMessages = async (pageNumber: number) => {
    if (chatRoomCode) {
      setInitialLoad(true);
      const apiUrl = `${apiRouters.CHAT_MESSAGES(`${chatRoomCode}`)}?page=${pageNumber}&page_size=${PAGINATION_PAGE_SIZE_HIGHT}${lastItemId ? `&message_id=${lastItemId}` : ''}${messageBookmarkId ? `&bookmark_message_id=${messageBookmarkId}` : ''}`;
      return await api.get<BasePagination<ChatMessageResponse[]>>(apiUrl);
    }
  };

  useEffect(() => {
    if (
      dataMessageDetail.length > 0 &&
      gotoMessageId &&
      gotoMessageRef.current
    ) {
      gotoMessageRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'end',
      });
      setGotoMessageId(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataMessageDetail]);

  const { mutate: getDataListMessages } = useMutation(
    'getDataListMessages',
    handleGetDataMessages,
    {
      onSuccess: (variables) => {
        if (variables) {
          if (variables.data.results.length <= 0 || !variables.data.hasNext) {
            setHasMoreDetail(false);
          }
          setDataMessageDetail((prev) => {
            const newMessages = variables.data.results.filter(
              (newMsg) =>
                !(prev || []).some(
                  (existingMsg) => existingMsg.id === newMsg.id,
                ),
            );
            return [...(prev || []), ...newMessages];
          });
          if (
            variables.data.results.length > 0 &&
            variables.data.results[variables.data.results.length - 1].id
          ) {
            setLastItemId &&
              setLastItemId(
                variables.data.results[variables.data.results.length - 1].id,
              );
          } else {
            setLastItemId(null);
          }

          // Delete messageBookmarkId when go to from list bookmark
          if (messageBookmarkId) {
            setHasMoreDetailOnScrollDown(true);
            setLastGotoMessageId(variables.data.results[0].id);

            setGotoMessageId(parseInt(messageBookmarkId));
            params.delete('messageId');

            router.replace(`?${params.toString()}`);
          }
        }
      },
      onError: ({ response }: AxiosError) => {
        if (response?.status === ServerStatusCode.NOT_FOUND) {
          handleRemoveChatRoomParam();
        }
      },
      onSettled: () => {
        setInitialLoad(false);
      },
    },
  );

  const handleGotoSelectedMessage = async (data: {
    bookmarkMessageId?: number;
  }) => {
    if (chatRoomCode) {
      setInitialLoad(true);
      const apiUrl = `${apiRouters.CHAT_MESSAGES(`${chatRoomCode}`)}?page=${page}&page_size=${PAGINATION_PAGE_SIZE_HIGHT}${data.bookmarkMessageId ? `&bookmark_message_id=${data.bookmarkMessageId}` : ''}`;

      return await api.get<BasePagination<ChatMessageResponse[]>>(apiUrl);
    }
  };

  const { mutate: gotoSelectedMessage } = useMutation(
    'gotoSelectedMessage',
    handleGotoSelectedMessage,
    {
      onSuccess: (data) => {
        if (data) {
          if (data.data.results.length <= 0 || !data.data.hasNext) {
            setHasMoreDetail(false);
          }
          setHasMoreDetailOnScrollDown(true);
          setDataMessageDetail(() => {
            const uniqueMessages = [...data.data.results].filter(
              (msg, index, self) =>
                self.findIndex((m) => m.id === msg.id) === index,
            );

            return uniqueMessages;
          });

          setLastGotoMessageId(data.data.results[0].id);

          if (
            data.data.results.length > 0 &&
            data.data.results[data.data.results.length - 1].id
          ) {
            setLastItemId &&
              setLastItemId(data.data.results[data.data.results.length - 1].id);
          } else {
            setLastItemId(null);
          }
        }
      },
      onError: ({ response }: AxiosError) => {
        if (response?.status === ServerStatusCode.NOT_FOUND) {
          handleRemoveChatRoomParam();
        }
      },
      onSettled: () => {
        setInitialLoad(false);
      },
    },
  );

  const handleGetDataMessagesOnScrollDown = async (data: {
    pageNumber: number;
    sorting?: boolean;
  }) => {
    if (chatRoomCode) {
      const apiUrl = `${apiRouters.CHAT_MESSAGES(`${chatRoomCode}`)}?page=${data.pageNumber}&page_size=${PAGINATION_PAGE_SIZE_HIGHT}${lastGotoMessageId ? `&message_id=${lastGotoMessageId}` : ''}${data.sorting ? `&sorting=${data.sorting}` : ''}`;

      return await api.get<BasePagination<ChatMessageResponse[]>>(apiUrl);
    }
  };

  const { mutate: getDataListMessagesOnScrollDown } = useMutation(
    'getDataListMessagesOnScrollDown',
    handleGetDataMessagesOnScrollDown,
    {
      onSuccess: (data) => {
        if (data) {
          if (data.data.results.length <= 0 || !data.data.hasNext) {
            setHasMoreDetailOnScrollDown(false);
          }
          setDataMessageDetail((prev) => {
            if (prev) {
              const newMessages = data.data.results.slice().reverse();

              const filteredMessages = newMessages.filter(
                (newMsg) =>
                  !prev.some((existingMsg) => existingMsg.id === newMsg.id),
              );

              return [...filteredMessages, ...prev];
            } else {
              return [...data.data.results];
            }
          });

          if (
            data.data.results.length > 0 &&
            data.data.results[data.data.results.length - 1].id
          ) {
            setLastGotoMessageId &&
              setLastGotoMessageId(
                data.data.results[data.data.results.length - 1].id,
              );
          } else {
            setLastGotoMessageId(null);
          }
        }
      },
      onError: ({ response }: AxiosError) => {
        if (response?.status === ServerStatusCode.NOT_FOUND) {
          handleRemoveChatRoomParam();
        }
      },
    },
  );

  const handleSearchMessagesInChatRoom = async (data: {
    searchChatMsg: string;
    pageNumber: number;
  }) => {
    if (chatRoomCode) {
      if (data.pageNumber == 1) setIsLoading(true);
      const encodedQuery = encodeURIComponent(data.searchChatMsg);
      const apiUrl = `${apiRouters.CHAT_MESSAGES(chatRoomCode)}?${
        data.searchChatMsg ? `message=${encodedQuery}` : ''
      }${data.pageNumber ? `&page=${data.pageNumber}` : ''}`;

      return await api.get<BasePagination<ChatMessageResponse[]>>(apiUrl);
    }
  };

  const { mutate: searchMessagesInChatRoom } = useMutation(
    'searchMessagesInChatRoom',
    handleSearchMessagesInChatRoom,
    {
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
        }
      },
      onSettled: () => {
        setIsLoading(false);
      },
    },
  );

  useEffect(() => {
    if (chatRoomCode) {
      getDataListMessages(page);
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatRoomCode]);

  const chatContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      const chatContainer = chatContainerRef.current;
      if (
        chatContainer &&
        hasMoreDetail &&
        chatContainer.clientHeight + Math.abs(chatContainer.scrollTop) ===
          chatContainer.scrollHeight
      ) {
        getDataListMessages(page);
      } else if (
        chatContainer &&
        hasMoreDetailOnScrollDown &&
        Math.abs(chatContainer.scrollTop) == 0
      ) {
        chatContainer.scrollTop = -10;
        getDataListMessagesOnScrollDown({ pageNumber: page, sorting: true });
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
  }, [hasMoreDetail, hasMoreDetailOnScrollDown]);

  useEffect(() => {
    if (authenticatedUser) {
      setLoggedInUser(authenticatedUser);
    }
  }, [authenticatedUser]);

  useEffect(() => {
    if (!chatRoomNotifications) {
      if (dataChatList) {
        const currentChatRoom = dataChatList.find(
          (room) => room.code == chatRoomCode,
        );
        setChatRoomNotifications({
          roomCode: chatRoomCode,
          notifications: currentChatRoom?.unreadMessages || 0,
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatRoomCode, dataChatList]);

  const getChatParticipantIds = (
    participantsList: ChatParticipant[] | undefined,
  ) => {
    if (participantsList) {
      const participantIds = [] as number[];
      participantsList.map((member) => participantIds.push(Number(member.id)));
      return participantIds;
    }
  };

  useEffect(() => {
    if (chatList && chatRoomCode) {
      const initialRoomDetail = chatList.results.find(
        (room) => room.code === chatRoomCode,
      );
      if (initialRoomDetail) {
        setMessage('');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatList, chatRoomCode]);

  useEffect(() => {
    if (chatRoomCode) {
      setDataMessageDetail([]);
      setMsgIdUpdated(undefined);
      setLastItemId(null);
      if (editor) {
        editor.commands.clearContent();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatRoomCode, setLastItemId]);

  const handleDeleteMessageLocal = useCallback(
    (data: WebSocketMessageData) => {
      setDataMessageDetail((prevDataMessageDetail) => {
        const updatedDataMessageDetail = [...prevDataMessageDetail];
        const deletedMessageItemIndex = updatedDataMessageDetail.findIndex(
          (item) => item.uuid === data.chatMessage.uuid,
        );
        if (deletedMessageItemIndex !== -1) {
          updatedDataMessageDetail[deletedMessageItemIndex] = {
            ...updatedDataMessageDetail[deletedMessageItemIndex],
            deletedAt: data.chatMessage.deletedAt,
          };
          return updatedDataMessageDetail;
        }
        return prevDataMessageDetail;
      });
    },
    [setDataMessageDetail],
  );

  const handleUpdateMessageLocal = useCallback(
    (data: WebSocketMessageData) => {
      const chatFileList = data.chatMessage.chatFiles.map((file) => {
        return {
          ...file,
          compressedFile: getChatFileURL(file.compressedFile || ''),
        };
      });
      setDataMessageDetail((prevDataMessageDetail) => {
        const updatedDataMessageDetail = [...prevDataMessageDetail];
        const updatedMessageItemIndex = updatedDataMessageDetail.findIndex(
          (item) => item.uuid === data.chatMessage.uuid,
        );
        if (updatedMessageItemIndex !== -1) {
          updatedDataMessageDetail[updatedMessageItemIndex] = {
            ...updatedDataMessageDetail[updatedMessageItemIndex],
            isEdited: true,
            reactions: data.chatMessage.reactions,
            chatFiles: chatFileList,
            message: trimUnnecessaryLineBreaks(
              `${data.chatMessage.message}`,
            ) as string,
            mentions: data.chatMessage.mentions,
          };
          return updatedDataMessageDetail;
        }
        return prevDataMessageDetail;
      });
    },
    [setDataMessageDetail],
  );

  const handleDeleteTaskLocal = useCallback(
    (data: ChatMessageResponse) => {
      setDataMessageDetail((prevDataMessageDetail) => {
        const updatedDataMessageDetail = [...prevDataMessageDetail];
        const updatedMessageItemIndex = updatedDataMessageDetail.findIndex(
          (item) => item.id === data.id,
        );
        if (updatedMessageItemIndex !== -1) {
          updatedDataMessageDetail[updatedMessageItemIndex] = {
            ...updatedDataMessageDetail[updatedMessageItemIndex],
            task: null,
          };
          return updatedDataMessageDetail;
        }
        return prevDataMessageDetail;
      });
    },
    [setDataMessageDetail],
  );

  const handleUpdateGroupLocal = useCallback(
    (data: WebSocketMessageData, dataChatList: ChatRoomItem[]) => {
      setChatRoomNameEditing((prevChatRoomNameEditing) => {
        const updatedChatRoomNameEditing = [...(prevChatRoomNameEditing ?? [])];
        const chatRoomNameEditingIndex = updatedChatRoomNameEditing.findIndex(
          (room) => room.roomCode === data.chatRoom.code,
        );
        if (chatRoomNameEditingIndex !== -1) {
          // Update chatRoomNameEditing item if it exists
          updatedChatRoomNameEditing[chatRoomNameEditingIndex] = {
            roomName: data.chatRoom.name,
            roomCode: data.chatRoom.code,
          };
          return updatedChatRoomNameEditing;
        } else {
          // Push new chatRoomNameEditing item if it does not exist
          return [
            ...updatedChatRoomNameEditing,
            {
              roomName: data.chatRoom.name,
              roomCode: data.chatRoom.code,
            },
          ];
        }
      });
      const list = [] as number[];
      data.chatRoom.participants.map((member) => list.push(Number(member.id)));
      setChatRoomParticipantsEditing((prevChatRoomParticipantsEditing) => {
        const updatedChatRoomParticipantsEditing = [
          ...(prevChatRoomParticipantsEditing ?? []),
        ];
        const chatRoomParticipantsEditingIndex =
          updatedChatRoomParticipantsEditing.findIndex(
            (room) => room.roomCode === data.chatRoom.code,
          );
        if (chatRoomParticipantsEditingIndex !== -1) {
          // Update chatRoomParticipantsEditing item if it exists
          updatedChatRoomParticipantsEditing[chatRoomParticipantsEditingIndex] =
            {
              participantsList: list,
              roomCode: data.chatRoom.code,
            };
          return updatedChatRoomParticipantsEditing;
        } else {
          // Push new chatRoomParticipantsEditing item if it does not exist
          return [
            ...updatedChatRoomParticipantsEditing,
            {
              participantsList: list,
              roomCode: data.chatRoom.code,
            },
          ];
        }
      });
      if (data.chatRoom.code == chatRoomCode) {
        const updatedDataChatList = [...dataChatList];
        const chatRoomIndex = updatedDataChatList.findIndex(
          (room) => room.code == chatRoomCode,
        );
        if (chatRoomIndex != -1) {
          updatedDataChatList[chatRoomIndex].unreadMessages =
            data.chatRoom.unreadMessages;
          setDataChatList(updatedDataChatList);
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [setChatRoomNameEditing, setChatRoomParticipantsEditing, setDataChatList],
  );

  const handleRemoveParticipantsLocal = useCallback(
    (data: WebSocketMessageData) => {
      // Update dataChatList if user is removed from participants list
      setDataChatList((prevDataChatList) => {
        let updatedDataChatList = [...prevDataChatList];
        updatedDataChatList = updatedDataChatList.filter(
          (chatRoom) => chatRoom.code !== data.chatRoom.code,
        );
        return updatedDataChatList;
      });
      if (data.chatRoom.code === chatRoomCode) {
        handleRemoveChatRoomParam();
      }
    },
    [setDataChatList, handleRemoveChatRoomParam, chatRoomCode],
  );

  // Socket
  useEffect(() => {
    // Create WebSocket
    const handleSocketMessage = (data: WebSocketMessageData) => {
      switch (data.action) {
        case SocketActions.MESSAGE:
          if (data.chatRoom.code === chatRoomCode) {
            if (!data.clientId || !data.clientId.includes(clientId)) {
              const chatFileList = data.chatMessage.chatFiles.map((file) => {
                return {
                  ...file,
                  compressedFile: getChatFileURL(file.compressedFile || ''),
                };
              });
              setDataMessageDetail([
                { ...data.chatMessage, chatFiles: chatFileList },
                ...dataMessageDetail,
              ]);
              setChatRoomNotifications({
                notifications: data.chatRoom.unreadMessages,
                roomCode: chatRoomCode,
              });
            }
          }
          break;
        case SocketActions.CREATION_TASK:
          if (data.chatRoom.code === chatRoomCode) {
            setDataMessageDetail([data.chatMessage, ...dataMessageDetail]);
            if (data.clientId !== clientId) {
              setChatRoomNotifications({
                notifications: data.chatRoom.unreadMessages,
                roomCode: chatRoomCode,
              });
            }
          }
          break;
        case SocketActions.DELETE_TASK:
          if (data.chatRoom.code === chatRoomCode) {
            handleDeleteTaskLocal(data.chatMessage);
          }
          break;
        case SocketActions.DELETE_MESSAGE:
          if (data.chatRoom.code === chatRoomCode) {
            handleDeleteMessageLocal(data);
            setOpenConfirmDeleteModal(false);
          }
          break;
        case SocketActions.EDIT_MESSAGE:
          if (data.chatRoom.code === chatRoomCode) {
            handleUpdateMessageLocal(data);
            setMsgIdUpdated && setMsgIdUpdated(undefined);
            setMsgEditing(undefined);
          }
          break;
        case SocketActions.UPDATE_CHAT_ROOM:
          handleUpdateGroupLocal(data, dataChatList);
          break;
        case SocketActions.REMOVE_PARTICIPANT:
          handleRemoveParticipantsLocal(data);
          break;
        default:
          break;
      }
    };
    socketEventEmitter.on('message', handleSocketMessage);

    return () => {
      socketEventEmitter.off('message', handleSocketMessage);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    chatRoomCode,
    dataMessageDetail,
    handleDeleteMessageLocal,
    handleUpdateMessageLocal,
    handleUpdateGroupLocal,
    handleRemoveParticipantsLocal,
    handleDeleteTaskLocal,
    clientId,
  ]);

  // Create message
  const postSendMsg = async ({
    data,
    uuid,
    mentionIds,
    files,
    fileUuids,
  }: {
    data: string;
    uuid: string;
    mentionIds: number[];
    files: File[];
    fileUuids: string[];
  }) => {
    const formData = new FormData();
    formData.append('message', data);
    formData.append('uuid', uuid);
    formData.append('clientId', clientId);
    mentionIds.forEach((id) => formData.append('mentionIds', id.toString()));
    fileUuids.forEach((id) => formData.append('fileUuids', id.toString()));
    if (files && files.length > 0) {
      files.forEach((file, index) => {
        formData.append(`files[${index}]`, file);
      });
    }
    const { data: response } = await api.post(
      apiRouters.CHAT_MESSAGES(`${chatRoomCode}`),
      formData,
      {
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            let percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total,
            );
            if (percentCompleted >= 99) {
              percentCompleted = 99;
            }
            setUploadFileStatus((prev) => ({
              ...prev,
              [uuid]: { progress: percentCompleted },
            }));
          }
        },
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      },
    );
    return response;
  };
  const { mutate: handleSendMsgChat } = useMutation(postSendMsg, {
    onSuccess: async (_data, variables) => {
      setUploadFileStatus((prev) => ({
        ...prev,
        [variables.uuid]: { progress: 100 },
      }));
    },
    onError: (_data, variables) => {
      setUploadFileStatus((prev) => ({
        ...prev,
        [variables.uuid]: { progress: 0 },
      }));
    },
    onSettled: () => {},
  });

  const handleConfirmSendMessage = () => {
    const uuidMsg = uuidv4();
    const newMsg = trimUnnecessaryLineBreaks(message) as string;
    const chatRoomMemberIds =
      chatRoomDetail?.participants
        ?.filter((participant) => participant.id !== session?.user.id)
        .map((member) => Number(member.id)) || [];
    let mentionIds = [];
    const isMentionAllMembers = mentionMembers.find(
      (mentionMember) =>
        mentionMember.id == null &&
        mentionMember.fullName == MENTION_ALL_MEMBERS,
    );
    if (isMentionAllMembers) {
      mentionIds = [...chatRoomMemberIds];
    } else {
      mentionIds = mentionMembers.map((member) => Number(member.id)) || [];
    }
    const chatUploadFiles = uploadFiles.map((file) => {
      const newFile = new File([file.file], file.file.name, {
        type: file.file.type,
      });
      const fileUrl = URL.createObjectURL(newFile);
      return {
        compressedFile: fileUrl,
        fileName: file.file.name,
        fileType: file.file.type,
        fileSize: file.file.size,
        uuid: file.uuid,
      };
    });
    setDataMessageDetail([
      {
        uuid: uuidMsg,
        message: newMsg,
        createdAt: getCurrentTimeInJapan(),
        deletedAt: null,
        type: MessageType.MESSAGE,
        isEdited: false,
        task: null,
        sender: {
          fullName: session?.user.profile.fullName || '',
          id: session?.user.id as number,
          organizations: {
            id:
              loggedInUser?.organizations.find(
                (organization) => organization.isMain,
              )?.id || 0,
            name:
              loggedInUser?.organizations.find(
                (organization) => organization.isMain,
              )?.name || '',
          },
        },
        mentions: mentionIds,
        isBookmark: false,
        chatFiles: chatUploadFiles,
      },

      ...dataMessageDetail,
    ]);
    setMessage('');
    if (!editor) return;

    editor.commands.clearContent();
    setMentionMembers([]);
    handleSendMsgChat({
      data: newMsg,
      uuid: uuidMsg,
      mentionIds,
      files: uploadFiles.map((file) => file.file),
      fileUuids: uploadFiles.map((file) => file.uuid),
    });
  };

  // Delete message
  const postDeleteMsg = async () => {
    const { data: response } = await api.delete(
      apiRouters.CHAT_MESSAGES_DETAIL(`${msgIdDeleted}`),
    );
    return response;
  };
  const { mutate: handleDeleteMsgChat } = useMutation(postDeleteMsg, {
    onSuccess: async () => {},
    onError: () => {},
  });

  const handleConfirmDeleteMessage = () => {
    handleDeleteMsgChat();
  };
  // Update message
  const postUpdateMsg = async (data: {
    uuid: string;
    message: string;
    mentionIds: number[];
    files: File[];
    fileUuids: string[];
  }) => {
    const formData = new FormData();
    formData.append('message', data.message);
    formData.append('uuid', data.uuid);
    data.mentionIds.forEach((id) =>
      formData.append('mentionIds', id.toString()),
    );
    data.fileUuids.forEach((id) => formData.append('fileUuids', id.toString()));
    if (data.files && data.files.length > 0) {
      data.files.forEach((file) => {
        formData.append('files', file);
      });
    }

    const { data: response } = await api.patch(
      apiRouters.CHAT_MESSAGES_DETAIL(data.uuid),
      formData,
      {
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            let percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total,
            );
            if (percentCompleted >= 99) {
              percentCompleted = 99;
            }
            setUploadFileStatus((prev) => ({
              ...prev,
              [data.uuid]: { progress: percentCompleted },
            }));
          }
        },
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      },
    );
    return response;
  };
  const { mutate: handleUpdateMsgChat } = useMutation(postUpdateMsg, {
    onSuccess: async (_data, variables) => {
      setUploadFileStatus((prev) => ({
        ...prev,
        [variables.uuid]: { progress: 100 },
      }));
    },
    onError: (_data, variables) => {
      setUploadFileStatus((prev) => ({
        ...prev,
        [variables.uuid]: { progress: 0 },
      }));
    },
    onSettled: () => {
      setMessage('');
    },
  });

  const handleConfirmUpdateMsg = (uuid: string) => {
    if (uuid) {
      if (!editor) return;
      editor.commands.clearContent();
      const chatRoomMemberIds =
        chatRoomDetail?.participants
          ?.filter((participant) => participant.id !== session?.user.id)
          .map((member) => Number(member.id)) || [];
      let mentionIds = [];
      const isMentionAllMembers = mentionMembers.find(
        (mentionMember) =>
          mentionMember.id == null &&
          mentionMember.fullName == MENTION_ALL_MEMBERS,
      );
      if (isMentionAllMembers) {
        mentionIds = [...chatRoomMemberIds];
      } else {
        mentionIds = mentionMembers.map((member) => Number(member.id)) || [];
      }
      setMentionMembers([]);
      handleUpdateMsgChat({
        message: trimUnnecessaryLineBreaks(`${message}`) as string,
        uuid: uuid,
        mentionIds,
        files: uploadFiles.map((file) => file.file),
        fileUuids: preserveFiles.map((file) => file.uuid),
      });
    }
  };

  // Function create  tasks
  const handleConfirmCreateTask = (data: TaskFormData) => {
    const peopleInChargeIds =
      data.peopleInChargeIds &&
      data.peopleInChargeIds
        .filter((item) => item.value !== '')
        .map((item) => ({ peopleInChargeId: item.value }));
    const tagIds = data.tagIds
      ? data.tagIds
          .filter((item) => item.value !== '')
          .map((item) => ({ tagId: item.value }))
      : [];

    const planList = data.plans
      ? data.plans
          .filter((item) => item.planStartDate !== null)
          .map((item) => {
            return {
              scheduleId: item.scheduleId || null,
              planStartDate:
                item.planStartDate && item.planStartTime
                  ? addTimeToDate(
                      item.planStartDate as Date,
                      item.planStartTime,
                    )
                  : null,
              planEndDate:
                item.planEndDate && item.planEndTime
                  ? addTimeToDate(item.planEndDate as Date, item.planEndTime)
                  : null,
            };
          })
      : null;
    const todoListData =
      data.todoList && data.todoList.filter((item) => item.content !== '');
    const newWorkCategories = [];
    if (data.categories.LARGE?.value) {
      newWorkCategories.push({
        categoryId:
          `${data.categories.LARGE.value}` == NO_OPTION_CATEGORY
            ? null
            : `${data.categories.LARGE.value}`,
        type: EventWorkCategory.LARGE,
      });
    }
    if (data.categories.MEDIUM.value) {
      newWorkCategories.push({
        categoryId:
          `${data.categories.MEDIUM.value}` == NO_OPTION_CATEGORY
            ? null
            : `${data.categories.MEDIUM.value}`,
        type: EventWorkCategory.MEDIUM,
      });
    }
    if (data.categories.SMALL.value) {
      newWorkCategories.push({
        categoryId:
          `${data.categories.SMALL.value}` == NO_OPTION_CATEGORY
            ? null
            : `${data.categories.SMALL.value}`,
        type: EventWorkCategory.SMALL,
      });
    }

    createTask({
      title: data.title || '',
      type: data.type ? data.type.value.toString() : '',
      statusId: data.statusId ? (data.statusId.value as number) : null,
      priority: data.priority ? data.priority.value.toString() : '',
      deadline:
        data.deadlineDate && data.deadlineTime
          ? addTimeToDate(data.deadlineDate as Date, data.deadlineTime)
          : null,
      description: data.description || '',
      tagIds: tagIds,
      peopleInChargeIds: peopleInChargeIds,
      isImportant: data.isImportant,
      todoList: todoListData,
      taskSchedules: planList && planList.length ? planList : null,
      chatRoomCode: chatRoomCode,
      sendToChat: true,
      categoryIds: newWorkCategories,
      organizationId: data.organization
        ? Number(data.organization.value)
        : null,
      remindCountdown: data.deadlineRemindCountdown?.value
        ? `${data.deadlineRemindCountdown?.value}`
        : null,
      remindType: data.deadlineRemindType?.value
        ? `${data.deadlineRemindType?.value}`
        : null,
    });
  };
  //  Handle call api create task
  const handleCreateTask = async (data: TaskRequest) => {
    setIsLoading(true);
    return await api.post(apiRouters.CREATE_TASK, data);
  };
  // Handle create task and response
  const { mutate: createTask } = useMutation(
    'postCreateTask',
    handleCreateTask,
    {
      onSuccess: async () => {
        setShowModalTask(false);
      },
      onError: (error: AxiosError<any>) => {
        if (error.response?.data.taskSchedules) {
          showErrorToast(error, ERROR_MESSAGE_OVERLAP_TASK);
        }
        showErrorToast(error, ERROR_CREATE_MESSAGE);
      },
      onSettled: () => {
        setIsLoading(false);
      },
    },
  );

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
          `${data.largeCategory.value}` == NO_OPTION_CATEGORY
            ? null
            : `${data.largeCategory.value}`,
        type: EventWorkCategory.LARGE,
      });
    }
    if (data.mediumCategory && data.mediumCategory?.value !== 'undefined') {
      newWorkCategories.push({
        categoryId:
          `${data.mediumCategory.value}` == NO_OPTION_CATEGORY
            ? null
            : `${data.mediumCategory.value}`,
        type: EventWorkCategory.MEDIUM,
      });
    }
    if (data.smallCategory && data.smallCategory?.value !== 'undefined') {
      newWorkCategories.push({
        categoryId:
          `${data.smallCategory.value}` == NO_OPTION_CATEGORY
            ? null
            : `${data.smallCategory.value}`,
        type: EventWorkCategory.SMALL,
      });
    }
    if (data.type) {
      newType = (data.type as OptionDropdownType).value as string;
    }
    if (data.startDate) {
      if (data.isAllDay) {
        newStartDate = addTimeToDate(
          data.startDate as Date,
          DEFAULT_START_TIME,
        );
      } else {
        if (data.startTime) {
          newStartDate = addTimeToDate(data.startDate as Date, data.startTime);
        }
      }
    }
    if (data.endDate) {
      if (data.isAllDay) {
        newEndDate = addTimeToDate(data.endDate as Date, DEFAULT_END_TIME);
      } else {
        if (data.endTime) {
          newEndDate = addTimeToDate(data.endDate as Date, data.endTime);
        }
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
      address: data.address || '',
      memo: data.memo || '',
      type: newType,
      sendToChat,
      message: actionsEventMessage,
      categoryIds: newWorkCategories,
      organizationId: data.organization
        ? Number((data.organization as OptionDropdownType).value)
        : null,
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
      },
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
      `${apiRouters.SCHEDULE_DETAIL(data.id)}?message=${encodeURIComponent(actionsEventMessage)}${data.sendToChat ? '&send_to_chat=true' : ''}`,
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
      },
    },
  );

  const handleGetChatRoomDetail = async (params: {
    code: string;
    isRead: boolean;
  }) => {
    if (params.code !== 'null') {
      const apiUrl = params.isRead
        ? `${apiRouters.CHAT_DETAIL(params.code)}?is_read=${params.isRead}`
        : `${apiRouters.CHAT_DETAIL(params.code)}`;
      const { data: response } = await api.get(apiUrl);
      return response;
    }
  };

  const { mutate: getChatRoomDetail } = useMutation(
    'postGetChatRoomDetail',
    handleGetChatRoomDetail,
    {
      onSuccess: () => {},
    },
  );

  const editor = useEditor({
    extensions: [
      Document,
      Paragraph,
      Text,
      TextStyle,
      Color,
      Mention.configure({
        HTMLAttributes: {
          class: 'mention text-[#0068B6]',
        },
      }),
      Placeholder.configure({
        placeholder: 'メッセージを入力',
      }),
    ],
    content: message,
    onUpdate: ({ editor }: { editor: Editor }) => {
      setMessage(editor.getHTML());
    },
  });

  const handleCheckboxClick = (
    editor: Editor,
    member: ChatParticipant,
    type: string,
  ) => {
    if (!editor) return;

    if (type == 'remove') {
      const { doc, tr } = editor.state;

      doc.descendants((node, pos) => {
        if (node.type.name === 'mention' && node.attrs.id === member.fullName) {
          tr.delete(pos, pos + node.nodeSize);
        }
      });

      editor.view.dispatch(tr);
    } else {
      editor
        .chain()
        .focus()
        .insertContent({
          type: 'mention',
          attrs: {
            id: member.fullName,
          },
        })
        .insertContent(' ')
        .run();
    }
  };

  const handleRemoveParam = () => {
    const params = new URLSearchParams(searchParams);
    params.delete('task');
    params.delete('action');
    params.delete('type');

    router.replace(`?${params.toString()}`);
    setShowModalTask(false);
  };

  const renderImageRound = (type = '', participants: ChatParticipant[]) => {
    switch (type) {
      case ChatRoomType.GROUP:
        return (
          <div className="rounded-full w-[48px] h-[48px] border-[2px] border-white flex items-center justify-center overflow-hidden">
            <ImageRound
              className="w-12 h-12 rounded-full"
              src="/icons/multi-users.svg"
              border="full"
              name="Multi users"
            />
          </div>
        );
      case ChatRoomType.TASK:
        return (
          <div className="rounded-full w-[48px] h-[48px] border-[2px] border-white flex items-center justify-center overflow-hidden">
            <ImageRound
              className="w-12 h-12"
              src="/icons/document.svg"
              border="full"
              name="Task room"
            />
          </div>
        );
      case ChatRoomType.SKILL:
        return (
          <div className="rounded-full w-[48px] h-[48px] border-[2px] border-white flex items-center justify-center overflow-hidden">
            <ImageRound
              className="w-12 h-12"
              src="/icons/skill-room.svg"
              border="full"
              name="Skill room"
            />
          </div>
        );
      case ChatRoomType.CALENDAR:
        return (
          <div className="rounded-full w-[48px] h-[48px] border-[2px] border-white flex items-center justify-center overflow-hidden">
            <ImageRound
              className="w-12 h-12"
              src="/icons/calendar-room.svg"
              border="full"
              name="Calendar room"
            />
          </div>
        );
    }

    const avatarColor =
      dashboardMembers.find((member) => {
        if (type === ChatRoomType.PRIVATE) {
          return (
            member.id ===
            participants.find(
              (participant) => participant.id !== session?.user.id,
            )?.id
          );
        }
        return member.id === session?.user.id;
      })?.avatarColor || '';

    return (
      <div className="rounded-full w-[48px] h-[48px] border-[2px] border-white flex items-center justify-center overflow-hidden">
        <div className="scale-150">
          {AvatarIconWithDynamicColor({
            color: avatarColor,
            size: 33,
            customClassName: 'mt-0.5 ml-0.5',
          })}
        </div>
      </div>
    );
  };

  const getParticipantAvatars = (participants: any, isEditing: boolean) => {
    const slicedParticipants = participants.slice(0, 3);
    const remainingCount =
      participants.length > 3 ? participants.length - 3 : 0;

    return (
      <>
        {slicedParticipants.map((participant: any, index: number) => {
          const participantId = isEditing ? participant : participant.id;
          const avatarColor =
            dashboardMembers.find((member) => member.id == participantId)
              ?.avatarColor || '';
          return (
            <div
              className="ml-[-10px] border-[1px] border-white rounded-full h-[32px] w-[32px]"
              key={index}>
              {AvatarIconWithDynamicColor({
                color: avatarColor,
                size: 33,
                customClassName: '!mt-0',
              })}
            </div>
          );
        })}
        {remainingCount > 0 && (
          <div className="ml-[-10px] flex items-center justify-center bg-[#97A9B2] border-[1px] border-white rounded-full text-sm text-white w-[32px] h-[32px]">
            +{remainingCount}
          </div>
        )}
      </>
    );
  };

  const handleRemoveChatMember = async (editedParticipantList: number[]) => {
    setIsLoading(true);
    const response = await api.patch(apiRouters.CHAT_DETAIL(chatRoomCode), {
      participantIds: editedParticipantList,
    });
    return response;
  };

  const { mutate: removeChatMember } = useMutation(
    'removeChatMember',
    handleRemoveChatMember,
    {
      onSuccess: () => {
        showToast({
          description: SUCCESS_UPDATE_MESSAGE,
        });
      },
      onError: (error: AxiosError<any>) => {
        showErrorToast(error, ERROR_UPDATE_MESSAGE);
      },
      onSettled: () => {
        setSelectedRemoveMemberId(undefined);
        setIsLoading(false);
        setOpenConfirmRemoveMemberModal(false);
        setOpenSettingBox(true);
      },
    },
  );

  useEffect(() => {
    if (message.length) {
      setMentionMembers((prevMentionMembers) =>
        prevMentionMembers.filter((member) =>
          message.includes(member.fullName),
        ),
      );
    }
  }, [message]);

  const mentionMemberOptions = chatRoomDetail
    ? [
        {
          id: null,
          fullName: MENTION_ALL_MEMBERS,
        },
        ...(chatRoomParticipantsEditing.find(
          (room) => room.roomCode === chatRoomDetail.code,
        )
          ? chatRoomParticipantsEditing
              .find((room) => room.roomCode === chatRoomDetail.code)
              ?.participantsList.map((participantId) => {
                const member = dashboardMembers.find(
                  (member) => member.id === participantId,
                );
                return {
                  id: participantId,
                  fullName: member?.fullName || '',
                };
              }) || []
          : chatRoomDetail?.participants || []),
      ]
    : [];

  const handleUpdateBookmark = (dataUuid: string, dataIsBookmark: boolean) => {
    setDataMessageDetail((prevMessages) =>
      prevMessages.map((item) =>
        item.uuid === dataUuid ? { ...item, isBookmark: dataIsBookmark } : item,
      ),
    );
  };

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
                results: prev.results.map((item) =>
                  item.uuid === bookmark.uuid
                    ? { ...item, isBookmark: bookmark.isBookmark }
                    : item,
                ),
              }
            : prev,
        );
      },
      onError: () => {},
      onSettled: () => {},
    },
  );

  const handleQuoteTaskUser = (data: { id: number; title: string }[]) => {
    if (!editor) return;

    const content = data
      .map(
        (item) =>
          `<p><span class="quote-task-${item.id}"  style="color: #77858F;">[タスク]</span> <span style="color: #0068B7;">${item.title}</span></p>`,
      )
      .join('');

    editor.chain().focus().insertContent(content).run();
  };

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    if (file.size > MAX_FILE_SIZE) {
      setOpenErrorUploadFileModal(true);
      return;
    }
    const newFile = new File([file], file.name, {
      type: file.type,
    });
    setUploadFiles((prev) => [
      ...prev,
      {
        file: newFile,
        uuid: uuidv4(),
      },
    ]);
    setOpenUploadFilesModal(true);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setOpenDroppingFileModal(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length > 0) {
      const invalidFiles = droppedFiles.filter(
        (file) => file.size > MAX_FILE_SIZE,
      );

      if (invalidFiles.length > 0) {
        setOpenErrorUploadFileModal(true);
        return;
      }

      const filesWithUUID = droppedFiles.map((file) => ({
        uuid: uuidv4(),
        file,
      }));

      setUploadFiles((prevFiles) => [...prevFiles, ...filesWithUUID]);
    }
    setOpenUploadFilesModal(true);
  };

  useEffect(() => {
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setOpenUploadFilesModal(false);
      setOpenDroppingFileModal(true);
    };

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (
        !e.relatedTarget ||
        !document.body.contains(e.relatedTarget as Node)
      ) {
        setOpenDroppingFileModal(false);
      }
    };

    const handleDropOutside = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (uploadFiles.length > 0) {
        setOpenDroppingFileModal(false);
        setOpenUploadFilesModal(true);
      }
    };

    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('drop', handleDropOutside);

    return () => {
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('drop', handleDropOutside);
    };
  }, [uploadFiles]);

  const handleReactionClick = (msgUuid: string, icon: string) => {
    setDataMessageDetail((prev) =>
      prev.map((message) =>
        message.uuid === msgUuid
          ? {
              ...message,
              reactions: message.reactions?.some(
                (reaction) => reaction.icon === icon,
              )
                ? message.reactions.map((reaction) =>
                    reaction.icon === icon
                      ? {
                          ...reaction,
                          users: reaction.users.includes(
                            session?.user.id as number,
                          )
                            ? reaction.users
                            : [...reaction.users, session?.user.id as number],
                        }
                      : reaction,
                  )
                : [
                    ...(message.reactions || []),
                    { icon, users: [session?.user.id as number] },
                  ],
            }
          : message,
      ),
    );
    setChatRoomNotifications({
      notifications: 0,
      roomCode: chatRoomCode,
    });
  };

  const handleRemoveReactionClick = (msgUuid: string, icon: string) => {
    setDataMessageDetail((prev) =>
      prev.map((message) =>
        message.uuid === msgUuid
          ? {
              ...message,
              reactions: message.reactions
                ?.map((reaction) =>
                  reaction.icon === icon
                    ? {
                        ...reaction,
                        users: reaction.users.filter(
                          (id) => id !== (session?.user.id as number),
                        ),
                      }
                    : reaction,
                )
                .filter((reaction) => reaction.users.length > 0),
            }
          : message,
      ),
    );
  };

  const handleResetChatRoomNotification = () => {
    if (chatRoomNotifications && chatRoomNotifications?.notifications > 0) {
      getChatRoomDetail({ code: chatRoomCode, isRead: true });
    }
    setTotalNotifications((prevTotalNotifications) => {
      const chatRoomIndex = dataChatList.findIndex(
        (room) => room.code == chatRoomCode,
      );
      if (
        dataChatList &&
        chatRoomIndex != -1 &&
        dataChatList[chatRoomIndex] &&
        dataChatList[chatRoomIndex].unreadMessages
      ) {
        return (
          prevTotalNotifications - dataChatList[chatRoomIndex].unreadMessages
        );
      }
      return prevTotalNotifications;
    });
    setDataChatList((prevDataChatList) => {
      const newDataChatList = [...prevDataChatList];
      const chatRoomIndex = newDataChatList.findIndex(
        (room) => room.code == chatRoomCode,
      );
      if (
        newDataChatList &&
        chatRoomIndex != -1 &&
        newDataChatList[chatRoomIndex] &&
        newDataChatList[chatRoomIndex].unreadMessages
      ) {
        newDataChatList[chatRoomIndex].unreadMessages = 0;
      }
      return newDataChatList;
    });
    setFilteredChatList((prevFilterChatList) => {
      const newFilterChatList = [...prevFilterChatList];
      const chatRoomIndex = newFilterChatList.findIndex(
        (room) => room.code == chatRoomCode,
      );
      if (
        newFilterChatList &&
        chatRoomIndex != -1 &&
        newFilterChatList[chatRoomIndex] &&
        newFilterChatList[chatRoomIndex].unreadMessages
      ) {
        newFilterChatList[chatRoomIndex].unreadMessages = 0;
      }
      return newFilterChatList;
    });
    setChatRoomNotifications({
      notifications: 0,
      roomCode: chatRoomCode,
    });
  };

  return (
    <Fragment>
      {chatRoomCode && (
        <div
          className="flex flex-col flex-grow w-[calc(100vw_-_600px)] !bg-[#F8FAFC] !h-[100vh]"
          onClick={handleResetChatRoomNotification}>
          <div
            className="flex justify-between items-center px-4 py-2 !w-full border-b-[2px] text-white"
            style={{
              background: 'linear-gradient(to right, #0E8DC5, #0D6FBA)',
            }}>
            <div className={`flex items-center w-[60%] gap-2`}>
              {chatRoomDetail && (
                <>
                  <div className="!min-w-[48px]">
                    {renderImageRound(
                      chatRoomDetail?.type,
                      chatRoomDetail?.participants || [],
                    )}
                  </div>
                  <p
                    className={`text-[20px] font-bold text-ellipsis break-all overflow-hidden ${chatRoomDetail?.type != ChatRoomType.GROUP ? 'w-[100%]' : 'max-w-[calc(100%_-_370px)]'}   ml-3`}
                    style={{
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                    }}>
                    {chatRoomDetail
                      ? chatRoomCode &&
                        chatRoomNameEditing.find(
                          (room) => room.roomCode === chatRoomCode,
                        )
                        ? chatRoomNameEditing.find(
                            (room) => room.roomCode === chatRoomCode,
                          )?.roomName
                        : chatRoomDetail?.name
                      : chatRoomCode &&
                          chatRoomNameEditing.find(
                            (room) => room.roomCode === chatRoomCode,
                          )
                        ? chatRoomNameEditing.find(
                            (room) => room.roomCode === chatRoomCode,
                          )?.roomName
                        : ''}
                  </p>
                </>
              )}
              <div className="max-w-[280px] w-[280px] ml-3">
                {chatRoomDetail &&
                  chatRoomDetail.type === ChatRoomType.GROUP && (
                    <div className="flex gap-2 items-center">
                      <p className="text-[13px] mr-3 text-[#FFFFFFB2]">
                        メンバー
                        {chatRoomDetail &&
                        chatRoomParticipantsEditing.find(
                          (room) => room.roomCode === chatRoomDetail.code,
                        )
                          ? chatRoomParticipantsEditing.find(
                              (room) => room.roomCode === chatRoomDetail.code,
                            )?.participantsList.length
                          : chatRoomDetail?.participants?.length}
                        人
                      </p>
                      <Tippy
                        content={'グループのメンバーを見る'}
                        arrow={false}
                        delay={1000}
                        placement="top"
                        offset={[0, 5]}>
                        <div className="flex">
                          {chatRoomDetail &&
                          chatRoomParticipantsEditing.find(
                            (room) => room.roomCode === chatRoomDetail.code,
                          )
                            ? getParticipantAvatars(
                                chatRoomParticipantsEditing.find(
                                  (room) =>
                                    room.roomCode === chatRoomDetail.code,
                                )?.participantsList || [],
                                true,
                              )
                            : getParticipantAvatars(
                                chatRoomDetail?.participants || [],
                                false,
                              )}
                        </div>
                      </Tippy>

                      <Tippy
                        content={'グループにメンバーを招待する'}
                        arrow={false}
                        delay={1000}
                        placement="top"
                        offset={[0, 5]}>
                        <div>
                          <Button
                            sz="sm"
                            className="w-fit text-xs min-w-[80px] !px-[10px] !py-[8px] !bg-[#FFFFFF4D] !border-none"
                            onClick={() => setOpenAddMembersBox(true)}
                            type="button">
                            招待する
                          </Button>
                        </div>
                      </Tippy>
                    </div>
                  )}
              </div>
            </div>

            <div className="flex gap-2 items-center">
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
                    {[
                      ChatRoomType.GROUP,
                      ChatRoomType.TASK,
                      ChatRoomType.SKILL,
                      ChatRoomType.CALENDAR,
                    ].map(
                      (type) =>
                        chatRoomDetail?.code == chatRoomCode &&
                        chatRoomDetail?.type == type && (
                          <Tippy
                            content={'設定'}
                            arrow={false}
                            delay={1000}
                            key={type}
                            placement="top"
                            offset={[0, 5]}>
                            <div>
                              <ImageRound
                                className="w-[26px] h-[26px] hover:cursor-pointer"
                                src="/icons/setting-chat.svg"
                                border="full"
                                name="Setting icon"
                                onClick={() => setOpenSettingBox(true)}
                              />
                            </div>
                          </Tippy>
                        ),
                    )}
                  </>
                )}
            </div>
          </div>
          <div
            ref={chatContainerRef}
            className={`${chatRoomDetail?.type == ChatRoomType.TASK || chatRoomDetail?.type == ChatRoomType.SKILL || chatRoomDetail?.type == ChatRoomType.CALENDAR ? 'h-[calc(100vh_-_170px)]' : 'h-[calc(100vh_-_380px)]'} pb-3 ${dataMessageDetail.length > 0 && !initialLoad ? 'overflow-y-auto' : 'overflow-y-hidden'}  overflow-x-hidden scrollbar-gutter-stable flex flex-col-reverse scroll-smooth`}>
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
            {dataMessageDetail &&
              chatRoomNotifications &&
              dataMessageDetail
                .slice(0, chatRoomNotifications.notifications)
                .map((item) => (
                  <div
                    key={item.id}
                    ref={item.id == gotoMessageId ? gotoMessageRef : null}>
                    <MessageDetail
                      chatRoomDetail={chatRoomDetail}
                      uploadFileStatus={uploadFileStatus}
                      messageDetail={item}
                      msgEditing={msgEditing}
                      editor={editor}
                      dashboardMembers={dashboardMembers}
                      setPreserveFiles={setPreserveFiles}
                      setOpenUploadFilesModal={setOpenUploadFilesModal}
                      setUploadFiles={setUploadFiles}
                      setMentionMembers={setMentionMembers}
                      setMessage={setMessage}
                      setMsgEditing={setMsgEditing}
                      setMsgIdDeleted={setMsgIdDeleted}
                      setOpenConfirmDeleteModal={setOpenConfirmDeleteModal}
                      setMsgIdUpdated={setMsgIdUpdated}
                      handleConfirmUpdateMsg={handleConfirmUpdateMsg}
                      handleConfirmGetDataDetailEvent={
                        handleConfirmGetDataDetailEvent
                      }
                      setDataMessageDetail={({
                        uuid,
                        isBookmark,
                      }: {
                        uuid: string;
                        isBookmark: boolean;
                      }) => {
                        handleUpdateBookmark(uuid, isBookmark);
                      }}
                      handleReactionClick={handleReactionClick}
                      handleRemoveReactionClick={handleRemoveReactionClick}
                      handleResetChatRoomNotification={
                        handleResetChatRoomNotification
                      }
                    />
                  </div>
                ))}
            {dataMessageDetail?.length > 0 &&
            chatRoomNotifications &&
            chatRoomNotifications.notifications > 0 ? (
              <div className="flex items-center gap-5 justify-center">
                <div className="wavy-line"></div>
                <p className="text-[13px] text-[#0068B6] break-all min-w-[105px]">
                  未読のメッセージ
                </p>
                <div className="wavy-line"></div>
              </div>
            ) : null}
            {dataMessageDetail &&
              chatRoomNotifications &&
              dataMessageDetail
                .slice(
                  chatRoomNotifications.notifications,
                  dataMessageDetail.length,
                )
                .map((item) => (
                  <div
                    key={item.id}
                    ref={item.id == gotoMessageId ? gotoMessageRef : null}>
                    <MessageDetail
                      chatRoomDetail={chatRoomDetail}
                      uploadFileStatus={uploadFileStatus}
                      messageDetail={item}
                      editor={editor}
                      msgEditing={msgEditing}
                      dashboardMembers={dashboardMembers}
                      setPreserveFiles={setPreserveFiles}
                      setOpenUploadFilesModal={setOpenUploadFilesModal}
                      setUploadFiles={setUploadFiles}
                      setMentionMembers={setMentionMembers}
                      setMessage={setMessage}
                      setMsgEditing={setMsgEditing}
                      setMsgIdDeleted={setMsgIdDeleted}
                      setOpenConfirmDeleteModal={setOpenConfirmDeleteModal}
                      setMsgIdUpdated={setMsgIdUpdated}
                      handleConfirmUpdateMsg={handleConfirmUpdateMsg}
                      handleConfirmGetDataDetailEvent={
                        handleConfirmGetDataDetailEvent
                      }
                      setDataMessageDetail={({
                        uuid,
                        isBookmark,
                      }: {
                        uuid: string;
                        isBookmark: boolean;
                      }) => {
                        handleUpdateBookmark(uuid, isBookmark);
                      }}
                      handleReactionClick={handleReactionClick}
                      handleRemoveReactionClick={handleRemoveReactionClick}
                      handleResetChatRoomNotification={
                        handleResetChatRoomNotification
                      }
                    />
                  </div>
                ))}
          </div>
          {chatRoomDetail ? (
            <>
              {[
                ChatRoomType.GROUP,
                ChatRoomType.PRIVATE,
                ChatRoomType.SELF,
              ].map(
                (type) =>
                  chatRoomDetail?.type == type && (
                    <div
                      key={type}
                      className="px-8 py-1 !box-border max-w-[100%] border-t-[#D2DBE1] border-t-[1px]">
                      <div className="flex justify-between items-center">
                        <div className="flex gap-1 items-center">
                          {chatRoomDetail?.type == ChatRoomType.GROUP && (
                            <>
                              <ChatMentionMembersList
                                editor={editor}
                                mentionMemberOptions={mentionMemberOptions}
                                searchMentionMembers={searchMentionMembers}
                                mentionMembers={mentionMembers}
                                dashboardMembers={dashboardMembers}
                                customModalPosition={
                                  'left-[-125px] top-[-310px]'
                                }
                                customArrowPosition={
                                  'after:top-full after:border-t-white'
                                }
                                setMentionMembers={setMentionMembers}
                                handleCheckboxClick={handleCheckboxClick}
                                setSearchMentionMembers={
                                  setSearchMentionMembers
                                }
                              />
                            </>
                          )}
                          <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            onChange={(e) => {
                              handleFileChange(e);
                            }}
                          />

                          <Tippy
                            content={'ファイルを送信'}
                            arrow={false}
                            delay={1000}
                            placement="top"
                            offset={[0, 8]}>
                            <div
                              className="hover:bg-[#77858F26] rounded-full p-[7px] hover:cursor-pointer"
                              onClick={() => {
                                fileInputRef.current?.click();
                              }}>
                              <ImageRound
                                name="Add file"
                                src="/icons/add-file.svg"
                                className="w-[16px] h-[16px]"
                              />
                            </div>
                          </Tippy>
                          <Tippy
                            content={'リアクション'}
                            arrow={false}
                            delay={1000}
                            placement="top"
                            offset={[0, 8]}>
                            <div className="hover:bg-[#77858F26] rounded-full p-[7px] hover:cursor-pointer">
                              <ImageRound
                                name="Smile"
                                src="/icons/smile.svg"
                                className="w-[16px] h-[16px]"
                              />
                            </div>
                          </Tippy>

                          {session?.user.permissions &&
                            hasPermissionInArray(
                              session?.user.permissions,
                              PermissionsSystem.MY_TASK_ADD,
                            ) && (
                              // List task for user
                              <ListTaskUserChat
                                handleQuoteTaskUser={handleQuoteTaskUser}
                              />
                            )}
                          <Tippy
                            content={'書式設定'}
                            arrow={false}
                            delay={1000}
                            placement="top"
                            offset={[0, 8]}>
                            <p className="!font-thin text-[#77858F] hover:bg-[#77858F26] rounded-full p-[3px] hover:cursor-pointer flex justify-between items-center w-8 h-8">
                              <span className="w-[20px] ml-1 mt-[-3px]">
                                Aa
                              </span>
                            </p>
                          </Tippy>
                        </div>

                        <div className="flex items-center gap-3">
                          {session?.user.permissions &&
                            hasPermissionInArray(
                              session?.user.permissions,
                              PermissionsSystem.CHAT_UPDATE,
                            ) &&
                            msgIdUpdated && (
                              <Button
                                className="w-[120px]"
                                variant="outline"
                                onClick={() => {
                                  setMsgIdUpdated && setMsgIdUpdated(undefined);
                                  setPreserveFiles([]);
                                  setUploadFiles([]);
                                  setMentionMembers([]);
                                  setMessage && setMessage('');
                                  if (!editor) return;
                                  editor.commands.clearContent();
                                }}>
                                キャンセル
                              </Button>
                            )}
                          {session?.user.permissions &&
                            hasPermissionInArray(
                              session?.user.permissions,
                              PermissionsSystem.CHAT_ADD,
                            ) && (
                              <Button
                                className="w-[100px]"
                                type="submit"
                                onClick={() => {
                                  if (msgIdUpdated) {
                                    handleConfirmUpdateMsg(msgIdUpdated);
                                  } else {
                                    handleConfirmSendMessage();
                                  }
                                }}
                                disabled={
                                  trimUnnecessaryLineBreaks(
                                    message as string,
                                  ) === ''
                                }>
                                送信
                              </Button>
                            )}
                        </div>
                      </div>
                      <div className="mt-5">
                        <EditorContent editor={editor} />
                      </div>
                    </div>
                  ),
              )}
            </>
          ) : (
            <div className="flex flex-col items-start ml-3">
              <RowSkeleton className="!h-[50px] w-[700px] mb-2" />
              <RowSkeleton className="!h-[80] w-[600px] mb-2" />
              <RowSkeleton className="!h-[100px] w-[720px] mb-2" />
            </div>
          )}
        </div>
      )}
      {openErrorUploadFileModal && (
        <ErrorChatUploadFileValidationModal
          open={true}
          message={UPLOAD_FILE_MAXIMUM_SZIE}
          onClose={() => {
            setOpenErrorUploadFileModal(false);
          }}
        />
      )}
      {openDroppingFileModal && (
        <ChatDroppingFileModal
          open={true}
          onDropFile={handleDrop}
          onClose={() => {
            setOpenDroppingFileModal(false);
          }}
          onUploadFile={(e: ChangeEvent<HTMLInputElement>) => {
            handleFileChange(e);
          }}
        />
      )}
      {openSearchMessagesModal && (
        <SearchMessagesModal
          open={true}
          dashboardMembers={dashboardMembers}
          searchMessageResults={searchMessageResults}
          searchChatMsg={searchChatMsg}
          setSearchChatMsg={setSearchChatMsg}
          searchResultsPage={searchResultsPage}
          setSearchMessageResults={setSearchMessageResults}
          setSearchResultsPage={setSearchResultsPage}
          hasMoreSearchResultDetail={hasMoreSearchResultDetail}
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
            setOpenSearchMessagesModal(false);
            setGotoMessageId(Number(data.messageId));
            gotoSelectedMessage({
              bookmarkMessageId: Number(data.messageId),
            });
          }}
          handleBookmark={(data: { uuid: string; isBookmark: boolean }) => {
            bookMarkMsg(data);
          }}
        />
      )}
      {openSettingBox && (
        <ChatSettingModal
          open={true}
          onClose={() => setOpenSettingBox(false)}
          code={`${chatRoomCode}`}
          dashboardMembers={dashboardMembers}
          openAddMemberModal={() => {
            setOpenSettingBox(false);
            setOpenAddMembersBox(true);
            setOpenAddMembersBoxFromSetting(true);
          }}
          openConfirmRemoveModal={(id: number) => {
            setOpenSettingBox(false);
            setOpenConfirmRemoveMemberModal(true);
            setSelectedRemoveMemberId(id);
          }}
        />
      )}
      {openConfirmRemoveMemberModal && (
        <ConfirmRemoveChatMemberModal
          open={true}
          code={`${chatRoomCode}`}
          onClose={() => {
            setOpenConfirmRemoveMemberModal(false);
            setOpenSettingBox(true);
          }}
          dashboardMembers={dashboardMembers}
          selectedRemoveMemberId={selectedRemoveMemberId}
          onConfirm={(memberIds: number[]) => {
            removeChatMember(memberIds);
          }}
        />
      )}
      {openAddMembersBox && (
        <ActionsChatMembersModal
          open={true}
          onClose={() => {
            setOpenAddMembersBox(false);
            if (openAddMembersBoxFromSetting) {
              setOpenSettingBox(true);
              setOpenAddMembersBoxFromSetting(false);
            }
          }}
          dashboardMembers={dashboardMembers}
          participantsList={
            chatRoomCode &&
            chatRoomParticipantsEditing.find(
              (room) => room.roomCode === chatRoomCode,
            )
              ? chatRoomParticipantsEditing.find(
                  (room) => room.roomCode === chatRoomCode,
                )?.participantsList
              : getChatParticipantIds(
                  chatRoomDetail ? chatRoomDetail.participants : [],
                )
          }
          code={`${chatRoomCode}`}
        />
      )}
      {openConfirmDeleteModal && (
        <ConfirmDeleteModal
          open={openConfirmDeleteModal}
          type="メッセージ"
          onConfirm={handleConfirmDeleteMessage}
          onClose={() => setOpenConfirmDeleteModal(false)}
        />
      )}
      {openEditEventModal && (
        <ActionsEventModal
          open={openEditEventModal}
          dataEvent={dataEventEdit}
          action={ActionsEvent.EDIT}
          onClose={() => {
            setDataEventEdit(undefined);
            setOpenEditEventModal(false);
            setBackToEditing(false);
          }}
          onEdit={(data) => {
            setConfirmEventDataToEdit(data);
            setOpenEditEventModal(false);
            setOpenConfirmEditEventModal(true);
          }}
          onDelete={(data) => {
            setConfirmEventDataToEdit(data);
            setOpenEditEventModal(false);
            setOpenConfirmDeleteEventModal(true);
          }}
          creationDataEventCalendar={creationDataEventCalendar}
          backToEditing={backToEditing}
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
      {isShowModalTask && (
        <ActionsTaskModal
          open={isShowModalTask}
          columnId={`${StatusValueTask.NOT_STARTED}`}
          action={ActionTask.CREATE}
          dataTask={dataTaskEdit}
          authenticatedUser={loggedInUser}
          peopleDefaultId={`${session?.user.id}`}
          disableDeleteAction={true}
          onClose={() => {
            setDataTaskEdit(null);
            handleRemoveParam();
          }}
          onWarning={({
            reset,
            resetDataCategoryOptions,
          }: {
            reset: () => void;
            resetDataCategoryOptions: () => void;
          }) => {
            setResetFunctions({
              resetDataCategoryOptions,
              reset,
            });
            setOpenWarningCloseModal(true);
          }}
          onSubmit={handleConfirmCreateTask}
          dashboardMemberList={dashboardMemberList}
          creationDataTaskData={creationDataTaskData}
        />
      )}
      {openWarningCloseModal && (
        <WarningCloseTaskModal
          open={openWarningCloseModal}
          onClose={() => {
            setOpenWarningCloseModal(false);
          }}
          onConfirm={() => {
            setShowModalTask(false);
            setOpenWarningCloseModal(false);
            setDataTaskEdit(null);
            handleRemoveParam();
            setIsLoading(false);
            resetFunctions.resetDataCategoryOptions?.();
            resetFunctions.reset?.();
          }}
        />
      )}
      {openUploadFilesModal && (
        <ChatUploadingFilesModal
          message={message}
          uploadFiles={uploadFiles}
          preserveFiles={preserveFiles}
          chatRoomDetail={chatRoomDetail}
          setPreserveFiles={setPreserveFiles}
          setMessage={setMessage}
          setUploadFiles={setUploadFiles}
          handleFileChange={handleFileChange}
          mentionMemberOptions={mentionMemberOptions}
          searchMentionMembers={searchMentionMembers}
          mentionMembers={mentionMembers}
          dashboardMembers={dashboardMembers}
          setMentionMembers={setMentionMembers}
          handleCheckboxClick={handleCheckboxClick}
          setSearchMentionMembers={setSearchMentionMembers}
          open={true}
          onSubmit={() => {
            if (msgIdUpdated) {
              handleConfirmUpdateMsg(msgIdUpdated);
              setPreserveFiles([]);
            } else {
              handleConfirmSendMessage();
            }
            setUploadFiles([]);
            setOpenUploadFilesModal(false);
          }}
          onClose={() => {
            setOpenUploadFilesModal(false);
            setUploadFiles([]);
            setPreserveFiles([]);
            setMsgIdUpdated && setMsgIdUpdated(undefined);
            setMentionMembers([]);
            setMessage('');
          }}
        />
      )}
    </Fragment>
  );
};

export default ChatDetail;
