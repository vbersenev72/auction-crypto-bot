import { v4 } from 'uuid';
import { Storage } from '../storage';
import { RoundCollection, RoundStatus } from '../storage/types/round';
import { BidCollection } from '../storage/types/bid';
import { GiftCollection } from '../storage/types/gift';
import { BalanceService } from './balance.service';
import { BidService } from './bid.service';
import { SocketService } from './socket.service';

export type RoundResult = {
  success: boolean;
  round?: RoundCollection;
  error?: string;
};

export type ProcessRoundResult = {
  success: boolean;
  winners: Array<{
    bid: BidCollection;
    gift: GiftCollection;
  }>;
  carriedBids: BidCollection[];
  refundedBids: BidCollection[];
  error?: string;
};

export class RoundService {

  static async createRoundsForAuction(
    auctionId: string,
    roundsConfig: Array<{ roundNumber: number; itemsCount: number; durationSeconds: number }>
  ): Promise<RoundCollection[]> {
    const now = Date.now();
    const rounds: RoundCollection[] = roundsConfig.map(config => ({
      id: v4(),
      auctionId,
      roundNumber: config.roundNumber,
      itemsCount: config.itemsCount,
      status: 'pending' as RoundStatus,
      durationSeconds: config.durationSeconds,
      extensionsCount: 0,
      totalBidsCount: 0,
      uniqueBiddersCount: 0,
      highestBidAmount: 0,
      createdAt: now,
      updatedAt: now,
    }));

    await Storage.instance.round.createMany(rounds);
    return rounds;
  }

  static async startRound(roundId: string): Promise<RoundResult> {
    const round = await Storage.instance.round.getById(roundId);
    if (!round) {
      return { success: false, error: 'Round not found' };
    }

    if (round.status !== 'pending') {
      return { success: false, error: 'Round is not in pending status' };
    }

    const now = Date.now();
    const scheduledEndAt = now + round.durationSeconds * 1000;

    await Storage.instance.round.update(roundId, {
      status: 'active',
      startedAt: now,
      scheduledEndAt,
    });

    const updatedRound = await Storage.instance.round.getById(roundId);
    return { success: true, round: updatedRound };
  }

