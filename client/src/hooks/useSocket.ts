import { useEffect, useState, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { api, LeaderboardEntry } from '../api';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || '';

export interface TimerUpdate {
  roundId: string;
  roundNumber: number;
  timeRemaining: number;
  itemsCount: number;
}

export interface BidUpdate {
  roundNumber: number;
  leaderboard: LeaderboardEntry[];
}

export interface RoundEnd {
  roundNumber: number;
  winners: Array<{ username: string; amount: number; giftNumber: number }>;
  nextRound: number | null;
}

export interface AuctionEnd {
  finalLeaderboard: Array<{ rank: number; username: string; amount: number; won: boolean }>;
}

export function useSocket(auctionId: string | null, autoConnect: boolean = false) {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [timer, setTimer] = useState<TimerUpdate | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [roundEnd, setRoundEnd] = useState<RoundEnd | null>(null);
  const [auctionEnd, setAuctionEnd] = useState<AuctionEnd | null>(null);

  const connect = useCallback(() => {
    const token = api.getToken();
    if (!token || !auctionId || socketRef.current?.connected) {
      return;
    }

    if (socketRef.current) {
      socketRef.current.disconnect();
    }

    const socketOptions = {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    };

    const socket = SOCKET_URL ? io(SOCKET_URL, socketOptions) : io(socketOptions);

    socket.on('connect', () => {
      setConnected(true);
      socket.emit('join:auction', auctionId);
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

    socket.on('auction:state', (data) => {
      if (data.round) {
        setTimer({
          roundId: data.round.id,
          roundNumber: data.round.roundNumber,
          timeRemaining: data.round.timeRemaining || 0,
          itemsCount: data.round.itemsCount,
        });
      }
      if (data.leaderboard) {
        setLeaderboard(data.leaderboard);
      }
    });

    socket.on('timer:update', (data: TimerUpdate) => {
      setTimer(data);
    });

    socket.on('bid:update', (data: BidUpdate) => {
      setLeaderboard(data.leaderboard);
    });

    socket.on('round:end', (data: RoundEnd) => {
      setRoundEnd(data);
      setLeaderboard([]);
    });

    socket.on('auction:end', (data: AuctionEnd) => {
      setAuctionEnd(data);
    });

    socketRef.current = socket;
  }, [auctionId]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      if (auctionId) {
        socketRef.current.emit('leave:auction', auctionId);
      }
      socketRef.current.disconnect();
      socketRef.current = null;
      setConnected(false);
    }
  }, [auctionId]);

  useEffect(() => {
    if (autoConnect && auctionId) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [auctionId, autoConnect]);

  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []);

  return {
    connect,
    disconnect,
    connected,
    timer,
    leaderboard,
    roundEnd,
    auctionEnd,
    clearRoundEnd: () => setRoundEnd(null),
    clearAuctionEnd: () => setAuctionEnd(null),
  };
}
