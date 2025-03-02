'use client';
import {
  Fragment,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';

import { useMutation } from 'react-query';
import { useInView } from 'react-intersection-observer';
import { useSession } from 'next-auth/react';
import Tippy from '@tippyjs/react';
import {
  Popover,
  PopoverButton,
  PopoverPanel,
  Transition,
} from '@headlessui/react';
import { useRouter, useSearchParams } from 'next/navigation';
import 'tippy.js/dist/tippy.css';

import ImageRound from '@components/common/ImageRound';
import InputSearch from '@components/common/InputSearch';
import ActionsAddMembersModal from '@components/modals/ActionsAddMembersModal';
import socketEventEmitter from '@components/socket/socketEventEmitter';
import RowSkeleton from '@components/skeleton/RowSkeleton';
import AvatarIconWithDynamicColor from '@components/common/AvatarIcon';

import useDebounceText from '@hooks/useDebounceText';

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
import {
  ChatDashboardMember,
  ChatRoomItem,
  WebSocketMessageData,
} from '@interfaces/chat';
import { BasePagination } from '@interfaces/common';
import { Profile } from '@interfaces/user';
import api from '@base/api';

interface dataProps {
  dataChatList: ChatRoomItem[];
  hasMore: boolean;
  chatRoomCode: string | null;
  filteredChatList: ChatRoomItem[];
  dashboardMemberList: Omit<Profile, 'birthday' | 'gender'>[];
  dashboardMembers: ChatDashboardMember[];
  setDataChatList: React.Dispatch<React.SetStateAction<ChatRoomItem[]>>;
  setLastItemId: React.Dispatch<
    React.SetStateAction<number | null | undefined>
  >;
  setFilteredChatList: React.Dispatch<React.SetStateAction<ChatRoomItem[]>>;
  setHasMore: React.Dispatch<React.SetStateAction<boolean>>;
  setSearchChatMsg: React.Dispatch<React.SetStateAction<string>>;
  handleSetChatRoomParam: (code: string) => void;
  handleRemoveChatRoomParam: () => void;
}
const ListChatUsers = ({
  hasMore,
  chatRoomCode,
  dataChatList,
  filteredChatList,
  dashboardMemberList,
  dashboardMembers,
  setLastItemId,
  setDataChatList,
  setFilteredChatList,
  setHasMore,
  setSearchChatMsg,
  handleSetChatRoomParam,
  handleRemoveChatRoomParam,
}: dataProps) => {
  const { ref: listRoomRef, inView: inViewListRoom } = useInView({
    threshold: 0.2,
  });
  const { ref: listSearchRoomRef, inView: inViewListSearchRoom } = useInView({
    threshold: 0.2,
  });

  const router = useRouter();

  const searchParams = useSearchParams();

  const room = searchParams.get('room');

  const { data: session } = useSession();

  const [hasMoreSearch, setHasMoreSearch] = useState<boolean>(true);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [initialLoad, setInitialLoad] = useState<boolean>(false);
  const [initialLoadSearch, setInitialLoadSearch] = useState<boolean>(false);

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [searchRoomType, setSearchRoomType] = useState<string>('');
  const [lastPinAt, setLastPinAt] = useState<string | null>();
  const [lastMsgItemRoom, setLastMsItemRoom] = useState<string>('');
  const [lastPinAtSearch, setLastPinAtSearch] = useState<string | null>();
  const [lastMsgItemRoomSearch, setLastMsItemRoomSearch] = useState<string>('');

  const {
    setChatList,
    chatRoomNameEditing,
    setIsReload,
    setChatRoomNotifications,
  } = useContext(ChatContext);
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

  const handleUpdateDatePin = useCallback(
    (data: ChatRoomItem) => {
      if (data.pinAt) {
        setDataChatList((prevDataChatList) => {
          const filteredList = prevDataChatList.filter(
            (item) => item.code !== data.code,
          );
          return [data, ...filteredList];
        });
        if (searchTerm || searchRoomType) {
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
        if (searchTerm || searchRoomType) {
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
      searchTerm,
      searchRoomType,
      setDataChatList,
      setFilteredChatList,
    ],
  );
  const handleUpdateDataHide = useCallback(
    (data: ChatRoomItem) => {
      setDataChatList((prevDataChatList) => {
        const filteredList = prevDataChatList.filter(
          (item) => item.code !== data.code,
        );
        return filteredList;
      });
      if (searchTerm) {
        setFilteredChatList((prevDataChatList) => {
          const filteredList = prevDataChatList.filter(
            (item) => item.code !== data.code,
          );
          return filteredList;
        });
      }
      if (data.code === chatRoomCode) {
        setLastItemId(null);
        if (dataChatList.length <= 1) {
          handleRemoveChatRoomParam();
        } else {
          if (chatRoomCode === dataChatList[0].code) {
            handleSetChatRoomParam(dataChatList[1].code);
          } else {
            handleSetChatRoomParam(dataChatList[0].code);
          }
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [setDataChatList, chatRoomCode],
  );

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
                  if (
                    currentItem.type === ChatRoomType.TASK &&
                    nextItem.type !== ChatRoomType.TASK
                  ) {
                    return -1;
                  } else if (
                    currentItem.type !== ChatRoomType.TASK &&
                    nextItem.type === ChatRoomType.TASK
                  ) {
                    return 1;
                  }
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
            const taskCardRoomIndex = unpinnedItems.findIndex(
              (item) => item.type == ChatRoomType.TASK,
            );
            const skillRoomIndex = unpinnedItems.findIndex(
              (item) => item.type == ChatRoomType.SKILL,
            );
            if (taskCardRoomIndex != -1 && skillRoomIndex != -1) {
              return [
                ...pinnedItems,
                ...unpinnedItems.filter(
                  (item) => item.type === ChatRoomType.TASK,
                ),
                ...unpinnedItems.filter(
                  (item) => item.type === ChatRoomType.SKILL,
                ),
                data.chatRoom,
                ...unpinnedItems.filter(
                  (item) =>
                    item.type !== ChatRoomType.TASK &&
                    item.type !== ChatRoomType.SKILL,
                ),
              ];
            }
            return [...pinnedItems, data.chatRoom, ...unpinnedItems];
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
        case SocketActions.HIDE_ROOM:
          handleUpdateDataHide(data.chatRoom);
          break;
        case SocketActions.CREATE_CHAT_ROOM:
        case SocketActions.SHOW_ROOM:
          handleCreateChatRoomLocal(data, hasMore);
          break;
        case SocketActions.ADD_PARTICIPANT:
          handleAddParticipantLocal(data);
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
    handleAddParticipantLocal,
    handleCreateChatRoomLocal,
    handleUpdateDataHide,
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

  const searchTermDebounce = useDebounceText(searchTerm, 1000);

  // Handle create chat
  const createChat = async (data: {
    name: string;
    participantIds: number[];
  }): Promise<ChatRoomItem> => {
    const response = await api.post(apiRouters.CHAT_LIST, data);
    return response.data;
  };

  const createChatMutation = useMutation({
    mutationFn: createChat,
    onSuccess: () => {},
    onError: () => {},
  });

  // Action search
  const handleGetDataSearchRoomChat = async ({
    page,
    name,
    showLastMessageAt,
  }: {
    page: number;
    name: string;
    showLastMessageAt?: boolean;
  }) => {
    setInitialLoadSearch(true);
    const apiUrl = `${apiRouters.CHAT_LIST}?page=${page}&page_size=${PAGINATION_PAGE_SIZE_MEDIUM}${name ? `&name=${encodeURIComponent(name)}` : ''}${lastMsgItemRoomSearch && showLastMessageAt ? `&last_message_at=${lastMsgItemRoomSearch}` : ''}${lastPinAtSearch ? `&pin_at=${lastPinAtSearch}` : ''}${searchRoomType ? `&type=${searchRoomType}` : ''}`;
    return await api.get<BasePagination<ChatRoomItem[]>>(apiUrl);
  };

  const { mutate: getDataSearchRoomChat } = useMutation(
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
  useEffect(() => {
    if (searchTermDebounce || searchRoomType) {
      setFilteredChatList([]);
      getDataSearchRoomChat({
        name: searchTermDebounce,
        page: 1,
        showLastMessageAt: false,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getDataSearchRoomChat, searchTermDebounce, searchRoomType]);

  useEffect(() => {
    if (
      inViewListSearchRoom &&
      filteredChatList.length > PAGINATION_PAGE_SIZE_MEDIUM - 1 &&
      hasMoreSearch
    ) {
      getDataSearchRoomChat({
        name: searchTermDebounce,
        page: 1,
        showLastMessageAt: true,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inViewListSearchRoom]);

  const renderAvatar = (item: ChatRoomItem) => {
    if (!item) return null;

    if (item.type === AvatarChat.GROUP) {
      return (
        <ImageRound
          className="w-8 h-8"
          src="/icons/multi-users.svg"
          border="full"
          name="Avatar user"
        />
      );
    }

    if (item.type === AvatarChat.TASK) {
      return (
        <ImageRound
          className="w-8 h-8"
          src="/icons/document.svg"
          border="full"
          name="Task"
        />
      );
    }

    if (item.type === AvatarChat.SKILL) {
      return (
        <ImageRound
          className="w-8 h-8"
          src="/icons/skill-room.svg"
          border="full"
          name="Skill"
        />
      );
    }

    if (item.type === AvatarChat.CALENDAR) {
      return (
        <ImageRound
          className="w-8 h-8"
          src="/icons/calendar-room.svg"
          border="full"
          name="Calendar"
        />
      );
    }

    const avatarColor =
      dashboardMembers.find((member) => {
        if (item.type === AvatarChat.PRIVATE) {
          return (
            member.id ===
            item.participants.find(
              (participant) => participant.id !== session?.user.id,
            )?.id
          );
        }
        return member.id === item.participants[0].id;
      })?.avatarColor || '';

    return (
      <div className="h-6">
        {AvatarIconWithDynamicColor({
          color: avatarColor,
          size: 33,
        })}
      </div>
    );
  };

  const goToBookmark = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('room', 'bookmark');

    router.push(`/chat?${params.toString()}`, { scroll: false });
  };

  return (
    <aside className="w-[350px] max-w-[350px] min-w-[350px] border-r-[2px] pr-3 pt-5">
      <div className="flex items-center justify-between mb-5">
        <InputSearch
          placeholder="全体のキーワードを検索"
          className="w-full"
          inputClassName="!py-2 !border-[#77858F]"
          onChange={(e) => {
            setHasMoreSearch(true);
            setLastPinAtSearch(null);
            setLastMsItemRoomSearch('');
            setSearchTerm(e.target.value);
          }}
        />
      </div>
      <div className="flex items-center mb-5 px-3">
        <div
          onClick={goToBookmark}
          className={`${room === BOOKMARK_ROUTER_NAME && 'bg-white'} h-[36px] p-3 cursor-pointer rounded-md flex items-center gap-1 w-4/5`}>
          <ImageRound
            src="/icons/save-chat.svg"
            name="Save chat icon"
            className="!w-3 !h-3.5 text-gray-400 cursor-pointer"
          />
          <p className={` text-[#77858F] text-[14px] font-medium`}>
            ブックマーク
          </p>
        </div>
        <div className="flex items-center w-1/5 justify-between">
          <Popover className="relative">
            {({ open }) => {
              return (
                <>
                  <Tippy
                    content={'チャットルームの絞り込み'}
                    arrow={false}
                    delay={1000}
                    placement="top"
                    offset={[0, 5]}>
                    <PopoverButton
                      className={`focus:outline-none ${open && 'rounded-full bg-white'} w-[36px] h-[36px] flex items-center justify-center`}>
                      <ImageRound
                        src="/icons/filter.svg"
                        name="Filter icon"
                        className="!w-4 !h-4 text-gray-400 cursor-pointer"
                      />
                    </PopoverButton>
                  </Tippy>
                  <Transition
                    as={Fragment}
                    enter="transition ease-out duration-200"
                    enterFrom="opacity-0 translate-y-1"
                    enterTo="opacity-100 translate-y-0"
                    leave="transition ease-in duration-150"
                    leaveFrom="opacity-100 translate-y-0"
                    leaveTo="opacity-0 translate-y-1">
                    <PopoverPanel className="absolute left-0 z-10 min-w-[196px] max-w-[196px] transform">
                      <div className="bg-[#5B6770] text-white rounded-[6px] py-[5px] mt-2 text-sm font-medium">
                        <p
                          className={`py-[10px] px-[14px] hover:bg-[#7D8A94] hover:cursor-pointer ${searchRoomType == '' && 'bg-[#7D8A94]'}`}
                          onClick={() => {
                            setSearchRoomType('');
                          }}>
                          すべてのチャット
                        </p>
                        <p
                          className={`py-[10px] px-[14px] hover:bg-[#7D8A94] hover:cursor-pointer ${searchRoomType == ChatRoomType.UNREAD && 'bg-[#7D8A94]'}`}
                          onClick={() => {
                            setSearchRoomType(ChatRoomType.UNREAD);
                          }}>
                          未読があるチャット
                        </p>
                        <p
                          className={`py-[10px] px-[14px] hover:bg-[#7D8A94] hover:cursor-pointer ${searchRoomType == ChatRoomType.GROUP && 'bg-[#7D8A94]'}`}
                          onClick={() => {
                            setSearchRoomType(ChatRoomType.GROUP);
                          }}>
                          グループチャット
                        </p>
                        <p
                          className={`py-[10px] px-[14px] hover:bg-[#7D8A94] hover:cursor-pointer ${searchRoomType == ChatRoomType.PRIVATE && 'bg-[#7D8A94]'}`}
                          onClick={() => {
                            setSearchRoomType(ChatRoomType.PRIVATE);
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
              <Tippy
                content={'チャットルームの新規作成'}
                arrow={false}
                delay={1000}
                placement="top"
                offset={[0, 5]}>
                <div>
                  <ImageRound
                    src="/icons/add-chat.svg"
                    name="Add icon"
                    className="!w-[17px] !h-[17px] text-gray-400 hover:cursor-pointer cursor-pointer"
                    onClick={() => setIsModalOpen(true)}
                  />
                </div>
              </Tippy>
            )}
        </div>
      </div>
      {!searchTerm && !searchRoomType && (
        <>
          {' '}
          <div
            className={`flex-grow w-[340px] mt-3 h-[calc(100vh_-_210px)] ${dataChatList.length > 0 && !initialLoad ? 'overflow-y-auto' : 'overflow-y-hidden !h-[calc(100vh_-_200px)]'} overflow-x-hidden scrollbar-gutter-stable`}>
            {dataChatList && dataChatList.length > 0 ? (
              dataChatList.map((item) => (
                <div
                  key={item?.code}
                  className={`flex relative group items-center hover:cursor-pointer py-[12px] px-[10px] hover:bg-[#F8FAFC] rounded-md ${chatRoomCode === item.code && 'bg-[#FFFFFF]'}`}
                  onClick={() => {
                    setLastItemId(null);
                    handleSetChatRoomParam(item.code)
                    handleResetChatRoomUnreadMessages(item);
                    setSearchChatMsg('');
                    setIsReload(false);
                  }}>
                  <Tippy
                    content={item.pinAt ? 'ピンを外す' : 'ピン留め'}
                    arrow={false}
                    delay={1000}
                    placement="top"
                    offset={[0, 5]}>
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
                        className="w-[14px] h-[16px] hover:cursor-pointer"
                        src="/icons/pin-chat.svg"
                        border="full"
                        name="Pin chat"
                      />
                    </div>
                  </Tippy>

                  <div className="relative">{renderAvatar(item)}</div>
                  <div className="ml-2 flex gap-1 items-center">
                    <p className={`text-sm break-words w-[260px] font-medium `}>
                      {item.code &&
                      chatRoomNameEditing.find(
                        (room) => room.roomCode === item.code,
                      )
                        ? chatRoomNameEditing.find(
                            (room) => room.roomCode === item.code,
                          )?.roomName
                        : item?.name || ''}
                    </p>
                  </div>
                  {item?.unreadMessages > 0 && (
                    <p className="absolute top-1/2 -translate-y-1/2 right-2 rounded-full w-[20px] pt-[2px] h-[20px] bg-[#C32E2E] text-[10px] text-center text-white leading-4">
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
                  <RowSkeleton numberOfRows={20} className="!h-[50px]" />
                ) : (
                  <div className="w-full h-6"></div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
      {((searchTerm && searchTermDebounce === searchTerm) ||
        searchRoomType) && (
        <>
          <div
            className={`flex-grow w-[340px] mt-3 h-[calc(100vh_-_210px)]  ${filteredChatList.length > 0 && !initialLoadSearch ? 'overflow-y-auto' : 'overflow-y-hidden'} overflow-x-hidden scrollbar-gutter-stable`}>
            {filteredChatList && filteredChatList.length > 0 ? (
              filteredChatList.map((item) => (
                <div
                  key={item?.code}
                  className={`flex relative group items-center hover:cursor-pointer py-[12px] px-[10px] hover:bg-[#F8FAFC] rounded-md ${chatRoomCode === item.code && 'bg-[#FFFFFF]'}`}
                  onClick={() => {
                    setLastItemId(null);
                    handleSetChatRoomParam(item.code)
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
                      className="w-[14px] h-[16px] hover:cursor-pointer"
                      src="/icons/pin-chat.svg"
                      border="full"
                      name="Pin chat"
                    />
                  </div>
                  <div className="relative">{renderAvatar(item)}</div>
                  <div className="ml-2 flex gap-1 items-center">
                    <p className="text-sm break-words w-[260px] font-medium">
                      {item.code &&
                      chatRoomNameEditing.find(
                        (room) => room.roomCode === item.code,
                      )
                        ? chatRoomNameEditing.find(
                            (room) => room.roomCode === item.code,
                          )?.roomName
                        : item?.name || ''}
                    </p>
                  </div>
                  {item?.unreadMessages > 0 && (
                    <p className="absolute top-1/2 -translate-y-1/2 right-2 rounded-full pt-[2px] w-[20px] h-[20px] bg-[#C32E2E] text-[10px] text-center text-white leading-4">
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
                  <RowSkeleton numberOfRows={20} className="!h-[50px]" />
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
          dashboardMembers={dashboardMembers}
          onClose={() => setIsModalOpen(false)}
          createChatMutation={createChatMutation}
        />
      )}
    </aside>
  );
};

export default ListChatUsers;
