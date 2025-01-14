'use client';
import { Fragment, useCallback, useContext, useEffect, useState } from 'react';

import { useMutation } from 'react-query';
import {
  Popover,
  PopoverButton,
  PopoverPanel,
  Transition,
} from '@headlessui/react';
import { useInView } from 'react-intersection-observer';
import { useSession } from 'next-auth/react';

import ImageRound from '@components/common/ImageRound';
import InputSearch from '@components/common/InputSearch';
import Button from '@components/common/Button';
import ActionsAddMembersModal from '@components/modals/ActionsAddMembersModal';
import Input from '@components/common/Input';
import socketEventEmitter from '@components/socket/socketEventEmitter';
import RowSkeleton from '@components/skeleton/RowSkeleton';

import useDebounceText from '@hooks/useDebounceText';

import { apiRouters } from '@constants/routers';
import {
  AvatarChat,
  ChatRoomType,
  PermissionsSystem,
  SocketActions,
} from '@constants/enums';
import { PAGINATION_PAGE_SIZE_MEDIUM } from '@constants';

import {
  convertToCurrentTimezone,
  encodeFormatDateISO,
  formatCheckDate,
} from '@utils/date';
import { hasPermissionInArray } from '@utils';
import { ChatContext } from '@providers/ChatProvider';
import { ChatRoomItem, WebSocketMessageData } from '@interfaces/chat';
import { BasePagination } from '@interfaces/common';
import { Profile } from '@interfaces/user';
import api from '@base/api';
import { useWebSocket } from '@providers/WebSocketProvider';

interface dataProps {
  dataChatList: ChatRoomItem[];
  hasMore: boolean;
  chatRoomCode: string | null;
  filteredChatList: ChatRoomItem[];
  dashboardMemberList: Omit<Profile, 'birthday' | 'gender'>[];
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

  const { data: session } = useSession();

