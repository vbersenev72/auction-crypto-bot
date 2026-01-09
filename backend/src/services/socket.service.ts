import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../..';
import { Storage } from '../storage';
import { RoundService } from './round.service';
import { BidService } from './bid.service';

export type BidEvent = {
  rank: number;
  username: string;
  amount: number;
  isWinning: boolean;
  timestamp: number;
};

export type TimerEvent = {
  roundId: string;
  roundNumber: number;
  timeRemaining: number;
  itemsCount: number;
};

export type RoundEndEvent = {
  roundNumber: number;
  winners: Array<{ username: string; amount: number; giftNumber: number }>;
  nextRound: number | null;
};

export type AuctionEndEvent = {
  finalLeaderboard: Array<{ rank: number; username: string; amount: number; won: boolean }>;
};

export class SocketService {
  private static io: Server | null = null;
  private static timerInterval: NodeJS.Timeout | null = null;

  static initialize(httpServer: HttpServer): void {
    this.io = new Server(httpServer, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST'],
      },
    });

    this.io.use(this.authMiddleware);
    this.io.on('connection', this.handleConnection.bind(this));
    this.startTimerBroadcast();

    console.log('Socket.IO initialized');
  }

  private static authMiddleware(socket: Socket, next: (err?: Error) => void): void {
    const token = socket.handshake.auth.token || socket.handshake.query.token;
    
    if (!token) {
      return next(new Error('Authentication required'));
    }

    try {
      const decoded = jwt.verify(token as string, env.SECRET) as { id: string };
      socket.data.userId = decoded.id;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  }

  private static handleConnection(socket: Socket): void {
    console.log(`Client connected: ${socket.id}, userId: ${socket.data.userId}`);

    socket.on('join:auction', async (auctionId: string) => {
      const auction = await Storage.instance.auction.getById(auctionId);
      if (!auction) {
        socket.emit('error', { message: 'Auction not found' });
        return;
      }

      socket.join(`auction:${auctionId}`);
      console.log(`Socket ${socket.id} joined auction:${auctionId}`);

      await this.sendAuctionState(socket, auctionId);
    });

    socket.on('leave:auction', (auctionId: string) => {
      socket.leave(`auction:${auctionId}`);
      console.log(`Socket ${socket.id} left auction:${auctionId}`);
    });

    socket.on('disconnect', () => {
      console.log(`Client disconnected: ${socket.id}`);
    });
  }

  private static async sendAuctionState(socket: Socket, auctionId: string): Promise<void> {
    const auction = await Storage.instance.auction.getById(auctionId);
    if (!auction) return;

    const activeRound = await RoundService.getActiveRound(auctionId);
    if (!activeRound) {
      socket.emit('auction:status', { status: auction.status });
      return;
    }

    const timeRemaining = await RoundService.getTimeRemaining(activeRound.id);
    const ranking = await BidService.getRoundRanking(activeRound.id);

    socket.emit('auction:state', {
      status: auction.status,
      currentRound: auction.currentRound,
      totalRounds: auction.totalRounds,
      round: {
        id: activeRound.id,
        roundNumber: activeRound.roundNumber,
        itemsCount: activeRound.itemsCount,
        timeRemaining,
      },
      leaderboard: ranking.map(entry => ({
        rank: entry.rank,
        username: entry.username,
        amount: entry.bid.amount,
        isWinning: entry.isWinning,
        isCurrentUser: entry.bid.userId === socket.data.userId,
      })),
    });
  }

  private static startTimerBroadcast(): void {
    if (this.timerInterval) return;

    this.timerInterval = setInterval(async () => {
      await this.broadcastTimers();
    }, 1000);
  }

  private static async broadcastTimers(): Promise<void> {
    if (!this.io) return;

    try {
      const activeAuctions = await Storage.instance.auction.getActiveAuctions();

      for (const auction of activeAuctions) {
        const activeRound = await RoundService.getActiveRound(auction.id);
        if (!activeRound) continue;

        const timeRemaining = await RoundService.getTimeRemaining(activeRound.id);
        
        const event: TimerEvent = {
          roundId: activeRound.id,
          roundNumber: activeRound.roundNumber,
          timeRemaining: timeRemaining ?? 0,
          itemsCount: activeRound.itemsCount,
        };

        this.io.to(`auction:${auction.id}`).emit('timer:update', event);
      }
    } catch (error) {
      console.error('Timer broadcast error:', error);
    }
  }

  static async emitBidPlaced(auctionId: string, roundId: string): Promise<void> {
    if (!this.io) return;

    const ranking = await BidService.getRoundRanking(roundId);
    const round = await Storage.instance.round.getById(roundId);

    const leaderboard = ranking.map(entry => ({
      rank: entry.rank,
      username: entry.username,
      amount: entry.bid.amount,
      isWinning: entry.isWinning,
      timestamp: entry.bid.lastUpdatedAt,
    }));

    this.io.to(`auction:${auctionId}`).emit('bid:update', {
      roundNumber: round?.roundNumber,
      leaderboard,
    });
  }

  static async emitRoundEnd(
    auctionId: string,
    roundNumber: number,
    winners: Array<{ username: string; amount: number; giftNumber: number }>,
    nextRound: number | null
  ): Promise<void> {
    if (!this.io) return;

    const event: RoundEndEvent = { roundNumber, winners, nextRound };
    this.io.to(`auction:${auctionId}`).emit('round:end', event);
  }

  static async emitAuctionEnd(auctionId: string): Promise<void> {
    if (!this.io) return;

    const gifts = await Storage.instance.gift.getByAuction(auctionId);
    
    const finalLeaderboard = await Promise.all(
      gifts
        .filter(g => g.winnerId)
        .map(async g => {
          const user = await Storage.instance.user.getById(g.winnerId!);
          return {
            rank: g.giftNumber,
            username: user?.username || 'Unknown',
            amount: g.winningAmount || 0,
            won: true,
          };
        })
    );

    const event: AuctionEndEvent = { finalLeaderboard };
    this.io.to(`auction:${auctionId}`).emit('auction:end', event);
  }

  static stop(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    if (this.io) {
      this.io.close();
      this.io = null;
    }
    console.log('Socket.IO stopped');
  }
}