  static async endRound(roundId: string): Promise<ProcessRoundResult> {
    const round = await Storage.instance.round.getById(roundId);
    if (!round) {
      return { success: false, winners: [], carriedBids: [], refundedBids: [], error: 'Round not found' };
    }

    if (round.status !== 'active') {
      return { success: false, winners: [], carriedBids: [], refundedBids: [], error: 'Round is not active' };
    }

    await Storage.instance.round.setStatus(roundId, 'processing');

    const auction = await Storage.instance.auction.getById(round.auctionId);
    if (!auction) {
      return { success: false, winners: [], carriedBids: [], refundedBids: [], error: 'Auction not found' };
    }

    const allBids = await Storage.instance.bid.getByRoundRanked(roundId);
    
    const winningBids = allBids.slice(0, round.itemsCount);
    const losingBids = allBids.slice(round.itemsCount);

    const winners: Array<{ bid: BidCollection; gift: GiftCollection }> = [];
    const availableGifts = await Storage.instance.gift.getAvailableByAuction(auction.id);

    for (let i = 0; i < winningBids.length; i++) {
      const bid = winningBids[i];
      const gift = availableGifts[i];

      if (!gift) continue;

      await Storage.instance.gift.awardToWinner(
        gift.id,
        bid.userId,
        bid.id,
        bid.amount,
        roundId
      );

      await BalanceService.confirmReserved(
        bid.userId,
        bid.amount,
        [
          { type: 'auction', id: auction.id },
          { type: 'round', id: roundId },
          { type: 'bid', id: bid.id },
          { type: 'gift', id: gift.id },
        ],
        `Won gift #${gift.giftNumber} in auction`
      );

      await Storage.instance.bid.setStatus(bid.id, 'won');

      const updatedGift = await Storage.instance.gift.getById(gift.id);
      if (updatedGift) {
        winners.push({ bid, gift: updatedGift });
      }
    }

    const nextRound = await Storage.instance.round.getByAuctionAndNumber(
      auction.id,
      round.roundNumber + 1
    );

    const carriedBids: BidCollection[] = [];
    const refundedBids: BidCollection[] = [];

    if (nextRound) {
      for (const bid of losingBids) {
        await Storage.instance.bid.update(bid.id, {
          roundId: nextRound.id,
          carriedFromRoundId: roundId,
          carriedToRoundId: nextRound.id,
          status: 'active',
          carryCount: bid.carryCount + 1,
          history: [...bid.history, {
            amount: bid.amount,
            timestamp: Date.now(),
            reason: 'carried' as const,
            fromRoundId: roundId,
          }],
        });

        const updatedBid = await Storage.instance.bid.getById(bid.id);
        if (updatedBid) carriedBids.push(updatedBid);
      }
    } else {
      for (const bid of losingBids) {
        await BalanceService.refundReserved(
          bid.userId,
          bid.amount,
          [
            { type: 'auction', id: auction.id },
            { type: 'round', id: roundId },
            { type: 'bid', id: bid.id },
          ],
          `Refund for auction ended`
        );

        await Storage.instance.bid.setStatus(bid.id, 'refunded');
        
        const updatedBid = await Storage.instance.bid.getById(bid.id);
        if (updatedBid) refundedBids.push(updatedBid);
      }
    }

    const highestBid = winningBids[0]?.amount || 0;
    const lowestWinningBid = winningBids[winningBids.length - 1]?.amount;

    await Storage.instance.round.update(roundId, {
      status: 'completed',
      actualEndAt: Date.now(),
      highestBidAmount: highestBid,
      lowestWinningBidAmount: lowestWinningBid,
      uniqueBiddersCount: new Set(allBids.map(b => b.userId)).size,
    });

    const winnersForSocket = await Promise.all(
      winners.map(async w => {
        const user = await Storage.instance.user.getById(w.bid.userId);
        return {
          username: user?.username || 'Unknown',
          amount: w.bid.amount,
          giftNumber: w.gift.giftNumber,
        };
      })
    );

    SocketService.emitRoundEnd(
      auction.id,
      round.roundNumber,
      winnersForSocket,
      nextRound ? nextRound.roundNumber : null
    );

    if (!nextRound) {
      SocketService.emitAuctionEnd(auction.id);
    }

    return {
      success: true,
      winners,
      carriedBids,
      refundedBids,
    };
  }

  static async getActiveRound(auctionId: string): Promise<RoundCollection | undefined> {
    return await Storage.instance.round.getActiveRound(auctionId);
  }

  static async getAuctionRounds(auctionId: string): Promise<RoundCollection[]> {
    return await Storage.instance.round.getByAuctionId(auctionId);
  }

  static async getRoundById(roundId: string): Promise<RoundCollection | undefined> {
    return await Storage.instance.round.getById(roundId);
  }

  static async checkRoundEnd(roundId: string): Promise<boolean> {
    const round = await Storage.instance.round.getById(roundId);
    if (!round || round.status !== 'active' || !round.scheduledEndAt) {
      return false;
    }

    return Date.now() >= round.scheduledEndAt;
  }

  static async getTimeRemaining(roundId: string): Promise<number | null> {
    const round = await Storage.instance.round.getById(roundId);
    if (!round || !round.scheduledEndAt) return null;

    const remainingMs = round.scheduledEndAt - Date.now();
    const remainingSec = Math.floor(remainingMs / 1000);
    return Math.max(0, remainingSec);
  }

  static async getRoundsToEnd(): Promise<RoundCollection[]> {
    return await Storage.instance.round.getRoundsEndingBefore(Date.now());
  }
}
