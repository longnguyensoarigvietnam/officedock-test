'use client';
import {
  Dispatch,
  Fragment,
  SetStateAction,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

import { useMutation } from 'react-query';
import { useInView } from 'react-intersection-observer';
import { useSessionCache } from '@providers/SessionCacheProvider';

import {
  Popover,
  PopoverButton,
  PopoverPanel,
  Transition,
} from '@headlessui/react';
import { useRouter, useSearchParams } from 'next/navigation';

import ImageRound from '@components/common/ImageRound';
import InputSearch from '@components/common/InputSearch';
import ActionsAddMembersModal from '@components/modals/ActionsAddMembersModal';
import socketEventEmitter from '@components/socket/socketEventEmitter';
import RowSkeleton from '@components/skeleton/RowSkeleton';
import ChatWarningUploadingFilesModal from '@components/modals/ChatWarningUploadingFilesModal';
import CustomUserAvatar from '@components/common/AvatarIcon/CustomUserAvatar';
import { DynamicTooltip } from '@components/tooltip/DynamicTooltip';
import { AllChatRoomSearchMessagesModal } from '@components/modals/AllChatRoomSearchMessagesModal';
import Spinner from '@components/common/Spinner';

import { apiRouters } from '@constants/routers';
import {
  AvatarChat,
  ChatRoomType,
  PermissionsSystem,
  SocketActions,
} from '@constants/enums';
import { BOOKMARK_ROUTER_NAME, PAGINATION_PAGE_SIZE_MEDIUM } from '@constants';

import { encodeFormatDateISO } from '@utils/date';
import { hasPermissionInArray } from '@utils';

import { ChatContext } from '@providers/ChatProvider';
import { useWebSocket } from '@providers/WebSocketProvider';
import { GlobalStateContext } from '@providers/GlobalStateProvider';
import { LoadingContext } from '@providers/LoadingProvider';

import {
  ChatMessageResponse,
  ChatParticipant,
  ChatRoomItem,
  WebSocketMessageData,
} from '@interfaces/chat';
import { BasePagination } from '@interfaces/common';
import { Profile } from '@interfaces/user';

import useDebounceText from '@hooks/useDebounceText';

import api from '@base/api';

interface dataProps {
  dataChatList: ChatRoomItem[];
  filteredChatList: ChatRoomItem[];
  hasMore: boolean;
  chatRoomCode: string | null;
  roomNameSearchResults: ChatRoomItem[];
  dashboardMemberList: Omit<Profile, 'birthday' | 'gender'>[];
  dataOptionsParticipants: ChatParticipant[];
  setDataChatList: React.Dispatch<React.SetStateAction<ChatRoomItem[]>>;
  setFilteredChatList: Dispatch<SetStateAction<ChatRoomItem[]>>;
  setLastItemId: React.Dispatch<
    React.SetStateAction<number | null | undefined>
  >;
  setRoomNameSearchResults: React.Dispatch<
    React.SetStateAction<ChatRoomItem[]>
  >;
  setHasMore: React.Dispatch<React.SetStateAction<boolean>>;
  setHasMoreDetailOnScrollDown: Dispatch<SetStateAction<boolean>>;
  setSearchChatMsg: React.Dispatch<React.SetStateAction<string>>;
  handleSetChatRoomParam: (code: string) => void;
  handleRemoveChatRoomParam: () => void;
}
const ListChatUsers = ({
  hasMore,
  chatRoomCode,
  dataChatList,
  filteredChatList,
  roomNameSearchResults,
  dashboardMemberList,
  dataOptionsParticipants,
  setFilteredChatList,
  setLastItemId,
  setDataChatList,
  setRoomNameSearchResults,
  setHasMore,
  setHasMoreDetailOnScrollDown,
  setSearchChatMsg,
  handleSetChatRoomParam,
  handleRemoveChatRoomParam,
}: dataProps) => {
  // Refs
  const { ref: listRoomRef, inView: inViewListRoom } = useInView({
    threshold: 0.2,
  });
  const { ref: listSearchRoomRef, inView: inViewListSearchRoom } = useInView({
    threshold: 0.2,
  });
  const searchSectionRef = useRef<HTMLDivElement>(null);
  const searchResultsSectionRef = useRef<HTMLDivElement>(null);
  const isSearchingMessagesRef = useRef(false);
  const isSearchingRoomNameRef = useRef(false);

  const router = useRouter();
  const searchParams = useSearchParams();
  const room = searchParams.get('room');

  const { data: session } = useSessionCache();
  const { setIsLoading } = useContext(LoadingContext);

  // Load items
  const [hasMoreSearch, setHasMoreSearch] = useState<boolean>(true);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [initialLoad, setInitialLoad] = useState<boolean>(false);
  const [initialLoadSearch, setInitialLoadSearch] = useState<boolean>(false);

  // Search
  const [roomNameSearch, setRoomNameSearch] = useState<string>('');
  const [allRoomChatMsgSearch, setAllRoomChatMsgSearch] = useState<string>('');
  const [searchRoomType, setSearchRoomType] = useState<string>('');
  const [lastPinAt, setLastPinAt] = useState<string | null>();
  const [lastMsgItemRoom, setLastMsItemRoom] = useState<string>('');
  const [lastPinAtSearch, setLastPinAtSearch] = useState<string | null>();
  const [lastMsgItemRoomSearch, setLastMsItemRoomSearch] = useState<string>('');
  const [openSearchMessagesModal, setOpenSearchMessagesModal] = useState(false);
  const [searchMessageResults, setSearchMessageResults] = useState<{
    count: number;
    numPages: number;
    results: ChatMessageResponse[];
    hasNext?: boolean;
  }>();
  const [searchResultsPage, setSearchResultsPage] = useState<number>(1);
  const [hasMoreSearchResultDetail, setHasMoreSearchResultDetail] =
    useState(false);
  const [
    showRoomNameSearchResultsSection,
    setShowRoomNameSearchResultsSection,
  ] = useState(false);
  const debouncedRoomNameSearch = useDebounceText(roomNameSearch, 800);

  const [showWarningChatUploadingModal, setShowWarningChatUploadingModal] =
    useState(false);
  const [pendingRoomChange, setPendingRoomChange] =
    useState<ChatRoomItem | null>(null);

  // Context
  const {
    setChatList,
    chatRoomNameEditing,
    setIsReload,
    setChatRoomNotifications,
  } = useContext(ChatContext);
  const { expanded, isChatFilesUploading, cancelUploadChatFiles } =
    useContext(GlobalStateContext);

  const socket = useWebSocket();

  // Handle get list and more data room chat
  const handleGetDataRoomChat = async (pageNumber: number) => {
    setInitialLoad(true);
    const apiUrl = `${apiRouters.CHAT_LIST}?page=${pageNumber}&page_size=${PAGINATION_PAGE_SIZE_MEDIUM}${lastMsgItemRoom ? `&last_message_at=${lastMsgItemRoom}` : ''}${lastPinAt ? `&pin_at=${encodeFormatDateISO(new Date(lastPinAt))}` : ''}`;
    return await api.get<BasePagination<ChatRoomItem[]>>(apiUrl);
  };

  const { mutate: getDataListRoomChat } = useMutation(
    'getDataListRoomChat',
    handleGetDataRoomChat,
    {
      onSuccess: ({ data }) => {
        if (!data.hasNext) {
          setHasMore(false);
        }
        setChatList((prevChatList) => {
          if (prevChatList) {
            return {
              ...prevChatList,
              results: [...prevChatList.results, ...data.results],
            };
          } else {
            return data;
          }
        });
        setDataChatList((prevDataChatList) => [
          ...prevDataChatList,
          ...data.results,
        ]);
        if (
          data.results &&
          data.results.length > 0 &&
          data.results[data.results.length - 1].lastMessageAt !== null
        ) {
          setLastMsItemRoom(
            data.results[data.results.length - 1].lastMessageAt as string,
          );
        }
        if (
          data.results &&
          data.results.length > 0 &&
          data.results[data.results.length - 1].pinAt !== null
        ) {
          setLastPinAt(data.results[data.results.length - 1].pinAt);
        } else {
          setLastPinAt(null);
        }
      },
      onError: () => {},
      onSettled: () => {
        setInitialLoad(false);
      },
    },
  );

  // Action load more list room
  useEffect(() => {
    if (inViewListRoom && hasMore) {
      getDataListRoomChat(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inViewListRoom]);

  // Pin chat room
  const handleUpdateDatePin = useCallback(
    (data: ChatRoomItem) => {
      if (data.pinAt) {
        setDataChatList((prevDataChatList) => {
          const filteredList = prevDataChatList.filter(
            (item) => item.code !== data.code,
          );
          return [data, ...filteredList];
        });
        if (searchRoomType) {
          setFilteredChatList((prevDataChatList) => {
            const filteredList = prevDataChatList.filter(
              (item) => item.code !== data.code,
            );
            return [data, ...filteredList];
          });
        }
      } else {
        setDataChatList((prevDataChatList) => {
          const filteredList = prevDataChatList.filter(
            (item) => item.code !== data.code,
          );
          const lastItem = filteredList[filteredList.length - 1];
          if (
            lastItem &&
            new Date(data.lastMessageAt as string) <
              new Date(lastItem.lastMessageAt as string)
          ) {
            if (hasMore) {
              return filteredList;
            } else {
              return [...filteredList, data];
            }
          }
          const items = [...filteredList, data];
          items.sort((currentItem, nextItem) => {
            if (currentItem.pinAt !== null && nextItem.pinAt !== null) {
              return 0;
            } else if (currentItem.pinAt !== null && nextItem.pinAt === null) {
              return -1;
            } else if (currentItem.pinAt === null && nextItem.pinAt !== null) {
              return 1;
            } else {
              const currentItemDate = currentItem.lastMessageAt
                ? new Date(currentItem.lastMessageAt)
                : new Date(0);
              const nextItemDate = nextItem.lastMessageAt
                ? new Date(nextItem.lastMessageAt)
                : new Date(0);
              return nextItemDate.getTime() - currentItemDate.getTime();
            }
          });
          return items;
        });
        if (searchRoomType) {
          setFilteredChatList((prevDataChatList) => {
            const filteredList = prevDataChatList.filter(
              (item) => item.code !== data.code,
            );
            const lastItem = filteredList[filteredList.length - 1];

            if (
              lastItem &&
              new Date(data.lastMessageAt as string) <
                new Date(lastItem.lastMessageAt as string)
            ) {
              if (hasMoreSearch) {
                return filteredList;
              } else {
                return [...filteredList, data];
              }
            }
            const items = [...filteredList, data];
            items.sort((currentItem, nextItem) => {
              if (currentItem.pinAt !== null && nextItem.pinAt !== null) {
                return 0;
              } else if (
                currentItem.pinAt !== null &&
                nextItem.pinAt === null
              ) {
                return -1;
              } else if (
                currentItem.pinAt === null &&
                nextItem.pinAt !== null
              ) {
                return 1;
              } else {
                const currentItemDate = currentItem.lastMessageAt
                  ? new Date(currentItem.lastMessageAt)
                  : new Date(0);
                const nextItemDate = nextItem.lastMessageAt
                  ? new Date(nextItem.lastMessageAt)
                  : new Date(0);
                return nextItemDate.getTime() - currentItemDate.getTime();
              }
            });
            return items;
          });
        }
      }
    },
    [
      hasMore,
      hasMoreSearch,
      searchRoomType,
      setDataChatList,
      setFilteredChatList,
    ],
  );

  // Create chat room
  const handleCreateChatRoomLocal = useCallback(
    (data: WebSocketMessageData, hasMoreData: boolean) => {
      setSearchChatMsg('');
      if (
        (!data.chatRoom.isExisted &&
          data.action === SocketActions.CREATE_CHAT_ROOM) ||
        data.action === SocketActions.SHOW_ROOM
      ) {
        // TODO: This location has not been arranged yet. If there is development in the future, please rearrange it
        if (data.action !== SocketActions.SHOW_ROOM) {
          setChatList((prevChatList) => {
            if (prevChatList) {
              return {
                ...prevChatList,
                results: [data.chatRoom, ...prevChatList.results],
              };
            } else {
              return {
                numPages: 1,
                count: 1,
                results: [data.chatRoom],
              };
            }
          });
        }
        if (data.action === SocketActions.SHOW_ROOM) {
          setChatRoomNotifications({
            roomCode: data.chatRoom.code,
            notifications: data.chatRoom.unreadMessages,
          });
          setDataChatList((prevDataChatList) => {
            const pinnedItems = prevDataChatList.filter(
              (item) => item.pinAt !== null,
            );
            const unpinnedItems = prevDataChatList.filter(
              (item) => item.pinAt === null,
            );
            const filteredList = prevDataChatList.filter(
              (item) => item.code !== data.chatRoom.code,
            );
            const lastItem = filteredList[filteredList.length - 1];
            if (
              lastItem &&
              new Date(data.chatRoom.lastMessageAt as string) <
                new Date(lastItem.lastMessageAt as string)
            ) {
              if (hasMoreData) {
                return filteredList;
              } else {
                return [...filteredList, data.chatRoom];
              }
            }
            if (data.chatRoom.pinAt) {
              const items = [data.chatRoom, ...pinnedItems];
              items.sort((currentItem, nextItem) => {
                const currentItemDate = currentItem.pinAt
                  ? new Date(currentItem.pinAt)
                  : new Date(0);
                const nextItemDate = nextItem.pinAt
                  ? new Date(nextItem.pinAt)
                  : new Date(0);
                return nextItemDate.getTime() - currentItemDate.getTime();
              });
              return [...items, ...unpinnedItems];
            } else {
              const items = [...filteredList, data.chatRoom];
              items.sort((currentItem, nextItem) => {
                if (currentItem.pinAt !== null && nextItem.pinAt === null) {
                  return -1;
                } else if (
                  currentItem.pinAt === null &&
                  nextItem.pinAt !== null
                ) {
                  return 1;
                } else {
                  const currentItemDate = currentItem.lastMessageAt
                    ? new Date(currentItem.lastMessageAt)
                    : new Date(0);
                  const nextItemDate = nextItem.lastMessageAt
                    ? new Date(nextItem.lastMessageAt)
                    : new Date(0);
                  return nextItemDate.getTime() - currentItemDate.getTime();
                }
              });
              return items;
            }
          });
        } else {
          setDataChatList((prevDataChatList) => {
            const pinnedItems = prevDataChatList.filter(
              (item) => item.pinAt !== null,
            );
            const unpinnedItems = prevDataChatList.filter(
              (item) => item.pinAt === null,
            );
            const allRooms = [...pinnedItems, data.chatRoom, ...unpinnedItems];
            // Remove duplicates by id
            const uniqueRooms = Array.from(
              new Map(allRooms.map((room) => [room.code, room])).values(),
            );

            return uniqueRooms;
          });
        }
      }
      if (
        data.chatRoom.isExisted &&
        data.action === SocketActions.CREATE_CHAT_ROOM
      ) {
        setChatRoomNotifications({
          roomCode: data.chatRoom.code,
          notifications: data.chatRoom.unreadMessages,
        });
        setDataChatList((prevDataChatList) => {
          const newDataChatList = [...prevDataChatList];
          const chatRoomIndex = newDataChatList.findIndex(
            (room) => room.code == data.chatRoom.code,
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
            (room) => room.code == data.chatRoom.code,
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
      }
      if (data.chatRoom.code) {
        setLastItemId(null);
        if (data.chatRoom.isExisted || data.action == SocketActions.SHOW_ROOM) {
          handleSetChatRoomParam(
            `${!data.chatMessage ? data.chatRoom.code : ''}`,
          );
        }
      }
      setIsModalOpen(false);
      setIsReload(true);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [setDataChatList],
  );

  // Add participant
  const handleAddParticipantLocal = useCallback(
    (data: WebSocketMessageData) => {
      setDataChatList((prevDataChatList) => {
        const filteredList = prevDataChatList.filter(
          (item) => item.code !== data.chatRoom.code,
        );
        const lastItem = filteredList[filteredList.length - 1];
        if (
          (hasMore && lastItem.pinAt) ||
          (hasMore &&
            lastItem.pinAt === null &&
            new Date(data.chatRoom.lastMessageAt as string) <
              new Date(lastItem.lastMessageAt as string))
        ) {
          return filteredList;
        } else {
          const pinnedItems = prevDataChatList.filter(
            (item) => item.pinAt !== null,
          );
          const unpinnedItems = prevDataChatList.filter(
            (item) => item.pinAt === null,
          );
          const items = [data.chatRoom, ...unpinnedItems];
          items.sort((currentItem, nextItem) => {
            const currentItemDate = currentItem.lastMessageAt
              ? new Date(currentItem.lastMessageAt)
              : new Date(0);
            const nextItemDate = nextItem.lastMessageAt
              ? new Date(nextItem.lastMessageAt)
              : new Date(0);
            return nextItemDate.getTime() - currentItemDate.getTime();
          });
          return [...pinnedItems, ...items];
        }
      });
    },
    [hasMore, setDataChatList],
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

  // Reset chat room unread messages
  const handleResetChatRoomUnreadMessages = (chatRoom: ChatRoomItem) => {
    const newDataChatList = [...dataChatList];
    const newFilterChatList = [...filteredChatList];
    const chatRoomIndex = newDataChatList.findIndex(
      (room) => room.code == chatRoom.code,
    );
    const filterChatRoomIndex = newFilterChatList.findIndex(
      (room) => room.code == chatRoom.code,
    );
    if (chatRoom.code == chatRoomCode) {
      getChatRoomDetail({ code: chatRoomCode, isRead: true });
      setChatRoomNotifications({
        roomCode: chatRoom.code,
        notifications: 0,
      });
    } else {
      setChatRoomNotifications({
        roomCode: chatRoom.code,
        notifications: chatRoom.unreadMessages,
      });
    }

    if (newDataChatList && chatRoomIndex != -1) {
      newDataChatList[chatRoomIndex].unreadMessages = 0;
    }
    if (newFilterChatList && filterChatRoomIndex != -1) {
      newFilterChatList[filterChatRoomIndex].unreadMessages = 0;
    }
    setDataChatList(newDataChatList);
    setFilteredChatList(newFilterChatList);
  };

  // Socket
  useEffect(() => {
    const handleSocketMessage = (data: WebSocketMessageData) => {
      switch (data.action) {
        case SocketActions.PIN_ROOM:
        case SocketActions.UNPIN_ROOM:
          handleUpdateDatePin(data.chatRoom);
          break;
        case SocketActions.CREATE_CHAT_ROOM:
        case SocketActions.SHOW_ROOM:
          handleCreateChatRoomLocal(data, hasMore);
          break;
        case SocketActions.ADD_PARTICIPANT:
          handleAddParticipantLocal(data);
          break;
        case SocketActions.HIDE_ROOM:
          setDataChatList((prev) =>
            prev.filter((item) => item.code != chatRoomCode),
          );
          setFilteredChatList((prev) =>
            prev.filter((item) => item.code != chatRoomCode),
          );
          if (
            data.chatRoom &&
            chatRoomCode &&
            data.chatRoom.code == chatRoomCode
          ) {
            if (dataChatList.length > 0) {
              if (dataChatList[0].code != chatRoomCode) {
                setLastItemId(null);
                handleSetChatRoomParam(dataChatList[0].code);
              } else {
                if (dataChatList.length > 1) {
                  if (dataChatList[1].code != chatRoomCode) {
                    setLastItemId(null);
                    handleSetChatRoomParam(dataChatList[1].code);
                  } else {
                    handleRemoveChatRoomParam();
                  }
                }
              }
            } else {
              handleRemoveChatRoomParam();
            }
          }
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
    handleAddParticipantLocal,
    handleCreateChatRoomLocal,
    handleUpdateDatePin,
  ]);

  // Action pin / unpin
  const handlePinClick = ({
    code,
    isPin,
  }: {
    code: string;
    isPin: boolean;
  }) => {
    if (socket) {
      socket.send(
        JSON.stringify({
          action: isPin ? SocketActions.UNPIN_ROOM : SocketActions.PIN_ROOM,
          code: code,
        }),
      );
    }
  };

  // Handle create chat
  const createChat = async (data: {
    name: string;
    participantIds: number[];
    selectOrganizations: string;
  }): Promise<ChatRoomItem> => {
    setIsLoading(true);
    const response = await api.post(apiRouters.CHAT_LIST, data);
    return response.data;
  };

  const createChatMutation = useMutation({
    mutationFn: createChat,
    onSettled: () => {
      setIsLoading(false);
    },
  });

  // Action search
  const handleGetDataSearchRoomChat = async ({
    page,
    name,
    showLastMessageAt,
  }: {
    page: number;
    name?: string;
    showLastMessageAt?: boolean;
  }) => {
    if (!name) {
      setInitialLoadSearch(true);
    }
    const apiUrl = `${apiRouters.CHAT_LIST}?page=${page}&page_size=${PAGINATION_PAGE_SIZE_MEDIUM}${name ? `&name=${encodeURIComponent(name)}` : ''}${lastMsgItemRoomSearch && showLastMessageAt ? `&last_message_at=${lastMsgItemRoomSearch}` : ''}${lastPinAtSearch ? `&pin_at=${lastPinAtSearch}` : ''}${searchRoomType ? `&type=${searchRoomType}` : ''}`;
    return await api.get<BasePagination<ChatRoomItem[]>>(apiUrl);
  };

  const { mutate: getDataSearchRoomChat } = useMutation(
    'getDataSearchRoomChatList',
    handleGetDataSearchRoomChat,
    {
      onMutate: () => {
        isSearchingRoomNameRef.current = true;
      },
      onSuccess: ({ data }, variables) => {
        setRoomNameSearchResults((prev) => {
          if (prev.length && variables.showLastMessageAt) {
            return [...prev, ...data.results];
          } else {
            return [...data.results];
          }
        });
        if (
          data.results[data.results.length - 1] &&
          data.results[data.results.length - 1].lastMessageAt
        ) {
          setLastMsItemRoomSearch(
            data.results[data.results.length - 1].lastMessageAt as string,
          );
        } else {
          setLastMsItemRoomSearch('');
        }
        if (
          data.results[data.results.length - 1] &&
          data.results[data.results.length - 1].pinAt !== null
        ) {
          setLastPinAtSearch(data.results[data.results.length - 1].pinAt);
        } else {
          setLastPinAtSearch(null);
        }
        if (!data.hasNext) {
          setHasMoreSearch(false);
        } else {
          setHasMoreSearch(true);
        }
        isSearchingRoomNameRef.current = false;
      },
      onError: () => {
        isSearchingRoomNameRef.current = false;
      },
    },
  );

  const { mutate: getDataSearchRoomChatByType } = useMutation(
    'getDataSearchRoomChatList',
    handleGetDataSearchRoomChat,
    {
      onSuccess: ({ data }) => {
        setFilteredChatList((prev) => {
          if (prev) {
            return [...prev, ...data.results];
          } else {
            return [...data.results];
          }
        });
        if (
          data.results[data.results.length - 1] &&
          data.results[data.results.length - 1].lastMessageAt
        ) {
          setLastMsItemRoomSearch(
            data.results[data.results.length - 1].lastMessageAt as string,
          );
        } else {
          setLastMsItemRoomSearch('');
        }
        if (
          data.results[data.results.length - 1] &&
          data.results[data.results.length - 1].pinAt !== null
        ) {
          setLastPinAtSearch(data.results[data.results.length - 1].pinAt);
        } else {
          setLastPinAtSearch(null);
        }
        if (!data.hasNext) {
          setHasMoreSearch(false);
        } else {
          setHasMoreSearch(true);
        }
      },
      onError: () => {},
      onSettled: () => {
        setInitialLoadSearch(false);
      },
    },
  );

  // Search messages
  const handleSearchMessagesInAllRooms = async (data: {
    searchChatMsg: string;
    pageNumber: number;
  }) => {
    if (chatRoomCode) {
      if (data.pageNumber == 1) setIsLoading(true);
      const encodedQuery = encodeURIComponent(data.searchChatMsg);
      const apiUrl = `${apiRouters.MESSAGE_LIST}?${
        data.searchChatMsg ? `message=${encodedQuery}` : ''
      }${data.pageNumber ? `&page=${data.pageNumber}` : ''}`;

      return await api.get<BasePagination<ChatMessageResponse[]>>(apiUrl);
    }
  };

  const { mutate: searchMessagesInAllRooms } = useMutation(
    'searchMessagesInAllRooms',
    handleSearchMessagesInAllRooms,
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

  // Render avatar based on chat room type
  const renderAvatar = (item: ChatRoomItem) => {
    if (!item) return null;

    if (item.type === AvatarChat.GROUP) {
      return (
        <ImageRound
          className="w-[30px] h-[30px]"
          src="/icons/multi-users.svg"
          border="full"
          name="Avatar user"
        />
      );
    }

    if (item.type === AvatarChat.TASK) {
      return (
        <ImageRound
          className="w-[30px] h-[30px]"
          src="/icons/document.svg"
          border="full"
          name="Task"
        />
      );
    }

    if (item.type === AvatarChat.SKILL) {
      return (
        <ImageRound
          className="w-[30px] h-[30px]"
          src="/icons/skill-room.svg"
          border="full"
          name="Skill"
        />
      );
    }

    if (item.type === AvatarChat.CALENDAR) {
      return (
        <ImageRound
          className="w-[30px] h-[30px]"
          src="/icons/calendar-room.svg"
          border="full"
          name="Calendar"
        />
      );
    }

    const memberInfo = dashboardMemberList.find((member) => {
      if (item.type === AvatarChat.PRIVATE) {
        return (
          member.id ===
          item.participants.find(
            (participant) => participant.id !== session?.user.id,
          )?.id
        );
      }
      return member.id === item.participants[0].id;
    });

    return (
      <div className="h-[30px]">
        <CustomUserAvatar
          avatarUrl={memberInfo?.avatar || ''}
          avatarColor={memberInfo?.avatarColor || ''}
          size={30}
        />
      </div>
    );
  };

  // Go to bookmark room
  const goToBookmark = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('room', 'bookmark');

    router.push(`/chat?${params.toString()}`, { scroll: false });
  };

  // Handle change room
  const handleRoomChange = (roomDetail: ChatRoomItem) => {
    if (isChatFilesUploading) {
      setPendingRoomChange(roomDetail);
      setShowWarningChatUploadingModal(true);
      return;
    }
    doRoomChange(roomDetail);
  };

  const doRoomChange = (roomDetail: ChatRoomItem) => {
    setLastItemId(null);
    handleSetChatRoomParam(roomDetail.code);
    handleResetChatRoomUnreadMessages(roomDetail);
    setSearchChatMsg('');
    setIsReload(false);
    setHasMoreDetailOnScrollDown(false);
    setPendingRoomChange(null);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchSectionRef.current &&
        !searchSectionRef.current.contains(event.target as Node)
      ) {
        // User clicked outside
        setShowRoomNameSearchResultsSection(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (!debouncedRoomNameSearch) {
      setRoomNameSearchResults([]);
      return;
    }

    setRoomNameSearchResults([]); // Clear immediately
    isSearchingRoomNameRef.current = true;

    getDataSearchRoomChat({
      name: debouncedRoomNameSearch,
      page: 1,
      showLastMessageAt: false,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedRoomNameSearch]);

  useEffect(() => {
    if (searchRoomType) {
      setFilteredChatList([]);
      getDataSearchRoomChatByType({
        page: 1,
        showLastMessageAt: false,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getDataSearchRoomChat, searchRoomType]);

  useEffect(() => {
    if (
      inViewListSearchRoom &&
      filteredChatList.length > PAGINATION_PAGE_SIZE_MEDIUM - 1 &&
      hasMoreSearch
    ) {
      getDataSearchRoomChatByType({
        page: 1,
        showLastMessageAt: true,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inViewListSearchRoom]);

  useEffect(() => {
    const handleScroll = () => {
      const resultsContainer = searchResultsSectionRef.current;

      if (
        resultsContainer &&
        hasMoreSearch &&
        Math.round(
          resultsContainer.clientHeight + Math.abs(resultsContainer.scrollTop),
        ) >=
          0.9 * resultsContainer.scrollHeight
      ) {
        if (isSearchingRoomNameRef && isSearchingRoomNameRef.current) return;
        getDataSearchRoomChat({
          name: debouncedRoomNameSearch,
          page: 1,
          showLastMessageAt: true,
        });
      }
    };

    const resultsContainer = searchResultsSectionRef.current;

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
    hasMoreSearch,
    searchResultsPage,
    isSearchingRoomNameRef,
    debouncedRoomNameSearch,
    showRoomNameSearchResultsSection,
  ]);

  return (
    <aside
      className={`w-[270px] max-w-[270px] min-w-[270px] !h-[calc(100vh_-_76px)] ${expanded ? '!rounded-r-[60px]' : '!rounded-r-[30px]'} !bg-[#E6F3FB] pl-4 pt-5`}>
      <div className="relative mb-[10px] pr-4" ref={searchSectionRef}>
        <InputSearch
          placeholder="全体のキーワードを検索"
          className="w-full"
          inputClassName="!py-2 !border-[#77858F] !placeholder-[#BABABA] !h-[36px] !text-sm"
          value={roomNameSearch}
          onChange={(e) => {
            setHasMoreSearch(true);
            setLastPinAtSearch(null);
            setLastMsItemRoomSearch('');
            setRoomNameSearch(e.target.value);
            if (e.target.value) {
              setShowRoomNameSearchResultsSection(true);
            } else {
              setShowRoomNameSearchResultsSection(false);
            }
          }}
          onKeyDown={(e: any) => {
            if (e.keyCode == 13 && e.target.value !== '') {
              setOpenSearchMessagesModal(true);
              setShowRoomNameSearchResultsSection(false);
              setAllRoomChatMsgSearch(roomNameSearch);
              searchMessagesInAllRooms({
                searchChatMsg: roomNameSearch,
                pageNumber: 1,
              });
            }
          }}
        />

        {showRoomNameSearchResultsSection ? (
          <div
            ref={searchResultsSectionRef}
            className={`absolute z-50 mt-2 bg-white !border-[1px] p-[5px] !border-[#77858F] rounded-[6px] w-[calc(100%_-_16px)] h-fit max-h-[200px] overflow-y-auto`}>
            <div
              key="search-by-message"
              className={`flex relative w-full group items-center hover:cursor-pointer py-2 px-2 border-b-[1px] border-b-[#EBF1F7] hover:bg-[#EBF1F7]`}
              onClick={() => {
                setOpenSearchMessagesModal(true);
                setShowRoomNameSearchResultsSection(false);
                setRoomNameSearchResults([]);
                setAllRoomChatMsgSearch(roomNameSearch);
                searchMessagesInAllRooms({
                  searchChatMsg: roomNameSearch,
                  pageNumber: 1,
                });
              }}>
              <ImageRound
                src="/icons/search.svg"
                name="Search input icon"
                className={`w-4 h-4`}
              />
              <div className="ml-3 flex-grow">
                <p className="text-[14px] font-medium text-[#1E293B] break-all">
                  <span className="text-primary">
                    {roomNameSearch || '安藤'}
                  </span>
                  <span className="text-[#77858F]">でメッセージを検索</span>
                </p>
              </div>
            </div>
            {roomNameSearchResults.map((item) => (
              <div
                key={item.code}
                className={`flex relative w-full items-center hover:cursor-pointer py-2 px-2 border-b-[1px] border-b-[#EBF1F7] hover:bg-[#EBF1F7] ${
                  chatRoomCode === item.code && 'bg-[#FFFFFF]'
                }`}
                onClick={() => {
                  setShowRoomNameSearchResultsSection(false);
                  setRoomNameSearch('');
                  setRoomNameSearchResults([]);
                  handleRoomChange(item);
                }}>
                <div className="!w-8 !h-8 scale-90 flex-shrink-0">
                  {renderAvatar(item)}
                </div>
                <p className="ml-2 text-[14px] font-medium text-[#1E293B] break-all">
                  {item.name}
                </p>
              </div>
            ))}
            {isSearchingRoomNameRef.current ? (
              <Spinner className="!h-fit py-3" iconClassName="h-6 w-6" />
            ) : (
              <></>
            )}
          </div>
        ) : (
          <></>
        )}
      </div>
      <div className="flex items-center mb-[10px] pr-4">
        <div
          onClick={goToBookmark}
          className={`${room === BOOKMARK_ROUTER_NAME && 'bg-white'} h-[36px] p-3 cursor-pointer rounded-md flex items-center gap-1 flex-grow`}>
          <ImageRound
            src="/icons/save-chat.svg"
            name="Save chat icon"
            className="!w-3 !h-3.5 text-gray-400 cursor-pointer"
          />
          <p className={` text-[#77858F] text-[14px] font-medium`}>
            ブックマーク
          </p>
        </div>
        <div className="flex items-center w-fit flex-shrink-0 justify-between">
          <Popover className="relative">
            {({ open, close }) => {
              return (
                <>
                  <DynamicTooltip
                    content={'チャットルームの絞り込み'}
                    placement="top">
                    <PopoverButton
                      className={`focus:outline-none ${open && 'rounded-full bg-white'} w-[36px] h-[36px] flex items-center justify-center`}>
                      <ImageRound
                        src="/icons/filter.svg"
                        name="Filter icon"
                        className="!w-4 !h-4 text-gray-400 cursor-pointer"
                      />
                    </PopoverButton>
                  </DynamicTooltip>
                  <Transition
                    as={Fragment}
                    enter="transition ease-out duration-200"
                    enterFrom="opacity-0 translate-y-1"
                    enterTo="opacity-100 translate-y-0"
                    leave="transition ease-in duration-150"
                    leaveFrom="opacity-100 translate-y-0"
                    leaveTo="opacity-0 translate-y-1">
                    <PopoverPanel className="absolute left-0 z-10 min-w-[204px] max-w-[204px] transform">
                      <div className="bg-[#5B6770] text-white rounded-[10px] p-[6px] space-y-1 mt-2 text-sm font-medium">
                        <p
                          className={`p-[12px] hover:bg-[#7D8A94] leading-none rounded-[6px] ${initialLoadSearch ? 'hover:cursor-not-allowed' : 'hover:cursor-pointer'} ${searchRoomType == '' && 'bg-[#7D8A94]'}`}
                          onClick={() => {
                            if (!initialLoadSearch) {
                              setSearchRoomType('');
                              close();
                            }
                          }}>
                          すべてのチャット
                        </p>
                        <p
                          className={`p-[12px] hover:bg-[#7D8A94] leading-none rounded-[6px] ${initialLoadSearch ? 'hover:cursor-not-allowed' : 'hover:cursor-pointer'} ${searchRoomType == ChatRoomType.UNREAD && 'bg-[#7D8A94]'}`}
                          onClick={() => {
                            if (!initialLoadSearch) {
                              setSearchRoomType(ChatRoomType.UNREAD);
                              close();
                            }
                          }}>
                          未読があるチャット
                        </p>
                        <p
                          className={`p-[12px] hover:bg-[#7D8A94] leading-none rounded-[6px] ${initialLoadSearch ? 'hover:cursor-not-allowed' : 'hover:cursor-pointer'} ${searchRoomType == ChatRoomType.GROUP && 'bg-[#7D8A94]'}`}
                          onClick={() => {
                            if (!initialLoadSearch) {
                              setSearchRoomType(ChatRoomType.GROUP);
                              close();
                            }
                          }}>
                          グループチャット
                        </p>
                        <p
                          className={`p-[12px] hover:bg-[#7D8A94] leading-none rounded-[6px] ${initialLoadSearch ? 'hover:cursor-not-allowed' : 'hover:cursor-pointer'} ${searchRoomType == ChatRoomType.PRIVATE && 'bg-[#7D8A94]'}`}
                          onClick={() => {
                            if (!initialLoadSearch) {
                              setSearchRoomType(ChatRoomType.PRIVATE);
                              close();
                            }
                          }}>
                          個人チャット
                        </p>
                      </div>
                    </PopoverPanel>
                  </Transition>
                </>
              );
            }}
          </Popover>

          {session?.user.permissions &&
            hasPermissionInArray(
              session?.user.permissions,
              PermissionsSystem.CHAT_ADD,
            ) && (
              <DynamicTooltip
                content={'チャットルームの新規作成'}
                placement="top">
                <div className="w-[36px] h-[36px] flex items-center justify-center">
                  <ImageRound
                    src="/icons/add-chat.svg"
                    name="Add icon"
                    className="!w-[18px] !h-[18px] text-gray-400 hover:cursor-pointer cursor-pointer"
                    onClick={() => setIsModalOpen(true)}
                  />
                </div>
              </DynamicTooltip>
            )}
        </div>
      </div>
      {!searchRoomType && (
        <div
          className={`flex-grow w-full pr-4 mt-3 h-[calc(100vh_-_205px)] ${dataChatList.length > 0 && !initialLoad ? 'overflow-y-auto' : 'overflow-y-hidden !h-[calc(100vh_-_200px)]'} overflow-x-hidden scrollbar-gutter-stable`}>
          {dataChatList && dataChatList.length > 0 ? (
            dataChatList.map((item) => (
              <div
                key={item?.code}
                className={`flex mb-1 relative w-full group items-center hover:cursor-pointer py-[12px] px-[10px] hover:bg-[#F8FAFC] rounded-md ${chatRoomCode === item.code && 'bg-[#FFFFFF]'}`}
                onClick={() => {
                  if (item.code !== chatRoomCode) {
                    handleRoomChange(item);
                  }
                }}>
                <div className="absolute top-1 left-0.5">
                  <DynamicTooltip
                    content={item.pinAt ? 'ピンを外す' : 'ピン留め'}
                    placement="top">
                    <div
                      className={`group-hover:block group-hover:opacity-60 ${item?.pinAt ? 'visible' : 'hidden'}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePinClick({
                          code: item.code,
                          isPin: item.pinAt !== null,
                        });
                      }}>
                      <ImageRound
                        className="w-[13px] h-[15px] hover:cursor-pointer"
                        src="/icons/pin-chat.svg"
                        border="full"
                        name="Pin chat"
                      />
                    </div>
                  </DynamicTooltip>
                </div>

                <div className="!w-8 !h-8">{renderAvatar(item)}</div>

                <p
                  className={`ml-2 text-[15px] break-all ${item?.unreadMessages > 0 ? (item.isMuted ? 'w-[calc(100%_-_100px)]' : 'w-[calc(100%_-_70px)]') : item.isMuted ? 'w-[calc(100%_-_70px)]' : 'w-[calc(100%_-_40px)]'} text-justify font-medium `}>
                  {item.code &&
                  chatRoomNameEditing.find(
                    (room) => room.roomCode === item.code,
                  )
                    ? chatRoomNameEditing.find(
                        (room) => room.roomCode === item.code,
                      )?.roomName
                    : item?.name || ''}
                </p>

                {item.isMuted && (
                  <div
                    className={`absolute top-1/2 -translate-y-1/2  ${item?.unreadMessages > 0 ? 'right-[38px]' : 'right-2'}`}>
                    <ImageRound
                      className={` w-fit h-fit hover:cursor-pointer `}
                      src="/icons/mute.svg"
                      name="mute icon"
                    />
                  </div>
                )}

                {item?.unreadMessages > 0 && (
                  <p className="absolute top-1/2 -translate-y-1/2 right-2 rounded-full w-[20px] pt-[2px] h-[20px] bg-[#E95062] text-[10px] font-medium text-center text-white leading-4">
                    {item?.unreadMessages}
                  </p>
                )}
              </div>
            ))
          ) : (
            <p className="text-center text-gray-500 mt-4">
              {!initialLoad && 'チャットがありません'}
            </p>
          )}
          <div ref={listRoomRef} className="h-7">
            <div>
              {initialLoad ? (
                <RowSkeleton
                  numberOfRows={20}
                  className="!h-[50px] !bg-[#E6F3FB]"
                />
              ) : (
                <div className="w-full h-6"></div>
              )}
            </div>
          </div>
        </div>
      )}

      {searchRoomType && (
        <>
          <div
            className={`flex-grow w-full pr-4 mt-3 h-[calc(100vh_-_205px)]  ${filteredChatList.length > 0 && !initialLoadSearch ? 'overflow-y-auto' : 'overflow-y-hidden'} overflow-x-hidden scrollbar-gutter-stable`}>
            {filteredChatList && filteredChatList.length > 0 ? (
              filteredChatList.map((item) => (
                <div
                  key={item?.code}
                  className={`flex mb-1 relative w-full group items-center hover:cursor-pointer py-[12px] px-[10px] hover:bg-[#F8FAFC] rounded-md ${chatRoomCode === item.code && 'bg-[#FFFFFF]'}`}
                  onClick={() => {
                    setLastItemId(null);
                    handleSetChatRoomParam(item.code);
                    handleResetChatRoomUnreadMessages(item);
                    setSearchChatMsg('');
                    setIsReload(false);
                  }}>
                  <div
                    className={`absolute group-hover:block group-hover:opacity-60 top-1 left-0.5 ${item?.pinAt ? 'visible' : 'hidden'}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePinClick({
                        code: item.code,
                        isPin: item.pinAt !== null,
                      });
                    }}>
                    <ImageRound
                      className="w-[13px] h-[15px] hover:cursor-pointer"
                      src="/icons/pin-chat.svg"
                      border="full"
                      name="Pin chat"
                    />
                  </div>
                  <div className="!w-8 !h-8">{renderAvatar(item)}</div>
                  <p
                    className={`ml-2 text-[15px] break-all ${item?.unreadMessages > 0 ? (item.isMuted ? 'w-[calc(100%_-_100px)]' : 'w-[calc(100%_-_70px)]') : item.isMuted ? 'w-[calc(100%_-_70px)]' : 'w-[calc(100%_-_40px)]'} text-justify font-medium `}>
                    {item.code &&
                    chatRoomNameEditing.find(
                      (room) => room.roomCode === item.code,
                    )
                      ? chatRoomNameEditing.find(
                          (room) => room.roomCode === item.code,
                        )?.roomName
                      : item?.name || ''}
                  </p>
                  {item.isMuted && (
                    <div
                      className={`absolute top-1/2 -translate-y-1/2  ${item?.unreadMessages > 0 ? 'right-[38px]' : 'right-2'}`}>
                      <ImageRound
                        className={` w-fit h-fit hover:cursor-pointer `}
                        src="/icons/mute.svg"
                        name="mute icon"
                      />
                    </div>
                  )}
                  {item?.unreadMessages > 0 && (
                    <p className="absolute top-1/2 -translate-y-1/2 right-2 rounded-full w-[20px] pt-[2px] h-[20px] bg-[#E95062] text-[10px] font-medium text-center text-white leading-4">
                      {item?.unreadMessages}
                    </p>
                  )}
                </div>
              ))
            ) : (
              <>
                {!initialLoadSearch && (
                  <p className="text-center text-gray-500 mt-4">
                    {!initialLoadSearch && 'チャットがありません'}
                  </p>
                )}
              </>
            )}
            <div ref={listSearchRoomRef} className="h-7">
              <div>
                {initialLoadSearch ? (
                  <RowSkeleton
                    numberOfRows={20}
                    className="!h-[50px] !bg-[#E6F3FB]"
                  />
                ) : (
                  <div className="w-full h-6"></div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {isModalOpen && (
        <ActionsAddMembersModal
          open={isModalOpen}
          dashboardMemberList={dashboardMemberList}
          dataOptionsParticipants={dataOptionsParticipants}
          onClose={() => setIsModalOpen(false)}
          createChatMutation={createChatMutation}
        />
      )}

      {openSearchMessagesModal && (
        <AllChatRoomSearchMessagesModal
          open={true}
          isSearchingMessagesRef={isSearchingMessagesRef}
          dashboardMemberList={dashboardMemberList}
          searchMessageResults={searchMessageResults}
          allRoomChatMsgSearch={allRoomChatMsgSearch}
          setAllRoomChatMsgSearch={setAllRoomChatMsgSearch}
          setRoomNameSearch={setRoomNameSearch}
          searchResultsPage={searchResultsPage}
          setSearchMessageResults={setSearchMessageResults}
          setSearchResultsPage={setSearchResultsPage}
          handleConfirmGetDataDetailEvent={() => {}}
          hasMoreSearchResultDetail={hasMoreSearchResultDetail}
          onSubmit={(searchChatMsg: string, page: number) => {
            searchMessagesInAllRooms({
              searchChatMsg,
              pageNumber: page,
            });
          }}
          onClose={() => {
            setAllRoomChatMsgSearch('');
            setOpenSearchMessagesModal(false);
            setSearchResultsPage(1);
            setSearchMessageResults(undefined);
          }}
          handleBookmark={(data: { uuid: string; isBookmark: boolean }) => {
            bookMarkMsg(data);
          }}
        />
      )}

      {showWarningChatUploadingModal && pendingRoomChange && (
        <ChatWarningUploadingFilesModal
          open={showWarningChatUploadingModal}
          onClose={() => {
            setShowWarningChatUploadingModal(false);
          }}
          onConfirm={() => {
            setShowWarningChatUploadingModal(false);
            cancelUploadChatFiles();
            doRoomChange(pendingRoomChange);
          }}
        />
      )}
    </aside>
  );
};

export default ListChatUsers;
