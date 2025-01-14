'use client';

import { ChatRoomItem } from '@interfaces/chat';
import { BasePagination } from '@interfaces/common';
import {
  createContext,
  Dispatch,
  ReactNode,
  SetStateAction,
  useState,
} from 'react';

interface ContextValue {
  chatList: BasePagination<ChatRoomItem[]> | undefined;
  isReload: boolean;
  chatRoomNameEditing: {
    roomName: string;
    roomCode: string;
  }[];
  chatRoomParticipantsEditing: {
    participantsList: number[];
    roomCode: string;
  }[];
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
  setChatRoomNameEditing: Dispatch<
    SetStateAction<
      {
        roomName: string;
        roomCode: string;
      }[]
    >
  >;
  setChatRoomParticipantsEditing: Dispatch<
    SetStateAction<
      {
        participantsList: number[];
        roomCode: string;
      }[]
    >
  >;
  setChatRoomNotifications: Dispatch<
    SetStateAction<
      | {
          notifications: number;
          roomCode: string;
        }
      | undefined
    >
  >;
}

const defaultValue: ContextValue = {
  chatList: {
    count: 0,
    numPages: 0,
    results: [],
  },
  isReload: true,
  chatRoomNameEditing: [
    {
      roomName: '',
      roomCode: '',
    },
  ],
  chatRoomParticipantsEditing: [
    {
      participantsList: [],
      roomCode: '',
    },
  ],
  chatRoomNotifications: {
    notifications: 0,
    roomCode: '',
  },
  setChatList: () => {},
  setIsReload: () => {},
  setChatRoomNameEditing: () => {},
  setChatRoomParticipantsEditing: () => {},
  setChatRoomNotifications: () => {},
};

export const ChatContext = createContext<ContextValue>(defaultValue);

export const ChatProvider = ({ children }: { children: ReactNode }) => {
  const [chatList, setChatList] = useState<BasePagination<ChatRoomItem[]>>();
  const [isReload, setIsReload] = useState<boolean>(true);
  const [chatRoomNameEditing, setChatRoomNameEditing] = useState<
    {
      roomName: string;
      roomCode: string;
    }[]
  >([]);
  const [chatRoomParticipantsEditing, setChatRoomParticipantsEditing] =
    useState<
      {
        participantsList: number[];
        roomCode: string;
      }[]
    >([]);
  const [chatRoomNotifications, setChatRoomNotifications] = useState<{
    notifications: number;
    roomCode: string;
  }>();

  const contextValue: ContextValue = {
    chatList,
    isReload,
    chatRoomNameEditing,
    chatRoomParticipantsEditing,
    chatRoomNotifications,
    setChatList,
    setIsReload,
    setChatRoomNameEditing,
    setChatRoomParticipantsEditing,
    setChatRoomNotifications,
  };

  return (
    <ChatContext.Provider value={contextValue}>{children}</ChatContext.Provider>
  );
};
