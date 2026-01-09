import { v4 } from 'uuid';
import { Storage } from '../storage';
import { AuctionCollection, AuctionStatus, RoundConfig, AntiSnipingConfig } from '../storage/types/auction';
import { GiftCollection } from '../storage/types/gift';
import { RoundService } from './round.service';
import { BidService } from './bid.service';

export type CreateAuctionInput = {
  title: string;
  description: string;
  imageUrl?: string;
  roundsConfig: RoundConfig[];
  minBidAmount: number;
  bidStep: number;
  antiSniping?: Partial<AntiSnipingConfig>;
  scheduledStartAt?: number;
  createdBy: string;
};

export type CreateAuctionResult = {
  success: boolean;
  auction?: AuctionCollection;
  error?: string;
};

export type AuctionWithDetails = AuctionCollection & {
  currentRoundData?: {
    id: string;
    roundNumber: number;
    status: string;
    timeRemaining: number | null;
    bidsCount: number;
    highestBid: number;
  };
  leaderboard?: Array<{
    rank: number;
    username: string;
    amount: number;
    isWinning: boolean;
  }>;
};

export class AuctionService {

  static async create(input: CreateAuctionInput): Promise<CreateAuctionResult> {
    if (!input.title || input.title.trim().length === 0) {
      return { success: false, error: 'Title is required' };
    }

    if (!input.roundsConfig || input.roundsConfig.length === 0) {
      return { success: false, error: 'At least one round is required' };
    }

    if (input.minBidAmount <= 0) {
      return { success: false, error: 'Minimum bid amount must be positive' };
    }

    const totalItems = input.roundsConfig.reduce((sum, r) => sum + r.itemsCount, 0);

    const now = Date.now();
    const auctionId = v4();

    const antiSniping: AntiSnipingConfig = {
      enabled: input.antiSniping?.enabled ?? true,
      thresholdSeconds: input.antiSniping?.thresholdSeconds ?? 30,
      extensionSeconds: input.antiSniping?.extensionSeconds ?? 30,
      maxExtensions: input.antiSniping?.maxExtensions ?? 5,
    };

    const auction: AuctionCollection = {
      id: auctionId,
      title: input.title.trim(),
      description: input.description || '',
      imageUrl: input.imageUrl,
      totalRounds: input.roundsConfig.length,
      totalItems,
      roundsConfig: input.roundsConfig,
      currentRound: 0,
      status: input.scheduledStartAt ? 'scheduled' : 'draft',
      minBidAmount: input.minBidAmount,
      bidStep: input.bidStep || 1,
      antiSniping,
      scheduledStartAt: input.scheduledStartAt,
      createdBy: input.createdBy,
      createdAt: now,
      updatedAt: now,
    };

    await Storage.instance.auction.create(auction);

    await RoundService.createRoundsForAuction(auctionId, input.roundsConfig);

    await this.createGiftsForAuction(auctionId, totalItems);

    return { success: true, auction };
  }

  private static async createGiftsForAuction(auctionId: string, count: number): Promise<void> {
    const now = Date.now();
    const gifts: GiftCollection[] = [];

    for (let i = 1; i <= count; i++) {
      gifts.push({
        id: v4(),
        auctionId,
        giftNumber: i,
        status: 'available',
        createdAt: now,
        updatedAt: now,
      });
    }

    await Storage.instance.gift.createMany(gifts);
  }

  static async start(auctionId: string): Promise<CreateAuctionResult> {
    const auction = await Storage.instance.auction.getById(auctionId);
    if (!auction) {
      return { success: false, error: 'Auction not found' };
    }

    if (auction.status !== 'draft' && auction.status !== 'scheduled') {
      return { success: false, error: 'Auction cannot be started from current status' };
    }

    const rounds = await RoundService.getAuctionRounds(auctionId);
    const firstRound = rounds.find(r => r.roundNumber === 1);

    if (!firstRound) {
      return { success: false, error: 'No rounds found for auction' };
    }

    const roundResult = await RoundService.startRound(firstRound.id);
    if (!roundResult.success) {
      return { success: false, error: roundResult.error };
    }

    await Storage.instance.auction.update(auctionId, {
      status: 'active',
      currentRound: 1,
      startedAt: Date.now(),
    });

    const updatedAuction = await Storage.instance.auction.getById(auctionId);
    return { success: true, auction: updatedAuction };
  }

