'use client';
import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';

import ListChatUsers from './list';
import ChatDetail from './detail';

import { ChatRoomType } from '@constants/enums';
import { pageRouters } from '@constants/routers';
import { ChatDashboardMember, ChatRoomItem } from '@interfaces/chat';
import useDashboardMemberList from '@hooks/useDashBoardMemberList';
import useCreationDataTask from '@hooks/useCreationDataTask';
import { generateUniqueId, getRandomColor } from '@utils';
import { APP_NAME_METADATA } from '@constants';
import { GlobalStateContext } from '@providers/GlobalStateProvider';

const BoardChat = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const params = useMemo(
    () => new URLSearchParams(searchParams),
    [searchParams],
  );
  const { dashboardMemberList = [] } = useDashboardMemberList();
  const { creationDataTaskData } = useCreationDataTask({});
  const { totalNotifications } = useContext(GlobalStateContext);
  const chatRoomCode = searchParams.get('room');
  const [lastItemId, setLastItemId] = useState<number | null>();
  const [hasMoreDetail, setHasMoreDetail] = useState<boolean>(true);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [dataChatList, setDataChatList] = useState<ChatRoomItem[]>([]);
  const [filteredChatList, setFilteredChatList] = useState<ChatRoomItem[]>([]);
  const [searchChatMsg, setSearchChatMsg] = useState('');
  const { data: session } = useSession();
  const [dashboardMembers, setDashboardMembers] = useState<
    ChatDashboardMember[]
  >([]);

  const [clientId] = useState(() => generateUniqueId());

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
          avatarColor: getRandomColor(),
        };
      });
      setDashboardMembers(membersWithAvatars);
    }
  }, [dashboardMemberList]);

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
            if (itemToUpdate.type === ChatRoomType.TASK) {
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
                ...updatedUnpinnedItems.filter(
                  (item) => item.type !== ChatRoomType.TASK,
                ),
              ];
            } else if (itemToUpdate.type === ChatRoomType.SKILL) {
              return [
                ...pinnedItems,
                ...updatedUnpinnedItems.filter(
                  (item) => item.type === ChatRoomType.TASK,
                ),
                {
                  ...data,
                  pinAt: data.pinAt ? data.pinAt : null,
                  unreadMessages: data.unreadMessages,
                  name:
                    data.type === ChatRoomType.PRIVATE
                      ? `${data.participants.find((participant) => participant.id !== session?.user.id)?.fullName}`
                      : data.name,
                },
                ...updatedUnpinnedItems.filter(
                  (item) => item.type !== ChatRoomType.TASK,
                ),
              ];
            } else {
              return [
                ...pinnedItems,
                ...updatedUnpinnedItems.filter(
                  (item) => item.type === ChatRoomType.TASK,
                ),
                ...updatedUnpinnedItems.filter(
                  (item) => item.type === ChatRoomType.SKILL,
                ),
                {
                  ...data,
                  pinAt: data.pinAt ? data.pinAt : null,
                  unreadMessages: data.unreadMessages,
                  name:
                    data.type === ChatRoomType.PRIVATE
                      ? `${data.participants.find((participant) => participant.id !== session?.user.id)?.fullName}`
                      : data.name,
                },
                ...updatedUnpinnedItems.filter(
                  (item) =>
                    item.type !== ChatRoomType.TASK &&
                    item.type !== ChatRoomType.SKILL,
                ),
              ];
            }
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
            if (itemToUpdate.type == ChatRoomType.SKILL) {
              return [
                ...pinnedItems,
                ...updatedUnpinnedItems.filter(
                  (item) => item.type === ChatRoomType.TASK,
                ),
                {
                  ...data,
                  pinAt: data.pinAt ? data.pinAt : null,
                  unreadMessages: data.unreadMessages,
                  name: data.name,
                },
                ...updatedUnpinnedItems.filter(
                  (item) =>
                    item.type !== ChatRoomType.TASK &&
                    item.type !== ChatRoomType.SKILL,
                ),
              ];
            } else if (itemToUpdate.type == ChatRoomType.TASK) {
              return [
                ...pinnedItems,
                {
                  ...data,
                  pinAt: data.pinAt ? data.pinAt : null,
                  unreadMessages: data.unreadMessages,
                  name: data.name,
                },
                ...updatedUnpinnedItems.filter(
                  (item) => item.type === ChatRoomType.SKILL,
                ),
                ...updatedUnpinnedItems.filter(
                  (item) =>
                    item.type !== ChatRoomType.TASK &&
                    item.type !== ChatRoomType.SKILL,
                ),
              ];
            } else {
              return [
                ...pinnedItems,
                ...updatedUnpinnedItems.filter(
                  (item) => item.type === ChatRoomType.TASK,
                ),
                ...updatedUnpinnedItems.filter(
                  (item) => item.type === ChatRoomType.SKILL,
                ),
                {
                  ...data,
                  pinAt: data.pinAt ? data.pinAt : null,
                  unreadMessages: data.unreadMessages,
                  name:
                    data.type === ChatRoomType.PRIVATE
                      ? `${data.participants.find((participant) => participant.id !== session?.user.id)?.fullName}`
                      : data.name,
                },
                ...updatedUnpinnedItems.filter(
                  (item) =>
                    item.type !== ChatRoomType.TASK &&
                    item.type !== ChatRoomType.SKILL,
                ),
              ];
            }
          } else {
            const updatedUnpinnedItems = unpinnedItems.filter(
              (item) => item.code !== data.code,
            );
            return [
              ...pinnedItems,
              ...updatedUnpinnedItems.filter(
                (item) => item.type === ChatRoomType.TASK,
              ),
              ...updatedUnpinnedItems.filter(
                (item) => item.type === ChatRoomType.SKILL,
              ),
              {
                ...data,
                pinAt: data.pinAt ? data.pinAt : null,
                unreadMessages: data.unreadMessages,
                name:
                  data.type === ChatRoomType.PRIVATE
                    ? `${data.participants.find((participant) => participant.id !== session?.user.id)?.fullName}`
                    : data.name,
              },
              ...updatedUnpinnedItems.filter(
                (item) =>
                  item.type !== ChatRoomType.TASK &&
                  item.type !== ChatRoomType.SKILL,
              ),
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
      <title>{`${APP_NAME_METADATA} | ${pageRouters.CHAT_MANAGEMENT.name}${totalNotifications > 0 ? `(${totalNotifications})` : ''}`}</title>
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
        setSearchChatMsg={setSearchChatMsg}
        handleSetChatRoomParam={handleSetChatRoomParam}
        handleRemoveChatRoomParam={handleRemoveChatRoomParam}
      />
      {chatRoomCode && (
        <ChatDetail
          clientId={clientId}
          lastItemId={lastItemId}
          dataChatList={dataChatList}
          hasMoreDetail={hasMoreDetail}
          hasMore={hasMore}
          chatRoomCode={chatRoomCode}
          dashboardMemberList={dashboardMemberList}
          dashboardMembers={dashboardMembers}
          creationDataTaskData={creationDataTaskData}
          searchChatMsg={searchChatMsg}
          setSearchChatMsg={setSearchChatMsg}
          setFilteredChatList={setFilteredChatList}
          setLastItemId={setLastItemId}
          setHasMoreDetail={setHasMoreDetail}
          handleUpdateLocalByCode={handleUpdateLocalByCode}
          handleUpdateLocalByCodeMsg={handleUpdateLocalByCodeMsg}
          setDataChatList={setDataChatList}
          handleRemoveChatRoomParam={handleRemoveChatRoomParam}
        />
      )}
    </>
  );
};

export default BoardChat;