  const [hasMoreSearch, setHasMoreSearch] = useState<boolean>(true);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isSettingOpen, setIsSettingOpen] = useState<number | null>(null);
  const [initialLoad, setInitialLoad] = useState<boolean>(false);
  const [initialLoadSearch, setInitialLoadSearch] = useState<boolean>(false);

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [lastPinAt, setLastPinAt] = useState<string | null>();
  const [lastMsgItemRoom, setLastMsItemRoom] = useState<string>('');
  const [lastPinAtSearch, setLastPinAtSearch] = useState<string | null>();
  const [lastMsgItemRoomSearch, setLastMsItemRoomSearch] = useState<string>('');
  const [participantsList, setParticipantsList] = useState<number[]>([]);

  const [selectedNotificationOption, setSelectedNotificationOption] =
    useState('all');
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
        if (searchTerm) {
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
        });
        if (searchTerm) {
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
    [hasMore, hasMoreSearch, searchTerm, setDataChatList, setFilteredChatList],
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
        setParticipantsList([]);
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
        setParticipantsList([]);
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

  const postHideRoomChat = async (code: string) => {
    const { data: response } = await api.put(apiRouters.CHAT_HIDE(`${code}`));
    return response;
  };

  const { mutate: hideRoomChat } = useMutation(postHideRoomChat, {
    onSuccess: async () => {},
    onError: () => {},
  });
  // Action hide
  const handleHideClick = (code: string) => {
    hideRoomChat(code);
  };

  const searchTermDebounce = useDebounceText(searchTerm, 1000);

  const toggleSetting = (index: number) => {
    setIsSettingOpen(isSettingOpen === index ? null : index);
  };

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
  }: {
    page: number;
    name: string;
  }) => {
    setInitialLoadSearch(true);
    const apiUrl = `${apiRouters.CHAT_LIST}?page=${page}&page_size=${PAGINATION_PAGE_SIZE_MEDIUM}${name ? `&name=${encodeURIComponent(name)}` : ''}${lastMsgItemRoomSearch ? `&last_message_at=${lastMsgItemRoomSearch}` : ''}${lastPinAtSearch ? `pin_at=${lastPinAtSearch}` : ''}`;
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
    if (searchTermDebounce) {
      setFilteredChatList([]);
      getDataSearchRoomChat({
        name: searchTermDebounce,
        page: 1,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getDataSearchRoomChat, searchTermDebounce]);

  useEffect(() => {
    if (
      inViewListSearchRoom &&
      filteredChatList.length > PAGINATION_PAGE_SIZE_MEDIUM - 1 &&
      hasMoreSearch
    ) {
      getDataSearchRoomChat({
        name: searchTermDebounce,
        page: 1,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inViewListSearchRoom]);

  return (
    <aside className="w-[350px] max-w-[350px] min-w-[350px] border-r-[2px] pr-3">
      <div className="flex items-center justify-between">
        <InputSearch
          placeholder="グループやメッセージの検索"
          className="w-[280px]"
          inputClassName="!py-2"
          onChange={(e) => {
            setHasMoreSearch(true);
            setLastPinAtSearch(null);
            setLastMsItemRoomSearch('');
            setSearchTerm(e.target.value);
          }}
        />
        <ImageRound
          src="/icons/filter.svg"
          name="Filter icon"
          className="!w-4 !h-4 text-gray-400 cursor-pointer"
        />
        {session?.user.permissions &&
          hasPermissionInArray(
            session?.user.permissions,
            PermissionsSystem.CHAT_ADD,
          ) && (
            <ImageRound
              src="/icons/add.svg"
              name="Add icon"
              className="!w-4 !h-4 text-gray-400 hover:cursor-pointer cursor-pointer"
              onClick={() => setIsModalOpen(true)}
            />
          )}
      </div>
      {!searchTerm && (
        <div
          className={`flex-grow w-[340px] mt-3 h-[calc(100vh_-_166px)] ${dataChatList.length > 0 && !initialLoad ? 'overflow-y-auto' : 'overflow-y-hidden'} overflow-x-hidden scrollbar-gutter-stable`}>
          {dataChatList && dataChatList.length > 0 ? (
            dataChatList.map((item, index) => (
              <div
                key={item?.code}
                className={`flex items-center border-b-[1.5px] hover:cursor-pointer hover:bg-[#eaf8ff] ${chatRoomCode === item.code && 'bg-[#eaf8ff]'}`}
                onClick={() => {
                  setLastItemId(null);
                  handleSetChatRoomParam(`${item?.code}`);
                  handleResetChatRoomUnreadMessages(item);
                  setSearchChatMsg('');
                  setIsReload(false);
                }}>
                <div className="relative">
                  <ImageRound
                    className="w-8 h-8"
                    src={
                      item?.type === AvatarChat.GROUP
                        ? '/icons/multi-users.svg'
                        : item?.type === AvatarChat.TASK ||
                            item?.type === AvatarChat.SKILL
                          ? '/icons/document.svg'
                          : '/images/avatar-default.svg'
                    }
                    border="full"
                    name={
                      item?.type === AvatarChat.GROUP
                        ? 'Avatar user'
                        : item?.type === AvatarChat.TASK ||
                            item?.type === AvatarChat.SKILL
                          ? 'Task'
                          : 'Avatar user'
                    }
                  />

                  {item?.pinAt && (
                    <div className="absolute -top-1 -right-2">
                      <ImageRound
                        className="w-5 h-5"
                        src="/icons/pin-round.svg"
                        border="full"
                        name="Pin round"
                      />
                    </div>
                  )}
                </div>
                <div className="ml-3 flex flex-grow justify-between">
                  <p className="text-sm max-w-[190px] font-medium truncate">
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
                <div
                  className="relative flex flex-col items-center ml-auto"
                  onClick={(e) => e.stopPropagation()}>
                  <p className="text-[11px] absolute top-0">
                    {item?.lastMessageAt
                      ? formatCheckDate(
                          convertToCurrentTimezone(item?.lastMessageAt),
                        )
                      : ''}
                  </p>
                  <Popover className="relative">
                    {({ open: outerOpen, close }) => (
                      <>
                        {item?.unreadMessages > 0 && (
                          <p className="absolute top-[20px] left-2 rounded-full w-4 h-4 bg-error text-[10px] text-center text-white leading-4">
                            {item?.unreadMessages}
                          </p>
                        )}
                        <PopoverButton
                          className={`flex w-full px-3 py-2 items-center rounded-full hover:cursor-pointer focus:outline-none ${outerOpen ? 'text-primary' : ''}`}>
                          <ImageRound
                            className="scale-[0.5] text-xs ml-auto hover:cursor-pointer"
                            src="/icons/three-dots-vertical.svg"
                            border="full"
                            name="Three dots vertical"
                          />
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
                            className={`absolute ${
                              index >= dataChatList.length - 3 &&
                              dataChatList.length > 5
                                ? 'bottom-full mb-1'
                                : 'top-full mt-1'
                            }  right-1  z-[10] min-w-[146px]`}>
                            <div className="px-2 py-2 bg-white border rounded-lg shadow-lg">
                              <Popover className="relative">
                                {({ open: innerOpen, close: innerClose }) => (
                                  <>
                                    <PopoverButton
                                      className={`flex w-full items-center rounded focus:outline-none hover:bg-gray-100 ${innerOpen ? 'text-primary' : ''}`}
                                      onClick={() => toggleSetting(index)}>
                                      <p className="p-2 text-sm">通知設定</p>
                                    </PopoverButton>
                                    <PopoverPanel className="absolute right-[100px] top-32 bg-white border rounded-lg shadow-lg mt-1 z-[20] w-[219px]">
                                      <div className=" px-4 py-2">
                                        <div className="flex items-center">
                                          <p className="text-base font-semibold">
                                            通知設定
                                          </p>
                                          <p className="text-xs relative top-[1px]">
                                            （通知するトーク）
                                          </p>
                                        </div>
                                        <div className="mt-2">
                                          <label className="flex gap-x-2 text-xs items-end cursor-pointer">
                                            <div className="w-4">
                                              <Input
                                                type="radio"
                                                name={`notification-${index}`}
                                                className="!px-0 !py-0"
                                                checked={
                                                  selectedNotificationOption ===
                                                  'all'
                                                }
                                                onChange={() =>
                                                  setSelectedNotificationOption(
                                                    'all',
                                                  )
                                                }
                                              />
                                            </div>
                                            すべてのトークを通知
                                          </label>
                                          <label className="flex gap-x-2 text-xs items-center cursor-pointer mt-2">
                                            <div className="w-4 h-4">
                                              <Input
                                                type="radio"
                                                name={`notification-${index}`}
                                                className="!px-0 !py-0 h-4"
                                                checked={
                                                  selectedNotificationOption ===
                                                  'mentions'
                                                }
                                                onChange={() =>
                                                  setSelectedNotificationOption(
                                                    'mentions',
                                                  )
                                                }
                                              />
                                            </div>
                                            <span className="block w-[140px]">
                                              自分がメンションされたトークのみ通知
                                            </span>
                                          </label>
                                          <label className="flex gap-x-2 text-xs items-center cursor-pointer mt-2">
                                            <div className="w-4">
                                              <Input
                                                type="radio"
                                                name={`notification-${index}`}
                                                className="!px-0 !py-0 h-4"
                                                checked={
                                                  selectedNotificationOption ===
                                                  'none'
                                                }
                                                onChange={() =>
                                                  setSelectedNotificationOption(
                                                    'none',
                                                  )
                                                }
                                              />
                                            </div>
                                            通知しない
                                          </label>
                                        </div>
                                        <div className="flex justify-end mt-4">
                                          <Button
                                            variant="secondary"
                                            className="px-4 py-2 mr-2 text-xs bg-gray-200 rounded"
                                            onClick={() => {
                                              innerClose();
                                              close();
                                            }}>
                                            キャンセル
                                          </Button>
                                          <Button
                                            variant="primary"
                                            onClick={() => {
                                              innerClose();
                                              close();
                                            }}
                                            className="px-4 py-2 text-xs text-white rounded">
                                            OK
                                          </Button>
                                        </div>
                                      </div>
                                    </PopoverPanel>
                                  </>
                                )}
                              </Popover>
                              {item.type != AvatarChat.TASK &&
                                item.type != AvatarChat.SKILL && (
                                  <p
                                    className="py-2 px-2 text-sm whitespace-nowrap rounded cursor-pointer hover:bg-gray-100"
                                    onClick={() => {
                                      handlePinClick({
                                        code: item.code,
                                        isPin: item.pinAt !== null,
                                      });
                                      close();
                                    }}>
                                    {item?.pinAt === null
                                      ? 'ピン留め'
                                      : '固定を解除'}
                                  </p>
                                )}
                              {(item.type == AvatarChat.PRIVATE ||
                                item.type == AvatarChat.SELF) && (
                                <p
                                  className="py-2 text-sm px-2 rounded cursor-pointer hover:bg-gray-100"
                                  onClick={() => {
                                    setLastItemId(null)!;
                                    handleHideClick(item?.code);
                                    close();
                                  }}>
                                  非表示
                                </p>
                              )}
                            </div>
                          </PopoverPanel>
                        </Transition>
                      </>
                    )}
                  </Popover>
                </div>
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
      )}
      {searchTerm && searchTermDebounce === searchTerm && (
        <div
          className={`flex-grow w-[340px] mt-3 h-[calc(100vh_-_166px)]  ${filteredChatList.length > 0 && !initialLoadSearch ? 'overflow-y-auto' : 'overflow-y-hidden'} overflow-x-hidden scrollbar-gutter-stable`}>
          {filteredChatList && filteredChatList.length > 0 ? (
            filteredChatList.map((item, index) => (
              <div
                key={item?.code}
                className={`flex items-center border-b-[1.5px] hover:cursor-pointer hover:bg-[#eaf8ff] ${chatRoomCode === item.code && 'bg-[#eaf8ff]'}`}
                onClick={() => {
                  setLastItemId(null);
                  handleSetChatRoomParam(`${item?.code}`);
                  handleResetChatRoomUnreadMessages(item);
                  setIsReload(false);
                }}>
                <div className="relative">
                  {item?.type === AvatarChat.GROUP ? (
                    <ImageRound
                      className="w-8 h-8"
                      src="/icons/multi-users.svg"
                      border="full"
                      name="Avatar user"
                    />
                  ) : item?.type === AvatarChat.TASK ? (
                    <ImageRound
                      className="w-8 h-8"
                      src="/icons/document.svg"
                      border="full"
                      name="Task"
                    />
                  ) : (
                    <ImageRound
                      className="w-8 h-8"
                      src="/images/avatar-default.svg"
                      border="full"
                      name="Avatar user"
                    />
                  )}
                  {item?.pinAt && (
                    <div className="absolute -top-1 -right-2">
                      <ImageRound
                        className="w-5 h-5"
                        src="/icons/pin-round.svg"
                        border="full"
                        name="Pin round"
                      />
                    </div>
                  )}
                </div>
                <div className="ml-3 flex flex-grow justify-between">
                  <p className="text-sm max-w-[190px] font-medium truncate">
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
                <div
                  className="relative flex flex-col items-center ml-auto"
                  onClick={(e) => e.stopPropagation()}>
                  <p className="text-[11px] absolute top-0">
                    {item?.lastMessageAt
                      ? formatCheckDate(
                          convertToCurrentTimezone(item?.lastMessageAt),
                        )
                      : ''}
                  </p>
                  <Popover className="relative">
                    {({ open: outerOpen, close }) => (
                      <>
                        {item?.unreadMessages > 0 && (
                          <p className="absolute top-[20px] left-2 rounded-full w-4 h-4 bg-error text-[10px] text-center text-white leading-4">
                            {item?.unreadMessages}
                          </p>
                        )}
                        <PopoverButton
                          className={`flex w-full px-3 py-2 items-center rounded-full hover:cursor-pointer focus:outline-none ${outerOpen ? 'text-primary' : ''}`}>
                          <ImageRound
                            className="scale-[0.5] text-xs ml-auto hover:cursor-pointer"
                            src="/icons/three-dots-vertical.svg"
                            border="full"
                            name="Three dots vertical"
                          />
                        </PopoverButton>
                        <Transition
                          as={Fragment}
                          enter="transition ease-out duration-200"
                          enterFrom="opacity-0 translate-y-1"
                          enterTo="opacity-100 translate-y-0"
                          leave="transition ease-in duration-150"
                          leaveFrom="opacity-100 translate-y-0"
                          leaveTo="opacity-0 translate-y-1">
                          <PopoverPanel className="absolute top-full right-1 bg-white border rounded-lg shadow-lg mt-1 z-[10] min-w-[146px]">
                            <div className="px-2 py-2">
                              <Popover className="relative">
                                {({ open: innerOpen, close: innerClose }) => (
                                  <>
                                    <PopoverButton
                                      className={`flex w-full items-center rounded focus:outline-none hover:bg-gray-100 ${innerOpen ? 'text-primary' : ''}`}
                                      onClick={() => toggleSetting(index)}>
                                      <p className="p-2 text-sm">通知設定</p>
                                    </PopoverButton>
                                    <PopoverPanel className="absolute right-[100px] top-32 bg-white border rounded-lg shadow-lg mt-1 z-[20] w-[219px]">
                                      <div className=" px-4 py-2">
                                        <div className="flex items-center">
                                          <p className="text-base font-semibold">
                                            通知設定
                                          </p>
                                          <p className="text-xs relative top-[1px]">
                                            （通知するトーク）
                                          </p>
                                        </div>
                                        <div className="mt-2">
                                          <label className="flex gap-x-2 text-xs items-end cursor-pointer">
                                            <div className="w-4">
                                              <Input
                                                type="radio"
                                                name={`notification-${index}`}
                                                className="!px-0 !py-0"
                                                checked={
                                                  selectedNotificationOption ===
                                                  'all'
                                                }
                                                onChange={() =>
                                                  setSelectedNotificationOption(
                                                    'all',
                                                  )
                                                }
                                              />
                                            </div>
                                            すべてのトークを通知
                                          </label>
                                          <label className="flex gap-x-2 text-xs items-center cursor-pointer mt-2">
                                            <div className="w-4 h-4">
                                              <Input
                                                type="radio"
                                                name={`notification-${index}`}
                                                className="!px-0 !py-0 h-4"
                                                checked={
                                                  selectedNotificationOption ===
                                                  'mentions'
                                                }
                                                onChange={() =>
                                                  setSelectedNotificationOption(
                                                    'mentions',
                                                  )
                                                }
                                              />
                                            </div>
                                            <span className="block w-[140px]">
                                              自分がメンションされたトークのみ通知
                                            </span>
                                          </label>
                                          <label className="flex gap-x-2 text-xs items-center cursor-pointer mt-2">
                                            <div className="w-4">
                                              <Input
                                                type="radio"
                                                name={`notification-${index}`}
                                                className="!px-0 !py-0 h-4"
                                                checked={
                                                  selectedNotificationOption ===
                                                  'none'
                                                }
                                                onChange={() =>
                                                  setSelectedNotificationOption(
                                                    'none',
                                                  )
                                                }
                                              />
                                            </div>
                                            通知しない
                                          </label>
                                        </div>
                                        <div className="flex justify-end mt-4">
                                          <Button
                                            variant="secondary"
                                            className="px-4 py-2 mr-2 text-xs bg-gray-200 rounded"
                                            onClick={() => {
                                              innerClose();
                                              close();
                                            }}>
                                            キャンセル
                                          </Button>
                                          <Button
                                            variant="primary"
                                            onClick={() => {
                                              innerClose();
                                              close();
                                            }}
                                            className="px-4 py-2 text-xs text-white rounded">
                                            OK
                                          </Button>
                                        </div>
                                      </div>
                                    </PopoverPanel>
                                  </>
                                )}
                              </Popover>
                              {item.type != AvatarChat.TASK &&
                                item.type != AvatarChat.SKILL && (
                                  <p
                                    className="py-2 px-2 text-sm whitespace-nowrap rounded cursor-pointer hover:bg-gray-100"
                                    onClick={() => {
                                      handlePinClick({
                                        code: item.code,
                                        isPin: item.pinAt !== null,
                                      });
                                      close();
                                    }}>
                                    {item?.pinAt === null
                                      ? 'ピン留め'
                                      : '固定を解除'}
                                  </p>
                                )}
                              {(item.type == AvatarChat.PRIVATE ||
                                item.type == AvatarChat.SELF) && (
                                <p
                                  className="py-2 text-sm px-2 rounded cursor-pointer hover:bg-gray-100"
                                  onClick={() => {
                                    setLastItemId(null)!;
                                    handleHideClick(item?.code);
                                    close();
                                  }}>
                                  非表示
                                </p>
                              )}
                            </div>
                          </PopoverPanel>
                        </Transition>
                      </>
                    )}
                  </Popover>
                </div>
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
      )}

      {isModalOpen && (
        <ActionsAddMembersModal
          open={isModalOpen}
          dashboardMemberList={dashboardMemberList}
          onClose={() => setIsModalOpen(false)}
          participantsList={participantsList}
          setParticipantsList={setParticipantsList}
          createChatMutation={createChatMutation}
        />
      )}
    </aside>
  );
};

export default ListChatUsers;
