'use client';

import { ChatRoomItem } from '@interfaces/chat';
import { BasePagination } from '@interfaces/common';
import { Profile } from '@interfaces/user';
import {
  createContext,
  Dispatch,
  ReactNode,
  SetStateAction,
  useState,
} from 'react';

interface ContextValue {
  listAllMember: Profile[];
  chatList: BasePagination<ChatRoomItem[]> | undefined;
  isReload: boolean;
  chatRoomNotifications:
    | {
        notifications: number;
        roomCode: string;
      }
    | undefined;
  setChatList: Dispatch<
    SetStateAction<BasePagination<ChatRoomItem[]> | undefined>
  >;
  setIsReload: Dispatch<SetStateAction<boolean>>;
  setChatRoomNotifications: Dispatch<
    SetStateAction<
      | {
          notifications: number;
          roomCode: string;
        }
      | undefined
    >
  >;
  setListAllMember: Dispatch<SetStateAction<Profile[]>>;
}

const defaultValue: ContextValue = {
  listAllMember: [],
  chatList: {
    count: 0,
    numPages: 0,
    results: [],
  },
  isReload: true,
  chatRoomNotifications: {
    notifications: 0,
    roomCode: '',
  },
  setChatList: () => {},
  setIsReload: () => {},
  setChatRoomNotifications: () => {},
  setListAllMember: () => {},
};

export const ChatContext = createContext<ContextValue>(defaultValue);

export const ChatProvider = ({ children }: { children: ReactNode }) => {
  const [chatList, setChatList] = useState<BasePagination<ChatRoomItem[]>>();
  const [isReload, setIsReload] = useState<boolean>(true);
  const [listAllMember, setListAllMember] = useState<Profile[]>([]);
  const [chatRoomNotifications, setChatRoomNotifications] = useState<{
    notifications: number;
    roomCode: string;
  }>();

  const contextValue: ContextValue = {
    chatList,
    isReload,
    chatRoomNotifications,
    listAllMember,
    setListAllMember,
    setChatList,
    setIsReload,
    setChatRoomNotifications,
  };

  return (
    <ChatContext.Provider value={contextValue}>{children}</ChatContext.Provider>
  );
};
