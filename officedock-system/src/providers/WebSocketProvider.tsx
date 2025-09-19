'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { apiRouters } from '@constants/routers';
import { signOut } from 'next-auth/react';

import { WebSocketMessageData } from '@interfaces/chat';
import socketEventEmitter from '@components/socket/socketEventEmitter';
import { SocketActions } from '@constants/enums';

import { useSessionCache } from './SessionCacheProvider';
import ReloadModal from '@components/modals/ReloadModal';

const WebSocketContext = createContext<WebSocket | null>(null);
export const useWebSocket = () => useContext(WebSocketContext);

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const { data: session } = useSessionCache();
  const [showReloadModal, setShowReloadModal] = useState(false);

  useEffect(() => {
    if (!session?.accessToken) return;

    let retryTimeout: NodeJS.Timeout;
    let retryAttempts = 0;
    const MAX_RETRY = 10;

    const token = session.accessToken;
    const chatUrl =
      `${process.env.NEXT_PUBLIC_API_URL}${apiRouters.SOCKET_ACTION(
        token,
      )}`.replace('http', 'ws');

    const connectWebSocket = () => {
      const ws = new WebSocket(chatUrl);

      ws.onopen = () => {
        clearTimeout(retryTimeout);
        retryAttempts = 0;
      };

      ws.onmessage = (event) => {
        const data: WebSocketMessageData = JSON.parse(event.data);
        socketEventEmitter.emit('message', data);

        if (data.action === SocketActions.CHANGE_ROLE && data.isChangeRole) {
          signOut();
        }
      };

      ws.onclose = (event) => {
        // If 403 (token expired / invalid) then signOut immediately, no retry
        if (event.code === 4003 || event.code === 1008) {
          setShowReloadModal(true);
          return;
        }

        if (retryAttempts >= MAX_RETRY) {
          setShowReloadModal(true);
          return;
        }

        // Exponential backoff + jitter
        const baseDelay = Math.min(30000, 1000 * 2 ** retryAttempts); // max 30s
        const jitter = Math.random() * 1000; // 0–1s
        const delay = baseDelay + jitter;

        retryAttempts++;

        retryTimeout = setTimeout(connectWebSocket, delay);
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
    <>
      <WebSocketContext.Provider value={socket}>
        {children}
      </WebSocketContext.Provider>
      {showReloadModal && session && <ReloadModal open={showReloadModal} />}
    </>
  );
};
