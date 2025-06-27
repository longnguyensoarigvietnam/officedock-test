'use client';
import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSessionCache } from '@providers/SessionCacheProvider';

import socketEventEmitter from '@components/socket/socketEventEmitter';
import Metadata from '@components/common/Metadata';

import { ChatRoomType, SocketActions } from '@constants/enums';
import { pageRouters } from '@constants/routers';
import { BOOKMARK_ROUTER_NAME, DEFAULT_TIME_TEXT } from '@constants';

import {
  ChatDashboardMember,
  ChatRoomItem,
  WebSocketMessageData,
} from '@interfaces/chat';

import useDashboardMemberList from '@hooks/useDashBoardMemberList';
import useCreationDataTask from '@hooks/useCreationDataTask';
import useTaskDurationDetail from '@hooks/useTaskDurationDetail';
import useContinueCounterTime from '@hooks/useContinueCounterTime';

import { generateUniqueId } from '@utils';

import { GlobalStateContext } from '@providers/GlobalStateProvider';
import { ChatContext } from '@providers/ChatProvider';
import { TaskContext } from '@providers/TaskProvider';

import ListChatUsers from './list';
import ChatDetail from './detail';
import BookmarkList from './bookmark';

const BoardChat = () => {
  // Router
  const searchParams = useSearchParams();
  const router = useRouter();
  const params = useMemo(
    () => new URLSearchParams(searchParams),
    [searchParams],
  );
  const chatRoomCode = searchParams.get('room');

  // Context
  const { setChatRoomNotifications } = useContext(ChatContext);
  const { totalNotifications } = useContext(GlobalStateContext);
  const { dataRunning } = useContext(TaskContext);

  // Custom hooks
  const { dashboardMemberList = [] } = useDashboardMemberList();
  const { creationDataTaskData } = useCreationDataTask({});

  const [lastItemId, setLastItemId] = useState<number | null>();
  const [hasMoreDetail, setHasMoreDetail] = useState<boolean>(true);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [hasMoreDetailOnScrollDown, setHasMoreDetailOnScrollDown] =
    useState(false);
  const [dataChatList, setDataChatList] = useState<ChatRoomItem[]>([]);
  const [filteredChatList, setFilteredChatList] = useState<ChatRoomItem[]>([]);
  const [searchChatMsg, setSearchChatMsg] = useState('');
  const { data: session } = useSessionCache();
  const [dashboardMembers, setDashboardMembers] = useState<
    ChatDashboardMember[]
  >([]);
  const [clientId] = useState(() => generateUniqueId());

  // Running task info
  const { taskDurationDetail } = useTaskDurationDetail({
    item: {
      id: `${dataRunning.id}`.replace('event', ''),
      type: `${dataRunning.type}`,
    },
  });

  const elapsedTime = useContinueCounterTime(
    taskDurationDetail?.taskDuration
      ? taskDurationDetail
      : { taskDuration: DEFAULT_TIME_TEXT, isStart: false },
  );

  // Update last item when change param
  useEffect(() => {
    if (!chatRoomCode) {
      setLastItemId(null);
    }
    if (chatRoomCode) {
      setLastItemId(null);
      setHasMoreDetail(true);
    }
  }, [chatRoomCode]);

  useEffect(() => {
    if (dashboardMemberList?.length) {
      const membersWithAvatars = dashboardMemberList.map((member) => {
        return {
          id: member.id,
          fullName: member.fullName,
          avatarColor: member?.avatarColor || '',
          avatarUrl: member?.avatar || '',
        };
      });
      setDashboardMembers(membersWithAvatars);
    }
  }, [dashboardMemberList]);

  // Socket Board
  useEffect(() => {
    // Create WebSocket
    const handleSocketMessage = (data: WebSocketMessageData) => {
      switch (data.action) {
        case SocketActions.MESSAGE:
          if (data.chatRoom.code === chatRoomCode) {
            if (data.clientId !== clientId) {
              setChatRoomNotifications({
                notifications: data.chatRoom.unreadMessages,
                roomCode: chatRoomCode,
              });
            }
          }
          handleUpdateLocalByCodeMsg(data.chatRoom);
          break;
        case SocketActions.CREATION_TASK:
          if (data.chatRoom.code === chatRoomCode) {
            if (data.clientId !== clientId) {
              setChatRoomNotifications({
                notifications: data.chatRoom.unreadMessages,
                roomCode: chatRoomCode,
              });
            }
          }
          handleUpdateLocalByCode(data.chatRoom);
          break;
      }
    };
    socketEventEmitter.on('message', handleSocketMessage);

    return () => {
      socketEventEmitter.off('message', handleSocketMessage);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  const handleSetChatRoomParam = (code: string) => {
    if (code) {
      params.set('room', code);
      router.push(`?${params.toString()}`);
    }
  };

  const handleRemoveChatRoomParam = useCallback(() => {
    params.delete('room');
    router.replace(`?${params.toString()}`);
  }, [params, router]);

  useEffect(() => {
    if (dataChatList && dataChatList[0]?.code && !chatRoomCode) {
      handleSetChatRoomParam(dataChatList[0]?.code);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataChatList, chatRoomCode]);

  const handleUpdateLocalByCode = (data: ChatRoomItem) => {
    setDataChatList((prevDataChatList) => {
      const pinnedItems = prevDataChatList.filter(
        (item) => item.pinAt !== null,
      );
      const unpinnedItems = prevDataChatList.filter(
        (item) => item.pinAt === null,
      );
      if (data.pinAt || pinnedItems.find((item) => item.code === data.code)) {
        const pinnedItemToUpdate = pinnedItems.find(
          (item) => item.code === data.code,
        );
        if (pinnedItemToUpdate) {
          const updatedPinnedItem = {
            ...pinnedItemToUpdate,
            lastMessageAt: data.lastMessageAt,
            unreadMessages: data.unreadMessages,
          };
          return [
            ...pinnedItems.map((item) =>
              item.code === data.code ? updatedPinnedItem : item,
            ),
            ...unpinnedItems,
          ];
        }
      } else {
        if (unpinnedItems.length === 0) {
          return [...pinnedItems, ...unpinnedItems];
        } else {
          const itemToUpdate = unpinnedItems.find(
            (item) => item.code === data.code,
          );
          if (itemToUpdate) {
            const updatedUnpinnedItems = unpinnedItems.filter(
              (item) => item.code !== data.code,
            );
            return [
              ...pinnedItems,
              {
                ...data,
                pinAt: data.pinAt ? data.pinAt : null,
                unreadMessages: data.unreadMessages,
                name:
                  data.type === ChatRoomType.PRIVATE
                    ? `${data.participants.find((participant) => participant.id !== session?.user.id)?.fullName}`
                    : data.name,
              },
              ...updatedUnpinnedItems,
            ];
          } else {
            return [
              ...pinnedItems,
              {
                ...data,
                pinAt: data.pinAt ? data.pinAt : null,
                unreadMessages: data.unreadMessages,
                name:
                  data.type === ChatRoomType.PRIVATE
                    ? `${data.participants.find((participant) => participant.id !== session?.user.id)?.fullName}`
                    : data.name,
              },
              ...unpinnedItems,
            ];
          }
        }
      }
      return [...pinnedItems, ...unpinnedItems];
    });

    setFilteredChatList((prevDataChatList) => {
      const pinnedItems = prevDataChatList.filter(
        (item) => item.pinAt !== null,
      );
      const unpinnedItems = prevDataChatList.filter(
        (item) => item.pinAt === null,
      );
      if (data.pinAt) {
        const pinnedItemToUpdate = pinnedItems.find(
          (item) => item.code === data.code,
        );
        if (pinnedItemToUpdate) {
          const updatedPinnedItem = {
            ...pinnedItemToUpdate,
            lastMessageAt: data.lastMessageAt,
            unreadMessages: data.unreadMessages,
          };
          return [
            ...pinnedItems.map((item) =>
              item.code === data.code ? updatedPinnedItem : item,
            ),
            ...unpinnedItems,
          ];
        }
      } else {
        if (unpinnedItems.length === 0) {
          return [...pinnedItems, ...unpinnedItems];
        } else {
          const itemToUpdate = unpinnedItems.find(
            (item) => item.code === data.code,
          );
          if (itemToUpdate) {
            const updatedUnpinnedItems = unpinnedItems.filter(
              (item) => item.code !== data.code,
            );
            return [
              ...pinnedItems,
              {
                ...data,
                pinAt: data.pinAt ? data.pinAt : null,
                unreadMessages: data.unreadMessages,
              },
              ...updatedUnpinnedItems,
            ];
          } else {
            return [
              ...pinnedItems,
              {
                ...data,
                pinAt: data.pinAt ? data.pinAt : null,
                unreadMessages: data.unreadMessages,
              },
              ...unpinnedItems,
            ];
          }
        }
      }
      return [...pinnedItems, ...unpinnedItems];
    });
  };

  const handleUpdateLocalByCodeMsg = (data: ChatRoomItem) => {
    setDataChatList((prevDataChatList) => {
      const pinnedItems = prevDataChatList.filter(
        (item) => item.pinAt !== null,
      );
      const unpinnedItems = prevDataChatList.filter(
        (item) => item.pinAt === null,
      );
      if (data.pinAt || pinnedItems.find((item) => item.code === data.code)) {
        const pinnedItemToUpdate = pinnedItems.find(
          (item) => item.code === data.code,
        );
        if (pinnedItemToUpdate) {
          const updatedPinnedItem = {
            ...pinnedItemToUpdate,
            lastMessageAt: data.lastMessageAt,
            unreadMessages: data.unreadMessages,
          };
          return [
            ...pinnedItems.map((item) =>
              item.code === data.code ? updatedPinnedItem : item,
            ),
            ...unpinnedItems,
          ];
        }
      } else {
        if (unpinnedItems.length === 0) {
          return [...pinnedItems, ...unpinnedItems];
        } else {
          const itemToUpdate = unpinnedItems.find(
            (item) => item.code === data.code,
          );
          if (itemToUpdate) {
            const updatedUnpinnedItems = unpinnedItems.filter(
              (item) => item.code !== data.code,
            );
            return [
              ...pinnedItems,
              {
                ...data,
                pinAt: data.pinAt ? data.pinAt : null,
                unreadMessages: data.unreadMessages,
                name:
                  data.type === ChatRoomType.PRIVATE
                    ? `${data.participants.find((participant) => participant.id !== session?.user.id)?.fullName}`
                    : data.name,
              },
              ...updatedUnpinnedItems,
            ];
          } else {
            const updatedUnpinnedItems = unpinnedItems.filter(
              (item) => item.code !== data.code,
            );
            return [
              ...pinnedItems,
              {
                ...data,
                pinAt: data.pinAt ? data.pinAt : null,
                unreadMessages: data.unreadMessages,
                name:
                  data.type === ChatRoomType.PRIVATE
                    ? `${data.participants.find((participant) => participant.id !== session?.user.id)?.fullName}`
                    : data.name,
              },
              ...updatedUnpinnedItems,
            ];
          }
        }
      }
      return [...pinnedItems, ...unpinnedItems];
    });
    setFilteredChatList((prevData) => {
      return prevData.map((item) =>
        item.code === data.code
          ? {
              ...item,
              lastMessageAt: data.lastMessageAt,
              unreadMessages: data.unreadMessages,
            }
          : item,
      );
    });
  };
  return (
    <>
      <Metadata
        metadata={`${pageRouters.CHAT_MANAGEMENT.name}${totalNotifications > 0 ? `(${totalNotifications})` : ''}`}
        taskDurationText={`${taskDurationDetail?.taskDuration && taskDurationDetail.isStart ? `${elapsedTime} - ${taskDurationDetail.title}` : ''}`}
      />
      <ListChatUsers
        hasMore={hasMore}
        dataChatList={dataChatList}
        filteredChatList={filteredChatList}
        chatRoomCode={chatRoomCode}
        dashboardMemberList={dashboardMemberList}
        dashboardMembers={dashboardMembers}
        setLastItemId={setLastItemId}
        setDataChatList={setDataChatList}
        setFilteredChatList={setFilteredChatList}
        setHasMore={setHasMore}
        setHasMoreDetailOnScrollDown={setHasMoreDetailOnScrollDown}
        setSearchChatMsg={setSearchChatMsg}
        handleSetChatRoomParam={handleSetChatRoomParam}
        handleRemoveChatRoomParam={handleRemoveChatRoomParam}
      />
      {chatRoomCode && chatRoomCode !== BOOKMARK_ROUTER_NAME && (
        <ChatDetail
          clientId={clientId}
          lastItemId={lastItemId}
          dataChatList={dataChatList}
          hasMoreDetail={hasMoreDetail}
          chatRoomCode={chatRoomCode}
          dashboardMemberList={dashboardMemberList}
          dashboardMembers={dashboardMembers}
          creationDataTaskData={creationDataTaskData}
          searchChatMsg={searchChatMsg}
          hasMoreDetailOnScrollDown={hasMoreDetailOnScrollDown}
          setHasMoreDetailOnScrollDown={setHasMoreDetailOnScrollDown}
          setSearchChatMsg={setSearchChatMsg}
          setFilteredChatList={setFilteredChatList}
          setLastItemId={setLastItemId}
          setHasMoreDetail={setHasMoreDetail}
          setDataChatList={setDataChatList}
          handleRemoveChatRoomParam={handleRemoveChatRoomParam}
        />
      )}
      {chatRoomCode && chatRoomCode === BOOKMARK_ROUTER_NAME && (
        <BookmarkList
          searchChatMsg={searchChatMsg}
          dashboardMembers={dashboardMembers}
          dashboardMemberList={dashboardMemberList}
          creationDataTaskData={creationDataTaskData}
          setSearchChatMsg={setSearchChatMsg}
        />
      )}
    </>
  );
};

export default BoardChat;
