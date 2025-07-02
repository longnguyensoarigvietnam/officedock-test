'use client';

import { AxiosError } from 'axios';
import { useMutation, useQueryClient } from 'react-query';
import {
  ChangeEvent,
  Fragment,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { debounce } from 'lodash';
import { useSessionCache } from '@providers/SessionCacheProvider';

import { v4 as uuidv4 } from 'uuid';
import { useRouter, useSearchParams } from 'next/navigation';
import { Document } from '@tiptap/extension-document';
import { Mention } from '@tiptap/extension-mention';
import { Paragraph } from '@tiptap/extension-paragraph';
import { Text } from '@tiptap/extension-text';
import { EditorContent, useEditor, Editor } from '@tiptap/react';
import { Placeholder } from '@tiptap/extension-placeholder';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';

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
import CustomUserAvatar from '@components/common/AvatarIcon/CustomUserAvatar';
import ConfirmActionsEventModal from '@components/modals/ConfirmActionsEventModal';
import ConfirmRemoveChatMemberModal from '@components/modals/ConfirmRemoveChatMemberModal';
import WarningCloseTaskModal from '@components/modals/WarningCloseTaskModal';
import ChatUploadingFilesModal from '@components/modals/ChatUploadingFilesModal';
import ChatDroppingFileModal from '@components/modals/ChatDroppingFileModal';
import { MessageDetail } from '@components/chat/MessageDetail';
import { SearchMessagesModal } from '@components/modals/SearchMessagesModal';
import ListTaskUserChat from '@components/chat/ListTaskUserChat';
import { TaskQuote } from '@components/chat/CustomTaskQuote';
import { CustomReaction } from '@components/chat/CustomIcon';
import { DynamicTooltip } from '@components/tooltip/DynamicTooltip';
import ErrorUploadFileValidationModal from '@components/modals/ErrorUploadFileValidationModal';
import MemoDataChat from '@components/chat/MemoDataChat';

import { apiRouters } from '@constants/routers';
import {
  BATCH_FILE_SIZE,
  DEFAULT_END_TIME,
  DEFAULT_START_TIME,
  MAX_FILE_SIZE,
  MENTION_ALL_MEMBERS,
  NO_OPTION_CATEGORY,
  PAGINATION_PAGE_SIZE_HIGHT,
  REACTION_LIST,
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
  ReactionIconValue,
  ItemStartType,
} from '@constants/enums';
import {
  ERROR_DELETE_MESSAGE,
  ERROR_MESSAGE_OVERLAP_TASK,
  ERROR_NOT_FOUND_EVENT,
  ERROR_NOT_FOUND_TASK,
  ERROR_SAVE_MESSAGE,
  ERROR_UPDATE_MESSAGE,
  SUCCESS_DELETE_MESSAGE,
  SUCCESS_UPDATE_MESSAGE,
  UPLOAD_CHAT_FILE_MAXIMUM_SIZE,
} from '@constants/message';

import useChatRoomDetail from '@hooks/useChatRoomDetail';
import useCreationDataEventCalendar from '@hooks/useCreationDataEventCalendar';
import { useErrorToast } from '@hooks/useErrorToast';
import useAuthenticatedUser from '@hooks/useAuthenticatedUser';

import { addTimeToDate, getCurrentTimeInJapan } from '@utils/date';
import {
  getFileURL,
  getChunkSize,
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
import { Profile } from '@interfaces/user';
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
  hasMoreDetailOnScrollDown: boolean;
  setLastItemId: React.Dispatch<
    React.SetStateAction<number | null | undefined>
  >;
  setHasMoreDetail: React.Dispatch<React.SetStateAction<boolean>>;
  setHasMoreDetailOnScrollDown: React.Dispatch<React.SetStateAction<boolean>>;
  setDataChatList: React.Dispatch<React.SetStateAction<ChatRoomItem[]>>;
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
  dataChatList,
  hasMoreDetail,
  chatRoomCode,
  dashboardMemberList,
  dashboardMembers,
  creationDataTaskData,
  searchChatMsg,
  hasMoreDetailOnScrollDown,
  setHasMoreDetailOnScrollDown,
  setFilteredChatList,
  setHasMoreDetail,
  setLastItemId,
  setDataChatList,
  handleRemoveChatRoomParam,
  setSearchChatMsg,
}: dataProps) => {
  const { data: session } = useSessionCache();

  // Params
  const searchParams = useSearchParams();
  const params = new URLSearchParams(searchParams);
  const messageBookmarkId = searchParams.get('messageId');

  const queryClient = useQueryClient();

  const optionIconRef = useRef<HTMLDivElement | null>(null);

  const router = useRouter();

  // Toasts
  const showErrorToast = useErrorToast();
  const { showToast } = useToast();

  // Room actions
  const [openSettingBox, setOpenSettingBox] = useState<boolean>(false);
  const [openConfirmRemoveMemberModal, setOpenConfirmRemoveMemberModal] =
    useState<boolean>(false);
  const [openAddMembersBox, setOpenAddMembersBox] = useState<boolean>(false);
  const [openAddMembersBoxFromSetting, setOpenAddMembersBoxFromSetting] =
    useState<boolean>(false);
  const [message, setMessage] = useState<string>('');
  const [page, _setPage] = useState<number>(1);
  const [actionsEventMessage, setActionsEventMessage] = useState<string>('');
  const [dataMessageDetail, setDataMessageDetail] = useState<
    ChatMessageResponse[]
  >([]);
  const [selectedRemoveMemberId, setSelectedRemoveMemberId] =
    useState<number>();

  // Context
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
  const {
    abortChatSendingMessageControllerRef,
    setIsChatFilesUploading,
    setTotalNotifications,
  } = useContext(GlobalStateContext);

  const [openConfirmDeleteModal, setOpenConfirmDeleteModal] = useState(false);

  // Extend data chat more
  const [isExtendMoreData, setExtendMoreData] = useState(false);

  // Events
  const [openEditEventModal, setOpenEditEventModal] = useState<boolean>(false);
  const [openConfirmEditEventModal, setOpenConfirmEditEventModal] =
    useState(false);
  const [openConfirmDeleteEventModal, setOpenConfirmDeleteEventModal] =
    useState(false);
  const [dataEventEdit, setDataEventEdit] = useState<EventEditFormData>();
  const [backToEditing, setBackToEditing] = useState(false);
  const { creationDataEventCalendar } = useCreationDataEventCalendar({});
  const [confirmEventDataToEdit, setConfirmEventDataToEdit] =
    useState<EventEditFormData>();

  // Delete / update messages
  const [msgIdDeleted, setMsgIdDeleted] = useState<string>();
  const [msgIdUpdated, setMsgIdUpdated] = useState<string>();
  const [msgEditing, setMsgEditing] = useState<string | undefined>();
  const { refetchChatRoomDetail, chatRoomDetail } = useChatRoomDetail({
    code: `${chatRoomCode}`,
  });

  // User info
  const { authenticatedUser } = useAuthenticatedUser({});

  // Loading messages
  const [initialLoad, setInitialLoad] = useState<boolean>(false);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const [isLoadingNewer, setIsLoadingNewer] = useState(false);

  // Mention
  const [mentionMembers, setMentionMembers] = useState<ChatParticipant[]>([]);
  const [searchMentionMembers, setSearchMentionMembers] = useState<string>('');

  // Jump to message
  const [lastGotoMessageId, setLastGotoMessageId] = useState<number | null>();
  const [gotoMessageId, setGotoMessageId] = useState<number | null>();
  const gotoMessageRef = useRef<HTMLDivElement | null>(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState<
    string | null
  >(null);
  const isJumpingMessagesRef = useRef(false);

  // Quote task
  const [quoteTaskList, setQuoteTaskList] = useState<
    { id: number; title: string }[]
  >([]);

  // Icon
  const [isShowListIcon, setIsShowListIcon] = useState(false);

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
  const isSearchingMessagesRef = useRef(false);

  //Task
  const [isShowModalTask, setShowModalTask] = useState<boolean>(false);
  const [dataTaskEdit, setDataTaskEdit] = useState<Task | null>(null);
  const [openWarningCloseModal, setOpenWarningCloseModal] =
    useState<boolean>(false);
  const [resetFunctions, setResetFunctions] = useState<{
    resetDataCategoryOptions?: () => void;
    reset?: () => void;
  }>({});
  const [pendingTaskData, setPendingTaskData] = useState<TaskFormData | null>();
  const [closeAction, setCloseAction] = useState<ActionTask | null>();
  const actionType = searchParams.get('action');
  const typeDetail = searchParams.get('type');
  const taskDetailId = searchParams.get('task');

  const controllerRef = useRef<AbortController | null>(null);

  // Scroll to selected message
  useEffect(() => {
    if (gotoMessageId) {
      const timer = setTimeout(() => {
        const targetElement = document.querySelector(
          `[data-message-id="${gotoMessageId}"]`,
        );
        if (targetElement) {
          targetElement.scrollIntoView({
            behavior: 'smooth',
            block: 'end',
          });
          setHighlightedMessageId(String(gotoMessageId));
          setGotoMessageId(null);
          setTimeout(() => setHighlightedMessageId(null), 5000);
        }
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [gotoMessageId, dataMessageDetail]);

  // Get message list
  const handleGetDataMessages = async (pageNumber: number) => {
    if (chatRoomCode) {
      setInitialLoad(true);

      // Cancel any previous request
      if (controllerRef.current) {
        controllerRef.current.abort();
      }

      // Create new controller for the new request
      const controller = new AbortController();
      controllerRef.current = controller;

      const apiUrl = `${apiRouters.CHAT_MESSAGES(`${chatRoomCode}`)}?page=${pageNumber}&page_size=${PAGINATION_PAGE_SIZE_HIGHT}${lastItemId ? `&message_id=${lastItemId}` : ''}${messageBookmarkId ? `&bookmark_message_id=${messageBookmarkId}` : ''}`;

      const response = await api.get<BasePagination<ChatMessageResponse[]>>(
        apiUrl,
        {
          signal: controller.signal,
        },
      );
      return response;
    }
  };

  const { mutate: getDataListMessages } = useMutation(
    'getDataListMessages',
    handleGetDataMessages,
    {
      onSuccess: (variables) => {
        if (variables) {
          setHasMoreDetail(Boolean(variables.data.hasNext));
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
        setIsLoadingOlder(false);
        setInitialLoad(false);
      },
      onError: ({ response }: AxiosError) => {
        if (response?.status === ServerStatusCode.NOT_FOUND) {
          handleRemoveChatRoomParam();
        }
      },
    },
  );

  // Jump to selected message
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
      onMutate: () => {
        isJumpingMessagesRef.current = true;
      },
      onSuccess: (data, variables) => {
        if (data) {
          setHasMoreDetail(Boolean(data.data?.hasNext));
          setHasMoreDetailOnScrollDown(true);
          setDataMessageDetail(() => {
            const uniqueMessages = [...data.data.results].filter(
              (msg, index, self) =>
                self.findIndex((m) => m.id === msg.id) === index,
            );

            return uniqueMessages;
          });

          setLastGotoMessageId(data.data.results[0].id);
          setGotoMessageId(Number(variables.bookmarkMessageId));

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
        isJumpingMessagesRef.current = false;
      },
      onError: ({ response }: AxiosError) => {
        if (response?.status === ServerStatusCode.NOT_FOUND) {
          handleRemoveChatRoomParam();
        }
        isJumpingMessagesRef.current = false;
      },
      onSettled: () => {
        setInitialLoad(false);
      },
    },
  );

  // Get message list on scroll down
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
        setIsLoadingNewer(false);
      },
      onError: ({ response }: AxiosError) => {
        if (response?.status === ServerStatusCode.NOT_FOUND) {
          handleRemoveChatRoomParam();
        }
      },
    },
  );

  // Search messages
  const handleSearchMessagesInChatRoom = async (data: {
    searchChatMsg: string;
    pageNumber: number;
    roomType: string;
  }) => {
    if (chatRoomCode) {
      if (data.pageNumber == 1) setIsLoading(true);
      const encodedQuery = encodeURIComponent(data.searchChatMsg);
      const apiUrl = `${apiRouters.CHAT_MESSAGES(chatRoomCode)}?${
        data.searchChatMsg ? `message=${encodedQuery}` : ''
      }${data.pageNumber ? `&page=${data.pageNumber}` : ''}${data.roomType ? `&chatroom_type=${data.roomType}` : ''}`;

      return await api.get<BasePagination<ChatMessageResponse[]>>(apiUrl);
    }
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

  useEffect(() => {
    if (chatRoomCode) {
      getDataListMessages(page);
    }
    return () => {
      if (controllerRef.current) {
        controllerRef.current.abort();
      }
      setIsLoadingOlder && setIsLoadingOlder(false);
      setIsLoadingNewer && setIsLoadingNewer(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatRoomCode]);

  const chatContainerRef = useRef<HTMLDivElement | null>(null);

  // Handle call API when scroll to top / bottom
  useEffect(() => {
    const chatContainer = chatContainerRef.current;

    const handleScroll = debounce(() => {
      if (!chatContainer) return;
      if (isJumpingMessagesRef.current) return;

      const isAtTop =
        Math.round(
          chatContainer.clientHeight + Math.abs(chatContainer.scrollTop),
        ) >= Math.round(0.9 * chatContainer.scrollHeight);

      const isAtBottom = Math.floor(Math.abs(chatContainer.scrollTop)) <= 10;

      if (isAtTop && hasMoreDetail) {
        setIsLoadingOlder(true);
        getDataListMessages(page);
      } else if (isAtBottom && hasMoreDetailOnScrollDown) {
        chatContainer.scrollTop = -20;
        setIsLoadingNewer(true);
        getDataListMessagesOnScrollDown({ pageNumber: page, sorting: true });
      }
    }, 200);

    if (chatContainer) {
      chatContainer.addEventListener('scroll', handleScroll);
    }

    return () => {
      if (chatContainer) {
        chatContainer.removeEventListener('scroll', handleScroll);
      }
      handleScroll.cancel?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMoreDetail, hasMoreDetailOnScrollDown, page]);

  useEffect(() => {
    const chatContainer = chatContainerRef.current;
    if (!chatContainer) return;

    if (isLoadingOlder || isLoadingNewer) {
      chatContainer.style.overflow = 'hidden';
    } else {
      chatContainer.style.overflow = 'auto';
    }

    return () => {
      if (chatContainer) chatContainer.style.overflow = 'auto';
    };
  }, [isLoadingOlder, isLoadingNewer]);

  // Text editor declaration
  const editor = useEditor({
    extensions: [
      Document,
      TaskQuote,
      Paragraph.extend({
        addAttributes() {
          return {
            'data-task-id': {
              default: null,
              renderHTML(attributes) {
                if (!attributes['data-task-id']) {
                  return {};
                }
                return { 'data-task-id': attributes['data-task-id'] };
              },
              parseHTML(element) {
                return {
                  'data-task-id': element.getAttribute('data-task-id'),
                };
              },
            },
          };
        },
      }),
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
      CustomReaction,
    ],
    content: message,
    onUpdate: ({ editor }: { editor: Editor }) => {
      setMessage(editor.getHTML());
    },
    editorProps: {
      handlePaste(_view, event) {
        const clipboardData = event.clipboardData;
        const text = clipboardData?.getData('text/plain');

        if (text) {
          // Insert only plain text, no formatting
          editor && editor.commands.insertContent(text);
          return true; // prevent default paste
        }

        return false; // let Tiptap handle it if no plain text
      },
    },
  });

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

  // Delete message (local)
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

  // Update message (local)
  const handleUpdateMessageLocal = useCallback(
    (data: WebSocketMessageData) => {
      const chatFileList = data.chatMessage.chatFiles.map((file) => {
        return {
          ...file,
          compressedFile: getFileURL(file.compressedFile || ''),
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

  // Delete task (local)
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

  // Update group (local)
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

  // Remove participants (local)
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
                  compressedFile: getFileURL(file.compressedFile || ''),
                };
              });
              setDataMessageDetail((prev) => {
                const newMessage = {
                  ...data.chatMessage,
                  chatFiles: chatFileList,
                };
                const allMessages = [newMessage, ...prev];

                // Remove duplicates by id
                const uniqueMessages = Array.from(
                  new Map(allMessages.map((msg) => [msg.id, msg])).values(),
                );

                return uniqueMessages;
              });

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
  const uploadFileInChunks = async (
    file: File,
    fileUuid: string,
    messageUuid: string,
    totalChunksOfAllFiles: number,
    uploadedChunksRef: { current: number },
  ) => {
    const chunkSize = getChunkSize(file.size);
    const totalChunks = Math.ceil(file.size / chunkSize);

    for (
      let batchStart = 0;
      batchStart < totalChunks;
      batchStart += BATCH_FILE_SIZE
    ) {
      const batchEnd = Math.min(batchStart + BATCH_FILE_SIZE, totalChunks);

      const uploadPromises = Array.from(
        { length: batchEnd - batchStart },
        async (_, i) => {
          const chunkIndex = batchStart + i;
          const start = chunkIndex * chunkSize;
          const end = Math.min(start + chunkSize, file.size);
          const chunk = file.slice(start, end);

          const formData = new FormData();
          formData.append('fileUuid', fileUuid);
          formData.append('fileName', file.name);
          formData.append('fileType', file.type);
          formData.append('fileSize', file.size.toString());
          formData.append('chunkIndex', chunkIndex.toString());
          formData.append('totalChunks', totalChunks.toString());
          formData.append('chunkFile', chunk);

          try {
            await api.post(apiRouters.CHAT_UPLOAD_CHUNK, formData);
            uploadedChunksRef.current += 1;

            const percentCompleted = Math.round(
              (uploadedChunksRef.current / totalChunksOfAllFiles) * 100,
            );

            setUploadFileStatus((prev) => ({
              ...prev,
              [messageUuid]: { progress: Math.min(percentCompleted, 99) },
            }));
          } catch (error) {
            setUploadFileStatus({});
          }
        },
      );

      // Wait for the current batch to finish before proceeding
      try {
        await Promise.all(uploadPromises);
      } catch {
        return false;
      }
    }

    return true;
  };

  const postSendMsg = async ({
    data,
    uuid,
    mentionIds,
    files,
    fileUuids,
    taskIds,
  }: {
    data: string;
    uuid: string;
    mentionIds: number[];
    files: File[];
    fileUuids: string[];
    taskIds: number[];
  }) => {
    const totalChunks = files.reduce((acc, file) => {
      const chunkSize = getChunkSize(file.size);
      return acc + Math.ceil(file.size / chunkSize);
    }, 0);

    const uploadedChunksRef = { current: 0 };
    const abortController = new AbortController();
    abortChatSendingMessageControllerRef.current = abortController;

    try {
      await Promise.all(
        files.map((file, i) =>
          uploadFileInChunks(
            file,
            fileUuids[i],
            uuid,
            totalChunks,
            uploadedChunksRef,
          ),
        ),
      );
    } catch {
      return;
    }

    const formData = new FormData();
    formData.append('message', data);
    formData.append('uuid', uuid);
    formData.append('clientId', clientId);
    mentionIds.forEach((id) => formData.append('mentionIds', id.toString()));
    taskIds.forEach((id) => formData.append('taskIds', id.toString()));
    fileUuids.forEach((id) => formData.append('fileUuids', id.toString()));
    try {
      const { data: response } = await api.post(
        apiRouters.CHAT_MESSAGES(`${chatRoomCode}`),
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          signal: abortController.signal,
        },
      );
      return response;
    } finally {
      abortChatSendingMessageControllerRef.current = null;
    }
  };

  const { mutate: handleSendMsgChat } = useMutation(postSendMsg, {
    onSuccess: async (_data, variables) => {
      setUploadFileStatus((prev) => ({
        ...prev,
        [variables.uuid]: { progress: 100 },
      }));
    },
    onError: (error: AxiosError<any>) => {
      setUploadFileStatus({});
      showErrorToast(error, ERROR_SAVE_MESSAGE);
    },
    onSettled: () => {
      setIsChatFilesUploading(false);
    },
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
    const taskIds = quoteTaskList.map((task) => task.id);
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
              authenticatedUser?.organizations.find(
                (organization) => organization.isMain,
              )?.id || 0,
            name:
              authenticatedUser?.organizations.find(
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
    setUploadFileStatus((prev) => ({
      ...prev,
      [uuidMsg]: { progress: 0 },
    }));
    setMessage('');
    if (!editor) return;

    editor.commands.clearContent();
    setMentionMembers([]);
    setQuoteTaskList([]);
    if (uploadFiles.length > 0) {
      setIsChatFilesUploading(true);
    }
    handleSendMsgChat({
      data: newMsg,
      uuid: uuidMsg,
      mentionIds,
      files: uploadFiles.map((file) => file.file),
      fileUuids: uploadFiles.map((file) => file.uuid),
      taskIds: taskIds,
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

  function cleanMessageHTML(html: string): string {
    const container = document.createElement('div');
    container.innerHTML = html;

    container.querySelectorAll('p, div').forEach((el) => {
      el.removeAttribute('data-task-id');
      el.removeAttribute('data-title');
    });

    return container.innerHTML;
  }

  // Update message
  const postUpdateMsg = async (data: {
    uuid: string;
    message: string;
    mentionIds: number[];
    files: File[];
    fileUuids: string[];
  }) => {
    const totalChunks = data.files.reduce((acc, file) => {
      const chunkSize = getChunkSize(file.size);
      return acc + Math.ceil(file.size / chunkSize);
    }, 0);

    const uploadedChunksRef = { current: 0 };

    try {
      await Promise.all(
        data.files.map((file, i) =>
          uploadFileInChunks(
            file,
            data.fileUuids[i],
            data.uuid,
            totalChunks,
            uploadedChunksRef,
          ),
        ),
      );
    } catch {
      return;
    }

    const formData = new FormData();
    formData.append('message', cleanMessageHTML(data.message));
    formData.append('uuid', data.uuid);
    data.mentionIds.forEach((id) =>
      formData.append('mentionIds', id.toString()),
    );
    data.fileUuids.forEach((id) => formData.append('fileUuids', id.toString()));

    const { data: response } = await api.patch(
      apiRouters.CHAT_MESSAGES_DETAIL(data.uuid),
      formData,
      {
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
    onError: () => {
      setUploadFileStatus({});
    },
    onSettled: () => {
      setMessage('');
      setIsChatFilesUploading(false);
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
      setUploadFileStatus((prev) => ({
        ...prev,
        [uuid]: { progress: 0 },
      }));
      if ([...uploadFiles, ...preserveFiles].length > 0) {
        setIsChatFilesUploading(true);
      }
      handleUpdateMsgChat({
        message: trimUnnecessaryLineBreaks(`${message}`) as string,
        uuid: uuid,
        mentionIds,
        files: uploadFiles.map((file) => file.file),
        fileUuids: [
          ...uploadFiles.map((file) => file.uuid),
          ...preserveFiles.map((file) => file.uuid),
        ],
      });
    }
  };

  // Edit task
  const handleEditTask = async (data: TaskRequest) => {
    setIsLoading(true);
    return await api.patch(apiRouters.TASK_DETAIL(`${data.id}`), data);
  };
  const { mutate: editTask } = useMutation('postEditTask', handleEditTask, {
    onSuccess: async () => {
      handleRemoveParam();
      queryClient.refetchQueries(['getTaskHeaderStart']);
      queryClient.refetchQueries(['getDataStatistic']);

      showToast({
        description: SUCCESS_UPDATE_MESSAGE,
      });
      setDataTaskEdit(null);
      setShowModalTask(false);
      setPendingTaskData(null);
      setCloseAction(null);
    },
    onError: (error: AxiosError<any>) => {
      if (error.response?.data.taskSchedules) {
        showErrorToast(error, ERROR_MESSAGE_OVERLAP_TASK);
      } else showErrorToast(error, ERROR_UPDATE_MESSAGE);
    },
    onSettled: () => {
      setTimeout(() => {
        setIsLoading(false);
      }, 500);
    },
  });

  const handleConfirmEditTask = (data: TaskFormData) => {
    const tagIds = data.tagIds
      ? data.tagIds
          .filter((item) => item.value !== '')
          .map((item) => ({ tagId: item.value }))
      : [];

    const peopleInChargeIds =
      data.peopleInChargeIds &&
      data.peopleInChargeIds
        .filter((item) => item.value !== '')
        .map((item) => ({ peopleInChargeId: item.value }));

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

    editTask({
      id: data.id,
      title: data.title,
      statusId: data.statusId ? (data.statusId.value as number) : null,
      priority: data.priority ? data.priority.value.toString() : '',
      deadline:
        data.deadlineDate && data.deadlineTime
          ? addTimeToDate(data.deadlineDate as Date, data.deadlineTime)
          : null,
      description: data.description,
      tagIds: tagIds,
      categoryIds: newWorkCategories,
      isImportant: data.isImportant,
      todoList: todoListData,
      taskSchedules: planList && planList.length ? planList : [],
      oldIdStatus: data.oldIdStatus,
      sendToChat: true,
      peopleInChargeIds: peopleInChargeIds,
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

  // Edit event
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

  // Get event info
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

  // Delete event
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

  // Get chat room detail
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

  // Handle click to checkbox to select member to mention
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

  // Remove param
  const handleRemoveParam = () => {
    const params = new URLSearchParams(searchParams);
    params.delete('task');
    params.delete('action');
    params.delete('type');

    router.replace(`?${params.toString()}`);
    setShowModalTask(false);
  };

  // Render avatar
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

    const memberInfo = dashboardMembers.find((member) => {
      if (type === ChatRoomType.PRIVATE) {
        return (
          member.id ===
          participants.find(
            (participant) => participant.id !== session?.user.id,
          )?.id
        );
      }
      return member.id === session?.user.id;
    });

    return (
      <div className="rounded-full w-[48px] h-[48px] border-[2px] border-white flex items-center justify-center overflow-hidden">
        <div className="scale-150">
          <CustomUserAvatar
            avatarUrl={memberInfo?.avatarUrl || ''}
            avatarColor={memberInfo?.avatarColor || ''}
            size={33}
            customClassName={`${!memberInfo?.avatarUrl && 'mt-0.5 ml-0.5'}`}
          />
        </div>
      </div>
    );
  };

  // Get room avatar
  const getParticipantAvatars = (participants: any, isEditing: boolean) => {
    const slicedParticipants = participants.slice(0, 3);
    const remainingCount =
      participants.length > 3 ? participants.length - 3 : 0;

    return (
      <>
        {slicedParticipants.map((participant: any, index: number) => {
          const participantId = isEditing ? participant : participant.id;
          const memberInfo = dashboardMembers.find(
            (member) => member.id == participantId,
          );
          return (
            <div
              className="ml-[-10px] border-[1px] border-white rounded-full h-[35px] w-[35px]"
              key={index}>
              <CustomUserAvatar
                avatarUrl={memberInfo?.avatarUrl || ''}
                avatarColor={memberInfo?.avatarColor || ''}
                size={33}
                customClassName={`${!memberInfo?.avatarUrl && '!mt-0'}`}
              />
            </div>
          );
        })}
        {remainingCount > 0 && (
          <div className="ml-[-10px] flex items-center justify-center bg-[#97A9B2] border-[1px] border-white rounded-full text-sm text-white w-[35px] h-[35px]">
            +{remainingCount}
          </div>
        )}
      </>
    );
  };

  // Remove chat member
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
        refetchChatRoomDetail();
      },
      onError: (error: AxiosError<any>) => {
        showErrorToast(error, ERROR_UPDATE_MESSAGE);
      },
      onSettled: () => {
        setSelectedRemoveMemberId(undefined);
        setIsLoading(false);
        setOpenConfirmRemoveMemberModal(false);
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

  // Update bookmark message
  const handleUpdateBookmark = (dataUuid: string) => {
    setDataMessageDetail((prevMessages) =>
      prevMessages.map((item) =>
        item.uuid === dataUuid
          ? { ...item, isBookmark: !item.isBookmark }
          : item,
      ),
    );
    handleResetChatRoomNotification();
  };

  // Bookmark message
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

  // Quote task
  const handleQuoteTaskUser = (data: { id: number; title: string }[]) => {
    if (!editor) return;

    data.forEach((item, index) => {
      if (index > 0) {
        editor.chain().focus().insertContent({ type: 'paragraph' }).run();
      }

      editor
        .chain()
        .focus()
        .insertContent({
          type: 'taskQuote',
          attrs: {
            id: item.id.toString(),
            title: item.title,
          },
        })
        .run();

      editor.chain().focus().insertContent({ type: 'paragraph' }).run();
    });
  };

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

  // Get task info
  const handleGetDataDetailTask = async (id: number) => {
    setIsLoading(true);
    const { data: response } = await api.get(apiRouters.TASK_DETAIL(`${id}`));
    return response;
  };

  const { mutate: getDataDetailTask } = useMutation(
    'getDetailTask',
    handleGetDataDetailTask,
    {
      onSuccess: async (data) => {
        setDataTaskEdit(data);
        setShowModalTask(true);
      },
      onError: () => {
        handleRemoveParam();
        showToast({
          variant: 'error',
          description: ERROR_NOT_FOUND_TASK,
        });
      },
      onSettled: () => {
        setTimeout(() => {
          setIsLoading(false);
        }, 200);
      },
    },
  );

  useEffect(() => {
    if (
      actionType &&
      (typeDetail === ItemStartType.TASK ||
        typeDetail === ItemStartType.FIXED_TASK) &&
      dataTaskEdit != null
    ) {
      if (taskDetailId) {
        setShowModalTask(true);
        getDataDetailTask(parseInt(taskDetailId));
      } else {
        setShowModalTask(true);
      }
    } else {
      setShowModalTask(false);
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getDataDetailTask, taskDetailId, actionType, typeDetail]);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Handle file change
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    const totalSize =
      uploadFiles.reduce(
        (acc, uploadedFile) => acc + uploadedFile.file.size,
        0,
      ) + file.size;
    if (totalSize > MAX_FILE_SIZE) {
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

  // Handle drop file
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setOpenDroppingFileModal(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length > 0) {
      const totalDroppedFilesSize = droppedFiles.reduce(
        (acc, file) => acc + file.size,
        0,
      );
      const totalPreviousFilesSize = uploadFiles.reduce(
        (acc, uploadedFile) => acc + uploadedFile.file.size,
        0,
      );

      if (totalDroppedFilesSize + totalPreviousFilesSize > MAX_FILE_SIZE) {
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

      if (!e.relatedTarget || !document.body.contains(e.relatedTarget as any)) {
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

  // Reaction message
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

  // Remove reactions
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

  // Reset room notification
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

  // Function to insert reaction into editor
  const insertReaction = (reaction: {
    name: string;
    src: string;
    value: ReactionIconValue;
  }) => {
    editor
      ?.chain()
      .focus()
      .insertContent({
        type: 'customReaction',
        attrs: {
          src: reaction.src,
          name: reaction.name,
        },
      })
      .run();
  };

  useEffect(() => {
    const handleClickOutside = (event: any) => {
      if (
        optionIconRef.current &&
        !optionIconRef.current.contains(event.target)
      ) {
        setIsShowListIcon(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <>
      {chatRoomCode && (
        <>
          <div
            className="flex relative  flex-col flex-grow  !bg-[#F8FAFC] !h-[100vh]"
            onClick={handleResetChatRoomNotification}>
            {/* Header */}
            <div
              className="flex justify-between items-center px-4 py-2 min-h-[78px] !w-full border-b-[2px] text-white"
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
                        <p className="text-[13px] mr-3 text-[#FFFFFFB2] text-nowrap">
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
                        <DynamicTooltip
                          content={'グループのメンバーを見る'}
                          placement="top">
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
                        </DynamicTooltip>

                        <DynamicTooltip
                          content={'グループにメンバーを招待する'}
                          placement="top">
                          <div>
                            <Button
                              sz="sm"
                              className="w-fit text-xs min-w-[80px] !px-[10px] !py-[8px] !bg-[#FFFFFF4D] !border-none"
                              onClick={() => setOpenAddMembersBox(true)}
                              type="button">
                              招待する
                            </Button>
                          </div>
                        </DynamicTooltip>
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
                      searchMessagesInChatRoom({
                        searchChatMsg,
                        pageNumber: 1,
                        roomType:
                          chatRoomDetail?.type == ChatRoomType.CALENDAR ||
                          chatRoomDetail?.type == ChatRoomType.SKILL ||
                          chatRoomDetail?.type == ChatRoomType.TASK
                            ? chatRoomDetail?.type || ''
                            : '',
                      });
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
                            <DynamicTooltip
                              content={'設定'}
                              key={type}
                              placement="left"
                              customOffset={{
                                left: -40,
                              }}>
                              <div>
                                <ImageRound
                                  className="w-[26px] h-[26px] hover:cursor-pointer"
                                  src="/icons/setting-chat.svg"
                                  border="full"
                                  name="Setting icon"
                                  onClick={() => setOpenSettingBox(true)}
                                />
                              </div>
                            </DynamicTooltip>
                          ),
                      )}
                    </>
                  )}
              </div>
            </div>
            {/* Content */}
            <div className="flex w-full justify-between ">
              <div className="flex-grow">
                {/* Message list */}
                <div
                  ref={chatContainerRef}
                  className={`${chatRoomDetail?.type == ChatRoomType.TASK || chatRoomDetail?.type == ChatRoomType.SKILL || chatRoomDetail?.type == ChatRoomType.CALENDAR ? 'h-[calc(100vh_-_170px)]' : 'h-[calc(100vh_-_386px)]'} pb-3 ${dataMessageDetail.length > 0 && !initialLoad ? 'overflow-y-auto' : 'overflow-y-hidden'}  overflow-x-hidden scrollbar-gutter-stable flex pr-0 flex-col-reverse scroll-smooth`}>
                  {isLoadingNewer && (
                    <div className="flex  flex-col items-start ml-3">
                      <RowSkeleton className="!h-[30px] w-[700px] mb-2" />
                      <RowSkeleton className="!h-[50px] w-[600px] mb-2" />
                    </div>
                  )}
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
                          data-message-id={item.id}
                          ref={
                            item.id == gotoMessageId ? gotoMessageRef : null
                          }>
                          <MessageDetail
                            chatRoomDetail={chatRoomDetail}
                            uploadFileStatus={uploadFileStatus}
                            messageDetail={item}
                            msgEditing={msgEditing}
                            editor={editor}
                            chatContainerRef={chatContainerRef}
                            dashboardMembers={dashboardMembers}
                            highlightedMessageId={highlightedMessageId}
                            setPreserveFiles={setPreserveFiles}
                            setOpenUploadFilesModal={setOpenUploadFilesModal}
                            setUploadFiles={setUploadFiles}
                            setMentionMembers={setMentionMembers}
                            setMessage={setMessage}
                            setMsgEditing={setMsgEditing}
                            setMsgIdDeleted={setMsgIdDeleted}
                            setOpenConfirmDeleteModal={
                              setOpenConfirmDeleteModal
                            }
                            setMsgIdUpdated={setMsgIdUpdated}
                            handleActionEditTask={handleActionEditTask}
                            handleConfirmUpdateMsg={handleConfirmUpdateMsg}
                            handleConfirmGetDataDetailEvent={
                              handleConfirmGetDataDetailEvent
                            }
                            handleUpdateBookmark={handleUpdateBookmark}
                            handleReactionClick={handleReactionClick}
                            handleRemoveReactionClick={
                              handleRemoveReactionClick
                            }
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
                          data-message-id={item.id}
                          ref={
                            item.id == gotoMessageId ? gotoMessageRef : null
                          }>
                          <MessageDetail
                            chatRoomDetail={chatRoomDetail}
                            uploadFileStatus={uploadFileStatus}
                            messageDetail={item}
                            editor={editor}
                            msgEditing={msgEditing}
                            chatContainerRef={chatContainerRef}
                            dashboardMembers={dashboardMembers}
                            highlightedMessageId={highlightedMessageId}
                            setPreserveFiles={setPreserveFiles}
                            setOpenUploadFilesModal={setOpenUploadFilesModal}
                            setUploadFiles={setUploadFiles}
                            setMentionMembers={setMentionMembers}
                            setMessage={setMessage}
                            setMsgEditing={setMsgEditing}
                            setMsgIdDeleted={setMsgIdDeleted}
                            setOpenConfirmDeleteModal={
                              setOpenConfirmDeleteModal
                            }
                            setMsgIdUpdated={setMsgIdUpdated}
                            handleActionEditTask={handleActionEditTask}
                            handleConfirmUpdateMsg={handleConfirmUpdateMsg}
                            handleConfirmGetDataDetailEvent={
                              handleConfirmGetDataDetailEvent
                            }
                            handleUpdateBookmark={handleUpdateBookmark}
                            handleReactionClick={handleReactionClick}
                            handleRemoveReactionClick={
                              handleRemoveReactionClick
                            }
                            handleResetChatRoomNotification={
                              handleResetChatRoomNotification
                            }
                          />
                        </div>
                      ))}
                  {isLoadingOlder && (
                    <div className="flex flex-col items-start ml-3">
                      <RowSkeleton className="!h-[30px] w-[700px] mb-2" />
                      <RowSkeleton className="!h-[50px] w-[600px] mb-2" />
                    </div>
                  )}
                </div>
                {/* Options and text editor */}
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
                            className="px-8 pt-1 py-3 !box-border max-w-[100%] border-t-[#D2DBE1] border-t-[1px]">
                            <div className="flex justify-between items-center">
                              <div className="flex gap-1 items-center">
                                {chatRoomDetail?.type == ChatRoomType.GROUP && (
                                  <>
                                    <ChatMentionMembersList
                                      editor={editor}
                                      mentionMemberOptions={
                                        mentionMemberOptions
                                      }
                                      searchMentionMembers={
                                        searchMentionMembers
                                      }
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

                                <DynamicTooltip
                                  content={'ファイルを送信'}
                                  placement="top">
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
                                </DynamicTooltip>
                                <div
                                  onClick={() =>
                                    setIsShowListIcon(!isShowListIcon)
                                  }
                                  className="relative">
                                  <DynamicTooltip
                                    content={'リアクション'}
                                    placement="top">
                                    <div className="hover:bg-[#77858F26] rounded-full p-[7px] hover:cursor-pointer">
                                      <ImageRound
                                        name="Smile"
                                        src="/icons/smile.svg"
                                        className="w-[16px] h-[16px]"
                                      />
                                    </div>
                                  </DynamicTooltip>
                                  {isShowListIcon && (
                                    <div
                                      style={{
                                        boxShadow: '0px 4px 8px 0px #0000000F',
                                      }}
                                      ref={optionIconRef}
                                      className="w-[190px] h-[44px] absolute after:content-[''] after:absolute  after:top-full after:left-1/2 after:-translate-x-1/2 after:border-8 after:border-transparent after:border-t-white rounded-lg top-[-54px] bg-white flex items-center gap-3 justify-center left-[-81px]">
                                      {REACTION_LIST.map((icon) => {
                                        return (
                                          <DynamicTooltip
                                            content={icon.tooltipContent}
                                            key={icon.name}
                                            placement="top">
                                            <div
                                              onClick={() =>
                                                insertReaction(icon)
                                              }
                                              className={` rounded-ful`}>
                                              <ImageRound
                                                name={icon.name}
                                                src={icon.src}
                                                className="w-fit h-fit hover:cursor-pointer hover:opacity-60"
                                              />
                                            </div>
                                          </DynamicTooltip>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>

                                {session?.user.permissions &&
                                  hasPermissionInArray(
                                    session?.user.permissions,
                                    PermissionsSystem.MY_TASK_ADD,
                                  ) && (
                                    // List task for user
                                    <ListTaskUserChat
                                      quoteTaskList={quoteTaskList}
                                      setQuoteTaskList={setQuoteTaskList}
                                      handleQuoteTaskUser={handleQuoteTaskUser}
                                    />
                                  )}
                                <DynamicTooltip
                                  content={'書式設定'}
                                  placement="top">
                                  <p className="!font-thin text-[#77858F] hover:bg-[#77858F26] rounded-full p-[3px] hover:cursor-pointer flex justify-between items-center w-8 h-8">
                                    <span className="w-[20px] ml-1 mt-[-3px]">
                                      Aa
                                    </span>
                                  </p>
                                </DynamicTooltip>
                              </div>

                              <div className="flex items-center gap-3 mt-2">
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
                                        setMsgIdUpdated &&
                                          setMsgIdUpdated(undefined);
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
                                      className="w-[100px] h-9"
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
                            <div className="mt-5 !max-w-full">
                              <EditorContent
                                editor={editor}
                                className="w-full break-all whitespace-pre-wrap"
                              />
                            </div>
                          </div>
                        ),
                    )}
                  </>
                ) : (
                  <div className="px-8 py-1 !box-border max-w-[100%] border-t-[#D2DBE1] border-t-[1px]">
                    <div className="flex justify-between items-center">
                      <div className="flex gap-1 items-center">
                        <DynamicTooltip content={'メンション'} placement="top">
                          <div className="hover:bg-[#77858F26] rounded-full p-[7px] flex items-center justify-center hover:cursor-pointer">
                            <ImageRound
                              name="Mention"
                              src="/icons/mention.svg"
                              className="w-[16px] h-[16px]"
                            />
                          </div>
                        </DynamicTooltip>
                        <DynamicTooltip
                          content={'ファイルを送信'}
                          placement="top">
                          <div className="hover:bg-[#77858F26] rounded-full p-[7px] hover:cursor-pointer">
                            <ImageRound
                              name="Add file"
                              src="/icons/add-file.svg"
                              className="w-[16px] h-[16px]"
                            />
                          </div>
                        </DynamicTooltip>
                        <DynamicTooltip
                          content={'リアクション'}
                          placement="top">
                          <div className="hover:bg-[#77858F26] rounded-full p-[7px] hover:cursor-pointer">
                            <ImageRound
                              name="Smile"
                              src="/icons/smile.svg"
                              className="w-[16px] h-[16px]"
                            />
                          </div>
                        </DynamicTooltip>
                        <DynamicTooltip
                          content={'タスクを引用'}
                          placement="top">
                          <div className="hover:bg-[#77858F26] relative rounded-full p-[7px] hover:cursor-pointer">
                            <ImageRound
                              name="Quote checker"
                              src="/icons/quote-checker.svg"
                              className="w-[18px] h-[18px]"
                            />
                          </div>
                        </DynamicTooltip>
                        <DynamicTooltip content={'書式設定'} placement="top">
                          <p className="!font-thin text-[#77858F] hover:bg-[#77858F26] rounded-full p-[3px] hover:cursor-pointer flex justify-between items-center w-8 h-8">
                            <span className="w-[20px] ml-1 mt-[-3px]">Aa</span>
                          </p>
                        </DynamicTooltip>
                      </div>

                      <div className="flex items-center gap-3">
                        <Button className="w-[100px]" disabled={true}>
                          送信
                        </Button>
                      </div>
                    </div>
                    <div className="mt-5">
                      <div className="border-[1px] border-[#77858f] rounded-[6px] h-[150px] w-full p-[14px]"></div>
                    </div>
                  </div>
                )}
              </div>
              {/* LIST DATA MORE */}
              <div
                style={{
                  boxShadow: '-4px 0px 8px 0px #0000000F',
                }}
                className={`transition-all flex-shrink-0 duration-500 ease-in-out ${
                  isExtendMoreData
                    ? 'w-[320px] opacity-100 translate-x-0'
                    : 'w-0 opacity-0 max-w-0 translate-x-4'
                } bg-[#F5F8FB] rounded-tl-xl  rounded-bl-xl`}>
                {isExtendMoreData && (
                  <MemoDataChat
                    chatRoomCode={chatRoomCode}
                    chatRoomDetail={chatRoomDetail}
                    onClose={() => setExtendMoreData(false)}
                  />
                )}
              </div>
            </div>
            {/* Menu chat more data */}
            {!isExtendMoreData && (
              <div
                onClick={() => setExtendMoreData(true)}
                style={{
                  boxShadow: '0px 2px 8px 0px #0000001A',
                }}
                className="absolute top-[87px] flex gap-2 items-center right-0 rounded-tl-full rounded-bl-full w-[60px] px-[6px] py-[5px] bg-white">
                <ImageRound
                  name="Save"
                  src={`/icons/chat-more.svg`}
                  className="w-9 h-9 hover:cursor-pointer"
                />
                <ImageRound
                  src="/icons/chat-right.svg"
                  name="right"
                  className="!text-transparent h-fit w-fit cursor-pointer"
                />
              </div>
            )}
          </div>
        </>
      )}
      {openErrorUploadFileModal && (
        <ErrorUploadFileValidationModal
          open={true}
          message={UPLOAD_CHAT_FILE_MAXIMUM_SIZE}
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
          isSearchingMessagesRef={isSearchingMessagesRef}
          dashboardMembers={dashboardMembers}
          searchMessageResults={searchMessageResults}
          searchChatMsg={searchChatMsg}
          chatRoomType={chatRoomDetail?.type || ''}
          setSearchChatMsg={setSearchChatMsg}
          searchResultsPage={searchResultsPage}
          setSearchMessageResults={setSearchMessageResults}
          setSearchResultsPage={setSearchResultsPage}
          handleConfirmGetDataDetailEvent={handleConfirmGetDataDetailEvent}
          hasMoreSearchResultDetail={hasMoreSearchResultDetail}
          onSubmit={(searchChatMsg: string, page: number, roomType: string) => {
            searchMessagesInChatRoom({
              searchChatMsg,
              pageNumber: page,
              roomType,
            });
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
          chatRoomDetail={chatRoomDetail}
          code={`${chatRoomCode}`}
          dashboardMembers={dashboardMembers}
          openAddMemberModal={() => {
            setOpenSettingBox(false);
            setOpenAddMembersBox(true);
            setOpenAddMembersBoxFromSetting(true);
          }}
          openConfirmRemoveModal={(id: number) => {
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
          refetchChatRoomDetail={refetchChatRoomDetail}
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
          type={typeDetail || ItemStartType.TASK}
          action={ActionTask.CREATE}
          dataTask={dataTaskEdit}
          authenticatedUser={authenticatedUser}
          peopleDefaultId={`${session?.user.id}`}
          disableDeleteAction={true}
          onClose={() => {
            setDataTaskEdit(null);
            handleRemoveParam();
          }}
          onWarning={({
            reset,
            resetDataCategoryOptions,
            taskData,
            action,
          }: {
            reset: () => void;
            resetDataCategoryOptions: () => void;
            taskData: TaskFormData;
            action: ActionTask;
          }) => {
            setResetFunctions({
              resetDataCategoryOptions,
              reset,
            });
            setPendingTaskData(taskData);
            setCloseAction(action);
            setOpenWarningCloseModal(true);
          }}
          onEdit={handleConfirmEditTask}
          onSubmit={handleConfirmEditTask}
          dashboardMemberList={dashboardMemberList}
          creationDataTaskData={creationDataTaskData}
        />
      )}
      {openWarningCloseModal && (
        <WarningCloseTaskModal
          open={openWarningCloseModal}
          onCloseByIcon={() => {
            setOpenWarningCloseModal(false);
          }}
          onClose={() => {
            setShowModalTask(false);
            setOpenWarningCloseModal(false);
            handleRemoveParam();
            setDataTaskEdit(null);
            setIsLoading(false);
            resetFunctions.resetDataCategoryOptions?.();
            resetFunctions.reset?.();
          }}
          onConfirm={() => {
            setOpenWarningCloseModal(false);
            if (closeAction == ActionTask.EDIT) {
              handleConfirmEditTask(pendingTaskData as TaskFormData);
            }
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
            // Reset file input (prevent same file selection issue)
            if (fileInputRef.current) {
              fileInputRef.current.value = '';
            }
          }}
          onClose={() => {
            setOpenUploadFilesModal(false);
            setUploadFiles([]);
            setPreserveFiles([]);
            setMsgIdUpdated && setMsgIdUpdated(undefined);
            setMentionMembers([]);
            setMessage('');
            // Reset file input (prevent same file selection issue)
            if (fileInputRef.current) {
              fileInputRef.current.value = '';
            }
          }}
        />
      )}
    </>
  );
};

export default ChatDetail;