  static async nextRound(auctionId: string): Promise<CreateAuctionResult> {
    const auction = await Storage.instance.auction.getById(auctionId);
    if (!auction) {
      return { success: false, error: 'Auction not found' };
    }

    if (auction.status !== 'active') {
      return { success: false, error: 'Auction is not active' };
    }

    const nextRoundNumber = auction.currentRound + 1;

    if (nextRoundNumber > auction.totalRounds) {
      return await this.complete(auctionId);
    }

    const nextRound = await Storage.instance.round.getByAuctionAndNumber(auctionId, nextRoundNumber);
    if (!nextRound) {
      return { success: false, error: 'Next round not found' };
    }

    const roundResult = await RoundService.startRound(nextRound.id);
    if (!roundResult.success) {
      return { success: false, error: roundResult.error };
    }

    await Storage.instance.auction.updateCurrentRound(auctionId, nextRoundNumber);

    const updatedAuction = await Storage.instance.auction.getById(auctionId);
    return { success: true, auction: updatedAuction };
  }

  static async complete(auctionId: string): Promise<CreateAuctionResult> {
    const auction = await Storage.instance.auction.getById(auctionId);
    if (!auction) {
      return { success: false, error: 'Auction not found' };
    }

    await Storage.instance.auction.update(auctionId, {
      status: 'completed',
      endedAt: Date.now(),
    });

    const updatedAuction = await Storage.instance.auction.getById(auctionId);
    return { success: true, auction: updatedAuction };
  }

  static async getById(auctionId: string): Promise<AuctionWithDetails | null> {
    const auction = await Storage.instance.auction.getById(auctionId);
    if (!auction) return null;

    const result: AuctionWithDetails = { ...auction };

    if (auction.status === 'active') {
      const activeRound = await RoundService.getActiveRound(auctionId);
      if (activeRound) {
        const timeRemaining = await RoundService.getTimeRemaining(activeRound.id);
        const ranking = await BidService.getRoundRanking(activeRound.id);

        result.currentRoundData = {
          id: activeRound.id,
          roundNumber: activeRound.roundNumber,
          status: activeRound.status,
          timeRemaining,
          bidsCount: activeRound.totalBidsCount,
          highestBid: activeRound.highestBidAmount,
        };

        result.leaderboard = ranking.map(entry => ({
          rank: entry.rank,
          username: entry.username,
          amount: entry.bid.amount,
          isWinning: entry.isWinning,
        }));
      }
    }

    return result;
  }

  static async getList(options?: {
    status?: AuctionStatus;
    createdBy?: string;
    limit?: number;
    skip?: number;
  }): Promise<AuctionCollection[]> {
    const filter: Record<string, unknown> = {};
    
    if (options?.status) {
      filter.status = options.status;
    }
    if (options?.createdBy) {
      filter.createdBy = options.createdBy;
    }

    return await Storage.instance.auction.getManyByFilter(filter, {
      limit: options?.limit,
      skip: options?.skip,
      sort: { createdAt: -1 },
    });
  }

  static async getActiveAuctions(): Promise<AuctionCollection[]> {
    return await Storage.instance.auction.getActiveAuctions();
  }

  static async processRoundEnd(roundId: string): Promise<void> {
    const round = await Storage.instance.round.getById(roundId);
    if (!round) return;

    const result = await RoundService.endRound(roundId);
    if (!result.success) {
      console.error('Failed to end round:', result.error);
      return;
    }

    const auction = await Storage.instance.auction.getById(round.auctionId);
    if (!auction) return;

    if (round.roundNumber < auction.totalRounds) {
      await this.nextRound(auction.id);
    } else {
      await this.complete(auction.id);
    }
  }

  static async getGifts(auctionId: string): Promise<GiftCollection[]> {
    return await Storage.instance.gift.getByAuction(auctionId);
  }

  static async getUserGifts(userId: string): Promise<GiftCollection[]> {
    return await Storage.instance.gift.getByWinner(userId);
  }
}
