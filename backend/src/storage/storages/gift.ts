import * as MongoDb from 'mongodb';

import { GiftCollection, GiftStatus } from '../types/gift';

export class GiftStorage {

  private readonly gifts: MongoDb.Collection<GiftCollection>;

  constructor(db: MongoDb.Db) {
    this.gifts = db.collection<GiftCollection>('gift');
  }

  async createIndexes(): Promise<void> {
    await this.gifts.createIndexes([
      { key: { id: 1 }, unique: true },
      { key: { auctionId: 1 } },
      { key: { auctionId: 1, giftNumber: 1 }, unique: true },
      { key: { roundId: 1 } },
      { key: { winnerId: 1 } },
      { key: { status: 1 } },
    ]);
  }

  async create(gift: GiftCollection): Promise<boolean> {
    const res = await this.gifts.insertOne(gift);
    return res.acknowledged;
  }

  async createMany(gifts: GiftCollection[]): Promise<boolean> {
    const res = await this.gifts.insertMany(gifts);
    return res.acknowledged;
  }

  async update(id: string, update: Partial<GiftCollection>): Promise<boolean> {
    const res = await this.gifts.updateOne(
      { id },
      { $set: { ...update, updatedAt: Date.now() } },
    );
    return res.modifiedCount > 0;
  }

  async getById(id: string): Promise<GiftCollection | undefined> {
    return await this.gifts.findOne({ id }, { projection: { _id: 0 } }) ?? undefined;
  }

  async getByAuction(auctionId: string): Promise<GiftCollection[]> {
    return await this.gifts.find(
      { auctionId },
      { projection: { _id: 0 } }
    ).sort({ giftNumber: 1 }).toArray();
  }

  async getByRound(roundId: string): Promise<GiftCollection[]> {
    return await this.gifts.find(
      { roundId },
      { projection: { _id: 0 } }
    ).sort({ giftNumber: 1 }).toArray();
  }

  async getByWinner(winnerId: string): Promise<GiftCollection[]> {
    return await this.gifts.find(
      { winnerId },
      { projection: { _id: 0 } }
    ).sort({ awardedAt: -1 }).toArray();
  }

  async getAvailableByAuction(auctionId: string): Promise<GiftCollection[]> {
    return await this.gifts.find(
      { auctionId, status: 'available' },
      { projection: { _id: 0 } }
    ).sort({ giftNumber: 1 }).toArray();
  }

  async getNextAvailable(auctionId: string): Promise<GiftCollection | undefined> {
    return await this.gifts.findOne(
      { auctionId, status: 'available' },
      { projection: { _id: 0 }, sort: { giftNumber: 1 } }
    ) ?? undefined;
  }

  async awardToWinner(
    id: string, 
    winnerId: string, 
    winningBidId: string, 
    winningAmount: number,
    roundId: string
  ): Promise<boolean> {
    const res = await this.gifts.updateOne(
      { id, status: 'available' },
      { 
        $set: { 
          winnerId,
          winningBidId,
          winningAmount,
          roundId,
          status: 'awarded' as GiftStatus,
          awardedAt: Date.now(),
          updatedAt: Date.now(),
        }
      },
    );
    return res.modifiedCount > 0;
  }

  async setStatus(id: string, status: GiftStatus): Promise<boolean> {
    const update: Partial<GiftCollection> = {
      status,
      updatedAt: Date.now(),
    };

    if (status === 'claimed') {
      update.claimedAt = Date.now();
    }

    const res = await this.gifts.updateOne(
      { id },
      { $set: update },
    );
    return res.modifiedCount > 0;
  }

  async countByAuction(auctionId: string): Promise<number> {
    return await this.gifts.countDocuments({ auctionId });
  }

  async countAvailableByAuction(auctionId: string): Promise<number> {
    return await this.gifts.countDocuments({ auctionId, status: 'available' });
  }

  async countAwardedByAuction(auctionId: string): Promise<number> {
    return await this.gifts.countDocuments({ auctionId, status: { $in: ['awarded', 'claimed'] } });
  }

  async getOneByFilter(filter: MongoDb.Filter<GiftCollection>): Promise<GiftCollection | undefined> {
    return await this.gifts.findOne({ ...filter }, { projection: { _id: 0 } }) ?? undefined;
  }

  async hasUserWonInAuction(userId: string, auctionId: string): Promise<boolean> {
    const count = await this.gifts.countDocuments({
      auctionId,
      winnerId: userId,
      status: { $in: ['awarded', 'claimed'] }
    });
    return count > 0;
  }
}

