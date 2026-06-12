'use client';

import { useRef, useCallback, useEffect } from 'react';
import { Client, type IMessage, type StompSubscription } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { WS_URL } from '@/lib/constants';

type MessageCallback = (data: unknown) => void;

interface PendingSub {
  topic: string;
  callback: MessageCallback;
}

export function useWebSocket() {
  const clientRef = useRef<Client | null>(null);
  const pendingRef = useRef<PendingSub[]>([]);
  const activeRef = useRef<Map<string, StompSubscription>>(new Map());

  const attachSub = (client: Client, topic: string, callback: MessageCallback) => {
    const sub = client.subscribe(topic, (msg: IMessage) => {
      try {
        callback(JSON.parse(msg.body));
      } catch {
        callback(msg.body);
      }
    });
    activeRef.current.set(topic, sub);
  };

  const connect = useCallback((_tenantId: number, _sessionId: number | null = null) => {
    if (clientRef.current?.active) return;

    const client = new Client({
      webSocketFactory: () => new SockJS(`${WS_URL}/ws`),
      reconnectDelay: 5000,
      onConnect: () => {
        activeRef.current.clear();
        pendingRef.current.forEach(({ topic, callback }) => attachSub(client, topic, callback));
      },
      onDisconnect: () => {
        activeRef.current.clear();
      },
    });

    client.activate();
    clientRef.current = client;
  }, []);

  const subscribe = useCallback((topic: string, callback: MessageCallback): (() => void) => {
    pendingRef.current = [...pendingRef.current, { topic, callback }];

    if (clientRef.current?.connected) {
      attachSub(clientRef.current, topic, callback);
    }

    return () => {
      pendingRef.current = pendingRef.current.filter((s) => s.topic !== topic);
      const sub = activeRef.current.get(topic);
      if (sub) {
        sub.unsubscribe();
        activeRef.current.delete(topic);
      }
    };
  }, []);

  const disconnect = useCallback(() => {
    pendingRef.current = [];
    activeRef.current.clear();
    clientRef.current?.deactivate();
    clientRef.current = null;
  }, []);

  useEffect(() => {
    return () => {
      clientRef.current?.deactivate();
    };
  }, []);

  return { connect, subscribe, disconnect };
}
