'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { apiRouters } from '@constants/routers';
import { signOut, useSession } from 'next-auth/react';
import { WebSocketMessageData } from '@interfaces/chat';
import socketEventEmitter from '@components/socket/socketEventEmitter';
import { SocketActions } from '@constants/enums';
const WebSocketContext = createContext<WebSocket | null>(null);
export const useWebSocket = () => useContext(WebSocketContext);

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const { data: session } = useSession();

  useEffect(() => {
    if (!session?.accessToken) return;

    let retryTimeout: NodeJS.Timeout;
    const token = session.accessToken;
    const chatUrl =
      `${process.env.NEXT_PUBLIC_API_URL}${apiRouters.SOCKET_ACTION(token)}`.replace(
        'http',
        'ws',
      );

    const connectWebSocket = () => {
      const ws = new WebSocket(chatUrl);

      ws.onopen = () => {
        clearTimeout(retryTimeout);
      };

      ws.onmessage = (event) => {
        const data: WebSocketMessageData = JSON.parse(event.data);
        socketEventEmitter.emit('message', data);
        if (data.action === SocketActions.CHANGE_ROLE)
          if (data.isChangeRole == true) {
            signOut();
          }
      };

      ws.onclose = () => {
        retryTimeout = setTimeout(connectWebSocket, 5000);
      };

      ws.onerror = () => {
        ws.close();
      };

      setSocket(ws);
    };

    connectWebSocket();

    return () => {
      clearTimeout(retryTimeout);
      socket?.close();
    };
  }, [session?.accessToken]);

  return (
    <WebSocketContext.Provider value={socket}>
      {children}
    </WebSocketContext.Provider>
  );
};
