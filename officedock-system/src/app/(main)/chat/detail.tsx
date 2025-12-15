'use client';

import {
  Popover,
  PopoverButton,
  PopoverPanel,
  Transition,
} from '@headlessui/react';
import { AxiosError } from 'axios';
import { useMutation } from 'react-query';
import {
  ChangeEvent,
  Dispatch,
  Fragment,
  SetStateAction,
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
import socketEventEmitter from '@components/socket/socketEventEmitter';
import { ChatMentionMembersList } from '@components/modals/ChatMentionMembersModal';
import CustomUserAvatar from '@components/common/AvatarIcon/CustomUserAvatar';
import ConfirmRemoveChatMemberModal from '@components/modals/ConfirmRemoveChatMemberModal';
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
import { MsgQuote } from '@components/chat/CustomMsgQuote';
import { MsgReply } from '@components/chat/CustomMsgReply';
import FilePreview from '@components/custom/FilePreview';
import ActionMuteChatModal from '@components/modals/ActionMuteChatModal';
import { MsgQuoteText } from '@components/chat/CustomMsgQuoteText';
import ConfirmLeaveGroupModal from '@components/modals/ConfirmLeaveGroupModal';
import GroupIconWithDynamicColor from '@components/common/GroupIcon';

import { apiRouters } from '@constants/routers';
import {
  BATCH_FILE_SIZE,
  MAX_FILE_SIZE,
  MENTION_ALL_MEMBERS,
  PAGINATION_PAGE_SIZE_HIGHT,
  REACTION_LIST,
} from '@constants';
import {
  SocketActions,
  ChatRoomType,
  ServerStatusCode,
  ActionTask,
  MessageType,
  PermissionsSystem,
  ReactionIconValue,
  ItemStartType,
} from '@constants/enums';
import {
  ERROR_SAVE_MESSAGE,
  ERROR_UPDATE_MESSAGE,
  SUCCESS_UPDATE_MESSAGE,
  UPLOAD_CHAT_FILE_MAXIMUM_SIZE,
} from '@constants/message';

import useChatRoomDetail from '@hooks/useChatRoomDetail';
import { useErrorToast } from '@hooks/useErrorToast';

import { getCurrentTimeInJapan } from '@utils/date';
import {
  getFileURL,
  getChunkSize,
  hasPermissionInArray,
  trimUnnecessaryLineBreaks,
  extractAndRemoveMsgQuotes,
  getRootPSpanData,
  attachUuidToAllP,
  mapChatFilesToMemo,
} from '@utils';

import {
  ChatDashboardMember,
  ChatFileResponse,
  ChatMessageResponse,
  ChatParticipant,
  ChatRoomDetail,
  ChatRoomItem,
  DataChatFileMemo,
  WebSocketMessageData,
} from '@interfaces/chat';
import { BasePagination } from '@interfaces/common';
import { Profile } from '@interfaces/user';
import { Organizations } from '@interfaces/organization';

import { ChatContext } from '@providers/ChatProvider';
import { LoadingContext } from '@providers/LoadingProvider';
import { useToast } from '@providers/ToastProvider';
import { GlobalStateContext } from '@providers/GlobalStateProvider';

import api from '@base/api';

interface dataProps {
  chatRoomCode: string;
  organizationMain: Organizations | null;
  dataChatList: ChatRoomItem[];
  filteredChatList: ChatRoomItem[];
  searchChatMsg: string;
  clientId: string;
  lastItemId: number | null | undefined;
  hasMoreDetail: boolean;
  dashboardMemberList: Omit<Profile, 'birthday' | 'gender'>[];
  hasMoreDetailOnScrollDown: boolean;
  dataOptionsParticipants: ChatParticipant[];
  setLastItemId: React.Dispatch<
    React.SetStateAction<number | null | undefined>
  >;
  setHasMoreDetail: React.Dispatch<React.SetStateAction<boolean>>;
  setHasMoreDetailOnScrollDown: React.Dispatch<React.SetStateAction<boolean>>;
  setDataChatList: React.Dispatch<React.SetStateAction<ChatRoomItem[]>>;
  setSearchChatMsg: React.Dispatch<React.SetStateAction<string>>;
  handleRemoveChatRoomParam: () => void;
  handleSetChatRoomParam: (code: string) => void;
  setFilteredChatList: Dispatch<SetStateAction<ChatRoomItem[]>>;
}
const ChatDetail = ({
  clientId,
  lastItemId,
  organizationMain,
  dataChatList,
  filteredChatList,
  hasMoreDetail,
  chatRoomCode,
  dashboardMemberList,
  searchChatMsg,
  hasMoreDetailOnScrollDown,
  dataOptionsParticipants,
  setHasMoreDetailOnScrollDown,
  setHasMoreDetail,
  setLastItemId,
  setDataChatList,
  handleRemoveChatRoomParam,
  handleSetChatRoomParam,
  setSearchChatMsg,
  setFilteredChatList,
}: dataProps) => {
  const { data: session } = useSessionCache();

  // Params
  const searchParams = useSearchParams();
  const params = new URLSearchParams(searchParams);
  const messageBookmarkId = searchParams.get('messageId');

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
  const [dataMessageDetail, setDataMessageDetail] = useState<
    ChatMessageResponse[]
  >([]);
  const [pendingMessages, setPendingMessages] = useState<ChatMessageResponse[]>(
    [],
  );
  const [selectedRemoveMemberId, setSelectedRemoveMemberId] =
    useState<number>();

  // Context
  const { chatList, chatRoomNotifications, setChatRoomNotifications } =
    useContext(ChatContext);
  const { setIsLoading } = useContext(LoadingContext);
  const {
    abortChatSendingMessageControllerRef,
    setIsChatFilesUploading,
    setTotalNotifications,
  } = useContext(GlobalStateContext);

  const [openConfirmDeleteModal, setOpenConfirmDeleteModal] = useState(false);

  // Extend data chat more
  const [isExtendMoreData, setExtendMoreData] = useState(false);

  // Delete / update messages
  const [msgIdDeleted, setMsgIdDeleted] = useState<string>();
  const [msgIdUpdated, setMsgIdUpdated] = useState<string>();
  const [msgEditing, setMsgEditing] = useState<string | undefined>();
  const [chatRoomDetail, setChatRoomDetail] = useState<ChatRoomDetail>();
  const { refetchChatRoomDetail } = useChatRoomDetail({
    code: `${chatRoomCode}`,
    onSuccess: (data) => {
      if (data) {
        setChatRoomDetail(data);
      } else {
        setChatRoomDetail(undefined);
      }
    },
  });

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
  const [openErrorUploadFileModal, setOpenErrorUploadFileModal] = useState<{
    status: boolean;
    message: string;
  }>({
    status: false,
    message: '',
  });

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

  // STATE
  const [isShowConfirmLeaveGroup, setShowConfirmLeaveGroup] = useState(false);

  //Task
  const [dataFileAddList, setDataFileAddList] = useState<DataChatFileMemo[]>(
    [],
  );

  const controllerRef = useRef<AbortController | null>(null);
  // Quote message
  const quoteButtonRef = useRef<HTMLButtonElement | null>(null);
  const lastSelectedMessageIdRef = useRef<string | null>(null);

  // Preview files
  const [dataPreviewFile, setDataPreviewFile] = useState<{
    msgId: string;
    file: ChatFileResponse;
    user: ChatDashboardMember;
    createAt: string;
  } | null>(null);

  // Action group
  const [showModalMuteChat, setShowModalMuteChat] = useState(false);

  useEffect(() => {
    setExtendMoreData(false);
  }, [chatRoomCode]);

  // Scroll to selected message
  useEffect(() => {
    if (gotoMessageId && dataMessageDetail) {
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
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [gotoMessageId, dataMessageDetail, lastItemId]);

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

  // Delete message
  const postActionMuteChat = async () => {
    setIsLoading(true);
    const { data: response } = await api.post(
      apiRouters.MUTE_CHAT(`${chatRoomDetail?.code}`),
    );
    return response;
  };
  const { mutate: actionMuteChat, isLoading: isLoadingMute } = useMutation(
    postActionMuteChat,
    {
      onSuccess: async () => { },
      onError: () => { },
      onSettled: () => {
        setIsLoading(false);
      },
    },
  );
  const handleConfirmMuteChat = (data: boolean) => {
    setChatRoomDetail((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        isMuted: data,
      };
    });
    setDataChatList((prev) =>
      prev.map((item) =>
        item.code === chatRoomDetail?.code ? { ...item, isMuted: data } : item,
      ),
    );
    setFilteredChatList((prev) =>
      prev.map((item) =>
        item.code === chatRoomDetail?.code ? { ...item, isMuted: data } : item,
      ),
    );
    actionMuteChat();
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
            const newMessages = data.data.results.slice().reverse();

            const filteredMessages = newMessages.filter(
              (newMsg) =>
                !prev.some((existingMsg) => existingMsg.id === newMsg.id),
            );

            let merged = [...filteredMessages, ...prev];

            // Append pending messages if hasNext=false and they’re not in list
            if (!data.data.hasNext && pendingMessages.length > 0) {
              const notFoundPending = pendingMessages.filter(
                (pm) => !merged.some((msg) => msg.uuid === pm.uuid),
              );

              if (notFoundPending.length > 0) {
                merged = [...notFoundPending, ...merged];
              }
            }

            return merged;
          });

          if (!data.data.hasNext && pendingMessages.length > 0)
            setPendingMessages([]);

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
      const apiUrl = `${apiRouters.CHAT_MESSAGES(chatRoomCode)}?${data.searchChatMsg ? `message=${encodedQuery}` : ''
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
  const editor = useEditor(
    {
      extensions: [
        Document,
        TaskQuote,
        MsgQuote,
        MsgQuoteText,
        MsgReply,
        CustomReaction,
        Paragraph.extend({
          addAttributes() {
            return {
              'data-task-id': {
                default: null,
                renderHTML(attributes: Record<string, unknown>) {
                  const value = attributes['data-task-id'];
                  if (!value) return {};
                  if (typeof value === 'object' && value !== null) {
                    return {
                      'data-task-id':
                        (value as { id?: string }).id ?? JSON.stringify(value),
                    };
                  }
                  return { 'data-task-id': String(value) };
                },
                parseHTML(element: HTMLElement) {
                  const val = element.getAttribute('data-task-id');
                  return val || null;
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
            class: 'mention !text-[#228CDB]',
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
      editorProps: {
        handlePaste(view, event) {
          const clipboardData = event.clipboardData;
          const text = clipboardData?.getData('text/plain');

          if (text?.startsWith('custom:')) {
            editor?.commands.insertContent(`Custom content: ${text}`);
            return true; // stop default paste
          }

          // Otherwise, allow Tiptap to handle it
          return false;
        },
      },
      immediatelyRender: false,
    },
    [chatRoomCode],
  );

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
            task: data.chatMessage.task,
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
    (
      data: WebSocketMessageData,
      dataChatList: ChatRoomItem[],
      filteredChatList: ChatRoomItem[],
    ) => {
      // Update chat room list
      const updatedDataChatList = [...dataChatList];
      const chatRoomIndex = updatedDataChatList.findIndex(
        (room) => room.code == data.chatRoom.code,
      );
      if (chatRoomIndex != -1) {
        updatedDataChatList[chatRoomIndex] = {
          ...updatedDataChatList[chatRoomIndex],
          chatRoom: {
            avatar:
              data.chatRoom?.chatRoom?.avatar || data.chatRoom?.avatar || '',
            avatarColor:
              data.chatRoom?.chatRoom?.avatarColor ||
              data.chatRoom?.avatarColor ||
              '',
          },
          name: data.chatRoom.name,
          participants: data.chatRoom.participants,
        };
        setDataChatList(updatedDataChatList);
      }
      // Update filtered chat room list
      const updatedFilteredDataChatList = [...filteredChatList];
      const filteredChatRoomIndex = updatedFilteredDataChatList.findIndex(
        (room) => room.code == data.chatRoom.code,
      );
      if (filteredChatRoomIndex != -1) {
        updatedFilteredDataChatList[filteredChatRoomIndex] = {
          ...updatedFilteredDataChatList[filteredChatRoomIndex],
          chatRoom: {
            avatar:
              data.chatRoom?.chatRoom?.avatar || data.chatRoom?.avatar || '',
            avatarColor:
              data.chatRoom?.chatRoom?.avatarColor ||
              data.chatRoom?.avatarColor ||
              '',
          },
          name: data.chatRoom.name,
          participants: data.chatRoom.participants,
        };
        setFilteredChatList(updatedFilteredDataChatList);
      }
      if (data.chatRoom.code == chatRoomCode) {
        // Update chat room detail
        setChatRoomDetail((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            name: data.chatRoom.name,
            participants: data.chatRoom.participants,
            avatar:
              data.chatRoom?.chatRoom?.avatar || data.chatRoom?.avatar || '',
            avatarColor:
              data.chatRoom?.chatRoom?.avatarColor ||
              data.chatRoom?.avatarColor ||
              '',
          };
        });
      }
    },
    [setDataChatList, setFilteredChatList, chatRoomCode],
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
      // Update filteredChatList if user is removed from participants list
      setFilteredChatList((prevDataChatList) => {
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
    [
      setDataChatList,
      setFilteredChatList,
      handleRemoveChatRoomParam,
      chatRoomCode,
    ],
  );

  // Update list file if has new data from socket
  const handleUpdateListFileMemo = (messageDetail: ChatMessageResponse) => {
    let uuidListMain = [];
    const parser = new DOMParser();
    const doc = parser.parseFromString(messageDetail?.message, 'text/html');
    const pEl = doc.querySelector('p');

    if (pEl) {
      const raw = pEl.getAttribute('data-uuid');
      uuidListMain = raw ? JSON.parse(raw) : [];
    }
    const dataMap = mapChatFilesToMemo(messageDetail, uuidListMain);
    setDataFileAddList(dataMap);
  };

  // Socket
  useEffect(() => {
    // Create WebSocket
    const handleSocketMessage = (data: WebSocketMessageData) => {
      switch (data.action) {
        case SocketActions.MESSAGE:
          // Handle add message to message list (local) for receiver
          if (data.chatRoom.code === chatRoomCode) {
            if (
              !hasMoreDetailOnScrollDown &&
              (!data.clientId || !data.clientId.includes(clientId))
            ) {
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

                // Remove duplicates by uuid
                const uniqueMessages = Array.from(
                  new Map(allMessages.map((msg) => [msg.uuid, msg])).values(),
                );

                return uniqueMessages;
              });

              setChatRoomNotifications({
                notifications: data.chatRoom.unreadMessages,
                roomCode: chatRoomCode,
              });
            }
            if (isExtendMoreData) {
              handleUpdateListFileMemo(data.chatMessage);
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
          handleUpdateGroupLocal(data, dataChatList, filteredChatList);
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
    dataChatList,
    filteredChatList,
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
    quote,
    files,
    fileUuids,
    replyUuid,
  }: {
    data: string;
    uuid: string;
    mentionIds: number[];
    quote: string[];
    files: File[];
    fileUuids: string[];
    replyUuid?: string;
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

    if (replyUuid) {
      formData.append('replyUuid', replyUuid);
    }
    if (quote.length > 0) {
      quote.forEach((id) => formData.append('quote', id.toString()));
    }
    mentionIds.forEach((id) => formData.append('mentionIds', id.toString()));
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
    onSuccess: async (data, variables) => {
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

  function collectAllUuids(data: ChatMessageResponse[]): string[] {
    return data.flatMap((item) => item.chatFiles.map((file) => file.uuid));
  }

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
    const { filterMsg, allMsgIds } = extractAndRemoveMsgQuotes(newMsg);
    let matchedMessagesQuote: ChatMessageResponse[] = [];

    if (allMsgIds && allMsgIds.length > 0) {
      matchedMessagesQuote = dataMessageDetail.filter((item) =>
        allMsgIds.includes(item.uuid),
      );
    }
    const listFiles = chatUploadFiles.map((item) => item.uuid);

    const newFilterMsg = attachUuidToAllP(filterMsg, listFiles);
    const dataMsgQuote = getRootPSpanData(filterMsg);

    const listChatFiles = dataMsgQuote.data.flatMap((item) => item.chatFiles);

    const dataUuidQuote = collectAllUuids(dataMsgQuote.data);

    const newMessageDetail = {
      uuid: uuidMsg,
      message: newFilterMsg,
      createdAt: getCurrentTimeInJapan(),
      deletedAt: null,
      bookmarkAt: null,
      type: MessageType.MESSAGE,
      isEdited: false,
      task: null,
      sender: {
        fullName: session?.user.profile.fullName || '',
        id: session?.user.id as number,
        organizations: {
          id: organizationMain?.id || 0,
          name: organizationMain?.name || '',
        },
      },
      mentions: mentionIds,
      isBookmark: false,
      chatFiles: [...chatUploadFiles, ...listChatFiles],
      quote: allMsgIds && allMsgIds.length > 0 ? matchedMessagesQuote : null,
      // TODO: Update sava data msg detail of reply in onsuccess API "reply"
    };
    if (!hasMoreDetailOnScrollDown) {
      setDataMessageDetail([newMessageDetail, ...dataMessageDetail]);
    } else {
      // When it has more to scroll down but user sends new message => Add this message to pending message list
      setPendingMessages((prev) => [newMessageDetail, ...prev]);
    }

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
    const quote = matchedMessagesQuote.map((msg) => msg.uuid);
    handleSendMsgChat({
      data: newFilterMsg,
      uuid: uuidMsg,
      mentionIds,
      files: uploadFiles.map((file) => file.file),
      fileUuids: [...uploadFiles.map((file) => file.uuid), ...dataUuidQuote],
      quote: quote,
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
    onSuccess: async () => { },
    onError: () => { },
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
      const newMsg = trimUnnecessaryLineBreaks(message) as string;

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

      const { filterMsg } = extractAndRemoveMsgQuotes(newMsg);
      const dataMsgQuote = getRootPSpanData(filterMsg);

      const listFiles = [
        ...chatUploadFiles.map((item) => item.uuid),
        ...preserveFiles.map((file) => file.uuid),
      ];

      const newFilterMsg = attachUuidToAllP(filterMsg, listFiles);
      const dataUuidQuote = collectAllUuids(dataMsgQuote.data);

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
        message: newFilterMsg,
        uuid: uuid,
        mentionIds,
        files: uploadFiles.map((file) => file.file),
        fileUuids: [
          ...uploadFiles.map((file) => file.uuid),
          ...preserveFiles.map((file) => file.uuid),
          ...dataUuidQuote,
        ],
      });
    }
  };

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
      onSuccess: () => { },
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

  // Render avatar
  const renderImageRound = (chatRoomDetail: ChatRoomDetail) => {
    switch (chatRoomDetail.type) {
      case ChatRoomType.GROUP:
        return (
          <div className="rounded-full w-[36px] h-[36px] border-[2px] border-white flex items-center justify-center overflow-hidden">
            {chatRoomDetail ? (
              chatRoomDetail?.avatar ? (
                <CustomUserAvatar
                  avatarUrl={chatRoomDetail?.avatar || ''}
                  avatarColor={chatRoomDetail?.avatarColor || ''}
                  size={36}
                />
              ) : (
                <GroupIconWithDynamicColor
                  color={chatRoomDetail?.avatarColor || '#228CDB'}
                  size={36}
                />
              )
            ) : (
              <></>
            )}
          </div>
        );
      case ChatRoomType.TASK:
        return (
          <div className="rounded-full w-[36px] h-[36px] border-[2px] border-white flex items-center justify-center overflow-hidden">
            <ImageRound
              className="w-[36px] h-[36px]"
              src="/icons/document.svg"
              border="full"
              name="Task room"
            />
          </div>
        );
      case ChatRoomType.SKILL:
        return (
          <div className="rounded-full w-[36px] h-[36px] border-[2px] border-white flex items-center justify-center overflow-hidden">
            <ImageRound
              className="w-[36px] h-[36px]"
              src="/icons/skill-room.svg"
              border="full"
              name="Skill room"
            />
          </div>
        );
      case ChatRoomType.CALENDAR:
        return (
          <div className="rounded-full w-[36px] h-[36px] border-[2px] border-white flex items-center justify-center overflow-hidden">
            <ImageRound
              className="w-[36px] h-[36px]"
              src="/icons/calendar-room.svg"
              border="full"
              name="Calendar room"
            />
          </div>
        );
      default: {
        const memberInfo = dashboardMemberList.find((member) => {
          if (chatRoomDetail.type === ChatRoomType.PRIVATE) {
            return (
              member.id ===
              chatRoomDetail.participants.find(
                (participant) => participant.id !== session?.user.id,
              )?.id
            );
          }
          return member.id === session?.user.id;
        });

        return (
          <div className="rounded-full w-[36px] h-[36px] border-[2px] border-white flex items-center justify-center overflow-hidden">
            <CustomUserAvatar
              avatarUrl={memberInfo?.avatar || ''}
              avatarColor={memberInfo?.avatarColor || ''}
              size={36}
              customClassName={`${!memberInfo?.avatar && 'mt-0.5 ml-0.5'}`}
            />
          </div>
        );
      }
    }
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
          const memberInfo = dashboardMemberList.find(
            (member) => member.id == participantId,
          );
          return (
            <div
              className={`${index > 0 && 'ml-[-10px]'} border-[1px] flex items-center justify-center border-white rounded-full h-[31.5px] w-[31.5px]`}
              key={index}>
              <CustomUserAvatar
                avatarUrl={memberInfo?.avatar || ''}
                avatarColor={memberInfo?.avatarColor || ''}
                size={30}
                customClassName={`${!memberInfo?.avatar && '!mt-0'}`}
              />
            </div>
          );
        })}
        {remainingCount > 0 && (
          <div className="ml-[-10px] relative flex items-center justify-center bg-[#97A9B2] border-[1px] border-white rounded-full text-sm text-white w-[31.5px] h-[31.5px]">
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
      ...(chatRoomDetail?.participants.map((participant) => ({
        id: participant.id,
        fullName: participant?.fullName || '',
      })) || []),
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
      onError: () => { },
      onSettled: () => { },
    },
  );

  // Reply Msg
  const handleReplyMsg = ({
    user,
    replyId,
  }: {
    user: {
      id: number;
      name: string;
    };
    replyId: string;
  }) => {
    if (!editor) return;

    editor
      .chain()
      .focus()
      .insertContent({
        type: 'msgReply',
        attrs: {
          id: replyId,
          title: `@${user.name}`,
        },
      })
      .run();

    editor.chain().focus().insertContent({ type: 'paragraph' }).run();
  };

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
  const tryParse = (maybeString: any) => {
    if (typeof maybeString !== 'string') return maybeString;
    try {
      return JSON.parse(maybeString);
    } catch {
      return maybeString;
    }
  };

  // Quote msg
  const handleQuoteMsgUserText = useCallback(
    (data: { uuid: string; title: string }) => {
      if (!editor) return;
      const findMsg = dataMessageDetail.find((item) => item.uuid == data.uuid);
      if (!findMsg) return;
      editor
        .chain()
        .focus()
        .insertContent({
          type: 'msgQuoteText',
          attrs: {
            id: data.uuid.toString(),
            title: data.title,
            data: tryParse(findMsg),
          },
        })
        .run();

      editor.chain().focus().insertContent({ type: 'paragraph' }).run();
    },
    [editor, dataMessageDetail],
  );

  const handleQuoteMsgIcon = (payload: {
    data: ChatMessageResponse;
    title?: string;
  }) => {
    if (!editor) return;
    const title = payload.title ?? '';

    // if payload.data is already an object then keep it as is, if it is a string then parse it

    const messageObj = tryParse(payload.data);

    editor
      .chain()
      .focus()
      .insertContent({
        type: 'msgQuote',
        attrs: {
          data: messageObj, // to be an object (TipTap will stringify when renderingHTML)
          title,
        },
      })
      .run();

    // insert paragraph to new line
    editor.chain().focus().insertContent({ type: 'paragraph' }).run();
  };

  useEffect(() => {
    const handleMouseUp = () => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) {
        quoteButtonRef.current?.remove();
        quoteButtonRef.current = null;
        lastSelectedMessageIdRef.current = null;
        return;
      }

      const text = selection.toString();

      if (!text.trim()) {
        quoteButtonRef.current?.remove();
        quoteButtonRef.current = null;
        lastSelectedMessageIdRef.current = null;
        return;
      }

      // 🔍 Get the ID of the chat containing the highlighted text
      const anchorNode = selection.anchorNode;
      const parent = anchorNode?.parentElement?.closest('[data-id]');
      const id = parent?.getAttribute('data-id');

      if (!id) return;
      lastSelectedMessageIdRef.current = id || null;
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      let button = quoteButtonRef.current;
      if (!button) {
        button = document.createElement('button');
        button.innerHTML = `
        <span style="display: inline-flex; align-items: center; gap: 6px;">
          <img src="/icons/quotation.svg" width="fit-content" height="fit-content"/>
          <span>引用</span>
        </span>
      `;
        button.style.position = 'absolute';
        button.style.zIndex = '20';
        button.style.width = '68px';
        button.style.height = '30px';
        button.style.justifyContent = 'center';
        button.style.background = 'white';
        button.style.color = 'black';
        button.style.fontSize = '14px';
        button.style.fontWeight = '400';
        button.style.borderRadius = '100px';
        button.style.border = 'none';
        button.style.cursor = 'pointer';
        button.style.boxShadow = '0px 4px 8px 0px #0000000F';
        button.onmousedown = (e) => e.preventDefault();
        button.onclick = () => {
          handleQuoteMsgUserText({
            uuid: lastSelectedMessageIdRef.current || '',
            title: text,
          });

          button?.remove();
          quoteButtonRef.current = null;
          lastSelectedMessageIdRef.current = null;
        };
        document.body.appendChild(button);
        quoteButtonRef.current = button;
      }

      button.style.top = `${rect.top + window.scrollY - 45}px`;
      button.style.left = `${rect.right + window.scrollX - button.offsetWidth
        }px`;
    };

    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
      quoteButtonRef.current?.remove();
      quoteButtonRef.current = null;
      lastSelectedMessageIdRef.current = null;
    };
  }, [handleQuoteMsgUserText, dataMessageDetail]);

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
  const handleSetEventParam = ({
    id,
    action,
  }: {
    id: string | null;
    action: string;
  }) => {
    if (id) {
      params.set('event', id);
    }
    params.delete('task');
    params.delete('action');
    params.delete('type');
    params.set('action', action);
    params.set('type', ItemStartType.SCHEDULE);
    router.push(`?${params.toString()}`);
  };
  const handleConfirmGetDataDetailEvent = (id: string) => {
    // set param
    handleSetEventParam({
      id: id,
      action: ActionTask.EDIT,
    });
  };

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
      setOpenErrorUploadFileModal({
        status: true,
        message: UPLOAD_CHAT_FILE_MAXIMUM_SIZE,
      });
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
        setOpenErrorUploadFileModal({
          status: true,
          message: UPLOAD_CHAT_FILE_MAXIMUM_SIZE,
        });
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
  const handleReactionClick = (_msgUuid: string, _icon: string) => {
    setChatRoomNotifications({
      notifications: 0,
      roomCode: chatRoomCode,
    });
  };

  // Remove reactions
  const handleRemoveReactionClick = (msgUuid: string, icon: string) => {
    setDataMessageDetail((prev) =>
      prev.map((message) => {
        if (message.uuid !== msgUuid) return message;

        const userId = session?.user.id as number;

        const updatedReactions = (message.reactions || [])
          .map((reaction) => {
            if (reaction.icon !== icon) return reaction;

            return {
              ...reaction,
              users: reaction.users.filter((id) => id !== userId),
            };
          })
          .filter((reaction) => reaction.users.length > 0);

        return {
          ...message,
          reactions: updatedReactions,
        };
      }),
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
    if (!editor) return;

    const { state } = editor;
    const { doc } = state;
    const pos = doc.content.size;
    editor
      .chain()
      .focus()
      .insertContent({
        type: 'customReaction',
        attrs: {
          src: reaction.src,
          name: reaction.name,
        },
      })
      .setTextSelection(pos)
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

  // Leave group
  const postActionLeaveGroup = async () => {
    setIsLoading(true);
    const { data: response } = await api.post(
      apiRouters.LEAVE_GROUP(`${chatRoomDetail?.code}`),
    );
    return response;
  };
  const { mutate: actionLeaveGroup } = useMutation(postActionLeaveGroup, {
    onSuccess: async () => {
      setDataChatList((prev) => {
        return prev.filter((item) => item.code != chatRoomCode);
      });
      setFilteredChatList((prev) =>
        prev.filter((item) => item.code != chatRoomCode),
      );
      setShowConfirmLeaveGroup(false);
      if (dataChatList.length > 0) {
        if (dataChatList[0].code != chatRoomCode) {
          handleSetChatRoomParam(dataChatList[0].code);
        } else {
          if (dataChatList.length > 1) {
            if (dataChatList[1].code != chatRoomCode) {
              handleSetChatRoomParam(dataChatList[1].code);
            } else {
              handleRemoveChatRoomParam();
            }
          }
        }
      } else {
        handleRemoveChatRoomParam();
      }
    },
    onError: () => { },
    onSettled: () => {
      setIsLoading(false);
    },
  });

  const handleConfirmLeaveGroup = () => {
    actionLeaveGroup();
  };

  return (
    <>
      {chatRoomCode && (
        <>
          <div
            className="flex relative  flex-col flex-grow  !bg-[#F8FAFC] !h-[100vh]"
            onClick={() => {
              if (
                dataMessageDetail?.length > 0 &&
                chatRoomNotifications &&
                chatRoomNotifications.notifications > 0
              ) {
                handleResetChatRoomNotification();
              }
            }}>
            {/* Header */}
            <div
              className="flex justify-between items-center px-4 py-2 min-h-[78px] gap-3 !w-[calc(100%_-_20px)] ml-auto  rounded-bl-[24px] text-white"
              style={{
                background: 'linear-gradient(to right, #289BF2, #73CCDF)',
              }}>
              <div className={`flex items-center w-[62%]`}>
                {chatRoomDetail && (
                  <>
                    <div className="!min-w-[36px] mr-[10px]">
                      {renderImageRound(chatRoomDetail)}
                    </div>
                    <p
                      className={`text-[20px] font-semibold text-ellipsis break-all overflow-hidden ${chatRoomDetail?.type != ChatRoomType.GROUP ? 'w-fit max-w-[100%]' : 'max-w-[calc(100%_-_380px)]'}`}
                      style={{
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                      }}>
                      {chatRoomDetail?.name || ''}
                    </p>
                  </>
                )}
                <div
                  className={`${chatRoomDetail &&
                    chatRoomDetail.type === ChatRoomType.GROUP &&
                    'max-w-[280px] w-[280px] ml-5'
                    }`}>
                  {chatRoomDetail &&
                    chatRoomDetail.type === ChatRoomType.GROUP && (
                      <div className="flex gap-3 items-center">
                        <p className="text-[13px] text-[#FFFFFFB2] text-nowrap">
                          メンバー
                          {chatRoomDetail?.participants?.length || 0}人
                        </p>
                        <DynamicTooltip
                          content={'グループのメンバーを見る'}
                          placement="top">
                          <div className="flex">
                            {chatRoomDetail
                              ? getParticipantAvatars(
                                chatRoomDetail?.participants || [],
                                false,
                              )
                              : []}
                          </div>
                        </DynamicTooltip>

                        <DynamicTooltip
                          content={'グループにメンバーを招待する'}
                          placement="top">
                          <div>
                            <Button
                              sz="sm"
                              variant="secondary"
                              className="w-fit text-xs min-w-[80px] text-white !px-[10px] !py-[8px] !bg-[#FFFFFF4D] !border-none"
                              onClick={() => setOpenAddMembersBox(true)}
                              type="button">
                              招待する
                            </Button>
                          </div>
                        </DynamicTooltip>
                      </div>
                    )}
                  {chatRoomDetail?.isMuted &&
                    chatRoomDetail &&
                    chatRoomDetail.type !== ChatRoomType.GROUP && (
                      <div className={`flex-shrink-0 ml-5`}>
                        <ImageRound
                          className={`w-fit h-fit hover:cursor-pointer`}
                          src="/icons/mute-white.svg"
                          name="mute icon"
                        />
                      </div>
                    )}
                </div>
                {chatRoomDetail?.isMuted &&
                  chatRoomDetail &&
                  chatRoomDetail.type === ChatRoomType.GROUP && (
                    <div className={`flex-shrink-0 w-fit ml-5`}>
                      <ImageRound
                        className={` w-fit h-fit hover:cursor-pointer`}
                        src="/icons/mute-white.svg"
                        name="mute icon"
                      />
                    </div>
                  )}
              </div>

              <div className="flex gap-5 items-center">
                <InputSearch
                  placeholder="チャットルーム内のキーワードを検索"
                  customSearchIconUrl="/icons/search-white.svg"
                  inputClassName="!w-[300px] !py-2 !rounded-[30px] !text-sm !bg-[#F6F9FA4D] border-none !placeholder-[#FFFFFF99]"
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
                        ChatRoomType.PRIVATE,
                      ].map(
                        (type) =>
                          chatRoomDetail?.code == chatRoomCode &&
                          chatRoomDetail?.type == type && (
                            <Popover key={type} className="relative">
                              {() => (
                                <>
                                  <PopoverButton
                                    className={`flex w-[24px] py-2 items-center rounded-md focus:outline-none`}>
                                    <div>
                                      <DynamicTooltip
                                        content={'設定'}
                                        placement="left"
                                        customOffset={{
                                          left: -40,
                                        }}>
                                        <ImageRound
                                          className="w-[24px] h-[24px] hover:cursor-pointer"
                                          src="/icons/setting-chat.svg"
                                          border="full"
                                          name="Setting icon"
                                        />
                                      </DynamicTooltip>
                                    </div>
                                  </PopoverButton>
                                  <Transition
                                    as={Fragment}
                                    enter="transition ease-out duration-200"
                                    enterFrom="opacity-0 translate-y-1"
                                    enterTo="opacity-100 translate-y-0"
                                    leave="transition ease-in duration-150"
                                    leaveFrom="opacity-100 translate-y-0"
                                    leaveTo="opacity-0 translate-y-1">
                                    <PopoverPanel
                                      style={{
                                        boxShadow: '0px 2px 8px 0px #0000001A',
                                      }}
                                      className="absolute bg-[#5B6770] p-[6px] !rounded-[10px] text-white text-sm  font-medium  top-10 right-0 z-10  transform">
                                      <div
                                        className={`${chatRoomDetail?.type ==
                                            ChatRoomType.PRIVATE
                                            ? 'w-[150px]'
                                            : 'w-[122px]'
                                          }`}>
                                        {chatRoomDetail?.type ==
                                          ChatRoomType.GROUP && (
                                            <div
                                              className="p-[12px] hover:bg-[#7D8A94] leading-none rounded-[6px] hover:cursor-pointer"
                                              onClick={() => {
                                                setOpenSettingBox(true);
                                              }}>
                                              編集
                                            </div>
                                          )}

                                        <div
                                          onClick={() =>
                                            setShowModalMuteChat(true)
                                          }
                                          className="p-[12px] hover:bg-[#7D8A94] leading-none rounded-[6px] hover:cursor-pointer">
                                          通知
                                        </div>
                                        {chatRoomDetail?.type ==
                                          ChatRoomType.GROUP && (
                                            <div
                                              onClick={() =>
                                                setShowConfirmLeaveGroup(true)
                                              }
                                              className="p-[12px] hover:bg-[#7D8A94] leading-none rounded-[6px] hover:cursor-pointer">
                                              グループを退会
                                            </div>
                                          )}
                                        <div className="p-[12px] hover:bg-[#7D8A94] leading-none rounded-[6px] hover:cursor-pointer hidden">
                                          {chatRoomDetail?.type !=
                                            ChatRoomType.PRIVATE
                                            ? 'グループ'
                                            : '個人チャット'}
                                          を削除
                                        </div>
                                      </div>
                                    </PopoverPanel>
                                  </Transition>
                                </>
                              )}
                            </Popover>
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
                  className={`${chatRoomDetail?.type == ChatRoomType.TASK || chatRoomDetail?.type == ChatRoomType.SKILL || chatRoomDetail?.type == ChatRoomType.CALENDAR ? 'h-[calc(100vh_-_170px)]' : 'h-[calc(100vh_-_386px)]'} pb-3 ${dataMessageDetail.length > 0 && !initialLoad ? 'overflow-y-auto' : 'overflow-y-hidden'} pt-2 overflow-x-hidden scrollbar-gutter-stable flex pr-0 flex-col-reverse scroll-smooth`}>
                  {isLoadingNewer && (
                    <div className="flex  flex-col items-start ml-3">
                      <RowSkeleton
                        className={`!h-[30px]  ${isExtendMoreData ? 'w-[380px]' : 'w-[700px]'}  mb-2`}
                      />
                      <RowSkeleton
                        className={`!h-[50px] ${isExtendMoreData ? 'w-[280px]' : 'w-[600px]'} mb-2`}
                      />
                    </div>
                  )}
                  <div className="h-[calc(100vh)] mt-3 w-full bg-[rgb(229, 231, 235)] relative">
                    <div>
                      {initialLoad ? (
                        <div className="flex flex-col items-start ml-3">
                          <RowSkeleton
                            className={`!h-[100px] ${isExtendMoreData ? 'w-[180px]' : 'w-[500px]'} mb-2`}
                          />
                          <RowSkeleton
                            className={`!h-[200px] ${isExtendMoreData ? 'w-[280px]' : 'w-[600px]'} mb-2`}
                          />
                          <RowSkeleton
                            className={`!h-[100px] ${isExtendMoreData ? 'w-[180px]' : 'w-[500px]'} mb-2`}
                          />
                          <RowSkeleton
                            className={`!h-[200px] ${isExtendMoreData ? 'w-[280px]' : 'w-[600px]'} mb-2`}
                          />
                          <RowSkeleton
                            numberOfRows={4}
                            className={`!h-[50px] ${isExtendMoreData ? 'w-[380px]' : 'w-[700px]'}`}
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
                            isExtendMoreData={isExtendMoreData}
                            chatRoomDetail={chatRoomDetail}
                            uploadFileStatus={uploadFileStatus}
                            messageDetail={item}
                            msgEditing={msgEditing}
                            editor={editor}
                            chatContainerRef={chatContainerRef}
                            dashboardMemberList={dashboardMemberList}
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
                            // Quote msg
                            handleQuoteMsgIcon={handleQuoteMsgIcon}
                            setMsgIdUpdated={setMsgIdUpdated}
                            // Preview File
                            setDataPreviewFile={setDataPreviewFile}
                            // Reply msg
                            handleReplyMsg={handleReplyMsg}
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
                            onGotoMessage={(data: {
                              messageId: string | number;
                            }) => {
                              setOpenSearchMessagesModal(false);
                              gotoSelectedMessage({
                                bookmarkMessageId: Number(data.messageId),
                              });
                            }}
                          />
                        </div>
                      ))}
                  {dataMessageDetail?.length > 0 &&
                    chatRoomNotifications &&
                    chatRoomNotifications.notifications > 0 &&
                    !hasMoreDetailOnScrollDown ? (
                    <div className="flex items-center gap-[14px] justify-center">
                      <div className="wavy-line"></div>
                      <p className="text-[12px] font-medium text-[#228CDB] text-nowrap">
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
                            isExtendMoreData={isExtendMoreData}
                            chatRoomDetail={chatRoomDetail}
                            uploadFileStatus={uploadFileStatus}
                            messageDetail={item}
                            editor={editor}
                            msgEditing={msgEditing}
                            chatContainerRef={chatContainerRef}
                            dashboardMemberList={dashboardMemberList}
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
                            // Quote msg
                            handleQuoteMsgIcon={handleQuoteMsgIcon}
                            setMsgIdUpdated={setMsgIdUpdated}
                            // Preview File
                            setDataPreviewFile={setDataPreviewFile}
                            // Reply msg
                            handleReplyMsg={handleReplyMsg}
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
                            onGotoMessage={(data: {
                              messageId: string | number;
                            }) => {
                              setOpenSearchMessagesModal(false);
                              gotoSelectedMessage({
                                bookmarkMessageId: Number(data.messageId),
                              });
                            }}
                          />
                        </div>
                      ))}
                  {isLoadingOlder && (
                    <div className="flex flex-col items-start ml-3">
                      <RowSkeleton
                        className={`!h-[30px] ${isExtendMoreData ? 'w-[380px]' : 'w-[700px]'} mb-2`}
                      />
                      <RowSkeleton
                        className={`!h-[50px] ${isExtendMoreData ? 'w-[280px]' : 'w-[600px]'} mb-2`}
                      />
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
                            className="px-8 pt-[14px] pb-3 !box-border max-w-[100%] border-t-[#D2DBE1] border-t-[1px]">
                            <div className="flex justify-between items-center">
                              <div className="flex items-center">
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
                                      dashboardMemberList={dashboardMemberList}
                                      customModalPosition={
                                        'left-[-110px] top-[-275px]'
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
                                {/* TODO: Implement Aa chat */}
                                {/* <DynamicTooltip
                                  content={'書式設定'}
                                  placement="top">
                                  <p className="!font-thin text-[#77858F] hover:bg-[#77858F26] rounded-full p-[3px] hover:cursor-pointer flex justify-between items-center w-8 h-8">
                                    <span className="w-[20px] ml-1 mt-[-3px]">
                                      Aa
                                    </span>
                                  </p>
                                </DynamicTooltip> */}
                              </div>

                              <div className="flex items-center gap-[14px]">
                                {session?.user.permissions &&
                                  hasPermissionInArray(
                                    session?.user.permissions,
                                    PermissionsSystem.CHAT_UPDATE,
                                  ) &&
                                  msgIdUpdated && (
                                    <Button
                                      className="w-[120px] h-9"
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
                                      className="w-[100px] h-9 border-none"
                                      type="submit"
                                      style={{
                                        boxShadow: '0px 1px 5px 0px #00000033',
                                      }}
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
                            <div className="mt-[14px] !max-w-full">
                              <EditorContent
                                editor={editor}
                                key={chatRoomCode}
                                className="w-full whitespace-pre-wrap chat text-sm custom-tiptap-editor"
                              />
                            </div>
                          </div>
                        ),
                    )}
                  </>
                ) : (
                  <div className="px-8 pt-[14px] pb-3 !box-border max-w-[100%] border-t-[#D2DBE1] border-t-[1px]">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center">
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
                              className="w-[16px] h-[16px]"
                            />
                          </div>
                        </DynamicTooltip>
                        {/* TODO: Implement Aa chat */}
                        {/* <DynamicTooltip content={'書式設定'} placement="top">
                          <p className="!font-thin text-[#77858F] hover:bg-[#77858F26] rounded-full p-[3px] hover:cursor-pointer flex justify-between items-center w-8 h-8">
                            <span className="w-[20px] ml-1 mt-[-3px]">Aa</span>
                          </p>
                        </DynamicTooltip> */}
                      </div>

                      <div className="flex items-center gap-3">
                        <Button className="w-[100px]" disabled={true}>
                          送信
                        </Button>
                      </div>
                    </div>
                    <div className="mt-[14px]">
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
                className={`transition-all duration-300 ease-out flex-shrink-0 overflow-hidden
  ${isExtendMoreData ? 'max-w-[320px] opacity-100' : 'max-w-0 opacity-0'}
  bg-[#F5F8FB] rounded-tl-xl rounded-bl-xl`}>
                {isExtendMoreData && (
                  <MemoDataChat
                    initialLoad={initialLoad}
                    chatRoomCode={chatRoomCode}
                    chatRoomDetail={chatRoomDetail}
                    dataFileAddList={dataFileAddList}
                    setDataFileAddList={setDataFileAddList}
                    setChatRoomDetail={setChatRoomDetail}
                    setDataMessageDetail={setDataMessageDetail}
                    onGotoMessage={(data: { messageId: string | number }) => {
                      setOpenSearchMessagesModal(false);
                      gotoSelectedMessage({
                        bookmarkMessageId: Number(data.messageId),
                      });
                    }}
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
      {openErrorUploadFileModal.status && (
        <ErrorUploadFileValidationModal
          open={true}
          message={UPLOAD_CHAT_FILE_MAXIMUM_SIZE}
          onClose={() => {
            setOpenErrorUploadFileModal({
              status: false,
              message: '',
            });
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
          chatRoomDetail={chatRoomDetail}
          isSearchingMessagesRef={isSearchingMessagesRef}
          dashboardMemberList={dashboardMemberList}
          searchMessageResults={searchMessageResults}
          searchChatMsg={searchChatMsg}
          chatRoomType={chatRoomDetail?.type || ''}
          highlightedMessageId={highlightedMessageId}
          setSearchChatMsg={setSearchChatMsg}
          handleActionEditTask={handleActionEditTask}
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
          dashboardMemberList={dashboardMemberList}
          setOpenErrorUploadFileModal={setOpenErrorUploadFileModal}
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
          dashboardMemberList={dashboardMemberList}
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
          dashboardMemberList={dashboardMemberList}
          dataOptionsParticipants={dataOptionsParticipants}
          participantsList={
            chatRoomCode
              ? getChatParticipantIds(
                chatRoomDetail ? chatRoomDetail.participants : [],
              )
              : []
          }
          selectedOrganizations={
            chatRoomDetail?.selectOrganizations
              ? String(chatRoomDetail.selectOrganizations)
                .split(',')
                .filter(Boolean)
                .map((orgId) => Number(orgId))
              : []
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
          dashboardMemberList={dashboardMemberList}
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
      {dataPreviewFile && (
        <FilePreview
          open={dataPreviewFile !== null}
          file={dataPreviewFile.file}
          user={dataPreviewFile.user}
          msgId={dataPreviewFile.msgId}
          createAt={dataPreviewFile.createAt}
          onClose={() => setDataPreviewFile(null)}
          onGotoMessage={(data: { messageId: string | number }) => {
            setOpenSearchMessagesModal(false);

            gotoSelectedMessage({
              bookmarkMessageId: Number(data.messageId),
            });
            setDataPreviewFile(null);
          }}
        />
      )}
      {showModalMuteChat && (
        <ActionMuteChatModal
          open={showModalMuteChat}
          isMuteChat={chatRoomDetail?.isMuted || false}
          isLoadingMute={isLoadingMute}
          onClose={() => setShowModalMuteChat(false)}
          onConfirm={handleConfirmMuteChat}
        />
      )}
      {isShowConfirmLeaveGroup && (
        <ConfirmLeaveGroupModal
          open={isShowConfirmLeaveGroup}
          onClose={() => setShowConfirmLeaveGroup(false)}
          onConfirm={handleConfirmLeaveGroup}
        />
      )}
    </>
  );
};

export default ChatDetail;
