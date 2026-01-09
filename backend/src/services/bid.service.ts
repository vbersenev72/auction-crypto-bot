import { v4 } from 'uuid';
import { Storage } from '../storage';
import { BidCollection, BidStatus, BidHistoryEntry } from '../storage/types/bid';
import { BalanceService } from './balance.service';
import { SocketService } from './socket.service';

export type PlaceBidResult = {
  success: boolean;
  bid?: BidCollection;
  error?: string;
};

export type BidRankingEntry = {
  rank: number;
  bid: BidCollection;
  username: string;
  isWinning: boolean;
};

export class BidService {

  static async placeBid(
    userId: string,
    auctionId: string,
    roundId: string,
    amount: number
  ): Promise<PlaceBidResult> {
    const auction = await Storage.instance.auction.getById(auctionId);
    if (!auction) {
      return { success: false, error: 'Auction not found' };
    }

    if (auction.status !== 'active') {
      return { success: false, error: 'Auction is not active' };
    }

    const round = await Storage.instance.round.getById(roundId);
    if (!round) {
      return { success: false, error: 'Round not found' };
    }

    if (round.status !== 'active') {
      return { success: false, error: 'Round is not active' };
    }

    if (amount < auction.minBidAmount) {
      return { success: false, error: `Minimum bid is ${auction.minBidAmount} Stars` };
    }

    const existingBid = await Storage.instance.bid.getByUserAndRound(userId, roundId);

    if (existingBid) {
      return await this.raiseBid(existingBid, amount, auction.bidStep);
    } else {
      return await this.createBid(userId, auctionId, roundId, amount);
    }
  }

  private static async createBid(
    userId: string,
    auctionId: string,
    roundId: string,
    amount: number
  ): Promise<PlaceBidResult> {
    const reserveResult = await BalanceService.reserve(
      userId,
      amount,
      [
        { type: 'auction', id: auctionId },
        { type: 'round', id: roundId },
      ],
      `Bid placed on auction`,
      `bid-${userId}-${roundId}` 
    );

    if (!reserveResult.success) {
      return { success: false, error: reserveResult.error };
    }

    const now = Date.now();
    const bidId = v4();

    const bid: BidCollection = {
      id: bidId,
      auctionId,
      roundId,
      userId,
      amount,
      initialAmount: amount,
      status: 'active',
      history: [{
        amount,
        timestamp: now,
        reason: 'initial',
      }],
      originalRoundId: roundId,
      carryCount: 0,
      placedAt: now,
      lastUpdatedAt: now,
      createdAt: now,
      updatedAt: now,
    };

    await Storage.instance.bid.create(bid);

    await Storage.instance.round.incrementBidsCount(roundId);

    await Storage.instance.user.incrementStats(userId, {
      totalBidsPlaced: 1,
    });

    await this.checkAntiSniping(roundId, userId);

    SocketService.emitBidPlaced(auctionId, roundId);

    return { success: true, bid };
  }

  private static async raiseBid(
    existingBid: BidCollection,
    newAmount: number,
    bidStep: number
  ): Promise<PlaceBidResult> {
    if (newAmount <= existingBid.amount) {
      return { success: false, error: 'New amount must be greater than current bid' };
    }

    const difference = newAmount - existingBid.amount;
    if (difference < bidStep) {
      return { success: false, error: `Minimum raise is ${bidStep} Stars` };
    }

    const reserveResult = await BalanceService.reserveAdditional(
      existingBid.userId,
      difference,
      [
        { type: 'auction', id: existingBid.auctionId },
        { type: 'round', id: existingBid.roundId },
        { type: 'bid', id: existingBid.id },
      ],
      `Bid raised on auction`,
      `bid-raise-${existingBid.id}-${newAmount}`
    );

    if (!reserveResult.success) {
      return { success: false, error: reserveResult.error };
    }

    const historyEntry: BidHistoryEntry = {
      amount: newAmount,
      timestamp: Date.now(),
      reason: 'raise',
    };

    await Storage.instance.bid.raiseBid(existingBid.id, newAmount, historyEntry);
    const updatedBid = await Storage.instance.bid.getById(existingBid.id);

    await this.checkAntiSniping(existingBid.roundId, existingBid.userId);

    SocketService.emitBidPlaced(existingBid.auctionId, existingBid.roundId);

    return { success: true, bid: updatedBid };
  }

  private static async checkAntiSniping(roundId: string, userId: string): Promise<boolean> {
    const round = await Storage.instance.round.getById(roundId);
    if (!round || !round.scheduledEndAt) return false;

    const auction = await Storage.instance.auction.getById(round.auctionId);
    if (!auction || !auction.antiSniping.enabled) return false;

    const now = Date.now();
    const timeLeft = round.scheduledEndAt - now;
    const thresholdMs = auction.antiSniping.thresholdSeconds * 1000;

    if (timeLeft > 0 && timeLeft <= thresholdMs && round.extensionsCount < auction.antiSniping.maxExtensions) {
      await Storage.instance.round.extendRound(roundId, auction.antiSniping.extensionSeconds);
      return true;
    }

    return false;
  }

  static async getRoundRanking(roundId: string): Promise<BidRankingEntry[]> {
    const round = await Storage.instance.round.getById(roundId);
    if (!round) return [];

    const bids = await Storage.instance.bid.getByRoundRanked(roundId);
    
    const result: BidRankingEntry[] = [];
    
    for (let i = 0; i < bids.length; i++) {
      const bid = bids[i];
      const user = await Storage.instance.user.getById(bid.userId);
      
      result.push({
        rank: i + 1,
        bid,
        username: user?.username || 'Unknown',
        isWinning: i < round.itemsCount,
      });
    }

    return result;
  }

  static async getUserBids(userId: string): Promise<BidCollection[]> {
    return await Storage.instance.bid.getByUser(userId);
  }

  static async getUserActiveBids(userId: string): Promise<BidCollection[]> {
    return await Storage.instance.bid.getActiveByUser(userId);
  }

  static async getUserBidInRound(userId: string, roundId: string): Promise<BidCollection | undefined> {
    return await Storage.instance.bid.getByUserAndRound(userId, roundId);
  }

  static async updateBidStatuses(roundId: string): Promise<void> {
    const round = await Storage.instance.round.getById(roundId);
    if (!round) return;

    const bids = await Storage.instance.bid.getByRoundRanked(roundId);
    
    for (let i = 0; i < bids.length; i++) {
      const bid = bids[i];
      const newStatus: BidStatus = i < round.itemsCount ? 'winning' : 'losing';
      
      if (bid.status !== newStatus && bid.status === 'active' || bid.status === 'winning' || bid.status === 'losing') {
        await Storage.instance.bid.setStatus(bid.id, newStatus);
      }
    }

    await Storage.instance.bid.updateRanks(roundId);
  }

  static async getTopBids(roundId: string, count: number): Promise<BidCollection[]> {
    return await Storage.instance.bid.getTopBids(roundId, count);
  }

  static async getLosingBids(roundId: string): Promise<BidCollection[]> {
    const round = await Storage.instance.round.getById(roundId);
    if (!round) return [];

    const allBids = await Storage.instance.bid.getByRoundRanked(roundId);
    return allBids.slice(round.itemsCount);
  }
}

